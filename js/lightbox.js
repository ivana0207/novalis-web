/* Galerija lightbox (every store page; js/poslovnica.js calls NV.lightbox with its gallery). A photo opens enlarged in a
   modal <dialog> over the page, which blurs under a dark veil. The arrows, the keyboard's ← and →, and a swipe of the
   finger (or a mouse drag) slide to the previous or next photo, round from the last back to the first. The X in the top
   right corner, Esc, the phone's back button or a click anywhere outside the photo closes it, and focus goes back to
   that photo's tile in the gallery. Only photos open it: photo slots still waiting for a photo stay as they are. A photo
   still on its way shows a loading panel in its place, and one that can't load a still panel with the image icon.
   Three slides (previous, current, next) sit side by side; a slide moves the track one width, then the slide that left
   the screen is filled with the next photo in line and moved to the far side. */
(function () {
  'use strict';

  var NV = window.NV;
  var EASE = 'cubic-bezier(.22, 1, .36, 1)';
  // texts in the page language (NV.LANG); of(i, n): the counter read out before the caption, "Fotografija 2 od 10: "
  var TEXTS = {
    hr: { gallery: 'Galerija', close: 'Zatvori galeriju', prev: 'Prethodna fotografija', next: 'Sljedeća fotografija',
      of: function (i, n) { return 'Fotografija ' + i + ' od ' + n + ': '; } },
    en: { gallery: 'Gallery', close: 'Close gallery', prev: 'Previous photo', next: 'Next photo',
      of: function (i, n) { return 'Photo ' + i + ' of ' + n + ': '; } }
  };
  var T = TEXTS[NV.LANG] || TEXTS.hr;
  var still = matchMedia('(prefers-reduced-motion: reduce)');

  function svg(d) {
    return '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
  }
  function tx(x) { return 'translate3d(' + (typeof x === 'number' ? x + 'px' : x) + ',0,0)'; }

  // list: the element holding the gallery's [data-photo] buttons (data-photo = the photo's index in photos);
  // photos: [{ src, alt, caption }], caption as HTML (escaped, unit names in translate="no")
  NV.lightbox = function (list, photos) {
    var n = photos.length, i = 0;
    var dlg, stage, track, slides, count, text, anim = null, settle = null, x = 0, drag = null, dragged = false;
    if (!list || !n) return;

    function mod(k) { return (k % n + n) % n; }

    function build() {
      dlg = document.createElement('dialog');
      dlg.className = 'lightbox' + (n > 1 ? '' : ' lightbox--one');
      dlg.setAttribute('aria-label', T.gallery);
      dlg.innerHTML =
        '<div class="lightbox__stage"><div class="lightbox__track">' +
          '<div class="lightbox__slide"><div class="lightbox__frame"><img class="lightbox__img" alt="" draggable="false"></div></div>'.repeat(3) +
        '</div></div>' +
        '<p class="lightbox__cap" aria-live="polite"><span class="lightbox__count"></span><span class="lightbox__text"></span></p>' +
        '<button type="button" class="lightbox__btn lightbox__close" aria-label="' + T.close + '">' + svg('M6 6l12 12M18 6 6 18') + '</button>' +
        (n > 1 ? '<button type="button" class="lightbox__btn lightbox__nav lightbox__nav--prev" aria-label="' + T.prev + '">' + svg('M15 5l-7 7 7 7') + '</button>' +
          '<button type="button" class="lightbox__btn lightbox__nav lightbox__nav--next" aria-label="' + T.next + '">' + svg('M9 5l7 7-7 7') + '</button>' : '');
      stage = dlg.querySelector('.lightbox__stage');
      track = dlg.querySelector('.lightbox__track');
      count = dlg.querySelector('.lightbox__count');
      text = dlg.querySelector('.lightbox__text');
      slides = [].map.call(dlg.querySelectorAll('.lightbox__slide'), function (el) {
        var s = { el: el, frame: el.querySelector('.lightbox__frame'), img: el.querySelector('img') };
        s.img.addEventListener('load', function () { mark(s); });
        s.img.addEventListener('error', function () { mark(s); });
        return s;
      });
      document.body.appendChild(dlg);

      dlg.addEventListener('click', function (e) {
        if (dragged) { dragged = false; return; }   // the click that ends a swipe
        if (e.target.closest('.lightbox__nav--prev')) go(-1);
        else if (e.target.closest('.lightbox__nav--next')) go(1);
        else if (!e.target.closest('.lightbox__img')) dlg.close();   // the X, or anywhere outside the photo
      });
      dlg.addEventListener('keydown', function (e) {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); go(e.key === 'ArrowLeft' ? -1 : 1); }
      });
      dlg.addEventListener('close', function () {
        settleNow();
        document.documentElement.classList.remove('has-lightbox');
        var tile = list.querySelector('[data-photo="' + i + '"]');
        if (tile) tile.focus();
      });

      // swipe: a finger (or a mouse) moving sideways drags the track; let go past a sixth of the screen, or flick, and
      // it slides on to the next photo, else it springs back. Up and down is left to the browser (touch-action in css).
      stage.addEventListener('pointerdown', function (e) {
        dragged = false;
        if (n < 2 || !e.isPrimary || e.button > 0) return;
        if (e.pointerType === 'mouse') e.preventDefault();   // no text selection while dragging
        settleNow();
        drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: e.timeStamp, on: false };
      });
      stage.addEventListener('pointermove', function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
        if (!drag.on) {
          if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
          if (Math.abs(dx) < 8) return;
          drag.on = true;
          stage.setPointerCapture(e.pointerId);
          dlg.classList.add('is-dragging');
        }
        x = dx;
        track.style.transform = tx(x);
      });
      function release(e) {
        if (!drag || e.pointerId !== drag.id) return;
        var d = drag, dx = e.clientX - d.x0, fast = Math.abs(dx) > 30 && Math.abs(dx) / Math.max(1, e.timeStamp - d.t0) > .45;
        drag = null;
        if (!d.on) return;
        // a mouse's click follows its pointerup at once; a finger's swipe makes none, so the flag must not wait for one
        dragged = e.type === 'pointerup';
        setTimeout(function () { dragged = false; });
        dlg.classList.remove('is-dragging');
        if (dragged && (Math.abs(dx) > stage.clientWidth / 6 || fast)) go(dx < 0 ? 1 : -1);
        else slide(0);
      }
      stage.addEventListener('pointerup', release);
      stage.addEventListener('pointercancel', release);
    }

    // A slide's state, read from its photo as it is now (so a load that ends after the slide took another photo changes
    // nothing): still coming, the frame shows the loading panel (css is-loading); failed, the still panel with the image
    // icon (is-failed); there, --r = the photo's width / height, which css fits to the frame (enlarged where it is smaller).
    function mark(s) {
      var img = s.img, ok = img.complete && img.naturalWidth > 0;
      if (ok) img.style.setProperty('--r', img.naturalWidth / img.naturalHeight);
      s.frame.classList.toggle('is-loading', !img.complete);
      s.frame.classList.toggle('is-failed', img.complete && !ok);
    }
    function fill(s, k) {
      var ph = photos[mod(k)];
      if (s.img.getAttribute('src') !== ph.src) { s.img.style.removeProperty('--r'); s.img.src = ph.src; }
      mark(s);
      s.img.alt = ph.alt;
    }
    // slides in order previous, current, next; only the current one is read out
    function place() {
      slides.forEach(function (s, k) {
        s.el.style.transform = k === 1 ? '' : tx((k - 1) * 100 + '%');
        if (k === 1) s.el.removeAttribute('aria-hidden'); else s.el.setAttribute('aria-hidden', 'true');
      });
    }
    function caption() {
      count.innerHTML = n > 1 ? '<span aria-hidden="true">' + (i + 1) + ' / ' + n + '</span><span class="vh">' + T.of(i + 1, n) + '</span>' : '';
      text.innerHTML = photos[i].caption;
    }

    // d: 1 slides on to the next photo, -1 back to the previous, 0 springs back to the current one
    function slide(d) {
      var from = x, to = d ? -d * 100 + '%' : 0;
      x = 0;
      function done() {
        if (d > 0) slides.push(slides.shift());
        if (d < 0) slides.unshift(slides.pop());
        if (d) { place(); fill(slides[d > 0 ? 2 : 0], i + d); }
        track.style.transform = '';
        var a = anim;
        anim = settle = null;
        if (a) a.cancel();   // after the slides moved, so the frame never shows the old place
      }
      if (still.matches || (!d && !from)) { done(); return; }
      var rest = d ? 1 - Math.min(1, Math.abs(from) / stage.clientWidth) : Math.min(1, Math.abs(from) / stage.clientWidth);
      anim = track.animate([{ transform: tx(from) }, { transform: tx(to) }], { duration: 180 + 240 * rest, easing: EASE, fill: 'forwards' });
      settle = done;
      anim.onfinish = function () { if (settle === done) done(); };
    }
    // a slide still running ends at once (another arrow press, a new swipe, closing)
    function settleNow() { if (settle) settle(); }

    function go(d) {
      if (n < 2) return;
      settleNow();
      i = mod(i + d);
      caption();
      slide(d);
    }

    function open(k) {
      if (!dlg) build();
      settleNow();
      i = k;
      fill(slides[1], i);
      if (n > 1) { fill(slides[0], i - 1); fill(slides[2], i + 1); }
      place();
      caption();
      document.documentElement.classList.add('has-lightbox');
      dlg.showModal();
    }

    list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-photo]');
      if (b) open(+b.dataset.photo);
    });
  };
})();
