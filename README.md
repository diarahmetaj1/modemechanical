# Mode Mechanical — static site (Astro + React)

Migration of https://modemechanical.com from WordPress/Elementor to a statically generated site.
Every page is pre-rendered HTML; React runs only for the mobile menu, hero slider, FAQ and contact form.

## Quick start

```bash
npm install
npm run assets      # download images from the live WordPress site (run BEFORE switching DNS)
cp .env.example .env  # then fill in the values
npm run dev         # http://localhost:4321
npm run build       # type check + production build into dist/
npm run verify      # checks titles, H1s, canonicals, phone links, schema in dist/
npm run preview
```

Requires Node 18.17+ (tested on Node 22).

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `PUBLIC_FORM_ENDPOINT` | yes, for the form | URL that receives contact form submissions as JSON POST. Without it, the Contact page shows phone and email instead of a form. |
| `PUBLIC_BOOKING_URL` | no | External booking page. Empty = "Schedule Now" buttons go to `/contact/`, as on the live site. UTM parameters are appended automatically. |
| `PUBLIC_GTAG_ID` | no | Google tag ID from the current site's HTML. Loaded after the page is interactive. |

Never commit `.env`. Set the same variables in your host's dashboard.

## Contact form — ready for the backend

The form is fully built (design, validation, loading, success and error states) and only needs an endpoint.
All logic lives in `src/lib/contact.ts`; the UI is `src/components/islands/ContactForm.tsx`.

**To connect it:** set `PUBLIC_FORM_ENDPOINT` to a URL that accepts a JSON `POST` and returns any `2xx` on success.
To use another transport (FormData, an SDK), change only `submitContact()` in `src/lib/contact.ts`.

Payload sent to the backend:

```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "9142233301",
  "message": "AC is not cooling",
  "page": "/contact/",
  "submittedAt": "2026-10-09T11:05:00.000Z",
  "utm_source": "google",
  "utm_campaign": "fall_ac"
}
```

`phone` is normalized to 10 digits. Attribution keys (`utm_*`, `gclid`, `fbclid`) appear only when the visitor arrived with them.
The backend should validate again server-side, rate-limit, and allow CORS from the site's domain if it runs on another origin.

Fields match the live form: Name, Email, Phone, Message — all required, no consent box.

| Situation | What the visitor sees |
| --- | --- |
| Empty or invalid field | Inline message under the field; focus moves to the first error |
| Rules | Name required; valid email; US phone (10 digits, or 11 starting with 1); message required; length limits |
| Sending | Spinner and "Sending…", button disabled |
| Backend returns 2xx | "Message sent." confirmation, form cleared |
| Backend error or network failure | Error banner with phone and email; typed text kept |
| No endpoint configured | Banner saying the message was not sent, with phone and email — never a fake success |
| Hidden honeypot filled (bot) | Nothing is sent |

## Animations

Reproduced from the live site's scripts (WOW.js, Swiper, Magnific Popup) without animation libraries:

- Section descriptions fade up on scroll (live: `wow fadeInUp`).
- Feature photos scale in on scroll (live: `react-multi-image wow scaleIn`).
- Hero slider slides horizontally, 1000 ms, no autoplay, arrows and counter (live: Swiper `speed: 1000`).
- Projects photos open in a lightbox with arrow-key navigation (live: Magnific Popup).
- Dropdown menu, FAQ accordion and mobile menu transitions.

Content stays visible without JavaScript; reveals are skipped under `prefers-reduced-motion`.

Not reproduced because the exact behavior could not be inspected: the theme's `word-line` heading effect, an Elementor `slideInUp` entrance on an unidentified element, possible number counters, and `smooth-scroll.js` (removed on purpose — it overrides native scrolling). Compare with the live site and add them if wanted.

## Assets

`ASSETS.md` lists every image with its original URL, local path, where it is used, and whether the mapping is confirmed.

## Deploy

Build command `npm run build`, output directory `dist`.

