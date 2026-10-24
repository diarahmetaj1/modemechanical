// Builds the assistant's knowledge pack from the built site in dist/, so the assistant answers
// from exactly what visitors read on the pages. Run after `astro build` (npm run build does it):
//
//   node scripts/build-knowledge.mjs          write src/server/assistant/knowledge.generated.ts
//   node scripts/build-knowledge.mjs --check  exit 1 if the committed file is out of date
//
// Per page it keeps the readable copy inside <main> (headings, paragraphs, list items, FAQ
// questions) and drops navigation, images, scripts, forms and anything aria-hidden. A block of
// text that already appeared on an earlier page (shared FAQ, service lists, CTAs) is kept only
// once. Business facts come from the HVACBusiness JSON-LD on the home page.
import { readFile, writeFile } from 'node:fs/promises';

// Most general pages first, so shared blocks are kept on the page where they belong.
const PAGES = [
  '/', '/hvac-repair/', '/hvac-installation/', '/hvac-maintenance/', '/about-us/', '/projects/', '/contact/',
  '/service-areas/', '/hvac-brooklyn-ny/', '/hvac-queens-ny/', '/hvac-manhattan-ny/', '/hvac-bronx-ny/',
  '/hvac-staten-island-ny/', '/hvac-long-island-ny/', '/hvac-westchester-ny/',
];
/** Upper bound for the whole pack. Past this, switch the assistant to retrieving sections per question. */
const MAX_CHARS = 60_000;

const dist = new URL('../dist/', import.meta.url);
const outFile = new URL('../src/server/assistant/knowledge.generated.ts', import.meta.url);

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', mdash: '—', ndash: '–', hellip: '…', deg: '°', times: '×' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return ENTITIES[e.toLowerCase()] ?? m;
});
const clean = (s) => decode(s).replace(/\s+/g, ' ').replace(/\s+([.,;:!?)])/g, '$1').trim();

const SKIP = new Set(['script', 'style', 'svg', 'noscript', 'form', 'nav', 'picture', 'canvas', 'template', 'iframe', 'dialog']);
const BLOCK = new Set(['h1', 'h2', 'h3', 'h4', 'p', 'li', 'summary', 'dt', 'dd', 'figcaption', 'address', 'blockquote', 'td', 'th']);
const VOID = new Set(['img', 'br', 'hr', 'input', 'source', 'meta', 'link', 'wbr', 'col', 'area', 'embed', 'track']);

/** Readable blocks of one page's <main>, in document order: { kind: 'h1'..'h4' | 'text', text }. */
function extractBlocks(html) {
  const main = html.match(/<main[^>]*>([\s\S]*)<\/main>/)?.[1] ?? '';
  const blocks = [];
  const stack = []; // open elements: { tag, skip, block, buf }
  const skipping = () => stack.some((e) => e.skip);
  const innermostBlock = () => { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].block) return stack[i]; return null; };
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)/g;
  for (let m; (m = re.exec(main));) {
    const [, closing, rawTag, attrs = '', text] = m;
    if (text !== undefined) {
      if (!skipping()) innermostBlock()?.buf.push(text);
      continue;
    }
    if (!rawTag) continue; // comment
    const tag = rawTag.toLowerCase();
    if (closing) {
      // Pop to the matching element (the built HTML is well formed; this also tolerates stray tags).
      const at = stack.map((e) => e.tag).lastIndexOf(tag);
      if (at === -1) continue;
      const popped = stack.splice(at);
      for (let i = popped.length - 1; i >= 0; i--) {
        const el = popped[i];
        if (!el.block || el.skip || popped.slice(0, i).some((e) => e.skip) || skipping()) continue;
        const t = clean(el.buf.join(' '));
        if (t) blocks.push({ kind: /^h[1-4]$/.test(el.tag) ? el.tag : 'text', text: el.tag === 'li' ? `- ${t}` : t });
      }
      continue;
    }
    if (VOID.has(tag) || attrs.trim().endsWith('/')) continue;
    const hidden = /\baria-hidden="true"/.test(attrs) || /(^|\s)hidden(\s|=|$)/.test(attrs);
    const el = { tag, skip: SKIP.has(tag) || hidden, block: BLOCK.has(tag), buf: [] };
    // A block inside a block (a <p> in an <li>) ends the text gathered so far for the outer one.
    if (el.block && !skipping()) {
      const outer = innermostBlock();
      if (outer) {
        const t = clean(outer.buf.join(' '));
        if (t) blocks.push({ kind: 'text', text: outer.tag === 'li' ? `- ${t}` : t });
        outer.buf = [];
      }
    }
    stack.push(el);
  }
  return blocks;
}

