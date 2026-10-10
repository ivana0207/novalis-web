/* Novalis "O nama" page — "Novalis u stvarnom životu" story tabs, on top of js/site.js. */
(function () {
  'use strict';

  var NV = window.NV, D = NV.D, $ = NV.$, $$ = NV.$$, esc = NV.esc;

  function stepHTML(st, k) {
    // A step names a unit (→ its store page) or an anchor on the landing page.
    var u = NV.byId[st.unit];
    var href = st.href ? NV.HOME + st.href : u ? NV.unitHref(u) : NV.HOME + '#poslovnice';
    var external = !st.href && u && u.external;
    return '<li><a class="step" href="' + esc(href) + '"' + (external ? ' target="_blank" rel="noopener"' : '') + '>' +
      '<span class="step__n">' + (k + 1) + '</span>' +
      '<span class="step__text"><span class="step__t">' + esc(st.text) + '</span>' +
        '<span class="step__unit" translate="no">' + esc(st.label || (u ? u.name : 'Novalis')) + '</span></span>' +
      '<span class="ms ms--sm" aria-hidden="true">' + (external ? 'open_in_new' : 'arrow_forward') + '</span>' +
      (external ? NV.NEW_TAB : '') + '</a></li>';
  }

  $('#storyTabs').innerHTML = D.stories.map(function (s, i) {
    return '<button type="button" class="tab" role="tab" id="tab-' + s.id + '" aria-controls="story-' + s.id + '"' +
      ' aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '">' + esc(s.tab) + '</button>';
  }).join('');

  $('#storyPanels').innerHTML = D.stories.map(function (s, i) {
    return '<div class="story" role="tabpanel" id="story-' + s.id + '" aria-labelledby="tab-' + s.id + '" tabindex="0"' + (i === 0 ? '' : ' hidden') + '>' +
      '<div class="story__media">' + NV.slotHTML(null, s.photo) + '</div>' +
      '<div class="story__body">' +
        '<h3 class="story__h">' + esc(s.title) + '</h3>' +
        '<p class="story__desc">' + esc(s.desc) + '</p>' +
        '<ol class="steps">' + s.steps.map(stepHTML).join('') + '</ol>' +
      '</div>' +
    '</div>';
  }).join('');

  var tabs = $$('#storyTabs [role="tab"]');

  function select(i, focus) {
    tabs.forEach(function (t, k) {
      t.setAttribute('aria-selected', k === i);
      t.tabIndex = k === i ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = k !== i;
    });
    if (focus) tabs[i].focus();
  }

  $('#storyTabs').addEventListener('click', function (e) {
    var t = e.target.closest('[role="tab"]');
    if (t) select(tabs.indexOf(t));
  });
  // arrow keys move between tabs (WAI-ARIA tabs pattern)
  $('#storyTabs').addEventListener('keydown', function (e) {
    var i = tabs.indexOf(document.activeElement), n = tabs.length;
    if (i < 0) return;
    var next = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(next, true);
  });
})();
