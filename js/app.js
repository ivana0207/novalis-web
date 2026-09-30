/* Novalis landing (design v4) — page behaviour on top of js/site.js.
   Renders unit cards, map and location list, computes live open/closed status in Europe/Zagreb time,
   and wires up filters, the map/list toggle and the inquiry form. */
(function () {
  'use strict';

  var NV = window.NV, D = NV.D, $ = NV.$, $$ = NV.$$, esc = NV.esc, setHTML = NV.setHTML;

  var DAYS_ACC = ['ponedjeljak', 'utorak', 'srijedu', 'četvrtak', 'petak', 'subotu', 'nedjelju'];
  var catLabel = {};
  D.categories.forEach(function (c) { catLabel[c.id] = c.label; });

  var urlCat = new URLSearchParams(location.search).get('kategorija');
  var state = { cat: NV.CAT_IDS.indexOf(urlCat) >= 0 ? urlCat : 'all', openOnly: false, view: 'map', sel: null, hov: null };
  var units = []; // view models, rebuilt every render()

  function unitById(id) {
    return units.find(function (u) { return u.id === id; }) || null;
  }

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
    var today = !t ? 'Danas zatvoreno' : is24 ? 'Danas 0–24 h' : 'Danas ' + t[0] + '–' + t[1];
    var text;
    if (reception) text = 'Recepcija 0–24 h';
    else if (open) text = is24 ? 'Otvoreno 0–24 h' : 'Otvoreno do ' + t[1];
    else text = 'Zatvoreno · ' + (t ? today : nextOpen(hrs, z.day));
    return {
      open: open, text: text, today: today, hasToday: !reception,
      label: reception ? 'Recepcija 0–24 h' : open ? 'Otvoreno sada' : 'Zatvoreno'
    };
  }

  /* ---------------- View model ---------------- */
  function buildUnits() {
    var z = zagrebNow(), season = currentSeason(z);
    return {
      season: season,
      units: NV.units.map(function (u, i) {
        var st = unitStatus(u, season, z);
        return {
          id: u.id, n: i + 1, nPad: (i < 9 ? '0' : '') + (i + 1), name: u.name, desc: u.desc, address: u.address,
          category: u.category, categoryLabel: catLabel[u.category],
          photo: u.photo, photoHint: u.photoHint, promo: !!u.promo,
          open: st.open, statusText: st.text, label: st.label, today: st.today, hasToday: st.hasToday,
          callHref: 'tel:' + (u.tel || D.company.tel), callLabel: u.phone || D.company.phone,
          moreHref: u.url || '#' + u.id, external: !!u.external,
          mapsHref: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(u.name + ', ' + u.address),
          x: u.pin.x, y: u.pin.y
        };
      })
    };
  }

  function statusHTML(cls, open, text) {
    return '<span class="status ' + cls + (open ? ' is-open' : '') + '"><span class="dot"></span>' + esc(text) + '</span>';
  }

  /* ---------------- Filters + cards ---------------- */
  function renderFilters() {
    var list = [{ id: 'all', label: 'Sve' }].concat(D.categories);
    setHTML($('#filters'), list.map(function (f) {
      var count = f.id === 'all' ? units.length : units.filter(function (u) { return u.category === f.id; }).length;
      return '<button type="button" class="tab" data-cat="' + f.id + '" aria-pressed="' + (state.cat === f.id) + '">' +
        esc(f.label) + '<span class="tab__count">' + count + '</span></button>';
    }).join(''));
    $('#openOnly').setAttribute('aria-pressed', state.openOnly);
  }

  function cardHTML(u) {
    var moreAria = u.external ? u.name + ' - web stranica (nova kartica)' : 'Više o poslovnici ' + u.name;
    return '<article class="card" id="' + u.id + '">' +
      '<div class="card__media">' + NV.slotHTML(u.photo, u.photoHint, u.name) +
        (u.promo ? '<span class="card__promo">Akcija</span>' : '') + '</div>' +
      '<div class="card__body">' +
        '<span class="card__cat">' + esc(u.categoryLabel) + '</span>' +
        '<h3 class="card__name">' + esc(u.name) + '</h3>' +
        '<p class="card__desc">' + esc(u.desc) + '</p>' +
        statusHTML('card__status', u.open, u.statusText) +
      '</div>' +
      '<div class="card__foot">' +
        '<a class="card__call" href="' + esc(u.callHref) + '"><span class="ms ms--xs" aria-hidden="true">call</span>' + esc(u.callLabel) + '</a>' +
        '<a class="card__more" href="' + esc(u.moreHref) + '"' + (u.external ? ' target="_blank" rel="noopener"' : '') +
          ' aria-label="' + esc(moreAria) + '">Više<span class="ms ms--xs" aria-hidden="true">arrow_forward</span></a>' +
      '</div>' +
    '</article>';
  }

  function renderCards() {
    var visible = units.filter(function (u) {
      return (state.cat === 'all' || u.category === state.cat) && (!state.openOnly || u.open);
    });
    setHTML($('#cards'), visible.map(cardHTML).join(''));
    $('#noResults').hidden = visible.length > 0;
  }

  function goCat(id) {
    state.cat = id; state.openOnly = false;
    NV.setDrop(false); NV.setMenu(false);
    renderFilters(); renderCards();
    NV.scrollToY($('#poslovnice').getBoundingClientRect().top + window.scrollY - NV.headerOffset());
  }

  /* ---------------- Map + list ---------------- */
  function renderPins() {
    $('#mapPins').innerHTML = units.map(function (u) {
      return '<button type="button" class="pin" data-id="' + u.id + '" aria-label="' + u.n + '. ' + esc(u.name) + '" aria-pressed="false"' +
        ' style="--x:' + u.x + ';--y:' + u.y + '"><span class="pin__head"><span class="pin__n">' + u.n + '</span></span></button>';
    }).join('');
  }

  // Hovering/focusing a pin previews its card on top of the selected one; clicking selects it.
  function renderMapCard() {
    var previewId = state.hov && state.hov !== state.sel ? state.hov : null;
    var u = unitById(previewId || state.sel);
    if (!u) { setHTML($('#mapCard'), ''); return; }
    setHTML($('#mapCard'),
      '<div class="map-card map-card--' + (u.x <= 50 ? 'l' : 'r') + (previewId ? ' is-preview" aria-hidden="true"' : '" role="dialog"') +
        ' aria-label="' + esc(u.name) + '" style="--x:' + u.x + ';--y:' + u.y + '">' +
        '<div class="map-card__img">' + NV.slotHTML(u.photo, u.photoHint, u.name) +
          '<span class="map-card__n">' + u.nPad + '</span>' +
          '<button type="button" class="map-card__close" aria-label="Zatvori"><span class="ms ms--xs" aria-hidden="true">close</span></button>' +
        '</div>' +
        '<div class="map-card__body">' +
          '<div class="map-card__title"><span class="map-card__name">' + esc(u.name) + '</span>' +
            '<span class="map-card__addr">' + esc(u.address) + '</span></div>' +
          '<div class="map-card__foot">' +
            '<div class="map-card__state">' + statusHTML('map-card__label', u.open, u.label) +
              (u.hasToday ? '<span class="map-card__today">' + esc(u.today) + '</span>' : '') + '</div>' +
            '<div class="map-card__actions">' +
              '<a class="round" href="' + esc(u.mapsHref) + '" target="_blank" rel="noopener" aria-label="Upute do ' + esc(u.name) + '" title="Upute">' +
                '<span class="ms ms--sm" aria-hidden="true">directions</span></a>' +
              '<a class="round round--call" href="' + esc(u.callHref) + '" aria-label="Nazovi ' + esc(u.name) + '" title="Nazovi">' +
                '<span class="ms ms--sm" aria-hidden="true">call</span></a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>');
  }

  function syncMap() {
    $$('.pin').forEach(function (p) {
      var id = p.dataset.id;
      p.classList.toggle('is-active', id === state.sel || id === state.hov);
      p.setAttribute('aria-pressed', id === state.sel);
    });
    renderMapCard();
  }

  function renderList() {
    setHTML($('#locList'), units.map(function (u) {
      return '<li class="loc">' +
        '<span class="loc__n">' + u.n + '</span>' +
        '<div class="loc__main"><span class="loc__name">' + esc(u.name) + '</span><span class="loc__addr">' + esc(u.address) + '</span></div>' +
        '<div class="loc__state">' + statusHTML('loc__label', u.open, u.label) +
          (u.hasToday ? '<span class="loc__today">' + esc(u.today) + '</span>' : '') + '</div>' +
        '<div class="loc__actions">' +
          '<a class="btn-sm" href="' + esc(u.mapsHref) + '" target="_blank" rel="noopener" aria-label="Upute do ' + esc(u.name) + '">' +
            '<span class="ms ms--sm" aria-hidden="true">directions</span>Upute</a>' +
          '<a class="btn-sm btn-sm--call" href="' + esc(u.callHref) + '" aria-label="Nazovi ' + esc(u.name) + '">' +
            '<span class="ms ms--sm" aria-hidden="true">call</span>Nazovi</a>' +
        '</div>' +
      '</li>';
    }).join(''));
  }

  function setView(view) {
    state.view = view;
    if (view === 'list') { state.sel = null; state.hov = null; syncMap(); }
    $('#map').hidden = view !== 'map';
    $('#locList').hidden = view !== 'list';
    $$('.seg__btn').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.view === view); });
  }

  /* ---------------- Render loop ---------------- */
  function render() {
    var vm = buildUnits(), s = D.seasons.summer;
    units = vm.units;
    var openCount = units.filter(function (u) { return u.open; }).length;

    $('#seasonIcon').textContent = vm.season === 'summer' ? 'sunny' : 'ac_unit';
    $('#seasonLabel').textContent = vm.season === 'summer' ? 'Ljetno radno vrijeme · do ' + dm(s.end) : 'Zimsko radno vrijeme · do ' + dm(s.start);
    $('#openStatus').textContent = 'Trenutno otvoreno ' + openCount + ' od ' + units.length + ' poslovnica';

    renderFilters();
    renderCards();
    renderMapCard();
    renderList();
  }

  /* ---------------- Events ---------------- */
  function bind() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && (state.sel || state.hov)) { state.sel = null; state.hov = null; syncMap(); }
    });

    // hero CTA → "Pronađite nas"
    $('#toLocations').addEventListener('click', function () {
      NV.scrollToY($('#locHead').getBoundingClientRect().top + window.scrollY - NV.headerOffset() - 32);
    });

    // filters
    $('#filters').addEventListener('click', function (e) {
      var tab = e.target.closest('[data-cat]');
      if (!tab) return;
      state.cat = tab.dataset.cat;
      renderFilters(); renderCards();
    });
    $('#openOnly').addEventListener('click', function () {
      state.openOnly = !state.openOnly;
      renderFilters(); renderCards();
    });
    $('#resetFilters').addEventListener('click', function () {
      state.cat = 'all'; state.openOnly = false;
      renderFilters(); renderCards();
    });
    // footer categories filter in place instead of reloading with ?kategorija=
    $('#footerCats').addEventListener('click', function (e) {
      var a = e.target.closest('[data-cat]');
      if (a) { e.preventDefault(); goCat(a.dataset.cat); }
    });

    // links to a unit card that is currently filtered out: clear filters first
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      if (unitById(id) && !document.getElementById(id)) {
        e.preventDefault();
        state.cat = 'all'; state.openOnly = false;
        renderFilters(); renderCards();
        document.getElementById(id).scrollIntoView({ behavior: NV.reduceMotion ? 'auto' : 'smooth' });
        history.replaceState(null, '', '#' + id);
      }
    });

    // map / list
    $$('.seg__btn').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.dataset.view); });
    });
    $$('.pin').forEach(function (p) {
      var id = p.dataset.id;
      var hoverOn = function () { state.hov = id; syncMap(); };
      var hoverOff = function () { state.hov = null; syncMap(); };
      p.addEventListener('mouseenter', hoverOn);
      p.addEventListener('focus', hoverOn);
      p.addEventListener('mouseleave', hoverOff);
      p.addEventListener('blur', hoverOff);
      p.addEventListener('click', function () {
        state.sel = state.sel === id ? null : id;
        state.hov = null;
        syncMap();
      });
    });
    $('#mapCard').addEventListener('click', function (e) {
      if (e.target.closest('.map-card__close')) { state.sel = null; syncMap(); }
    });

    // inquiry form (front-end only until a backend endpoint exists)
    $('#inquiryForm').addEventListener('submit', function (e) {
      e.preventDefault();
      $('#sentEmail').textContent = this.elements.email.value.trim() || 'Vaš email';
      this.hidden = true;
      $('#formSent').hidden = false;
    });
  }

  render();
  renderPins();
  syncMap();
  bind();

  // keep open/closed status live
  setInterval(render, 60000);
})();
