/* Novalis landing (design v4) — page behaviour on top of js/site.js.
   Renders unit cards, map and location list, computes live open/closed status in Europe/Zagreb time, and wires up
   filters, the map/list toggle and the inquiry form. The "Novalis za svaku priliku" band is js/occasions.js. */
(function () {
  'use strict';

  var NV = window.NV, D = NV.D, $ = NV.$, $$ = NV.$$, esc = NV.esc, setHTML = NV.setHTML;

  var params = new URLSearchParams(location.search), urlCat = params.get('kategorija');
  var state = { cat: NV.CAT_IDS.indexOf(urlCat) >= 0 ? urlCat : 'all', openOnly: false, view: 'map', sel: null, hov: null };
  var units = []; // view models, rebuilt every render()

  function unitById(id) {
    return units.find(function (u) { return u.id === id; }) || null;
  }

  /* ---------------- Opening hours (helpers in site.js) ---------------- */
  var unitStatus = NV.unitStatus;

  /* ---------------- View model ---------------- */
  function buildUnits() {
    var z = NV.zagrebNow(), season = NV.currentSeason(z);
    return {
      season: season,
      units: NV.units.map(function (u, i) {
        var st = unitStatus(u, season, z);
        return {
          id: u.id, n: i + 1, nPad: (i < 9 ? '0' : '') + (i + 1), name: u.name, address: u.address, category: u.category,
          photo: NV.asset(u.photo), photoHint: u.photoHint, promo: !!u.promo,
          open: st.open, label: st.label, today: st.today, hasToday: st.hasToday,
          // card: today's hours with open/closed ("Otvoreno · Danas 07:00 - 19:00"), else the status ("Zatvoreno · otvara sutra u 07:00")
          hoursLine: st.open && st.hasToday ? 'Otvoreno · ' + st.today : st.text,
          callHref: NV.telHref(u),
          moreHref: NV.unitHref(u), external: !!u.external,
          mapsHref: NV.mapsHref(u),
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

  // One link per card: the name, stretched over the whole card (.card__link::after), so a click anywhere opens the unit.
  // The photo is decorative (the name follows it). The ghost copy of the name keeps its line free in the hover panel;
  // Više is only a visual cue. --i staggers the entrance.
  function cardHTML(u, i) {
    return '<article class="card" id="' + u.id + '" style="--i:' + Math.min(i, 8) + '">' +
      '<div class="card__media">' + NV.slotHTML(u.photo, u.photoHint, '') +
        (u.promo ? '<span class="card__promo">Akcija</span>' : '') + '</div>' +
      '<div class="card__head"><h3 class="card__name"><a class="card__link" href="' + esc(u.moreHref) + '"' +
        (u.external ? ' target="_blank" rel="noopener"' : '') + '><span class="card__nm" translate="no">' + esc(u.name) + '</span>' +
        (u.external ? NV.NEW_TAB : '') + '</a></h3></div>' +
      '<div class="card__info"><span class="card__ghost" aria-hidden="true" translate="no">' + esc(u.name) + '</span>' +
        '<div class="card__meta"><p class="card__addr">' + esc(u.address) + '</p>' +
          '<p class="card__hours status' + (u.open ? ' is-open' : '') + '"><span class="dot"></span><span>' + esc(u.hoursLine) + '</span></p></div>' +
        '<span class="card__more" aria-hidden="true">Više<span class="ms ms--xs">arrow_forward</span></span></div>' +
    '</article>';
  }

  // swap: a filter changed the selection. That ends the entrance and fades the new cards in (none with reduced motion).
  // The minute refresh replaces the cards only when a status text changed, without motion; if that happens while the
  // entrance runs, the entrance ends there, so it never replays.
  var cardsShown = null;
  function renderCards(swap) {
    var visible = units.filter(function (u) {
      return (state.cat === 'all' || u.category === state.cat) && (!state.openOnly || u.open);
    });
    var grid = $('#cards'), html = visible.map(cardHTML).join(''), changed = html !== cardsShown;
    if (swap || (changed && unitsSec.classList.contains('is-in'))) endEntrance();
    if (swap && changed && !NV.reduceMotion) {
      grid.classList.add('cards--swap');
      clearTimeout(grid._swap);
      grid._swap = setTimeout(function () { grid.classList.remove('cards--swap'); }, 260);
    }
    // new markup replaces the focused link: give focus back to the same card, so keyboard users keep their place
    var focused = changed && grid.contains(document.activeElement) && document.activeElement.closest('.card');
    setHTML(grid, html);
    cardsShown = html;
    var again = focused && document.getElementById(focused.id);
    if (again) again.querySelector('.card__link').focus({ preventScroll: true });
    $('#noResults').hidden = visible.length > 0;
  }

  /* ---------------- Card entrance ---------------- */
  // The cards rise in one after another the first time the grid comes into view (css .units--anim). The classes come
  // off again once it has run, or as soon as the cards change, so re-renders never replay it and no card stays hidden.
  // Without IntersectionObserver, or with reduced motion, it never starts.
  var unitsSec = $('#poslovnice'), unitsIO = null, unitsT = 0;

  function endEntrance() {
    clearTimeout(unitsT);
    if (unitsIO) { unitsIO.disconnect(); unitsIO = null; }
    unitsSec.classList.remove('units--anim', 'is-in');
  }

  function initEntrance() {
    if (NV.reduceMotion || !('IntersectionObserver' in window)) return;
    unitsIO = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      unitsIO.disconnect(); unitsIO = null;
      unitsSec.classList.add('is-in');
      unitsT = setTimeout(endEntrance, 1300); // the 7th card lands at 1180 ms
    }, { rootMargin: '0px 0px -15% 0px' });
    unitsSec.classList.add('units--anim');
    unitsIO.observe($('#cards'));
    // Tab can bring a card link to the screen's very edge before the grid counts as in view: show the cards at once
    $('#cards').addEventListener('focusin', function () { if (unitsIO) endEntrance(); });
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
      '<div class="map-card map-card--' + (u.x <= 50 ? 'l' : 'r') + (previewId ? ' is-preview" aria-hidden="true" inert' : '" role="dialog"') +
        ' aria-label="' + esc(u.name) + '" style="--x:' + u.x + ';--y:' + u.y + '">' +
        '<div class="map-card__img">' + NV.slotHTML(u.photo, u.photoHint, u.name) +
          '<span class="map-card__n">' + u.nPad + '</span>' +
          '<button type="button" class="map-card__close" aria-label="Zatvori"><span class="ms ms--xs" aria-hidden="true">close</span></button>' +
        '</div>' +
        '<div class="map-card__body">' +
          '<div class="map-card__title"><span class="map-card__name" translate="no">' + esc(u.name) + '</span>' +
            '<span class="map-card__addr">' + esc(u.address) + '</span></div>' +
          '<div class="map-card__foot">' +
            '<div class="map-card__state">' + statusHTML('map-card__label', u.open, u.label) +
              (u.hasToday ? '<span class="map-card__today">' + esc(u.today) + '</span>' : '') + '</div>' +
            '<div class="map-card__actions">' +
              '<a class="round" href="' + esc(u.mapsHref) + '" target="_blank" rel="noopener" aria-label="Upute do ' + esc(u.name) + ' (nova kartica)" title="Upute">' +
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
        '<div class="loc__main"><span class="loc__name" translate="no">' + esc(u.name) + '</span><span class="loc__addr">' + esc(u.address) + '</span></div>' +
        '<div class="loc__state">' + statusHTML('loc__label', u.open, u.label) +
          (u.hasToday ? '<span class="loc__today">' + esc(u.today) + '</span>' : '') + '</div>' +
        '<div class="loc__actions">' +
          '<a class="btn-sm" href="' + esc(u.mapsHref) + '" target="_blank" rel="noopener" aria-label="Upute do ' + esc(u.name) + ' (nova kartica)">' +
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
    $('#seasonLabel').textContent = vm.season === 'summer' ? 'Ljetno radno vrijeme · do ' + NV.dayMonth(s.end) : 'Zimsko radno vrijeme · do ' + NV.dayMonth(s.start, -1);
    $('#openStatus').textContent = 'Trenutno otvoreno ' + openCount + ' od ' + units.length + ' poslovnica';

    renderFilters();
    renderCards();
    renderMapCard();
    renderList();
  }

  /* ---------------- Events ---------------- */
  function setCat(cat) {
    state.cat = cat;
    var url = new URL(location.href);
    if (cat === 'all') url.searchParams.delete('kategorija'); else url.searchParams.set('kategorija', cat);
    url.hash = 'poslovnice';
    history.replaceState(null, '', url);
  }

  function bind() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && (state.sel || state.hov)) { state.sel = null; state.hov = null; syncMap(); }
    });

    // hero CTA → "Pronađite nas"
    $('#toLocations').addEventListener('click', function () {
      NV.scrollToY($('#locHead').getBoundingClientRect().top + window.scrollY - NV.headerOffset() - 32);
    });

    // filters (the category stays in the URL, so a filtered list can be shared: ?kategorija=gastro)
    $('#filters').addEventListener('click', function (e) {
      var tab = e.target.closest('[data-cat]');
      if (!tab) return;
      setCat(tab.dataset.cat);
      renderFilters(); renderCards(true);
    });
    $('#openOnly').addEventListener('click', function () {
      state.openOnly = !state.openOnly;
      renderFilters(); renderCards(true);
    });
    $('#resetFilters').addEventListener('click', function () {
      setCat('all'); state.openOnly = false;
      renderFilters(); renderCards(true);
    });
    // links to a unit card that is currently filtered out: clear filters first
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      if (unitById(id) && !document.getElementById(id)) {
        e.preventDefault();
        setCat('all'); state.openOnly = false;
        endEntrance(); // the page scrolls straight to the card: show it at once
        renderFilters(); renderCards();
        document.getElementById(id).scrollIntoView({ behavior: NV.reduceMotion ? 'auto' : 'smooth' });
        history.replaceState(null, '', '#' + id);
      }
    });

    // map / list
    $$('.seg__btn').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.dataset.view); });
    });
    // "Svi kontakti" (#prilike) jumps to Pronađite nas like any anchor and opens its list, where every unit's contacts are
    $('#allContacts').addEventListener('click', function () { setView('list'); });
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

  // Search engines: the company and its units with address and phone (each store page describes its own unit in full;
  // opening hours are published there only, once confirmed).
  function addStructuredData() {
    var C = D.company;
    NV.addJSONLD({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', '@id': NV.HOME_URL + '#web', name: 'Novalis', url: NV.HOME_URL, inLanguage: 'hr', publisher: { '@id': NV.ORG['@id'] } },
        Object.assign({}, NV.ORG, {
          alternateName: 'Novalis', foundingDate: String(C.founded), telephone: C.tel, email: C.email,
          address: NV.postalAddress(C.address),
          subOrganization: NV.units.map(function (u) {
            return Object.assign({}, u.schema, {
              '@id': NV.unitId(u), name: u.name, url: NV.absUrl(NV.unitHref(u)),
              address: NV.postalAddress(u.address), telephone: u.tel || C.tel
            });
          })
        })
      ]
    });
  }

  render();
  addStructuredData();
  renderPins();
  syncMap();
  bind();
  // O nama's "Svi kontakti" lands here as ?prikaz=popis#lokacije: open the list, where every unit's contacts are
  if (params.get('prikaz') === 'popis') setView('list');
  initEntrance();

  // keep open/closed status live
  setInterval(render, 60000);
})();