- **Netlify / Cloudflare Pages:** `public/_redirects` and `public/_headers` are picked up automatically.
- **Vercel:** `vercel.json` holds the same redirects, trailing-slash rule and cache headers.

Before switching DNS:

1. Run `npm run assets` and commit the images in `public/images`.
2. Open the old `https://modemechanical.com/sitemap_index.xml`, list every URL, and add a redirect for any URL that has no page here.
3. After launch, submit `https://modemechanical.com/sitemap-index.xml` in Google Search Console.

## Design system — "two temperatures" (October 2026 redesign)

The Mode Mechanical logo pairs a snowflake and a flame, so the site pairs a cool blue with an ember
orange on a deep ink base. Tokens live at the top of `src/styles/global.css`; older token names
(`--blue-500`, `--navy-900`, …) are kept as aliases.

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#0E2238` | headings, dark surfaces |
| `--cool` | `#2C6BE0` | cooling, links, primary buttons |
| `--ember` | `#C2410C` | heating buttons and small text |
| `--warm` | `#EE5A24` | heating accents, large text only |
| `--ice` / `--blush` | `#E6EFFD` / `#FDEBE2` | cool and warm tint surfaces |

Headings use Bricolage Grotesque (variable, slightly condensed); body text stays Manrope.

### Signature airflow effect — `src/components/Airflow.astro`

Cold air streams in from the left and hot air rises in from the right on a custom Canvas 2D flow
field (no dependencies). Used by the home hero (`TempHero.astro`) and every inner-page banner
(`PageBanner.astro`, lower density).

Reference components reviewed: the flow-field background was the closest fit and confirmed the
approach (Canvas 2D particles with fading trails and pointer repulsion). WebGL fluid simulations were
ruled out as too heavy for phones; heatmaps and pattern clouds don't read as moving air. The result is a
custom two-current version of the flow-field idea.

Performance safeguards:

- Particle count scales with area; device pixel ratio capped at 1.5 (1 on phones); strokes batched into 24 paths per frame.
- A still frame paints immediately; motion starts after load when the browser is idle (desktop) or on the first touch/scroll, or after 6 s (phones). Phones run at 30 fps.
- Pauses off-screen and in background tabs; halves particles automatically if frames get slow.
- Mist is plain CSS gradients (no `filter: blur`); glass blur on the hero cards only on desktop pointers.
- `prefers-reduced-motion` or Save-Data: a single static frame, no animation loop.

### Other changes in the redesign

- Home: two-temperature hero with "It's too hot" / "It's too cold" choices that open the matching symptom on the Repair page; services as a bento (Repair largest); service areas as a borough list.
- Inner pages: dark split banners with the airflow, page-specific intro lines.
- Repair: symptom finder built on native `<details>` (works without JavaScript; `/repair/#<symptom>` opens it).
- Phones: a fixed Call / Book bar on every page.
- Footer: the phone number as the largest element; temperature gradient rule on footer and CTA.
- Removed the hero slider (`HeroSlider`), replaced by the new hero.
- Brands: the second "unlabeled" logo was a duplicate of Trane and was removed.

Lighthouse after the first pass (mobile, local build, no GPU): Home 77–86, Repair 91–94, About 89, Contact 87.

### Hero air conditioner, header and footer (second pass)

- **AC unit** (`src/components/AcUnit.astro`): a wall-mounted split unit drawn in inline SVG (~3 KB),
  lit blue from the cold side and ember from the warm side, with a swinging louver and a display
  showing a cooling and a heating set point. The Shutterstock reference clip was used only as a visual
  reference: stock footage needs a paid license and a video would weigh several MB, so the effect is
  recreated in SVG + Canvas instead.
- **Airflow from the outlet**: `Airflow.astro` now accepts an emitter (`[data-airflow-emitter]`).
  On the home page most air leaves the AC outlet — cold air spreads left and sinks, warm air spreads
  right and curls upward — with a small share of ambient air from the edges. Inner-page banners keep
  the edge-to-edge flow.
