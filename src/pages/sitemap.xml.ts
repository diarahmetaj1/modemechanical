// /sitemap.xml: every indexable page, at its canonical URL. `npm run verify` fails if a built page
// is missing here or a listed page doesn't exist, so add new pages to PAGES.
import type { APIRoute } from 'astro';
import { areas, areaHref } from '../data/areas';

const PAGES = [
  '/', '/hvac-repair/', '/hvac-installation/', '/hvac-maintenance/', '/service-areas/',
  ...areas.map(areaHref), '/projects/', '/about-us/', '/contact/',
];

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://modemechanical.com');
  const urls = PAGES.map((p) => `  <url><loc>${new URL(p, base).href}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
