// Encoding quality for every generated image, in one place (used by Photo.astro and the projects
// gallery). Measured on the site's own photos at 1200px against the original (SSIM, 1 = identical;
// average size per photo):
//   AVIF 42: 0.945,  53 KB   (previous setting: visibly softer than the fallbacks)
//   AVIF 60: 0.977, 110 KB   (chosen: as good as the JPEG fallback at about half its size)
//   AVIF 70: 0.985, 143 KB   (too heavy for the projects page on phones: LCP 3.2–3.8 s in tests)
//   AVIF 80: 0.991, 183 KB   (about the size of a JPEG, so no longer worth it)
// AVIF is what modern browsers download; WebP and JPEG/PNG are fallbacks for older ones, set to
// look about the same. Logos and graphics (PNG sources, with transparency) get higher settings
// because text and hard edges show compression first; they are small files.
export const IMAGE_QUALITY = {
  photo: { avif: 60, webp: 80, jpg: 82 },
  graphic: { avif: 85, webp: 90, png: 100 },
} as const;
