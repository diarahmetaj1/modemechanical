// Single source for business details. Write them identically everywhere.
export const business = {
  name: 'Mode Mechanical',
  url: 'https://modemechanical.com',
  phoneDisplay: '(914) 223-3301',
  phoneTopbar: '914 223 3301',
  phoneHref: 'tel:+19142233301',
  email: 'info@modemechanical.com',
  // TODO(owner): confirm ZIP code.
  address: { street: '941 Fulton St', city: 'Brooklyn', region: 'NY', zip: '11238' },
  hours: 'Mon – Sun 08:00AM – 06:00PM',
  facebook: 'https://www.facebook.com/profile.php?id=61588581779860',
  instagram: 'https://www.instagram.com/modemechanical/',
  areaServed: ['Brooklyn', 'Queens', 'Manhattan', 'The Bronx', 'Staten Island', 'Long Island', 'Westchester County'],
};

const booking = (import.meta.env.PUBLIC_BOOKING_URL ?? '').trim();
/** Default booking destination is the contact page, as on the live site. */
export const bookingUrl: string = booking || '/contact/';
export const bookingIsExternal = Boolean(booking);

export const services = [
  { label: 'Installation', href: '/installation/' },
  { label: 'Maintenance', href: '/maintenance/' },
  { label: 'Repair', href: '/repair/' },
];

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
