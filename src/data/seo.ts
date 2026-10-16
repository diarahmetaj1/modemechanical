export interface PageSeo { title: string; description: string; h1: string; ogImage: string }

// Titles: primary keyword first, then the brand; 60 characters or fewer so Google shows them whole.
// Descriptions: 120–160 characters, service + place + a reason to click.
export const seo: Record<string, PageSeo> = {
  home: {
    title: 'HVAC Installation & Repair in Brooklyn | Mode Mechanical',
    description: 'HVAC installation, repair and maintenance in Brooklyn, NY. Licensed AC and heating contractor serving all of NYC, Long Island and Westchester. 24/7 service.',
    h1: 'HVAC Installation, Repair and Maintenance in Brooklyn',
    ogImage: '/images/hero-1.webp',
  },
  about: {
    title: 'About Mode Mechanical | Brooklyn HVAC Contractor',
    description: 'Mode Mechanical is a licensed heating and air conditioning contractor based in Brooklyn, NY, serving homes and businesses across New York City.',
    h1: 'About Mode Mechanical — HVAC Contractor in Brooklyn, New York',
    ogImage: '/images/about-condensers.jpg',
  },
  installation: {
    title: 'HVAC Installation in Brooklyn & NYC | Mode Mechanical',
    description: 'New central AC, furnace, boiler, heat pump and ductless mini-split installation in Brooklyn and NYC. Right-sized systems and a written estimate up front.',
    h1: 'HVAC Installation in Brooklyn and New York City',
    ogImage: '/images/service-installation.jpg',
  },
  maintenance: {
    title: 'HVAC Maintenance in Brooklyn, NY | Mode Mechanical',
    description: 'Annual AC and heating tune-ups in Brooklyn and across NYC. Clean coils, safe furnaces and boilers, lower energy bills and fewer emergency breakdowns.',
    h1: 'HVAC Maintenance and Tune-Ups in Brooklyn, New York',
    ogImage: '/images/service-maintenance.jpg',
  },
  repair: {
    title: 'AC & Heating Repair in Brooklyn, NYC | Mode Mechanical',
    description: '24/7 AC, furnace and boiler repair in Brooklyn and across NYC. Licensed technicians and a written price before any work starts. Call (914) 223-3301.',
    h1: 'AC and Heating Repair in Brooklyn and New York City',
    ogImage: '/images/service-repair.jpg',
  },
  projects: {
    title: 'HVAC Projects in Brooklyn & Manhattan | Mode Mechanical',
    description: 'Recent HVAC projects by Mode Mechanical in Brooklyn and NYC: rooftop condensers, VRF service, mini-splits, ceiling cassettes, a gas furnace and ductwork.',
    h1: 'HVAC Installation Projects in Brooklyn and Manhattan',
    ogImage: '/images/projects/project-01.jpg',
  },
  areas: {
    title: 'HVAC Service Areas: NYC, Long Island | Mode Mechanical',
    description: 'HVAC installation, repair and maintenance in Brooklyn, Queens, Manhattan, the Bronx, Staten Island, Long Island and Westchester County. Call (914) 223-3301.',
    h1: 'HVAC Service Areas in New York City and Nearby',
    ogImage: '/images/service-installation.jpg',
  },
  contact: {
    title: 'Contact Mode Mechanical | HVAC Service in Brooklyn, NY',
    description: 'Call (914) 223-3301 or send a message for HVAC repair, installation or maintenance in Brooklyn, NYC, Long Island and Westchester. 24/7 emergency service.',
    h1: 'Contact Mode Mechanical — Brooklyn HVAC Contractor',
    ogImage: '/images/service-installation.jpg',
  },
};
