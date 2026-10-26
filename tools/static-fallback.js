#!/usr/bin/env node
/* Static fallback for crawlers that don't run JavaScript (WEB-22). Most AI crawlers (GPTBot, ClaudeBot, PerplexityBot)
   read a page's HTML without running its scripts, and the pages build their content in the browser. This script writes
   what they need into the committed HTML, from data/units.js, so the site still needs no build step to run:

     - every page with the footer unit list: the list's links, exactly as js/site.js renders them;
     - each store page (<body data-unit>): its JSON-LD in <head> and, in <main id="store">, the unit's name (h1), lead,
       address, phone, e-mail, hours (confirmed ones only), its offer lines and links to the other units;
     - the landing pages (#cards): their JSON-LD and every unit's name, lead, address and phone with a link to its page;
     - llms.txt at the site root: the units with their pages in both languages.

   The JSON-LD comes from js/schema.js, the same builder the pages run, so the two can't drift; the page scripts replace
   the static graphs with their own (data-ld keys, NV.addJSONLD), adding hours that need this year's dates (seasons,
   holidays), which a committed file can't know: those stay JS-only. The labels come from the hr/en string tables in
   js/poslovnica.js and js/site.js. With JavaScript the fallback never shows (a <head> script sets <html class="js">
   and css hides .static) and the page scripts replace it.

   Each region sits between <!-- static:name ... --> and <!-- /static:name -->; the first run puts it where the page
   script renders. Never edit a region by hand: change data/units.js and run this again.

   Usage (Node 18+, no dependencies; `source ~/.nvm/nvm.sh` first on this machine):
     node tools/static-fallback.js            write the regions and llms.txt (only files that change)
     node tools/static-fallback.js --check    exit 1 and name the files that are out of date (smoke.js runs this)
     --root <dir>                             another checkout (default: this script's repository)
   Output depends only on the files, never on the clock. Absolute addresses come from each page's canonical link
   (llms.txt: the home page's), so moving to another domain stays a find-and-replace; run this afterwards. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const ROOT = path.resolve(args.indexOf('--root') >= 0 ? args[args.indexOf('--root') + 1] : path.join(__dirname, '..'));
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* ---------------- Inputs ---------------- */
// data/units.js and js/schema.js run as they do in the browser, with a window of their own
const sandbox = vm.createContext({ window: {}, URL });
['data/units.js', 'js/schema.js'].forEach((f) => vm.runInContext(read(f), sandbox, { filename: f }));
const D = sandbox.window.NOVALIS_DATA, S = sandbox.window.NV_SCHEMA;
const byId = Object.fromEntries(D.units.map((u) => [u.id, u]));

// The value written after `var name = ` in a script (an object or array literal), read to its matching bracket
function literal(file, src, name) {
  const at = src.indexOf('var ' + name + ' = ');
  if (at < 0) throw new Error(file + ': var ' + name + ' not found');
  const start = at + ('var ' + name + ' = ').length;
  let depth = 0, q = null;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') q = c;
    else if (c === '/' && src[i + 1] === '/') i = src.indexOf('\n', i);
    else if (c === '/' && src[i + 1] === '*') i = src.indexOf('*/', i) + 1;
    else if ('{[('.includes(c)) depth++;
    else if ('}])'.includes(c) && --depth === 0) return src.slice(start, i + 1);
  }
  throw new Error(file + ': var ' + name + ' never closes');
}
// The string tables (and the arrays they use) of the page scripts, evaluated as they are written there
const tables = vm.createContext({ is24h: (t) => !!t && t[0] === '00:00' && t[1] === '24:00' });
function table(file, names) {
  const src = read(file);
  return names.map((n) => (tables[n] = vm.runInContext('(' + literal(file, src, n) + ')', tables)));
}
const [, , , SITE_T, TWINS] = table('js/site.js', ['DAYS_ACC', 'DAYS_EN', 'MONTHS_EN', 'TEXTS', 'TWINS']);
const [PAGE_T] = table('js/poslovnica.js', ['TEXTS']);
const siteT = (lang) => SITE_T[lang] || SITE_T.hr;
const pageT = (lang) => PAGE_T[lang] || PAGE_T.hr;

