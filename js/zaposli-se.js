/* Zaposli se: the job application form (zaposli-se/, WEB-23). It checks the fields and the CV in the browser with the
   server's limits (api/apply.mjs: 4 MB, .pdf/.doc/.docx, 1000 characters), sends them with fetch and shows success only
   when the server confirmed it. On a failure everything typed and the chosen file stay, and the notice offers the
   e-mail address. Where sending can't work (opened from disk, the GitHub Pages copy, or this script fails) the form stays
   hidden and the notice with the address takes its place; the server's "not set up" answer disables the button.
   Messages: .jira-work/WEB-23/copy.md part 4, in English on en/careers/. Nothing is stored in the browser and nothing goes into the address. */
(function () {
  'use strict';

  var $ = NV.$;
  var form = $('#jobsForm'), off = $('#jobsOff');
  if (!form) return;

  var MAX_FILE = 4 * 1024 * 1024;   // 4 MB, as on the server
  var MAX_MESSAGE = 1000;
  var TIMEOUT = 60000;              // a send that takes longer counts as failed
  var TYPES = { pdf: 'PDF', doc: 'DOC', docx: 'DOCX' };
  var EMAIL = /^[^\s@"<>(),;:\\[\]]+@[^\s@"<>(),;:\\[\]]+\.[^\s@"<>(),;:\\[\].]{2,}$/;
  var PHONE = /^[0-9 +()\/-]+$/;
  var MAIL = '<a href="mailto:kadrovska@novalis.com.hr">kadrovska@novalis.com.hr</a>';
  // in the page language (NV.LANG): Croatian on zaposli-se/, English on en/careers/
  var MESSAGES = {};
  MESSAGES.hr = {
    nameMissing: 'Upišite ime i prezime.',
    emailMissing: 'Upišite adresu e-pošte.',
    emailInvalid: 'Upišite ispravnu adresu e-pošte, primjerice ime@domena.hr.',
    phoneInvalid: 'Upišite ispravan broj telefona.',
    messageTooLong: 'Poruka je predugačka. Skratite je na najviše 1000 znakova.',
    fileMissing: 'Odaberite datoteku sa životopisom.',
    fileType: 'Datoteka mora biti PDF ili Word dokument (.pdf, .doc, .docx).',
    fileTooLarge: 'Datoteka je prevelika. Najveća dopuštena veličina je 4 MB.',
    fileEmpty: 'Datoteka je prazna. Odaberite drugu datoteku.',
    fileRejected: 'Ova datoteka nije prihvaćena. Pošaljite ispravan PDF ili Word dokument (.pdf, .doc, .docx).',
    consentMissing: 'Potvrdite da ste upoznati s Pravilima o privatnosti kako biste poslali prijavu.',
    tooMany: 'Previše pokušaja slanja. Pokušajte ponovno malo kasnije.',
    fail: 'Prijavu nismo uspjeli poslati. Pokušajte ponovno ili pošaljite životopis e-poštom na ' + MAIL + '.',
    send: 'Pošalji prijavu',
    sending: 'Slanje prijave...',
    sendingStatus: 'Šaljemo Vašu prijavu. Molimo pričekajte.',
    chosen: 'Odabrano: ',
    decimal: ','   // 1,5 MB
  };
  MESSAGES.en = {
    nameMissing: 'Enter your full name.',
    emailMissing: 'Enter your email address.',
    emailInvalid: 'Enter a valid email address, for example name@example.com.',
    phoneInvalid: 'Enter a valid phone number.',
    messageTooLong: 'Your message is too long. Please shorten it to 1000 characters at most.',
    fileMissing: 'Choose the file with your CV.',
    fileType: 'The file must be a PDF or Word document (.pdf, .doc, .docx).',
    fileTooLarge: 'The file is too large. The maximum size is 4 MB.',
    fileEmpty: 'The file is empty. Please choose another file.',
    fileRejected: 'This file was not accepted. Please send a valid PDF or Word document (.pdf, .doc, .docx).',
    consentMissing: 'Please confirm that you have read the privacy policy to send your application.',
    tooMany: 'Too many attempts to send. Please try again a little later.',
    fail: 'We could not send your application. Please try again or email your CV to ' + MAIL + '.',
    send: 'Send application',
    sending: 'Sending application...',
    sendingStatus: 'Sending your application. Please wait.',
    chosen: 'Selected: ',
    decimal: '.'   // 1.5 MB
  };
  var MSG = MESSAGES[NV.LANG] || MESSAGES.hr;

  // Sending needs the site's function (Vercel): not from disk, not on the GitHub Pages copy
  var canSend = location.protocol !== 'file:' && !/\.github\.io$/i.test(location.hostname) &&
    'fetch' in window && 'FormData' in window;
  if (!canSend) { off.hidden = false; return; }
  try {
    init();
    form.hidden = false;
    $('.jobs__pointer').hidden = false;
  } catch (err) {
    form.hidden = true;
    off.hidden = false;
  }

  function init() {
    var el = form.elements;
    var panel = $('#prijava'), heading = $('#h-prijava'), done = $('#jobsDone');
    var summary = $('#jobsSummary'), fail = $('#jobsFail'), status = $('#jobsStatus');
    var btn = $('.jobs__send', form), cv = el.cv, box = $('.jobs__file', form), chip = $('#jobs-cv-chosen'), live = $('#jobs-cv-live');
    var tried = false, busy = false, blocked = false;

    // ---------- checks (same rules as the server) ----------
    var length = function (s) { return Array.from(s).length; };
    var ext = function (name) { var m = /\.([a-z0-9]+)$/i.exec(name); return m ? m[1].toLowerCase() : ''; };
    function fileProblem(f) {
      if (!Object.prototype.hasOwnProperty.call(TYPES, ext(f.name))) return MSG.fileType;
      if (!f.size) return MSG.fileEmpty;
      if (f.size > MAX_FILE) return MSG.fileTooLarge;
      return '';
    }
    var CHECKS = {
      ime: function () { return el.ime.value.trim() ? '' : MSG.nameMissing; },
      email: function () {
        var v = el.email.value.trim();
        return !v ? MSG.emailMissing : v.length <= 254 && EMAIL.test(v) ? '' : MSG.emailInvalid;
      },
      telefon: function () {
        var v = el.telefon.value.trim();
        return !v || (v.length <= 30 && PHONE.test(v) && v.replace(/\D/g, '').length >= 6) ? '' : MSG.phoneInvalid;
      },
      // the browser sends line breaks as CRLF; the server counts them as one character, so does this
      poruka: function () { return length(el.poruka.value.replace(/\r\n?/g, '\n').trim()) <= MAX_MESSAGE ? '' : MSG.messageTooLong; },
      cv: function () { var f = cv.files && cv.files[0]; return f ? fileProblem(f) : MSG.fileMissing; },
      privola: function () { return el.privola.checked ? '' : MSG.consentMissing; }
    };
    var ORDER = ['ime', 'email', 'telefon', 'poruka', 'cv', 'privola'];

    // ---------- field errors ----------
    // aria-describedby lists what is shown under the control: its hint, the chosen file, its error
    function describe(name) {
      var ids = [name === 'cv' ? 'jobs-cv-hint' : 'jobs-' + name + '-hint', name === 'cv' && !chip.hidden ? 'jobs-cv-name' : '', 'jobs-' + name + '-err']
        .filter(function (id) { var x = id && document.getElementById(id); return x && !x.hidden; });
      if (ids.length) el[name].setAttribute('aria-describedby', ids.join(' '));
      else el[name].removeAttribute('aria-describedby');
    }
    function setError(name, msg) {
      var err = $('#jobs-' + name + '-err');
      $('.form__err-t', err).textContent = msg || '';
      err.hidden = !msg;
      if (msg) el[name].setAttribute('aria-invalid', 'true');
      else el[name].removeAttribute('aria-invalid');
      describe(name);
    }

    // ---------- statuses (one at a time) ----------
    function clearStatuses() {
      summary.hidden = true;
      fail.hidden = true;
    }
    // show a status and move focus to it (its text is read out from there, so no live region on it)
    function reveal(target) {
      target.hidden = false;
      target.scrollIntoView({ block: 'start' });
      target.focus({ preventScroll: true });
    }
    // field errors: the summary at the top of the form, one link per error, in the form's order
    function showSummary(errors) {
      clearStatuses();
      var list = $('ul', summary);
      list.textContent = '';
      errors.forEach(function (e) {
        var li = document.createElement('li'), a = document.createElement('a');
        a.href = '#' + el[e[0]].id;
        a.textContent = e[1];
        li.appendChild(a);
        list.appendChild(li);
      });
      reveal(summary);
    }
    // kind 'err': failure / too many tries (red, "!"); 'off': not set up on the server (neutral, mail icon).
    // html is this script's own copy (MSG) or the page's notice, never anything typed.
    function notice(kind, html) {
      clearStatuses();
      fail.classList.toggle('jobs__notice--err', kind === 'err');
      $('.form__mark', fail).hidden = kind !== 'err';
      $('.ms', fail).hidden = kind === 'err';
      $('p', fail).innerHTML = html;
      reveal(fail);
    }
    // a summary link: bring the field with its label into view (clear of the sticky header) and focus its control;
    // handled here, so the address stays as it is
    summary.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      var target = a && document.getElementById(a.getAttribute('href').slice(1));
      if (!target) return;
      e.preventDefault();
      target.closest('.field, .form__check').scrollIntoView({ block: 'nearest' });
      target.focus({ preventScroll: true });
    });

    // after a failed submit, an error goes as soon as its field is right (no new errors while typing)
    function recheck(e) {
      var name = e.target.name;
      if (!tried || !CHECKS[name] || name === 'cv' || el[name].getAttribute('aria-invalid') !== 'true') return;
      if (!CHECKS[name]()) setError(name, '');
    }
    form.addEventListener('input', recheck);
    form.addEventListener('change', recheck);

    // ---------- the CV ----------
    function sizeLabel(n) {
      return n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1024 / 1024).toFixed(1).replace('.', MSG.decimal) + ' MB';
    }
    function showChip(f) {
      chip.hidden = !f;
      if (f) {
        $('.jobs__type', chip).textContent = TYPES[ext(f.name)];
        $('b', chip).textContent = f.name;
        $('.jobs__chip-size', chip).textContent = '(' + sizeLabel(f.size) + ')';
      }
      describe('cv');
    }
    function clearFile() {
      cv.value = '';
      showChip(null);
    }
    // checked the moment it is chosen (or dropped on the box)
    cv.addEventListener('change', function () {
      var f = cv.files && cv.files[0];
      box.classList.remove('is-over');
      if (!f) { showChip(null); live.textContent = ''; return; }
      var problem = fileProblem(f);
      if (problem) {
        clearFile();
        setError('cv', problem);
        live.textContent = problem;
        return;
      }
      setError('cv', '');
      showChip(f);
      live.textContent = MSG.chosen + f.name + ' (' + sizeLabel(f.size) + ')';
    });
    $('.jobs__remove', chip).addEventListener('click', function () {
      clearFile();
      live.textContent = '';
      cv.focus();
    });
    ['dragenter', 'dragover'].forEach(function (t) { cv.addEventListener(t, function () { box.classList.add('is-over'); }); });
    ['dragleave', 'dragend', 'drop'].forEach(function (t) { cv.addEventListener(t, function () { box.classList.remove('is-over'); }); });

    // ---------- sending ----------
    // aria-disabled, not disabled: the button keeps keyboard focus while it waits
    function setSending(on) {
      busy = on;
      btn.classList.toggle('is-sending', on);
      btn.textContent = on ? MSG.sending : MSG.send;
      if (on) btn.setAttribute('aria-disabled', 'true');
      else btn.removeAttribute('aria-disabled');
      status.textContent = on ? MSG.sendingStatus : '';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy || blocked) return;
      tried = true;
      var errors = [];
      ORDER.forEach(function (name) {
        var msg = CHECKS[name]();
        setError(name, msg);
        if (msg) errors.push([name, msg]);
      });
      if (errors.length) return showSummary(errors);
      clearStatuses();
      send();
    });

    function send() {
      setSending(true);
      var ctrl = 'AbortController' in window ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT);
      fetch(form.action, { method: 'POST', body: new FormData(form), cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) { return { status: res.status, body: body || {} }; });
        })
        .catch(function () { return { status: 0, body: {} }; })
        .then(function (r) {
          clearTimeout(timer);
          setSending(false);
          answer(r.status, r.body);
        });
    }

    // the server's answer (api/apply.mjs) → what the visitor sees
    function answer(code, body) {
      if (code === 200 && body.ok === true) return sent();
      // not set up yet (503), or no function at this address (404/405): sending can't work here
      if (code === 503 || code === 404 || code === 405) return unavailable();
      if (code === 429) return notice('err', MSG.tooMany);
      if (code === 413) return fileRefused(MSG.fileTooLarge);
      if (code === 415 && body.error === 'type') return fileRefused(MSG.fileRejected);
      if (code === 400 && body.error === 'empty') return fileRefused(MSG.fileEmpty);
      if (code === 400 && body.error === 'fields' && Array.isArray(body.fields)) {
        // the browser's checks passed, so these were refused by the server's own rules
        var server = { ime: MSG.nameMissing, email: MSG.emailInvalid, telefon: MSG.phoneInvalid, poruka: MSG.messageTooLong, cv: MSG.fileRejected, privola: MSG.consentMissing };
        var errors = ORDER.filter(function (n) { return body.fields.indexOf(n) >= 0; }).map(function (n) { return [n, CHECKS[n]() || server[n]]; });
        if (errors.length === body.fields.length) {
          errors.forEach(function (e) { setError(e[0], e[1]); });
          if (body.fields.indexOf('cv') >= 0) clearFile();
          return showSummary(errors);
        }
      }
      notice('err', MSG.fail);
    }
    function fileRefused(msg) {
      clearFile();
      setError('cv', msg);
      showSummary([['cv', msg]]);
    }
    // what was typed stays (to copy into an e-mail); the button stays off
    function unavailable() {
      blocked = true;
      btn.setAttribute('aria-disabled', 'true');
      notice('off', $('p', off).innerHTML);
    }
    function sent() {
      heading.hidden = true;
      $('.jobs__pointer').hidden = true;
      form.hidden = true;
      form.reset();
      clearFile();
      panel.setAttribute('aria-labelledby', 'h-poslano');
      reveal(done);
    }
  }
})();
