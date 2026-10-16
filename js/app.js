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
        // the card's fields (NV.cardData) plus what the map and the list show
        return Object.assign(NV.cardData(u, st), {
          n: i + 1, nPad: (i < 9 ? '0' : '') + (i + 1), category: u.category,
          label: st.label, today: st.today, hasToday: st.hasToday,
          callHref: NV.telHref(u), mapsHref: NV.mapsHref(u)
        });
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

  // The cards are NV.cardHTML; the grid (entrance, filter fade, focus kept on re-render) is NV.cardGrid.
  var cards = NV.cardGrid($('#cards'));
  function renderCards(swap) {
    var visible = units.filter(function (u) {
      return (state.cat === 'all' || u.category === state.cat) && (!state.openOnly || u.open);
    });
    cards.render(visible.map(NV.cardHTML).join(''), swap);
    $('#noResults').hidden = visible.length > 0;
  }

  /* ---------------- Map + list ---------------- */
  // The map (js/map.js) is built when the section comes near the screen; its pins are the buttons below, placed on
  // each unit's spot. Until then, or if the map can't run, map stays null and the card has nothing to point at.
  var map = null, markers = []; // markers: MapLibre markers in unit order
  var wideMap = matchMedia('(min-width: 700px)'); // beside its pin from here up; a sheet over the map's foot below

  function pinHTML(u) {
    return '<button type="button" class="pin" data-id="' + u.id + '" aria-label="' + u.n + '. ' + esc(u.name) + '" aria-pressed="false">' +
      '<span class="pin__head"><span class="pin__n">' + u.n + '</span></span></button>';
  }

  function markerOf(id) {
    return markers.find(function (m) { return m.id === id; }) || null;
  }
  // A pin's tip in px within the map box
  function pinPoint(id) {
    var m = markerOf(id);
    return m ? map.project(m.getLngLat()).add(m.getOffset()) : null;
  }

  function initMap() {
    var lats = NV.units.map(function (u) { return u.geo[0]; }), lngs = NV.units.map(function (u) { return u.geo[1]; });
    NV.map.create($('#mapCanvas'), {
      label: 'Karta poslovnica Novalis u Novalji',
      map: {
        bounds: [[Math.min.apply(null, lngs), Math.min.apply(null, lats)], [Math.max.apply(null, lngs), Math.max.apply(null, lats)]],
        // room above for the pins' heads, below for the map credits
        fitBoundsOptions: { padding: wideMap.matches ? { top: 100, right: 80, bottom: 64, left: 72 } : { top: 88, right: 40, bottom: 80, left: 64 } }
      }
    }, function (m, gl) {
      map = m;
      markers = NV.units.map(function (u, i) {
        var el = document.createElement('div');
        el.className = 'pin-marker';
        el.innerHTML = pinHTML(units[i]);
        var mk = new gl.Marker({ element: el, anchor: 'bottom' }).setLngLat(NV.map.lngLat(u)).addTo(m);
        // the button inside is the control: MapLibre's own role and English label on the wrapper would double it
        el.removeAttribute('role');
        el.removeAttribute('aria-label');
        mk.id = u.id;
        return mk;
      });

      var geo = new gl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, fitBoundsOptions: { maxZoom: 15 } });
      m.addControl(geo, 'top-right');
      geo.on('outofmaxbounds', function () { mapMessage('Vaša lokacija je izvan područja ove karte.'); });

      var spread = function () { NV.map.spread(m, markers); };
      spread();
      m.on('zoom', spread);
      m.on('move', placeCard);
      // a click on the map itself (not on a pin) closes the card
      m.on('click', function (e) {
        if (state.sel && !e.originalEvent.target.closest('.pin')) { state.sel = null; syncMap(); }
      });
      syncMap();
    }, function () {
      $('#mapFail').hidden = false;
    });
  }

  // a short note over the map, gone after a few seconds (#mapMsg is a live region, so screen readers read it out)
  var msgTimer = 0;
  function mapMessage(text) {
    $('#mapMsg').textContent = text;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(function () { $('#mapMsg').textContent = ''; }, 5000);
  }

  // Hovering/focusing a pin previews its card on top of the selected one; clicking selects it.
  function renderMapCard() {
    var previewId = state.hov && state.hov !== state.sel ? state.hov : null;
    var u = unitById(previewId || state.sel);
    if (!u || !map) { setHTML($('#mapCard'), ''); return; }
    setHTML($('#mapCard'),
      '<div class="map-card' + (previewId ? ' is-preview" aria-hidden="true" inert' : '" role="dialog"') + ' aria-label="' + esc(u.name) + '">' +
        '<div class="map-card__img">' + NV.slotHTML(u.photo, u.photoHint, u.name) +
          '<span class="map-card__n">' + u.nPad + '</span>' +
          '<button type="button" class="map-card__close" aria-label="Zatvori"><span class="ms ms--xs" aria-hidden="true">close</span></button>' +
        '</div>' +
        '<div class="map-card__body">' +
          '<div class="map-card__title"><span class="map-card__name" translate="no">' + esc(u.name) + '</span>' +
            NV.addrHTML(NV.byId[u.id], 'map-card__addr') + '</div>' +
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
    placeCard();
  }

  // From 700 px up the card sits beside its pin and follows it while the map moves; it steps out of sight while its pin
  // is off the map (is-away). Set apart from the markup, so a moved map doesn't rebuild the card (and lose focus in it).
  function placeCard() {
    var card = $('.map-card'), id = state.hov && state.hov !== state.sel ? state.hov : state.sel;
    var pt = card && pinPoint(id);
    if (!pt) return;
    var box = $('#map');
    var x = pt.x / box.clientWidth * 100, y = pt.y / box.clientHeight * 100;
    card.style.setProperty('--x', x.toFixed(2));
    card.style.setProperty('--y', y.toFixed(2));
    card.classList.toggle('map-card--l', x <= 50);
    card.classList.toggle('map-card--r', x > 50);
    card.classList.toggle('is-away', x < 0 || x > 100 || y < 0 || y > 100);
  }

  // Moves the map so a pin is clear of the edges, the zoom buttons and (on phones) the card covering the map's foot.
  function revealPin(id) {
    var pt = pinPoint(id);
    if (!pt) return;
    var box = $('#map'), card = $('.map-card:not(.is-preview)'), pad = 56;
    var w = box.clientWidth, h = box.clientHeight;
    var bottom = card && !wideMap.matches ? card.offsetTop - 16 : h - 24;
    var dx = pt.x < pad ? pt.x - pad : pt.x > w - pad - 48 ? pt.x - (w - pad - 48) : 0;
    var dy = pt.y < pad + 44 ? pt.y - pad - 44 : pt.y > bottom ? pt.y - bottom : 0;
    if (dx || dy) map.panBy([dx, dy], { duration: NV.reduceMotion ? 0 : 400 });
  }

  function syncMap() {
    $$('.pin').forEach(function (p) {
      var id = p.dataset.id, on = id === state.sel || id === state.hov;
      p.classList.toggle('is-active', on);
      p.parentNode.classList.toggle('is-active', on); // the marker: an active pin draws over its neighbours
      p.setAttribute('aria-pressed', id === state.sel);
    });
    renderMapCard();
  }

  function renderList() {
    setHTML($('#locList'), units.map(function (u) {
      return '<li class="loc">' +
        '<span class="loc__n">' + u.n + '</span>' +
        '<div class="loc__main"><span class="loc__name" translate="no">' + esc(u.name) + '</span>' + NV.addrHTML(NV.byId[u.id], 'loc__addr') + '</div>' +
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
    var vm = buildUnits();
    units = vm.units;
    var openCount = units.filter(function (u) { return u.open; }).length;

    $('#seasonIcon').textContent = vm.season === 'summer' ? 'sunny' : 'ac_unit';
    $('#seasonLabel').textContent = vm.season === 'summer' ? 'Ljetno radno vrijeme' : 'Zimsko radno vrijeme';
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
        cards.end(); // the page scrolls straight to the card: show it at once
        renderFilters(); renderCards();
        document.getElementById(id).scrollIntoView({ behavior: NV.reduceMotion ? 'auto' : 'smooth' });
        history.replaceState(null, '', '#' + id);
      }
    });

    // map / list
    $$('.seg__btn').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.dataset.view); });
    });
    // pins exist once the map is built, so their events are taken on the map box
    var mapBox = $('#map');
    function pinOf(e) { var p = e.target.closest('.pin'); return p && !p.contains(e.relatedTarget) ? p : null; }
    mapBox.addEventListener('mouseover', function (e) {
      var p = pinOf(e);
      if (p) { state.hov = p.dataset.id; syncMap(); }
    });
    mapBox.addEventListener('mouseout', function (e) {
      if (pinOf(e)) { state.hov = null; syncMap(); }
    });
    mapBox.addEventListener('focusin', function (e) {
      var p = pinOf(e);
      if (p) { state.hov = p.dataset.id; syncMap(); revealPin(p.dataset.id); }
    });
    mapBox.addEventListener('focusout', function (e) {
      if (pinOf(e)) { state.hov = null; syncMap(); }
    });
    mapBox.addEventListener('click', function (e) {
      var p = e.target.closest('.pin');
      if (!p) return;
      var id = p.dataset.id;
      state.sel = state.sel === id ? null : id;
      state.hov = null;
      syncMap();
      if (state.sel) revealPin(id);
    });
    $('#mapFail').addEventListener('click', function (e) {
      if (e.target.closest('[data-view]')) setView('list');
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

  // hero: the petal light leans toward the pointer and eases back when it leaves (mouse only, motion allowed).
  // One transform on one layer per frame, and only while it is still moving
  function heroLight() {
    var hero = $('.hero'), glow = $('.hero__glow');
    if (!hero || !glow || NV.reduceMotion || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    function step() {
      x += (tx - x) * 0.06; y += (ty - y) * 0.06;
      glow.style.transform = 'translate3d(' + (x * 7).toFixed(2) + '%, ' + (y * 7).toFixed(2) + '%, 0)';
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(step) : 0;
    }
    function aim(nx, ny) { tx = nx; ty = ny; if (!raf) raf = requestAnimationFrame(step); }
    hero.addEventListener('pointermove', function (e) { aim(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5); });
    hero.addEventListener('pointerleave', function () { aim(0, 0); });
  }

  // phones: the quick bar holds back while the hero's buttons are on screen (they are the same actions); buttons that
  // have slid under the sticky header count as gone. The first state is set without the slide, so the bar doesn't
  // flash in and out on load
  function holdQuickbar() {
    var bar = $('.quickbar'), actions = $('.hero__actions');
    if (!bar || !actions || !('IntersectionObserver' in window)) return;
    var top = NV.headerOffset(), r = actions.getBoundingClientRect();
    bar.style.transition = 'none';
    bar.classList.toggle('is-held', r.bottom > top && r.top < innerHeight);
    void bar.offsetWidth;
    bar.style.transition = '';
    new IntersectionObserver(function (entries) {
      // the latest entry: several can queue up before the callback runs
      bar.classList.toggle('is-held', entries[entries.length - 1].isIntersecting);
    }, { rootMargin: -top + 'px 0px 0px 0px' }).observe(actions);
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
  bind();
  initMap();
  heroLight();
  holdQuickbar();
  // O nama's "Svi kontakti" lands here as ?prikaz=popis#lokacije: open the list, where every unit's contacts are
  if (params.get('prikaz') === 'popis') setView('list');

  // keep open/closed status live
  setInterval(render, 60000);
})();
