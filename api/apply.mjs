// POST /api/apply - the "Zaposli se" job application form (zaposli-se/, js/zaposli-se.js). The site's only server
// code: a Vercel function (Node.js runtime, Web-standard handler, no npm packages). It checks the request and the CV
// and e-mails the application to Novalis's HR address through the Brevo API (api/_lib/mail.mjs).
//
// Settings (Vercel project, Environment Variables): BREVO_API_KEY, MAIL_FROM (a sender address verified in Brevo),
// optional MAIL_FROM_NAME (default "Novalis web"), MAIL_TO (default kadrovska@novalis.com.hr) and ALLOWED_ORIGINS
// (comma list of other site addresses allowed to post, e.g. https://novalis.hr). Without the first two the function
// answers 503 "unavailable" and the page offers the e-mail address instead.
//
// Checks, cheapest first, so a bad request costs as little as possible: method, origin, settings, content type, size,
// rate limit, then the form fields and finally the file's real content (api/_lib/sniff.mjs).
// The file stays in memory: it is never written to disk, stored or served back by this site. No cookies.
//
// Answers (JSON): 200 {ok:true} (also to a filled honeypot, so bots learn nothing) · 400 {error:'fields', fields:[…]}
// · 400 'empty' · 413 'size' · 415 'type' (the CV) · 415/400 'request' · 403 'origin' · 405 · 429 'rate' (Retry-After)
// · 503 'unavailable' · 502 'send' (Brevo refused or did not answer). js/zaposli-se.js shows a message for each.
import { sniff } from './_lib/sniff.mjs';
import { take } from './_lib/limit.mjs';
import { sendMail, buildMessage, oneLine, multiLine, length, shownName } from './_lib/mail.mjs';

const MAX_FILE = 4 * 1024 * 1024;        // 4 MB, as the form says (js/zaposli-se.js uses the same number)
const MAX_BODY = 4.5 * 1024 * 1024;      // Vercel's own request limit; the file plus the fields fit well inside it
const MAX_MESSAGE = 1000;
const EXTENSIONS = ['pdf', 'doc', 'docx'];
const EMAIL = /^[^\s@"<>(),;:\\[\]]+@[^\s@"<>(),;:\\[\]]+\.[^\s@"<>(),;:\\[\].]{2,}$/;
const PHONE = /^[0-9 +()\/-]+$/;

const HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const reply = (status, body, extra) => new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...extra } });
const refuse = (status, error, extra) => reply(status, { ok: false, error }, extra);

export default {
  async fetch(request) {
    try {
      return await handle(request);
    } catch (err) {
      console.error('apply: unexpected error', err && err.name);
      return refuse(500, 'server');
    }
  }
};

