/* Novalis site — shared by every page: brand vectors, image slots, opening hours, header ("Poslovnice" dropdown,
   mobile menu, language toggle) and footer. Page scripts (app.js, o-nama.js, poslovnica.js) build on window.NV.
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
  var byId = {}, catLabel = {};
  D.units.forEach(function (u) { byId[u.id] = u; });
  D.categories.forEach(function (c) { catLabel[c.id] = c.label; });
  var ui = { drop: false, menu: false };

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
  function scrollToY(y) {
    window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
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
  function mapsHref(u) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(u.name + ', ' + u.address);
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

  function pictoSVG(name, size) {
    var d = P.pictos[name];
    if (!d) return '';
    return '<svg class="picto" aria-hidden="true" viewBox="' + d.vb + '" width="' + size + '" height="' + size +
      '"><path fill="currentColor" fill-rule="evenodd" d="' + d.d + '"/></svg>';
  }

  function renderBrand() {
    $$('[data-logo]').forEach(function (el) {
      el.innerHTML = logoSVG(el.dataset.logo, el.dataset.logoColor || 'red', +el.dataset.logoH || 24);
    });
    $$('[data-picto]').forEach(function (el) {
      el.outerHTML = pictoSVG(el.dataset.picto, +el.dataset.pictoSize || 22);
    });
  }

  /* ---------------- Image slots ---------------- */
  function placeholderHTML(text) {
    return '<div class="slot__ph"><span class="ms" aria-hidden="true">image</span><span>' + esc(text) + '</span></div>';
  }

  function slotHTML(src, placeholder, alt) {
    var inner = src ? '<img src="' + esc(src) + '" alt="' + esc(alt || '') + '" loading="lazy">' : placeholderHTML(placeholder);
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
  var EXT_ICON = '<span class="ms ms--xs" aria-hidden="true">open_in_new</span>' + NEW_TAB;
  // Unit names are brand names: translate="no" keeps browser translation from turning "Pod Zvon" into "Under the Bell".
  function nameHTML(u) { return '<span translate="no">' + esc(u.name) + '</span>'; }
  function unitLinkAttrs(u, cls) {
    var current = document.body.dataset.unit === u.id ? ' aria-current="page"' : '';
    return 'class="' + cls + '" href="' + esc(unitHref(u)) + '"' + current +
      (u.external ? ' target="_blank" rel="noopener"' : '');
  }

  function renderNav() {
    var groups = D.categories.map(function (c) {
      return { c: c, items: units.filter(function (u) { return u.category === c.id; }) };
    });

    $('#navMenu').innerHTML = groups.map(function (g) {
      return '<div class="dd-group" role="group" aria-labelledby="dd-' + g.c.id + '">' +
        '<span class="dd-label" id="dd-' + g.c.id + '">' + pictoSVG(g.c.picto, 14) + esc(g.c.label) + '</span>' +
        g.items.map(function (u) {
          return '<a ' + unitLinkAttrs(u, 'dd-item') + '>' + nameHTML(u) +
            (u.external ? EXT_ICON : '') + '</a>';
        }).join('') +
        '</div>';
    }).join('');

    $('#mobileGroups').innerHTML = groups.map(function (g) {
      return '<div class="mm-group" role="group" aria-labelledby="mm-' + g.c.id + '">' +
        '<span class="mm-label" id="mm-' + g.c.id + '">' + pictoSVG(g.c.picto, 14) + esc(g.c.label) + '</span>' +
        g.items.map(function (u) {
          return '<a ' + unitLinkAttrs(u, 'mm-item') + '>' + nameHTML(u) +
            '<span class="ms ms--xs" aria-hidden="true">' + (u.external ? 'open_in_new' : 'arrow_forward') + '</span>' +
            (u.external ? NEW_TAB : '') + '</a>';
        }).join('') + '</div>';
    }).join('');

    var footerUnits = $('#footerUnits');
    if (footerUnits) footerUnits.innerHTML = units.map(function (u) {
      return '<a ' + unitLinkAttrs(u, 'footer__link') + '>' + nameHTML(u) +
        (u.external ? EXT_ICON : '') + '</a>';
    }).join('');
  }

  function setDrop(open) {
    ui.drop = open;
    $('#navBtn').setAttribute('aria-expanded', open);
    $('#navBtn .ms').textContent = open ? 'expand_less' : 'expand_more';
    $('#navMenu').hidden = !open;
  }

  function setMenu(open) {
    ui.menu = open;
    $('#mobileMenu').hidden = !open;
    $('#menuBtn').setAttribute('aria-expanded', open);
    $('#menuBtn .ms').textContent = open ? 'close' : 'menu';
  }

  function bind() {
    $('#navBtn').addEventListener('click', function () { setDrop(!ui.drop); });
    $('#navMenu').addEventListener('click', function (e) { if (e.target.closest('a')) setDrop(false); });
    // tabbing out of the open dropdown closes it
    $('#navDrop').addEventListener('focusout', function (e) {
      if (ui.drop && e.relatedTarget && !this.contains(e.relatedTarget)) setDrop(false);
    });
    document.addEventListener('click', function (e) {
      if (ui.drop && !e.target.closest('#navDrop')) setDrop(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (ui.drop) { setDrop(false); $('#navBtn').focus(); }
      if (ui.menu) { setMenu(false); $('#menuBtn').focus(); }
    });

    $('#menuBtn').addEventListener('click', function () { setMenu(!ui.menu); });
    $('#mobileMenu').addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    window.matchMedia('(min-width: 1080px)').addEventListener('change', function (e) {
      if (e.matches) setMenu(false); else setDrop(false);
    });

    // language switch (visual only — content is Croatian until translations exist)
    $$('[data-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lang === btn.dataset.lang); });
      });
    });
  }

  var year = new Date().getFullYear();
  $$('[data-years]').forEach(function (el) { el.textContent = year - D.company.founded; });
  $$('[data-year]').forEach(function (el) { el.textContent = year; });
  renderBrand();
  initStaticSlots();
  renderNav();
  bind();

  return {
    D: D, HOME: HOME, CAT_IDS: CAT_IDS, units: units, byId: byId, catLabel: catLabel, reduceMotion: reduceMotion,
    $: $, $$: $$, esc: esc, setHTML: setHTML, scrollToY: scrollToY, headerOffset: headerOffset,
    asset: asset, unitHref: unitHref, mapsHref: mapsHref, telHref: telHref, telLabel: telLabel, dayMonth: dayMonth,
    NEW_TAB: NEW_TAB, logoSVG: logoSVG, slotHTML: slotHTML,
    absUrl: absUrl, PAGE_URL: PAGE_URL, HOME_URL: HOME_URL, ORG: ORG, postalAddress: postalAddress, unitId: unitId, addJSONLD: addJSONLD,
    zagrebNow: zagrebNow, currentSeason: currentSeason, unitStatus: unitStatus
  };
})();
