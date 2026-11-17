/* "Zašto Novalis" band (#prilike) — shared by the landing page and O nama, on top of js/site.js.
   Renders the "Novalis za svaku priliku" cards from data/units.js, runs their carousel, and animates the static
   "Veliki izbor, domaći pristup." facts. Loaded before the page script, so /#gradnja, /#proslave and /#boravak
   have their targets. */
(function () {
  'use strict';

  var NV = window.NV, D = NV.D, $ = NV.$, $$ = NV.$$, esc = NV.esc, setHTML = NV.setHTML, tx = NV.tx;
  if (!$('#occasions')) return;

  // texts in the page language (NV.LANG): "Proslave i događanja, 2 od 3" after an arrow, and the count-up's thousands
  var TEXTS = {
    hr: { of: ' od ', thousands: '.' },     // 100.000
    en: { of: ' of ', thousands: ',' }      // 100,000
  };
  var T = TEXTS[NV.LANG] || TEXTS.hr;

  // The "+" of a closed card is an outline icon (24 grid, drawn in currentColor); everything else here is a solid pictogram.
  var OCC_ICON = {
    plus: '<path d="M12 5v14M5 12h14"/>'                                                         // closed card (desktop)
  };
  function icoSVG(name, cls) {
    return '<svg class="occ-ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (OCC_ICON[name] || '') + '</svg>';
  }

  // The eight pictograms the brand set lacks, drawn in its style (100 grid, solid, rounded, evenodd cut-outs); the rest
  // come from window.NV_PATHS: "p-name" = pictos, "i-name" = icons, "n-name" = this table.
  var OCC_PICTO = {
    house: ["M46.8 12.6a5 5 0 0 1 6.4 0l36.6 31.2a4 4 0 0 1-2.6 7H82v33.2a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6V50.8h-5.2a4 4 0 0 1-2.6-7zM41 90V69a9 9 0 0 1 18 0v21z"],
    gift: ["M18 34h64a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-64a4 4 0 0 1 -4 -4v-8a4 4 0 0 1 4 -4zM25 54h50a5 5 0 0 1 5 5v24a5 5 0 0 1 -5 5h-50a5 5 0 0 1 -5 -5v-24a5 5 0 0 1 5 -5zM46 34h8v54h-8z", "M50 33c-3-10-12-16-19-13-5 2-4 9 2 11 5 2 11 2 17 2zm0 0c3-10 12-16 19-13 5 2 4 9-2 11-5 2-11 2-17 2z"],
    bricks: ["M14 18h30a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-30a4 4 0 0 1 -4 -4v-10a4 4 0 0 1 4 -4zM56 18h30a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-30a4 4 0 0 1 -4 -4v-10a4 4 0 0 1 4 -4zM14 41h9a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-9a4 4 0 0 1 -4 -4v-10a4 4 0 0 1 4 -4zM35 41h30a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-30a4 4 0 0 1 -4 -4v-10a4 4 0 0 1 4 -4zM77 41h9a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-9a4 4 0 0 1 -4 -4v-10a4 4 0 0 1 4 -4zM14 64h30a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-30a4 4 0 0 1 -4 -4v-10a4 4 0 0 1 4 -4zM56 64h30a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-30a4 4 0 0 1 -4 -4v-10a4 4 0 0 1 4 -4z"],
    tiles: ["M18 12h24a6 6 0 0 1 6 6v24a6 6 0 0 1 -6 6h-24a6 6 0 0 1 -6 -6v-24a6 6 0 0 1 6 -6zM58 12h24a6 6 0 0 1 6 6v24a6 6 0 0 1 -6 6h-24a6 6 0 0 1 -6 -6v-24a6 6 0 0 1 6 -6zM18 52h24a6 6 0 0 1 6 6v24a6 6 0 0 1 -6 6h-24a6 6 0 0 1 -6 -6v-24a6 6 0 0 1 6 -6zM58 52h24a6 6 0 0 1 6 6v24a6 6 0 0 1 -6 6h-24a6 6 0 0 1 -6 -6v-24a6 6 0 0 1 6 -6zM23 30a7 7 0 1 0 14 0a7 7 0 1 0 -14 0zM63 70a7 7 0 1 0 14 0a7 7 0 1 0 -14 0z"],
    sofa: ["M31 22h38a9 9 0 0 1 9 9v16a9 9 0 0 1 -9 9h-38a9 9 0 0 1 -9 -9v-16a9 9 0 0 1 9 -9z", "M16 40h2a8 8 0 0 1 8 8v22a8 8 0 0 1 -8 8h-2a8 8 0 0 1 -8 -8v-22a8 8 0 0 1 8 -8z", "M82 40h2a8 8 0 0 1 8 8v22a8 8 0 0 1 -8 8h-2a8 8 0 0 1 -8 -8v-22a8 8 0 0 1 8 -8z", "M28 58h44a4 4 0 0 1 4 4v12a4 4 0 0 1 -4 4h-44a4 4 0 0 1 -4 -4v-12a4 4 0 0 1 4 -4z", "M17 76h3a3 3 0 0 1 3 3v6a3 3 0 0 1 -3 3h-3a3 3 0 0 1 -3 -3v-6a3 3 0 0 1 3 -3z", "M80 76h3a3 3 0 0 1 3 3v6a3 3 0 0 1 -3 3h-3a3 3 0 0 1 -3 -3v-6a3 3 0 0 1 3 -3z"],
    washer: ["M27 8h46a9 9 0 0 1 9 9v66a9 9 0 0 1 -9 9h-46a9 9 0 0 1 -9 -9v-66a9 9 0 0 1 9 -9zM27 57a23 23 0 1 0 46 0a23 23 0 1 0 -46 0zM35 57a15 15 0 1 0 30 0a15 15 0 1 0 -30 0zM26.5 22a4.5 4.5 0 1 0 9.0 0a4.5 4.5 0 1 0 -9.0 0zM48 18h20a4 4 0 0 1 4 4v0a4 4 0 0 1 -4 4h-20a4 4 0 0 1 -4 -4v-0a4 4 0 0 1 4 -4z"],
    cake: ["M20 56h60a6 6 0 0 1 6 6v18a6 6 0 0 1 -6 6h-60a6 6 0 0 1 -6 -6v-18a6 6 0 0 1 6 -6z", "M32 34h36a5 5 0 0 1 5 5v8a5 5 0 0 1 -5 5h-36a5 5 0 0 1 -5 -5v-8a5 5 0 0 1 5 -5z", "M49 18h2a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2z", "M50 4c4 5 6 8 6 10a6 6 0 0 1-12 0c0-2 2-5 6-10z", "M11 89h78a3 3 0 0 1 3 3v0a3 3 0 0 1 -3 3h-78a3 3 0 0 1 -3 -3v-0a3 3 0 0 1 3 -3z"],
    bath: ["M8 46h84a4 4 0 0 1 4 4v6a26 26 0 0 1-26 26H30A26 26 0 0 1 4 56v-6a4 4 0 0 1 4-4z", "M25 80h3a3 3 0 0 1 3 3v6a3 3 0 0 1 -3 3h-3a3 3 0 0 1 -3 -3v-6a3 3 0 0 1 3 -3z", "M72 80h3a3 3 0 0 1 3 3v6a3 3 0 0 1 -3 3h-3a3 3 0 0 1 -3 -3v-6a3 3 0 0 1 3 -3z", "M17 16h0a4 4 0 0 1 4 4v22a4 4 0 0 1 -4 4h-0a4 4 0 0 1 -4 -4v-22a4 4 0 0 1 4 -4z", "M17 12h16a4 4 0 0 1 4 4v0a4 4 0 0 1 -4 4h-16a4 4 0 0 1 -4 -4v-0a4 4 0 0 1 4 -4z", "M45 34a5 5 0 1 0 10 0a5 5 0 1 0 -10 0z", "M60 26a4 4 0 1 0 8 0a4 4 0 1 0 -8 0z", "M71 35a6 6 0 1 0 12 0a6 6 0 1 0 -12 0z"]
  };
  function pictoSVG(key, cls) {
    var kind = key.slice(0, 2), name = key.slice(2), vb = '0 0 100 100', d = '';
    if (kind === 'n-') d = OCC_PICTO[name];
    else if (kind === 'p-' && NV_PATHS.pictos[name]) { vb = NV_PATHS.pictos[name].vb; d = NV_PATHS.pictos[name].d; }
    else if (kind === 'i-' && NV_PATHS.icons[name]) { var ic = NV_PATHS.icons[name]; vb = '0 0 ' + ic.w + ' ' + ic.h; d = ic.p; }
    if (!d) return '';
    if (Array.isArray(d)) d = d.join('');
    return '<svg class="' + cls + '" viewBox="' + vb + '" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="' + esc(d) + '"/></svg>';
  }

  // A step: a tab with its pictogram, then one sentence whose [[...]] part is the link to the unit (name in translate="no";
  // a unit's own website opens in a new tab and says so to screen readers). The link can open the sentence or sit inside
  // it; a short word right before it ("u" / "at") stays with it on one line.
  function occStepHTML(st, k) {
    var u = NV.byId[st.unit], ext = !!u.external;
    var m = /^(.*?)\[\[(.+?)\]\](.*)$/.exec(tx(st, 'text')) || [];
    if (m.length) {                                    // split off a short word before the link: [all, before, keep, name, after]
      var w = /(^|\s)(\S{1,2}\s+)$/.exec(m[1]);
      m = w ? [m[0], m[1].slice(0, w.index) + w[1], w[2], m[2], m[3]] : [m[0], m[1], '', m[2], m[3]];
    }
    var link = '<a class="occ-step__link" href="' + esc(NV.unitHref(u)) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' +
      '<span translate="no">' + esc(m[3] || tx(u, 'name')) + '</span>' + (ext ? NV.NEW_TAB : '') + '</a>';
    var text = m.length ? esc(m[1]) + '<span class="occ-step__keep">' + (m[2] ? esc(m[2]) : '') + link + '</span>' + esc(m[4]) : esc(tx(st, 'text')) + ' ' + link;
    return '<li class="occ-step" style="--k:' + k + '"><span class="occ-step__tab" aria-hidden="true">' + pictoSVG(st.picto || '', 'occ-step__ico') + '</span>' +
      '<p class="occ-step__text">' + text + '</p></li>';
  }

  // A card: photo (or its placeholder), and on the red panel the icon, title, description and the units in order.
  // The first card starts open. Photo and placeholder are decorative: the title says what the card is.
  function occCardHTML(o, i) {
    var steps = o.steps.filter(function (st) {
      if (NV.byId[st.unit]) return true;
      console.warn('occasions: unknown unit "' + st.unit + '" in "' + o.id + '"');
      return false;
    });
    return '<article class="occ-card' + (i === 0 ? ' is-active' : '') + '" id="' + esc(o.id) + '" aria-labelledby="h-' + esc(o.id) + '" style="--i:' + i + '">' +
      '<div class="occ-card__media" aria-hidden="true">' + NV.slotHTML(NV.asset(o.photo), tx(o, 'photoHint') || '', '') + '</div>' +
      '<span class="occ-card__plus" aria-hidden="true">' + icoSVG('plus') + '</span>' +
      '<div class="occ-card__body">' +
        '<span class="occ-card__icon">' + pictoSVG(o.icon, 'occ-card__pic') + '</span>' +
        '<h3 class="occ-card__h" id="h-' + esc(o.id) + '">' + esc(tx(o, 'title')) + '</h3>' +
        '<div class="occ-card__more"><div class="occ-card__more-in">' +
          '<p class="occ-card__desc">' + esc(tx(o, 'desc')) + '</p>' +
          // role="list": Safari drops list semantics from lists styled with list-style: none
          '<ul class="occ-steps" role="list">' + steps.map(occStepHTML).join('') + '</ul>' +
        '</div></div>' +
      '</div>' +
    '</article>';
  }

  function renderOccasions() {
    setHTML($('#occasions'), (D.occasions || []).map(occCardHTML).join(''));
  }

  /* Carousel. Desktop (>= 1024): the cards sit in one row and the open one widens into a red panel; a click on a
     closed card, Tab into one of its links, or the arrows open the next one. Smaller screens: a swipe row (CSS
     scroll snap) with every card open; the arrows scroll it and the dots follow. Nothing moves on its own. */
  function initOccasions() {
    var sec = $('#prilike'), track = $('#occasions'), cards = $$('.occ-card', track);
    if (cards.length < 2) return;
    var wide = window.matchMedia('(min-width: 1024px)');
    var behavior = NV.reduceMotion ? 'auto' : 'smooth';
    var cur = 0;

    $('#occDots').innerHTML = cards.map(function () { return '<span class="occ-dot"></span>'; }).join('');
    var dots = $$('.occ-dot', $('#occDots'));
    $('#occNav').hidden = false;

    function show(i) {
      cur = i;
      cards.forEach(function (c, k) { c.classList.toggle('is-active', k === i); });
      dots.forEach(function (d, k) { d.classList.toggle('is-on', k === i); });
    }
    show(0);

    // swipe row: how far the row has to scroll to bring card i to its start edge
    function offsetOf(i) { return cards[i].offsetLeft - cards[0].offsetLeft; }
    function maxScroll() { return track.scrollWidth - track.clientWidth; }

    function go(step) {
      var n = cards.length, i = (cur + step + n) % n;
      if (wide.matches) show(i);
      else {
        // at the end of the row the last cards are all in view, so "next" starts over
        if (step > 0 && track.scrollLeft >= maxScroll() - 4) i = 0;
        track.scrollTo({ left: Math.min(offsetOf(i), maxScroll()), behavior: behavior });
        show(i);
      }
      $('#occLive').textContent = $('.occ-card__h', cards[i]).textContent + ', ' + (i + 1) + T.of + n;
    }
    $('#occPrev').addEventListener('click', function () { go(-1); });
    $('#occNext').addEventListener('click', function () { go(1); });

    track.addEventListener('click', function (e) {
      var c = e.target.closest('.occ-card');
      if (wide.matches && c && !c.classList.contains('is-active')) show(cards.indexOf(c));
    });
    // keyboard: the links of a closed card stay in the Tab order, and reaching one opens its card
    track.addEventListener('focusin', function (e) {
      var c = e.target.closest('.occ-card');
      if (wide.matches && c) show(cards.indexOf(c));
    });

    // swipe row: the dots follow the card nearest the start edge (the last one once the row is scrolled to its end)
    var ticking = false;
    track.addEventListener('scroll', function () {
      if (wide.matches || ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var x = track.scrollLeft, best = 0;
        if (x >= maxScroll() - 4) best = cards.length - 1;
        else cards.forEach(function (c, k) { if (Math.abs(offsetOf(k) - x) < Math.abs(offsetOf(best) - x)) best = k; });
        if (best !== cur) show(best);
      });
    }, { passive: true });
    wide.addEventListener('change', function () { show(wide.matches ? cur : 0); });

    // /#gradnja, /#proslave or /#boravak opens that card (on the swipe row the browser already scrolls it into view)
    function fromHash() {
      var k = cards.map(function (c) { return '#' + c.id; }).indexOf(location.hash);
      if (k >= 0 && wide.matches) show(k);
    }
    fromHash();
    window.addEventListener('hashchange', fromHash);

    // the cards slide in once, when the section comes into view
    if (!NV.reduceMotion && 'IntersectionObserver' in window) {
      sec.classList.add('occ-anim');
      var seen = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { sec.classList.add('is-in'); seen.disconnect(); }
      }, { rootMargin: '0px 0px -15% 0px' });
      seen.observe(track);
    }
  }

  // "Veliki izbor, domaći pristup." (static in the page HTML): the facts rise in and the article count runs up, once.
  // The big figure is aria-hidden (its description says the same), so the counting is never read out.
  function initFacts() {
    var why = $('#occWhy');
    if (!why || NV.reduceMotion || !('IntersectionObserver' in window)) return;
    var nums = $$('[data-count]', why);
    why.classList.add('occ-why--anim');
    nums.forEach(function (el) { el.textContent = '0'; });
    var seen = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      seen.disconnect();
      why.classList.add('is-in');
      nums.forEach(countUp);
    }, { rootMargin: '0px 0px -15% 0px' });
    seen.observe(why);
  }

  function countUp(el) {
    var end = +el.dataset.count, t0 = null;
    function frame(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / 1600), v = Math.round(end * (1 - Math.pow(1 - p, 4))); // ease-out: fast, then settles
      el.textContent = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, T.thousands); // 100.000 / 100,000 (T)
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  renderOccasions();
  initOccasions();
  initFacts();
})();
