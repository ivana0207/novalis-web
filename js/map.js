/* Novalis maps — the landing page's Lokacije map (js/app.js) and each store page's map (js/poslovnica.js).
   MapLibre GL JS (js/vendor/maplibre-gl-5.24.0, the last release that runs as a plain script, so pages still open from
   disk) draws OpenStreetMap data from OpenFreeMap: free, no key, no cookies. Its Positron style is tinted to the site's
   warm neutrals and carries no shop or restaurant labels, so other businesses don't show. The library (~275 KB gzipped)
   loads only when a map comes near the screen; if it can't run (no WebGL, offline), the page shows its fallback note. */
window.NV.map = (function () {
  'use strict';

  var LIB = (document.body.dataset.root || '') + 'js/vendor/maplibre-gl-5.24.0/maplibre-gl';
  var STYLE = 'https://tiles.openfreemap.org/styles/positron';
  // Pag and the coast around it: the map can't be dragged away from Novalja
  var BOUNDS = [[14.55, 44.25], [15.35, 44.85]];

  // Croatian labels for MapLibre's buttons, the map itself and the two-finger hint
  var LOCALE = {
    'Map.Title': 'Karta',
    'NavigationControl.ZoomIn': 'Povećaj',
    'NavigationControl.ZoomOut': 'Smanji',
    'GeolocateControl.FindMyLocation': 'Prikaži moju lokaciju',
    'GeolocateControl.LocationNotAvailable': 'Lokacija nije dostupna',
    'AttributionControl.ToggleAttribution': 'Prikaži ili sakrij izvore karte',
    'CooperativeGesturesHandler.WindowsHelpText': 'Za zumiranje držite Ctrl i pomičite kotačić miša',
    'CooperativeGesturesHandler.MacHelpText': 'Za zumiranje držite ⌘ i pomičite kotačić miša',
    'CooperativeGesturesHandler.MobileHelpText': 'Kartu pomičite s dva prsta'
  };

  // Positron layer id → paint changes: warm land (the old placeholder's #EFEBE5), slate-tinted sea, white streets,
  // labels in the brand's slate and greys
  var PAINT = {
    background: { 'background-color': '#EFEBE5' },
    landuse_residential: { 'fill-color': '#EAE5DD' },
    park: { 'fill-color': '#E3E3D6' },
    landcover_wood: { 'fill-color': '#E1E2D4' },
    water: { 'fill-color': '#C9D7DD' },
    waterway: { 'line-color': '#C9D7DD' },
    building: { 'fill-color': '#E4DED5', 'fill-outline-color': '#D8D0C4' },
    road_area_pier: { 'fill-color': '#EFEBE5' },
    road_pier: { 'line-color': '#EFEBE5' },
    highway_path: { 'line-color': '#F8F6F2' },
    highway_minor: { 'line-color': '#FFFFFF' },
    highway_major_casing: { 'line-color': '#DCD3C7' },
    highway_major_inner: { 'line-color': '#FFFFFF' },
    highway_major_subtle: { 'line-color': 'rgba(200, 188, 172, .6)' },
    highway_motorway_casing: { 'line-color': '#D6CBBD' },
    highway_motorway_subtle: { 'line-color': 'rgba(200, 188, 172, .6)' },
    boundary_2: { 'line-color': '#C9BCAB' },
    boundary_3: { 'line-color': '#C9BCAB' },
    'highway-name-path': { 'text-color': '#737373', 'text-halo-color': '#FFFFFF' },
    'highway-name-minor': { 'text-color': '#575756', 'text-halo-color': '#FFFFFF' },
    'highway-name-major': { 'text-color': '#575756', 'text-halo-color': '#FFFFFF' },
    water_name_point_label: { 'text-color': '#667A85', 'text-halo-color': 'rgba(255, 255, 255, .7)' },
    water_name_line_label: { 'text-color': '#667A85', 'text-halo-color': 'rgba(255, 255, 255, .7)' },
    label_other: { 'text-color': '#3D4A54', 'text-halo-color': '#EFEBE5' },
    label_village: { 'text-color': '#3D4A54', 'text-halo-color': '#EFEBE5' },
    label_town: { 'text-color': '#262626', 'text-halo-color': '#EFEBE5' },
    label_city: { 'text-color': '#262626', 'text-halo-color': '#EFEBE5' }
  };

  function tint(map) {
    Object.keys(PAINT).forEach(function (id) {
      if (!map.getLayer(id)) return;
      Object.keys(PAINT[id]).forEach(function (prop) { map.setPaintProperty(id, prop, PAINT[id][prop]); });
    });
  }

  /* ---------------- Loading ---------------- */
  // The library's stylesheet and script, once for every map on the page; done(maplibregl) or done(null) if it failed.
  var waiting = null;
  function load(done) {
    if (window.maplibregl) return done(window.maplibregl);
    if (waiting) return waiting.push(done);
    waiting = [done];
    var left = 2;
    function settle() {
      if (--left) return;
      var q = waiting;
      waiting = null;
      q.forEach(function (f) { f(window.maplibregl || null); });
    }
    var css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = LIB + '.css';
    css.onload = css.onerror = settle;
    var js = document.createElement('script');
    js.src = LIB + '.js';
    js.onload = js.onerror = settle;
    // ahead of the site's stylesheets, so css/styles.css restyles the map's buttons without fighting over specificity
    document.head.insertBefore(css, document.querySelector('link[rel="stylesheet"][href*="css/ds.css"]'));
    document.head.appendChild(js);
  }

  // cb() once el comes within 600 px of the screen (a hidden map waits until it is shown)
  function near(el, cb) {
    if (!('IntersectionObserver' in window)) return cb();
    var io = new IntersectionObserver(function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      io.disconnect();
      cb();
    }, { rootMargin: '600px 0px' });
    io.observe(el);
  }

  /* ---------------- Map ---------------- */
  // A map drawn into el (an empty box that fills its frame). opts go to maplibregl.Map (center + zoom, or bounds);
  // label names the map for screen readers. ready(map, maplibregl) runs once it exists; fail() if it can't.
  function create(el, opts, ready, fail) {
    near(el, function () {
      load(function (gl) {
        if (!gl) return fail();
        var map, styled = false, failed = false;
        try {
          map = new gl.Map(Object.assign({
            container: el, style: STYLE, locale: LOCALE, maxBounds: BOUNDS, maxZoom: 19,
            attributionControl: { compact: true }, cooperativeGestures: true,
            dragRotate: false, pitchWithRotate: false, touchPitch: false, maxPitch: 0
          }, opts.map));
        } catch (e) {
          return fail();
        }
        map.touchZoomRotate.disableRotation();
        map.keyboard.disableRotation();
        map.getCanvas().setAttribute('aria-label', opts.label);
        map.on('style.load', function () { styled = true; tint(map); });
        // the style itself didn't arrive (offline, tile server down): drop the map, show the page's note
        map.on('error', function () {
          if (styled || failed) return;
          failed = true;
          map.remove();
          fail();
        });
        map.addControl(new gl.NavigationControl({ showCompass: false }), 'top-right');
        keepInFrame(el.parentNode);
        ready(map, gl);
      });
    });
  }

  // Tabbing to a pin outside the visible map makes the browser scroll the clipped map box; scroll it straight back
  // (the page moves the map to the pin instead).
  function keepInFrame(frame) {
    frame.addEventListener('scroll', function (e) {
      e.target.scrollTop = 0;
      e.target.scrollLeft = 0;
    }, true);
  }

  // Pins closer than MIN px push apart, side by side when they share a spot (Market Novalis and B&B Novalis), so each
  // stays clickable when zoomed out; zoomed in, every pin sits on its own spot. Run on every zoom step.
  var MIN = 38;
  function spread(map, markers) {
    var pts = markers.map(function (m) {
      var p = map.project(m.getLngLat());
      return { x: p.x, y: p.y, dx: 0, dy: 0 };
    });
    for (var round = 0, moved = true; moved && round < 12; round++) {
      moved = false;
      for (var i = 0; i < pts.length; i++) {
        for (var j = i + 1; j < pts.length; j++) {
          var a = pts[i], b = pts[j];
          var vx = b.x + b.dx - a.x - a.dx, vy = b.y + b.dy - a.y - a.dy, d = Math.sqrt(vx * vx + vy * vy);
          if (d >= MIN) continue;
          if (d < 0.5) { vx = 1; vy = 0; d = 1; } // same spot: the earlier pin goes left
          var push = (MIN - d) / 2 / d;
          a.dx -= vx * push; a.dy -= vy * push;
          b.dx += vx * push; b.dy += vy * push;
          moved = true;
        }
      }
    }
    markers.forEach(function (m, k) { m.setOffset([pts[k].dx, pts[k].dy]); });
  }

  // [lng, lat] for MapLibre from a unit's geo: [lat, lng]
  function lngLat(u) { return [u.geo[1], u.geo[0]]; }

  return { create: create, spread: spread, lngLat: lngLat };
})();
