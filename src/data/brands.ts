// Logos shown on the site are the normalized `<brand>-logo.webp` files in src/assets/brands: trimmed
// and scaled to the same visual size on one canvas by scripts/normalize-logos.py (sources:
// `npm run assets`). They are served as AVIF/WebP with transparency kept.
// The two unlabeled logos from the live site turned out to be Carrier (2025/04/1.webp) and a
// second copy of the Trane logo (2025/04/2.webp); the duplicate is left out.
import trane from '../assets/brands/trane-logo.webp';
import daikin from '../assets/brands/daikin-logo.webp';
import mitsubishi from '../assets/brands/mitsubishi-electric-logo.webp';
import fujitsu from '../assets/brands/fujitsu-logo.webp';
import carrier from '../assets/brands/carrier-logo.webp';
import lg from '../assets/brands/lg-logo.webp';
import york from '../assets/brands/york-logo.webp';

export const brands = [
  { name: 'Trane', src: trane },
  { name: 'Daikin', src: daikin },
  { name: 'Mitsubishi Electric', src: mitsubishi },
  { name: 'Fujitsu', src: fujitsu },
  { name: 'Carrier', src: carrier },
  { name: 'LG', src: lg },
  { name: 'York', src: york },
].map((b) => ({ ...b, alt: `${b.name} logo, an HVAC brand Mode Mechanical installs and services` }));
