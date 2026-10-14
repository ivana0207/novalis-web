/* O nama: the story sections appear group by group as the visitor scrolls to them (desktop, ≥ 1024 only).
   Groups that come into view together appear in reading order (top to bottom, then left to right), 120 ms apart:
   text fades up, photos are unveiled from the top down (css, [data-reveal="photo"]). A photo that is still loading is
   waited for (up to 0.8 s), so it never pops in half way through its reveal.
   The story is in the page from the start: this script only adds .story--anim (css hides the groups not shown yet)
   once the observer runs, so without JS, on phones and tablets, with reduced motion or if anything here fails,
   everything is simply visible. The opening H1 and text are never hidden. */
(function () {
  'use strict';

  var STAGGER = 120, MAX_DELAY = 480, IMG_WAIT = 800;
  var desktop = window.matchMedia('(min-width: 1024px)');
  var secs = NV.$$('.story');
  var groups = NV.$$('.story [data-reveal]');
  if (!groups.length || NV.reduceMotion || !desktop.matches || !('IntersectionObserver' in window)) return;

  var io = null, nextAt = 0, raf = 0;
  var queued = function (el) { return !!el._queued; };

  function reveal(el, delay) {
    el.style.setProperty('--reveal-delay', Math.round(delay) + 'ms');
    el.classList.add('is-in');
  }

  // Queue one group. staggered: it follows the group queued just before it by 120 ms (at most 480 ms from now);
  // otherwise it appears at once. A photo still loading is waited for, then the rest of its delay runs.
  function show(el, staggered) {
    if (queued(el)) return;
    el._queued = true;
    if (io) io.unobserve(el);
    var now = performance.now(), delay = 0;
    if (staggered) {
      delay = Math.min(Math.max(0, nextAt - now), MAX_DELAY);
      nextAt = now + delay + STAGGER;
    }
    var loading = NV.$$('img', el).filter(function (img) { return !img.complete; });
    if (!loading.length || !window.Promise) { reveal(el, delay); return; }
    var fired = false;
    var go = function () {
      if (fired) return;
      fired = true;
      reveal(el, Math.max(0, delay - (performance.now() - now)));
    };
    Promise.all(loading.map(function (img) { return img.decode ? img.decode().catch(function () {}) : null; })).then(go);
    setTimeout(go, IMG_WAIT);
  }

  // reading order of groups entering together: by row (tops within 24 px count as one row), then left to right
  function readingOrder(a, b) {
    var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    return Math.abs(ra.top - rb.top) > 24 ? ra.top - rb.top : ra.left - rb.left;
  }

  function stop() {
    if (io) { io.disconnect(); io = null; }
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('focusin', onFocus);
    desktop.removeEventListener('change', showAll);
  }

  function showAll() {
    groups.forEach(function (el) { el._queued = true; reveal(el, 0); });
    secs.forEach(function (s) { s.classList.remove('story--anim'); });
    stop();
  }

  // A fast scroll or a jump (End, a link) can carry a group past the screen between two frames, so the observer
  // never sees it: anything above the screen is shown at once.
  function sweep() {
    raf = 0;
    groups.forEach(function (el) { if (!queued(el) && el.getBoundingClientRect().bottom <= 0) show(el, false); });
    if (groups.every(queued)) stop();
  }
  function onScroll() { if (!raf) raf = requestAnimationFrame(sweep); }

  // a link in a group that is still hidden gets focus: show its group straight away
  function onFocus(e) {
    var g = e.target.closest && e.target.closest('[data-reveal]');
    if (g) show(g, false);
  }

  try {
    io = new IntersectionObserver(function (entries) {
      entries.filter(function (e) { return e.isIntersecting; })
        .map(function (e) { return e.target; })
        .sort(readingOrder)
        .forEach(function (el) { show(el, true); });
      if (groups.every(queued)) stop();
    }, { rootMargin: '0px 0px -12% 0px' });

    // groups already on screen (a tall window, a reload part-way down) are shown as they are, without motion
    var h = window.innerHeight;
    groups.forEach(function (el) {
      if (el.getBoundingClientRect().top < h * 0.88) { el._queued = true; el.classList.add('is-in'); }
      else io.observe(el);
    });
    secs.forEach(function (s) { s.classList.add('story--anim'); });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('focusin', onFocus);
    // the window narrows below desktop: no more reveals, show everything
    desktop.addEventListener('change', showAll);
    if (groups.every(queued)) stop();
  } catch (err) {
    showAll();
  }
})();
