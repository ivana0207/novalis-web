/* Novalis landing (design v4) — page behaviour on top of js/site.js.
   Renders unit cards, map and location list, computes live open/closed status in Europe/Zagreb time, and wires up
   filters, the map/list toggle and the inquiry form. The "Novalis za svaku priliku" band is js/occasions.js. */
(function () {
  'use strict';

  var NV = window.NV, D = NV.D, $ = NV.$, $$ = NV.$$, esc = NV.esc, setHTML = NV.setHTML;

  // This page's texts in its language (NV.LANG): Croatian on /, English on /en/ (WEB-21)
  var TEXTS = {
    hr: {
      all: 'Sve', map: 'Karta poslovnica Novalis u Novalji', outside: 'Vaša lokacija je izvan područja ove karte.',
      close: 'Zatvori', directions: 'Upute', call: 'Nazovi', email: 'Vaš email',
      directionsTo: function (name) { return 'Upute do ' + name + ' (nova kartica)'; },
      callTo: function (name) { return 'Nazovi ' + name; },
      summer: 'Ljetno radno vrijeme', winter: 'Zimsko radno vrijeme',
      openCount: function (n, all) { return 'Trenutno otvoreno ' + n + ' od ' + all + ' poslovnica'; },
      // inquiry form errors, worded like Zaposli se's (js/zaposli-se.js)
      nameMissing: 'Upišite ime i prezime.',
      emailMissing: 'Upišite adresu e-pošte.',
      emailInvalid: 'Upišite ispravnu adresu e-pošte, primjerice ime@domena.hr.',
      messageMissing: 'Upišite poruku.',
      consentMissing: 'Potvrdite da ste upoznati s Pravilima o privatnosti kako biste poslali upit.',
      // the hero's slides (WEB-47)
      carousel: 'vrtuljak', slide: 'slajd',
      slideOf: function (n, all) { return 'Slajd ' + n + ' od ' + all; },
      prev: 'Prethodni slajd', next: 'Sljedeći slajd'
    },
    en: {
      all: 'All', map: 'Map of Novalis locations in Novalja', outside: 'Your location is outside the area of this map.',
      close: 'Close', directions: 'Directions', call: 'Call', email: 'your email address',
      directionsTo: function (name) { return 'Directions to ' + name + ' (new tab)'; },
      callTo: function (name) { return 'Call ' + name; },
      summer: 'Summer opening hours', winter: 'Winter opening hours',
      openCount: function (n, all) { return n + ' of ' + all + ' locations ' + (n === 1 ? 'is' : 'are') + ' open now'; },
      nameMissing: 'Enter your full name.',
      emailMissing: 'Enter your email address.',
      emailInvalid: 'Enter a valid email address, for example name@example.com.',
      messageMissing: 'Enter your message.',
      consentMissing: 'Please confirm that you have read the privacy policy to send your enquiry.',
      carousel: 'carousel', slide: 'slide',
      slideOf: function (n, all) { return 'Slide ' + n + ' of ' + all; },
      prev: 'Previous slide', next: 'Next slide'
    }
  };
  var T = TEXTS[NV.LANG] || TEXTS.hr;
  var EMAIL = /^[^\s@"<>(),;:\\[\]]+@[^\s@"<>(),;:\\[\]]+\.[^\s@"<>(),;:\\[\].]{2,}$/;   // the same rule as Zaposli se (js/zaposli-se.js, api/apply.mjs)

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
        var st = unitStatus(u, z);
        // the card's fields (NV.cardData) plus what the map and the list show
        return Object.assign(NV.cardData(u, st), {
          n: i + 1, category: u.category,
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
    // the tabs are rebuilt when a count or pressed state changes: a focused one keeps the focus
    var box = $('#filters'), kept = box.contains(document.activeElement) ? document.activeElement.dataset.cat : null;
    var list = [{ id: 'all', label: T.all }].concat(D.categories);
    setHTML($('#filters'), list.map(function (f) {
      var count = f.id === 'all' ? units.length : units.filter(function (u) { return u.category === f.id; }).length;
      return '<button type="button" class="tab" data-cat="' + f.id + '" aria-pressed="' + (state.cat === f.id) + '">' +
        esc(NV.tx(f, 'label')) + '<span class="tab__count">' + count + '</span></button>';
    }).join(''));
    $('#openOnly').setAttribute('aria-pressed', state.openOnly);
    var again = kept && box.querySelector('[data-cat="' + kept + '"]');
    if (again && document.activeElement !== again) again.focus();
  }

  // The cards are NV.cardHTML; the grid (entrance, filter fade, focus kept on re-render) is NV.cardGrid.
  var cards = NV.cardGrid($('#cards')), wasEmpty = false;
  function renderCards(swap) {
    var visible = units.filter(function (u) {
      return (state.cat === 'all' || u.category === state.cat) && (!state.openOnly || u.open);
    });
    cards.render(visible.map(NV.cardHTML).join(''), swap);
    var empty = visible.length === 0;
    $('#noResults').hidden = !empty;
    // announced once, when the list turns empty (the 60 s refresh leaves the live region alone)
    if (empty !== wasEmpty) {
      wasEmpty = empty;
      $('#noResultsLive').textContent = empty ? $('#noResults p').textContent : '';
    }
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
    if (!NV.map) { $('#mapFail').hidden = false; return; } // js/map.js didn't load
    var lats = NV.units.map(function (u) { return u.geo[0]; }), lngs = NV.units.map(function (u) { return u.geo[1]; });
    NV.map.create($('#mapCanvas'), {
      label: T.map,
      map: {
        bounds: [[Math.min.apply(null, lngs), Math.min.apply(null, lats)], [Math.max.apply(null, lngs), Math.max.apply(null, lats)]],
        // room above for the pins' heads, below for the map credits, at the sides for pins pushed apart (NV.map.spread)
        fitBoundsOptions: { padding: wideMap.matches ? { top: 100, right: 80, bottom: 64, left: 72 } : { top: 88, right: 64, bottom: 80, left: 64 } }
      }
    }, function (m, gl) {
      map = m;
      markers = NV.units.map(function (u, i) {
        var mk = NV.map.pin(m, gl, u, pinHTML(units[i]));
        mk.id = u.id;
        return mk;
      });

      var geo = new gl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, fitBoundsOptions: { maxZoom: 15 } });
      m.addControl(geo, 'top-right');
      geo.on('outofmaxbounds', function () { mapMessage(T.outside); });

      var spread = function () { NV.map.spread(m, markers); };
      spread();
      m.on('zoom', spread);
      m.on('move', placeCard);
      // a click on the map itself (not on a pin) closes the card
      m.on('click', function (e) {
        if (state.sel && !e.originalEvent.target.closest('.pin')) { state.sel = null; syncMap(); }
      });
      syncMap();
    }, function (hadFocus) {
      // the map may have been built already: forget it, its pins and an open card
      map = null; markers = [];
      state.sel = null; state.hov = null;
      syncMap();
      $('#mapFail').hidden = false;
      if (hadFocus) $('#mapFail [data-view]').focus();
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
    // phones: MapLibre's two-finger hint would cover the open card (css)
    $('#map').classList.toggle('has-card', !!(u && map));
    if (!u || !map) { setHTML($('#mapCard'), ''); return; }
    setHTML($('#mapCard'),
      '<div class="map-card' + (previewId ? ' is-preview" aria-hidden="true" inert' : '" role="dialog"') + ' aria-label="' + esc(u.name) + '">' +
        '<div class="map-card__img">' + NV.slotHTML(u.photo, u.photoHint, u.name) +
          '<button type="button" class="map-card__close" aria-label="' + T.close + '"><span class="ms ms--xs" aria-hidden="true">close</span></button>' +
        '</div>' +
        '<div class="map-card__body">' +
          '<div class="map-card__title"><span class="map-card__name" translate="no">' + esc(u.name) + '</span>' +
            NV.addrHTML(NV.byId[u.id], 'map-card__addr') + '</div>' +
          '<div class="map-card__foot">' +
            '<div class="map-card__state">' + statusHTML('map-card__label', u.open, u.label) +
              (u.hasToday ? '<span class="map-card__today">' + esc(u.today) + '</span>' : '') + '</div>' +
            '<div class="map-card__actions">' +
              '<a class="round" href="' + esc(u.mapsHref) + '" target="_blank" rel="noopener" aria-label="' + esc(T.directionsTo(u.name)) + '" title="' + T.directions + '">' +
                '<span class="ms ms--sm" aria-hidden="true">directions</span></a>' +
              '<a class="round round--call" href="' + esc(u.callHref) + '" aria-label="' + esc(T.callTo(u.name)) + '" title="' + T.call + '">' +
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
          '<a class="btn-sm" href="' + esc(u.mapsHref) + '" target="_blank" rel="noopener" aria-label="' + esc(T.directionsTo(u.name)) + '">' +
            '<span class="ms ms--sm" aria-hidden="true">directions</span>' + T.directions + '</a>' +
          '<a class="btn-sm btn-sm--call" href="' + esc(u.callHref) + '" aria-label="' + esc(T.callTo(u.name)) + '">' +
            '<span class="ms ms--sm" aria-hidden="true">call</span>' + T.call + '</a>' +
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
    $('#seasonLabel').textContent = vm.season === 'summer' ? T.summer : T.winter;
    $('#openStatus').textContent = T.openCount(openCount, units.length);
    // the dot beside it is green only while something is open (grey like a closed unit's otherwise, e.g. all day on a holiday)
    $('.find__status .dot').classList.toggle('dot--open', openCount > 0);

    renderFilters();
    renderCards();
    renderMapCard();
    renderList();
  }

  /* ---------------- Events ---------------- */
  function setCat(cat) {
    state.cat = cat;
  }

  function bind() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && (state.sel || state.hov)) { state.sel = null; state.hov = null; syncMap(); }
    });

    // filters (the address stays plain: an old ?kategorija=gastro link still opens filtered, see site.js)
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
      $('#filters [data-cat="all"]').focus(); // the button just hid with the message
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
        NV.goTo(document.getElementById(id));
      }
    });

    // map / list
    $$('.seg__btn').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.dataset.view); });
    });
    // pins exist once the map is built, so their events are taken on the map box
    var mapBox = $('#map');
    function pinOf(e) { var p = e.target.closest('.pin'); return p && !p.contains(e.relatedTarget) ? p : null; }
    // only the pin showing the preview takes it away: a pin sliding out from under a resting pointer while the map
    // pans to a focused pin mustn't hide that pin's card
    function leave(e) {
      var p = pinOf(e);
      if (p && state.hov === p.dataset.id) { state.hov = null; syncMap(); }
    }
    // Hover previews are for a mouse. A touch has no hover, and iOS Safari takes the first tap on something that changes
    // the page on mouseover as a hover only: the tap would leave an untappable preview instead of opening the card.
    mapBox.addEventListener('pointerover', function (e) {
      var p = e.pointerType === 'mouse' && pinOf(e);
      if (p) { state.hov = p.dataset.id; syncMap(); }
    });
    mapBox.addEventListener('pointerout', function (e) {
      if (e.pointerType === 'mouse') leave(e);
    });
    mapBox.addEventListener('focusin', function (e) {
      var p = pinOf(e);
      if (p) { state.hov = p.dataset.id; syncMap(); revealPin(p.dataset.id); }
    });
    mapBox.addEventListener('focusout', leave);
    mapBox.addEventListener('click', function (e) {
      var p = e.target.closest('.pin');
      if (!p || e.detail > 1) return; // a double click selects once instead of toggling back off
      var id = p.dataset.id;
      state.sel = state.sel === id ? null : id;
      state.hov = null;
      syncMap();
      if (state.sel) revealPin(id);
    });
    // the note's button hides the map it sits in: focus goes to the (now pressed) Popis toggle above the list
    $('#mapFail').addEventListener('click', function (e) {
      if (!e.target.closest('[data-view]')) return;
      setView('list');
      $('.seg__btn[data-view="list"]').focus();
    });
    $('#mapCard').addEventListener('click', function (e) {
      if (e.target.closest('.map-card__close')) { state.sel = null; syncMap(); }
    });
    // The card closes with its X or a click outside it. Outside the map that's this; on the map it is MapLibre's click
    // (initMap), which a drag doesn't count as. The map's buttons (zoom, location, credits) leave it open.
    document.addEventListener('click', function (e) {
      if (state.sel && !mapBox.contains(e.target)) { state.sel = null; syncMap(); }
    });

    // inquiry form (front-end only until a backend endpoint exists). The browser's bubbles are off (only with JS, so
    // without it required still stops the form); each error shows under its field and focus goes to the first one
    var inquiry = $('#inquiryForm'), fields = inquiry.elements, tried = false;
    inquiry.noValidate = true;
    var CHECKS = {
      ime: function () { return fields.ime.value.trim() ? '' : T.nameMissing; },
      email: function () {
        var v = fields.email.value.trim();
        return !v ? T.emailMissing : v.length <= 254 && EMAIL.test(v) ? '' : T.emailInvalid;
      },
      poruka: function () { return fields.poruka.value.trim() ? '' : T.messageMissing; },
      privola: function () { return fields.privola.checked ? '' : T.consentMissing; }
    };
    function setError(name, msg) {
      var err = $('#upit-' + name + '-err');
      $('.form__err-t', err).textContent = msg;
      err.hidden = !msg;
      if (msg) { fields[name].setAttribute('aria-invalid', 'true'); fields[name].setAttribute('aria-describedby', err.id); }
      else { fields[name].removeAttribute('aria-invalid'); fields[name].removeAttribute('aria-describedby'); }
    }
    // after a failed send, an error goes as soon as its field is right (no new errors while typing)
    function recheck(e) {
      var name = e.target.name;
      if (tried && CHECKS[name] && e.target.getAttribute('aria-invalid') === 'true' && !CHECKS[name]()) setError(name, '');
    }
    inquiry.addEventListener('input', recheck);
    inquiry.addEventListener('change', recheck);
    inquiry.addEventListener('submit', function (e) {
      e.preventDefault();
      tried = true;
      var first = null;
      Object.keys(CHECKS).forEach(function (name) {
        var msg = CHECKS[name]();
        setError(name, msg);
        if (msg && !first) first = fields[name];
      });
      if (first) {
        // the field with its label in view, clear of the sticky header
        first.closest('.field, .form__check').scrollIntoView({ block: 'nearest' });
        first.focus({ preventScroll: true });
        return;
      }
      $('#sentEmail').textContent = fields.email.value.trim() || T.email;
      this.hidden = true;
      $('#formSent').hidden = false;
    });
  }

  /* ---------------- Hero slides (WEB-47) ---------------- */
  // The hero's first slide is written in the page (the h1 and the first photo, also without JavaScript). The others
  // come from data/units.js heroSlides, those dated for today in Novalja, and are added after it with two round
  // arrows, Previous and Next, and nothing else: no Pause, no dots (user, 2026-11-16; one slide left: the hero stays
  // as written). Each slide stays 6 s, then the next one comes once its photo is there. The clock waits while
  // something holds the slides: the pointer on the copy or the arrows, keyboard focus in the hero, the hero off
  // screen, a hidden tab, a drag, the page getting ready (hero-wait). With reduced motion they move only by the
  // arrows or a swipe. The photos of slides 2-4 are asked for after the page has loaded. Nothing goes into the address.
  var tx = NV.tx;
  var HERO_DWELL = 6000;
  var HERO_ICON = {
    prev: '<path d="M20 12H5M11 6l-6 6 6 6"/>', next: '<path d="M4 12h15M13 6l6 6-6 6"/>'   // the occasions' arrows
  };
  function heroIcon(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + HERO_ICON[name] + '</svg>';
  }
  // unit names in a slide's text stay as they are when a browser translates the page (Croatian endings included)
  var UNIT_NAME = new RegExp('(' + D.units.reduce(function (all, u) { return all.concat(u.name, (u.en && u.en.name) || []); }, [])
    .sort(function (a, b) { return b.length - a.length; })
    .map(function (n) { return esc(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')[a-zčćđšž]*', 'g');
  function namesHTML(text) {
    return esc(text).replace(UNIT_NAME, '<span translate="no">$&</span>');
  }
  // a slide's link: a unit's store page (its English one on /en/), a part of this page (#id), or a page of the site
  function slideHref(s) {
    if (s.unit) return NV.unitHref(NV.byId[s.unit]);
    return s.href.charAt(0) === '#' ? s.href : NV.asset(s.href);
  }
  // a slide needs a unit, or an href that is '#id', a relative path or http(s); anything else (javascript:, data: ...) is skipped
  function slideLinkOk(s) {
    if (s.unit) return !!NV.byId[s.unit];
    return typeof s.href === 'string' && /^(#[\w-]+|(?![a-z][a-z0-9+.-]*:|\/\/)[^\s]+|https?:\/\/[^\s]+)$/i.test(s.href);
  }
  // slides 2-4 (k from 1): label, headline (word by word, for its first entrance), line, one button. The button's
  // label is one span, so the button's gap never splits it
  function slideHTML(s, k) {
    var href = slideHref(s), here = href.charAt(0) === '#';
    var words = tx(s, 'title').split(' ').map(function (w, i) { return '<span class="hero__w" style="--i:' + i + '">' + esc(w) + '</span>'; });
    return '<div class="section hero__inner hero__slide" data-i="' + k + '">' +
      '<div class="hero__copy">' +
        (tx(s, 'eyebrow') ? '<span class="eyebrow hero__eyebrow">' + namesHTML(tx(s, 'eyebrow')) + '</span>' : '') +
        '<h2 class="hero__title hero__title--h2">' + words.join(' ') + '</h2>' +
        (tx(s, 'line') ? '<p class="hero__lead">' + namesHTML(tx(s, 'line')) + '</p>' : '') +
        '<div class="hero__actions"><a class="btn btn--primary btn--lg hero__cta" href="' + esc(href) + '">' +
          '<span class="hero__cta-label">' + namesHTML(tx(s, 'cta')) + '</span>' +
          '<span class="hero__btn-icon" aria-hidden="true"><span class="ms' + (here ? '' : ' hero__arrow-x') + '">' +
          (here ? 'arrow_downward' : 'arrow_forward') + '</span></span></a></div>' +
      '</div></div>';
  }
  // a slide's photo in the site's photo slot: the loading look until it has come, its note (or the striped
  // placeholder) if it has none or it fails (js/site.js)
  function slidePhotoHTML(s) {
    var p = s.photo, note = tx(s, 'photoNote') || '';
    if (!p || !p.src) return NV.slotHTML(null, note);
    return '<div class="slot slot--photo" data-placeholder="' + esc(note) + '"><img src="' + esc(NV.asset(p.src)) + '" alt=""' +
      (+p.w && +p.h ? ' width="' + (+p.w) + '" height="' + (+p.h) + '"' : '') + ' decoding="async" style="--focus:' + esc(p.focus || '50% 50%') +
      ';--focus-phone:' + esc(p.focusPhone || p.focus || '50% 50%') + '"></div>';
  }
  // The seasonal catalogue's slide (WEB-48, data/units.js catalogues): while a catalogue runs it comes first, before the
  // hero written in the page. Red under a fir garland, snow falling through it (both on its photo layer, css), the copy
  // on the left (the script line in Pristina's stand-in), the shop display and two products with their prices beside
  // it; its one button opens the catalogue page. Its headline is an h2: the page's h1 stays the written hero's.
  function seasonSlideHTML(c) {
    var s = c.slide, n = 0;
    var title = tx(s, 'title').map(function (line) {
      return '<span class="hero__line">' + line.split(' ').map(function (w) {
        return '<span class="hero__w" style="--i:' + (n++) + '">' + esc(w) + '</span>';
      }).join(' ') + '</span>';
    }).join(' ');
    var picks = s.picks.map(function (id) {
      var p = c.products[id];
      return '<div class="xm-tile"><img src="' + esc(NV.asset(p.photo)) + '" alt="" decoding="async">' +
        '<span class="xm-tile__name">' + esc(tx(p, 'name')) + '</span>' + NV.priceHTML(p, 'xm-tile__price') + '</div>';
    }).join('');
    return '<div class="section hero__inner hero__slide hero__slide--xmas" data-i="0">' +
      '<div class="xm-hero">' +
        '<div class="hero__copy xm-hero__copy">' +
          '<span class="eyebrow hero__eyebrow">' + esc(tx(s, 'eyebrow')) + '</span>' +
          '<p class="xm-script">' + esc(tx(s, 'script')) + '</p>' +
          '<h2 class="hero__title">' + title + '</h2>' +
          '<p class="hero__lead">' + esc(tx(s, 'line')) + '</p>' +
          '<div class="hero__actions"><a class="btn btn--lg hero__cta xm-cta" href="' + esc(NV.pageHref('katalog/')) + '">' +
            '<span class="hero__cta-label">' + esc(tx(s, 'cta')) + '</span>' +
            '<span class="hero__btn-icon" aria-hidden="true"><span class="ms hero__arrow-x">arrow_forward</span></span></a></div>' +
        '</div>' +
        '<div class="xm-tiles">' +
          '<div class="xm-tile xm-tile--big"><img src="' + esc(NV.asset(s.photo)) + '" alt="" decoding="async">' +
            '<span class="xm-tag">' + esc(tx(s, 'photoTag')) + '</span></div>' +
          '<div class="xm-tiles__col">' + picks + '</div>' +
        '</div>' +
      '</div></div>';
  }

  function heroControlsHTML() {
    return '<div class="hero__controls">' +
      '<button type="button" class="hero__ctl hero__ctl--prev" data-go="prev" aria-label="' + esc(T.prev) + '">' + heroIcon('prev') + '</button>' +
      '<button type="button" class="hero__ctl hero__ctl--next" data-go="next" aria-label="' + esc(T.next) + '">' + heroIcon('next') + '</button>' +
    '</div><p class="vh hero__live" aria-live="polite" aria-atomic="true"></p>';
  }

  function heroSlider() {
    var hero = $('.hero'), first = hero && $('.hero__slide', hero);
    if (!first || !D.heroSlides) return;
    var today = NV.zagrebNow().iso;
    var data = D.heroSlides.filter(function (s) {
      if (s.html || (s.from && today < s.from) || (s.to && today > s.to)) return false;
      if (!slideLinkOk(s)) { console.warn('hero: "' + s.id + '" has no usable unit or link, skipped'); return false; }
      return true;
    });
    // xm: the running catalogue, whose slide comes first (lead: 1); the written hero is then slide 2
    var xm = NV.catalogue(), lead = xm ? 1 : 0;
    if (!data.length && !xm) return;
    var titles = (xm ? [tx(xm.slide, 'title').join(' ').replace(/\.$/, '')] : [])
      .concat($('.hero__title', first).textContent.replace(/\s+/g, ' ').trim().replace(/\.$/, ''))
      .concat(data.map(function (s) { return tx(s, 'title'); }));
    var n = titles.length;
    if (xm) {
      hero.classList.add('hero--xmas');
      $('.hero__bg', hero).insertAdjacentHTML('afterbegin', '<div class="hero__ph hero__ph--xmas">' + NV.snowHTML(110, 'snow--hero') + '</div>');
      $('.hero__slides', hero).insertAdjacentHTML('afterbegin', seasonSlideHTML(xm));
    }
    $('.hero__bg', hero).insertAdjacentHTML('beforeend', data.map(function () { return '<div class="hero__ph hero__ph--local"></div>'; }).join(''));
    $('.hero__slides', hero).insertAdjacentHTML('beforeend', data.map(function (s, k) { return slideHTML(s, k + 1 + lead); }).join(''));
    hero.insertAdjacentHTML('beforeend', heroControlsHTML());
    hero.setAttribute('aria-roledescription', T.carousel);
    var phs = $$('.hero__ph', hero), slides = $$('.hero__slide', hero), live = $('.hero__live', hero);
    slides.forEach(function (el, k) {
      el.setAttribute('role', 'group');
      el.setAttribute('aria-roledescription', T.slide);
      el.setAttribute('aria-label', T.slideOf(k + 1, n));
    });

    // cur: the current slide · auto: moving on by itself (not with reduced motion) · holds: why the clock waits
    // (pointer, keyboard focus, off screen, hidden tab, a drag, the page getting ready) · left: the current slide's
    // time still to run, counted from since while the clock runs
    var cur = 0, auto = !NV.reduceMotion, holds = {}, seen = { 0: true }, timers = [], waitT = 0;
    var clock = 0, left = HERO_DWELL, since = 0;
    hero.classList.add('hero--slider');

    function paint() {
      hero.dataset.cur = cur;
      phs.forEach(function (p, k) { p.classList.toggle('is-current', k === cur); });
      slides.forEach(function (el, k) { el.classList.toggle('is-current', k === cur); el.toggleAttribute('inert', k !== cur); });
    }
    function held() { return Object.keys(holds).length > 0; }
    // the clock: runs the current slide's time while nothing holds it, then moves on
    function tick() {
      clearTimeout(clock);
      if (since) { left -= Date.now() - since; since = 0; }
      if (!auto || held()) return;
      since = Date.now();
      clock = setTimeout(function () { since = 0; left = 0; advance(); }, Math.max(0, left));
    }
    // slide k's photo is asked for now if it has not been yet; ready once it has come (or shows its placeholder). The
    // season's slide and the written hero have theirs from the start
    function want(k) {
      var s = data[k - 1 - lead];
      if (!s || phs[k]._asked) return;
      phs[k]._asked = true;
      phs[k].innerHTML = slidePhotoHTML(s);
    }
    function ready(k) { return !data[k - 1 - lead] || (phs[k]._asked && !$('.slot--photo:not(.is-loaded)', phs[k])); }
    function restart(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

    // o.direct: the visitor asked (dot, arrow, swipe): quicker, and announced · o.dir: 1 forward, -1 back
    function go(to, o) {
      o = o || {};
      to = (to + n) % n;
      if (to === cur) return;
      var from = cur, k = o.direct ? .6 : 1, out = slides[from], inn = slides[to];
      timers.forEach(clearTimeout);
      clearTimeout(waitT);
      want(to);
      hero.classList.add('is-changed');
      hero.style.setProperty('--dir', o.dir || (to > from ? 1 : -1));
      hero.classList.toggle('is-direct', !!o.direct);
      phs.forEach(function (p) { p.classList.remove('is-prev', 'is-in'); });
      slides.forEach(function (el) { el.classList.remove('is-out', 'is-in'); el.style.transform = el.style.opacity = ''; });
      phs[from].classList.add('is-prev');
      if (o.drag && !NV.reduceMotion) { out.style.transform = 'translateX(' + o.drag + 'px)'; out.style.opacity = o.dragO; }
      cur = to;
      paint();
      out.classList.add('is-out');
      inn.classList.toggle('was-seen', !!seen[to]);
      seen[to] = true;
      restart(phs[to], 'is-in');
      restart(inn, 'is-in');
      timers = [
        setTimeout(function () { phs[from].classList.remove('is-prev'); }, 1000 * k + 50),
        setTimeout(function () { out.classList.remove('is-out'); out.style.transform = out.style.opacity = ''; }, 400 * k)
      ];
      if (o.direct) live.textContent = T.slideOf(to + 1, n) + ': ' + titles[to];
      left = HERO_DWELL;   // the new slide gets its full time
      since = 0;
      tick();
    }
    // the slide's time is up: on to the next one once its photo is there (a hold: the clock calls again when it ends)
    function advance() {
      var to = (cur + 1) % n;
      want(to);
      clearTimeout(waitT);
      if (!auto || held()) return;
      if (ready(to)) go(to, { dir: 1 });
      else waitT = setTimeout(advance, 300);
    }
    function hold(why, on) {
      if (!on === !holds[why]) return;
      if (on) holds[why] = true; else delete holds[why];
      tick();
    }
    paint();

    hero.addEventListener('click', function (e) {
      if (dragged && e.target.closest('a')) { e.preventDefault(); return; }   // a swipe never opens the button's link
      var b = e.target.closest('.hero__ctl');
      if (!b) return;
      var dir = b.dataset.go === 'prev' ? -1 : 1;
      go(cur + dir, { direct: true, dir: dir });
    });
    // a mouse resting on the copy or the arrows holds the slide (a tap leaves no hover behind)
    hero.addEventListener('pointerover', function (e) {
      if (e.pointerType === 'mouse') hold('hover', !!e.target.closest('.hero__slide.is-current .hero__copy, .hero__controls'));
    });
    hero.addEventListener('pointerleave', function () { hold('hover', false); });
    // keyboard focus in the hero holds the slides while it stays there, so the focused button never slides away
    // (a mouse click does not)
    hero.addEventListener('focusin', function (e) {
      var kb = false;
      try { kb = e.target.matches(':focus-visible'); } catch (err) { /* older browsers: no hold */ }
      hold('focus', kb);
    });
    hero.addEventListener('focusout', function (e) {
      if (!(e.relatedTarget && hero.contains(e.relatedTarget))) hold('focus', false);
    });
    // slide 1's time starts once the page has let the hero's entrance run (index.html <head>: hero-wait)
    var root = document.documentElement;
    if (root.classList.contains('hero-wait')) {
      hold('wait', true);
      new MutationObserver(function (m, obs) {
        if (root.classList.contains('hero-wait')) return;
        obs.disconnect();
        hold('wait', false);
      }).observe(root, { attributes: true, attributeFilter: ['class'] });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        hold('offscreen', entries[entries.length - 1].intersectionRatio < .5);
      }, { threshold: [0, .5, 1] }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () { hold('hidden', document.hidden); });

    // swipe (touch and pen anywhere but the controls; a mouse only from the photo, so the text stays selectable): the
    // copy follows at a third of the travel and the slide changes past 48 px or a quick flick, else it springs back
    var sw = null, dragged = false;
    hero.addEventListener('pointerdown', function (e) {
      if (e.button || e.target.closest('.hero__controls') || (e.pointerType === 'mouse' && e.target.closest('.hero__copy'))) return;
      sw = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId, on: false, dx: 0 };
      dragged = false;
    });
    hero.addEventListener('pointermove', function (e) {
      if (!sw || e.pointerId !== sw.id) return;
      var dx = e.clientX - sw.x, dy = e.clientY - sw.y;
      if (!sw.on) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) { if (Math.abs(dy) > 12) sw = null; return; }
        sw.on = dragged = true;
        try { hero.setPointerCapture(e.pointerId); } catch (err) { /* the swipe works without it */ }
        hero.classList.remove('is-settling');
        hero.classList.add('is-dragging');
        hold('drag', true);
      }
      sw.dx = dx;
      hero.style.setProperty('--drag', (dx / 3).toFixed(1) + 'px');
      hero.style.setProperty('--drag-o', (1 - Math.min(Math.abs(dx) / 900, .35)).toFixed(3));
    });
    function swipeEnd(e) {
      if (!sw || e.pointerId !== sw.id) return;
      var s = sw;
      sw = null;
      if (!s.on) return;
      hero.classList.remove('is-dragging');
      hold('drag', false);
      if (e.type === 'pointerup' && (Math.abs(s.dx) > 48 || (Math.abs(s.dx) > 24 && Math.abs(s.dx) / Math.max(1, e.timeStamp - s.t) > .35))) {
        var dir = s.dx < 0 ? 1 : -1;
        go(cur + dir, { direct: true, dir: dir, drag: (s.dx / 3).toFixed(1), dragO: hero.style.getPropertyValue('--drag-o') });
      } else {
        hero.classList.add('is-settling');
        setTimeout(function () { hero.classList.remove('is-settling'); }, 320);
      }
      hero.style.removeProperty('--drag');
      hero.style.removeProperty('--drag-o');
      setTimeout(function () { dragged = false; });
    }
    hero.addEventListener('pointerup', swipeEnd);
    hero.addEventListener('pointercancel', swipeEnd);

    // slides 2-4's photos once the page has loaded (and the browser is idle, at most 1 s later)
    function askAll() { for (var k = 1; k < n; k++) want(k); }
    function whenIdle() { if (window.requestIdleCallback) requestIdleCallback(askAll, { timeout: 1000 }); else setTimeout(askAll, 1000); }
    if (document.readyState === 'complete') whenIdle(); else window.addEventListener('load', whenIdle);
    tick();
  }

  // Search engines: the company and its units with address and phone (js/schema.js; the same graph is in the page's
  // HTML for crawlers without JavaScript, data-ld="site")
  function addStructuredData() {
    NV.addJSONLD(window.NV_SCHEMA.landing(D, { lang: NV.LANG, root: NV.ROOT_URL, home: NV.HOME_URL }), 'site');
  }

  render();
  addStructuredData();
  bind();
  initMap();
  heroSlider();
  NV.holdQuickbar($('.hero__actions'));
  // O nama's "Svi kontakti" lands here as ?prikaz=popis#lokacije: open the list, where every unit's contacts are
  if (params.get('prikaz') === 'popis') setView('list');

  // keep open/closed status live
  setInterval(render, 60000);
})();