- **Header**: two-temperature underline on links, rotating chevron, emergency phone next to the
  button (wide screens), soft shade over the hero, frosted white once scrolled, refined dropdown,
  redesigned mobile menu (large display-type links, outlined call button).
- **Footer**: same structure and content, with glows echoing the hero, an extra "Email us" button,
  contact details as icon rows (including opening hours), hover states and a "Back to top" link.

Lighthouse mobile after this pass (local build, no GPU): Home 86–93, Repair 85–94;
Accessibility, Best Practices and SEO 100.

## Project structure

```
src/
  data/          site.ts (business details, nav, stats), seo.ts (titles/descriptions/H1),
                 features.ts, faq.ts, brands.ts, testimonials.ts
  layouts/       BaseLayout (head, schema, header/footer, UTM), ServiceLayout
  components/    Header, Footer, TopBar, PageBanner, SectionHeading, FeatureGrid, BrandLogos,
                 CtaBox, ServiceAreas, Stats, Testimonials, ServiceSidebar, Icon
  components/islands/  MobileNav, HeroSlider, FaqAccordion, ContactForm (React)
  pages/         /, /about-us/, /installation/, /maintenance/, /repair/, /projects/, /contact/, 404
scripts/         fetch-assets.mjs, verify-build.mjs
```

Text lives in `src/data/` and the page files. Business details are in one place: `src/data/site.ts`.

## Verification already run

- `astro check` + production build: 0 errors.
- `npm run verify`: all checks passed for the 7 pages.
- Playwright at 1440px and 390px: no console errors, no horizontal scroll; mobile menu opens/closes (Escape works), slider navigates, FAQ toggles with `aria-expanded`.
- Contact form (Playwright with a mock endpoint): empty submit shows four errors and focuses Name; invalid email and phone are rejected; `+1 (914) 223-3301` is accepted and sent as `9142233301`; the button is disabled while sending; 2xx shows the confirmation; 500 shows the error and no success; UTM parameters from the landing URL arrive in the payload; with no endpoint, the "not sent" message appears.
- Reveals: images start hidden and appear on scroll; skipped under reduced motion. Lightbox opens, arrow keys navigate, Escape closes and returns focus.
- Lighthouse mobile on the local build: Home 100 / 100 / 100 / 100 (performance, accessibility, best practices, SEO), Repair 97 performance, Contact 100.
  These ran with lightweight placeholder images, so expect lower scores with the real photos.

Not yet done: a side-by-side visual comparison with the live site, downloading the images (`npm run assets` needs access to modemechanical.com, which the build environment did not have), submission against the real backend, and testing on the final host.

## Changes compared with the live site

- Phone links fixed to `tel:+19142233301`; the wrong `914 233 3301` on the Contact page is gone.
- Typos fixed (`Satisfication`, `Maintenace`, `Specialize`, `Testimonail`).
- Demo testimonials from the theme are not migrated; the section is hidden until real reviews are added.
- Accent blue darkened for text and buttons (`#6a8fd6` → `#4a70bf`) and body text slightly darker, to meet WCAG AA contrast. The original blue is kept for decorative fills.
- Icon fonts, Roboto/Roboto Slab from the preview host, WooCommerce assets and WOW.js are removed.
- The footer "Services" link pointed to `/services/` (404); it now goes to `/installation/`, and `/services/` redirects home.

## TODO for the owner

- [ ] `src/data/testimonials.ts` — add real reviews.
- [ ] `src/data/site.ts` — confirm ZIP code and the "300+ projects / 100% satisfaction" figures.
- [ ] `src/data/brands.ts` — two logos were unlabeled on the live site; confirm their brands.
- [ ] `scripts/fetch-assets.mjs` — add the URLs of the inner-page banner image and the white footer logo (see `MISSING_ASSETS.md` after running `npm run assets`).
- [ ] `src/pages/projects/index.astro` — replace generic captions with one-line project descriptions.
- [ ] `public/_redirects` / `vercel.json` — add redirects for any old URLs from the WordPress sitemap.
