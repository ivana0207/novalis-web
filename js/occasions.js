/* "Zašto Novalis" band (#prilike) — shared by the landing page and O nama, on top of js/site.js.
   Renders the "Novalis za svaku priliku" cards from data/units.js, runs their carousel, and animates the static
   "Veliki izbor, domaći pristup." facts. Loaded before the page script, so /#gradnja, /#proslave and /#boravak
   have their targets. */
(function () {
  'use strict';

  var NV = window.NV, D = NV.D, $ = NV.$, $$ = NV.$$, esc = NV.esc, setHTML = NV.setHTML;
  if (!$('#occasions')) return;

  // Outline icons for this section only (24 grid, drawn in currentColor; the DS pictograms in brand-paths.js are solid).
  var OCC_ICON = {
    gradnja: '<path d="M2.5 11 12 3l9.5 8"/><path d="M5 9.5V20h12a2 2 0 0 0 2-2V9.5"/><path d="m13.11 9.71 3.68 3.68-1.7 1.7-3.68-3.68Z"/><path d="M13.25 13.25 8.5 18"/>',
    proslave: '<path d="M3 20.5h18"/><path d="M4.5 20.5V15A1.5 1.5 0 0 1 6 13.5h12a1.5 1.5 0 0 1 1.5 1.5v5.5"/><path d="M7.5 13.5V11A1.5 1.5 0 0 1 9 9.5h6a1.5 1.5 0 0 1 1.5 1.5v2.5"/><path d="M4.5 16.6c1.25 1.2 2.5 1.2 3.75 0s2.5-1.2 3.75 0 2.5 1.2 3.75 0 2.5-1.2 3.75 0"/><path d="M12 9.5V7"/><path d="M12 3.3c.9.8 1.1 1.7.6 2.3a.8.8 0 0 1-1.2 0c-.5-.6-.3-1.5.6-2.3Z"/>',
    boravak: '<circle cx="8" cy="8" r="4.75"/><circle cx="8" cy="8" r="1.1"/><path d="M11.36 11.36 20.5 20.5"/><path d="m15.9 15.9-2.1 2.1m4.7.5-2.1 2.1"/>',
    go: '<path d="M4 12h15M13 6l6 6-6 6"/>',                                                    // store page or own website
    plus: '<path d="M12 5v14M5 12h14"/>'                                                         // closed card (desktop)
  };
  function icoSVG(name, cls) {
    return '<svg class="occ-ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (OCC_ICON[name] || '') + '</svg>';
  }

  // A step: number, then what you need as the main line and under it the unit that has it, as a link
  // (name, arrow; a unit's own website opens in a new tab and says so to screen readers).
  function occStepHTML(st, k) {
    var u = NV.byId[st.unit], ext = !!u.external;
    return '<li class="occ-step" style="--k:' + k + '"><span class="occ-step__n" aria-hidden="true">' + (k + 1) + '</span><div class="occ-step__body">' +
      '<p class="occ-step__need">' + esc(st.text) + '</p>' +
      '<a class="occ-step__link" href="' + esc(NV.unitHref(u)) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' +
        '<span class="occ-step__name" translate="no">' + esc(st.label || u.name) + '</span>' +
        icoSVG('go', 'occ-step__go occ-step__go--in') + (ext ? NV.NEW_TAB : '') +
      '</a></div></li>';
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
      '<div class="occ-card__media" aria-hidden="true">' + NV.slotHTML(NV.asset(o.photo), o.photoHint || '', '') + '</div>' +
      '<span class="occ-card__plus" aria-hidden="true">' + icoSVG('plus') + '</span>' +
      '<div class="occ-card__body">' +
        '<span class="occ-card__icon">' + icoSVG(o.icon) + '</span>' +
        '<h3 class="occ-card__h" id="h-' + esc(o.id) + '">' + esc(o.title) + '</h3>' +
        '<div class="occ-card__more"><div class="occ-card__more-in">' +
          '<p class="occ-card__desc">' + esc(o.desc) + '</p>' +
          // role="list": Safari drops list semantics from lists styled with list-style: none
          '<ol class="occ-steps" role="list">' + steps.map(occStepHTML).join('') + '</ol>' +
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
      $('#occLive').textContent = $('.occ-card__h', cards[i]).textContent + ', ' + (i + 1) + ' od ' + n;
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

    // /#proslave opens that card (on the swipe row the browser already scrolls it into view)
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
      el.textContent = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // Croatian grouping: 100.000
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  renderOccasions();
  initOccasions();
  initFacts();
})();
