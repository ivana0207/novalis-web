# Novalis website

Website for Novalis d.o.o. (supermarkets, HIPER NOVALIS shopping centre, Hiper bau, veleprodaja, Slastičarna Valis,
Bistro Pod Zvon, Hotel Novalis — Novalja, otok Pag). Plain HTML/CSS/JS, no build step; opens straight from disk.

- **Design source:** claude.ai/design project `d4d27162-ec6f-45fa-b6e0-5225716be768`, files `Novalis-Landing-v4.dc.html` → `index.html` and `O-nama.dc.html` → `o-nama/index.html` (data: `units-v3.json`).
  Store pages: Design canvas https://claude.ai/artifact/Rd3o8cEGiSNr8J4zq5i9rR (approved 2026-10-09); the v2 store layout (Market Novalis): https://claude.ai/artifact/Uyuo4qZQMmQouBzt7rU9Sz (approved 2026-10-20);
  Hiper Novalis on v2 with departments (WEB-8): https://claude.ai/artifact/VwWc2QSKvQCy2RNVoqaLsy (approved 2026-10-21).
- **Design system:** "Novalis Design System" https://claude.ai/artifact/DUZ3944vHmYWT1NPhY72YY — it wins over older styling. Brand rules summarized in [BRAND.md](BRAND.md).
  Both come from the Novalis brand manual (PDF "CGP priročnik", Prijedlog vizualnog identiteta); where they disagree with it, the manual wins.
- **Tokens:** `css/ds.css` (from the design system's tokens.json). Use its variables; don't invent new brand colors.
- **Logo & icons:** `js/brand-paths.js` holds the vector paths (`NV_PATHS.logos/icons/tile/pictos`); stacked HIPER/MARKET lockups and the Valis mark are files in `assets/brand/`.
  The NOVALIS wordmark is artwork — render it from those paths/files, never set it in a font.
- **Content/data:** all units, categories, hours, occasions and store-page content (`slug`, `page`) live in `data/units.js`. Hours are placeholders until Novalis confirms (Pod Zvon is confirmed).
  Opening status is Novalja time (Europe/Zagreb) from the browser's clock. A day's hours come from one rule in `js/site.js` (`dayHours`):
  a unit's dated `exceptions` > its `openPeriod` (B&B: 1. 4. - 1. 11.) > the 14 national `holidays` (Easter-based ones computed; only units
  with `closedOnHolidays`: the shops and Veleprodaja) > that date's season table (summer 15. 5. - 30. 9.; shops open on summer Sundays only).
  A day closed by one of those rules shows just "Zatvoreno" (decisions 2026-10-19, WEB-28), and its store page's hours table marks no weekday row.
  Once a day's hours are over, a unit says when it opens next ("Zatvoreno · otvara sutra u 07:00"; list and map card: "Sutra 07:00 - 19:00").
  Each unit's `geo: [lat, lng]` places its map pin and its Upute link (Google Maps directions to that spot); Veleprodaja (no address yet, placed at Hiper Novalis) is an estimate until Novalis confirms.
  An optional `gmaps` (the share link of the unit's official Google Business listing; every unit has one; Veleprodaja uses Hiper Novalis's) makes its address, store-page pin and Upute open that listing.
- **Jira workflow:** tickets are in Jira project `WEB` (dabushka.atlassian.net). "Work on WEB-25" runs the `jira-work` skill (orchestrator + agents in `.claude/agents/`,
  project profile `.claude/workflow/project.json`, state in `.jira-work/`). It is local-only and read-only toward Jira; usage in [.claude/WORKFLOW.md](.claude/WORKFLOW.md).
