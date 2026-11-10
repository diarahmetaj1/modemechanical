// Checks the static HTML in dist/ (what Google receives) against the SEO rules.
// Run after `npm run build`:  npm run verify
import { readFile, stat } from 'node:fs/promises';

const pages = [
  '/', '/about-us/', '/hvac-installation/', '/hvac-maintenance/', '/hvac-repair/', '/projects/', '/contact/',
  '/service-areas/', '/hvac-brooklyn-ny/', '/hvac-queens-ny/', '/hvac-manhattan-ny/', '/hvac-bronx-ny/', '/hvac-staten-island-ny/', '/hvac-long-island-ny/', '/hvac-westchester-ny/',
];
const dist = new URL('../dist/', import.meta.url);
let failures = 0;
const check = (ok, page, msg) => { if (!ok) { failures++; console.log(`✗ ${page}  ${msg}`); } };

const exists = (path) => stat(new URL('.' + path, dist)).then(() => true, () => false);
/** A same-site URL resolves to a built file (pages end in a slash and have an index.html). */
const resolves = (url) => {
  const path = decodeURI(url.split('#')[0].split('?')[0]);
  return exists(path.endsWith('/') ? path + 'index.html' : path);
};
const SERVICE_PAGES = ['/hvac-repair/', '/hvac-installation/', '/hvac-maintenance/'];
const pagesHtml = {};
for (const page of pages) pagesHtml[page] = await readFile(new URL('.' + page + 'index.html', dist), 'utf8');
const idsOf = (page) => new Set([...pagesHtml[page].matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

const titles = new Set();
const descriptions = new Set();
for (const page of pages) {
  const html = pagesHtml[page];
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? '';
  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;

  check(title.length > 10 && title.length <= 60, page, `title length ${title.length}: "${title}"`);
  check(!titles.has(title), page, 'duplicate title'); titles.add(title);
  check(desc.length >= 70 && desc.length <= 160, page, `meta description length ${desc.length}`);
  check(!descriptions.has(desc), page, 'duplicate meta description'); descriptions.add(desc);
  check(canonical === `https://modemechanical.com${page}`, page, `canonical is "${canonical}"`);
  check(html.includes(`<meta property="og:url" content="${canonical}"`), page, 'og:url differs from the canonical');
  check(/<meta name="robots" content="index, follow/.test(html), page, 'not indexable (robots meta)');
  const og = html.match(/<meta property="og:image" content="https:\/\/modemechanical\.com(\/images\/og\/[a-z-]+\.jpg)"/)?.[1];
  check(og && await exists(og) && html.includes('<meta property="og:image:alt"'), page, 'share image missing, not a 1200x630 JPEG from /images/og/, or without alt');
  check(/<html lang="en"/.test(html) && /name="viewport" content="width=device-width, initial-scale=1"/.test(html), page, 'missing lang or viewport');
  check(h1s === 1, page, `found ${h1s} <h1> elements`);
  // Headings go down one level at a time (h1 > h2 > h3), starting with the h1.
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  check(levels[0] === 1, page, `first heading is h${levels[0]}`);
  levels.forEach((l, i) => check(i === 0 || l <= levels[i - 1] + 1, page, `heading skips a level: h${levels[i - 1]} then h${l}`));
  // Every image has real alt text and fixed dimensions (no layout shift).
  for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
    check(/\balt="[^"]+"/.test(tag), page, `image without alt text: ${tag.slice(0, 90)}`);
    check(/\bwidth="\d+"/.test(tag) && /\bheight="\d+"/.test(tag), page, `image without width/height: ${tag.slice(0, 90)}`);
  }
  // Links and files: same-site ones exist, anchors exist, nothing over plain http.
  for (const [, attr, url] of html.matchAll(/\s(href|src)="([^"]+)"/g)) {
    check(!url.startsWith('http://'), page, `insecure http:// URL ${url}`);
    if (url.startsWith('#') && url.length > 1) check(idsOf(page).has(url.slice(1)), page, `broken anchor ${url}`);
    if (!url.startsWith('/')) continue;
    check(await resolves(url), page, `broken ${attr} ${url}`);
    const [target, anchor] = url.split('#');
    if (anchor && pagesHtml[target]) check(idsOf(target).has(anchor), page, `broken anchor ${url}`);
  }
  for (const [, set] of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of set.split(',')) { const u = part.trim().split(/\s+/)[0]; if (u.startsWith('/')) check(await resolves(u), page, `broken srcset ${u}`); }
  }
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let data = null; try { data = JSON.parse(json); } catch { /* reported below */ }
    check(data, page, 'invalid JSON-LD');
    // FAQ structured data must match questions visitors can see on the page.
    const visible = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, '&');
    if (data?.['@type'] === 'FAQPage') {
      for (const q of data.mainEntity) check(visible.includes(q.name.replace(/&/g, '&')), page, `FAQ schema question not on the page: "${q.name}"`);
    }
  }
  if (page !== '/') check(html.includes('"@type":"BreadcrumbList"'), page, 'missing BreadcrumbList JSON-LD');
  if (SERVICE_PAGES.includes(page) || /^\/hvac-[a-z-]+-ny\/$/.test(page)) check(html.includes('"@type":"Service"'), page, 'missing Service JSON-LD');
  check(html.includes('"@type":"HVACBusiness"'), page, 'missing HVACBusiness JSON-LD');
  check(!/tel:%20|233[\s-]?3301/.test(html), page, 'wrong or badly encoded phone link');
  check(/href="tel:\+19142233301"/.test(html), page, 'no tel:+19142233301 link');
  check(!/themewant\.com|infomaniak\.website/.test(html), page, 'references a third-party demo host');
  check(!/href="#"/.test(html), page, 'link pointing to "#"');
  check(!/href="\/(installation|maintenance|repair|areas|ductless-mini-splits|heat-pumps)\//.test(html), page, 'link to a retired URL (now redirected)');
  check(!/Satisfication|Maintenace|Testimonail|1,234 ratings/.test(html), page, 'known typo or demo content present');
  // A bare `alt` (how Astro writes alt="" for decorative images) counts as an alt attribute.
  check(!/<img(?![^>]*\balt[\s=>])[^>]*>/.test(html), page, 'image without alt attribute');
}
const home = await readFile(new URL('./index.html', dist), 'utf8');
check(home.includes('"@type":"FAQPage"'), '/', 'missing FAQPage JSON-LD');
check(/data-airflow/.test(home), '/', 'two-temperature hero (airflow canvas) missing');

