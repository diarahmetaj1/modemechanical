# Asset inventory

Images used by the site, where they come from on the live WordPress site, and where they are used.
Run `npm run assets` to download them (requires access to modemechanical.com). Files marked *unconfirmed* need checking against the live page.

**How images are served.** Photos and logos shown on pages live in `src/assets/` and are rendered with
`src/components/Photo.astro` (Astro `<Picture>`) or, in the Projects gallery, with `getImage()`: the build
writes AVIF and WebP copies at several widths into `dist/_astro/` (hashed names, cached for a year), with
the original format as the fallback. `public/images/` keeps only files that need a fixed URL: social
preview images (`og:image` cannot be AVIF), the schema logo, the favicon and the logo sources.
`npm run assets` still writes to `public/images/`; copy a refreshed page photo into `src/assets/` to use it.

The homepage, Repair page and FAQ reuse project photos (`project-01`, `-02`, `-05`, `-06`, `-09`) straight
from `src/assets/projects/` instead of keeping second copies.

| Local path | Original URL (wp-content/uploads/…) | Used in | Status |
| --- | --- | --- | --- |
| `public/images/hero-1.webp` | `2026/10/11.webp` | data/seo.ts, pages/404.astro, pages/index.astro | confirmed in live HTML |
| `public/images/hero-2.webp` | `2026/10/2.webp` | pages/index.astro | confirmed in live HTML |
| `src/assets/photos/welcome.jpg` | `2026/10/mode.jpg` | pages/index.astro, data/projects.ts | confirmed in live HTML |
| `public/images/service-installation.jpg` | `2026/10/image_123650291-5.jpg` | data/seo.ts, pages/index.astro | confirmed in live HTML |
| `public/images/service-repair.jpg` | `2026/10/image00034-scaled-1.jpeg` | pages/index.astro | confirmed in live HTML |
| `public/images/service-maintenance.jpg` (+ copy in `src/assets/photos/`) | `2026/10/mitsubishi.jpg` | data/seo.ts (social preview); the copy: pages/index.astro, data/projects.ts | confirmed in live HTML |
| `src/assets/photos/specialty-1.jpg` | `2026/10/image_123650291-9-1.jpg` | pages/index.astro, data/projects.ts | confirmed in live HTML |
| `public/images/about-condensers.jpg` (+ copy in `src/assets/photos/`) | `2025/09/image_123650291-9.jpg` | data/seo.ts (social preview); the copy: pages/about-us/index.astro | *unconfirmed* — matched from Projects page |
| `src/assets/photos/about-rooftop.jpg` | `2025/09/image_123650291-10.jpg` | pages/about-us/index.astro | *unconfirmed* — matched from Projects page |
| `public/images/banner.jpg` | `2026/10/2.webp` | components/PageBanner.astro, layouts/ServiceLayout.astro, pages/about-us/index.astro, pages/contact/index.astro, pages/projects/index.astro | *unconfirmed* — live banner is a CSS background; temporary fallback to hero slide 2 |
| `public/images/logo.png` | `2024/05/ModeLogoTransparent.png` | components/Header.astro, layouts/BaseLayout.astro | confirmed in live HTML |
| `public/images/logo-white.png` | `2024/05/Untitled-design-1.jpg` | components/Footer.astro | confirmed in live HTML |
| `public/favicon.jpg` | `2024/05/cropped-Untitled-design-1-270x270.jpg` | layouts/BaseLayout.astro | confirmed in live HTML |
| `public/images/brands/trane.webp` | `2024/05/2-3.webp` | data/brands.ts | confirmed in live HTML |
| `public/images/brands/daikin.webp` | `2024/05/4-1.webp` | data/brands.ts | confirmed in live HTML |
| `public/images/brands/mitsubishi-electric.png` | `2025/05/mitsubishi-air-conditioner-logo.png` | data/brands.ts | confirmed in live HTML |
| `public/images/brands/fujitsu.png` | `2025/05/Fujitsu-Logo.svg-e1747048496892.png` | data/brands.ts | confirmed in live HTML |
| `public/images/brands/brand-unlabeled-1.webp` | `2025/04/1.webp` | data/brands.ts | *unconfirmed brand* — shown as Carrier |
| `public/images/brands/brand-unlabeled-2.webp` | `2025/04/2.webp` | data/brands.ts | *unconfirmed brand* — shown as Goodman |
| `public/images/brands/york.png` | `2025/05/125_york_logo-removebg-preview-e1747048591458.png` | data/brands.ts | confirmed in live HTML |
| `public/images/brands/lg.png` | `2025/05/lg-logo-png-transparent.png` | data/brands.ts | confirmed in live HTML |
| `src/assets/projects/project-01.jpg` (+ `public/images/projects/` copy) | `2026/10/image_123650291-5.jpg` | Projects gallery | 2025/05 original deleted from WordPress; same photo re-uploaded in 2026/10 |
| `src/assets/projects/project-02.jpg` | `2026/10/image00034-scaled-1.jpeg` | Projects gallery | 2025/05 original deleted from WordPress; same photo re-uploaded in 2026/10 |
| ~~`public/images/projects/project-03.jpg`~~ | `2025/09/image_123650291-9.jpg` | — | removed from the gallery at the owner's request (same photo as `about-condensers.jpg`) |
| `src/assets/projects/project-04.jpg` | `2025/05/image00051-scaled.jpeg` | Projects gallery | confirmed in live HTML |
| `src/assets/projects/project-05.jpg` | `2026/10/image00033-scaled-1.jpeg` | Projects gallery | 2025/05 original deleted from WordPress; same photo re-uploaded in 2026/10 |
| `src/assets/projects/project-06.jpg` | `2025/05/image00048-scaled.jpeg` | Projects gallery | *substitute* — original `image00073.jpg` is gone from WordPress; replaced with an unused project photo from the library |
| `src/assets/projects/project-07.jpg` | `2025/09/image_123650291-8.jpg` | Projects gallery | confirmed in live HTML |
| ~~`public/images/projects/project-08.jpg`~~ | `2025/09/image_123650291-10.jpg` | — | removed from the gallery at the owner's request (same photo as `about-rooftop.jpg`) |
| `src/assets/projects/project-09.jpg` | `2025/09/image_6209779-scaled.jpg` | Projects gallery | confirmed in live HTML |
| `src/assets/projects/project-10.jpg` | `2025/09/image_123650291-7.jpg` | Projects gallery | confirmed in live HTML |
| `src/assets/projects/project-11.jpg` | `2025/09/image_123650291-11.jpg` | Projects gallery | confirmed in live HTML |
| `src/assets/projects/project-12.jpg` | `2025/05/image_123650291-2.jpg` | Projects gallery | confirmed in live HTML |