- **Scripts:** `js/site.js` is shared (header, footer, logos, image slots, opening hours, unit cards, paths → `window.NV`); `js/app.js` is the landing page, `js/occasions.js` the "Zašto Novalis" band (#prilike) shared by the landing and O nama pages, `js/poslovnica.js` every store page, `js/lightbox.js` its Galerija lightbox (`NV.lightbox`, loaded before poslovnica.js),
  `js/map.js` the maps (landing #lokacije and each store page's Radno vrijeme i lokacija): MapLibre GL JS 5.24.0, vendored in `js/vendor/maplibre-gl-5.24.0/`
  (v6+ is ES-modules only and won't run from disk), drawing OpenStreetMap from OpenFreeMap's free Positron style (no key, no cookies) re-tinted in `PAINT`;
  the library loads only when a map comes near the screen, and a note with a fallback link shows if it can't run.
  `js/o-nama.js` the O nama story reveals (`[data-reveal]` groups appear in reading order on desktop ≥ 1024 only, photos unveil top-down; nothing is hidden without JS, on phones or with reduced motion).
  Pages in a folder (`o-nama/` and the store pages) set `<body data-root="../" data-home="../">` so asset paths and section links point back to the site root.
- **Plain addresses (user's choice, 2026-10-16):** the address bar shows only `/`, `/o-nama/`, `/hiper-novalis/` …, never `#section`, `?…` or `index.html`.
  site.js scrolls `#…` links without touching the address (`NV.goTo`) and strips any hash/query a page arrives with once it has loaded; don't write state into the URL.
- **Store pages:** one folder per unit (`hiper-novalis/`, `market-novalis/`, `hiper-bau/`, `veleprodaja/`, `valis/`, `pod-zvon/`, `hotel-novalis/`), each an identical `index.html` shell with
  `<body data-unit="…" data-root="../" data-home="../">`. Link to them with `NV.unitHref(u)` (clean `slug/` URLs; site.js adds `index.html` on click when opened from disk).
  `js/poslovnica.js` has two layouts. By default a store page shows hero, Ključne brojke, Ponuda, Galerija, Radno vrijeme i lokacija, Povezane poslovnice.
  A unit with `page.layout: 'v2'` (Market Novalis, WEB-9, approved 2026-10-20; Hiper Novalis, WEB-8, approved 2026-10-21; Hiper Bau, WEB-11, built 2026-10-21; Valis, WEB-12, and Pod Zvon, WEB-10, built 2026-10-21; Veleprodaja, WEB-13, built 2026-10-21 with a white hero, its word mark in red, label Novalis d.o.o., Zatražite ponudu instead of Upute (a size smaller on phones, `.store-hero__cta`), Ponuda one floor like Hiper Bau with only Oprema za ugostiteljstvo opening)
  shows hero (cart badge beside a stacked lockup via `NV.tileSVG`; Hiper Bau has no logo file yet, so it keeps its typeset lockup, as does Pod Zvon; Valis keeps its logo (no "Dobro došli" script); address linked to the Google listing, Upute plus icon-only call/e-mail buttons whose
  number or address shows on hover/focus, Esc hides it), Radno vrijeme i lokacija (nothing under the map, pin in `--nv-red`), Ponuda (an isometric
  building of `page.floors` when every offer line names a floor; floors may carry a `note`; a short lead (body size) under the heading; sized to fit the screen height with them;
  an offer line `['text', floor, 'details']` is a department that opens (+, native `<details>`) to what it sells, and then the legends stay in the page flow, from 1200 the top floor's level with the building's top and the ground floor's with its foot; a single floor (Hiper Bau, Veleprodaja) faces right with its legend beside it;
  Valis shows its 1. kat and prizemlje only (the 2. kat beauty centar is left out); Pod Zvon has three (1. kat konoba and meeting space, prizemlje pizzerija, podrum vinski podrum; user, 2026-10-21): from 1200 floors 1 and -1 share the left column, the building is narrower to fit the screen height),
  Brendovi only where `page.brands` exists (Hiper Bau: 35 logos in `assets/img/brendovi/`, 320 x 160 WebP already trimmed and size-balanced; each links in a new tab to the brand's Croatian site, else its European/international one; `null` = no confirmed site, logo without a link; phones/tablets show 4 rows and "Prikaži sve brendove"), Galerija (whole rows: 10 tiles, 5 across from 900), Ostale poslovnice (every other unit, `related` first, as many cards as fill whole rows). Its CSS is scoped to `.store--v2`;
  units without the flag must render exactly as before. Either way only the hero takes the store's theme and mark.
  A gallery entry `[null, 'Foto: …']` shows a placeholder describing the photo still needed (a professional photographer will take them).
  Each real photo in Galerija (both layouts) opens the lightbox (user's request, 2026-10-21): a native modal `<dialog>`, photo enlarged to fit the screen over the blurred page,
  arrows / ← → / swipe (or mouse drag) slide between the unit's photos and loop; the X, Esc or a click anywhere outside the photo closes it, focus returns to that tile. Placeholders don't open it.
  Povezane poslovnice uses the landing's unit cards (`NV.cardHTML` + `NV.cardGrid`: hover panel, rise-in entrance, live hours).
  B&B Novalis (`hotel-novalis/`, user's request 2026-10-21; it used to link out to hotelnovalis.hr) is v2 in the hotel's own look: theme `ink`
  (dark with sand), its logo `assets/brand/bb-novalis-white.svg` and lace rosette (`pattern: 'lace'`, from 1100 px), "Rezervirajte" to its website
  hotelnovalis.hr (the only hero button besides call/e-mail; a separate website button was removed as a duplicate), Boravak under the hours (`page.stay`), Ponuda as a two-level building
  without floor signs (Krovne terase, Sobe), and Sobe after it (`page.rooms`: one row, three rooms opening their pages on hotelnovalis.hr in a new tab, plus a
  "Pogledajte sve sobe" tile). Copy and photos come from hotelnovalis.hr (Novalis's own site).
- **Cache busting:** every page loads CSS/JS with `?v=YYYYMMDD` (`-2`, `-3` … for later changes the same day). When you change any CSS or JS file, bump that version in all HTML pages
  (`index.html`, `o-nama/index.html`, `pravila-o-privatnosti/index.html`, `zaposli-se/index.html`, the seven store `index.html` files, their ten English twins under `en/`
  (`en/index.html`, `en/about-us/`, `en/careers/`, `en/privacy-policy/`, the seven `en/<slug>/`), `404.html`: nine times there, three inside its scripts), or browsers mix cached old scripts with new pages.
- **Zaposli se (`zaposli-se/`, WEB-23, 2026-10-22):** Novalis's jobs text from novalis.hr and a CV form (`js/zaposli-se.js`, styles under `.jobs`). It posts to the
  site's only server code, the Vercel function `api/apply.mjs` (helpers in `api/_lib/`, no npm dependencies): it checks the fields, the file's real content
  (PDF/DOC/DOCX, max 4 MB, no macros), a honeypot and a per-instance rate limit, then e-mails the CV through Brevo to `kadrovska@novalis.com.hr`. The file
  stays in memory, is never stored or served. It needs the Vercel env `BREVO_API_KEY` and `MAIL_FROM` (a Brevo-verified sender); without them it answers 503
  and the page, like on disk or GitHub Pages, shows only the e-mail address. The page never shows success unless the function confirmed it.
  Local test: `.jira-work/WEB-23/evidence/dev/` (`handler.test.mjs`, `dev-server.mjs` with a mock sender; git-ignored).
- **Not found (`404.html`, WEB-27, 2026-10-22):** Vercel and GitHub Pages show it with status 404 at any missing address, which stays as typed (`<body data-notfound>`).
  Header, footer, the headline "Stranica nije pronađena", one sentence, "Na početnu"; never an error code on screen (user: "404 means nothing" to visitors). noindex, no canonical, not in the sitemap.
  It is served at any depth, so its `<head>` script works out the site root (`NV_ROOT`: `/`, the `/novalis-web/` folder on GitHub Pages, or its folder on disk) and writes the stylesheets
  and scripts from it; its links are written from `/` and get that root in front; `<noscript>` copies serve Vercel without JS. Smoke can't check it (it expects 200 and a canonical).
  Under `/en/…` (after that root) it is English: `NV_EN` sets `lang` and title, and the markup is swapped for `template#notfound-en` ("Page not found", "Go to the home page") before the scripts load; without JS it stays Croatian.
- **Loading look (WEB-27):** a real photo on its way (`.slot--photo`, from `NV.slotHTML`), the store hero photo, a map being drawn (`.is-loading`, js/map.js) and the lightbox photo show
  their frame's tint with a band of light crossing every 2 s (`nv-load`, `--sheen`/`--sheen-dark`); the photo fades in on `is-loaded` (js/site.js). Photos still missing keep the striped
  placeholder. Reduced motion: tint only; forced colours: no band.
- Accessibility (WCAG 2.2 AA): every page starts with a skip link to its `<main>`; unit names are wrapped in `translate="no"`; links that open a new tab say so with a hidden " (nova kartica)" (`NV.NEW_TAB`); text on brand colours is checked for 4.5:1.
- **Privacy (`pravila-o-privatnosti/`, same address as on novalis.hr):** the Pravila o privatnosti, linked from every footer and the inquiry form.
  It says the site uses no cookies or browser storage and names every outside service (Vercel; OpenFreeMap, which delivers the
  map through Cloudflare; Brevo, which e-mails job applications). Adding analytics, an embed, a form service or anything else loaded from another server changes that:
  update its sections 6-10 and the date (a cookie banner is needed only once something stores data in the browser). The wording
  is a draft until Novalis approves it.
- **SEO:** public address for now is https://novalis-web.vercel.app/ (user's choice, 2026-10-10). It is written in each page's `<head>`
  (canonical + Open Graph), `robots.txt` and `sitemap.xml`; JSON-LD URLs follow the canonical link. Page `<head>` tags (title, description,
  og:image) are per page — keep them in sync with `data/units.js`. Business info for Google (schema.org JSON-LD) is built from the data
  (`schema`, address, phone); only hours with `hoursConfirmed: true` are published. `vercel.json` adds trailing slashes and redirects.
- **Moving to novalis.hr later:** replace `https://novalis-web.vercel.app/` with `https://novalis.hr/` in the 22 pages (11 Croatian, 11 English), `robots.txt`,
  `sitemap.xml` and `PAGE` in `api/_lib/mail.mjs` (plus `ALLOWED_ORIGINS` if the function is reached from another host); add 301s in `vercel.json` for old WordPress URLs (`/bistro-i-slasticarna-valis/` → `/valis/`, `/about/` → `/o-nama/`,
  `/kontakt/` → `/#upit`, old news posts → `/`; `/hotel-novalis/` is now a page here too). Blockers: the daily price-list CSVs
  (`/info-o-cijenama/`, legally required for supermarkets) need a home. The jobs page keeps its address (`/zaposli-se/`).
- Shapes: the Novalis "tab" — three rounded corners, bottom-left square: `border-radius: R R R 0`; panels, cards and photos use `var(--shape-tab)` (20px). No soft shadows.
- Fonts: Figtree stands in for Karbon, Outfit for Sharp Sans until licensed files exist. Roles follow the design system (`css/ds.css`
  comment): Outfit (`--font-display`) only for headlines (h1, section headings, big statements and key figures, Bold 700) and promo
  words (Extrabold 800); everything else in Figtree (`--font-primary`): nav, buttons, links, uppercase labels, card and block titles
  (Bold 700), body (Regular 400), descriptors (Light 300). Weights are the brand manual's: Karbon/Figtree 300/400/700, Sharp Sans/Outfit
  700/800; no Medium or Semibold. All fonts are served from
  `assets/fonts/` through `css/fonts.css` (no Google Fonts requests: visitors' IPs would go to Google; keep it that way).
  The Material Symbols file holds only the icons the site uses (~4 KB instead of 460 KB): a new icon name shows as text until that file
  is made again, as the comment at the top of `css/fonts.css` explains.
- Landing hero entrance: an inline script in `index.html` `<head>` holds it (`.hero-wait`, max 1.2 s) until fonts, icons, photo and scripts are ready.
- **English (`en/`, WEB-21, 2026-10-23):** English pages are separate twins under `/en/`; a page's language is its address (`<html lang>` → `NV.LANG`),
  nothing is stored or detected. Every page has one (landing WEB-21; the rest 2026-10-23, user: "translate all the pages like homepage was"): `en/index.html`
  (`data-root="../"`), and one level deeper (`data-root="../../" data-home="../"`) `en/about-us/` (O nama), `en/careers/` (Zaposli se, same form and function),
  `en/privacy-policy/` (a translation, draft like the Croatian) and the store pages under their slug, except `en/wholesale/` (Veleprodaja, `en.slug`); the 404 switches itself (above).
  English text: `en: { … }` next to the Croatian fields in `data/units.js` (read with `NV.tx(item, field)`; unit names stay, except Veleprodaja → Wholesale and
  Valis → Valis Bistro & Pastry Shop). Store pages: `page.en` replaces page fields whole (offer lines keep the Croatian floor name they are matched by; `captions`
  are the gallery's captions in order), each floor has its own `en` (name, note); the B&B's title, room names and links come from hotelnovalis.hr/en/, and the
  Wholesale word mark is English. A hr/en string table in each script (site.js, app.js, occasions.js, map.js, poslovnica.js, lightbox.js, zaposli-se.js); opening-hours lines are whole English sentences.
  The HR / EN switch (header and footer) is links written in the HTML: the current language is plain text with `aria-current`, the other a link to the twin.
  `TWINS` in `js/site.js` maps every Croatian page to its twin (the store pages from the units), so the switch and unit links follow; static links in the
  English pages (About us, Careers, Privacy policy, Become a partner, the O nama story) are written to the English pages. Business `@id`s in JSON-LD come from the site root, identical in both languages;
  each Croatian page and its twin link each other with hreflang (x-default the Croatian one), also in `sitemap.xml`. English header: menu button up to 1159, compact row 1160 - 1289 (longer labels).
  Copy: `.jira-work/WEB-21/copy.md` for the landing (PO-approved draft, British English); the other pages translate their Croatian copy in the same glossary. Novalis checks all English wording before go-live.
  The job application e-mail to HR stays Croatian (it names the Croatian page as its source).
- Content language: Croatian first; English as above. Copy style: hyphens, no em/en dashes; ranges with a spaced
  hyphen (`07:00 - 19:00`, `Ponedjeljak - subota`); dates Croatian style (`15. 5.`); store copy only from novalis.hr or Novalis itself.
