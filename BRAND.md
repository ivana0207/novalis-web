# Novalis — Brand Guide (web)

> Implementation tokens: `css/ds.css` (from the claude.ai/design Novalis design system) — it takes precedence over hex values below.

Summarized from: *CGP priročnik* (visual identity manual, SIMETRIJA), *Novalis_Jumbo_5x2_F.pdf* (billboard),
*pilon5.pdf* (pylon variants A–F), *tehnika.pdf* (department banners), and the *VALIS Novalja* logo.

Company: **Novalis d.o.o.**, Josipa Kunkere 8, 53291 Novalja (Pag, Croatia) — www.novalis.hr
Store formats: **NOVALIS**, **HIPER NOVALIS** (Shopping centar, Špital bb, Novalja), **MARKET NOVALIS**.
Brand values (from manual): *uživanje, strast i povjerenje* (enjoyment, passion, trust); Mediterranean lifestyle,
tradition, family, well-being. Site language: Croatian primary (manual uses multilingual signage: HR / EN / DE / IT / CZ).

---

## 1. Logo

- **Wordmark "NOVALIS"**: custom ultra-heavy geometric caps (note the slanted cut on the V/A join and the notched S).
  It is artwork, never set in a font — use the SVG file. *(Logo SVGs still needed from the client/agency.)*
- **Primary logo** = red wordmark. **Secondary logo** = yellow wordmark.
- **Lockups**: `HIPER NOVALIS` / `MARKET NOVALIS` — descriptor word in thin/light caps, same colour as wordmark.
  - Horizontal: descriptor to the left, baseline-aligned.
  - Stacked: descriptor above, right-aligned to the wordmark.
  - Large stacked descriptor (descriptor as wide as wordmark) — **exceptional use only** (totem, pylon).
- **Geometry (stacked)**: descriptor cap-height = 3 units, gap = 1 unit, wordmark height = 4 units.
- **Clear space**: min **3 units** on every side (unit = 1/4 of wordmark height). Web: `padding: 0.75 × logo-height`.
- **Minimum size**: NOVALIS & MARKET NOVALIS horizontal: 4 mm high (≈ **16 px** on screen);
  stacked HIPER NOVALIS: 10 mm (≈ **40 px**). No maximum.
- **On colour**:
  - Red gradient background → yellow logo.
  - Yellow gradient background → red logo.
  - Grey/tinted backgrounds: **black logo up to 30 %** tone, **white logo from 55 %** tone.
- Don't: recolour outside red/yellow/black/white, stretch, outline, add effects, or set "NOVALIS" in a typeface.

## 2. Supporting element — shopping-cart badge

Rounded square (large radius on 3 corners, one **sharp top-right corner**), rotated ≈ **-15°**,
line-art cart inside, with a darker offset "shadow" plate behind (shifted right/down).
- Red badge + yellow cart, or yellow badge + red cart; shadow plate = dark red `#9E0B0F`.
- Works standalone, on yellow gradient, red gradient, or the red/orange pattern.
- Good for: favicon/app icon, hero accents, loyalty/online-shop sections.

## 3. Colours

### Primary
| Token | Name | HEX | RGB | CMYK | Pantone |
|---|---|---|---|---|---|
| `--nv-red` | Novalis red | `#D61920` | 214 25 32 | 0 100 100 10 | 485 C |
| `--nv-red-dark` | Dark red | `#9E0B0F` | 158 11 15 | 0 100 100 40 | — |
| `--nv-yellow` | Novalis yellow | `#FFCB04` | 255 203 4 | 0 20 100 0 | 116 C |
| `--nv-orange` | Orange | `#F7941E` | 247 148 30 | 0 50 100 0 | — |

> ⚠️ The manual has the RGB values of *dark red* and *orange* **swapped** in the labels (page 6).
> Values above are corrected by matching CMYK and swatches.

Gradients (always left→right or top→bottom, horizontal preferred):
- Red: `#D61920 → #9E0B0F` (the "red podloga" also runs darker, to ≈ `#6E0F12`)
- Yellow: `#FFDD3C → #FFCB04 → #FEC20E`, or `#FFCB04 → #F7941E`