Project photos `project-NN.jpg` now live in `src/assets/projects/` (only `project-01.jpg` is also kept in `public/images/projects/` as the Projects page social preview). Projects, their grouping, descriptions and alt text are in `src/data/projects.ts`.

## Project photos added from Instagram (October 2026)

Supplied by the owner as a zip of Instagram images. Each was checked against every photo on the site
with a perceptual hash (no duplicates found) and grouped by job in `src/data/projects.ts`.
Locations are not known, so none is stated.

| Local path | What it shows | Project |
| --- | --- | --- |
| `src/assets/projects/vrf-rooftop-1.jpg` | Row of Mitsubishi City Multi VRF outdoor units, panels open | Mitsubishi City Multi VRF service |
| `src/assets/projects/vrf-rooftop-2.jpg` | Same rooftop, meter leads on a control board | Mitsubishi City Multi VRF service |
| `src/assets/projects/vrf-rooftop-nameplate.jpg` | Outdoor unit nameplate (Mitsubishi Electric, PUHY) | Mitsubishi City Multi VRF service |
| `src/assets/projects/commercial-ductwork-1.jpg` | New galvanized ductwork under a concrete ceiling | Commercial ductwork installation |
| `src/assets/projects/commercial-ductwork-2.jpg` | Same ceiling, curved fitting and trunk line | Commercial ductwork installation |
| `src/assets/projects/ceiling-cassette-service-1.jpg` | Ceiling cassette opened, grille and filters lowered (black letterbox bars cropped) | Ceiling cassette service |
| `src/assets/projects/ceiling-cassette-service-2.jpg` | Interface module being connected to the cassette | Ceiling cassette service |
| `src/assets/projects/ceiling-cassette-finished.jpg` | Cassette installed in a finished white ceiling | Ceiling cassette installation |
| `src/assets/projects/vacuum-test.jpg` | Micron gauge reading 286 microns during evacuation | Deep vacuum before startup |
| `src/assets/projects/mitsubishi-backyard.jpg` | Mitsubishi Electric outdoor unit above a backyard | Mini-split heat pump outdoor unit |
| `src/assets/projects/rooftop-unit-service.jpg` | Gauges on rooftop units during a service call | Rooftop unit service call |
| `src/assets/projects/walk-in-cooler-service.jpg` | Branded graphic: walk-in cooler 51.4°F → 43.3°F | Walk-in cooler service |

## Not migrated

- Theme demo images and fonts hosted on `themewant.com` and `v45sghbrlla.preview.infomaniak.website` (not owned by the business).
- Testimonial photos (`ReviewPhoto1–5`) — they belonged to the theme demo testimonials.
- Icon fonts (Icofont, Font Awesome, rt-icons) — replaced with inline SVG.

## Full media library mirror

`wp-uploads/` (outside `public/`, so it is not deployed) holds an untouched copy of every image in the WordPress media library plus every image referenced by the live pages, in the original `YYYY/MM/` layout. Most of it is unused theme-demo material; pick from it when you need more photos.
