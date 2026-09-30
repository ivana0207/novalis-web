/* Novalis site — shared by every page: brand vectors, image slots, header ("Poslovnice" dropdown, mobile menu,
   language toggle) and footer. Page scripts (app.js, o-nama.js) build on window.NV.
   Loaded at the end of <body>, so the markup it works on is already parsed. */
window.NV = (function () {
  'use strict';

  var D = window.NOVALIS_DATA;
  var P = window.NV_PATHS;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Pages other than the landing link back to it for units and sections: <body data-home="index.html">.
  var HOME = document.body.dataset.home || '';
  var CAT_IDS = D.categories.map(function (c) { return c.id; });
  // Units in category order; unit numbers (map pins, list) follow this order.
  var units = D.units.slice().sort(function (a, b) { return CAT_IDS.indexOf(a.category) - CAT_IDS.indexOf(b.category); });
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
  function renderNav() {
    var groups = D.categories.map(function (c) {
      return { c: c, items: units.filter(function (u) { return u.category === c.id; }) };
    });

    $('#navMenu').innerHTML = groups.map(function (g) {
      return '<div class="dd-group" role="group" aria-labelledby="dd-' + g.c.id + '">' +
        '<span class="dd-label" id="dd-' + g.c.id + '">' + pictoSVG(g.c.picto, 14) + esc(g.c.label) + '</span>' +
        g.items.map(function (u) { return '<a class="dd-item" href="' + HOME + '#' + u.id + '">' + esc(u.name) + '</a>'; }).join('') +
        '</div>';
    }).join('');

    $('#mobileGroups').innerHTML = groups.map(function (g) {
      return '<div class="mm-group" role="group" aria-labelledby="mm-' + g.c.id + '">' +
        '<span class="mm-label" id="mm-' + g.c.id + '">' + pictoSVG(g.c.picto, 14) + esc(g.c.label) + '</span>' +
        g.items.map(function (u) {
          return '<a class="mm-item" href="' + HOME + '#' + u.id + '"><span>' + esc(u.name) + '</span>' +
            '<span class="ms ms--xs" aria-hidden="true">arrow_forward</span></a>';
        }).join('') + '</div>';
    }).join('');

    // ?kategorija= preselects the filter on the landing page (app.js); there, clicks filter in place.
    $('#footerCats').innerHTML = D.categories.map(function (c) {
      return '<a class="footer__link" href="' + HOME + '?kategorija=' + c.id + '#poslovnice" data-cat="' + c.id + '">' + esc(c.label) + '</a>';
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
    D: D, HOME: HOME, CAT_IDS: CAT_IDS, units: units, reduceMotion: reduceMotion,
    $: $, $$: $$, esc: esc, setHTML: setHTML, scrollToY: scrollToY, headerOffset: headerOffset,
    slotHTML: slotHTML, setDrop: setDrop, setMenu: setMenu
  };
})();
