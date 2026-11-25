#!/usr/bin/env node
// Repo security scanner. No dependencies. Run from anywhere: node tools/security/check.mjs
// Exit code 1 if any FAIL. WARN lines are advisory (human review).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rel = (p) => path.relative(ROOT, p).replaceAll('\\', '/');
const fails = [], warns = [];
const fail = (check, file, line, msg) => fails.push({ check, file, line, msg });
const warn = (check, file, line, msg) => warns.push({ check, file, line, msg });

// ---- file walk --------------------------------------------------------------
const SKIP_DIR = new Set(['node_modules', '.git', 'images']);
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(e.name)) continue;
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const TEXT = /\.(html|js|mjs|css|json|md|txt)$/i;
const all = [...walk(path.join(ROOT, 'web')), ...walk(path.join(ROOT, 'tools'))].filter((p) => TEXT.test(p));
const read = new Map(all.map((p) => [p, fs.readFileSync(p, 'utf8')]));
const lineOf = (s, i) => s.slice(0, i).split('\n').length;
const isVendor = (p) => rel(p).startsWith('web/vendor/');
const SELF = rel(fileURLToPath(import.meta.url));
const web = (re) => [...read].filter(([p]) => re.test(rel(p)));

// ---- (a) secrets ------------------------------------------------------------
const SECRETS = [
  [/service_role/g, 'service_role reference'],
  [/sb_secret_[A-Za-z0-9_-]{8,}/g, 'Supabase secret key'],
  [/-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g, 'private key'],
  [/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, 'AWS access key id'],
  [/\bsk-[A-Za-z0-9]{32,}\b/g, 'API secret key (sk-)'],
  [/\bghp_[A-Za-z0-9]{36}\b/g, 'GitHub token'],
];
for (const [p, s] of read) {
  if (rel(p) === SELF) continue;
  for (const [re, what] of SECRETS) for (const m of s.matchAll(re)) fail('a-secrets', rel(p), lineOf(s, m.index), what);
  for (const m of s.matchAll(/eyJ[\w-]{8,}\.(eyJ[\w-]{8,})\.[\w-]{8,}/g)) {
    try {
      const role = JSON.parse(Buffer.from(m[1], 'base64url').toString()).role;
      if (role && role !== 'anon') fail('a-secrets', rel(p), lineOf(s, m.index), `JWT with role=${role}`);
    } catch { /* not a JWT */ }
  }
}