### Secondary (used for in-store category/aisle signage — good for category colour-coding on web)
| Token | HEX | RGB | CMYK |
|---|---|---|---|
| `--nv-slate` | `#667A85` | 102 122 133 | 64 44 39 8 |
| `--nv-slate-dark` | `#3D4A54` | 61 74 84 | 76 61 50 35 |
| `--nv-sand` | `#CCB08F` | 204 176 143 | 21 30 45 0 |
| `--nv-brown` | `#6A503C` | 106 80 60 | 46 59 73 37 |
| `--nv-lime` | `#A5CE39` | 165 206 57 | 40 0 100 0 |
| `--nv-olive` | `#6A8537` (≈, from swatch) | — | — |
| black / white | `#000` / `#FFF` | | |

> ⚠️ The dark-green swatch is mislabelled in the manual (copy of the orange's values). `#6A8537` is sampled from the swatch — confirm with the agency.
Each secondary pair also has a light→dark gradient.

### Mosaic pattern colours (building façade, shopping bag, billboard)
`#A0090F`, `#D61920`, `#ED1C24`, `#F04E2A`, `#F37130`, `#F7941E`, `#F8A51E`, `#F9C630`, `#FCD535`, `#FFCB04`

### VALIS Novalja (separate/sub-brand mark)
Purple `#6E3FF3` (≈, sampled visually) — serif "VALIS" caps + italic "Novalja", lace-style ring (Pag lace motif).
File: `assets/brand/valis-novalja-logo.jpg`. Keep it separate from the red/yellow Novalis system.

## 4. Graphic patterns

1. **Soft "petal" pattern** — overlapping large translucent circles/arcs in red→orange→peach, with a light glow in the centre.
   Used on envelopes, business cards, folders, flags, promo cards. On web: hero backgrounds, section banners (CSS radial
   gradients + overlapping circles, or supplied bitmap).
2. **Mosaic / block pattern** — rectangles of red, dark red, orange and yellow on a grid (façade, bag, billboard).
   Good for section dividers, hero side-panels, footer strips.
3. **Yellow corner triangle** — small yellow right-angle triangle in the bottom-left (or top-left) corner of red/orange
   promo cards, with a thin dark-red edge. Signature of "AKCIJA" labels.

## 5. Shapes

- Signature **"leaf" rounded rectangle**: 3 rounded corners + **1 sharp corner** (usually bottom-left or top-right).
  Used for every card, badge, sign, business card, flag panel. Radius is generous (≈ 20–25 % of the shorter side for
  small pills; ≈ 24–40 px for cards on web).
- Horizontal signs: full pill/half-round on one end, square on the other.

## 6. Typography

| Role | Font (print) | Web substitute (Google Fonts) until webfont licensed |
|---|---|---|
| Primary — body, UI, headings | **Karbon** (Light, Regular, Bold + italics) | **Figtree** (300/400/700) |
| Secondary — promos, "AKCIJA", impact headings | **Sharp Sans** (Light, Bold, Extrabold + italics) | **Plus Jakarta Sans** (300/700/800) |
| Decorative script (sparingly) | Pristina | Dancing Script (avoid on web) |

- Descriptor words in lockups/signage ("HIPER", "MARKET", aisle names "VINO · WINE · WEIN") → **light weight, uppercase, wide tracking**.
- Promo words ("AKCIJA", "TOP HIT") → **Sharp Sans Extrabold/Bold, uppercase**, white or yellow on red.
- Multilingual separators: `·` (middle dot) or ` I ` thin bar.

## 7. Iconography

Solid/filled pictograms, simple and rounded (bread, cherries, ham, pot, coffee, cutlery, flower, sink, T-shirt,
washing machine, anchor, lamp, screw, saw, paintbrush, teddy bear, tools, electronics, folders, gift…).
White or yellow on red; red on light grey. Department labels (tehnika): *tekstil | alati | igračke | elektronika | ured | suveniri*.

## 8. Photography

- **Detail shots** (Shutterstock-style): clean, close-up food — croissants, vegetables, cheese.
- **Premium lifestyle** (Getty-style): warm, personal, human presence, strong contrast/dark backgrounds (baker with bread, café).
- Warm tones; food is the hero.

## 9. Web rules of thumb

- Default surface white / very light grey `#F4F5F5`; red is the brand anchor (header/hero/CTA), yellow for highlights & logo on red.
- Text on red: white or yellow. Text on yellow: red or black. Never yellow text on white.
- Body text: near-black `#1A1A1A` or `--nv-slate-dark`; muted text `#8A8A8A`.
- Promotions ("AKCIJA") = red/orange petal gradient card + yellow corner triangle + white/yellow Sharp Sans caps.
