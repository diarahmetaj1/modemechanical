// Files are downloaded by `npm run assets`.
// The two unlabeled logos from the live site turned out to be Carrier (2025/04/1.webp) and a
// second copy of the Trane logo (2025/04/2.webp); the duplicate is left out.
export const brands = [
  { name: 'Trane', src: '/images/brands/trane.webp' },
  { name: 'Daikin', src: '/images/brands/daikin.webp' },
  { name: 'Mitsubishi Electric', src: '/images/brands/mitsubishi-electric.png' },
  { name: 'Fujitsu', src: '/images/brands/fujitsu.png' },
  { name: 'Carrier', src: '/images/brands/brand-unlabeled-1.webp' },
  { name: 'LG', src: '/images/brands/lg.png' },
  { name: 'York', src: '/images/brands/york.png' },
].map((b) => ({ ...b, alt: `${b.name} HVAC systems installed by Mode Mechanical` }));
