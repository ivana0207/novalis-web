# Novalis website

Website for Novalis d.o.o. (supermarkets, HIPER NOVALIS shopping centre, Hiper bau, veleprodaja, Slastičarna Valis,
Bistro Pod Zvon, Hotel Novalis — Novalja, otok Pag). Plain HTML/CSS/JS, no build step; opens straight from disk.

- **Design source:** claude.ai/design project `d4d27162-ec6f-45fa-b6e0-5225716be768`, files `Novalis-Landing-v4.dc.html` → `index.html` and `O-nama.dc.html` → `o-nama.html` (data: `units-v3.json`),
  built on the "Novalis design system" (`_ds/novalis-design-system-5a51f266…`). Brand rules summarized in [BRAND.md](BRAND.md).
- **Tokens:** `css/ds.css` (copied from the design system). Use its variables; don't invent new brand colors.
- **Logo & icons:** `js/brand-paths.js` holds the vector paths from the design system (`NV_PATHS.logos/icons/tile/pictos`).
  The NOVALIS wordmark is artwork — render it from those paths, never set it in a font.
- **Content/data:** all units, categories, hours and stories live in `data/units.js`. Hours are placeholders until Novalis confirms.
- **Scripts:** `js/site.js` is shared (header, footer, logos, image slots → `window.NV`); `js/app.js` is the landing page, `js/o-nama.js` the O nama page. Non-landing pages set `<body data-home="index.html">` so unit links point back to the landing.
- Shapes: "leaf" corners — `border-radius: 0 R R R` (sharp top-left) everywhere.
- Content language: Croatian first (HR/EN toggle is visual only for now).
