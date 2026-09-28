# Novalis website

Website for Novalis d.o.o. (supermarkets, HIPER NOVALIS shopping centre, Hiper bau, veleprodaja, Slastičarna Valis,
Bistro Pod Zvon, Hotel Novalis — Novalja, otok Pag). Plain HTML/CSS/JS, no build step; opens straight from disk.

- **Design source:** claude.ai/design project `d4d27162-ec6f-45fa-b6e0-5225716be768`, file `Novalis-Landing-v2.dc.html`,
  built on the "Novalis design system" (`_ds/novalis-design-system-5a51f266…`). Brand rules summarized in [BRAND.md](BRAND.md).
- **Tokens:** `css/ds.css` (copied from the design system). Use its variables; don't invent new brand colors.
- **Logo & icons:** `js/brand-paths.js` holds the vector paths from the design system (`NV_PATHS.logos/icons/tile/pictos`).
  The NOVALIS wordmark is artwork — render it from those paths, never set it in a font.
- **Content/data:** all units, hours, stories live in `data/units.js`. Hours and `[adresa]` values are placeholders until Novalis confirms.
- Shapes: "leaf" corners — `border-radius: 0 R R R` (sharp top-left) everywhere.
- Content language: Croatian first (HR/EN toggle is visual only for now).
