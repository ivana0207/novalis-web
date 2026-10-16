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
  var DAYS_ACC = ['ponedjeljak', 'utorak', 'srijedu', 'četvrtak', 'petak', 'subotu', 'nedjelju'];
  var toMin = function (s) { var p = s.split(':'); return (+p[0]) * 60 + (+p[1]); };

  function zagrebNow() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Zagreb', weekday: 'short', hour: '2-digit', minute: '2-digit',
      month: '2-digit', day: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    var g = function (t) { return (parts.find(function (x) { return x.type === t; }) || {}).value; };
    return {
      day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(g('weekday')),
      min: (+g('hour')) * 60 + (+g('minute')),
      md: g('month') + '-' + g('day')
    };
  }

  function currentSeason(z) {
    var s = D.seasons.summer;
    return z.md >= s.start && z.md <= s.end ? 'summer' : 'winter';
  }

  function nextOpen(hrs, day) {
    for (var i = 1; i <= 7; i++) {
      var d = (day + i) % 7, n = hrs[d];
      if (n) return 'otvara ' + (i === 1 ? 'sutra' : 'u ' + DAYS_ACC[d]) + ' u ' + n[0];
    }
    return 'zatvoreno';
  }

  // text: long status for cards · label: short status for map card and list · today: today's hours
  function unitStatus(u, season, z) {
    var hrs = u.hours[season], t = hrs[z.day];
    var is24 = !!t && t[0] === '00:00' && t[1] === '24:00';
    var reception = u.category === 'smjestaj' && is24;
    var open = !!t && (is24 || (z.min >= toMin(t[0]) && z.min < toMin(t[1])));
    var today = !t ? 'Danas zatvoreno' : is24 ? 'Danas 0 - 24 h' : 'Danas ' + t[0] + ' - ' + t[1];
    var text;
    if (reception) text = 'Recepcija 0 - 24 h';
    else if (open) text = is24 ? 'Otvoreno 0 - 24 h' : 'Otvoreno do ' + t[1];
    else text = 'Zatvoreno · ' + (t ? today : nextOpen(hrs, z.day));
    return {
      open: open, text: text, today: today, hasToday: !reception,
      label: reception ? 'Recepcija 0 - 24 h' : open ? 'Otvoreno sada' : 'Zatvoreno'
    };
  }

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

  // A unit's address, as a link to its Google Business listing when it has one (class cls either way)
  function addrHTML(u, cls) {
    var href = placeHref(u);
    return href
      ? '<a class="' + cls + ' addr-link" href="' + esc(href) + '" target="_blank" rel="noopener" title="' + esc(u.name) + ' na Google kartama">' +
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

    // Desktop: a disclosure button per category (pictogram + label) with its own panel of unit links.
    $('#navCats').innerHTML = groups.map(function (g) {
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
      else if (a) { if (a.target === '_blank') $('.nav-cat', a.closest('.nav-drop')).focus(); setOpen(null); }
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
    asset: asset, unitHref: unitHref, mapsHref: mapsHref, placeHref: placeHref, addrHTML: addrHTML, telHref: telHref, telLabel: telLabel, dayMonth: dayMonth,
    NEW_TAB: NEW_TAB, logoSVG: logoSVG, slotHTML: slotHTML, cardData: cardData, cardHTML: cardHTML, cardGrid: cardGrid,
    absUrl: absUrl, PAGE_URL: PAGE_URL, HOME_URL: HOME_URL, ORG: ORG, postalAddress: postalAddress, unitId: unitId, addJSONLD: addJSONLD,
    zagrebNow: zagrebNow, currentSeason: currentSeason, unitStatus: unitStatus
  };
})();
