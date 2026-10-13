#!/usr/bin/env node
// Regression smoke test for this static site (read-only: serves the files, never writes into the site).
// Pages come from .claude/workflow/project.json (stack.structure.pages). Per page and viewport it checks:
// HTTP 200, console/page errors, failed same-origin requests, horizontal overflow, broken images,
// axe WCAG 2.2 A/AA, and once per page: landmarks/skip link/h1/lang/title/description/canonical + internal links.
//
// Usage: node .claude/workflow/smoke.js [--root <dir>] [--pages index,valis] [--widths 390,820,1440]
//                                       [--no-axe] [--shots <dir>] [--json <file>] [--baseline <json>]
// --baseline: a --json file from an earlier run (e.g. taken at ticket intake). Failures already present there
// are reported as KNOWN (pre-existing) instead of FAIL, so the exit code reflects regressions only.
// Exit code 0 = no new failures (warnings/known allowed), 1 = failures, 2 = setup error.
'use strict';
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const flag = (name) => args.includes('--' + name);

const REPO = path.resolve(__dirname, '..', '..');
const ROOT = path.resolve(opt('root', REPO));
const profile = JSON.parse(fs.readFileSync(path.join(REPO, '.claude', 'workflow', 'project.json'), 'utf8'));
const vp = profile.browser.viewports;
const WIDTHS = (opt('widths', [vp.mobile[0], vp.tablet[0], vp.desktop[0]].join(','))).split(',').map(Number);
const HEIGHT = { [vp.mobile[0]]: vp.mobile[1], [vp.tablet[0]]: vp.tablet[1], [vp.desktop[0]]: vp.desktop[1] };
const slugOf = (p) => (p === 'index.html' ? 'index' : p.replace(/\/index\.html$/, ''));
const urlOf = (slug) => (slug === 'index' ? '/' : '/' + slug + '/');
let PAGES = profile.stack.structure.pages.map(slugOf);
if (opt('pages')) PAGES = opt('pages').split(',');
const AXE = !flag('no-axe');
const SHOTS = opt('shots');
const JSON_OUT = opt('json');
const sig = (r) => [r.page, r.width, r.check, r.detail].join('|');
const KNOWN = new Set(opt('baseline') ? JSON.parse(fs.readFileSync(opt('baseline'), 'utf8')).results
  .filter((r) => r.level === 'FAIL' || r.level === 'KNOWN').map(sig) : []);

function load(mod, candidates) {
  for (const c of candidates) { try { return require(c); } catch (e) { /* next */ } }
  console.error('Cannot load ' + mod + '. Tried:\n  ' + candidates.join('\n  '));
  process.exit(2);
}
const { chromium } = load('playwright', [process.env.PLAYWRIGHT_MODULE, 'playwright',
  path.join(os.homedir(), '.claude/skills/playwright-skill/node_modules/playwright')].filter(Boolean));
let axeSource = '';
if (AXE) {
  const p = [path.join(__dirname, 'node_modules/axe-core/axe.min.js')].find((f) => fs.existsSync(f));
  if (!p) { console.error('axe-core missing: (cd .claude/workflow && npm install) or pass --no-axe'); process.exit(2); }
  axeSource = fs.readFileSync(p, 'utf8');
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.pdf': 'application/pdf' };

function serve(root) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
      let f = path.join(root, p);
      if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) {
        if (!p.endsWith('/')) { res.writeHead(308, { Location: p + '/' }); return res.end(); }
        f = path.join(f, 'index.html');
      }
      if (!fs.existsSync(f)) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

