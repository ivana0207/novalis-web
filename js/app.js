/* Novalis landing — behaviour.
   Renders units / stories / map from data/units.js, computes live open/closed status in Europe/Zagreb time,
   and wires up nav dropdowns, mobile menu, filters, story carousel, map hover and the inquiry form. */
(function () {
  'use strict';

  var D = window.NOVALIS_DATA;
  var P = window.NV_PATHS;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var DAYS_ACC = ['ponedjeljak', 'utorak', 'srijedu', 'četvrtak', 'petak', 'subotu', 'nedjelju'];
  var PICTO = { 'hiper-novalis': 'shopping', 'market-novalis': 'bread', 'hiper-bau': 'vijci', 'veleprodaja': 'drinks', 'valis': 'kava', 'pod-zvon': 'restoran', 'hotel-novalis': 'hotel' };
  var NAV_NAME = { 'hotel-novalis': 'B&B Novalis', 'valis': 'Bistro i slastičarnica Valis' };
  var NAV = [
    { id: 'trgovine', label: 'Trgovine', picto: 'cart', ids: ['hiper-novalis', 'hiper-bau', 'market-novalis'] },
    { id: 'smjestaj', label: 'Smještaj', picto: 'suitcase', ids: ['hotel-novalis'] },
    { id: 'gastro', label: 'Gastro', picto: 'cloche', ids: ['valis', 'pod-zvon'] },
    { id: 'veleprodaja', label: 'Veleprodaja', picto: 'boxes', href: '#veleprodaja' }
  ];
  var ARCS = {
    hero: [[1240, 80, 440, .55], [1400, 560, 320, .42], [940, -150, 300, .3], [1060, 480, 210, .28], [260, 760, 360, .16]],
    band: [[1260, -70, 300, .42], [1400, 420, 260, .3], [900, 520, 220, .22]],
    footer: [[1300, 40, 360, .34], [120, 540, 320, .2], [780, 640, 280, .2]]
  };

  var state = { cat: 'all', openOnly: false, drop: null, menu: false, slide: 0, active: null };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------- Brand vectors ---------------- */
  var LOGO_COLORS = { red: 'var(--nv-red)', yellow: 'var(--nv-yellow)', white: '#fff', black: '#000' };

  function logoSVG(variant, color, h, title) {
    var d = P.logos[variant] || P.logos.novalis;
    var key = P.logos[variant] ? variant : 'novalis';
    var label = title || (key === 'novalis' ? 'Novalis' : key.indexOf('hiper') === 0 ? 'Hiper Novalis' : 'Market Novalis');
    var w = +(h * d.w / d.h).toFixed(2);
    return '<svg role="img" aria-label="' + esc(label) + '" viewBox="0 0 ' + d.w + ' ' + d.h + '" width="' + w + '" height="' + h +
      '" style="color:' + (LOGO_COLORS[color] || color) + '">' +
      d.p.map(function (p) { return '<path d="' + p + '" fill="currentColor"/>'; }).join('') + '</svg>';
  }

  function iconSVG(name, size) {
    var d = P.icons[name];
    if (!d) return '';
    var s = size / Math.max(d.w, d.h);
    return '<svg aria-hidden="true" viewBox="0 0 ' + d.w + ' ' + d.h + '" width="' + (d.w * s).toFixed(1) + '" height="' + (d.h * s).toFixed(1) + '">' +
      d.p.map(function (p) { return '<path d="' + p + '" fill="currentColor"/>'; }).join('') + '</svg>';
  }

  function pictoSVG(name, size) {
    var d = P.pictos[name];
    if (!d) return '';
    return '<svg class="picto" aria-hidden="true" viewBox="' + d.vb + '" width="' + size + '" height="' + size +
      '" style="width:' + size + 'px;height:' + size + 'px"><path fill="currentColor" fill-rule="evenodd" d="' + d.d + '"/></svg>';
  }

  function unitIcon(u, size) {
    return P.pictos[u.picto] ? pictoSVG(u.picto, size) : iconSVG(u.picto, size);
  }

  function renderLogos() {
    var mob = window.innerWidth < 700;
    $$('[data-logo]').forEach(function (el) {
      var h = el.dataset.logoH ? +el.dataset.logoH : (mob ? 20 : 24);
      el.innerHTML = logoSVG(el.dataset.logo, el.dataset.logoColor || 'red', h);
    });
  }

  function renderArcs() {
    $$('svg[data-arcs]').forEach(function (svg) {
      var kind = svg.dataset.arcs, gid = 'nvGlow-' + kind;
      svg.setAttribute('viewBox', '0 0 1440 600');
      svg.setAttribute('preserveAspectRatio', 'xMaxYMid slice');
      svg.innerHTML =
        '<defs><radialGradient id="' + gid + '">' +
        '<stop offset="0%" stop-color="#FFC46B" stop-opacity=".85"/>' +
        '<stop offset="55%" stop-color="#F7941E" stop-opacity=".32"/>' +
        '<stop offset="100%" stop-color="#F7941E" stop-opacity="0"/>' +
        '</radialGradient></defs>' +
        ARCS[kind].map(function (a, i) {
          var cx = a[0], cy = a[1], r = a[2], o = a[3];
          var anim = reduceMotion ? 'none' : 'nvDrift' + (i % 3) + ' ' + (48 + i * 14) + 's ease-in-out ' + (-i * 9) + 's infinite alternate';
          return '<g style="transform-box:view-box;transform-origin:' + cx + 'px ' + cy + 'px;animation:' + anim + '">' +
            '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#' + gid + ')" opacity="' + o + '" style="mix-blend-mode:screen"/>' +
            '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * .72) + '" fill="none" stroke="#FFD9A0" stroke-opacity="' + (o * .55) + '" stroke-width="1.5"/>' +
            '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 1.02) + '" fill="none" stroke="#FFE7C2" stroke-opacity="' + (o * .35) + '" stroke-width="1"/>' +
            '</g>';
        }).join('');
    });
  }

  /* ---------------- Image slots ---------------- */
  function placeholderHTML(text) {
    return '<div class="slot__ph"><span class="ms" aria-hidden="true">image</span><span>' + esc(text) + '</span></div>';
  }

  function slotHTML(src, placeholder, alt, bg) {
    var attrs = ' data-placeholder="' + esc(placeholder) + '"' + (bg ? ' style="--bg:' + bg + '"' : '');
    var inner = src ? '<img src="' + esc(src) + '" alt="' + esc(alt || '') + '" loading="lazy">' : placeholderHTML(placeholder);
    return '<div class="slot"' + attrs + '>' + inner + '</div>';
  }

  function initStaticSlots() {
    $$('.slot[data-placeholder]').forEach(function (el) {
      if (el.children.length) return;
      el.innerHTML = el.dataset.src
        ? '<img src="' + esc(el.dataset.src) + '" alt="' + esc(el.dataset.alt || '') + '" loading="lazy">'
        : placeholderHTML(el.dataset.placeholder);
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

  /* ---------------- Opening hours ---------------- */
  var toMin = function (s) { var p = s.split(':'); return (+p[0]) * 60 + (+p[1]); };
  var dm = function (s) { var p = s.split('-'); return (+p[1]) + '. ' + (+p[0]) + '.'; };

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

  function unitStatus(u, season, z) {
    var hrs = u.hours[season], t = hrs[z.day];
    var is24 = !!t && t[0] === '00:00' && t[1] === '24:00';
    var open = !!t && (is24 || (z.min >= toMin(t[0]) && z.min < toMin(t[1])));
    var nextOpen = function () {
      for (var i = 1; i <= 7; i++) {
        var d = (z.day + i) % 7, n = hrs[d];
        if (n) return 'otvara ' + (i === 1 ? 'sutra' : 'u ' + DAYS_ACC[d]) + ' u ' + n[0];
      }
      return 'zatvoreno';
    };
    var text;
    if (open) text = is24 ? 'Otvoreno 0–24 h' : 'Otvoreno · do ' + t[1];
    else if (t && z.min < toMin(t[0])) text = 'Zatvoreno · otvara u ' + t[0];
    else text = 'Zatvoreno · ' + nextOpen();
    var today = !t ? 'Danas zatvoreno' : is24 ? 'Danas 0–24 h' : 'Danas ' + t[0] + '–' + t[1];
    return { open: open, text: text, today: today };
  }

  /* ---------------- View model ---------------- */
  var catLabel = {};
  D.categories.forEach(function (c) { catLabel[c.id] = c.label; });

  function buildUnits() {
    var z = zagrebNow(), season = currentSeason(z);
    var units = D.units.map(function (u, i) {
      var b = u.brand, st = unitStatus(u, season, z);
      return {
        id: u.id, n: i + 1, name: u.name, navName: NAV_NAME[u.id] || u.name, desc: u.desc, address: u.address,
        category: u.category, categoryLabel: catLabel[u.category], picto: PICTO[u.id] || 'pekara',
        photo: u.photo, photoHint: u.photoHint, imgBg: b.topBg === '#FFCB04' ? '#F3EBD2' : '#E9E2D8',
        topBg: b.topBg, topFg: b.topFg, topBar: b.topBar || b.topBg,
        logo: b.logo || null, logoH: b.logo === 'market-horizontal' ? 16 : 17,
        wordmark: b.wordmark || 'VALIS', sub: b.sub || '', serif: u.id === 'valis',
        promo: !!u.promo,
        open: st.open, statusText: st.text,
        statusFg: st.open ? '#3B5A17' : '#575756', dot: st.open ? '#5E8A2A' : '#939597',
        todayText: st.today + (st.open ? ' · otvoreno' : ' · zatvoreno'),
        callHref: 'tel:' + (u.tel || D.company.tel), callLabel: u.phone || 'Nazovi centralu',
        btnBg: b.btnBg, btnFg: b.btnFg, link: b.link,
        moreHref: u.url, external: !!u.external,
        mapsHref: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(u.name + ', ' + u.address.replace(/\[.*?\]/g, '')),
        pinBg: b.pin, pinFg: b.pinFg, pinX: u.pin.x, pinY: u.pin.y
      };
    });
    return { units: units, season: season };
  }

  /* ---------------- Header nav ---------------- */
  function renderNav(units) {
    var byId = {};
    units.forEach(function (u) { byId[u.id] = u; });

    var desk = NAV.map(function (c) {
      if (c.href) {
        return '<div class="nav-item"><a class="nav-link" href="' + c.href + '">' + pictoSVG(c.picto, 22) + esc(c.label) + '</a></div>';
      }
      var open = state.drop === c.id;
      var items = c.ids.map(function (id) {
        var u = byId[id];
        return '<a class="dd-item" href="#' + u.id + '">' +
          '<span class="pin-badge" style="--pin-bg:' + u.pinBg + ';--pin-fg:' + u.pinFg + '">' + unitIcon(u, 26) + '</span>' +
          '<span class="dd-item__text"><span class="dd-item__name">' + esc(u.navName) + '</span>' +
          '<span class="dd-item__status" style="--status-fg:' + u.statusFg + '"><span class="dot" style="--dot:' + u.dot + '"></span>' + esc(u.statusText) + '</span></span></a>';
      }).join('');
      return '<div class="nav-item">' +
        '<button type="button" class="nav-link nav-link--menu" data-drop="' + c.id + '" aria-expanded="' + open + '" aria-controls="dd-' + c.id + '">' +
        pictoSVG(c.picto, 22) + esc(c.label) + '<span class="ms" aria-hidden="true">' + (open ? 'expand_less' : 'expand_more') + '</span></button>' +
        '<div class="dropdown" id="dd-' + c.id + '"' + (open ? '' : ' hidden') + '>' + items + '</div></div>';
    }).join('') +
      '<div class="nav-item"><a class="nav-link" href="#posao">Zaposli se</a></div>' +
      '<div class="nav-item"><a class="nav-link" href="#kontakt">Kontakt</a></div>';
    $('#mainnav').innerHTML = desk;

    var mob = NAV.map(function (c) {
      if (c.href) {
        return '<div class="mm-group"><a class="mm-head" href="' + c.href + '">' + pictoSVG(c.picto, 20) + esc(c.label) +
          '<span class="ms" aria-hidden="true">arrow_forward</span></a></div>';
      }
      return '<div class="mm-group"><div class="mm-head">' + pictoSVG(c.picto, 20) + esc(c.label) + '</div>' +
        c.ids.map(function (id) {
          var u = byId[id];
          return '<a class="mm-item" href="#' + u.id + '">' +
            '<span class="pin-badge" style="--pin-bg:' + u.pinBg + ';--pin-fg:' + u.pinFg + '">' + unitIcon(u, 22) + '</span>' +
            '<span class="mm-item__name">' + esc(u.navName) + '</span>' +
            '<span class="dot" style="--dot:' + u.dot + '" title="' + esc(u.statusText) + '"></span></a>';
        }).join('') + '</div>';
    }).join('') +
      '<div class="mm-extra"><a href="#posao">Zaposli se</a><a href="#kontakt">Kontakt</a></div>';
    $('#mobileMenu').innerHTML = mob;
  }

  function setDrop(id) {
    state.drop = id;
    $$('[data-drop]').forEach(function (btn) {
      var open = btn.dataset.drop === id;
      btn.setAttribute('aria-expanded', open);
      btn.querySelector('.ms').textContent = open ? 'expand_less' : 'expand_more';
      document.getElementById('dd-' + btn.dataset.drop).hidden = !open;
    });
  }

  function setMenu(open) {
    state.menu = open;
    $('#mobileMenu').hidden = !open;
    $('#menuBtn').setAttribute('aria-expanded', open);
    $('#menuBtn .ms').textContent = open ? 'close' : 'menu';
  }

  /* ---------------- Units: filters + cards ---------------- */
  function renderFilters(units) {
    var list = [{ id: 'all', label: 'Sve', count: units.length }].concat(D.categories.map(function (c) {
      return { id: c.id, label: c.label, count: units.filter(function (u) { return u.category === c.id; }).length };
    }));
    $('#filters').innerHTML = list.map(function (f) {
      return '<button type="button" class="chip" data-cat="' + f.id + '" aria-pressed="' + (state.cat === f.id) + '">' +
        esc(f.label) + '<span class="chip__count">' + f.count + '</span></button>';
    }).join('');
    $('#openOnly').setAttribute('aria-pressed', state.openOnly);
  }

  function cardHTML(u) {
    var brand = u.logo
      ? logoSVG(u.logo, u.topFg, u.logoH, u.name)
      : '<span class="card__word' + (u.serif ? ' card__word--serif' : '') + '">' + esc(u.wordmark) + '</span>' +
        (u.sub ? '<span class="card__sub">' + esc(u.sub) + '</span>' : '');
    var moreAria = u.external ? u.name + ' — hotelnovalis.hr (nova kartica)' : 'Više o poslovnici ' + u.name;
    return '<article class="card" id="' + u.id + '" style="--link:' + u.link + ';--btn-bg:' + u.btnBg + ';--btn-fg:' + u.btnFg + '">' +
      '<div class="card__media">' +
        slotHTML(u.photo, u.photoHint, u.name, u.imgBg) +
        '<div class="card__status" style="--status-fg:' + u.statusFg + '"><span class="dot" style="--dot:' + u.dot + '"></span>' + esc(u.statusText) + '</div>' +
        (u.promo ? '<div class="card__promo"></div><span class="card__promo-label">Akcija</span>' : '') +
        '<div class="card__brand" style="--top-bg:' + u.topBg + ';--top-fg:' + u.topFg + ';--top-bar:' + u.topBar + '">' + brand + '</div>' +
      '</div>' +
      '<div class="card__body">' +
        '<span class="card__cat">' + esc(u.categoryLabel) + '</span>' +
        '<h3 class="card__name">' + esc(u.name) + '</h3>' +
        '<p class="card__desc">' + esc(u.desc) + '</p>' +
        '<div class="card__actions">' +
          '<a class="card__call" href="' + u.callHref + '"><span class="ms" aria-hidden="true">call</span>' + esc(u.callLabel) + '</a>' +
          '<a class="card__more" href="' + esc(u.moreHref) + '"' + (u.external ? ' target="_blank" rel="noopener"' : '') +
            ' aria-label="' + esc(moreAria) + '" title="' + esc(moreAria) + '"><span class="ms" aria-hidden="true">' + (u.external ? 'open_in_new' : 'arrow_forward') + '</span></a>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function renderCards(units) {
    var visible = units.filter(function (u) {
      return (state.cat === 'all' || u.category === state.cat) && (!state.openOnly || u.open);
    });
    $('#cards').innerHTML = visible.map(cardHTML).join('');
    $('#noResults').hidden = visible.length > 0;
  }

  /* ---------------- Map ---------------- */
  function renderMap(units) {
    $('#mapPins').innerHTML = units.map(function (u) {
      return '<a class="pin' + (state.active === u.id ? ' is-active' : '') + '" href="#' + u.id + '" aria-label="' + esc(u.name) + '" data-id="' + u.id + '"' +
        ' style="--x:' + u.pinX + ';--y:' + u.pinY + ';--pin-bg:' + u.pinBg + ';--pin-fg:' + u.pinFg + '">' +
        '<span class="pin__head"><span class="pin__n">' + u.n + '</span></span></a>';
    }).join('');

    $('#locList').innerHTML = units.map(function (u) {
      return '<li class="loc' + (state.active === u.id ? ' is-active' : '') + '" data-id="' + u.id + '"' +
        ' style="--pin-bg:' + u.pinBg + ';--pin-fg:' + u.pinFg + ';--status-fg:' + u.statusFg + ';--btn-bg:' + u.btnBg + ';--btn-fg:' + u.btnFg + '">' +
        '<span class="loc__n">' + u.n + '</span>' +
        '<div class="loc__text">' +
          '<span class="loc__name">' + esc(u.name) + '</span>' +
          '<span class="loc__addr">' + esc(u.address) + '</span>' +
          '<span class="loc__today"><span class="dot" style="--dot:' + u.dot + '"></span>' + esc(u.todayText) + '</span>' +
        '</div>' +
        '<a class="loc__btn" href="' + u.mapsHref + '" target="_blank" rel="noopener" aria-label="Upute do ' + esc(u.name) + '" title="Upute"><span class="ms" aria-hidden="true">directions</span></a>' +
        '<a class="loc__btn loc__btn--call" href="' + u.callHref + '" aria-label="Nazovi ' + esc(u.name) + '" title="Nazovi"><span class="ms" aria-hidden="true">call</span></a>' +
      '</li>';
    }).join('');
  }

  function setActive(id) {
    state.active = id;
    $$('.pin, .loc').forEach(function (el) { el.classList.toggle('is-active', el.dataset.id === id); });
  }

  /* ---------------- Stories carousel ---------------- */
  function renderStories() {
    var byId = {};
    D.units.forEach(function (u) { byId[u.id] = u; });
    var n = D.stories.length;

    $('#storyTabs').innerHTML = D.stories.map(function (s, i) {
      return '<button type="button" role="tab" class="story-tab" data-i="' + i + '" aria-selected="' + (i === 0) + '">' +
        '<span class="story-tab__n">' + (i + 1) + '</span>' + esc(s.tab) + '</button>';
    }).join('');

    $('#storyTrack').innerHTML = D.stories.map(function (s, si) {
      var counter = (si + 1) + ' / ' + n;
      var steps = s.steps.map(function (st, k) {
        var u = byId[st.unit] || null, b = u ? u.brand : {};
        var unitName = st.label || (u && u.name) || 'Novalis';
        var href = st.href || '#' + (u ? u.id : 'poslovnice');
        return '<li class="step" style="--s-bg:' + (b.btnBg || '#D61920') + ';--s-fg:' + (b.btnFg || '#fff') + ';--s-link:' + (b.link || '#D61920') + '">' +
          '<div class="step__rail"><span class="step__n">' + (k + 1) + '</span><span class="step__line"></span></div>' +
          '<a class="step__link" href="' + href + '"><span class="step__text"><span class="step__t">' + esc(st.text) + '</span>' +
          '<span class="step__unit">' + esc(unitName) + '</span></span><span class="step__go ms" aria-hidden="true">arrow_forward</span></a></li>';
      }).join('');
      return '<article class="slide" aria-roledescription="slide" aria-label="' + counter + '"><div class="slide__box">' +
        '<div class="slide__img">' + slotHTML(null, s.photo) + '<div class="slide__scrim" aria-hidden="true"></div>' +
          '<div class="slide__mob-title"><span class="slide__counter">' + counter + '</span><h3>' + esc(s.title) + '</h3></div></div>' +
        '<p class="slide__mob-desc">' + esc(s.desc) + '</p>' +
        '<div class="slide__copy"><span class="slide__counter">' + counter + '</span><h3>' + esc(s.title) + '</h3><p>' + esc(s.desc) + '</p></div>' +
        '<div class="slide__panel"><span class="eyebrow"><span class="sq"></span>Korak po korak</span><ol class="steps">' + steps + '</ol></div>' +
      '</div></article>';
    }).join('');
    syncSlide(0);
  }

  function syncSlide(i) {
    state.slide = i;
    var n = D.stories.length;
    $$('.story-tab').forEach(function (t, k) { t.setAttribute('aria-selected', k === i); });
    $('#prevSlide').setAttribute('aria-disabled', i === 0);
    $('#nextSlide').setAttribute('aria-disabled', i >= n - 1);
  }

  function goToSlide(i) {
    var t = $('#storyTrack'), n = D.stories.length;
    i = Math.max(0, Math.min(n - 1, i));
    t.scrollTo({ left: i * t.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
    syncSlide(i);
  }

  /* ---------------- Render loop ---------------- */
  function render() {
    var vm = buildUnits(), units = vm.units;
    var openCount = units.filter(function (u) { return u.open; }).length;
    var s = D.seasons.summer;

    $('#heroStatus').textContent = 'Trenutno otvoreno ' + openCount + ' od ' + units.length + ' poslovnica';
    $('#seasonIcon').textContent = vm.season === 'summer' ? 'sunny' : 'ac_unit';
    $('#seasonLabel').textContent = vm.season === 'summer' ? 'Ljetno radno vrijeme · do ' + dm(s.end) : 'Zimsko radno vrijeme · do ' + dm(s.start);
    $('#todayLine').textContent = 'Danas je otvoreno ' + openCount + ' od ' + units.length + ' poslovnica.';

    renderNav(units);
    renderFilters(units);
    renderCards(units);
    renderMap(units);
    return units;
  }

  /* ---------------- Events ---------------- */
  function bind() {
    // desktop dropdowns
    $('#mainnav').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-drop]');
      if (btn) { setDrop(state.drop === btn.dataset.drop ? null : btn.dataset.drop); return; }
      if (e.target.closest('.dd-item')) setDrop(null);
    });
    document.addEventListener('click', function (e) {
      if (state.drop && !e.target.closest('#mainnav')) setDrop(null);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { setDrop(null); setMenu(false); }
    });

    // mobile menu
    $('#menuBtn').addEventListener('click', function () { setMenu(!state.menu); });
    $('#mobileMenu').addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    window.matchMedia('(min-width: 1000px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });

    // language switch (visual only — content is Croatian until translations exist)
    $$('[data-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lang === btn.dataset.lang); });
      });
    });

    // hero CTA
    $('#scrollToCards').addEventListener('click', function () {
      var el = $('#poslovnice');
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    // filters
    $('#filters').addEventListener('click', function (e) {
      var chip = e.target.closest('[data-cat]');
      if (!chip) return;
      state.cat = chip.dataset.cat;
      render();
    });
    $('#openOnly').addEventListener('click', function () { state.openOnly = !state.openOnly; render(); });
    $('#resetFilters').addEventListener('click', function () { state.cat = 'all'; state.openOnly = false; render(); });

    // links to a unit card that is currently filtered out: clear filters first
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      var isUnit = D.units.some(function (u) { return u.id === id; });
      if (isUnit && !document.getElementById(id)) {
        e.preventDefault();
        state.cat = 'all'; state.openOnly = false; render();
        var el = document.getElementById(id);
        if (el) { el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); history.replaceState(null, '', '#' + id); }
      }
    });

    // stories
    $('#storyTabs').addEventListener('click', function (e) {
      var t = e.target.closest('[data-i]');
      if (t) goToSlide(+t.dataset.i);
    });
    $('#prevSlide').addEventListener('click', function () { goToSlide(state.slide - 1); });
    $('#nextSlide').addEventListener('click', function () { goToSlide(state.slide + 1); });
    $('#storyTrack').addEventListener('scroll', function () {
      var t = this, i = Math.round(t.scrollLeft / Math.max(1, t.clientWidth));
      if (i !== state.slide) syncSlide(i);
    }, { passive: true });
    window.addEventListener('resize', function () {
      var t = $('#storyTrack');
      t.scrollLeft = state.slide * t.clientWidth;
    });

    // map ↔ list hover
    ['#mapPins', '#locList'].forEach(function (sel) {
      var root = $(sel);
      root.addEventListener('mouseover', function (e) {
        var el = e.target.closest('[data-id]');
        if (el && el.dataset.id !== state.active) setActive(el.dataset.id);
      });
      root.addEventListener('mouseleave', function () { setActive(null); });
    });

    // inquiry form (front-end only until a backend endpoint exists)
    $('#inquiryForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = this.elements.email.value.trim();
      $('#sentEmail').textContent = email || 'Vaš email';
      this.hidden = true;
      $('#formSent').hidden = false;
    });

    // header logo height follows the mobile breakpoint
    window.matchMedia('(max-width: 699px)').addEventListener('change', renderLogos);
  }

  /* ---------------- Init ---------------- */
  function init() {
    var year = new Date().getFullYear();
    $('#years').textContent = year - D.company.founded;
    $('#year').textContent = year;

    renderLogos();
    renderArcs();
    initStaticSlots();
    renderStories();
    render();
    bind();

    // keep open/closed status live
    setInterval(render, 60000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