function pageMeta(html) {
  return {
    title: clean(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''),
    description: clean(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ''),
  };
}

function businessFacts(html) {
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const data = JSON.parse(json);
    if (data['@type'] !== 'HVACBusiness') continue;
    const hours = data.openingHoursSpecification?.[0];
    return {
      name: data.name,
      url: data.url,
      phone: data.telephone,
      email: data.email,
      baseLocation: [data.address?.addressLocality, data.address?.addressRegion, data.address?.postalCode].filter(Boolean).join(' '),
      hours: hours ? `${hours.dayOfWeek.length === 7 ? 'Monday to Sunday' : hours.dayOfWeek.join(', ')}, ${hours.opens} to ${hours.closes}` : '',
      areaServed: (data.areaServed ?? []).map((a) => a.name),
      profiles: data.sameAs ?? [],
    };
  }
  throw new Error('No HVACBusiness JSON-LD on the home page');
}

export async function buildKnowledge() {
  const seen = new Set();
  const pages = [];
  let business;
  for (const url of PAGES) {
    const html = await readFile(new URL('.' + url + 'index.html', dist), 'utf8');
    if (url === '/') business = businessFacts(html);
    const kept = [];
    for (const b of extractBlocks(html)) {
      if (b.kind !== 'text') { kept.push(b); continue; }
      const key = b.text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      kept.push(b);
    }
    // Drop headings left with nothing under them (their content was shared with an earlier page).
    const lines = [];
    kept.forEach((b, i) => {
      if (b.kind === 'text') { lines.push(b.text); return; }
      const level = Number(b.kind[1]);
      const next = kept.slice(i + 1).find((n) => n.kind === 'text' || Number(n.kind[1]) <= level);
      if (b.kind === 'h1' || next?.kind === 'text') lines.push(`${'#'.repeat(level)} ${b.text}`);
    });
    pages.push({ url, ...pageMeta(html), content: lines.join('\n') });
  }
  return { business, pages };
}

function render(pack) {
  return `// GENERATED by scripts/build-knowledge.mjs from the built pages in dist/. Do not edit by hand:
// change the page copy, run \`npm run build\`, and commit the regenerated file.
import type { KnowledgePack } from './types.js';

export const knowledge: KnowledgePack = ${JSON.stringify(pack, null, 2)};
`;
}

const pack = await buildKnowledge();
const size = pack.pages.reduce((n, p) => n + p.content.length, 0);
if (size > MAX_CHARS) {
  console.error(`Knowledge pack is ${size} characters (limit ${MAX_CHARS}). Time to retrieve sections per question instead of sending every page.`);
  process.exit(1);
}
const next = render(pack);
if (process.argv.includes('--check')) {
  const current = await readFile(outFile, 'utf8').catch(() => '');
  if (current !== next) {
    console.error('✗ src/server/assistant/knowledge.generated.ts is out of date with the built pages. Run `npm run build` and commit it.');
    process.exit(1);
  }
  console.log(`Assistant knowledge pack is up to date (${pack.pages.length} pages, ${size} characters).`);
} else {
  await writeFile(outFile, next);
  console.log(`Wrote assistant knowledge pack: ${pack.pages.length} pages, ${size} characters.`);
}