async function handle(request) {
  if (request.method !== 'POST') return refuse(405, 'method', { allow: 'POST' });

  // A browser always says where a cross-site post comes from; the form posts from this same site
  const origin = request.headers.get('origin');
  if (origin !== null && !originAllowed(origin, request)) return refuse(403, 'origin');

  const apiKey = process.env.BREVO_API_KEY, from = process.env.MAIL_FROM;
  if (!apiKey || !from) return refuse(503, 'unavailable');

  const type = request.headers.get('content-type') || '';
  if (!/^multipart\/form-data\s*;.*boundary=/i.test(type)) return refuse(415, 'request');

  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || +declared > MAX_BODY)) return refuse(413, 'size');

  const wait = take(clientIp(request));
  if (wait) return refuse(429, 'rate', { 'retry-after': String(wait) });

  const body = await readCapped(request.body, MAX_BODY);
  if (!body) return refuse(413, 'size');
  let form;
  try {
    form = await new Response(body, { headers: { 'content-type': type } }).formData();
  } catch (err) {
    return refuse(400, 'request');
  }

  // honeypot: a field people never see (or a file in its place)
  const trap = form.get('web');
  if (trap !== null && (typeof trap !== 'string' || trap.trim() !== '')) return reply(200, { ok: true });

  // ---------- fields ----------
  const bad = [];
  const text = (name) => {
    const all = form.getAll(name);
    if (all.length > 1 || (all.length && typeof all[0] !== 'string')) return null; // duplicated, or a file
    return all.length ? all[0] : '';
  };
  const raw = { ime: text('ime'), email: text('email'), telefon: text('telefon'), mjesto: text('mjesto'), poruka: text('poruka'), privola: text('privola'), privola12: text('privola12') };

  const ime = raw.ime === null ? '' : oneLine(raw.ime);
  if (!ime || length(ime) > 100) bad.push('ime');

  const email = raw.email === null ? '' : raw.email.trim();
  if (!email || email.length > 254 || /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/.test(email) || !EMAIL.test(email)) bad.push('email');

  const telefon = raw.telefon === null ? null : raw.telefon.trim();
  if (telefon === null || (telefon && (telefon.length > 30 || !PHONE.test(telefon) || telefon.replace(/\D/g, '').length < 6))) bad.push('telefon');

  const mjesto = raw.mjesto === null ? null : oneLine(raw.mjesto);
  if (mjesto === null || length(mjesto) > 100) bad.push('mjesto');

  const poruka = raw.poruka === null ? null : multiLine(raw.poruka);
  if (poruka === null || length(poruka) > MAX_MESSAGE) bad.push('poruka');

  const files = form.getAll('cv');
  const file = files.length === 1 && typeof files[0] === 'object' && !(files[0].name === '' && files[0].size === 0) ? files[0] : null;
  if (!file) bad.push('cv');

  if (raw.privola !== 'da' && raw.privola !== 'on') bad.push('privola');

  if (bad.length) return reply(400, { ok: false, error: 'fields', fields: bad });

  // ---------- the CV ----------
  if (file.size === 0) return refuse(400, 'empty');
  if (file.size > MAX_FILE) return refuse(413, 'size');
  const ext = (/\.([a-z0-9]{1,8})$/i.exec(oneLine(file.name)) || [])[1];
  const kind = ext && EXTENSIONS.includes(ext.toLowerCase()) ? ext.toLowerCase() : null;
  if (!kind) return refuse(415, 'type');
  const content = new Uint8Array(await file.arrayBuffer());
  if (sniff(content) !== kind) return refuse(415, 'type');

  // ---------- send ----------
  const requestId = (request.headers.get('x-vercel-id') || crypto.randomUUID()).slice(0, 100);
  const message = buildMessage(
    { ime, email, telefon, mjesto, poruka, privola12: raw.privola12 === 'da' || raw.privola12 === 'on' ? 'da' : 'ne', fileName: shownName(file.name), fileSize: file.size },
    { ext: kind, content, from, fromName: process.env.MAIL_FROM_NAME, to: process.env.MAIL_TO }
  );
  let sent;
  try {
    sent = await sendMail(message, { apiKey, requestId });
  } catch (err) {
    sent = { ok: false, status: err && err.name === 'AbortError' ? 'timeout' : 'network' };
  }
  if (!sent || !sent.ok) {
    // only the status and the request id: never the applicant's data or the file
    console.error('apply: mail not accepted', sent && sent.status, requestId);
    return refuse(502, 'send');
  }
  return reply(200, { ok: true });
}

function originAllowed(origin, request) {
  let host;
  try { host = new URL(origin).host; } catch (err) { return false; } // includes "null" (sandboxed pages, files)
  if (host === (request.headers.get('host') || new URL(request.url).host)) return true;
  return (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean).includes(origin);
}

// Vercel sets x-forwarded-for / x-real-ip to the visitor's address (it overwrites what the visitor sends)
function clientIp(request) {
  const fwd = request.headers.get('x-forwarded-for');
  return ((fwd && fwd.split(',')[0].trim()) || request.headers.get('x-real-ip') || 'unknown').slice(0, 64);
}

// The request body, but never more than max bytes: null once it goes over (also when no Content-Length was sent)
async function readCapped(stream, max) {
  if (!stream) return new Uint8Array(0);
  const reader = stream.getReader();
  const parts = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      reader.cancel().catch(() => {});
      return null;
    }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.byteLength; }
  return out;
}
