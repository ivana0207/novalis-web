// The e-mail HR receives for a job application (copy: .jira-work/WEB-23/copy.md part 5) and its delivery through
// the Brevo transactional API (POST https://api.brevo.com/v3/smtp/email; 201/202 = accepted). The CV goes along as a
// base64 attachment straight from memory: it is never written to disk, stored or served by this site.

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const TIMEOUT = 15000;
// The page the applications come from, as named in the e-mail. Change it with the site's address (novalis.hr).
export const PAGE = 'novalis-web.vercel.app/zaposli-se/';
export const DEFAULT_TO = 'kadrovska@novalis.com.hr';
const DEFAULT_FROM_NAME = 'Novalis web';
const SUBJECT_MAX = 150;
const SHOWN_NAME_MAX = 120;

// ---------- cleaning visitor text ----------
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g;
const CONTROL_KEEP_LINES = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;
const BIDI = /[؜‎‏‪-‮⁦-⁩]/g;
const cap = (s, n) => [...s].slice(0, n).join('');

// One line (names, subject, file name): every run of white space (CR, LF, tabs) becomes one space; other control
// and direction-changing characters are dropped, so nothing can start a new mail header or disguise a name.
export function oneLine(s) {
  return String(s).replace(/[\s\u0085]+/g, ' ').replace(CONTROL, '').replace(BIDI, '').trim();
}
// The message: line breaks kept as LF (the browser sends CRLF), tabs kept, other control characters dropped.
export function multiLine(s) {
  return String(s).replace(/\r\n?/g, '\n').replace(CONTROL_KEEP_LINES, '').replace(BIDI, '').trim();
}
export const length = (s) => [...s].length;

function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// "240 KB" below 1 MB, else "1,2 MB" (as the form shows it)
export function sizeLabel(n) {
  return n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
}

// "22. 10. 2026. 14:35" in Novalja time
function stamp(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Zagreb', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).map((x) => [x.type, x.value]));
  return p.day + '. ' + p.month + '. ' + p.year + '. ' + p.hour + ':' + p.minute;
}

// The attachment's name is built from the applicant's name, never taken from the upload (no paths, null bytes,
// direction marks or double extensions): "Zivotopis-Ana-Horvat.pdf".
export function attachmentName(ime, ext) {
  const ascii = ime.replace(/đ/g, 'd').replace(/Đ/g, 'D').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const words = ascii.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return ('Zivotopis' + (words ? '-' + words : '')).slice(0, 60).replace(/-+$/, '') + '.' + ext;
}

// The uploaded file's own name, only as text in the message body
export function shownName(name) {
  return cap(oneLine(name), SHOWN_NAME_MAX);
}

// d: cleaned and checked values { ime, email, telefon, mjesto, poruka, privola12: 'da' | 'ne', fileName, fileSize }
// opt: { ext, content (Uint8Array), from, fromName, to, now }
export function buildMessage(d, opt) {
  const text = [
    'Nova prijava za posao putem stranice ' + PAGE,
    '',
    'Ime i prezime: ' + d.ime,
    'E-mail: ' + d.email,
    'Telefon: ' + (d.telefon || 'nije naveden'),
    'Poslovnica / radno mjesto: ' + (d.mjesto || 'nije navedeno'),
    '',
    'Životopis: u privitku (' + d.fileName + ', ' + sizeLabel(d.fileSize) + ')',
    '',
    'Potvrda o upoznatosti s Pravilima o privatnosti: da',
    'Privola za čuvanje do 12 mjeseci: ' + d.privola12,
    'Primljeno: ' + stamp(opt.now || new Date()),
    '',
    'Bez privole podatke iz ove prijave obrišite nakon odluke o zapošljavanju; uz privolu najkasnije 12 mjeseci nakon primitka.',
    // the visitor's free text goes last, so nothing in it can pass for one of the labelled lines above
    '',
    'Poruka:',
    d.poruka || 'nije navedena'
  ].join('\n');
  // Brevo needs htmlContent without a template: the same text, every character escaped, line breaks as <br>
  const html = '<!DOCTYPE html><html lang="hr"><body><div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5">' +
    escapeHTML(text).replace(/\n/g, '<br>') + '</div></body></html>';
  return {
    sender: { email: opt.from, name: oneLine(opt.fromName || '') || DEFAULT_FROM_NAME },
    to: [{ email: opt.to || DEFAULT_TO }],
    replyTo: { email: d.email, name: d.ime },
    subject: cap(oneLine('Prijava za posao: ' + d.ime + (d.mjesto ? ' (' + d.mjesto + ')' : '')), SUBJECT_MAX),
    htmlContent: html,
    textContent: text,
    attachment: [{ content: Buffer.from(opt.content.buffer, opt.content.byteOffset, opt.content.byteLength).toString('base64'), name: attachmentName(d.ime, opt.ext) }]
  };
}

// ---------- delivery ----------
async function brevo(payload, { apiKey }) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    await res.arrayBuffer().catch(() => null); // drain; the answer's content is not needed (and not logged)
    return { ok: res.status >= 200 && res.status < 300, status: res.status };
  } finally {
    clearTimeout(t);
  }
}

let sender = brevo;
// Returns { ok, status }; throws on network errors and the timeout.
export function sendMail(payload, cfg) {
  return sender(payload, cfg);
}
// Tests and the local dev server only: swap the Brevo call for a mock (never reachable from a request).
export function setSender(fn) {
  sender = fn || brevo;
}
