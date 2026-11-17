/* Novalis site — the seasonal catalogue page, katalog/ and en/catalogue/ (WEB-48), from data/units.js catalogues on top
   of js/site.js. The running catalogue (NV.catalogue: the first whose dates hold today in Novalja) reads like a printed
   leaflet: a red cover under a fir garland (its headline a gift tag), then one "page" per section (red: big yellow prices
   on the page, one product double size; green: the garland over a white page with red price boxes), then the holiday
   opening hours, worked out from each unit's hours (NV.dayHours) like everywhere else. Snow falls over the whole screen
   while the page is open (a fixed layer that never takes a click; none with reduced motion). Outside every catalogue's
   dates the page says a new offer is coming. */
(function () {
  'use strict';

  var NV = window.NV, $ = NV.$, esc = NV.esc, tx = NV.tx, asset = NV.asset;

  var TEXTS = {
    hr: {
      crumbs: 'Putanja', home: 'Početna', here: 'Katalog', jump: 'U katalogu', browse: 'Pogledajte katalog', unit: 'Poslovnica', closed: 'Zatvoreno',
      noneEyebrow: 'Katalog', none: 'Novi katalog stiže uskoro', noneLead: 'Trenutno nema aktualnog kataloga. Do tada vas čekamo u našim poslovnicama.',
      toHome: 'Na početnu',
      wd: ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'],
      date: function (d, m) { return d + '. ' + m + '.'; }
    },
    en: {
      crumbs: 'Breadcrumb', home: 'Home', here: 'Catalogue', jump: 'In this catalogue', browse: 'See the catalogue', unit: 'Shop', closed: 'Closed',
      noneEyebrow: 'Catalogue', none: 'A new catalogue is coming soon', noneLead: 'There is no current catalogue right now. Until then, we look forward to seeing you in our shops.',
      toHome: 'Go to the home page',
      wd: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      date: function (d, m) { return d + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]; }
    }
  };
  var T = TEXTS[NV.LANG] || TEXTS.hr;
  var main = $('#katalog'), c = NV.catalogue();
  var CLOCK = '<svg class="xm-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  var STAR = '<svg class="xm-star" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 1.5l3 6.6 7.2.7-5.4 4.8 1.6 7.1L12 17l-6.4 3.7 1.6-7.1L1.8 8.8 9 8.1z"/></svg>';

  function crumbsHTML() {
    return '<nav class="xm-crumbs" aria-label="' + T.crumbs + '"><a href="' + esc(NV.pageHref('')) + '">' + T.home + '</a>' +
      '<span aria-hidden="true">/</span><span aria-current="page">' + T.here + '</span></nav>';
  }

  /* ---------------- No catalogue running ---------------- */
  if (!c) {
    main.innerHTML = '<section class="xm-none" aria-labelledby="h-katalog"><div class="xm-wrap xm-none__inner">' + crumbsHTML() +
      '<p class="eyebrow">' + T.noneEyebrow + '</p><h1 class="legal__h1" id="h-katalog">' + T.none + '</h1>' +
      '<p class="xm-none__lead">' + T.noneLead + '</p>' +
      '<a class="btn btn--primary" href="' + esc(NV.pageHref('')) + '">' + T.toHome + '</a></div></section>';
    main.classList.add('is-ready');
    return;
  }

  /* ---------------- Cover ---------------- */
  var P = c.products;
  function tileHTML(id) {
    var p = P[id];
    return '<div class="xm-tile"><img src="' + esc(asset(p.photo)) + '" alt="" decoding="async">' +
      '<span class="xm-tile__name">' + esc(tx(p, 'name')) + '</span>' + (typeof p.price === 'number' ? NV.priceHTML(p, 'xm-tile__price') : '') + '</div>';
  }
  function coverHTML() {
    var cv = c.cover;
    return '<section class="xm-cover" aria-labelledby="h-katalog"><div class="xm-garland" aria-hidden="true"></div>' +
      '<div class="xm-wrap xm-cover__inner">' +
        '<div class="xm-cover__copy">' + crumbsHTML() +
          '<p class="xm-chip">' + esc(tx(cv, 'chip')) + '</p>' +
          '<h1 class="xm-gift' + (tx(cv, 'title').length > 7 ? ' xm-gift--long' : '') + '" id="h-katalog"><span class="xm-gift__s">' + esc(tx(cv, 'script')) + '</span> <span class="xm-gift__b">' + esc(tx(cv, 'title')) + '</span></h1>' +
          '<p class="xm-cover__lead">' + esc(tx(cv, 'lead')) + '</p>' +
          '<nav class="xm-jump" aria-label="' + T.jump + '">' +
            '<a class="xm-jump__y" href="#' + esc(c.sections[0].id) + '">' + T.browse + '</a>' +
            '<a href="#radno-vrijeme">' + CLOCK + esc(tx(cv, 'hoursChip')) + '</a>' +
          '</nav>' +
        '</div>' +
        '<div class="xm-collage">' + cv.picks.map(tileHTML).join('') + '</div>' +
      '</div>' +
    '</section>';
  }

  /* ---------------- Sections ---------------- */
  function promoHTML(pr) {
    return '<div class="xm-promo"><p class="xm-promo__big">' + pr.big.map(esc).join('<br>') + '</p>' +
      '<div><p class="xm-promo__t">' + esc(pr.title) + '</p><p class="xm-promo__p">' + esc(pr.text) + '</p></div></div>';
  }
  function sectionHTML(s) {
    var red = s.look === 'red', id = 'h-' + s.id, promo = tx(s, 'promo');
    var head = (red && tx(s, 'dates') ? '<p class="xm-page__tab">' + esc(tx(s, 'dates')) + '</p>' : '') +
      '<div class="xm-page__head">' +
        '<p class="xm-script xm-page__script">' + esc(tx(s, 'script')) + '</p>' +
        '<h2 class="xm-page__h" id="' + id + '">' + esc(tx(s, 'title')) + '</h2>' +
        '<p class="xm-page__line">' + esc(tx(s, 'line')) + '</p>' +
      '</div>';
    var photo = '<figure class="xm-photo' + (red ? ' xm-photo--strip' : '') + '"><img src="' + esc(asset(s.photo)) + '" alt="' + esc(tx(s, 'photoAlt')) + '" loading="lazy" decoding="async">' +
      (tx(s, 'photoTag') ? '<span class="xm-tag">' + esc(tx(s, 'photoTag')) + '</span>' : '') + '</figure>';
    var items = (s.big ? '<li class="xm-grid__big">' + NV.productHTML(P[s.big], true) + '</li>' : '') +
      s.items.map(function (k) { return '<li>' + NV.productHTML(P[k]) + '</li>'; }).join('') +
      (promo ? '<li class="xm-grid__promo">' + promoHTML(promo) + '</li>' : '');
    if (red) {
      return '<section class="xm-sec" id="' + esc(s.id) + '" aria-labelledby="' + id + '"><div class="xm-page xm-page--red">' +
        STAR.replace('xm-star', 'xm-star xm-star--1') + STAR.replace('xm-star', 'xm-star xm-star--2') + STAR.replace('xm-star', 'xm-star xm-star--3') +
        head + photo + '<ul class="xm-grid" role="list">' + items + '</ul>' +
        '<p class="xm-fine">' + esc(tx(s, 'fine')) + '</p></div></section>';
    }
    return '<section class="xm-sec" id="' + esc(s.id) + '" aria-labelledby="' + id + '"><div class="xm-page xm-page--light">' +
      '<div class="xm-page__band"><div class="xm-garland" aria-hidden="true"></div>' + head + '</div>' +
      '<ul class="xm-grid" role="list"><li class="xm-grid__photo">' + photo + '</li>' + items + '</ul></div>' +
      '<p class="xm-fine">' + esc(tx(s, 'fine')) + '</p></section>';
  }

  /* ---------------- Holiday opening hours ---------------- */
  // every unit on each of the days (data order of categories, as everywhere); a unit closed on all of them for its
  // open period (B&B Novalis in winter) is left out
  function hoursHTML() {
    var h = c.hours, days = h.days.map(function (d) { return { day: NV.dayOf(d[0]), name: NV.LANG === 'hr' ? d[1] : d[2] }; });
    var units = NV.units.filter(function (u) {
      return !(u.openPeriod && days.every(function (d) { return !NV.dayHours(u, d.day).t; }));
    });
    function cell(u, d) {
      var t = NV.dayHours(u, d.day).t;
      if (!t) return '<td class="is-closed">' + T.closed + '</td>';
      return '<td>' + (NV.is24h(t) ? '0 - 24 h' : esc(t[0] + ' - ' + t[1])) + '</td>';
    }
    return '<section class="xm-sec xm-hours" id="radno-vrijeme" aria-labelledby="h-rv">' +
      '<h2 class="h2" id="h-rv">' + esc(tx(h, 'title')) + '</h2><p class="xm-hours__lead">' + esc(tx(h, 'lead')) + '</p>' +
      '<div class="xm-hours__box"><div class="xm-hours__wrap" tabindex="0" role="region" aria-labelledby="h-rv"><table class="xm-hours__t">' +
        '<thead><tr><th scope="col">' + T.unit + '</th>' + days.map(function (d) {
          return '<th scope="col"><span class="xm-hours__d">' + T.wd[d.day.day] + ' ' + T.date(+d.day.iso.slice(8, 10), +d.day.iso.slice(5, 7)) + '</span>' +
            '<span class="xm-hours__n">' + esc(d.name) + '</span></th>';
        }).join('') + '</tr></thead>' +
        '<tbody>' + units.map(function (u) {
          return '<tr><th scope="row"><a href="' + esc(NV.unitHref(u)) + '" translate="no">' + esc(tx(u, 'name')) + '</a></th>' +
            days.map(function (d) { return cell(u, d); }).join('') + '</tr>';
        }).join('') + '</tbody>' +
      '</table></div></div><div class="xm-hours__bar" aria-hidden="true" hidden><span class="xm-hours__thumb"></span></div></section>';
  }

  // The table scrolls sideways on narrow screens, where phones and macOS hide their scroll bars: a bar of our own under
  // it (drag it or tap the track) and a fade on the cut edge show there is more. Both only while the table overflows;
  // the keyboard scrolls the focused table itself, so the bar is hidden from assistive tech.
  function hoursBar() {
    var box = $('.xm-hours__box', main), wrap = $('.xm-hours__wrap', main), bar = $('.xm-hours__bar', main), thumb = bar.firstChild;
    function max() { return wrap.scrollWidth - wrap.clientWidth; }
    function update() {
      var m = max(), over = m > 1;
      bar.hidden = !over;
      box.classList.toggle('is-more', over && wrap.scrollLeft < m - 1);
      box.classList.toggle('is-less', over && wrap.scrollLeft > 1);
      if (!over) return;
      var w = bar.clientWidth, tw = Math.max(48, w * wrap.clientWidth / wrap.scrollWidth);
      thumb.style.width = tw + 'px';
      thumb.style.transform = 'translateX(' + ((w - tw) * wrap.scrollLeft / m) + 'px)';
    }
    bar.addEventListener('pointerdown', function (e) {
      if (e.button) return;
      var r = bar.getBoundingClientRect(), tw = thumb.offsetWidth, k = max() / Math.max(1, r.width - tw);
      if (e.target !== thumb) wrap.scrollLeft = (e.clientX - r.left - tw / 2) * k; // a tap on the track brings the thumb there
      var x0 = e.clientX, s0 = wrap.scrollLeft;
      function move(ev) { wrap.scrollLeft = s0 + (ev.clientX - x0) * k; }
      function end() {
        bar.classList.remove('is-drag');
        bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', end); bar.removeEventListener('pointercancel', end);
      }
      bar.setPointerCapture(e.pointerId);
      bar.classList.add('is-drag');
      bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', end); bar.addEventListener('pointercancel', end);
      e.preventDefault();
    });
    wrap.addEventListener('scroll', update, { passive: true });
    if (window.ResizeObserver) { var ro = new ResizeObserver(update); ro.observe(wrap); ro.observe(wrap.firstChild); }
    else window.addEventListener('resize', update);
    if (document.fonts) document.fonts.ready.then(update);
    update();
  }

  main.innerHTML = coverHTML() + '<div class="xm-wrap xm-body">' + c.sections.map(sectionHTML).join('') + hoursHTML() + '</div>';
  main.classList.add('is-ready');
  hoursBar();
  document.body.insertAdjacentHTML('beforeend', NV.snowHTML(140, 'snow--screen'));

  // At the top of the page the cover's garland reaches up over the header's lower edge (css: body.xm-top); from the
  // first pixel scrolled it slides under the header with the rest of the page.
  var atTop = null;
  function topState() {
    var t = window.scrollY < 1;
    if (t !== atTop) { atTop = t; document.body.classList.toggle('xm-top', t); }
  }
  window.addEventListener('scroll', topState, { passive: true });
  topState();
})();
