/* Novalis store page (hiper-novalis/, market-novalis/, hiper-bau/, veleprodaja/, valis/, pod-zvon/, hotel-novalis/) — renders one
   unit's page from data/units.js on top of js/site.js. Every store page has the same sections; only the hero takes
   the store's theme and mark. The unit comes from <body data-unit="…">.
   Two layouts: units with page.layout 'v2' (WEB-9; Market Novalis, Hiper Novalis, Hiper Bau, Valis, Pod Zvon,
   Veleprodaja: all six now) get the reworked page (V2 below: hero with the address and icon-only call / e-mail, Radno
   vrijeme i lokacija right under it, Ponuda with floors, Brendovi where the unit lists brands, Galerija, Ostale
   poslovnice); a unit without the flag gets the earlier layout (hero with the call link, Ključne brojke, Ponuda,
   Galerija, Radno vrijeme i lokacija with the address block under the map, Povezane poslovnice). */
(function () {
  'use strict';

  var NV = window.NV, D = NV.D, $ = NV.$, esc = NV.esc, setHTML = NV.setHTML, asset = NV.asset, NEW_TAB = NV.NEW_TAB;

  var DAYS = ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota', 'Nedjelja'];

  var u = NV.byId[document.body.dataset.unit], p = u.page;
  var V2 = p.layout === 'v2';
  var mapsHref = NV.mapsHref(u), telHref = NV.telHref(u), telLabel = NV.telLabel(u);
  var allYear = JSON.stringify(u.hours.summer) === JSON.stringify(u.hours.winter);

  function ico(name, size) {
    return '<span class="ms' + (size ? ' ms--' + size : '') + '" aria-hidden="true">' + name + '</span>';
  }
  // the arrow of a link to another website (new tab): the brand tiles and the room tiles
  function goSVG(cls) {
    return '<svg class="' + cls + '" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M5 11 11 5M6 5h5v5"/></svg>';
  }
  function pad(n) { return (n < 9 ? '0' : '') + (n + 1); }
  // V2: running text (the Ponuda lead, photo-slot descriptions) escaped, with every unit's name kept out of browser
  // translation (translate="no"), longest names first so "Bistro Pod Zvon" wins over "Pod Zvon"
  var NAMES = NV.units.map(function (x) { return x.name; }).sort(function (a, b) { return b.length - a.length; });
  var NAME_RE = new RegExp('(' + NAMES.map(function (n) { return n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')(?![A-Za-zČĆĐŠŽčćđšž])', 'g');
  function brandHTML(s) {
    return String(s).split(NAME_RE).map(function (part, i) { return i % 2 ? '<span translate="no">' + esc(part) + '</span>' : esc(part); }).join('');
  }

  /* ---------------- Opening hours ---------------- */
  function fmt(t) {
    if (!t) return 'zatvoreno';
    return t[0] === '00:00' && t[1] === '24:00' ? '0 - 24 h' : t[0] + ' - ' + t[1];
  }
  function dayRange(a, b) {
    if (a === b) return DAYS[a];
    return DAYS[a] + (b - a === 1 ? ' i ' : ' - ') + DAYS[b].toLowerCase();
  }
  // Consecutive days with the same hours share a row: "Ponedjeljak - subota · 07:00 - 19:00".
  function hourRows(hrs, today) {
    var rows = [];
    hrs.forEach(function (t, d) {
      var last = rows[rows.length - 1], time = fmt(t);
      if (last && last.time === time) last.to = d;
      else rows.push({ from: d, to: d, time: time });
    });
    return rows.map(function (r) {
      return { day: rows.length === 1 ? 'Svaki dan' : dayRange(r.from, r.to), time: r.time, today: today >= r.from && today <= r.to };
    });
  }

  // Season dates for the headings: summer 15. 5. - 30. 9., winter the rest of the year.
  var S = D.seasons.summer;
  var SEASONS = {
    summer: { title: 'Ljetno radno vrijeme', period: NV.dayMonth(S.start) + ' - ' + NV.dayMonth(S.end) },
    winter: { title: 'Zimsko radno vrijeme', period: NV.dayMonth(S.end, 1) + ' - ' + NV.dayMonth(S.start, -1) }
  };

  // today: the weekday (0 = Monday) whose row is marked in the current table, or -1 for none. One table all year; a unit
  // open only part of the year (openPeriod, B&B Novalis) gives those dates instead of "cijele godine".
  function hourBlocks(today, season) {
    if (allYear) {
      var o = u.openPeriod, period = o ? NV.dayMonth(o.start) + ' - ' + NV.dayMonth(o.end) : 'cijele godine';
      return [{ title: 'Radno vrijeme', period: period, now: true, rows: hourRows(u.hours.summer, today) }];
    }
    return (season === 'summer' ? ['summer', 'winter'] : ['winter', 'summer']).map(function (s) {
      var now = s === season;
      return { title: SEASONS[s].title, period: SEASONS[s].period, now: now, rows: hourRows(u.hours[s], now ? today : -1) };
    });
  }

  function statusHTML(cls, st) {
    return '<p class="' + cls + (st.open ? ' is-open' : '') + '"><span class="dot"></span>' + esc(st.text) + '</p>';
  }

  function hoursHTML(today, season) {
    return hourBlocks(today, season).map(function (b) {
      return '<div class="hours' + (b.now ? ' is-now' : '') + '">' +
        '<div class="hours__head"><h3 class="hours__title">' + esc(b.title) + '</h3>' +
          (b.now && !allYear ? '<span class="hours__badge">Sada</span>' : '') +
          '<span class="hours__period">' + esc(b.period) + '</span></div>' +
        '<dl class="hours__rows">' + b.rows.map(function (r) {
          return '<div class="hours__row' + (r.today ? ' is-today' : '') + '"><dt>' + esc(r.day) + '</dt><dd>' + esc(r.time) + '</dd></div>';
        }).join('') + '</dl>' +
      '</div>';
    }).join('');
  }

  // Boravak (page.stay; B&B Novalis): arrival and departure under the hours, as a table of the same kind
  function stayHTML() {
    return '<div class="hours hours--stay"><div class="hours__head"><h3 class="hours__title">Boravak</h3></div>' +
      '<dl class="hours__rows">' + p.stay.map(function (r) {
        return '<div class="hours__row"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
      }).join('') + '</dl></div>';
  }

  /* ---------------- Sections ---------------- */
  // Store names are brand names: translate="no" keeps browser translation from turning "Pod Zvon" into "Under the Bell".
  // V2: a stacked lockup file with `badge` gets the cart badge on its left, as tall as the lockup (badge colour as in the
  // header: 'red' on yellow, 'yellow' on red). The pair's width is the lockup's / 0.6725 (css: .store-hero__mark).
  function markHTML(m) {
    var img = function (src) {
      return '<img class="store-hero__logo" src="' + esc(asset(src)) + '" alt="" width="' + m.w + '" height="' + m.h + '">';
    };
    if (V2 && m.logo && m.badge) {
      return '<div class="store-hero__mark" style="width:' + Math.round(m.w / 0.6725) + 'px">' +
        NV.tileSVG(m.badge, Math.round(m.h * 0.964), 'store-hero__badge') + img(m.logo) + '</div>';
    }
    if (m.logo) return img(m.logo);
    if (m.image) {
      return '<div class="store-hero__brand">' + img(m.image) +
        (m.script ? '<span class="store-hero__script">' + esc(m.script) + '</span>' : '') + '</div>';
    }
    if (m.lockup) return '<p class="store-hero__lockup" aria-hidden="true" translate="no"><span>' + esc(m.lockup[0]) + '</span><span>' + esc(m.lockup[1]) + '</span></p>';
    return '<p class="store-hero__word" aria-hidden="true" translate="no">' + esc(m.word) + '</p>';
  }

  // V2 call and e-mail: icon-only round buttons. The number / address is the label shown on hover and keyboard focus and
  // the end of the accessible name ("Nazovi: <name>, 098 441 149"); the unit name stays out of translation.
  // No e-mail in the data, or the primary button already writes to it (Veleprodaja): no e-mail button.
  function contactHTML(cta) {
    var name = '<span translate="no">' + esc(u.name) + '</span>';
    var mail = u.email && cta.href !== 'mailto:' + u.email;
    return '<div class="store-hero__contact">' +
        '<a class="hero-ico" href="' + esc(telHref) + '">' + ico('call') +
          '<span class="vh">Nazovi: ' + name + ', </span><span class="hero-ico__tip" translate="no">' + esc(telLabel) + '</span></a>' +
        (mail ? '<a class="hero-ico" href="mailto:' + esc(u.email) + '">' + ico('mail') +
          '<span class="vh">Pošalji e-poruku: ' + name + ', </span><span class="hero-ico__tip" translate="no">' + esc(u.email) + '</span></a>' : '') +
      '</div>';
  }

  // The hero: mark, label, title, lead, today's status (#heroStatus, renderLive), then the primary button (Upute or the
  // unit's own cta, .store-hero__cta) and the call link. V2: the street address under the status (a link to the Google
  // listing) and the call / e-mail buttons instead of the call link. Pattern 'lace' (B&B Novalis) lays the hotel's lace
  // rosette behind the copy (decorative).
  function heroHTML() {
    var cta = p.cta || { label: 'Upute', href: mapsHref, icon: 'directions' };
    var ext = /^https?:/.test(cta.href) ? ' target="_blank" rel="noopener"' : '';
    return '<nav class="crumbs" aria-label="Putanja"><ol class="crumbs__list">' +
        '<li><a href="' + esc(NV.HOME) + '">Početna</a></li>' +
        '<li><a href="' + esc(NV.HOME) + '#poslovnice">Poslovnice</a></li>' +
        '<li><span aria-current="page" translate="no">' + esc(u.name) + '</span></li></ol></nav>' +
      '<section class="store-hero" aria-labelledby="h-store">' +
        '<div class="store-hero__panel">' +
          (p.pattern === 'lace' ? '<div class="store-hero__lace" aria-hidden="true"></div>' : '') +
          '<div class="store-hero__copy">' + markHTML(p.mark) +
            '<span class="store-hero__label">' + esc(p.label) + '</span>' +
            // The mark is the store's name drawn large; the heading carries the name for readers and search.
            '<h1 class="store-hero__title" id="h-store"><span class="vh" translate="no">' + esc(u.name) + ': </span>' + esc(p.title) + '</h1>' +
            '<p class="store-hero__lead">' + esc(p.lead) + '</p>' +
            (V2 ? '<div class="store-hero__place"><div id="heroStatus"></div>' + NV.addrHTML(u, 'store-hero__addr') + '</div>' : '<div id="heroStatus"></div>') +
            '<div class="store-hero__actions">' +
              '<a class="btn btn--lg' + (p.cta ? ' store-hero__cta' : '') + '" href="' + esc(cta.href) + '"' + ext + '>' + esc(cta.label) + ico(cta.icon || 'arrow_forward') + (ext ? NEW_TAB : '') + '</a>' +
              (V2 ? contactHTML(cta) : '<a class="store-hero__call" href="' + esc(telHref) + '">' + ico('call', 'sm') + esc(telLabel) + '</a>') +
            '</div>' +
          '</div>' +
          '<div class="store-hero__media"><img src="' + esc(asset(p.photo)) + '" alt="' + esc(p.photoAlt) + '" fetchpriority="high"' +
            (p.photoPos ? ' style="object-position:' + esc(p.photoPos) + '"' : '') + '></div>' +
        '</div>' +
        (p.pattern === 'mosaic' ? '<div class="store-hero__pattern" aria-hidden="true"></div>' : '') +
      '</section>';
  }

  function headHTML(id, title, lead) {
    return '<div class="store-sec__head"><h2 class="store-sec__h" id="h-' + id + '"><span class="store-sec__mark" aria-hidden="true"></span>' +
      esc(title) + '</h2>' + (lead ? '<p class="store-sec__lead">' + (V2 ? brandHTML(lead) : esc(lead)) + '</p>' : '') + '</div>';
  }

  function factsHTML() {
    return '<section class="store-sec store-sec--facts" aria-labelledby="h-brojke"><h2 class="vh" id="h-brojke">Ključne brojke</h2><dl class="facts">' +
      p.facts.map(function (f) {
        return '<div class="facts__item"><dt>' + esc(f[1]) + '</dt><dd>' + esc(f[0]) + '</dd></div>';
      }).join('') + '</dl></section>';
  }

  /* Ponuda. V2: split by floor when the unit has `floors` ([{ name, sign, tone, brand, note }], top floor first) and every
     offer line names one of them and no floor has more than 6 (the zone layouts go from 1 to 6); otherwise the numbered
     list. Each floor: an isometric plate with one zone per category (abstract blocks, not the shop's real layout) and a
     legend: sign, name (h3), its note if any, the categories (ol) with the zone letters. A line with details
     (['text', floor, 'details'], Hiper Novalis) is a department that opens to show them. */
  function floorGroups() {
    var f = p.floors;
    if (!f || !p.offer.every(function (it) { return typeof it !== 'string' && f.some(function (x) { return x.name === it[1]; }); })) return null;
    var groups = f.map(function (fl) {
      return { name: fl.name, sign: fl.sign, tone: fl.tone, brand: !!fl.brand, note: fl.note,
        items: p.offer.filter(function (it) { return it[1] === fl.name; }).map(function (it) { return { t: it[0], d: it[2] || '' }; }) };
    }).filter(function (g) { return g.items.length; });
    return groups.some(function (g) { return g.items.length > 6; }) ? null : groups;
  }
  var LETTERS = 'ABCDEFGH';

  // Zones on a 12 x 5 plate (abstract, not the shop's layout): two layouts (alternating floors), for 1 to 6 categories.
  // A single category (Valis's 1. kat) fills the plate.
  function zoneLayout(n, alt) {
    if (n === 1) return [[0.6, 0.6, 10.8, 3.8]];
    var top = alt ? Math.floor(n / 2) : Math.ceil(n / 2), out = [], i;
    if (alt && n > 2) { // a full-depth block on the left, the rest in two rows
      out.push([0.6, 0.6, 3.2, 3.8]);
      var rest = n - 1, t = Math.ceil(rest / 2), b = rest - t, wT = 7.4 / t, wB = b ? 7.4 / b : 0;
      for (i = 0; i < t; i++) out.push([4.2 + i * wT, 0.6, wT - 0.4, 1.7]);
      for (i = 0; i < b; i++) out.push([4.2 + i * wB, 2.7, wB - 0.4, 1.7]);
      return out;
    }
    var bot = n - top, wt = 10.8 / top, wb = bot ? 10.8 / bot : 0;
    for (i = 0; i < top; i++) out.push([0.6 + i * wt, 0.6, wt - 0.4, 1.7]);
    for (i = 0; i < bot; i++) out.push([0.6 + i * wb, 2.7, wb - 0.4, 1.7]);
    return out;
  }
  // The building: every floor's plate in one isometric (30 degrees) drawing, same footprint and centre, exploded
  // downwards. Plates turn towards their legends by their position in the list (top floor first): the 1st, 3rd …
  // face left, the 2nd, 4th … face right (Market: 0 left, -1 right). In isometric a
  // 90-degree turn of the footprint draws as a mirror image, so each plate is the same 12 x 5 floor turned, not a new
  // shape. With the floors turned against each other, the upper plate's lowest corner sits over the lower plate's
  // highest one, so STEP clears that point by GAP; the leftmost and rightmost corners of all plates line up and get a
  // guide each (front and back guides would cross the plates). Flat faces: left-facing sides take the lighter tone.
  // A single floor (Hiper Bau, Veleprodaja) faces right, towards its legend beside it.
  // Returns the SVG and each plate's centre height (0-1) for its legend.
  function buildingSVG(groups) {
    var W = 12, D = 5, T = 0.7, H = 0.5, C = 0.866, S = 0.5, PAD = 0.7, GAP = 1;
    var STEP = (W + D) * S + T + H + GAP, top = W * S + H + PAD, WT = (W + D) * C + 2 * PAD, n = groups.length;
    function P(x, y, z, turn) { var a = (x + y) * C + PAD; return [(turn ? WT - a : a).toFixed(2), ((y - x) * S - z + top).toFixed(2)]; }
    function poly(cls, pts) { return '<polygon class="' + cls + '" points="' + pts.map(function (q) { return q.join(','); }).join(' ') + '"/>'; }
    function box(x, y, w, d, z0, h, c, turn, plate) {
      var A = turn ? '-b' : '-a', B = turn ? '-a' : '-b'; // keep the light from the same side on turned floors
      return poly(c + B + (plate ? ' iso-long' : ''), [P(x, y + d, z0 + h, turn), P(x + w, y + d, z0 + h, turn), P(x + w, y + d, z0, turn), P(x, y + d, z0, turn)]) +
        poly(c + A, [P(x, y, z0 + h, turn), P(x, y + d, z0 + h, turn), P(x, y + d, z0, turn), P(x, y, z0, turn)]) +
        poly(c + '-t', [P(x, y, z0 + h, turn), P(x + w, y, z0 + h, turn), P(x + w, y + d, z0 + h, turn), P(x, y + d, z0 + h, turn)]);
    }
    function turned(i) { return i % 2 === 0 && n > 1; }
    function floor(g, i) {
      var z = -i * STEP, t = turned(i), zones = zoneLayout(g.items.length, i % 2 === 1).map(function (q, k) { return { q: q, k: k }; });
      var s = box(0, 0, W, D, z - T, T, 'iso-plate', t, true);
      zones.slice().sort(function (a, b) { return (a.q[1] + a.q[3] / 2 - a.q[0] - a.q[2] / 2) - (b.q[1] + b.q[3] / 2 - b.q[0] - b.q[2] / 2); })
        .forEach(function (o) { s += box(o.q[0], o.q[1], o.q[2], o.q[3], z, H, 'iso-zone', t); });
      zones.forEach(function (o) { // badges stay upright and unmirrored, centred on each zone's top
        var c = P(o.q[0] + o.q[2] / 2, o.q[1] + o.q[3] / 2, z + H, t), x = +c[0] - 0.42, y = +c[1] - 0.42;
        s += '<g class="iso-badge"><path d="M' + x + ' ' + (y + 0.24) + 'a.24 .24 0 0 1 .24-.24h.36a.24 .24 0 0 1 .24 .24v.36a.24 .24 0 0 1-.24 .24h-.6z"/>' +
          '<text x="' + (x + 0.42) + '" y="' + (y + 0.58) + '">' + LETTERS[o.k] + '</text></g>';
      });
      return '<g class="iso-floor floor--' + esc(g.tone) + '" data-face="' + (t ? 'left' : 'right') + '">' + s + '</g>';
    }
    function sideCorners(i, z) { // the leftmost and rightmost corners of plate i at height z
      var pts = [[0, 0], [W, 0], [W, D], [0, D]].map(function (c) { return P(c[0], c[1], z, turned(i)); });
      pts.sort(function (a, b) { return a[0] - b[0]; });
      return [pts[0], pts[3]];
    }
    function guides(i) {
      var a = sideCorners(i, -i * STEP - T), b = sideCorners(i + 1, -(i + 1) * STEP);
      return [0, 1].map(function (k) { return '<line class="iso-guide" x1="' + a[k][0] + '" y1="' + a[k][1] + '" x2="' + b[k][0] + '" y2="' + b[k][1] + '"/>'; }).join('');
    }
    var s = '', i;
    for (i = n - 1; i >= 0; i--) { s += floor(groups[i], i); if (i > 0) s += guides(i - 1); }
    var h = top + D * S + T + (n - 1) * STEP + PAD;
    return {
      svg: '<svg class="iso" viewBox="0 0 ' + WT.toFixed(2) + ' ' + h.toFixed(2) + '" aria-hidden="true" focusable="false">' + s + '</svg>',
      at: groups.map(function (g, k) { return (+P(W / 2, D / 2, -k * STEP)[1] / h * 100).toFixed(2) + '%'; })
    };
  }
  // the small stacked-layers mark in each legend: every floor as a thin plate, this one filled
  function stackSVG(count, at) {
    var s = '', i, h = 20 + (count - 1) * 12;
    for (i = count - 1; i >= 0; i--) {
      var y = 2 + i * 12;
      s += '<path class="' + (i === at ? 'stack-on' : 'stack-off') + '" d="M2 ' + (y + 8) + 'L20 ' + y + 'L38 ' + (y + 8) + 'L20 ' + (y + 16) + 'Z"/>';
    }
    return '<svg class="floor__stack" viewBox="0 0 40 ' + h + '" width="40" height="' + h + '" aria-hidden="true" focusable="false">' + s + '</svg>';
  }
  // A category row; with details, a department: a native <details> whose summary keeps the row (badge, name) plus a
  // plus / minus, and opens to what it sells. The row sits in an inner span (flex on <summary> itself fails in older Safari).
  function itemHTML(it, i) {
    var row = '<span class="floor__badge" aria-hidden="true">' + LETTERS[i] + '</span><span class="floor__cat">' + esc(it.t) + '</span>';
    if (!it.d) return '<li class="floor__item">' + row + '</li>';
    return '<li class="floor__item floor__item--dept"><details class="dept">' +
      '<summary class="dept__sum"><span class="dept__row">' + row + '<span class="dept__tog" aria-hidden="true"></span></span></summary>' +
      '<p class="dept__body">' + esc(it.d) + '</p></details></li>';
  }
  // The building first (decorative), then one legend per floor, top floor first. From 1200 the legends flank the
  // building, each level with its plate (--at): the first floor's on the left (its plate faces left), the second's on
  // the right. With departments (floors--dept) the legends stay in the page flow instead (css), so an opened one
  // pushes the page down rather than covering it. A single floor's legend sits right of the building (no floor--start).
  // A floor without a sign (B&B Novalis: levels named by what is on them) shows none.
  function floorsHTML(groups) {
    var b = buildingSVG(groups), dept = groups.some(function (g) { return g.items.some(function (it) { return it.d; }); });
    return '<div class="floors floors--' + groups.length + (dept ? ' floors--dept' : '') + '">' +
      '<div class="floors__building">' + b.svg + '</div>' +
      groups.map(function (g, gi) {
        var name = g.brand ? '<span translate="no">' + esc(g.name) + '</span>' : esc(g.name);
        return '<div class="floor floor--' + esc(g.tone) + (gi % 2 || groups.length < 2 ? '' : ' floor--start') + '" style="--at:' + b.at[gi] + '">' +
          '<div class="floor__legend">' +
            (g.sign ? '<span class="floor__sign" aria-hidden="true">' + esc(g.sign) + '</span>' : '') +
            '<div class="floor__key">' + stackSVG(groups.length, gi) +
              '<h3 class="floor__name" id="h-ponuda-' + gi + '">' + (g.sign ? '<span class="vh">Razina ' + esc(g.sign) + ': </span>' : '') + name + '</h3>' +
              (g.note ? '<p class="floor__note">' + esc(g.note) + '</p>' : '') +
              '<ol class="floor__list" aria-labelledby="h-ponuda-' + gi + '">' + g.items.map(itemHTML).join('') + '</ol>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('') + '</div>';
  }

  function offerListHTML() {
    return '<ol class="offer">' + p.offer.map(function (it, i) {
      var text = typeof it === 'string' ? it : it[0], meta = typeof it === 'string' ? '' : it[1];
      return '<li class="offer__item"><span class="offer__n" aria-hidden="true">' + pad(i) + '</span><span class="offer__body">' +
        '<span class="offer__text">' + esc(text) + '</span>' + (meta ? '<span class="offer__meta">' + esc(meta) + '</span>' : '') +
        '</span></li>';
    }).join('') + '</ol>';
  }

  function offerHTML() {
    var groups = V2 && floorGroups();
    return '<section class="store-sec" aria-labelledby="h-ponuda">' + headHTML('ponuda', 'Ponuda', p.offerLead) +
      (groups ? floorsHTML(groups) : offerListHTML()) +
      (p.offerNote ? '<p class="offer__note">' + esc(p.offerNote) + '</p>' : '') +
    '</section>';
  }

  /* Brendovi (V2, page.brands; Hiper Bau, WEB-11): one tile per brand, alphabetical. A brand with a confirmed site is a
     link to it in a new tab (its site for Croatia, else its European or international one), named by its logo's alt
     text; one without stays a plain logo. Each logo file is 320 x 160 with the logo already trimmed and centred at an
     even visual size, so every tile only frames it. Phones and tablets show whole rows first; the button shows the
     rest (brandsMore). */
  var BRANDS = 'assets/img/brendovi/';
  var GO = goSVG('brand__go');
  function brandsHTML() {
    return '<section class="store-sec" aria-labelledby="h-brendovi">' + headHTML('brendovi', 'Brendovi', p.brandsLead) +
      '<ul class="brands" id="brandList">' + p.brands.map(function (b) {
        var img = '<img src="' + esc(asset(BRANDS + b[1] + '.webp')) + '" alt="' + esc(b[0]) + '" width="160" height="80" loading="lazy" decoding="async" translate="no">';
        return '<li class="brands__item">' + (b[2]
          ? '<a class="brand" href="' + esc(b[2]) + '" target="_blank" rel="noopener">' + img + NEW_TAB + GO + '</a>'
          : '<span class="brand">' + img + '</span>') + '</li>';
      }).join('') + '</ul>' +
      '<button type="button" class="btn-sm brands__more" aria-controls="brandList">Prikaži sve brendove (' + p.brands.length + ')</button>' +
    '</section>';
  }

  /* Sobe (V2, page.rooms; B&B Novalis): one tile per room type with its photo (decorative: the name follows), name
     (h3), size and guests. The name is the tile's one link, stretched over it (as on the unit cards), to the room's page
     on the unit's website in a new tab; the arrow on the photo says it leaves the site. The last tile (roomsAll) opens
     the full list there. */
  function roomsHTML() {
    return '<section class="store-sec" aria-labelledby="h-sobe">' + headHTML('sobe', 'Sobe', p.roomsLead) +
      '<ul class="rooms">' + p.rooms.map(function (r) {
        return '<li class="room"><div class="room__media">' + NV.slotHTML(asset(r[3]), r[0], '') + goSVG('room__go') + '</div>' +
          '<h3 class="room__name"><a class="room__link" href="' + esc(r[4]) + '" target="_blank" rel="noopener">' + esc(r[0]) + NEW_TAB + '</a></h3>' +
          '<p class="room__meta">' + esc(r[1]) + ' · ' + esc(r[2]) + '</p></li>';
      }).join('') +
      (p.roomsAll ? '<li class="room room--all"><a class="room__all" href="' + esc(p.roomsAll) + '" target="_blank" rel="noopener">' +
          '<span class="room__all-t">Pogledajte sve sobe</span> <span class="room__all-site"><span translate="no">' +
          esc(p.roomsAll.replace(/^https?:\/\/|\/.*$/g, '')) + '</span>' + goSVG('room__all-go') + '</span>' + NEW_TAB + '</a></li>' : '') +
      '</ul></section>';
  }

  function galleryHTML() {
    return '<section class="store-sec" aria-labelledby="h-galerija">' + headHTML('galerija', 'Galerija') +
      '<ul class="gallery">' + p.gallery.map(function (g) {
        return '<li class="gallery__item">' + (V2 ? NV.slotHTML(asset(g[0]), g[1], g[1], brandHTML(g[1])) : NV.slotHTML(asset(g[0]), g[1], g[1])) + '</li>';
      }).join('') + '</ul></section>';
  }

  // Radno vrijeme i lokacija: the hours (#visitHours, renderLive) and the map with its fallback note and Google Maps link;
  // under the map the name, address, e-mail, Upute and call. V2: nothing under the map (address and call are in the hero).
  function visitInfoHTML() {
    return '<div class="visit__info">' +
      '<div class="visit__addr"><span class="visit__name" translate="no">' + esc(u.name) + '</span>' + NV.addrHTML(u, 'visit__street') +
        (u.email ? '<a href="mailto:' + esc(u.email) + '">' + esc(u.email) + '</a>' : '') + '</div>' +
      '<div class="visit__actions">' +
        '<a class="btn-sm btn-sm--accent" href="' + esc(mapsHref) + '" target="_blank" rel="noopener">' + ico('directions', 'sm') + 'Upute' + NEW_TAB + '</a>' +
        '<a class="btn-sm" href="' + esc(telHref) + '">' + ico('call', 'sm') + esc(telLabel) + '</a>' +
      '</div>' +
    '</div>';
  }
  function visitHTML() {
    return '<section class="store-sec" aria-labelledby="h-posjet">' + headHTML('posjet', 'Radno vrijeme i lokacija') +
      '<div class="visit">' +
        '<div class="visit__hours" id="visitHours"></div>' +
        '<div class="visit__place" id="karta">' +
          '<div class="store-map">' +
            '<div class="store-map__canvas" id="storeMap"></div>' +
            '<p class="map__note map__note--fail" id="storeMapFail" hidden>Karta se trenutno ne može prikazati. ' +
              '<a class="map__link" href="' + esc(mapsHref) + '" target="_blank" rel="noopener">Otvori u Google Maps' + NEW_TAB + '</a></p>' +
          '</div>' +
          (V2 ? '' : visitInfoHTML()) +
        '</div>' +
      '</div>' +
    '</section>';
  }

  // A small map around the store (js/map.js), with its pin in the store's colour (V2: brand red); the Upute button below
  // it routes there (V2: the hero's). With a Google Business listing (gmaps) the pin is a link to it; otherwise it only
  // marks the spot.
  function initMap() {
    if (!NV.map) { $('#storeMapFail').hidden = false; return; } // js/map.js didn't load
    NV.map.create($('#storeMap'), {
      label: 'Karta: ' + u.name + ', ' + u.address,
      map: { center: NV.map.lngLat(u), zoom: 16 }
    }, function (map, gl) {
      var place = NV.placeHref(u);
      var mk = NV.map.pin(map, gl, u, place
        ? '<a class="pin pin--store" href="' + esc(place) + '" target="_blank" rel="noopener" title="' + NV.PLACE_TITLE + '">' +
            '<span class="pin__head"></span><span class="vh"><span translate="no">' + esc(u.name) + '</span> na Google kartama' + NEW_TAB + '</span></a>'
        : '<span class="pin pin--store"><span class="pin__head"></span></span>');
      if (!place) mk.getElement().setAttribute('aria-hidden', 'true'); // a plain mark: the map's own label names the place
    }, function (hadFocus) {
      $('#storeMapFail').hidden = false;
      if (hadFocus) $('#storeMapFail a').focus();
    });
  }

  // The landing page's unit cards (NV.cardHTML), with today's hours (renderLive); each shows the photo its own page leads with.
  // V2: Ostale poslovnice, every other unit (its related ones first); css shows as many as fill whole rows.
  var others = V2 ? p.related.concat(NV.units.map(function (x) { return x.id; }).filter(function (id) {
    return id !== u.id && p.related.indexOf(id) < 0;
  })) : p.related;
  function relatedHTML() {
    var id = V2 ? 'ostale' : 'povezane';
    return '<section class="store-sec store-sec--last" aria-labelledby="h-' + id + '">' + headHTML(id, V2 ? 'Ostale poslovnice' : 'Povezane poslovnice') +
      '<div class="cards" id="related"></div></section>';
  }
  function relatedCardsHTML(z) {
    return others.map(function (id, i) {
      var r = NV.byId[id];
      return NV.cardHTML(NV.cardData(r, NV.unitStatus(r, z), r.page && r.page.photo), i);
    }).join('');
  }

  /* ---------------- Search engines ---------------- */
  // Only confirmed opening hours are published to search engines; placeholders would show wrong hours on Google.
  var DOW = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  // The dated hours below are for this year in Novalja (not in the visitor's time zone, which may already be in the next)
  var YEAR = NV.zagrebNow().y;
  function isoDay(md, shift) {
    var dt = new Date(Date.UTC(YEAR, +md.slice(0, 2) - 1, +md.slice(3) + (shift || 0)));
    return dt.toISOString().slice(0, 10);
  }
  function hoursSpec(hrs, from, through) {
    var specs = [];
    hrs.forEach(function (t, d) {
      if (!t) return;
      var closes = t[1] === '24:00' ? '23:59' : t[1];
      var spec = specs.find(function (x) { return x.opens === t[0] && x.closes === closes; });
      if (spec) spec.dayOfWeek.push(DOW[d]);
      else specs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: [DOW[d]], opens: t[0], closes: closes, validFrom: from, validThrough: through });
    });
    return specs;
  }
  function openingHours() {
    if (!u.hoursConfirmed) return undefined;
    if (allYear) return hoursSpec(u.hours.summer);
    return hoursSpec(u.hours.winter, isoDay('01-01'), isoDay(S.start, -1))
      .concat(hoursSpec(u.hours.summer, isoDay(S.start), isoDay(S.end)))
      .concat(hoursSpec(u.hours.winter, isoDay(S.end, 1), isoDay('12-31')));
  }
  // This year's days with hours of their own (public holidays the unit closes on, dated exceptions); closed all day is
  // 00:00 - 00:00.
  function specialHours() {
    if (!u.hoursConfirmed) return undefined;
    var specs = NV.specialDays(u, YEAR).map(function (s) {
      var t = s.t || ['00:00', '00:00'];
      return { '@type': 'OpeningHoursSpecification', opens: t[0], closes: t[1] === '24:00' ? '23:59' : t[1], validFrom: s.iso, validThrough: s.iso };
    });
    return specs.length ? specs : undefined;
  }

  function addStructuredData() {
    var business = Object.assign({ '@context': 'https://schema.org' }, u.schema, {
      '@id': NV.unitId(u), name: u.name, description: p.lead, url: NV.PAGE_URL,
      image: [p.photo].concat(p.gallery.map(function (g) { return g[0]; })).filter(Boolean).map(function (src) { return NV.absUrl(asset(src)); }),
      telephone: u.tel || D.company.tel, email: u.email, address: NV.postalAddress(u.address), hasMap: mapsHref,
      openingHoursSpecification: openingHours(), specialOpeningHoursSpecification: specialHours(), parentOrganization: NV.ORG
    });
    var crumbs = {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      // "Poslovnice" is a section of the home page, not a page of its own, so the trail is two pages long
      itemListElement: [['Početna', NV.HOME_URL], [u.name, NV.PAGE_URL]].map(function (c, i) {
        return { '@type': 'ListItem', position: i + 1, name: c[0], item: c[1] };
      })
    };
    NV.addJSONLD(business);
    NV.addJSONLD(crumbs);
  }

  /* ---------------- Render ---------------- */
  function renderLive() {
    var z = NV.zagrebNow(), season = NV.currentSeason(z), st = NV.unitStatus(u, z);
    setHTML($('#heroStatus'), statusHTML('store-hero__status', st));
    // a day with hours of its own (holiday, exception) marks no weekday row: the status above says it all
    setHTML($('#visitHours'), statusHTML('visit__status', st) + hoursHTML(st.regular ? z.day : -1, season) + (p.stay ? stayHTML() : ''));
    related.render(relatedCardsHTML(z));
  }

  // V2: the number / address label sits above its button from the button's centre. Where it would cross the copy
  // column's right edge (narrow screens, a long e-mail) it moves left just enough, never past the column's left edge,
  // and wraps within the column (--tip-max). So it always covers the button's centre line and the pointer can go
  // straight up onto it (WCAG 1.4.13 hoverable; css: .hero-ico::after bridges the gap). Placed as the pointer or focus
  // arrives, so it follows the layout at that moment.
  function placeTip(a) {
    var tip = a.querySelector('.hero-ico__tip'), copy = a.closest('.store-hero__copy').getBoundingClientRect();
    a.style.setProperty('--tip-max', Math.floor(copy.width) + 'px');
    a.style.setProperty('--tip-x', '0px');
    var r = a.getBoundingClientRect(), x = r.left + r.width / 2, w = tip.getBoundingClientRect().width;
    a.style.setProperty('--tip-x', Math.round(Math.max(copy.left - x, Math.min(0, copy.right - (x + w)))) + 'px');
  }
  // V2: only one label shows at a time: the button the pointer or focus moved to last is active, the other's label is
  // off (is-off) until that button is active again. Esc hides the label that is showing without moving the pointer or
  // focus (WCAG 1.4.13); it shows again once focus moves, the pointer leaves or re-enters the row or goes over the other
  // button. A mouse leaving a button keeps its label for 300 ms (is-held), so a move towards the label in any direction reaches
  // it; on the label it stays. Once a label is hidden (after its fade) its placement goes, and a showing one is placed
  // again when the layout changes (resize, rotation, zoom, fonts), so a hidden label never keeps a width from another
  // layout.
  function quiet(row) {
    var quietened = null, raf = 0;
    var icos = [].slice.call(row.querySelectorAll('.hero-ico')).map(function (a) { return { a: a, hold: 0, fade: 0 }; });
    function showing(o) { return !o.a.classList.contains('is-off') && (o.a.matches(':hover, :focus-visible') || o.a.classList.contains('is-held')); }
    function unplace(o) { o.a.style.removeProperty('--tip-x'); o.a.style.removeProperty('--tip-max'); }
    function hideLater(o) { clearTimeout(o.fade); o.fade = setTimeout(function () { if (!showing(o)) unplace(o); }, 250); }
    function release(o) { clearTimeout(o.hold); o.a.classList.remove('is-held'); }
    function activate(o) {
      icos.forEach(function (x) { if (x !== o) { release(x); x.a.classList.add('is-off'); hideLater(x); } });
      o.a.classList.remove('is-off');
      placeTip(o.a);
    }
    function wake() { row.classList.remove('is-quiet'); quietened = null; }
    icos.forEach(function (o) {
      o.a.addEventListener('pointerenter', function () { release(o); activate(o); });
      o.a.addEventListener('focusin', function () { activate(o); });
      o.a.addEventListener('focusout', function () { hideLater(o); });
      o.a.addEventListener('pointerleave', function (e) {
        if (e.pointerType === 'touch' || o.a.classList.contains('is-off')) { hideLater(o); return; }
        o.a.classList.add('is-held');
        clearTimeout(o.hold);
        o.hold = setTimeout(function () { o.a.classList.remove('is-held'); hideLater(o); }, 300);
      });
    });
    function relayout() { raf = 0; icos.forEach(function (o) { if (showing(o)) placeTip(o.a); else unplace(o); }); }
    function later() { if (!raf) raf = requestAnimationFrame(relayout); }
    addEventListener('resize', later);
    addEventListener('orientationchange', later);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
    row.addEventListener('focusin', wake);
    row.addEventListener('pointerleave', wake);
    row.addEventListener('pointerenter', wake);   // Esc on a held label after the pointer had left the row
    row.addEventListener('pointerover', function (e) {
      var a = e.target.closest('.hero-ico');
      if (a && quietened && a !== quietened) wake();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var o = icos.filter(showing)[0];
      if (!o) return;
      quietened = o.a;
      icos.forEach(release);
      row.classList.add('is-quiet');
    });
  }

  // V2 departments from 1200 (css: .floors--dept): the second floor's legend sits level with the building's foot while
  // its departments are closed and keeps that place when one opens, so each legend grows downwards on its own and the
  // other side stays still. --dept-top: the drawing's height less the legend's closed height (open departments'
  // contents left out), set again when the layout changes (resize, rotation, zoom, fonts), never when one opens.
  function deptPlace(floors) {
    var svg = floors.querySelector('.iso'), fl = floors.querySelector('.floor:not(.floor--start)'), raf = 0;
    if (!fl) return;
    var leg = fl.querySelector('.floor__legend');
    function h(el) { return el.getBoundingClientRect().height; }
    function place() {
      raf = 0;
      var closed = h(leg);
      [].forEach.call(leg.querySelectorAll('.dept[open]'), function (d) { closed -= h(d.parentNode) - h(d.querySelector('summary')); });
      fl.style.setProperty('--dept-top', Math.max(0, Math.round(h(svg) - closed)) + 'px');
    }
    function later() { if (!raf) raf = requestAnimationFrame(place); }
    place();
    addEventListener('resize', later);
    addEventListener('orientationchange', later);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
  }

  // V2 Brendovi: phones and tablets first show whole rows (css hides the rest); the button shows them all, then goes,
  // and focus moves to the first brand that was hidden. It shows only while some brands are hidden at that width.
  function brandsMore(list, btn) {
    function hidden() { return [].filter.call(list.children, function (li) { return getComputedStyle(li).display === 'none'; }); }
    function sync() { btn.hidden = !hidden().length; }
    btn.addEventListener('click', function () {
      var to = hidden().map(function (li) { return li.querySelector('a'); }).filter(Boolean)[0];
      list.classList.add('is-all');
      btn.remove();
      removeEventListener('resize', sync);
      if (to) to.focus();
    });
    addEventListener('resize', sync);
    sync();
  }

  $('.page').classList.add('store', 'store--' + p.theme);
  if (V2) $('.page').classList.add('store--v2');
  $('#store').innerHTML = V2
    ? heroHTML() + visitHTML() + offerHTML() + (p.brands ? brandsHTML() : '') + (p.rooms ? roomsHTML() : '') + galleryHTML() + relatedHTML()
    : heroHTML() + factsHTML() + offerHTML() + galleryHTML() + visitHTML() + relatedHTML();
  // the related cards rise in like the landing page's the first time they come into view (NV.cardGrid)
  var related = NV.cardGrid($('#related'));
  $('#qbCall').href = telHref;
  NV.holdQuickbar($('.store-hero__actions'));
  if (V2) quiet($('.store-hero__actions'));
  if (V2 && $('.floors--dept')) deptPlace($('.floors--dept'));
  if (V2 && p.brands) brandsMore($('#brandList'), $('.brands__more'));
  renderLive();
  initMap();
  addStructuredData();

  // keep open/closed status live
  setInterval(renderLive, 60000);
})();