(async () => {
  const srv = await serve(ROOT);
  const base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch({ headless: true, channel: process.env.PW_CHANNEL || profile.browser.channel || undefined });
  const results = [];
  const fail = (page, width, check, detail) => {
    const r = { level: 'FAIL', page, width, check, detail };
    if (KNOWN.has(sig(r))) r.level = 'KNOWN';
    results.push(r);
  };
  const warn = (page, width, check, detail) => results.push({ level: 'WARN', page, width, check, detail });
  const linkCache = new Map();
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

  for (const slug of PAGES) {
    for (const [wi, width] of WIDTHS.entries()) {
      const ctx = await browser.newContext({ viewport: { width, height: HEIGHT[width] || 900 } });
      const page = await ctx.newPage();
      const errors = [], badReq = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) badReq.push(r.status() + ' ' + r.url().slice(base.length)); });
      page.on('requestfailed', (r) => { if (r.url().startsWith(base)) badReq.push('failed ' + r.url().slice(base.length)); });
      let resp;
      try { resp = await page.goto(base + urlOf(slug), { waitUntil: 'load', timeout: 30000 }); }
      catch (e) { fail(slug, width, 'load', String(e)); await ctx.close(); continue; }
      await page.waitForTimeout(400);
      if (!resp || resp.status() !== 200) fail(slug, width, 'http', 'status ' + (resp && resp.status()));
      errors.forEach((e) => fail(slug, width, 'console', e.slice(0, 300)));
      badReq.forEach((r) => fail(slug, width, 'request', r));

      const overflow = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth <= vw + 1) return null;
        const off = [];
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.width && r.right > vw + 1 && getComputedStyle(el).position !== 'fixed') {
            off.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' right=' + Math.round(r.right));
            if (off.length >= 5) break;
          }
        }
        return { scrollWidth: document.documentElement.scrollWidth, viewport: vw, elements: off };
      });
      if (overflow) fail(slug, width, 'overflow', JSON.stringify(overflow));

      const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map((i) => i.getAttribute('src')));
      broken.forEach((s) => fail(slug, width, 'image', 'broken ' + s));

      if (AXE) {
        await page.addScriptTag({ content: axeSource });
        const v = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations
          .map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, target: x.nodes[0] && x.nodes[0].target.join(' ') })));
        v.forEach((x) => (x.impact === 'serious' || x.impact === 'critical' ? fail : warn)(slug, width, 'axe', x.id + ' (' + x.impact + ', ' + x.nodes + ' nodes) e.g. ' + x.target));
      }

      if (wi === 0) {
        const s = await page.evaluate(() => {
          const main = document.querySelector('main');
          const first = [...document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')][0];
          const q = (sel, attr) => { const e = document.querySelector(sel); return e ? (attr ? e.getAttribute(attr) : e.textContent) : null; };
          return {
            main: !!main, mainId: main && main.id,
            skip: first ? { tag: first.tagName, href: first.getAttribute('href') } : null,
            h1: document.querySelectorAll('h1').length, lang: document.documentElement.lang,
            title: document.title, description: q('meta[name="description"]', 'content'), canonical: q('link[rel="canonical"]', 'href'),
            links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
            ids: [...document.querySelectorAll('[id]')].map((e) => e.id),
          };
        });
        if (!s.main) fail(slug, width, 'structure', 'no <main>');
        if (!s.skip || !s.skip.href || !s.mainId || s.skip.href !== '#' + s.mainId) fail(slug, width, 'structure', 'first focusable is not a skip link to #' + s.mainId + ': ' + JSON.stringify(s.skip));
        if (s.h1 !== 1) fail(slug, width, 'structure', s.h1 + ' h1 elements');
        if (!s.lang) fail(slug, width, 'structure', 'html lang missing');
        if (!s.title) fail(slug, width, 'seo', 'empty <title>');
        if (!s.description) fail(slug, width, 'seo', 'meta description missing');
        if (!s.canonical) fail(slug, width, 'seo', 'canonical missing');
        const pageUrl = new URL(base + urlOf(slug));
        for (const href of new Set(s.links)) {
          if (/^(mailto:|tel:|javascript:)/i.test(href)) continue;
          const u = new URL(href, pageUrl);
          if (u.origin !== base) continue;
          if (u.pathname === pageUrl.pathname && u.hash) {
            if (!s.ids.includes(decodeURIComponent(u.hash.slice(1)))) fail(slug, width, 'link', 'anchor target missing: ' + href);
            continue;
          }
          const key = u.pathname;
          if (!linkCache.has(key)) {
            linkCache.set(key, await new Promise((res) => http.get(base + key, (r) => { r.resume(); res(r.statusCode); }).on('error', () => res(0))));
          }
          const code = linkCache.get(key);
          if (code >= 400 || code === 0) fail(slug, width, 'link', code + ' ' + href);
        }
      }
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, slug + '-' + width + '.png'), fullPage: true });
      await ctx.close();
    }
  }
  await browser.close();
  srv.close();

  const fails = results.filter((r) => r.level === 'FAIL');
  const warns = results.filter((r) => r.level === 'WARN');
  const known = results.filter((r) => r.level === 'KNOWN');
  for (const r of results) console.log(r.level + '  ' + r.page + '@' + r.width + '  ' + r.check + '  ' + r.detail);
  const summary = { root: ROOT, pages: PAGES, widths: WIDTHS, axe: AXE, checkedRuns: PAGES.length * WIDTHS.length,
    failures: fails.length, known: known.length, warnings: warns.length, baseline: opt('baseline') || null };
  console.log((fails.length ? 'SMOKE FAIL ' : 'SMOKE PASS ') + JSON.stringify(summary));
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ summary, results }, null, 2));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
