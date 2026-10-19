/* Novalis store page (hiper-novalis/, market-novalis/, hiper-bau/, veleprodaja/, valis/, pod-zvon/) — renders one
   unit's page from data/units.js on top of js/site.js. Every store page has the same sections; only the hero takes
   the store's theme and mark. The unit comes from <body data-unit="…">. */
(function () {
  'use strict';

  var NV = window.NV, D = NV.D, $ = NV.$, esc = NV.esc, setHTML = NV.setHTML, asset = NV.asset, NEW_TAB = NV.NEW_TAB;

  var DAYS = ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota', 'Nedjelja'];

  var u = NV.byId[document.body.dataset.unit], p = u.page;
  var mapsHref = NV.mapsHref(u), telHref = NV.telHref(u), telLabel = NV.telLabel(u);
  var allYear = JSON.stringify(u.hours.summer) === JSON.stringify(u.hours.winter);

  function ico(name, size) {
    return '<span class="ms' + (size ? ' ms--' + size : '') + '" aria-hidden="true">' + name + '</span>';
  }
  function pad(n) { return (n < 9 ? '0' : '') + (n + 1); }

  /* ---------------- Opening hours ---------------- */
  function fmt(t) {
    if (!t) return 'zatvoreno';
    return t[0] === '00:00' && t[1] === '24:00' ? '0 - 24 h' : t[0] + ' - ' + t[1];
  }
  function dayRange(a, b) {
    if (a === b) return DAYS[a];
    return DAYS[a] + (b - a === 1 ? ' i ' : ' - ') + DAYS[b].toLowerCase();
  }
  // Consecutive days with the same hours share a row: "Ponedjeljak - subota · 07:00 - 19:00".
  function hourRows(hrs, today) {
    var rows = [];
    hrs.forEach(function (t, d) {
      var last = rows[rows.length - 1], time = fmt(t);
      if (last && last.time === time) last.to = d;
      else rows.push({ from: d, to: d, time: time });
    });
    return rows.map(function (r) {
      return { day: rows.length === 1 ? 'Svaki dan' : dayRange(r.from, r.to), time: r.time, today: today >= r.from && today <= r.to };
    });
  }

  // Season dates for the headings: summer 15. 5. - 30. 9., winter the rest of the year.
  var S = D.seasons.summer;
  var SEASONS = {
    summer: { title: 'Ljetno radno vrijeme', period: NV.dayMonth(S.start) + ' - ' + NV.dayMonth(S.end) },
    winter: { title: 'Zimsko radno vrijeme', period: NV.dayMonth(S.end, 1) + ' - ' + NV.dayMonth(S.start, -1) }
  };

  // today: the weekday (0 = Monday) whose row is marked in the current table, or -1 for none
  function hourBlocks(today, season) {
    if (allYear) {
      return [{ title: 'Radno vrijeme', period: 'cijele godine', now: true, rows: hourRows(u.hours.summer, today) }];
    }
    return (season === 'summer' ? ['summer', 'winter'] : ['winter', 'summer']).map(function (s) {
      var now = s === season;
      return { title: SEASONS[s].title, period: SEASONS[s].period, now: now, rows: hourRows(u.hours[s], now ? today : -1) };
    });
  }

  function statusHTML(cls, st) {
    return '<p class="' + cls + (st.open ? ' is-open' : '') + '"><span class="dot"></span>' + esc(st.text) + '</p>';
  }

  function hoursHTML(today, season) {
    return hourBlocks(today, season).map(function (b) {
      return '<div class="hours' + (b.now ? ' is-now' : '') + '">' +
        '<div class="hours__head"><h3 class="hours__title">' + esc(b.title) + '</h3>' +
          (b.now && b.period !== 'cijele godine' ? '<span class="hours__badge">Sada</span>' : '') +
          '<span class="hours__period">' + esc(b.period) + '</span></div>' +
        '<dl class="hours__rows">' + b.rows.map(function (r) {
          return '<div class="hours__row' + (r.today ? ' is-today' : '') + '"><dt>' + esc(r.day) + '</dt><dd>' + esc(r.time) + '</dd></div>';
        }).join('') + '</dl>' +
      '</div>';
    }).join('');
  }

  /* ---------------- Sections ---------------- */
  // Store names are brand names: translate="no" keeps browser translation from turning "Pod Zvon" into "Under the Bell".
  function markHTML(m) {
    var img = function (src) {
      return '<img class="store-hero__logo" src="' + esc(asset(src)) + '" alt="" width="' + m.w + '" height="' + m.h + '">';
    };
    if (m.logo) return img(m.logo);
    if (m.image) {
      return '<div class="store-hero__brand">' + img(m.image) +
        (m.script ? '<span class="store-hero__script">' + esc(m.script) + '</span>' : '') + '</div>';
    }
    if (m.lockup) return '<p class="store-hero__lockup" aria-hidden="true" translate="no"><span>' + esc(m.lockup[0]) + '</span><span>' + esc(m.lockup[1]) + '</span></p>';
    return '<p class="store-hero__word" aria-hidden="true" translate="no">' + esc(m.word) + '</p>';
  }

  function heroHTML() {
    var cta = p.cta || { label: 'Upute', href: mapsHref, icon: 'directions' };
    var ext = /^https?:/.test(cta.href) ? ' target="_blank" rel="noopener"' : '';
    return '<nav class="crumbs" aria-label="Putanja"><ol class="crumbs__list">' +
        '<li><a href="' + esc(NV.HOME) + '">Početna</a></li>' +
        '<li><a href="' + esc(NV.HOME) + '#poslovnice">Poslovnice</a></li>' +
        '<li><span aria-current="page" translate="no">' + esc(u.name) + '</span></li></ol></nav>' +
      '<section class="store-hero" aria-labelledby="h-store">' +
        '<div class="store-hero__panel">' +
          '<div class="store-hero__copy">' + markHTML(p.mark) +
            '<span class="store-hero__label">' + esc(p.label) + (p.endorse ? ' · ' + NV.logoSVG('novalis', 'red', 16) : '') + '</span>' +
            // The mark is the store's name drawn large; the heading carries the name for readers and search.
            '<h1 class="store-hero__title" id="h-store"><span class="vh" translate="no">' + esc(u.name) + ': </span>' + esc(p.title) + '</h1>' +
            '<p class="store-hero__lead">' + esc(p.lead) + '</p>' +
            '<div id="heroStatus"></div>' +
            '<div class="store-hero__actions">' +
              '<a class="btn btn--lg" href="' + esc(cta.href) + '"' + ext + '>' + esc(cta.label) + ico(cta.icon || 'arrow_forward') + (ext ? NEW_TAB : '') + '</a>' +
              '<a class="store-hero__call" href="' + esc(telHref) + '">' + ico('call', 'sm') + esc(telLabel) + '</a>' +
            '</div>' +
          '</div>' +
          '<div class="store-hero__media"><img src="' + esc(asset(p.photo)) + '" alt="' + esc(p.photoAlt) + '" fetchpriority="high"' +
            (p.photoPos ? ' style="object-position:' + esc(p.photoPos) + '"' : '') + '></div>' +
        '</div>' +
        (p.pattern === 'mosaic' ? '<div class="store-hero__pattern" aria-hidden="true"></div>' : '') +
      '</section>';
  }

  function headHTML(id, title, lead) {
    return '<div class="store-sec__head"><h2 class="store-sec__h" id="h-' + id + '"><span class="store-sec__mark" aria-hidden="true"></span>' +
      esc(title) + '</h2>' + (lead ? '<p class="store-sec__lead">' + esc(lead) + '</p>' : '') + '</div>';
  }

  function factsHTML() {
    return '<section class="store-sec store-sec--facts" aria-labelledby="h-brojke"><h2 class="vh" id="h-brojke">Ključne brojke</h2><dl class="facts">' +
      p.facts.map(function (f) {
        return '<div class="facts__item"><dt>' + esc(f[1]) + '</dt><dd>' + esc(f[0]) + '</dd></div>';
      }).join('') + '</dl></section>';
  }

  function offerHTML() {
    return '<section class="store-sec" aria-labelledby="h-ponuda">' + headHTML('ponuda', 'Ponuda', p.offerLead) +
      '<ol class="offer">' + p.offer.map(function (it, i) {
        var text = typeof it === 'string' ? it : it[0], meta = typeof it === 'string' ? '' : it[1];
        return '<li class="offer__item"><span class="offer__n" aria-hidden="true">' + pad(i) + '</span><span class="offer__body">' +
          '<span class="offer__text">' + esc(text) + '</span>' + (meta ? '<span class="offer__meta">' + esc(meta) + '</span>' : '') +
          '</span></li>';
      }).join('') + '</ol>' +
      (p.offerNote ? '<p class="offer__note">' + esc(p.offerNote) + '</p>' : '') +
    '</section>';
  }

  function galleryHTML() {
    return '<section class="store-sec" aria-labelledby="h-galerija">' + headHTML('galerija', 'Galerija') +
      '<ul class="gallery">' + p.gallery.map(function (g) {
        return '<li class="gallery__item">' + NV.slotHTML(asset(g[0]), g[1], g[1]) + '</li>';
      }).join('') + '</ul></section>';
  }

  function visitHTML() {
    return '<section class="store-sec" aria-labelledby="h-posjet">' + headHTML('posjet', 'Radno vrijeme i lokacija') +
      '<div class="visit">' +
        '<div class="visit__hours" id="visitHours"></div>' +
        '<div class="visit__place" id="karta">' +
          '<div class="store-map">' +
            '<div class="store-map__canvas" id="storeMap"></div>' +
            '<p class="map__note map__note--fail" id="storeMapFail" hidden>Karta se trenutno ne može prikazati. ' +
              '<a class="map__link" href="' + esc(mapsHref) + '" target="_blank" rel="noopener">Otvori u Google Maps' + NEW_TAB + '</a></p>' +
          '</div>' +
          '<div class="visit__info">' +
            '<div class="visit__addr"><span class="visit__name" translate="no">' + esc(u.name) + '</span>' + NV.addrHTML(u, 'visit__street') +
              (u.email ? '<a href="mailto:' + esc(u.email) + '">' + esc(u.email) + '</a>' : '') + '</div>' +
            '<div class="visit__actions">' +
              '<a class="btn-sm btn-sm--accent" href="' + esc(mapsHref) + '" target="_blank" rel="noopener">' + ico('directions', 'sm') + 'Upute' + NEW_TAB + '</a>' +
              '<a class="btn-sm" href="' + esc(telHref) + '">' + ico('call', 'sm') + esc(telLabel) + '</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  // A small map around the store (js/map.js), with its pin in the store's colour; the Upute button below it routes there.
  // With a Google Business listing (gmaps) the pin is a link to it; otherwise it only marks the spot.
  function initMap() {
    if (!NV.map) { $('#storeMapFail').hidden = false; return; } // js/map.js didn't load
    NV.map.create($('#storeMap'), {
      label: 'Karta: ' + u.name + ', ' + u.address,
      map: { center: NV.map.lngLat(u), zoom: 16 }
    }, function (map, gl) {
      var place = NV.placeHref(u);
      var mk = NV.map.pin(map, gl, u, place
        ? '<a class="pin pin--store" href="' + esc(place) + '" target="_blank" rel="noopener" title="' + NV.PLACE_TITLE + '">' +
            '<span class="pin__head"></span><span class="vh"><span translate="no">' + esc(u.name) + '</span> na Google kartama' + NEW_TAB + '</span></a>'
        : '<span class="pin pin--store"><span class="pin__head"></span></span>');
      if (!place) mk.getElement().setAttribute('aria-hidden', 'true'); // a plain mark: the map's own label names the place
    }, function (hadFocus) {
      $('#storeMapFail').hidden = false;
      if (hadFocus) $('#storeMapFail a').focus();
    });
  }

  // The landing page's unit cards (NV.cardHTML), with today's hours (renderLive); each shows the photo its own page leads with.
  function relatedHTML() {
    return '<section class="store-sec store-sec--last" aria-labelledby="h-povezane">' + headHTML('povezane', 'Povezane poslovnice') +
      '<div class="cards" id="related"></div></section>';
  }
  function relatedCardsHTML(z) {
    return p.related.map(function (id, i) {
      var r = NV.byId[id];
      return NV.cardHTML(NV.cardData(r, NV.unitStatus(r, z), r.page && r.page.photo), i);
    }).join('');
  }

  /* ---------------- Search engines ---------------- */
  // Only confirmed opening hours are published to search engines; placeholders would show wrong hours on Google.
  var DOW = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  // The dated hours below are for this year in Novalja (not in the visitor's time zone, which may already be in the next)
  var YEAR = NV.zagrebNow().y;
  function isoDay(md, shift) {
    var dt = new Date(Date.UTC(YEAR, +md.slice(0, 2) - 1, +md.slice(3) + (shift || 0)));
    return dt.toISOString().slice(0, 10);
  }
  function hoursSpec(hrs, from, through) {
    var specs = [];
    hrs.forEach(function (t, d) {
      if (!t) return;
      var closes = t[1] === '24:00' ? '23:59' : t[1];
      var spec = specs.find(function (x) { return x.opens === t[0] && x.closes === closes; });
      if (spec) spec.dayOfWeek.push(DOW[d]);
      else specs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: [DOW[d]], opens: t[0], closes: closes, validFrom: from, validThrough: through });
    });
    return specs;
  }
  function openingHours() {
    if (!u.hoursConfirmed) return undefined;
    if (allYear) return hoursSpec(u.hours.summer);
    return hoursSpec(u.hours.winter, isoDay('01-01'), isoDay(S.start, -1))
      .concat(hoursSpec(u.hours.summer, isoDay(S.start), isoDay(S.end)))
      .concat(hoursSpec(u.hours.winter, isoDay(S.end, 1), isoDay('12-31')));
  }
  // This year's days with hours of their own (public holidays the unit closes on, dated exceptions); closed all day is
  // 00:00 - 00:00.
  function specialHours() {
    if (!u.hoursConfirmed) return undefined;
    var specs = NV.specialDays(u, YEAR).map(function (s) {
      var t = s.t || ['00:00', '00:00'];
      return { '@type': 'OpeningHoursSpecification', opens: t[0], closes: t[1] === '24:00' ? '23:59' : t[1], validFrom: s.iso, validThrough: s.iso };
    });
    return specs.length ? specs : undefined;
  }

  function addStructuredData() {
    var business = Object.assign({ '@context': 'https://schema.org' }, u.schema, {
      '@id': NV.unitId(u), name: u.name, description: p.lead, url: NV.PAGE_URL,
      image: [p.photo].concat(p.gallery.map(function (g) { return g[0]; })).filter(Boolean).map(function (src) { return NV.absUrl(asset(src)); }),
      telephone: u.tel || D.company.tel, email: u.email, address: NV.postalAddress(u.address), hasMap: mapsHref,
      openingHoursSpecification: openingHours(), specialOpeningHoursSpecification: specialHours(), parentOrganization: NV.ORG
    });
    var crumbs = {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      // "Poslovnice" is a section of the home page, not a page of its own, so the trail is two pages long
      itemListElement: [['Početna', NV.HOME_URL], [u.name, NV.PAGE_URL]].map(function (c, i) {
        return { '@type': 'ListItem', position: i + 1, name: c[0], item: c[1] };
      })
    };
    NV.addJSONLD(business);
    NV.addJSONLD(crumbs);
  }

  /* ---------------- Render ---------------- */
  function renderLive() {
    var z = NV.zagrebNow(), season = NV.currentSeason(z), st = NV.unitStatus(u, z);
    setHTML($('#heroStatus'), statusHTML('store-hero__status', st));
    // a day with hours of its own (holiday, exception) marks no weekday row: the status above says it all
    setHTML($('#visitHours'), statusHTML('visit__status', st) + hoursHTML(st.regular ? z.day : -1, season));
    related.render(relatedCardsHTML(z));
  }

  $('.page').classList.add('store', 'store--' + p.theme);
  $('#store').innerHTML = heroHTML() + factsHTML() + offerHTML() + galleryHTML() + visitHTML() + relatedHTML();
  // the related cards rise in like the landing page's the first time they come into view (NV.cardGrid)
  var related = NV.cardGrid($('#related'));
  $('#qbCall').href = telHref;
  NV.holdQuickbar($('.store-hero__actions'));
  renderLive();
  initMap();
  addStructuredData();

  // keep open/closed status live
  setInterval(renderLive, 60000);
})();
