# Asset inventory

Images used by the site, where they come from on the live WordPress site, and where they are used.
Run `npm run assets` to download them (requires access to modemechanical.com). Files marked *unconfirmed* need checking against the live page.

| Local path | Original URL (wp-content/uploads/…) | Used in | Status |
| --- | --- | --- | --- |
| `public/images/hero-1.webp` | `2026/10/11.webp` | data/seo.ts, pages/404.astro, pages/index.astro | confirmed in live HTML |
| `public/images/hero-2.webp` | `2026/10/2.webp` | pages/index.astro | confirmed in live HTML |
| `public/images/welcome.jpg` | `2026/10/mode.jpg` | pages/index.astro | confirmed in live HTML |
| `public/images/service-installation.jpg` | `2026/10/image_123650291-5.jpg` | data/seo.ts, pages/index.astro | confirmed in live HTML |
| `public/images/service-repair.jpg` | `2026/10/image00034-scaled-1.jpeg` | pages/index.astro | confirmed in live HTML |
| `public/images/service-maintenance.jpg` | `2026/10/mitsubishi.jpg` | data/seo.ts, pages/index.astro | confirmed in live HTML |
| `public/images/specialty-1.jpg` | `2026/10/image_123650291-9-1.jpg` | pages/index.astro | confirmed in live HTML |
| `public/images/specialty-2.jpg` | `2026/10/image00033-scaled-1.jpeg` | pages/index.astro | confirmed in live HTML |
| `public/images/faq.webp` | `2026/10/1-3.webp` | pages/index.astro | confirmed in live HTML |
| `public/images/repair.webp` | `2026/10/7-1.webp` | data/seo.ts, pages/repair/index.astro | confirmed in live HTML |
| `public/images/about-condensers.jpg` | `2025/09/image_123650291-9.jpg` | data/seo.ts, pages/about-us/index.astro | *unconfirmed* — matched from Projects page |
| `public/images/about-rooftop.jpg` | `2025/09/image_123650291-10.jpg` | pages/about-us/index.astro | *unconfirmed* — matched from Projects page |
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
| `public/images/projects/project-01.jpg` | `2026/10/image_123650291-5.jpg` | Projects gallery | 2025/05 original deleted from WordPress; same photo re-uploaded in 2026/10 |
| `public/images/projects/project-02.jpg` | `2026/10/image00034-scaled-1.jpeg` | Projects gallery | 2025/05 original deleted from WordPress; same photo re-uploaded in 2026/10 |
| `public/images/projects/project-03.jpg` | `2025/09/image_123650291-9.jpg` | Projects gallery | confirmed in live HTML |
| `public/images/projects/project-04.jpg` | `2025/05/image00051-scaled.jpeg` | Projects gallery | confirmed in live HTML |
| `public/images/projects/project-05.jpg` | `2026/10/image00033-scaled-1.jpeg` | Projects gallery | 2025/05 original deleted from WordPress; same photo re-uploaded in 2026/10 |
| `public/images/projects/project-06.jpg` | `2025/05/image00048-scaled.jpeg` | Projects gallery | *substitute* — original `image00073.jpg` is gone from WordPress; replaced with an unused project photo from the library |
| `public/images/projects/project-07.jpg` | `2025/09/image_123650291-8.jpg` | Projects gallery | confirmed in live HTML |
| `public/images/projects/project-08.jpg` | `2025/09/image_123650291-10.jpg` | Projects gallery | confirmed in live HTML |
| `public/images/projects/project-09.jpg` | `2025/09/image_6209779-scaled.jpg` | Projects gallery | confirmed in live HTML |
| `public/images/projects/project-10.jpg` | `2025/09/image_123650291-7.jpg` | Projects gallery | confirmed in live HTML |
| `public/images/projects/project-11.jpg` | `2025/09/image_123650291-11.jpg` | Projects gallery | confirmed in live HTML |
| `public/images/projects/project-12.jpg` | `2025/05/image_123650291-2.jpg` | Projects gallery | confirmed in live HTML |

Each `public/images/projects/project-NN.jpg` also has a `project-NN-760.webp` copy (760px wide, WebP quality 78) used by the Projects slider; the JPEG is shown in the full-size lightbox. Regenerate the WebP copies if a project photo changes.

## Not migrated

- Theme demo images and fonts hosted on `themewant.com` and `v45sghbrlla.preview.infomaniak.website` (not owned by the business).
- Testimonial photos (`ReviewPhoto1–5`) — they belonged to the theme demo testimonials.
- Icon fonts (Icofont, Font Awesome, rt-icons) — replaced with inline SVG.

## Full media library mirror

`wp-uploads/` (outside `public/`, so it is not deployed) holds an untouched copy of every image in the WordPress media library plus every image referenced by the live pages, in the original `YYYY/MM/` layout. Most of it is unused theme-demo material; pick from it when you need more photos.
