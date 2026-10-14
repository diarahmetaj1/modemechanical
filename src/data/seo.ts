export interface PageSeo { title: string; description: string; h1: string; ogImage: string }

// Source of truth: Appendix of the migration prompt. Titles are used as-is (no site-name suffix).
export const seo: Record<string, PageSeo> = {
  home: {
    title: 'HVAC Company in Brooklyn & NYC | Mode Mechanical',
    description: 'Licensed HVAC contractor serving Brooklyn, Queens, Manhattan and the Bronx. AC repair, heating installation and 24/7 emergency service. Call (914) 223-3301.',
    h1: 'HVAC Installation, Repair and Maintenance in New York City',
    ogImage: '/images/hero-1.webp',
  },
  about: {
    title: 'About Mode Mechanical | HVAC Company in Brooklyn, NY',
    description: 'Mode Mechanical is a licensed HVAC company in Brooklyn, NY. Meet the team behind our AC repair, heating installation and 24/7 emergency service.',
    h1: 'About Mode Mechanical — HVAC Contractor in Brooklyn, New York',
    ogImage: '/images/about-condensers.jpg',
  },
  installation: {
    title: 'HVAC Installation in Brooklyn & NYC | Mode Mechanical',
    description: 'Certified HVAC installation across New York City. Carrier, Trane, Daikin and Mitsubishi systems, manufacturer warranties and upfront pricing.',
    h1: 'HVAC Installation in Brooklyn and New York City',
    ogImage: '/images/service-installation.jpg',
  },
  maintenance: {
    title: 'HVAC Maintenance & Tune-Ups in Brooklyn, NY',
    description: 'Annual HVAC maintenance in New York City. Keep your AC and heating running efficiently, prevent breakdowns and extend system life.',
    h1: 'HVAC Maintenance and Tune-Ups in Brooklyn, New York',
    ogImage: '/images/service-maintenance.jpg',
  },
  repair: {
    title: 'AC & Heating Repair in Brooklyn, NYC | Mode Mechanical',
    description: 'Fast AC and furnace repair across New York City, 24/7. Licensed technicians, transparent pricing and same-day appointments in most cases.',
    h1: 'AC and Heating Repair in Brooklyn and New York City',
    ogImage: '/images/repair.webp',
  },
  projects: {
    title: 'HVAC Projects in Brooklyn & Manhattan | Mode Mechanical',
    description: 'See recent HVAC installations by Mode Mechanical across Brooklyn and Manhattan — mini-splits, condensers and full system replacements.',
    h1: 'HVAC Projects in Brooklyn and Manhattan',
    ogImage: '/images/projects/project-01.jpg',
  },
  areas: {
    title: 'HVAC Service Areas in NYC & Nearby | Mode Mechanical',
    description: 'Mode Mechanical provides HVAC installation, repair and maintenance across all five NYC boroughs, Long Island and Westchester County.',
    h1: 'HVAC Service Areas',
    ogImage: '/images/hero-1.webp',
  },
  miniSplits: {
    title: 'Ductless Mini-Split Installation in NYC | Mode Mechanical',
    description: 'Ductless mini-split installation and repair in Brooklyn and across NYC. Mitsubishi, Daikin, Fujitsu and LG systems for heating and cooling. Call (914) 223-3301.',
    h1: 'Ductless Mini-Split Installation and Repair in New York City',
    ogImage: '/images/specialty-2.jpg',
  },
  heatPumps: {
    title: 'Heat Pump Installation in NYC | Mode Mechanical',
    description: 'Cold-climate heat pump installation for NYC, Long Island and Westchester homes. Heat and cool with one system and cut oil and gas use. Call (914) 223-3301.',
    h1: 'Heat Pump Installation in New York City',
    ogImage: '/images/service-installation.jpg',
  },
  contact: {
    title: 'Contact Mode Mechanical | HVAC in Brooklyn, NY',
    description: 'Contact Mode Mechanical for HVAC service across NYC, Long Island and Westchester. Call (914) 223-3301 or request a free estimate. Open Mon–Sun, 8AM–6PM.',
    h1: 'Contact Mode Mechanical',
    ogImage: '/images/hero-1.webp',
  },
};
