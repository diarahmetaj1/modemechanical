// Structured data (schema.org JSON-LD) shared by the pages. The business is described once, in
// BaseLayout, under BUSINESS_ID; other entries point to it instead of repeating it.
import { business } from './site';

export const BUSINESS_ID = `${business.url}/#business`;

const provider = { '@type': 'HVACBusiness', '@id': BUSINESS_ID, name: business.name };

/** A service page or an area page: what is offered, where, and by whom. */
export function serviceSchema({ name, description, path, area }: { name: string; description: string; path: string; area?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    serviceType: name,
    description,
    url: new URL(path, business.url).href,
    provider,
    areaServed: area
      ? { '@type': 'Place', name: area }
      : business.areaServed.map((n) => ({ '@type': 'Place', name: n })),
  };
}

/** The site itself (home page): lets search engines show the business name for the site. */
export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: business.name,
  url: `${business.url}/`,
  inLanguage: 'en-US',
  publisher: provider,
};
