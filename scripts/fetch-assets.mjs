// Downloads the images the live WordPress site serves, resizes them and stores them in public/images.
// Page photos and logos are served from src/assets/ (see ASSETS.md): copy refreshed files there to use them.
// Run BEFORE switching DNS away from WordPress:  npm run assets
// Requires network access to modemechanical.com. Uses `sharp` when installed; otherwise saves files as-is.
import { mkdir, writeFile, copyFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const UP = 'https://modemechanical.com/wp-content/uploads/';
const OUT = fileURLToPath(new URL('../public/', import.meta.url));

/** local path → candidate source URLs (first that works wins), max width and options */
const manifest = [
  ['images/hero-1.webp', ['2026/10/11.webp'], 1600],
  ['images/hero-2.webp', ['2026/10/2.webp'], 1600],
  ['images/welcome.jpg', ['2026/10/mode.jpg'], 1400],
  ['images/service-installation.jpg', ['2026/10/image_123650291-5.jpg'], 800],
  ['images/service-repair.jpg', ['2026/10/image00034-scaled-1.jpeg'], 800],
  ['images/service-maintenance.jpg', ['2026/10/mitsubishi.jpg'], 800],
  ['images/specialty-1.jpg', ['2026/10/image_123650291-9-1.jpg'], 800],
  ['images/specialty-2.jpg', ['2026/10/image00033-scaled-1.jpeg'], 800],
  // FAQ photo: project-09 (Carrier furnace) resized to 800px WebP; replaces the stock photo 2026/10/1-3.webp.
  ['images/faq-furnace.webp', ['2025/09/image_6209779-scaled.jpg'], 800],
  // Repair page photo: project-06 (Daikin units on gauges); replaces the stock photo 2026/10/7-1.webp.
  ['images/repair-daikin.webp', ['2025/05/image00048-scaled.jpeg'], 1200],
  // TODO: confirm these two match the photos on the live About page.
  ['images/about-condensers.jpg', ['2025/09/image_123650291-9.jpg'], 800],
  ['images/about-rooftop.jpg', ['2025/09/image_123650291-10.jpg'], 800],
  // The inner-page banner on WordPress is a CSS background whose URL is not in the page HTML.
  // TODO: find it in the theme settings or Elementor and add it as the first candidate.
  ['images/banner.jpg', ['2026/10/2.webp'], 1920],
  ['images/logo.png', ['2024/05/ModeLogoTransparent.png'], 300],
  // Header copy with the transparent padding trimmed, so the mark fills its box.
  ['images/logo-header.png', ['2024/05/ModeLogoTransparent.png'], 300, { trim: true }],
  // All-white version of the same, for the transparent header over the hero image.
  ['images/logo-header-white.png', ['2024/05/ModeLogoTransparent.png'], 300, { trim: true, white: true }],
  // Footer white logo ("Untitled design (1)" on the live site).
  ['images/logo-white.png', ['2024/05/Untitled-design-1.jpg', '2024/05/ModeLogoTransparent.png'], 300],
  ['favicon.jpg', ['2024/05/cropped-Untitled-design-1-270x270.jpg'], 270],
  ['images/brands/trane.webp', ['2024/05/2-3.webp'], 360],
  ['images/brands/daikin.webp', ['2024/05/4-1.webp'], 360],
  ['images/brands/mitsubishi-electric.png', ['2025/05/mitsubishi-air-conditioner-logo.png'], 360],
  ['images/brands/fujitsu.png', ['2025/05/Fujitsu-Logo.svg-e1747048496892.png'], 360],
  ['images/brands/brand-unlabeled-1.webp', ['2025/04/1.webp'], 360],
  ['images/brands/brand-unlabeled-2.webp', ['2025/04/2.webp'], 360],
  ['images/brands/york.png', ['2025/05/125_york_logo-removebg-preview-e1747048591458.png'], 360],
  ['images/brands/lg.png', ['2025/05/lg-logo-png-transparent.png'], 360],
  // Some 2025/05 originals were deleted from WordPress; the 2026/10 re-uploads are the fallbacks.
  // image00073.jpg has no copy left, so project-06 falls back to an unused project photo from the library.
  ...[
    ['2025/05/image_123650291-5.jpg', '2026/10/image_123650291-5.jpg'],
    ['2025/05/image00034-scaled.jpeg', '2026/10/image00034-scaled-1.jpeg'],
    ['2025/09/image_123650291-9.jpg'],
    ['2025/05/image00051-scaled.jpeg'],
    ['2025/05/image00033-scaled.jpeg', '2026/10/image00033-scaled-1.jpeg'],
    ['2025/05/image00073.jpg', '2025/05/image00048-scaled.jpeg'],
    ['2025/09/image_123650291-8.jpg'], ['2025/09/image_123650291-10.jpg'], ['2025/09/image_6209779-scaled.jpg'],
    ['2025/09/image_123650291-7.jpg'], ['2025/09/image_123650291-11.jpg'], ['2025/05/image_123650291-2.jpg'],
  ].map((srcs, i) => [`images/projects/project-${String(i + 1).padStart(2, '0')}.jpg`, srcs, 1200]),
];

let sharp = null;
try { sharp = (await import('sharp')).default; } catch { console.warn('sharp not installed: saving originals without resizing.'); }

/** Keeps only the image's shape: every visible pixel becomes white, transparency is preserved. */
async function whiten(img) {
  const { data: alpha, info } = await img.ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  // Materialised before returning: sharp would otherwise resize the base before joining the alpha.
  return sharp(await sharp({ create: { width: info.width, height: info.height, channels: 3, background: '#ffffff' } })
    .joinChannel(alpha, { raw: { width: info.width, height: info.height, channels: 1 } }).png().toBuffer());
}

async function exists(p) { try { await access(p); return true; } catch { return false; } }

const missing = [];
for (const [local, candidates, maxWidth, opts = {}] of manifest) {
  const dest = join(OUT, local);
  await mkdir(dirname(dest), { recursive: true });
  let saved = false;
  for (const rel of candidates) {
    const url = UP + rel;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      let buf = Buffer.from(await res.arrayBuffer());
      if (sharp) {
        let img = sharp(buf).rotate();
        if (opts.trim) img = sharp(await img.trim().toBuffer());
        if (opts.white) img = await whiten(img);
        img = img.resize({ width: maxWidth, withoutEnlargement: true });
        if (local.endsWith('.webp')) img = img.webp({ quality: 80 });
        else if (local.endsWith('.png')) img = img.png({ compressionLevel: 9, palette: true });
        else img = img.jpeg({ quality: 80, mozjpeg: true });
        buf = await img.toBuffer();
      }
      await writeFile(dest, buf);
      console.log(`✓ ${local}  ← ${rel}  (${Math.round(buf.length / 1024)} KB)`);
      saved = true;
      break;
    } catch (err) {
      console.warn(`  failed ${url}: ${err.message}`);
    }
  }
  if (!saved) missing.push(local);
}

// Footer falls back to the regular logo if no white version was found.
if (missing.includes('images/logo-white.png') && await exists(join(OUT, 'images/logo.png'))) {
  await copyFile(join(OUT, 'images/logo.png'), join(OUT, 'images/logo-white.png'));
}

if (missing.length) {
  const note = `# Missing assets\n\nThese files could not be downloaded. Add them manually to /public:\n\n${missing.map((m) => `- ${m}`).join('\n')}\n`;
  await writeFile(new URL('../MISSING_ASSETS.md', import.meta.url), note);
  console.log(`\n${missing.length} asset(s) missing — see MISSING_ASSETS.md`);
  process.exitCode = 1;
} else {
  console.log('\nAll assets downloaded.');
}
