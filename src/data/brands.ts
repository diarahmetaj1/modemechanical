// Logos shown on the site are the normalized `<brand>-logo.webp` files: trimmed and scaled to the
// same visual size on one canvas by scripts/normalize-logos.py (sources: `npm run assets`).
// The two unlabeled logos from the live site turned out to be Carrier (2025/04/1.webp) and a
// second copy of the Trane logo (2025/04/2.webp); the duplicate is left out.
export const brands = [
  { name: 'Trane', src: '/images/brands/trane-logo.webp' },
  { name: 'Daikin', src: '/images/brands/daikin-logo.webp' },
  { name: 'Mitsubishi Electric', src: '/images/brands/mitsubishi-electric-logo.webp' },
  { name: 'Fujitsu', src: '/images/brands/fujitsu-logo.webp' },
  { name: 'Carrier', src: '/images/brands/carrier-logo.webp' },
  { name: 'LG', src: '/images/brands/lg-logo.webp' },
  { name: 'York', src: '/images/brands/york-logo.webp' },
].map((b) => ({ ...b, alt: `${b.name} logo, an HVAC brand Mode Mechanical installs and services` }));
