/* Novalis site — shared by every page: brand vectors, image slots, opening hours, unit cards, header (one menu per
   business category, mobile menu with category groups, language toggle) and footer. Page scripts (app.js, occasions.js,
   poslovnica.js) build on window.NV.
   Loaded at the end of <body>, so the markup it works on is already parsed. */
window.NV = (function () {
  'use strict';

  var D = window.NOVALIS_DATA;
  var P = window.NV_PATHS;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Pages other than the landing link back to it for sections: <body data-home="../">.
  var HOME = document.body.dataset.home || '';
  // Pages in a subfolder (store pages, /hiper-bau/) reach site files through <body data-root="../">.
  var ROOT = document.body.dataset.root || '';
  var CAT_IDS = D.categories.map(function (c) { return c.id; });
  // Units in category order; unit numbers (map pins, list) follow this order.
  var units = D.units.slice().sort(function (a, b) { return CAT_IDS.indexOf(a.category) - CAT_IDS.indexOf(b.category); });
  var byId = {};
  D.units.forEach(function (u) { byId[u.id] = u; });
  // open: id of the category whose header panel is open (one at a time), or null;
  // hoverAt: when the mouse opened that panel by resting on it, 0 when it was opened otherwise (see hoverTo)
  var ui = { open: null, hoverAt: 0, menu: false };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Only touch the DOM when the markup changed, so periodic re-renders don't steal focus or hover.
  function setHTML(el, html) {
    if (el._html !== html) { el.innerHTML = html; el._html = html; }
  }
  function headerOffset() {
    return $('.site-header').offsetHeight;
  }

  /* ---------------- Paths ---------------- */
  // Site files in data/units.js are written relative to the site root.
  function asset(path) {
    return !path || /^([a-z]+:|\/)/i.test(path) ? path : ROOT + path;
  }

  // A store page lives in its own folder (/hiper-bau/); units with their own website link there instead.
  function unitHref(u) {
    return u.url || ROOT + u.slug + '/';
  }

  // Directions, phone link and phone label for a unit (company line when it has no own number).
  // Directions: a unit with an official Google Business listing (gmaps) opens that listing, where Google offers the route;
  // otherwise Google Maps routes to the unit's map spot (geo), even without an exact street address. Phones open the app.
  function mapsHref(u) {
    return u.gmaps || 'https://www.google.com/maps/dir/?api=1&destination=' + u.geo.join(',');
  }
  // The unit's official Google Business listing, or null when data/units.js has no gmaps link for it
  function placeHref(u) {
    return u.gmaps || null;
  }
  function telHref(u) { return 'tel:' + (u.tel || D.company.tel); }
  function telLabel(u) { return u.phone || D.company.phone; }

  // "15. 5." (Croatian date style) for a season boundary 'MM-DD', shifted by whole days.
  function dayMonth(md, shift) {
    var dt = new Date(2001, +md.slice(0, 2) - 1, +md.slice(3) + (shift || 0));
    return dt.getDate() + '. ' + (dt.getMonth() + 1) + '.';
  }

  // Folder links only resolve to index.html over http(s); when the site is opened from disk, add it on click.
  // (Local preview only: "Open in new tab" from the context menu still shows the folder listing.)
  if (location.protocol === 'file:') {
    var openFolderLink = function (e) {
      var a = e.target.closest('a[href]');
      var href = a && a.getAttribute('href');
      if (!href || /^([a-z]+:|\/\/|#|\?)/i.test(href) || e.defaultPrevented || e.button > 1) return;
      var m = href.match(/^([^?#]*)(.*)$/);
      if (!/(^|\/)(\.\.?)?$/.test(m[1])) return;
      e.preventDefault();
      var url = m[1].replace(/\/?$/, '/') + 'index.html' + m[2];
      if (e.button === 1 || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') window.open(url, '_blank');
      else location.href = url;
    };
    document.addEventListener('click', openFolderLink);
    document.addEventListener('auxclick', openFolderLink);
  }

  /* ---------------- Plain addresses ---------------- */
  // The address bar only shows the page itself (/, /o-nama/, /hiper-novalis/): a link to a part of the page (#upit,
  // the skip link) scrolls there without adding #upit to the address, and a #section or ?… a page arrives with
  // (/#lokacije from another page) is dropped once the page has scrolled there and read it.
  // goTo: scroll to el like a #link does (smooth, clear of the sticky header) and move keyboard focus there.
  function goTo(el) {
    el.scrollIntoView();
    if (el.tabIndex < 0 && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    var el = document.getElementById(a.getAttribute('href').slice(1));
    if (el) goTo(el);
  });
  window.addEventListener('load', function () {
    if (!location.hash && !location.search && !/\/index\.html$/.test(location.pathname)) return;
    // from disk the file name stays: file:///…/novalis-web/ would open the folder listing on reload
    var path = location.protocol === 'file:' ? location.pathname : location.pathname.replace(/index\.html$/, '');
    try { history.replaceState(history.state, '', path); } catch (err) { /* address stays as it came */ }
  });

  /* ---------------- Search engines (schema.org JSON-LD) ---------------- */
  // Absolute addresses come from the page's canonical link when it has one, else from where the page is served.
  var canonical = $('link[rel="canonical"]');
  var PAGE_URL = (canonical ? canonical.href : location.href).replace(/[?#].*$/, '').replace(/index\.html$/, '');
  function absUrl(path) { return new URL(path, PAGE_URL).href; }
  var HOME_URL = absUrl(HOME || './');

  var ORG = { '@type': 'Organization', '@id': HOME_URL + '#organizacija', name: D.company.name, url: HOME_URL };
  function postalAddress(address) {
    var street = address.split(',')[0].trim();
    return {
      '@type': 'PostalAddress', streetAddress: street === D.company.town ? undefined : street,
      addressLocality: D.company.town, postalCode: D.company.postalCode, addressCountry: 'HR'
    };
  }
  // A unit's own page (or website): its JSON-LD @id, so the landing page and the store page describe the same business.
  function unitId(u) { return u.url ? u.url : absUrl(unitHref(u)) + '#poslovnica'; }
  function addJSONLD(data) {
    var el = document.createElement('script');
    el.type = 'application/ld+json';
    el.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    document.head.appendChild(el);
  }

  /* ---------------- Opening hours (Europe/Zagreb) ---------------- */
  // Every date is a calendar day in Novalja, kept as its UTC midnight and read with getUTC*, so the date arithmetic
  // never depends on the visitor's time zone (or its daylight saving).
  var DAYS_ACC = ['ponedjeljak', 'utorak', 'srijedu', 'četvrtak', 'petak', 'subotu', 'nedjelju'];
  var DAY_MS = 864e5;
  var toMin = function (s) { var p = s.split(':'); return (+p[0]) * 60 + (+p[1]); };
  var has = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
  // An exception as data/units.js documents it: key 'MM-DD' or 'YYYY-MM-DD' (two digits each), value null or
  // ['HH:MM', 'HH:MM']
  var EX_KEY = /^(\d{4}-)?\d{2}-\d{2}$/, HHMM = /^\d{2}:\d{2}$/;
  function isHours(t) { return t === null || (Array.isArray(t) && t.length === 2 && HHMM.test(t[0]) && HHMM.test(t[1])); }

  // ms: the day's UTC midnight · y: year · iso: 'YYYY-MM-DD' · md: 'MM-DD' · day: 0 = Monday … 6 = Sunday
  function calDay(ms) {
    var dt = new Date(ms), iso = dt.toISOString().slice(0, 10);
    return { ms: ms, y: dt.getUTCFullYear(), iso: iso, md: iso.slice(5), day: (dt.getUTCDay() + 6) % 7 };
  }
  // 'YYYY-MM-DD' → calDay
  function dayOf(iso) { return calDay(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))); }

  // Today in Novalja, from the browser's clock: calDay + min (minutes since midnight).
  function zagrebNow() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Zagreb', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    var g = function (t) { return +(parts.find(function (x) { return x.type === t; }) || {}).value; };
    var z = calDay(Date.UTC(g('year'), g('month') - 1, g('day')));
    z.min = g('hour') * 60 + g('minute');
    return z;
  }

  // 'MM-DD' within { start, end }, both days included (a period may run over New Year: start after end)
  function inPeriod(md, p) {
    return p.start <= p.end ? md >= p.start && md <= p.end : md >= p.start || md <= p.end;
  }
  // The season of a day (calDay, or zagrebNow() for today).
  function currentSeason(d) {
    return inPeriod(d.md, D.seasons.summer) ? 'summer' : 'winter';
  }

  // Easter Sunday of year y as its UTC midnight (Gregorian computus, Meeus/Jones/Butcher).
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var n = h + l - 7 * m + 114;
    return Date.UTC(y, Math.floor(n / 31) - 1, n % 31 + 1);
  }
  // The public holidays of year y ('YYYY-MM-DD', in date order), worked out once per year; callers get a copy, so the
  // cache can't be changed from outside. In some years a date is there twice (Tijelovo on 30. 5. or 22. 6.): harmless
  // for "is it a holiday", and specialDays lists each date once.
  var holidayCache = {};
  function holidays(y) {
    if (!holidayCache[y]) {
      var H = D.holidays, e = easter(y);
      holidayCache[y] = H.fixed.map(function (md) { return y + '-' + md; })
        .concat(H.easter.map(function (n) { return calDay(e + n * DAY_MS).iso; })).sort();
    }
    return holidayCache[y].slice();
  }

  // A unit's hours on day d (calDay): t = [open, close], or null when it is closed all day. The first rule that
  // applies wins: a dated exception ('YYYY-MM-DD' before 'MM-DD'), the open period, a public holiday (closedOnHolidays),
  // the weekly table of d's season. special: a rule other than the weekly table decided. An exception not written as
  // documented counts as absent (see the warning below).
  function dayHours(u, d) {
    var ex = u.exceptions;
    if (has(ex, d.iso) && isHours(ex[d.iso])) return { t: ex[d.iso], special: true };
    if (has(ex, d.md) && isHours(ex[d.md])) return { t: ex[d.md], special: true };
    if (u.openPeriod && !inPeriod(d.md, u.openPeriod)) return { t: null, special: true };
    if (u.closedOnHolidays && holidays(d.y).indexOf(d.iso) >= 0) return { t: null, special: true };
    return { t: u.hours[currentSeason(d)][d.day], special: false };
  }

  // "otvara sutra u 07:00" / "otvara u utorak u 07:00": the first of the next 6 days the unit opens (after that the
  // weekday would be ambiguous), or null.
  function nextOpen(u, d) {
    for (var i = 1; i <= 6; i++) {
      var n = calDay(d.ms + i * DAY_MS), t = dayHours(u, n).t;
      if (t) return 'otvara ' + (i === 1 ? 'sutra' : 'u ' + DAYS_ACC[n.day]) + ' u ' + t[0];
    }
    return null;
  }

  // "Danas 07:00 - 19:00" / "Sutra 0 - 24 h" / "Danas zatvoreno": a day's hours (t as in dayHours) after word.
  function hoursLine(word, t) {
    return word + ' ' + (!t ? 'zatvoreno' : t[0] === '00:00' && t[1] === '24:00' ? '0 - 24 h' : t[0] + ' - ' + t[1]);
  }

  // A unit's status now (z: zagrebNow()). text: long status for cards · label: short status for map card and list ·
  // today: the second line of map card and list, shown when hasToday: today's hours, tomorrow's once today's are over ·
  // regular: today's hours are the weekly table's (store pages mark that row). A day closed by an exception, the open
  // period or a holiday says only "Zatvoreno": no hours, no "otvara …". Once today's hours are over: "otvara …".
  function unitStatus(u, z) {
    var h = dayHours(u, z), t = h.t, next;
    var is24 = !!t && t[0] === '00:00' && t[1] === '24:00';
    var reception = u.category === 'smjestaj' && is24;
    var closedAllDay = !t && h.special;
    var open = !!t && (is24 || (z.min >= toMin(t[0]) && z.min < toMin(t[1])));
    var over = !!t && z.min >= toMin(t[1]);
    var today = over ? hoursLine('Sutra', dayHours(u, calDay(z.ms + DAY_MS)).t) : hoursLine('Danas', t);
    var text;
    if (reception) text = 'Recepcija 0 - 24 h';
    else if (open) text = is24 ? 'Otvoreno 0 - 24 h' : 'Otvoreno do ' + t[1];
    else if (t && !over) text = 'Zatvoreno · ' + today;
    else if (!closedAllDay && (next = nextOpen(u, z))) text = 'Zatvoreno · ' + next;
    else text = 'Zatvoreno';
    return {
      open: open, text: text, today: today, hasToday: !reception && !closedAllDay, regular: !h.special,
      label: reception ? 'Recepcija 0 - 24 h' : open ? 'Otvoreno sada' : 'Zatvoreno'
    };
  }

  // The days of year y with hours of their own (a public holiday the unit closes on, a dated exception), in date
  // order: [{ iso, t }] with t as in dayHours. For search engines (store pages' JSON-LD).
  function specialDays(u, y) {
    var ex = u.exceptions || {};
    var isos = Object.keys(ex).filter(function (k) { return EX_KEY.test(k) && isHours(ex[k]); })
      .map(function (k) { return k.length === 5 ? y + '-' + k : k; })
      .concat(u.closedOnHolidays ? holidays(y) : []).sort();
    return isos.filter(function (iso, i) {
      // one entry per date; and no 29. 2. outside leap years (nor 30. 2. or month 13)
      return iso.slice(0, 4) === String(y) && iso !== isos[i - 1] && dayOf(iso).iso === iso;
    }).map(function (iso) { return { iso: iso, t: dayHours(u, dayOf(iso)).t }; });
  }

  // A mistyped exception in data/units.js must never break a page: dayHours and specialDays leave it out, so that day
  // keeps its normal rules, and the console names each one once, here.
  D.units.forEach(function (u) {
    Object.keys(u.exceptions || {}).forEach(function (k) {
      if (EX_KEY.test(k) && isHours(u.exceptions[k])) return;
      console.warn('data/units.js: ' + u.id + ".exceptions['" + k + "'] is ignored. Write 'MM-DD' or 'YYYY-MM-DD' " +
        "(two digits each) with null or ['HH:MM', 'HH:MM'].");
    });
  });

  /* ---------------- Brand vectors ---------------- */
  var LOGO_COLORS = { red: 'var(--nv-red)', yellow: 'var(--nv-yellow)', white: '#fff', black: '#000' };

  function logoSVG(variant, color, h) {
    var d = P.logos[variant] || P.logos.novalis;
    var w = +(h * d.w / d.h).toFixed(2);
    return '<svg role="img" aria-label="Novalis" viewBox="0 0 ' + d.w + ' ' + d.h + '" width="' + w + '" height="' + h +
      '" style="color:' + (LOGO_COLORS[color] || color) + '">' +
      d.p.map(function (p) { return '<path d="' + p + '" fill="currentColor"/>'; }).join('') + '</svg>';
  }

  // The cart badge (brand mark) is drawn red with a yellow cart; on red it flips to a yellow badge with a red cart.
  // The dark-red shadow plate stays in both.
  var TILE_FLIP = { '#d71920': 'var(--nv-yellow)', '#ffcb05': 'var(--nv-red)' };

  function tileSVG(variant, h) {
    var d = P.tile;
    var w = +(h * d.w / d.h).toFixed(2);
    return '<svg class="logo-mark" aria-hidden="true" focusable="false" viewBox="0 0 ' + d.w + ' ' + d.h + '" width="' + w +
      '" height="' + h + '">' + d.p.map(function (p) {
        return '<path d="' + p[0] + '" style="fill:' + (variant === 'yellow' && TILE_FLIP[p[1]] || p[1]) + '"/>';
      }).join('') + '</svg>';
  }

  function pictoSVG(name, size) {
    var d = P.pictos[name];
    if (!d) return '';
    return '<svg class="picto" aria-hidden="true" viewBox="' + d.vb + '" width="' + size + '" height="' + size +
      '"><path fill="currentColor" fill-rule="evenodd" d="' + d.d + '"/></svg>';
  }

  function renderBrand() {
    // data-logo-mark="red|yellow" puts the cart badge left of the wordmark, about twice its height.
    $$('[data-logo]').forEach(function (el) {
      var h = +el.dataset.logoH || 24;
      el.innerHTML = (el.dataset.logoMark ? tileSVG(el.dataset.logoMark, Math.round(h * 1.8)) : '') +
        logoSVG(el.dataset.logo, el.dataset.logoColor || 'red', h);
    });
  }

  /* ---------------- Image slots ---------------- */
  function placeholderHTML(text) {
    return '<div class="slot__ph"><span class="ms" aria-hidden="true">image</span><span>' + esc(text) + '</span></div>';
  }

  function slotHTML(src, placeholder, alt) {
    var inner = src ? '<img src="' + esc(src) + '" alt="' + esc(alt || '') + '" loading="lazy" decoding="async">' : placeholderHTML(placeholder);
    return '<div class="slot" data-placeholder="' + esc(placeholder) + '">' + inner + '</div>';
  }

  function initStaticSlots() {
    $$('.slot[data-placeholder]').forEach(function (el) {
      if (!el.children.length) el.innerHTML = placeholderHTML(el.dataset.placeholder);
    });
  }

  // A missing photo falls back to its placeholder instead of a broken-image icon.
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (img && img.tagName === 'IMG') {
      var slot = img.closest('.slot');
      if (slot) slot.innerHTML = placeholderHTML(slot.dataset.placeholder || '');
    }
  }, true);

  /* ---------------- Header nav + footer ---------------- */
  // Every link to a unit goes to its store page, or to its own website in a new tab.
  var NEW_TAB = '<span class="vh"> (nova kartica)</span>';

  // Tooltip of a link to a unit's Google Business listing. Without the unit's name: an attribute can't keep part of its
  // text out of browser translation (translate="no").
  var PLACE_TITLE = 'Otvori na Google kartama';

  // A unit's address, as a link to its Google Business listing when it has one (class cls either way)
  function addrHTML(u, cls) {
    var href = placeHref(u);
    return href
      ? '<a class="' + cls + ' addr-link" href="' + esc(href) + '" target="_blank" rel="noopener" title="' + PLACE_TITLE + '">' +
          esc(u.address) + NEW_TAB + '</a>'
      : '<span class="' + cls + '">' + esc(u.address) + '</span>';
  }
  // Unit names are brand names: translate="no" keeps browser translation from turning "Pod Zvon" into "Under the Bell".
  function nameHTML(u) { return '<span translate="no">' + esc(u.name) + '</span>'; }
  // Header menu links end in the → the "Za svaku priliku" links use, also for a unit's own website (B&B Novalis);
  // that one still says it opens a new tab.
  function navIcoHTML(u) {
    return '<svg class="nav-go" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h15M13 6l6 6-6 6"/></svg>' +
      (u.external ? NEW_TAB : '');
  }
  function unitLinkAttrs(u, cls) {
    var current = document.body.dataset.unit === u.id ? ' aria-current="page"' : '';
    return 'class="' + cls + '" href="' + esc(unitHref(u)) + '"' + current +
      (u.external ? ' target="_blank" rel="noopener"' : '');
  }

  function renderNav() {
    // Categories in data order, each with its units in data order; a category without units gets no menu.
    var groups = D.categories.map(function (c) {
      return { c: c, id: esc(c.id), items: units.filter(function (u) { return u.category === c.id; }) };
    }).filter(function (g) { return g.items.length; });

    // A `direct` category (Veleprodaja) is one link to its only unit, in both menus.
    function direct(g) { return g.c.direct && g.items.length === 1 ? g.items[0] : null; }

    // Desktop: a disclosure button per category (pictogram + label) with its own panel of unit links.
    $('#navCats').innerHTML = groups.map(function (g) {
      var u = direct(g);
      if (u) return '<a ' + unitLinkAttrs(u, 'nav-link nav-direct') + '>' + pictoSVG(g.c.picto, 22) + esc(g.c.label) + '</a>';
      return '<div class="nav-drop" data-cat="' + g.id + '">' +
        '<button type="button" class="nav-link nav-cat" id="nav-' + g.id + '" aria-expanded="false" aria-controls="nav-panel-' + g.id + '">' +
        pictoSVG(g.c.picto, 22) + esc(g.c.label) + '</button>' +
        '<ul class="dropdown dd-panel" id="nav-panel-' + g.id + '" role="list" hidden>' +
        g.items.map(function (u) {
          return '<li><a ' + unitLinkAttrs(u, 'dd-item') + '>' + nameHTML(u) + navIcoHTML(u) + '</a></li>';
        }).join('') +
        '</ul></div>';
    }).join('');

    // Mobile: the same categories as groups that expand one by one, independently of each other.
    $('#mobileGroups').innerHTML = groups.map(function (g) {
      var u = direct(g);
      if (u) return '<div class="mm-group"><a ' + unitLinkAttrs(u, 'mm-direct') + '>' +
        pictoSVG(g.c.picto, 22) + '<span>' + esc(g.c.label) + '</span>' + navIcoHTML(u) + '</a></div>';
      return '<div class="mm-group">' +
        '<button type="button" class="mm-toggle" id="mm-' + g.id + '" aria-expanded="false" aria-controls="mm-panel-' + g.id + '">' +
        pictoSVG(g.c.picto, 22) + '<span>' + esc(g.c.label) + '</span><span class="ms ms--sm" aria-hidden="true">expand_more</span></button>' +
        '<ul class="mm-list" id="mm-panel-' + g.id + '" role="list" hidden>' +
        g.items.map(function (u) {
          return '<li><a ' + unitLinkAttrs(u, 'mm-item') + '>' + nameHTML(u) + navIcoHTML(u) + '</a></li>';
        }).join('') +
        '</ul></div>';
    }).join('');

    var footerUnits = $('#footerUnits');
    if (footerUnits) footerUnits.innerHTML = units.map(function (u) {
      return '<a ' + unitLinkAttrs(u, 'footer__link') + '>' + nameHTML(u) +
        (u.external ? NEW_TAB : '') + '</a>';
    }).join('');
  }

  // Opens the header panel of category `id` and closes the others; null closes them all.
  function setOpen(id) {
    clearTimeout(hover.timer); hover.id = undefined;
    ui.open = id || null; ui.hoverAt = 0;
    $$('#navCats .nav-drop').forEach(function (d) {
      var open = d.dataset.cat === ui.open;
      $('.nav-cat', d).setAttribute('aria-expanded', open);
      $('.dd-panel', d).hidden = !open;
    });
  }

  // A mouse also opens a category by resting on it: after a short pause, so sweeping across the bar doesn't flash
  // panels, and it closes a moment after the pointer leaves, which also bridges the 1px gap above the panel.
  // Touch and pen keep tap-to-open; the keyboard keeps Enter/Space.
  // HOVER_CLICK: a mouse click this soon after the hover opened the panel was aimed at opening it.
  var HOVER_OPEN = 80, HOVER_CLOSE = 200, HOVER_CLICK = 600;
  var hover = { id: undefined, timer: 0 };   // id: the change on its way (a category, or null = close)
  function hoverTo(id, delay) {
    if (hover.id === id) return;
    clearTimeout(hover.timer); hover.id = undefined;
    if (id === ui.open) return;   // already showing: just cancel the pending change
    hover.id = id;
    hover.timer = setTimeout(function () { setOpen(id); if (id) ui.hoverAt = Date.now(); }, delay);
  }

  // Keyboard focus keeps the open category from closing when the mouse leaves it: focus in its panel (hiding the panel
  // would drop it to <body>), or on its trigger when the keyboard opened it. Focus left by a mouse click doesn't count.
  function keyboardHolds(drop) {
    var f = document.activeElement;
    if (drop.dataset.cat !== ui.open || !drop.contains(f)) return false;
    try { if (!f.matches(':focus-visible')) return false; } catch (err) { /* no :focus-visible: any focus counts */ }
    return !ui.hoverAt || $('.dd-panel', drop).contains(f);
  }

  function setGroup(btn, open) {
    btn.setAttribute('aria-expanded', open);
    document.getElementById(btn.getAttribute('aria-controls')).hidden = !open;
  }

  function setMenu(open) {
    ui.menu = open;
    // the menu always opens with every category group collapsed
    if (open) $$('#mobileGroups .mm-toggle').forEach(function (b) { setGroup(b, false); });
    $('#mobileMenu').hidden = !open;
    $('#menuBtn').setAttribute('aria-expanded', open);
    $('#menuBtn .ms').textContent = open ? 'close' : 'menu';
  }

  function bind() {
    var cats = $('#navCats');
    cats.addEventListener('click', function (e) {
      var btn = e.target.closest('.nav-cat'), a = e.target.closest('a');
      // a mouse click right after the hover opened the panel keeps it open (the click meant "open"); later clicks and
      // Enter/Space (detail 0) toggle it
      if (btn) {
        var id = btn.parentNode.dataset.cat;
        if (ui.open === id && e.detail && Date.now() - ui.hoverAt < HOVER_CLICK) ui.hoverAt = 0;
        else setOpen(ui.open === id ? null : id);
      }
      // a link opening a new tab keeps the user here: focus its trigger, or it drops to <body> with the panel
      else if (a) { if (a.target === '_blank' && a.closest('.nav-drop')) $('.nav-cat', a.closest('.nav-drop')).focus(); setOpen(null); }
    });
    // mouse entering / leaving a category (trigger + panel); moves between its own children don't count
    cats.addEventListener('pointerover', function (e) {
      var drop = e.target.closest('.nav-drop');
      if (e.pointerType === 'mouse' && drop && !drop.contains(e.relatedTarget)) hoverTo(drop.dataset.cat, HOVER_OPEN);
    });
    cats.addEventListener('pointerout', function (e) {
      var drop = e.target.closest('.nav-drop');
      if (e.pointerType !== 'mouse' || !drop || drop.contains(e.relatedTarget) || keyboardHolds(drop)) return;
      hoverTo(null, HOVER_CLOSE);
    });
    // tabbing out of the open category closes it
    cats.addEventListener('focusout', function (e) {
      var drop = e.target.closest('.nav-drop');
      if (ui.open && drop && drop.dataset.cat === ui.open && e.relatedTarget && !drop.contains(e.relatedTarget)) setOpen(null);
    });
    document.addEventListener('click', function (e) {
      if (ui.open && !e.target.closest('.nav-drop')) setOpen(null);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (ui.open) { var btn = document.getElementById('nav-' + ui.open); setOpen(null); btn.focus(); }
      if (ui.menu) { setMenu(false); $('#menuBtn').focus(); }
    });

    $('#menuBtn').addEventListener('click', function () { setMenu(!ui.menu); });
    $('#mobileMenu').addEventListener('click', function (e) {
      var btn = e.target.closest('.mm-toggle'), a = e.target.closest('a');
      if (btn) {
        // one category open at a time, like the desktop panels
        var open = btn.getAttribute('aria-expanded') !== 'true';
        $$('#mobileGroups .mm-toggle').forEach(function (b) { setGroup(b, open && b === btn); });
      }
      else if (a) { if (a.target === '_blank') $('#menuBtn').focus(); setMenu(false); }
    });
    // tabbing out of the open menu closes it, so it can't cover what gets focus (Shift+Tab to the menu button keeps it)
    $('#mobileMenu').addEventListener('focusout', function (e) {
      var to = e.relatedTarget;
      if (ui.menu && to && !this.contains(to) && !$('#menuBtn').contains(to)) setMenu(false);
    });
    window.matchMedia('(min-width: 1080px)').addEventListener('change', function (e) {
      if (e.matches) setMenu(false); else setOpen(null);
    });

    // language switch (visual only — content is Croatian until translations exist)
    $$('[data-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lang === btn.dataset.lang); });
      });
    });
  }

  /* ---------------- Unit cards ---------------- */
  // A unit's card on the landing page (#poslovnice) and in a store page's Povezane poslovnice. st: its status
  // (unitStatus) · photo: the picture, if not the unit's card photo.
  function cardData(u, st, photo) {
    return {
      id: u.id, name: u.name, address: u.address, photo: asset(photo || u.photo), photoHint: u.photoHint, promo: !!u.promo,
      href: unitHref(u), external: !!u.external, open: st.open,
      // today's hours with open/closed ("Otvoreno · Danas 07:00 - 19:00"), else the status ("Zatvoreno · otvara sutra u 07:00")
      hours: st.open && st.hasToday ? 'Otvoreno · ' + st.today : st.text
    };
  }

  // One link per card: the name, stretched over the whole card (.card__link::after), so a click anywhere opens the unit.
  // The photo is decorative (the name follows it). The ghost copy of the name keeps its line free in the hover panel;
  // Više is only a visual cue. --i staggers the entrance.
  function cardHTML(c, i) {
    return '<article class="card" id="' + esc(c.id) + '" style="--i:' + Math.min(i, 8) + '">' +
      '<div class="card__media">' + slotHTML(c.photo, c.photoHint, '') +
        (c.promo ? '<span class="card__promo">Akcija</span>' : '') + '</div>' +
      '<div class="card__head"><h3 class="card__name"><a class="card__link" href="' + esc(c.href) + '"' +
        (c.external ? ' target="_blank" rel="noopener"' : '') + '><span class="card__nm" translate="no">' + esc(c.name) + '</span>' +
        (c.external ? NEW_TAB : '') + '</a></h3></div>' +
      '<div class="card__info"><span class="card__ghost" aria-hidden="true" translate="no">' + esc(c.name) + '</span>' +
        '<div class="card__meta"><p class="card__addr">' + esc(c.address) + '</p>' +
          '<p class="card__hours status' + (c.open ? ' is-open' : '') + '"><span class="dot"></span><span>' + esc(c.hours) + '</span></p></div>' +
        '<span class="card__more" aria-hidden="true">Više<span class="ms ms--xs">arrow_forward</span></span></div>' +
    '</article>';
  }

  // A grid of unit cards (.cards). The cards rise in one after another the first time the grid comes into view (css
  // .cards--anim). The classes come off again once it has run, or as soon as the cards change, so re-renders never
  // replay it and no card stays hidden. Without IntersectionObserver, or with reduced motion, it never starts.
  // render(html, swap) - swap: a filter changed the selection. That ends the entrance and fades the new cards in (none
  // with reduced motion). The minute refresh replaces the cards only when a status text changed, without motion; if
  // that happens while the entrance runs, the entrance ends there, so it never replays.
  function cardGrid(grid) {
    var io = null, t = 0, swapT = 0, shown = null;

    function end() {
      clearTimeout(t);
      if (io) { io.disconnect(); io = null; }
      grid.classList.remove('cards--anim', 'is-in');
    }

    function render(html, swap) {
      var changed = html !== shown;
      if (swap || (changed && grid.classList.contains('is-in'))) end();
      if (swap && changed && !reduceMotion) {
        grid.classList.add('cards--swap');
        clearTimeout(swapT);
        swapT = setTimeout(function () { grid.classList.remove('cards--swap'); }, 260);
      }
      // new markup replaces the focused link: give focus back to the same card, so keyboard users keep their place
      var focused = changed && grid.contains(document.activeElement) && document.activeElement.closest('.card');
      setHTML(grid, html);
      shown = html;
      var again = focused && document.getElementById(focused.id);
      if (again) again.querySelector('.card__link').focus({ preventScroll: true });
    }

    if (!reduceMotion && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        // the latest entry: several can queue up before the callback runs (a scroll during load)
        if (!entries[entries.length - 1].isIntersecting) return;
        io.disconnect(); io = null;
        grid.classList.add('is-in');
        // the last card lands 760 ms after its start, 70 ms after the one before it (the stagger stops at the 9th)
        t = setTimeout(end, Math.min(grid.children.length - 1, 8) * 70 + 800);
      }, { rootMargin: '0px 0px -15% 0px' });
      grid.classList.add('cards--anim');
      io.observe(grid);
      // Tab can bring a card link to the screen's very edge before the grid counts as in view: show the cards at once
      grid.addEventListener('focusin', function () { if (io) end(); });
    }

    return { render: render, end: end };
  }

  // phones: the quick buttons in the corner (.quickbar) hold back while the hero's own buttons (actions) are on screen,
  // so they don't cover them or offer the same call twice; buttons that have slid under the sticky header count as
  // gone. The first state is set without the motion, so the quick buttons don't flash in and out on load
  function holdQuickbar(actions) {
    var bar = $('.quickbar');
    if (!bar || !actions || !('IntersectionObserver' in window)) return;
    var top = headerOffset(), r = actions.getBoundingClientRect();
    bar.classList.add('is-still');
    bar.classList.toggle('is-held', r.bottom > top && r.top < innerHeight);
    void bar.offsetWidth;
    bar.classList.remove('is-still');
    new IntersectionObserver(function (entries) {
      // the latest entry: several can queue up before the callback runs
      bar.classList.toggle('is-held', entries[entries.length - 1].isIntersecting);
    }, { rootMargin: -top + 'px 0px 0px 0px' }).observe(actions);
  }

  var year = new Date().getFullYear();
  $$('[data-years]').forEach(function (el) { el.textContent = year - D.company.founded; });
  $$('[data-year]').forEach(function (el) { el.textContent = year; });
  renderBrand();
  initStaticSlots();
  renderNav();
  bind();

  return {
    D: D, HOME: HOME, CAT_IDS: CAT_IDS, units: units, byId: byId, reduceMotion: reduceMotion,
    $: $, $$: $$, esc: esc, setHTML: setHTML, headerOffset: headerOffset,
    goTo: goTo, asset: asset, unitHref: unitHref, mapsHref: mapsHref, placeHref: placeHref, addrHTML: addrHTML, telHref: telHref, telLabel: telLabel, dayMonth: dayMonth,
    NEW_TAB: NEW_TAB, PLACE_TITLE: PLACE_TITLE, logoSVG: logoSVG, slotHTML: slotHTML, cardData: cardData, cardHTML: cardHTML, cardGrid: cardGrid, holdQuickbar: holdQuickbar,
    absUrl: absUrl, PAGE_URL: PAGE_URL, HOME_URL: HOME_URL, ORG: ORG, postalAddress: postalAddress, unitId: unitId, addJSONLD: addJSONLD,
    zagrebNow: zagrebNow, currentSeason: currentSeason, holidays: holidays, unitStatus: unitStatus, specialDays: specialDays
  };
})();
