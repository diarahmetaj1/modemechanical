// Checks the static HTML in dist/ (what Google receives) against the migration rules.
// Run after `npm run build`:  npm run verify
import { readFile } from 'node:fs/promises';

const pages = [
  '/', '/about-us/', '/hvac-installation/', '/hvac-maintenance/', '/hvac-repair/', '/projects/', '/contact/',
  '/service-areas/', '/hvac-brooklyn-ny/', '/hvac-queens-ny/', '/hvac-manhattan-ny/', '/hvac-bronx-ny/', '/hvac-staten-island-ny/', '/hvac-long-island-ny/', '/hvac-westchester-ny/',
];
const dist = new URL('../dist/', import.meta.url);
let failures = 0;
const check = (ok, page, msg) => { if (!ok) { failures++; console.log(`✗ ${page}  ${msg}`); } };

const titles = new Set();
for (const page of pages) {
  const html = await readFile(new URL('.' + page + 'index.html', dist), 'utf8');
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? '';
  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;

  check(title.length > 10 && title.length <= 60, page, `title length ${title.length}: "${title}"`);
  check(!titles.has(title), page, 'duplicate title'); titles.add(title);
  check(desc.length >= 70 && desc.length <= 160, page, `meta description length ${desc.length}`);
  check(canonical === `https://modemechanical.com${page}`, page, `canonical is "${canonical}"`);
  check(h1s === 1, page, `found ${h1s} <h1> elements`);
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

console.log(failures ? `\n${failures} check(s) failed.` : `All checks passed for ${pages.length} pages.`);
process.exitCode = failures ? 1 : 0;