/* ---------------- Pages ---------------- */
const SKIP = new Set(['node_modules', 'tools', 'api', 'assets', 'css', 'js', 'data']);
function htmlPages(dir = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (e.name.startsWith('.') || SKIP.has(e.name)) continue;
    const rel = dir ? dir + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...htmlPages(rel));
    else if (e.name === 'index.html') out.push(rel);
  }
  return out.sort();
}
// What a page script would know about its page: language, unit, root and home folders, and its absolute addresses
// from the canonical link (as js/site.js: PAGE_URL, ROOT_URL, HOME_URL)
function pageInfo(file, html) {
  const body = (html.match(/<body([^>]*)>/) || [])[1] || '';
  const attr = (n) => (body.match(new RegExp('\\s' + n + '="([^"]*)"')) || [])[1];
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)">/) || [])[1];
  if (!canonical) throw new Error(file + ': no canonical link');
  const pageUrl = canonical.replace(/[?#].*$/, '').replace(/index\.html$/, '');
  const root = attr('data-root') || '', home = attr('data-home') || '';
  return {
    file, lang: ((html.match(/<html lang="([^"]+)"/) || [])[1] || 'hr').toLowerCase().split('-')[0],
    unit: attr('data-unit'), root, pageUrl,
    rootUrl: new URL(root || './', pageUrl).href, homeUrl: new URL(home || './', pageUrl).href
  };
}

/* ---------------- Markup (as js/site.js and js/poslovnica.js write it) ---------------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const newTab = (pg) => '<span class="vh">' + esc(siteT(pg.lang).newTab) + '</span>';
const nameHTML = (u, pg) => '<span translate="no">' + esc(S.tx(u, 'name', pg.lang)) + '</span>';
const unitHref = (u, pg) => u.url || pg.root + S.unitPath(u, pg.lang);
function unitLinkAttrs(u, cls, pg) {
  return (cls ? 'class="' + cls + '" ' : '') + 'href="' + esc(unitHref(u, pg)) + '"' + (pg.unit === u.id ? ' aria-current="page"' : '') +
    (u.external ? ' target="_blank" rel="noopener"' : '');
}
// a street address is a name: on a page in another language it stays out of browser translation (NV.addrHTML)
const addrNT = (pg) => (pg.lang === 'hr' ? '' : ' translate="no"');
function addrHTML(u, pg) {
  return u.gmaps
    ? '<a' + addrNT(pg) + ' href="' + esc(u.gmaps) + '" target="_blank" rel="noopener" title="' + esc(siteT(pg.lang).place) + '">' + esc(u.address) + newTab(pg) + '</a>'
    : '<span' + addrNT(pg) + '>' + esc(u.address) + '</span>';
}
// running text with every unit's name kept out of browser translation, longest names first (poslovnica.js brandHTML)
const NAMES = D.units.map((x) => x.name).sort((a, b) => b.length - a.length);
const NAME_RE = new RegExp('(' + NAMES.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![A-Za-zČĆĐŠŽčćđšž])', 'g');
const brandHTML = (s) => String(s).split(NAME_RE).map((part, i) => (i % 2 ? '<span translate="no">' + esc(part) + '</span>' : esc(part))).join('');
function contactHTML(u, pg) {
  const T = pageT(pg.lang);
  return '<p><a href="tel:' + esc(u.tel || D.company.tel) + '">' + esc(T.call) + '<span translate="no">' + esc(u.phone || D.company.phone) + '</span></a></p>' +
    (u.email ? '\n<p><a href="mailto:' + esc(u.email) + '">' + esc(T.email) + '<span translate="no">' + esc(u.email) + '</span></a></p>' : '');
}

// The footer's unit list: byte for byte what js/site.js renders there, so its render changes nothing
function footerHTML(pg) {
  return S.units(D).map((u) => '<a ' + unitLinkAttrs(u, 'footer__link', pg) + '>' + nameHTML(u, pg) + (u.external ? newTab(pg) : '') + '</a>').join('');
}

// Opening hours as the store page's tables (js/poslovnica.js hourBlocks), without today's marks; only confirmed ones
function dayMonth(md, shift, lang) {
  const dt = new Date(2001, +md.slice(0, 2) - 1, +md.slice(3) + (shift || 0));
  return siteT(lang).date(dt.getDate(), dt.getMonth());
}
function hoursHTML(u, lang) {
  if (!u.hoursConfirmed) return '';
  const T = pageT(lang), DAYS = T.days, sm = D.seasons.summer;
  const fmt = (t) => (!t ? T.closed : t[0] === '00:00' && t[1] === '24:00' ? T.open24 : t[0] + ' - ' + t[1]);
  const rows = (hrs) => {
    const out = [];
    hrs.forEach((t, d) => { const last = out[out.length - 1]; if (last && last.time === fmt(t)) last.to = d; else out.push({ from: d, to: d, time: fmt(t) }); });
    return out.map((r) => ({ day: out.length === 1 ? T.daily : r.from === r.to ? DAYS[r.from] : T.range(DAYS[r.from], DAYS[r.to], r.to - r.from === 1), time: r.time }));
  };
  const dl = (hrs) => '<dl>' + rows(hrs).map((r) => '<div><dt>' + esc(r.day) + '</dt><dd>' + esc(r.time) + '</dd></div>').join('') + '</dl>';
  if (JSON.stringify(u.hours.summer) === JSON.stringify(u.hours.winter)) {
    const o = u.openPeriod;
    return '\n<h2>' + esc(T.hours) + '</h2>\n<p>' + esc(o ? dayMonth(o.start, 0, lang) + ' - ' + dayMonth(o.end, 0, lang) : T.allYear) + '</p>\n' + dl(u.hours.summer);
  }
  const period = { summer: dayMonth(sm.start, 0, lang) + ' - ' + dayMonth(sm.end, 0, lang), winter: dayMonth(sm.end, 1, lang) + ' - ' + dayMonth(sm.start, -1, lang) };
  return '\n<h2>' + esc(T.hours) + '</h2>' + ['summer', 'winter'].map((s) => '\n<h3>' + esc(T[s]) + '</h3>\n<p>' + esc(period[s]) + '</p>\n' + dl(u.hours[s])).join('');
}

// A store page's facts, in the order of its sections (hero, hours, Ponuda, Ostale poslovnice)
function storeHTML(pg) {
  const u = byId[pg.unit], p = S.pageOf(u, pg.lang), T = pageT(pg.lang), v2 = p.layout === 'v2';
  const others = v2 ? p.related.concat(S.units(D).map((x) => x.id).filter((id) => id !== u.id && p.related.indexOf(id) < 0)) : p.related;
  return '\n<div class="section static">' +
    '\n<h1>' + nameHTML(u, pg) + ': ' + esc(p.title) + '</h1>' +
    '\n<p>' + brandHTML(p.lead) + '</p>' +
    '\n<p>' + addrHTML(u, pg) + '</p>' +
    '\n' + contactHTML(u, pg) +
    hoursHTML(u, pg.lang) +
    '\n<h2>' + esc(T.offer) + '</h2>' +
    (p.offerLead ? '\n<p>' + brandHTML(p.offerLead) + '</p>' : '') +
    '\n<ul>' + p.offer.map((it) => '<li>' + esc(typeof it === 'string' ? it : it[0]) + '</li>').join('') + '</ul>' +
    '\n<h2>' + esc(v2 ? T.others : T.related) + '</h2>' +
    '\n<ul>' + others.map((id) => '<li><a ' + unitLinkAttrs(byId[id], '', pg) + '>' + nameHTML(byId[id], pg) + (byId[id].external ? newTab(pg) : '') + '</a></li>').join('') + '</ul>' +
    '\n</div>\n';
}

// The landing page's units (in #cards, where js/app.js renders the cards)
function unitsHTML(pg) {
  return '\n<ul class="static">' + S.units(D).map((u) => {
    const p = S.pageOf(u, pg.lang);
    return '\n<li><h3><a ' + unitLinkAttrs(u, '', pg) + '>' + nameHTML(u, pg) + (u.external ? newTab(pg) : '') + '</a></h3>' +
      '<p>' + brandHTML(p.lead) + '</p><p' + addrNT(pg) + '>' + esc(u.address) + '</p>' + contactHTML(u, pg).replace(/\n/g, '') + '</li>';
  }).join('') + '\n</ul>\n';
}

// <head>: the class that hides the fallback once JavaScript runs, and the page's JSON-LD (js/schema.js)
function headHTML(pg, graphs) {
  return "\n  <script>document.documentElement.classList.add('js')</script>" +
    graphs.map((g) => '\n  <script type="application/ld+json" data-ld="' + g[0] + '">' + S.json(g[1]) + '</script>').join('') + '\n  ';
}
function graphsOf(pg) {
  const o = { lang: pg.lang, root: pg.rootUrl, home: pg.homeUrl, page: pg.pageUrl, homeLabel: pageT(pg.lang).home };
  if (!pg.unit) return [['site', S.landing(D, o)]];
  const ld = S.store(D, byId[pg.unit], o);   // no year: hours that need dates are left to js/poslovnica.js
  return [['business', ld.business], ['crumbs', ld.crumbs]];
}

/* ---------------- Regions ---------------- */
const NOTE = 'generated from data/units.js by tools/static-fallback.js; do not edit here: change the data and run node tools/static-fallback.js';
const mark = (name, body) => '<!-- static:' + name + ' - ' + NOTE + ' -->' + body + '<!-- /static:' + name + ' -->';
// The region's place on the first run: inside the element the page script renders (only comments or spaces in it yet)
const ANCHORS = {
  head: /(\n)()(<\/head>)/,
  store: /(<main id="store">)((?:<!--[\s\S]*?-->|\s)*)(<\/main>)/,
  units: /(<div class="cards" id="cards">)((?:<!--[\s\S]*?-->|\s)*)(<\/div>)/,
  footer: /(<div class="footer__stack" id="footerUnits">)((?:<!--[\s\S]*?-->|\s)*)(<\/div>)/
};
function put(file, html, name, body) {
  const re = new RegExp('[ ]*<!-- static:' + name + ' [\\s\\S]*?<!-- /static:' + name + ' -->');
  const indent = name === 'head' ? '  ' : '';
  if (re.test(html)) return html.replace(re, () => indent + mark(name, body));
  const m = ANCHORS[name].exec(html);
  if (!m) throw new Error(file + ': nowhere to put static:' + name);
  return html.slice(0, m.index) + m[1] + indent + mark(name, body) + (name === 'head' ? '\n' : '') + m[3] + html.slice(m.index + m[0].length);
}

function render(file, html) {
  const pg = pageInfo(file, html);
  let out = html;
  const landing = /<div class="cards" id="cards">/.test(html);
  if (pg.unit && !byId[pg.unit]) throw new Error(file + ': data-unit "' + pg.unit + '" is not in data/units.js');
  if (pg.unit || landing) out = put(file, out, 'head', headHTML(pg, graphsOf(pg)));
  if (pg.unit) out = put(file, out, 'store', storeHTML(pg));
  if (landing) out = put(file, out, 'units', unitsHTML(pg));
  if (/id="footerUnits"/.test(html)) out = put(file, out, 'footer', footerHTML(pg));
  return out;
}

/* ---------------- llms.txt ---------------- */
// The file's framing: title, summary and note from .jira-work/WEB-22/copy.md (s. 3, content-brand-specialist,
// 2026-10-24); one section per category of data/units.js (its label / its English label), then O nama. The line labels
// ("Adresa / Address" …) are the developer's, for content review.
const LLMS = {
  title: 'Novalis d.o.o. - Novalja, otok Pag',
  summary: [
    'Novalis je obiteljska tvrtka iz Novalje na otoku Pagu: trgovine, shopping centar HIPER NOVALIS, građevinski materijal, veleprodaja, slastičarna, bistro, konoba i smještaj.',
    'Novalis is a family company in Novalja on the island of Pag, Croatia: shops, the HIPER NOVALIS shopping centre, building materials, wholesale, a pastry shop, a bistro, a konoba and accommodation.'
  ],
  note: 'Opening hours are shown on each page; most are provisional until Novalis confirms them.',
  address: 'Adresa / Address', phone: 'Telefon / Phone', email: 'E-mail', about: 'O nama / About',
  pages: [['o-nama/', 'O nama', 'About us'], ['zaposli-se/', 'Zaposli se', 'Careers']]
};
function llms(base) {
  const md = (s) => String(s).replace(/([\\[\]])/g, '\\$1');
  const lines = ['# ' + LLMS.title, ''].concat(LLMS.summary.map((l) => '> ' + l), ['', LLMS.note]);
  for (const c of D.categories) {
    const list = S.units(D).filter((u) => u.category === c.id);
    if (!list.length) continue;
    lines.push('', '## ' + md(c.label) + (S.tx(c, 'label', 'en') !== c.label ? ' / ' + md(S.tx(c, 'label', 'en')) : ''));
    for (const u of list) {
      const en = S.tx(u, 'name', 'en'), hr = S.pageOf(u, 'hr'), e = S.pageOf(u, 'en');
      lines.push('', '### ' + md(u.name) + (en !== u.name ? ' / ' + md(en) : ''),
        '- [' + md(u.name) + '](' + (u.url || base + S.unitPath(u, 'hr')) + ') (hr): ' + hr.lead,
        '- [' + md(en) + '](' + (u.url || base + S.unitPath(u, 'en')) + ') (en): ' + e.lead,
        '- ' + LLMS.address + ': ' + u.address,
        '- ' + LLMS.phone + ': ' + (u.phone || D.company.phone) + ' (' + (u.tel || D.company.tel) + ')');
      if (u.email) lines.push('- ' + LLMS.email + ': ' + u.email);
    }
  }
  lines.push('', '## ' + LLMS.about, '');
  for (const [p, hr, en] of LLMS.pages) lines.push('- [' + md(hr) + '](' + base + p + ') (hr), [' + md(en) + '](' + base + TWINS.en[p] + ') (en)');
  return lines.join('\n') + '\n';
}

/* ---------------- Run ---------------- */
const files = {};
for (const f of htmlPages()) {
  const html = read(f);
  if (/id="footerUnits"|<body[^>]*\sdata-unit=|<div class="cards" id="cards">/.test(html)) files[f] = [html, render(f, html)];
}
const home = pageInfo('index.html', read('index.html'));
files['llms.txt'] = [fs.existsSync(path.join(ROOT, 'llms.txt')) ? read('llms.txt') : null, llms(home.rootUrl)];

const stale = Object.keys(files).filter((f) => files[f][0] !== files[f][1]);
if (CHECK) {
  if (stale.length) {
    console.log('static fallback out of date: ' + stale.join(', ') + ' (run: node tools/static-fallback.js)');
    process.exit(1);
  }
  console.log('static fallback up to date (' + Object.keys(files).length + ' files)');
} else {
  stale.forEach((f) => fs.writeFileSync(path.join(ROOT, f), files[f][1]));
  console.log(stale.length ? 'wrote ' + stale.join(', ') : 'nothing to write (' + Object.keys(files).length + ' files up to date)');
}
