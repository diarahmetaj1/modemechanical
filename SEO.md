# SEO for modemechanical.com

What is in place on the site, how it is kept correct, what to do at launch, and how to earn links.
`npm run build && npm run verify` checks everything in the first table on every build and fails on
any mistake.

## On the site

| Item | Status | Where / how it's enforced |
| --- | --- | --- |
| sitemap.xml | `/sitemap.xml` lists the 16 indexable pages at their canonical URLs; the 404 page is left out. Old addresses (`/sitemap_index.xml`, `/sitemap-index.xml`, `/sitemap-0.xml`) redirect to it. | `src/pages/sitemap.xml.ts`; verify fails if a page is missing or extra |
| robots.txt | Every crawler allowed, AI search crawlers named, `/api/` kept out, sitemap line. | `public/robots.txt`; verified |
| noindex | Only the 404 page is `noindex`; every other page is `index, follow`. | `BaseLayout` `noindex` prop; verified both ways |
| Meta titles | Unique, 50–60 characters (counted as shown, so `&` is one), keyword + location + brand. | `src/data/seo.ts`, `src/data/areas.ts`; verified |
| Meta descriptions | Unique, 150–160 characters, with the phone number on service and area pages. | same files; verified |
| Canonical tags | Self-referencing `https://modemechanical.com/...` with a trailing slash; `og:url` matches. | `BaseLayout`; verified |
| One H1 per page | Exactly one H1 on each page. | verified |
| Heading hierarchy | Starts at H1 and never skips a level (H1 → H2 → H3). | verified on every page |
| Schema markup | `HVACBusiness` on every page (hours, areas, 24/7 emergency line, services, profiles) with a stable `@id`; `WebSite` on the home page; `Service` on the 3 service pages and 7 area pages; `BreadcrumbList` on inner pages; `FAQPage` where FAQs are shown, matching the visible questions. | `BaseLayout`, `src/data/schema.ts`; verified (valid JSON, required types, FAQ text on page) |
| Images | Every image on every page is a `<picture>`: AVIF first, then WebP, then JPEG (photos) or PNG (logos, transparency kept), at several sizes, lazy-loaded below the fold, with fixed width/height (no layout shift). AVIF quality 60 for photos (as sharp as the JPEG fallback at about half its size; measured, see `src/lib/image-quality.ts`), 85 for logos. Photos carry no location data. Share images stay 1200×630 JPEG, since social networks don't show AVIF previews. | `src/components/Photo.astro`, `src/lib/image-quality.ts`, `public/images/og/`; verify fails on any image without an AVIF source |
| Alt text | Every image has descriptive alt text, including decorative duplicates (hidden from screen readers instead). | verified |
| URL slugs | Short, keyword-based, lowercase, hyphenated, trailing slash: `/hvac-repair/`, `/hvac-queens-ny/`. Old WordPress URLs redirect with 301s. | `vercel.json`, `public/_redirects` |
| Broken links | Every internal link, image, `srcset` file and `#anchor` resolves. | verified on every build |
| HTTPS | All URLs `https://`; no mixed content; HSTS header (2 years); Vercel redirects `http://` to `https://` automatically. Also nosniff, referrer-policy, frame and permissions headers. | `vercel.json`, `public/_headers`; verified (no `http://` URLs) |
| Core Web Vitals | Lighthouse (lab, simulated mid-range phone on slow 4G) on all 15 pages: desktop performance 100; mobile 97–98. Largest Contentful Paint under 2.5 s (Google's "good") on 13 of 15 pages; Home and Projects at 2.56 s, since their sharper photos share bandwidth with the heading font in this slow-4G test. Layout shift 0.018 or less. Accessibility, Best Practices and SEO 100 on every page. | heading font cut to the characters the site uses (−29%, pixel-identical), sections far below the screen skip rendering until near, hero animation deferred, images sized and lazy-loaded |
| Mobile | Every page at 320, 360, 375, 390, 414, 768 and 1024 px wide: no sideways scrolling, no text under 12 px, every section appears when scrolled to, no script errors; jump links land on target. Every tap target is at least 44×44 px on phones and tablets (Apple's and WCAG's enhanced size), apart from links inside sentences; desktop layout is unchanged. | tested in Chromium with Playwright |
| Accessibility | 0 axe-core violations (WCAG 2.2 AA) on every page; screen-reader structure checked. | see `ACCESSIBILITY.md`, including the 10-minute VoiceOver test to do on a phone |
| Privacy policy | `/privacy-policy/`, linked from the footer and the contact form. Sections on Google Analytics and the assistant appear only when those are switched on. | `src/pages/privacy-policy/index.astro` |
| AI search | `/llms.txt` and `/llms-full.txt`, AI crawlers allowed. | see README "Getting found by AI assistants" |

Field data (real visitors' Core Web Vitals) appears in Search Console about a month after launch,
once Google has enough visits; lab scores above are the best predictor until then.

## At launch (owner)

1. **Domain in Vercel** (Project → Settings → Domains): add `modemechanical.com` and
   `www.modemechanical.com`, and set **modemechanical.com as the primary**, with www redirecting to
   it. That matches the canonical URLs. Vercel issues the HTTPS certificate automatically. Vercel
   preview deployments are marked `noindex` by Vercel, so they don't compete with the real site.
2. **Old WordPress URLs:** before switching DNS, open the old `https://modemechanical.com/sitemap_index.xml`
   and check that every URL listed there either still exists or has a redirect in `vercel.json`.
   Send me the list and I'll add any missing redirects.
3. **Google Search Console:** add a Domain property (DNS TXT record), submit
   `https://modemechanical.com/sitemap.xml`, and use URL Inspection → Request indexing for the home,
   service and area pages.
4. **Bing Webmaster Tools:** import the site from Search Console (one click) and submit the same
   sitemap. Bing also feeds ChatGPT search and Copilot.
5. **Google Business Profile:** website link `https://modemechanical.com/`, hours 08:00–20:00,
   service areas, and the address hidden (service-area business).

## Backlink strategy

For a local contractor, links from relevant local and industry sites, and consistent listings, matter
far more than link volume. One mention from a manufacturer or a Brooklyn organisation is worth more
than hundreds of generic directory links.

**Rules for every listing: the same name, phone and website everywhere.**
`Mode Mechanical` · `(914) 223-3301` · `https://modemechanical.com/` · Brooklyn, NY 11238
(hide the street address where the site allows it, as on Google).

### 1. Foundation listings (weeks 1–2)
Google Business Profile · Bing Places · Apple Business Connect · Yelp · Facebook · Instagram ·
LinkedIn company page · Nextdoor business page · BBB · Angi · HomeAdvisor · Thumbtack · Houzz ·
Porch · YP.com · Manta · MapQuest/Foursquare.
These are mostly "nofollow" links, but they are what Google, Bing and AI assistants use to confirm
the business is real and where it works. Keep a sheet of each login and the exact details used.

### 2. Manufacturer and program listings (highest value; where you qualify)
- **Manufacturer contractor programs**: Mitsubishi Electric Diamond Contractor, Daikin Comfort Pro,
  Carrier Factory Authorized Dealer, Trane Comfort Specialist, Fujitsu Elite Contractor, and LG's
  dealer program. Each lists certified contractors on the manufacturer's "find a contractor" page.
  These are the most relevant links an HVAC company can get, and they bring leads directly.
- **NYS Clean Heat / Con Edison heat-pump incentive program**: participating contractors are listed
  for customers looking for rebated heat-pump installs. It's highly relevant for Brooklyn and Queens.
- **Distributor contractor lists**: the supply houses you buy from often list or recommend contractors.

### 3. Local Brooklyn and NYC links (months 1–3)
- **Business associations and BIDs** near your base (the 11238 area: Prospect Heights, Clinton Hill,
  Fort Greene): member directories link to members. The Brooklyn Chamber of Commerce does the same.
- **Sponsorships**: a youth team, a block party, a community garden. Sponsors are usually listed
  with a link.
- **Property managers, co-op/condo management companies and real-estate offices**: ask to be on
  their recommended-vendor pages after you've done work for them.
- **Trade partners**: plumbers, electricians, general contractors and architects you work with.
  Mutual "partners" pages are fine when the relationship is real.

### 4. Content that earns links (ongoing)
Write short, genuinely useful pages that local sites want to cite, for example:
- "Getting co-op board approval for a mini-split in Brooklyn"
- "Heat-pump rebates for NYC homeowners in 2027"
- "What NYC's Local Law 97 means for small buildings' heating"
Share them with neighbourhood newsletters, local news (Brooklyn Paper, Patch), building-management
blogs and community groups. One mention from local news is worth dozens of directory links.

### 5. Reviews (continuous)
Ask every happy customer for a Google review (send them your Google profile link; it is also on the site's Contact page), and
reply to every review. Reviews that name the service and neighbourhood help both Google Maps and AI
assistants.

### Avoid
Buying links, link networks, "1,000 backlinks" packages, mass directory submissions, paid guest
posts and large link swaps. They can get the site penalised and are hard to undo.

### Track progress (monthly)
- Search Console → Links: who links to the site.
- Ahrefs Webmaster Tools (free for your own site): backlinks and broken links.
- A simple sheet: each listing or link, the date, the details used, and the status.

### 90-day plan
| Weeks | Do |
| --- | --- |
| 1–2 | Launch steps above; Google Business Profile, Bing Places, Apple, Yelp, Facebook, Instagram complete and consistent |
| 3–4 | Remaining foundation listings; ask the last 20 customers for reviews |
| 5–8 | Apply to the manufacturer programs you qualify for and Clean Heat; join a local business association |
| 9–12 | Publish two helpful articles and share them locally; one sponsorship; partner pages with 2–3 trade partners |
