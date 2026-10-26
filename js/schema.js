/* Novalis structured data for search engines (schema.org JSON-LD), built from data/units.js. The one builder for both
   places that publish it: the pages (js/app.js on the landing, js/poslovnica.js on each store page, through
   NV.addJSONLD) and tools/static-fallback.js, which writes the same JSON-LD into those pages' HTML for crawlers that
   don't run JavaScript (WEB-22). No DOM here, so Node runs this file too.
   o (every builder): { lang: the page language, root: the site root, home: the page's home page, page: the page itself
   (absolute addresses, from the canonical link) }. A store page also takes homeLabel (the breadcrumb's first step) and,
   in the browser, year + specialDays (NV.specialDays): hours that need dates (seasons, public holidays, exceptions) are
   dated with the year in Novalja, so the HTML, which can't know the year, leaves them to the page script. */
window.NV_SCHEMA = (function () {
  'use strict';

  var has = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
  // A data item's text in language lang: its en: { … } field on an English page, else the Croatian one (as NV.tx)
  function tx(item, key, lang) {
    var l = lang !== 'hr' && item[lang];
    return l && has(l, key) ? l[key] : item[key];
  }
  // A unit's page content in language lang: page.en replaces page fields whole (as js/poslovnica.js)
  function pageOf(u, lang) { return Object.assign({}, u.page, lang !== 'hr' && u.page[lang] || {}); }
  // Units in category order, the order of menus, cards and unit numbers (as NV.units)
  function units(D) {
    var ids = D.categories.map(function (c) { return c.id; });
    return D.units.slice().sort(function (a, b) { return ids.indexOf(a.category) - ids.indexOf(b.category); });
  }
  // A unit's store page from the site root in language lang (as NV.unitHref: the English twin under en/, en.slug
  // where it has one)
  function unitPath(u, lang) {
    return lang === 'en' ? 'en/' + ((u.en && u.en.slug) || u.slug) + '/' : u.slug + '/';
  }
  // Directions and listing as NV.mapsHref: the official Google Business listing, else a route to the map spot
  function mapsHref(u) {
    return u.gmaps || 'https://www.google.com/maps/dir/?api=1&destination=' + u.geo.join(',');
  }

  // The company: one @id on every page, whatever the page's language
  function org(D, o) { return { '@type': 'Organization', '@id': o.root + '#organizacija', name: D.company.name, url: o.root }; }
  function postalAddress(D, address) {
    var street = address.split(',')[0].trim();
    return {
      '@type': 'PostalAddress', streetAddress: street === D.company.town ? undefined : street,
      addressLocality: D.company.town, postalCode: D.company.postalCode, addressCountry: 'HR'
    };
  }
  // A unit's own page (or website): its @id, so the landing page and the store page describe the same business.
  // Always the Croatian page's address, so the English pages name the same business.
  function unitId(u, o) { return u.url ? u.url : o.root + u.slug + '/#poslovnica'; }
  // The map spot, unless data/units.js says it is an estimate (geoEstimate: Veleprodaja)
  function geo(u) {
    return u.geo && !u.geoEstimate ? { '@type': 'GeoCoordinates', latitude: u.geo[0], longitude: u.geo[1] } : undefined;
  }
  // The unit's own pages elsewhere: its website (schema.sameAs, B&B Novalis) and its Google Business listing, unless
  // the listing is another unit's (gmapsOf: Veleprodaja uses Hiper Novalis's)
  function sameAs(u) {
    var s = [].concat(u.schema.sameAs || [], u.gmaps && !u.gmapsOf ? [u.gmaps] : []);
    return s.length > 1 ? s : s[0];
  }
  // The departments of a unit whose offer lines say what they sell (['text', floor, 'details']: Hiper Novalis,
  // Hiper Bau, Veleprodaja): every offer line as a catalogue of its own, with its details where it has them
  function offerCatalog(p) {
    if (!p.offer.some(function (it) { return typeof it !== 'string' && it[2]; })) return undefined;
    return {
      '@type': 'OfferCatalog', itemListElement: p.offer.map(function (it) {
        return typeof it === 'string' ? { '@type': 'OfferCatalog', name: it }
          : { '@type': 'OfferCatalog', name: it[0], description: it[2] || undefined };
      })
    };
  }

  /* ---------------- Opening hours ---------------- */
  // Only confirmed opening hours are published (hoursConfirmed); placeholders would show wrong hours on Google.
  var DOW = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  function sameAllYear(u) { return JSON.stringify(u.hours.summer) === JSON.stringify(u.hours.winter); }
  // Hours that need no date: one table all year, no public holidays closed, no exceptions
  function undated(u) { return sameAllYear(u) && !u.closedOnHolidays && !Object.keys(u.exceptions || {}).length; }
  function hoursSpec(hrs, from, through) {
    var specs = [];
    hrs.forEach(function (t, d) {
      if (!t) return;
      var closes = t[1] === '24:00' ? '23:59' : t[1];
      var spec = specs.filter(function (x) { return x.opens === t[0] && x.closes === closes; })[0];
      if (spec) spec.dayOfWeek.push(DOW[d]);
      else specs.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: [DOW[d]], opens: t[0], closes: closes, validFrom: from, validThrough: through });
    });
    return specs;
  }
  // The weekly hours; the seasons are dated with year y (in Novalja)
  function openingHours(D, u, y) {
    if (!u.hoursConfirmed || !(y || undated(u))) return undefined;
    if (sameAllYear(u)) return hoursSpec(u.hours.summer);
    var S = D.seasons.summer;
    var isoDay = function (md, shift) {
      return new Date(Date.UTC(y, +md.slice(0, 2) - 1, +md.slice(3) + (shift || 0))).toISOString().slice(0, 10);
    };
    return hoursSpec(u.hours.winter, isoDay('01-01'), isoDay(S.start, -1))
      .concat(hoursSpec(u.hours.summer, isoDay(S.start), isoDay(S.end)))
      .concat(hoursSpec(u.hours.winter, isoDay(S.end, 1), isoDay('12-31')));
  }
  // Year y's days with hours of their own (public holidays the unit closes on, dated exceptions; specialDays:
  // NV.specialDays); closed all day is 00:00 - 00:00.
  function specialHours(u, y, specialDays) {
    if (!u.hoursConfirmed || !y || !specialDays) return undefined;
    var specs = specialDays(u, y).map(function (s) {
      var t = s.t || ['00:00', '00:00'];
      return { '@type': 'OpeningHoursSpecification', opens: t[0], closes: t[1] === '24:00' ? '23:59' : t[1], validFrom: s.iso, validThrough: s.iso };
    });
    return specs.length ? specs : undefined;
  }

  /* ---------------- Graphs ---------------- */
  // Landing page: the site, the company and its units with address and phone (each store page describes its own unit
  // in full; opening hours are published there only, once confirmed).
  function landing(D, o) {
    var C = D.company, ORG = org(D, o);
    return {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', '@id': o.home + '#web', name: 'Novalis', url: o.home, inLanguage: o.lang, publisher: { '@id': ORG['@id'] } },
        Object.assign({}, ORG, {
          alternateName: 'Novalis', foundingDate: String(C.founded), telephone: C.tel, email: C.email,
          address: postalAddress(D, C.address),
          subOrganization: units(D).map(function (u) {
            // a unit named differently in the page language keeps its Croatian name too (Wholesale: Veleprodaja; PO, WEB-21)
            var name = tx(u, 'name', o.lang);
            return Object.assign({}, u.schema, {
              '@id': unitId(u, o), name: name, alternateName: name !== u.name ? u.name : undefined,
              url: u.url || o.root + unitPath(u, o.lang),
              address: postalAddress(D, u.address), geo: geo(u), telephone: u.tel || C.tel, sameAs: sameAs(u)
            });
          })
        })
      ]
    };
  }

  // Store page: { business, crumbs }. In the page language; a unit named differently there keeps its Croatian name
  // too (as on the home page).
  function store(D, u, o) {
    var p = pageOf(u, o.lang), name = tx(u, 'name', o.lang);
    var business = Object.assign({ '@context': 'https://schema.org' }, u.schema, {
      '@id': unitId(u, o), name: name, alternateName: name !== u.name ? u.name : undefined, description: p.lead, url: o.page,
      image: [p.photo].concat(p.gallery.map(function (g) { return g[0]; })).filter(Boolean).map(function (src) { return new URL(src, o.root).href; }),
      telephone: u.tel || D.company.tel, email: u.email, address: postalAddress(D, u.address), geo: geo(u),
      hasMap: mapsHref(u), sameAs: sameAs(u),
      openingHoursSpecification: openingHours(D, u, o.year), specialOpeningHoursSpecification: specialHours(u, o.year, o.specialDays),
      hasOfferCatalog: offerCatalog(p), parentOrganization: org(D, o)
    });
    var crumbs = {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      // "Poslovnice" is a section of the home page, not a page of its own, so the trail is two pages long
      itemListElement: [[o.homeLabel, o.home], [name, o.page]].map(function (c, i) {
        return { '@type': 'ListItem', position: i + 1, name: c[0], item: c[1] };
      })
    };
    return { business: business, crumbs: crumbs };
  }

  // JSON for a <script type="application/ld+json">, safe inside HTML too: no "<" (so no </script> or <!--), ">" or
  // "&" in the text, and no line separators that older parsers choke on.
  function json(data) {
    return JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, function (c) {
      return '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4);
    });
  }

  return { tx: tx, pageOf: pageOf, units: units, unitPath: unitPath, landing: landing, store: store, json: json };
})();
