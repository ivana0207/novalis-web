# Novalis website

Website for Novalis d.o.o. (supermarkets, HIPER NOVALIS shopping centre, Hiper bau, veleprodaja, Slastičarna Valis,
Bistro Pod Zvon, Hotel Novalis — Novalja, otok Pag). Plain HTML/CSS/JS, no build step; opens straight from disk.

- **Design source:** claude.ai/design project `d4d27162-ec6f-45fa-b6e0-5225716be768`, files `Novalis-Landing-v4.dc.html` → `index.html` and `O-nama.dc.html` → `o-nama/index.html` (data: `units-v3.json`).
  Store pages: Design canvas https://claude.ai/artifact/Rd3o8cEGiSNr8J4zq5i9rR (approved 2026-10-09).
- **Design system:** "Novalis Design System" https://claude.ai/artifact/DUZ3944vHmYWT1NPhY72YY — it wins over older styling. Brand rules summarized in [BRAND.md](BRAND.md).
- **Tokens:** `css/ds.css` (from the design system's tokens.json). Use its variables; don't invent new brand colors.
- **Logo & icons:** `js/brand-paths.js` holds the vector paths (`NV_PATHS.logos/icons/tile/pictos`); stacked HIPER/MARKET lockups and the Valis mark are files in `assets/brand/`.
  The NOVALIS wordmark is artwork — render it from those paths/files, never set it in a font.
- **Content/data:** all units, categories, hours, occasions and store-page content (`slug`, `page`) live in `data/units.js`. Hours are placeholders until Novalis confirms (Pod Zvon is confirmed).
  Each unit's `geo: [lat, lng]` places its map pin and its Upute link (Google Maps directions to that spot); Veleprodaja (no address yet, placed at Hiper Novalis) is an estimate until Novalis confirms.
  An optional `gmaps` (the share link of the unit's official Google Business listing; every unit has one; Veleprodaja uses Hiper Novalis's) makes its address, store-page pin and Upute open that listing.
- **Jira workflow:** tickets are in Jira project `WEB` (dabushka.atlassian.net). "Work on WEB-25" runs the `jira-work` skill (orchestrator + agents in `.claude/agents/`,
  project profile `.claude/workflow/project.json`, state in `.jira-work/`). It is local-only and read-only toward Jira; usage in [.claude/WORKFLOW.md](.claude/WORKFLOW.md).
- **Scripts:** `js/site.js` is shared (header, footer, logos, image slots, opening hours, unit cards, paths → `window.NV`); `js/app.js` is the landing page, `js/occasions.js` the "Zašto Novalis" band (#prilike) shared by the landing and O nama pages, `js/poslovnica.js` every store page,
  `js/map.js` the maps (landing #lokacije and each store page's Radno vrijeme i lokacija): MapLibre GL JS 5.24.0, vendored in `js/vendor/maplibre-gl-5.24.0/`
  (v6+ is ES-modules only and won't run from disk), drawing OpenStreetMap from OpenFreeMap's free Positron style (no key, no cookies) re-tinted in `PAINT`;
  the library loads only when a map comes near the screen, and a note with a fallback link shows if it can't run.
  `js/o-nama.js` the O nama story reveals (`[data-reveal]` groups appear in reading order on desktop ≥ 1024 only, photos unveil top-down; nothing is hidden without JS, on phones or with reduced motion).
  Pages in a folder (`o-nama/` and the store pages) set `<body data-root="../" data-home="../">` so asset paths and section links point back to the site root.
- **Plain addresses (user's choice, 2026-10-16):** the address bar shows only `/`, `/o-nama/`, `/hiper-novalis/` …, never `#section`, `?…` or `index.html`.
  site.js scrolls `#…` links without touching the address (`NV.goTo`) and strips any hash/query a page arrives with once it has loaded; don't write state into the URL.
- **Store pages:** one folder per unit with a page (`hiper-novalis/`, `market-novalis/`, `hiper-bau/`, `veleprodaja/`, `valis/`, `pod-zvon/`), each an identical `index.html` shell with
  `<body data-unit="…" data-root="../" data-home="../">`. Link to them with `NV.unitHref(u)` (clean `slug/` URLs; site.js adds `index.html` on click when opened from disk).
  Every store page has the same sections in the same order — hero, Ključne brojke, Ponuda, Galerija, Radno vrijeme i lokacija, Povezane poslovnice; only the hero takes the store's theme and mark.
  Povezane poslovnice uses the landing's unit cards (`NV.cardHTML` + `NV.cardGrid`: hover panel, rise-in entrance, live hours).
  B&B Novalis has no page — it links to hotelnovalis.hr.
- **Cache busting:** every page loads CSS/JS with `?v=YYYYMMDD` (`-2`, `-3` … for later changes the same day). When you change any CSS or JS file, bump that version in all HTML pages
  (`index.html`, `o-nama/index.html`, the six store `index.html` files), or browsers mix cached old scripts with new pages.
- Accessibility (WCAG 2.2 AA): every page starts with a skip link to its `<main>`; unit names are wrapped in `translate="no"`; links that open a new tab say so with a hidden " (nova kartica)" (`NV.NEW_TAB`); text on brand colours is checked for 4.5:1.
- **SEO:** public address for now is https://novalis-web.vercel.app/ (user's choice, 2026-10-10). It is written in each page's `<head>`
  (canonical + Open Graph), `robots.txt` and `sitemap.xml`; JSON-LD URLs follow the canonical link. Page `<head>` tags (title, description,
  og:image) are per page — keep them in sync with `data/units.js`. Business info for Google (schema.org JSON-LD) is built from the data
  (`schema`, address, phone); only hours with `hoursConfirmed: true` are published. `vercel.json` adds trailing slashes and redirects.
- **Moving to novalis.hr later:** replace `https://novalis-web.vercel.app/` with `https://novalis.hr/` in the 8 pages, `robots.txt` and
  `sitemap.xml`; add 301s in `vercel.json` for old WordPress URLs (`/bistro-i-slasticarna-valis/` → `/valis/`, `/about/` → `/o-nama/`,
  `/kontakt/` → `/#upit`, `/hotel-novalis/` → https://hotelnovalis.hr, old news posts → `/`). Blockers: the daily price-list CSVs
  (`/info-o-cijenama/`, legally required for supermarkets) need a home, plus privacy, cookie and jobs pages.
- Shapes: the Novalis "tab" — three rounded corners, bottom-left square: `border-radius: R R R 0`; panels, cards and photos use `var(--shape-tab)` (20px). No soft shadows.
- Fonts: Figtree stands in for Karbon (body), Outfit for Sharp Sans (headlines) until licensed files exist.
  Material Symbols loads only the icons the site uses (`icon_names=` in the font link of all 8 pages, alphabetical; ~4 KB instead of 460 KB).
  A new icon name must be added there on every page, or it shows as text.
- Landing hero entrance: an inline script in `index.html` `<head>` holds it (`.hero-wait`, max 1.2 s) until fonts, icons, photo and scripts are ready.
- Content language: Croatian first (HR/EN toggle is visual only for now). Copy style: hyphens, no em/en dashes; ranges with a spaced
  hyphen (`07:00 - 19:00`, `Ponedjeljak - subota`); dates Croatian style (`15. 5.`); store copy only from novalis.hr or Novalis itself.
