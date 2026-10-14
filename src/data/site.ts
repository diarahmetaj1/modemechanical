// Single source for business details. Write them identically everywhere.
export const business = {
  name: 'Mode Mechanical',
  url: 'https://modemechanical.com',
  phoneDisplay: '(914) 223-3301',
  phoneTopbar: '914 223 3301',
  phoneHref: 'tel:+19142233301',
  email: 'info@modemechanical.com',
  // Service-area business: no public street address. Visitors see the area served instead.
  base: { city: 'Brooklyn', region: 'NY' },
  serviceArea: 'NYC, Long Island & Westchester',
  hours: 'Mon – Sun 08:00AM – 06:00PM',
  facebook: 'https://www.facebook.com/profile.php?id=61588581779860',
  instagram: 'https://www.instagram.com/modemechanical/',
  // TODO(owner): paste the Google Maps (Business Profile) and Yelp page links. Each button,
  // review prompt and schema link for them appears only once its link is filled in.
  googleMaps: '',
  yelp: '',
  areaServed: ['Brooklyn', 'Queens', 'Manhattan', 'The Bronx', 'Staten Island', 'Long Island', 'Westchester County'],
};

const booking = (import.meta.env.PUBLIC_BOOKING_URL ?? '').trim();
/** Default booking destination is the contact page, as on the live site. */
export const bookingUrl: string = booking || '/contact/';
export const bookingIsExternal = Boolean(booking);

export const services = [
  { label: 'Installation', href: '/installation/', text: 'Central air, furnaces, boilers and heat pumps, sized to the building and installed to code.' },
  { label: 'Maintenance', href: '/maintenance/', text: 'Annual tune-ups that keep systems efficient and catch problems before they become breakdowns.' },
  { label: 'Repair', href: '/repair/', text: 'AC and heating repair with a written price before any work starts, and 24/7 emergency service.' },
  { label: 'Ductless Mini-Splits', href: '/ductless-mini-splits/', text: 'Quiet heating and cooling room by room, with no ductwork needed.' },
  { label: 'Heat Pumps', href: '/heat-pumps/', text: 'One efficient system for heating and cooling that can replace or back up oil and gas.' },
];

/** Review and listing profiles that are filled in (Google Maps, Yelp). */
export const profiles = [
  { label: 'Google', href: business.googleMaps, cta: 'See us on Google' },
  { label: 'Yelp', href: business.yelp, cta: 'See us on Yelp' },
].filter((p) => p.href);

export interface NavItem { label: string; href: string; children?: { label: string; href: string }[] }

export const nav: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about-us/' },
  { label: 'Services', href: '/installation/', children: services },
  { label: 'Projects', href: '/projects/' },
  { label: 'Contact', href: '/contact/' },
];

// TODO(owner): confirm these figures before launch; delete the entries if unsure.
export const stats = [
  { value: '300', suffix: '+', label: 'Projects Completed' },
  { value: '100', suffix: '%', label: 'Customer Satisfaction' },
];