// ---- (b) target=_blank without noopener / window.open ----------------------
for (const [p, s] of web(/^web\/.*\.(html|js)$/)) {
  if (isVendor(p)) continue;
  for (const m of s.matchAll(/target=\\?["']?_blank/g)) {
    const a = s.lastIndexOf('<', m.index), b = s.indexOf('>', m.index);
    const tag = s.slice(Math.max(a, m.index - 400), b < 0 ? m.index + 400 : b);
    if (!/rel=\\?["'][^"']*noopener/.test(tag)) fail('b-noopener', rel(p), lineOf(s, m.index), 'target="_blank" without rel="noopener"');
  }
  for (const m of s.matchAll(/window\.open\(([^)]*)\)/g))
    if (!/noopener/.test(m[1])) warn('b-noopener', rel(p), lineOf(s, m.index), 'window.open without noopener feature');
}

// ---- (c) javascript:/data: hrefs -------------------------------------------
for (const [p, s] of web(/^web\/.*\.(html|js)$/)) {
  if (isVendor(p)) continue;
  for (const m of s.matchAll(/(?:href|src|action|formaction)\s*=\s*\\?["']?\s*(javascript|data|vbscript)\s*:/gi))
    if (!(m[1].toLowerCase() === 'data' && /src\s*=/i.test(m[0]))) fail('c-href', rel(p), lineOf(s, m.index), `${m[1]}: URL in attribute`);
}

// ---- (d) innerHTML / insertAdjacentHTML sinks ------------------------------
// Model: db-loader.js escapes every catalog string at ingestion (esc/safeUrl), and i18n text is static. So an
// interpolation is only flagged when it can carry data that did NOT pass ingestion: URL/query/hash, form input,
// storage, third-party API JSON, or (STRICT files) any raw row field. Wrapping in esc()/safeUrl()/Number() clears it.
const STRICT_FILES = new Set(['web/sources.js']); // reads Supabase rows directly, bypassing db-loader escaping
// Convention: in-file helpers named safe[A-Z]*() (e.g. safeLink) return already-escaped HTML.
const SAFE_CALL = /\b(esc|safeUrl|escapeHtml|escHtml|encodeURIComponent|Number|parseInt|parseFloat|safe[A-Z]\w*)\(/;
const UNTRUSTED = /\b(location|document\.referrer|URLSearchParams|localStorage|sessionStorage|responseText)\b|\.(value|dataset|hash|search|textContent|innerText)\b|\b(json|j|res|response|payload)\./;
const SAFE_EXPR = [
  /^[\d\s.+*/()-]+$/,                                  // arithmetic
  /\.(toFixed|toLocaleString|length)\b/,               // numeric formatting
  /^(UI|T|TL|P|R|L|t|H|C)\b[\w.[\]'"]*$/,              // static i18n text
  /^(i|idx|index|n|k|count|total|pct|id|year)$/,       // numeric loop vars
  /^['"`][^'"`$]*['"`]$/,                              // string literal
  /^[\w.]+\s*(===|!==|>=|<=|>|<)\s*[\w.'"]+$/,         // boolean comparison
];
function templateExprs(s, start) { // start at the opening backtick; returns [exprs, endIndex]
  const out = []; let i = start + 1;
  while (i < s.length && s[i] !== '`') {
    if (s[i] === '\\') { i += 2; continue; }
    if (s[i] === '$' && s[i + 1] === '{') {
      let d = 1, j = i + 2;
      while (j < s.length && d) {
        if (s[j] === '`') { const [, e] = templateExprs(s, j); j = e; }
        else if (s[j] === '{') d++;
        else if (s[j] === '}') d--;
        j++;
      }
      out.push({ expr: s.slice(i + 2, j - 1), at: i }); i = j; continue;
    }
    i++;
  }
  return [out, i + 1];
}
let STRICT = false;
function unsafeExprs(expr) {
  const e = expr.trim();
  if (e.includes('`')) { // nested template(s): check their own interpolations
    const bad = []; let k = e.indexOf('`');
    while (k >= 0) { const [inner, end] = templateExprs(e, k); for (const x of inner) bad.push(...unsafeExprs(x.expr)); k = e.indexOf('`', end); }
    return bad;
  }
  if (SAFE_CALL.test(e) || SAFE_EXPR.some((r) => r.test(e))) return [];
  const parts = e.split(/\?\?|\|\||\?|(?<![?.]):(?!:)|&&/).map((x) => x.trim()).filter(Boolean);
  if (parts.length > 1) return parts.flatMap(unsafeExprs);
  return STRICT || UNTRUSTED.test(e) ? [e] : [];
}
const short = (x, n) => '${' + x.replace(/\s+/g, ' ').slice(0, n) + '}';
const sinkRe = /(\.innerHTML\s*\+?=|\.outerHTML\s*=|insertAdjacentHTML\s*\(\s*['"][a-z]+['"]\s*,)\s*/g;
const sinkStats = { sinks: 0, flagged: 0 };
const LOC = /location\.(?:search|hash|href)|URLSearchParams|\.searchParams\b/;
for (const [p, s] of web(/^web\/(?:admin\/)?[^/]+\.js$/)) {
  STRICT = STRICT_FILES.has(rel(p));
  // variables initialised from the URL; using them (or location.*) in a sink without escaping is a FAIL
  const tainted = [...s.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*[^;\n]*(?:location\.(?:search|hash)|URLSearchParams|\.searchParams)/g)].map((m) => m[1]);
  for (const m of s.matchAll(sinkRe)) {
    sinkStats.sinks++;
    const at = m.index + m[0].length, line = lineOf(s, m.index);
    const stmt = s.slice(at, at + 2500).split(/;\s*\n/)[0], bad = [];
    for (let k = stmt.indexOf('`'); k >= 0;) { const [ex, end] = templateExprs(stmt, k); ex.forEach((x) => bad.push(...unsafeExprs(x.expr))); k = stmt.indexOf('`', end); }
    if (!stmt.includes('`') && /^[\w$.]+(?:\[[^\]]*\])?\s*;?$/.test(stmt.trim()) && (STRICT || UNTRUSTED.test(stmt))) bad.push(stmt.trim());
    if (/^['"][^'"]*['"]\s*\+/.test(stmt) && (STRICT || UNTRUSTED.test(stmt))) bad.push(stmt.slice(0, 40));
    const exprs = [];
    for (let k = stmt.indexOf('`'); k >= 0;) { const [ex, end] = templateExprs(stmt, k); exprs.push(...ex.map((x) => x.expr)); k = stmt.indexOf('`', end); }
    if (!stmt.includes('`')) exprs.push(stmt);
    for (const e of exprs) if (!SAFE_CALL.test(e) && (LOC.test(e) || tainted.some((n) => new RegExp('\\b' + n + '\\b').test(e)))) fail('i-location', rel(p), line, `URL-derived value written to HTML without escaping: ${short(e, 50)}`);
    if (bad.length) { sinkStats.flagged++; warn('d-sink', rel(p), line, `unescaped: ${[...new Set(bad)].slice(0, 3).map((x) => short(x, 50)).join(' ')}`); }
  }
}

// Template pass: every HTML-looking template literal in code files, wherever it is later used (helpers like detailHtml/card).
function* topTemplates(s) {
  const NL = String.fromCharCode(10), BS = String.fromCharCode(92);
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (c === '/' && n === '/') { i = s.indexOf(NL, i); if (i < 0) return; }
    else if (c === '/' && n === '*') { i = s.indexOf('*/', i); if (i < 0) return; i++; }
    else if (c === "'" || c === '"') { for (i++; i < s.length && s[i] !== c && s[i] !== NL; i++) if (s[i] === BS) i++; }
    else if (c === '`') { const [exprs, end] = templateExprs(s, i); yield [i, s.slice(i, end), exprs]; i = end - 1; }
  }
}
for (const [p, s] of web(/^web\/(?:admin\/monitor|site|map|intro|footer|stack-list|language|motion|sources|db-loader|page|cover|hires)\.js$/)) {
  STRICT = STRICT_FILES.has(rel(p));
  for (const [at, text, exprs] of topTemplates(s)) {
    if (!/<[a-z!]/i.test(text)) continue;
    const bad = exprs.flatMap((x) => unsafeExprs(x.expr));
    if (bad.length) warn('d-template', rel(p), lineOf(s, at), `HTML template interpolates unescaped: ${[...new Set(bad)].slice(0, 3).map((x) => short(x, 40)).join(' ')}`);
  }
}

// ---- (e) eval / new Function / document.write ------------------------------
for (const [p, s] of web(/^web\/.*\.(html|js)$/)) {
  for (const m of s.matchAll(/(?<![\w.$])(eval\s*\(|new\s+Function\s*\(|document\.write(?:ln)?\s*\()/g)) {
    const msg = `${m[1].replace(/\s+/g, ' ')} usage`;
    isVendor(p) ? warn('e-eval', rel(p), lineOf(s, m.index), msg + ' (vendor)') : fail('e-eval', rel(p), lineOf(s, m.index), msg);
  }
  for (const m of s.matchAll(/setTimeout\(\s*['"`]|setInterval\(\s*['"`]/g)) fail('e-eval', rel(p), lineOf(s, m.index), 'string passed to setTimeout/setInterval');
}

// ---- (f) CSP meta on every html page + parity with serve.json --------------
const parseCsp = (v) => Object.fromEntries(v.split(';').map((x) => x.trim()).filter(Boolean).map((x) => { const [k, ...r] = x.split(/\s+/); return [k, r]; }));
const pages = web(/^web\/(?:admin\/)?[^/]+\.html$/);
let metaCsp = null;
for (const [p, s] of pages) {
  const m = s.match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*content="([^"]+)"/i);
  if (!m) { fail('f-csp', rel(p), 1, 'missing CSP <meta>'); continue; }
  const c = parseCsp(m[1]); if (rel(p) === 'web/index.html') metaCsp = c;
  if (/unsafe-eval/.test(m[1])) fail('f-csp', rel(p), 1, "CSP contains 'unsafe-eval'");
  if ((c['script-src'] || c['default-src'] || []).includes("'unsafe-inline'")) fail('f-csp', rel(p), 1, "CSP script-src contains 'unsafe-inline'");
  if (!c['object-src']?.includes("'none'")) fail('f-csp', rel(p), 1, "CSP lacks object-src 'none'");
  if (/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i.test(s)) fail('f-csp', rel(p), 1, 'inline <script> block would be blocked by CSP');
  if (/\son[a-z]+\s*=\s*["']/i.test(s.replace(/<script[\s\S]*?<\/script>/gi, ''))) fail('f-csp', rel(p), 1, 'inline event handler attribute would be blocked by CSP');
}
const csvText = (f) => (fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : null);
for (const f of ['web/serve.json', 'vercel.json']) {
  const t = csvText(f); if (!t) { warn('f-csp', f, 0, 'file missing'); continue; }
  const j = JSON.parse(t);
  const hdr = (j.headers || []).flatMap((r) => r.headers).find((h) => h.key === 'Content-Security-Policy');
  if (!hdr) { fail('f-csp', f, 0, 'no Content-Security-Policy header'); continue; }
  const h = parseCsp(hdr.value);
  if (!h['frame-ancestors']) fail('f-csp', f, 0, 'header CSP lacks frame-ancestors');
  if (metaCsp) for (const k of Object.keys(metaCsp)) if (k !== 'img-src' && JSON.stringify(metaCsp[k]) !== JSON.stringify(h[k])) fail('f-csp', f, 0, `header CSP differs from meta in ${k}`);
  // The header permits HTTPS images for the admin preview. Public pages keep
  // their narrower meta CSP, so both policies still restrict public images.
  if (!h['img-src']?.includes('https:')) fail('f-csp', f, 0, 'header CSP must allow admin HTTPS photo previews');
}
const adminPage = pages.find(([p]) => rel(p) === 'web/admin/monitor.html');
const adminPolicy = adminPage && parseCsp(adminPage[1].match(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*content="([^"]+)"/i)?.[1] || '');
if (!adminPolicy?.['img-src']?.includes('https:')) fail('f-csp', 'web/admin/monitor.html', 1, 'admin CSP must allow HTTPS photo previews');
if (metaCsp?.['img-src']?.includes('https:')) fail('f-csp', 'web/index.html', 1, 'public CSP must retain restricted image hosts');
const csp = metaCsp || {};
// /admin/: noindex meta on every admin page, and noindex + no-store headers for /admin in both header files.
for (const [p, s] of pages) if (/^web\/admin\//.test(rel(p)) && !/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(s)) fail('f-csp', rel(p), 1, 'admin page lacks robots noindex meta');
for (const f of ['web/serve.json', 'vercel.json']) {
  const t = csvText(f); if (!t) continue;
  const rule = (JSON.parse(t).headers || []).find((r) => /admin/.test(r.source)), keys = Object.fromEntries((rule?.headers || []).map((h) => [h.key, h.value]));
  if (!/noindex/.test(keys['X-Robots-Tag'] || '') || !/no-store/.test(keys['Cache-Control'] || '')) fail('f-csp', f, 0, 'admin headers rule needs X-Robots-Tag noindex + Cache-Control no-store');
}

// ---- (h) third-party hosts used as resources but not in CSP ----------------
const CODE_JS = /^web\/(?:admin\/monitor|site|map|intro|hires|db-loader|sources|footer|stack-list|language|motion|page|cover)\.js$/;
const hostOk = (kind, host) => {
  const dir = { connect: 'connect-src', img: 'img-src', style: 'style-src', font: 'font-src', script: 'script-src' }[kind];
  const list = csp[dir] || csp['default-src'] || [];
  return list.some((o) => o === `https://${host}`);
};
const seen = new Map();
const note = (kind, host, p, i, s) => { const k = `${kind}|${host}`; if (!seen.has(k)) seen.set(k, { kind, host, file: rel(p), line: lineOf(s, i) }); };
for (const [p, s] of web(/^web\/[^/]+\.(html|js|css)$/)) {
  if (isVendor(p)) continue;
  const code = CODE_JS.test(rel(p));
  const pats = [
    [/<link[^>]+rel=["']stylesheet["'][^>]*href=["']https:\/\/([\w.-]+)/g, 'style'],
    [/<link[^>]+href=["']https:\/\/([\w.-]+)[^>]*rel=["']stylesheet/g, 'style'],
    [/<script[^>]+src=["']https:\/\/([\w.-]+)/g, 'script'],
    [/@import\s+url\(["']?https:\/\/([\w.-]+)/g, 'style'],
    [/(?<!@import\s)url\(\s*["']?https:\/\/([\w.-]+)/g, 'img'],
    [/(?:fetch|tileLayer)\(\s*[`'"]https:\/\/([\w.-]+)/g, 'img'],
    [/\.src\s*=\s*[`'"]https:\/\/([\w.-]+)/g, 'img'],
    [/https:\/\/([\w.-]+)\/[^"'`\s)\\]*\.(?:jpe?g|png|webp|gif|svg|avif)\b/gi, 'img'],
    ...(code ? [[/(?:project|root|API|BASE)\s*=\s*['"`]https:\/\/([\w.-]+)/g, 'connect'], [/\[\s*[`'"]https:\/\/([\w.-]+)[^`'"]*[`'"]\s*,\s*\(?\w*\)?\s*=>/g, 'connect']] : []),
  ];
  for (const [re, kind] of pats) for (const m of s.matchAll(re)) {
    let k = kind;
    if (/fetch\(/.test(m[0])) k = 'connect';
    if (/^https:\/\/cyberjapandata/.test(m[0].replace(/^.*?(https:)/, '$1')) || /tileLayer/.test(m[0])) k = 'img';
    if (/commons\.wikimedia\.org$|upload\.wikimedia\.org$/.test(m[1]) && /\/wiki\/File:/.test(s.slice(m.index, m.index + 200))) continue; // plain credit link
    if (!hostOk(k, m[1])) note(k, m[1], p, m.index, s);
  }
}
for (const x of seen.values()) {
  const d = `${x.kind}: https://${x.host} not allowed by CSP`;
  // image hosts coming from catalog data are enforced by CSP at runtime; a repo hit is a real mismatch
  fail('h-hosts', x.file, x.line, d);
}

// ---- (j) fetch() targets: same-origin or CSP connect-src hosts ---------------
const connectHosts = new Set((csp['connect-src'] || []).filter((o) => o.startsWith('https://')).map((o) => o.slice(8)));
const fetchStats = { calls: 0 };
for (const [p, s] of web(/^web\/(?:admin\/)?[^/]+\.js$/)) {
  const decl = (name) => { const m = s.match(new RegExp('(?:const|let|var)\\s+' + name + '\\s*=\\s*[\'"`]([^\'"`]*)')); return m ? m[1] : null; };
  for (const m of s.matchAll(/(?<![\w.$])fetch\(\s*([^,)]+)/g)) {
    fetchStats.calls++;
    const a = m[1].trim(), line = lineOf(s, m.index); let val = null;
    if (/^[`'"]/.test(a)) val = a.slice(1);
    else if (/^\w+$/.test(a)) val = decl(a);
    const base = val && val.match(/^\$\{(\w+)\}/); if (base) val = decl(base[1]) ?? val;
    if (val == null) { warn('j-fetch', rel(p), line, `dynamic fetch target (${short(a, 30)}); hosts in this file are covered by check h`); continue; }
    if (/^https?:\/\//i.test(val)) {
      if (!/^https:/i.test(val)) fail('j-fetch', rel(p), line, 'non-https fetch');
      else if (!connectHosts.has(val.slice(8).split(/[/?`'"]/)[0])) fail('j-fetch', rel(p), line, `fetch host not in CSP connect-src: ${val.slice(0, 50)}`);
    } else if (/^(\/\/|javascript:|data:)/i.test(val)) fail('j-fetch', rel(p), line, 'fetch to protocol-relative/script URL');
  }
}

// ---- (g) data files (optional) ---------------------------------------------
const BBOX = { lat: [20, 46.5], lon: [122, 154.5] };
const PRECISION = new Set(['facility', 'area', 'prefecture']);
const STATE = new Set(['ok', 'changed', 'unreachable', 'blocked']);
const FLAGS = new Set(['closure-keyword', 'price-keyword', 'hours-keyword']);
const DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z)?$/;
const ID = /^[\w-]{1,80}$/;
const FREE =/[<>`]|javascript:|data:text|\bon\w+\s*=/i;
function* nodes(v, trail = '$') { yield [v, trail]; if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) yield* nodes(x, `${trail}.${k}`); }
for (const [p, s] of web(/^web\/data\/[^/]+\.json$/)) {
  const f = rel(p), name = path.basename(p); let j;
  try { j = JSON.parse(s); } catch (e) { fail('g-data', f, 1, `invalid JSON: ${e.message}`); continue; }
  for (const [v, t] of nodes(j)) if (typeof v === 'string' && (FREE.test(v) || v.length > 500)) fail('g-data', f, 0, `${t}: suspicious string (markup/script/too long)`);
  if (name === 'fx.json') {
    for (const [v, t] of nodes(j.rates ?? j)) if (typeof v === 'number' && !(v > 0 && v < 1e6)) fail('g-data', f, 0, `${t}: rate out of range`);
    const r = Object.entries(j.rates ?? {}).filter(([, v]) => typeof v !== 'number'); if (r.length) fail('g-data', f, 0, `non-numeric rate(s): ${r.map(([k]) => k).join(',')}`);
  }
  if (name === 'coords.json') for (const [v, t] of nodes(j)) {
    if (v && typeof v === 'object' && 'lat' in v && ('lon' in v || 'lng' in v)) {
      const lon = v.lon ?? v.lng;
      if (!Number.isFinite(v.lat) || !Number.isFinite(lon) || v.lat < BBOX.lat[0] || v.lat > BBOX.lat[1] || lon < BBOX.lon[0] || lon > BBOX.lon[1]) fail('g-data', f, 0, `${t}: lat/lon not finite or outside Japan bbox`);
      if (!PRECISION.has(v.precision)) fail('g-data', f, 0, `${t}: precision "${v.precision}" not in {facility,area,prefecture}`);
    }
  }
  if (name === 'prices.json') for (const [id, v] of Object.entries(j.items ?? {})) {
    if (!ID.test(id) || !(Number.isFinite(v.from) && v.from >= 500 && v.from <= 1e6) || v.unit !== 'JPY/person/night' || !(typeof v.basis === 'string' && v.basis) || !DATE.test(v.checked ?? '') || !/^https?:\/\//i.test(v.src ?? '')) fail('g-data', f, 0, `items.${id}: price/unit/basis/checked/src invalid`);
    else if (!/^https:\/\//i.test(v.src)) warn('g-data', f, 0, `items.${id}: non-https price source`);
  }
  if (name === 'price-stats.json') for (const [k, v] of Object.entries(j.byPref ?? {})) if (!(v.n >= 5 && [v.median, v.min, v.max].every(Number.isFinite))) fail('g-data', f, 0, `byPref.${k}: needs n>=5 and finite numbers`);
  if (name === 'overrides.json') for (const [id, v] of Object.entries(j)) if (!ID.test(id) || JSON.stringify(Object.keys(v ?? {})) !== '["hp"]' || v.hp !== null) fail('g-data', f, 0, `${id}: only {"hp":null} is supported`);
  if (name === 'names-fix.json') for (const [id, v] of Object.entries(j)) if (!ID.test(id) || typeof v?.n !== 'string' || !v.n) fail('g-data', f, 0, `${id}: needs a non-empty "n"`);
  if (name === 'source-status.json') for (const [v, t] of nodes(j.items ?? j)) {
    if (v && typeof v === 'object' && 'state' in v) {
      if (!STATE.has(v.state)) fail('g-data', f, 0, `${t}: state "${v.state}" not in enum`);
      if (!Array.isArray(v.flags ?? []) || (v.flags ?? []).some((x) => !FLAGS.has(x))) fail('g-data', f, 0, `${t}: flags not in enum`);
      for (const k of ['checked', 'changedAt']) if (v[k] != null && !(DATE.test(String(v[k])) && Number.isFinite(Date.parse(v[k])))) fail('g-data', f, 0, `${t}: ${k} is not a date`);
    }
    if (typeof v === 'string' && /^https?:/i.test(v) && !/^https:\/\//i.test(v)) warn('g-data', f, 0, `${t}: non-https URL`);
  }
}

// ---- (k) photo licence required fields (web/data.js PHOTOS + web/photo-assets.js) ----------------
// Every shot is [path, author, licence, meta?]. FAIL when author or licence is missing, or when a non-Commons
// (facility/official) shot has no https source. WARN on non-https hotlinks. Evaluated in a sandbox; nothing is executed outside it.
{
  const dataSrc = read.get(path.join(ROOT, 'web/data.js')), assetSrc = read.get(path.join(ROOT, 'web/photo-assets.js'));
  if (dataSrc && assetSrc) {
    try {
      const noop = new Proxy(function () {}, { get: () => noop, apply: () => noop });
      const ctx = vm.createContext({ window: noop, document: noop, console: { log() {}, warn() {}, error() {} } });
      const out = vm.runInContext(`${dataSrc}\n${assetSrc}\n({ PHOTOS, LOCAL_PHOTOS })`, ctx, { timeout: 5000 });
      let shots = 0;
      for (const [key, ph] of Object.entries(out.PHOTOS)) (ph.shots || []).forEach((sh, i) => {
        shots++;
        const [file, author, lic, meta] = sh, at = `PHOTOS.${key}.shots[${i}]`, bad = (v) => typeof v !== 'string' || !v.trim();
        if (bad(file)) return fail('k-photo-licence', 'web/data.js', 0, `${at}: missing file path`);
        if (bad(author) && bad(meta?.credit)) fail('k-photo-licence', 'web/photo-assets.js', 0, `${at} (${file}): missing author/credit`);
        if (bad(lic) && bad(meta?.credit)) fail('k-photo-licence', 'web/photo-assets.js', 0, `${at} (${file}): missing licence`);
        const commons = /^[0-9a-f]\/[0-9a-f]{2}\//.test(file); // Commons hash path implies a Commons source page
        if (!commons && !(typeof meta?.source === 'string' && /^https:\/\//.test(meta.source))) fail('k-photo-licence', 'web/photo-assets.js', 0, `${at} (${file}): non-Commons photo without https source`);
        for (const u of [meta?.source, meta?.terms, file]) if (typeof u === 'string' && /^http:\/\//i.test(u)) warn('k-photo-http', 'web/photo-assets.js', 0, `${at}: non-https URL ${u}`);
      });
      for (const [k, v] of Object.entries(out.LOCAL_PHOTOS)) if (/^http:\/\//i.test(v)) warn('k-photo-http', 'web/photo-assets.js', 0, `LOCAL_PHOTOS ${k}: non-https ${v}`);
      console.log(`photo licence check: ${shots} photo entries inspected`);
    } catch (e) { fail('k-photo-licence', 'web/photo-assets.js', 0, `could not evaluate photo data: ${e.message}`); }
  }
}

// ---- report ----------------------------------------------------------------
const group = (arr) => arr.reduce((m, x) => ((m[x.check] ||= []).push(x), m), {});
const show = (label, arr, max) => {
  const g = group(arr);
  for (const [c, xs] of Object.entries(g)) {
    console.log(`\n${label} ${c} (${xs.length})`);
    for (const x of xs.slice(0, max)) console.log(`  ${x.file}${x.line ? ':' + x.line : ''}  ${x.msg}`);
    if (xs.length > max) console.log(`  ... ${xs.length - max} more`);
  }
};
console.log(`security check: ${all.length} files scanned, ${pages.length} html pages, ${sinkStats.sinks} HTML sinks (${sinkStats.flagged} flagged), ${fetchStats.calls} fetch() calls`);
show('FAIL', fails, 30);
show('WARN', warns, 15);
console.log(`\n${fails.length ? 'RESULT: FAIL' : 'RESULT: PASS'} (${fails.length} failures, ${warns.length} warnings)`);
process.exit(fails.length ? 1 : 0);