// AI search: the summary file for AI tools exists and no AI search crawler is shut out.
const llms = await readFile(new URL('./llms.txt', dist), 'utf8').catch(() => '');
check(llms.startsWith('# Mode Mechanical') && llms.includes('(914) 223-3301') && llms.includes('https://modemechanical.com/hvac-repair/'), '/llms.txt', 'missing or incomplete');
check((await readFile(new URL('./llms-full.txt', dist), 'utf8').catch(() => '')).length > 10_000, '/llms-full.txt', 'missing or too short');
const robots = await readFile(new URL('./robots.txt', dist), 'utf8');
check(!/^Disallow:\s*\/\s*$/m.test(robots), '/robots.txt', 'blocks crawlers');
for (const bot of ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot', 'Googlebot', 'Bingbot']) check(robots.includes(bot), '/robots.txt', `does not name ${bot}`);
check(home.includes('"hasOfferCatalog"') && home.includes('"knowsAbout"'), '/', 'business schema lacks services');
check(home.includes('"@type":"WebSite"'), '/', 'missing WebSite JSON-LD');
check(/^Disallow: \/api\/$/m.test(robots) && robots.includes('Sitemap: https://modemechanical.com/sitemap.xml'), '/robots.txt', 'missing /api/ rule or sitemap line');

// The 404 page stays out of search results.
const notFound = await readFile(new URL('./404.html', dist), 'utf8');
check(/<meta name="robots" content="noindex/.test(notFound), '/404', 'is indexable');

// sitemap.xml lists exactly the indexable pages, at their canonical URLs.
const sitemap = await readFile(new URL('./sitemap.xml', dist), 'utf8').catch(() => '');
const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort();
const expected = pages.map((p) => `https://modemechanical.com${p}`).sort();
check(JSON.stringify(listed) === JSON.stringify(expected), '/sitemap.xml', `lists ${listed.length} URLs; expected the ${expected.length} pages`);

console.log(failures ? `\n${failures} check(s) failed.` : `All checks passed for ${pages.length} pages, the 404 page, sitemap.xml, robots.txt and llms.txt.`);
process.exitCode = failures ? 1 : 0;
