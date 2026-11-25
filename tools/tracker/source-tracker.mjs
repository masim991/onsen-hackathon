#!/usr/bin/env node
// Official source tracker: polite, read-only watcher for facility source pages.
// Writes ONLY: tools/tracker/state.json, review-queue.json/.md, summary.txt, reviewed.json (--review) and web/data/source-status.json.
// It never edits facility data. Fetched text is untrusted data; raw HTML is never stored.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import net from 'node:net';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// 같은 폴더의 파일을 웹 서버가 읽는 중이어도 안전하게 교체한다(Windows EPERM/EBUSY 재시도).
function renameRetry(from, to) {
  for (let i = 0; i < 20; i++) {
    try { fs.renameSync(from, to); return; }
    catch (e) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150 + i * 50);
    }
  }
  fs.copyFileSync(from, to);
  fs.unlinkSync(from);
}


const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const WEB = path.join(ROOT, 'web');
const F = {
  state: path.join(HERE, 'state.json'),
  queue: path.join(HERE, 'review-queue.json'),
  md: path.join(HERE, 'review-queue.md'),
  status: path.join(WEB, 'data', 'source-status.json'),
  summary: path.join(HERE, 'summary.txt'),
  reviewed: path.join(HERE, 'reviewed.json'),
};
const TOOL = 'OnsenHackathonSourceTracker/1.0';
const UA = TOOL;
export const LIM = { timeoutMs: 12000, maxBody: 1.5 * 1024 * 1024, maxRedirects: 3, hostDelayMs: 2000, robotsMax: 512 * 1024, maxCrawlDelayMs: 30000, changedWindowDays: 14 };
const DAY = 86400000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (s, n = 16) => crypto.createHash('sha256').update(s).digest('hex').slice(0, n);

// ---------- text safety ----------
// Strip control chars, bidi/zero-width controls, and angle brackets; collapse whitespace.
export function cleanText(s) {
  return String(s ?? '').normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿<>]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
const mdEsc = (s) => s.replace(/([\\`*_{}\[\]()#+!|~>&])/g, '\\$1');

// ---------- URL filter / SSRF guard ----------
export function isPrivateIp(ip) {
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    const m = l.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped
    if (m) return isPrivateIp(m[1]);
    if (/^::ffff:[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(l)) return true; // hex-form mapped: refuse
    return l === '::' || l === '::1' || /^f[cd]/.test(l) || /^fe[89ab]/.test(l) || /^ff/.test(l) || l.startsWith('2001:db8') || l.startsWith('64:ff9b');
  }
  if (!net.isIPv4(ip)) return true;
  const [a, b] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
}
// Returns normalized URL string, or null when it must not be fetched.
export function watchUrl(raw) {
  if (typeof raw !== 'string') return null;
  let u;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (u.username || u.password) return null;
  if (u.port && u.port !== (u.protocol === 'https:' ? '443' : '80')) return null;
  const h = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!h || h === 'localhost' || /\.(localhost|local|internal|lan|home|test|invalid)$/.test(h) || !h.includes('.') && !net.isIP(h)) return null;
  if (net.isIP(h) && isPrivateIp(h)) return null;
  if (/(^|\.)spa\.or\.jp$/.test(h)) return null; // association directory, not the facility's own source
  u.hash = '';
  return u.href;
}

// ---------- HTML parsing (regex only, never executed) ----------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const c = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ' '; }
  return ENT[e.toLowerCase()] ?? m;
});
export function htmlToLines(html) {
  const t = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg|iframe)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<\/?(br|p|div|li|ul|ol|tr|td|th|table|h[1-6]|dt|dd|dl|section|article|header|footer|nav|main|aside|form|option)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ');
  const lines = [];
  for (const raw of decode(t).split('\n')) {
    for (const part of raw.split(/(?<=[。！？])/)) { const s = cleanText(part); if (s.length >= 2) lines.push(s); }
  }
  return lines;
}
// Hash input: dates, clock times, counters and copyright years are dropped so trivial churn is ignored.
export function normalizeForHash(lines) {
  return lines.join(' ').normalize('NFKC').toLowerCase()
    .replace(/(?:©|copyright|\(c\))[^\n]{0,40}?(?:19|20)\d\d(?:\s*[-–~]\s*(?:19|20)\d\d)?/g, ' ')
    .replace(/(?:令和|平成|r)\s*\d{1,2}\s*年/g, ' ')
    .replace(/\d{2,4}\s*[年\/.\-]\s*\d{1,2}\s*[月\/.\-]\s*\d{1,2}\s*日?/g, ' ')
    .replace(/\d{1,2}\s*月\s*\d{1,2}\s*日/g, ' ')
    .replace(/\d{1,2}\s*:\s*\d{2}(?::\d{2})?/g, ' ')
    .replace(/(?:アクセス|閲覧|訪問|来場|カウンタ|counter|views?|visitors?|조회)[^\d]{0,8}\d[\d,]*/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
export const hashContent = (lines) => sha(normalizeForHash(lines), 20);

const KW = {
  closure: /臨時休業|臨時休館|休館|休業|閉館|閉店|廃業|営業終了|営業を終了|運営終了|営業休止|永久閉鎖|폐업|휴관|휴업|임시\s*휴|영업\s*종료|\bclosed\b|\bclosure\b|permanently closed|temporarily closed/i,
  price: /料金改定|価格改定|値上げ|値上|料金変更|料金の改定|料金を改定|price (?:increase|change|revision)|rate (?:increase|change)|요금\s*(?:인상|개정|변경)/i,
  hours: /営業時間|受付時間|開館時間|入館時間|opening hours|business hours|hours of operation|영업\s*시간|운영\s*시간/i,
  notice: /お知らせ|重要|メンテナンス|\bnotice\b|\bimportant\b|공지/i,
};
const HOURS_CHANGE = /変更|短縮|延長|変わ|changed?|revis|shorten|extend|변경|단축/i;
const MASK_REGULAR = /定休日|定?休(?:館|業)日|閉館時間|休館時間|閉店時間|休止日|closed\s*(?:on|:|every|mondays?|tuesdays?|wednesdays?|thursdays?|fridays?)/gi;
// Closure wording only counts inside a notice area: the line names a notice heading, is a dated item,
// or follows a short notice heading within 6 lines.
const NOTICE_HEAD = /お知らせ|新着|重要|インフォメーション|トピックス|\bnews\b|\binformation\b|\bnotice\b|공지/i;
const DATED = /(?:19|20)\d\d\s*[年\/.\-]\s*\d{1,2}|\d{1,2}\s*月\s*\d{1,2}\s*日|(?:令和|平成)\s*\d{1,2}\s*年/;
function inNoticeArea(lines, i) {
  if (NOTICE_HEAD.test(lines[i]) || DATED.test(lines[i])) return true;
  for (let j = Math.max(0, i - 6); j < i; j++) if (lines[j].length <= 30 && NOTICE_HEAD.test(lines[j])) return true;
  return false;
}
const FLAG_NAME = { closure: 'closure-keyword', price: 'price-keyword', hours: 'hours-keyword' };

// Returns {flags:[...], snippets:[{kind,text}]} (<=5 snippets, each <=140 chars).
export function extractNotices(lines) {
  const found = { closure: [], price: [], hours: [], notice: [] };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const probe = line.replace(MASK_REGULAR, ' ');
    let kinds = [];
    if (KW.closure.test(probe) && inNoticeArea(lines, i)) kinds.push('closure');
    if (KW.price.test(line)) kinds.push('price');
    if (KW.hours.test(line) && HOURS_CHANGE.test(line)) kinds.push('hours');
    if (!kinds.length && line.length >= 8 && KW.notice.test(line)) kinds.push('notice');
    for (const k of kinds) {
      const m = (k === 'closure' ? probe : line).match(KW[k]);
      const at = m ? m.index : 0;
      const text = line.length <= 140 ? line : line.slice(Math.max(0, at - 50), Math.max(0, at - 50) + 140);
      found[k].push(cleanText(text));
    }
  }
  const flags = Object.keys(FLAG_NAME).filter((k) => found[k].length).map((k) => FLAG_NAME[k]);
  const snippets = [];
  const seen = new Set();
  for (const k of ['closure', 'price', 'hours', 'notice']) {
    for (const text of found[k]) {
      if (snippets.length >= 5) break;
      if (seen.has(text)) continue;
      seen.add(text); snippets.push({ kind: k, text });
    }
  }
  return { flags, snippets };
}
export function metaOf(html) {
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  let desc = '';
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (/\bname\s*=\s*["']?description["']?/i.test(m[0])) { const c = m[0].match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i); if (c) { desc = c[1] ?? c[2]; break; } }
  }
  return { title: cleanText(decode(t ? t[1] : '')).slice(0, 140), description: cleanText(decode(desc)).slice(0, 140) };
}

// ---------- robots.txt ----------
export function parseRobots(text) {
  const groups = []; let cur = null, prevUA = false;
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.replace(/#.*/, '').match(/^\s*([A-Za-z-]+)\s*:\s*(.*?)\s*$/);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2];
    if (k === 'user-agent') { if (!prevUA) { cur = { agents: [], rules: [], delay: 0 }; groups.push(cur); } cur.agents.push(v.toLowerCase()); prevUA = true; continue; }
    prevUA = false;
    if (!cur) continue;
    if (k === 'allow' || k === 'disallow') cur.rules.push({ allow: k === 'allow', p: v });
    else if (k === 'crawl-delay') cur.delay = Math.max(0, Number(v) || 0);
  }
  const me = TOOL.split('/')[0].toLowerCase();
  const g = groups.find((x) => x.agents.some((a) => a !== '*' && me.includes(a))) || groups.find((x) => x.agents.includes('*'));
  return g || { rules: [], delay: 0 };
}
export function robotsAllows(group, pathQuery) {
  let best = null;
  for (const r of group.rules) {
    if (!r.p) continue;
    const re = new RegExp('^' + r.p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
    if (re.test(pathQuery) && (!best || r.p.length > best.p.length || (r.p.length === best.p.length && r.allow))) best = r;
  }
  return !best || best.allow;
}

// ---------- safe fetch ----------
const err = (kind, msg) => Object.assign(new Error(msg), { kind });
function safeLookup(hostname, opts, cb) {
  dns.lookup(hostname, { all: true, verbatim: true }, (e, addrs) => {
    if (e) return cb(e);
    if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) return cb(err('blocked', 'private address'));
    if (opts && opts.all) return cb(null, addrs);
    cb(null, addrs[0].address, addrs[0].family);
  });
}
const hostChain = new Map(), hostLast = new Map(), hostDelay = new Map();
function gate(host, fn) { // one request at a time per host, >=2 s apart
  const prev = hostChain.get(host) || Promise.resolve();
  const run = prev.then(async () => {
    const wait = (hostLast.get(host) || 0) + (hostDelay.get(host) || LIM.hostDelayMs) - Date.now();
    if (wait > 0) await sleep(wait);
    try { return await fn(); } finally { hostLast.set(host, Date.now()); }
  });
  hostChain.set(host, run.catch(() => {}));
  return run;
}
function requestOnce(url, accept, maxBody, anyType) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    let done = false;
    const finish = (fn, v) => { if (!done) { done = true; clearTimeout(timer); fn(v); } };
    const req = mod.request(u, { method: 'GET', lookup: safeLookup, headers: { 'User-Agent': UA, Accept: accept, 'Accept-Encoding': 'identity', 'Accept-Language': 'ja,en;q=0.8,ko;q=0.5' } }, (res) => {
      const chunks = []; let n = 0;
      if (!anyType && res.statusCode < 300 && !/^(text\/html|application\/xhtml\+xml)/i.test(String(res.headers['content-type'] || ''))) { res.destroy(); return finish(resolve, { res, body: Buffer.alloc(0), truncated: false }); }
      res.on('data', (c) => { n += c.length; if (n > maxBody) { chunks.push(c.subarray(0, c.length - (n - maxBody))); res.destroy(); finish(resolve, { res, body: Buffer.concat(chunks), truncated: true }); } else chunks.push(c); });
      res.on('end', () => finish(resolve, { res, body: Buffer.concat(chunks), truncated: false }));
      res.on('error', (e) => finish(reject, e));
      res.on('aborted', () => finish(reject, err('unreachable', 'aborted')));
    });
    const timer = setTimeout(() => { req.destroy(); finish(reject, err('unreachable', 'timeout')); }, LIM.timeoutMs);
    req.on('error', (e) => finish(reject, e.kind ? e : e.message === 'private address' ? err('blocked', e.message) : /^(?:CERT_|UNABLE_TO_|DEPTH_ZERO|SELF_SIGNED|ERR_TLS|ERR_SSL|ERR_OSSL|HOSTNAME_MISMATCH|ERR_CERT)|ALTNAME/.test(e.code || '') ? err('blocked', 'TLS/certificate: ' + e.code) : err('unreachable', e.code || e.message)));
    req.end();
  });
}
const robotsCache = new Map();
function robotsFor(url) {
  const u = new URL(url), key = u.origin;
  if (!robotsCache.has(key)) robotsCache.set(key, (async () => {
    try {
      const r = await fetchSafe(key + '/robots.txt', { accept: 'text/plain,*/*;q=0.5', maxBody: LIM.robotsMax, skipRobots: true, anyType: true });
      if (r.status >= 500) return { deny: true };
      if (r.status >= 400) return { rules: [], delay: 0 };
      const g = parseRobots(r.body.toString('utf8'));
      if (g.delay) hostDelay.set(u.host, Math.min(LIM.maxCrawlDelayMs, Math.max(LIM.hostDelayMs, g.delay * 1000)));
      return g;
    } catch (e) { return e.kind === 'blocked' ? { deny: true } : { rules: [], delay: 0 }; }
  })());
  return robotsCache.get(key);
}
// Follows <=3 redirects; every hop is re-validated (URL filter, robots, DNS->IP guard at connect time).
export async function fetchSafe(url, { accept = 'text/html,application/xhtml+xml;q=0.9', maxBody = LIM.maxBody, skipRobots = false, anyType = false } = {}) {
  let cur = url;
  for (let hop = 0; hop <= LIM.maxRedirects; hop++) {
    const ok = watchUrl(cur);
    if (!ok) throw err('blocked', 'url refused');
    cur = ok;
    const u = new URL(cur);
    if (!skipRobots) {
      const g = await robotsFor(cur);
      if (g.deny || !robotsAllows(g, u.pathname + u.search)) throw err('blocked', 'robots.txt');
    }
    const { res, body, truncated } = await gate(u.host, () => requestOnce(cur, accept, maxBody, anyType));
    const code = res.statusCode;
    if (code >= 300 && code < 400 && res.headers.location) {
      try { cur = new URL(res.headers.location, cur).href; } catch { throw err('unreachable', 'bad redirect'); }
      continue;
    }
    if (code === 401 || code === 403 || code === 429) throw err('blocked', 'HTTP ' + code);
    if (code >= 400) throw err('unreachable', 'HTTP ' + code);
    const ct = String(res.headers['content-type'] || '').toLowerCase();
    if (!anyType && !/^(text\/html|application\/xhtml\+xml)/.test(ct)) throw err('blocked', 'not html: ' + cleanText(ct.split(';')[0]).slice(0, 40));
    return { status: code, body, truncated, contentType: ct, finalUrl: cur };
  }
  throw err('unreachable', 'too many redirects');
}
export function decodeBody(buf, contentType) {
  let cs = (contentType.match(/charset=["']?([\w-]+)/) || [])[1];
  if (!cs) cs = (buf.subarray(0, 4096).toString('latin1').match(/<meta[^>]+charset=["']?([\w-]+)/i) || [])[1];
  try { return new TextDecoder(cs || 'utf-8').decode(buf); } catch { return buf.toString('utf8'); }
}

// ---------- check one URL ----------
async function checkUrl(url, prev) {
  const t0 = Date.now();
  const now = new Date().toISOString();
  const s = { ...prev, checkedAt: now, ms: 0 };
  try {
    const r = await fetchSafe(url);
    const html = decodeBody(r.body, r.contentType);
    const lines = htmlToLines(html);
    const meta = metaOf(html);
    const { flags, snippets } = extractNotices(lines);
    const hash = hashContent(lines);
    const snh = snippets.filter((x) => x.kind !== 'notice').map((x) => sha(x.text, 8));
    const reasons = [];
    const hadOk = prev && (prev.status === 'ok' || prev.status === 'changed') && prev.hash;
    let changed = false;
    if (hadOk) {
      if (prev.hash !== hash) { changed = true; reasons.push('content changed'); }
      if (prev.title && meta.title && prev.title !== meta.title) reasons.push('title changed');
      const nf = flags.filter((f) => !(prev.flags || []).includes(f));
      if (nf.length) reasons.push('new keyword flags: ' + nf.join(', '));
      const ns = snh.filter((h) => !(prev.snh || []).includes(h));
      if (ns.length) reasons.push(ns.length + ' new notice snippet(s)');
    }
    if (flags.includes('closure-keyword')) reasons.push('closure keywords present');
    Object.assign(s, { status: 'ok', http: r.status, reason: r.truncated ? 'body truncated at 1.5MB' : '', hash, title: meta.title, description: meta.description, flags, snh, snippets, fails: 0, lastOk: now, reasons });
    s.changedAt = changed ? now : (prev && prev.changedAt) || null;
    s.finalUrl = r.finalUrl !== url ? r.finalUrl : undefined;
  } catch (e) {
    const kind = e.kind === 'blocked' ? 'blocked' : 'unreachable';
    const fails = kind === 'unreachable' ? ((prev && prev.fails) || 0) + 1 : 0;
    Object.assign(s, { status: kind, reason: cleanText(e.message).slice(0, 80), fails, reasons: kind === 'unreachable' ? [`unreachable (${cleanText(e.message).slice(0, 60)}), failure #${fails}`] : [] });
  }
  s.ms = Date.now() - t0;
  return s;
}

// ---------- facility loading ----------
export function loadFacilities(extraCatalog) {
  const ctx = vm.createContext({ console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, localStorage: { getItem() {}, setItem() {} }, sessionStorage: { getItem() {}, setItem() {} }, navigator: { language: 'ko', userAgent: '' }, location: { search: '', hash: '', href: '' }, addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) });
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  ctx.document = { documentElement: { lang: 'ko', dataset: {} }, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, getElementById: () => null, createElement: () => ({ style: {}, classList: { add() {} }, setAttribute() {} }) };
  const order = ['data.js', 'photo-assets.js', 'extra.js', 'additional.js', 'survey.js', 'prefectures.js', 'ryokan-research.js'];
  let src = '';
  for (const f of order) { const p = path.join(WEB, f); if (fs.existsSync(p)) src += fs.readFileSync(p, 'utf8') + '\n;\n'; }
  src += ';globalThis.__out = { RAW, EXTRA };';
  vm.runInContext(src, ctx, { timeout: 10000 });
  const { RAW, EXTRA } = ctx.__out;
  const byId = new Map(RAW.map((r) => [String(r.id), r]));
  for (const r of extraCatalog || []) if (r && r.id != null) byId.set(String(r.id), { ...byId.get(String(r.id)), ...r });
  const out = [];
  for (const [id, r] of byId) {
    const ex = (EXTRA && EXTRA[id]) || (r.extra && typeof r.extra === 'object' ? r.extra : {}) || {};
    const raw = [r.hp, r.src === 'official' ? r.srcUrl : null, r.additional_source_url, ...(Array.isArray(r.research_urls) ? r.research_urls : [])];
    for (const k of ['notice', 'closed', 'dayUse']) if (Array.isArray(ex[k])) raw.push(ex[k][1]);
    const urls = [...new Set(raw.map(watchUrl).filter(Boolean))];
    const priority = !!(ex.notice || ex.closed || ex.hideBooking) || /^ryokan-research/.test(id);
    out.push({ id, name: cleanText(r.n || r.jp || id), urls, priority });
  }
  return out;
}

// ---------- state / aggregation / outputs ----------
function atomicWrite(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  renameRetry(tmp, file);
}
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const dateOf = (iso) => (iso ? iso.slice(0, 10) : null);

// Effective per-URL status: "changed" only inside the recent window; a first failure stays "ok" until confirmed.
function effective(s, now) {
  if (s.status === 'unreachable') return (s.fails >= 2 || !s.lastOk) ? 'unreachable' : 'ok';
  if (s.status === 'ok' && s.changedAt && now - Date.parse(s.changedAt) < LIM.changedWindowDays * DAY) return 'changed';
  return s.status;
}
const todayStr = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
export function isDismissed(reviewed, id, url, hash, now = Date.now()) {
  return !!hash && (reviewed || []).some((r) => r && String(r.id) === String(id) && r.url === url && r.hash === hash && (!r.until || r.until >= todayStr(now)));
}
function buildOutputs(facilities, state, now = Date.now(), reviewed = []) {
  const items = {}, queue = [];
  for (const f of facilities) {
    const rows = f.urls.map((u) => [u, state.urls[u]]).filter(([, s]) => s && s.checkedAt);
    if (!rows.length) continue;
    const eff = rows.map(([, s]) => effective(s, now));
    const st = eff.includes('changed') ? 'changed' : eff.includes('ok') ? 'ok' : eff.includes('unreachable') ? 'unreachable' : 'blocked';
    const changedAt = rows.map(([, s]) => s.changedAt).filter(Boolean).sort().pop() || null;
    items[f.id] = { checked: dateOf(rows.map(([, s]) => s.checkedAt).sort().pop()), state: st, changedAt: dateOf(changedAt) }; // public: no flags
    rows.forEach(([url, s], i) => {
      const reasons = (s.reasons || []).filter((r) => eff[i] !== 'ok' || /closure|new /.test(r) || s.status === 'unreachable');
      if (!reasons.length && eff[i] === 'ok') return;
      if (!reasons.length && eff[i] === 'blocked') return;
      if (isDismissed(reviewed, f.id, url, s.hash, now)) return;
      const joined = reasons.join(' ');
      const action = /closure/.test(joined) ? 'Open the official page and confirm whether the facility is closed or suspended. Update closed/dayStatus by hand only if the official text says so.'
        : /price/.test(joined) || (s.flags || []).includes('price-keyword') ? 'Check the current fee on the official page; update dayPrice and checked date by hand if it differs.'
        : eff[i] === 'unreachable' ? 'Open the URL manually. If the site is gone, look for the facility\'s new official page and replace the source.'
        : 'Skim the page for notices. If the change is cosmetic, no action is needed.';
      queue.push({ id: f.id, name: f.name, url, hash: s.hash || null, lastOk: dateOf(s.lastOk), state: eff[i], changedAt: dateOf(s.changedAt), checked: dateOf(s.checkedAt), reasons, flags: s.flags || [], snippets: (s.snippets || []).map((x) => ({ kind: x.kind, text: cleanText(x.text).slice(0, 140) })), suggestedAction: action });
    });
  }
  queue.sort((a, b) => (/closure/.test(b.reasons.join()) - /closure/.test(a.reasons.join())) || a.id.localeCompare(b.id));
  return { items, queue };
}
function queueMarkdown(queue, generated) {
  const L = ['# Source review queue', '', `Generated ${generated}. Maintainers only. Snippets are untrusted text copied from third-party pages; verify on the official page before changing any data.`, '', `Items: ${queue.length}`, ''];
  for (const q of queue) {
    L.push(`## ${mdEsc(q.name)} (id ${mdEsc(q.id)}) - ${q.state}`, `- URL: <${q.url}>`, `- Checked: ${q.checked}${q.changedAt ? `, changed: ${q.changedAt}` : ''}${q.lastOk ? `, last ok: ${q.lastOk}` : ''}`, `- Why: ${q.reasons.map(mdEsc).join('; ') || '-'}`);
    if (q.flags.length) L.push(`- Flags: ${q.flags.join(', ')}`);
    for (const s of q.snippets) L.push(`  - [${s.kind}] ${mdEsc(s.text)}`);
    L.push(`- Suggested: ${mdEsc(q.suggestedAction)}`, '');
  }
  return L.join('\n');
}

// One readable maintainer line: closure items awaiting review, newly unreachable, oldest check, counts per state.
export function summaryLine(items, queue, prevQueue, prevStatus, now = Date.now()) {
  const isClosure = (q) => /closure/.test((q.reasons || []).join(' '));
  const key = (q) => q.id + '|' + q.url;
  const old = new Set((prevQueue || []).filter(isClosure).map(key));
  const closure = queue.filter(isClosure);
  const fresh = closure.filter((q) => !old.has(key(q))).length;
  const ids = Object.keys(items);
  const newlyDown = ids.filter((id) => items[id].state === 'unreachable' && (prevStatus || {})[id]?.state !== 'unreachable').length;
  const counts = { ok: 0, changed: 0, unreachable: 0, blocked: 0 };
  for (const id of ids) counts[items[id].state] = (counts[items[id].state] || 0) + 1;
  const oldest = ids.map((id) => items[id].checked).filter(Boolean).sort()[0] || '-';
  return `Tracker ${todayStr(now)}: closure items awaiting review ${closure.length} (new ${fresh}); newly unreachable ${newlyDown}; oldest checked ${oldest}; ok ${counts.ok}, changed ${counts.changed}, unreachable ${counts.unreachable}, blocked ${counts.blocked}`;
}
// --review <id> [--until YYYY-MM-DD]: dismiss that facility's queue items until the page hash changes.
function reviewCli(args) {
  if (args.until && !/^\d{4}-\d{2}-\d{2}$/.test(args.until)) { console.error('--until must be YYYY-MM-DD'); process.exit(2); }
  const state = readJson(F.state, { urls: {} });
  const list = readJson(F.reviewed, []);
  const cur = Array.isArray(list) ? list : [];
  const hits = Object.entries(state.urls || {}).filter(([, s]) => s.hash && (s.ids || []).map(String).includes(args.review));
  if (!hits.length) { console.error(`No checked URL with a page hash for id ${args.review}`); process.exit(1); }
  for (const [url, s] of hits) {
    const i = cur.findIndex((r) => String(r.id) === args.review && r.url === url);
    const rec = { id: args.review, url, hash: s.hash, ...(args.until ? { until: args.until } : {}) };
    if (i >= 0) cur[i] = rec; else cur.push(rec);
  }
  atomicWrite(F.reviewed, JSON.stringify(cur, null, 1));
  console.log(`Dismissed ${hits.length} URL(s) for id ${args.review}${args.until ? ' until ' + args.until : ' until the page hash changes'}.`);
}

// ---------- main ----------
function parseArgs(argv) {
  const a = { limit: 0, ids: null, priority: false, concurrency: 4, maxAge: 7, sample: 0, catalog: null, selftest: false, state: null, out: null, review: null, until: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = () => argv[++i];
    if (k === '--limit') a.limit = +v() || 0; else if (k === '--ids') a.ids = new Set(String(v()).split(',').map((x) => x.trim()).filter(Boolean));
    else if (k === '--priority') a.priority = true; else if (k === '--concurrency') a.concurrency = Math.min(4, Math.max(1, +v() || 1));
    else if (k === '--max-age-days') a.maxAge = Math.max(0, +v() || 0); else if (k === '--sample') a.sample = +v() || 0;
    else if (k === '--catalog') a.catalog = v(); else if (k === '--selftest') a.selftest = true;
    else if (k === '--state') a.state = path.resolve(v()); else if (k === '--out') a.out = path.resolve(v());
    else if (k === '--review') a.review = String(v()); else if (k === '--until') a.until = String(v());
    else { console.error('Unknown option ' + k); process.exit(2); }
  }
  return a;
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selftest) return selftest();
  if (args.state || args.out) { // test runs: never touch the real files
    const base = args.state || path.join(HERE, 'tmp');
    if (args.state) F.state = args.state;
    F.status = args.out || base + '.status.json';
    F.queue = base + '.queue.json'; F.md = base + '.queue.md'; F.summary = base + '.summary.txt'; F.reviewed = base + '.reviewed.json';
  }
  if (args.review) return reviewCli(args);
  const catalog = args.catalog ? readJson(args.catalog, []) : [];
  const all = loadFacilities(catalog);
  let sel = all;
  if (args.ids) sel = all.filter((f) => args.ids.has(f.id));
  else if (args.priority) sel = all.filter((f) => f.priority);
  else if (args.sample) sel = all.filter((f) => !f.priority && f.urls.length).sort(() => Math.random() - 0.5).slice(0, args.sample);
  sel = sel.filter((f) => f.urls.length);
  if (args.limit) sel = sel.slice(0, args.limit);

  const state = readJson(F.state, { version: 1, urls: {} });
  state.urls ||= {};
  const prevQueue = (readJson(F.queue, {}).items || []);
  const prevStatus = readJson(F.status, {}).items || {};
  const reviewed = readJson(F.reviewed, []);
  const saveAll = () => {
    const generated = new Date().toISOString();
    state.generated = generated;
    const out = buildOutputs(all, state, Date.now(), Array.isArray(reviewed) ? reviewed : []);
    atomicWrite(F.state, JSON.stringify(state, null, 1));
    atomicWrite(F.status, JSON.stringify({ generated: dateOf(generated), tool: TOOL, items: out.items }));
    atomicWrite(F.queue, JSON.stringify({ generated, note: 'Maintainers only. Untrusted third-party text; never apply automatically.', items: out.queue }, null, 1));
    atomicWrite(F.md, queueMarkdown(out.queue, generated));
    return out;
  };
  const jobs = new Map();
  for (const f of sel) for (const u of f.urls) jobs.set(u, true);
  const now = Date.now();
  const todo = [...jobs.keys()].filter((u) => {
    const s = state.urls[u];
    if (!s || !s.checkedAt) return true;
    if (s.status === 'unreachable' && s.fails < 2) return true;
    return now - Date.parse(s.checkedAt) >= args.maxAge * DAY;
  });
  console.log(`facilities selected ${sel.length}, urls ${jobs.size}, to fetch ${todo.length} (skipped by max-age ${jobs.size - todo.length})`);
  const t0 = Date.now(), times = [];
  let next = 0, done = 0;
  const worker = async () => {
    while (next < todo.length) {
      const url = todo[next++];
      const s = await checkUrl(url, state.urls[url]);
      s.ids = [...new Set([...(state.urls[url]?.ids || []), ...sel.filter((f) => f.urls.includes(url)).map((f) => f.id)])];
      state.urls[url] = s; times.push(s.ms);
      console.log(`  ${s.status.padEnd(11)} ${String(s.ms).padStart(5)}ms ${url}${s.reason ? '  [' + s.reason + ']' : ''}`);
      if (++done % 50 === 0) saveAll(); // partial runs stay usable
    }
  };
  await Promise.all(Array.from({ length: Math.min(args.concurrency, todo.length) }, worker));

  const { items, queue } = saveAll();

  const count = (arr, k) => arr.reduce((m, x) => ((m[x[k]] = (m[x[k]] || 0) + 1), m), {});
  const mine = sel.map((f) => items[f.id]).filter(Boolean);
  console.log('facility states (this selection):', JSON.stringify(count(mine, 'state')));
  const us = [...jobs.keys()].map((u) => state.urls[u]).filter(Boolean);
  console.log('url statuses (this selection):', JSON.stringify(count(us, 'status')));
  const line = summaryLine(items, queue, prevQueue, prevStatus);
  atomicWrite(F.summary, line + '\n');
  console.log(line);
  if (times.length) console.log(`runtime ${((Date.now() - t0) / 1000).toFixed(1)}s total, ${Math.round(times.reduce((a, b) => a + b, 0) / times.length)}ms avg per fetched URL, ${((Date.now() - t0) / times.length / 1000).toFixed(2)}s wall per URL`);
}

// ---------- selftest (offline) ----------
function selftest() {
  let bad = 0;
  const t = (name, cond) => { console.log((cond ? 'PASS ' : 'FAIL ') + name); if (!cond) bad++; };
  t('url ok https', watchUrl('https://example.com/a#x') === 'https://example.com/a');
  t('url refuses ftp/js', !watchUrl('ftp://example.com/') && !watchUrl('javascript:alert(1)'));
  t('url refuses credentials', !watchUrl('https://u:p@example.com/'));
  t('url refuses odd ports', !watchUrl('http://example.com:8080/') && !!watchUrl('https://example.com:443/'));
  t('url refuses private/loopback hosts', ['http://127.0.0.1/', 'http://10.1.2.3/', 'http://192.168.0.1/', 'http://172.20.0.1/', 'http://169.254.169.254/latest', 'http://[::1]/', 'http://[fd00::1]/', 'http://localhost/', 'http://2130706433/', 'http://0x7f.1/', 'http://[::ffff:127.0.0.1]/', 'http://intranet/'].every((u) => !watchUrl(u)));
  t('url allows public ip', !!watchUrl('http://93.184.216.34/'));
  t('isPrivateIp table', isPrivateIp('100.64.0.1') && isPrivateIp('fe80::1') && !isPrivateIp('8.8.8.8') && !isPrivateIp('2606:4700::1111'));
  const a = '<html><body><p>お知らせ 2026年11月1日 更新</p><p>本日 10:30 現在 アクセス 1234</p><p>営業は通常どおり。料金 1,000円</p><script>var x="休業"</script></body></html>';
  const b = a.replace('2026年11月1日', '2026年12月5日').replace('10:30', '11:45').replace('1234', '1300');
  const c = a.replace('1,000円', '1,200円');
  t('hash ignores dates/times/counters', hashContent(htmlToLines(a)) === hashContent(htmlToLines(b)));
  t('hash detects price change', hashContent(htmlToLines(a)) !== hashContent(htmlToLines(c)));
  t('scripts stripped', !htmlToLines(a).join(' ').includes('休業'));
  const html = '<title>テスト &amp; 温泉</title><meta name="description" content="説明文です"><div>重要なお知らせ: 設備メンテナンスのため<b>臨時休業</b>します。</div><li>料金改定のお知らせ 4月から値上げ</li><li>営業時間変更: 9:00~20:00</li><li>定休日: 火曜 / 休館日 毎週水曜</li><p>Temporarily closed for repairs</p><p>휴관 안내 &lt;script&gt;alert(1)&lt;/script&gt;</p>';
  const m = metaOf(html), ex = extractNotices(htmlToLines(html));
  t('title/description', m.title === 'テスト & 温泉' && m.description === '説明文です');
  t('flags closure/price/hours', ['closure-keyword', 'price-keyword', 'hours-keyword'].every((f) => ex.flags.includes(f)));
  t('regular 定休日/休館日 not closure', !extractNotices(htmlToLines('<p>定休日: 火曜 / 休館日 毎週水曜</p><p>Closed on Mondays</p>')).flags.includes('closure-keyword'));
  const cl = (h) => extractNotices(htmlToLines(h)).flags.includes('closure-keyword');
  t('closure true: 臨時休業 under お知らせ heading', cl('<h2>お知らせ</h2><ul><li>設備点検のため臨時休業します</li></ul>'));
  t('closure true: 休館のお知らせ', cl('<p>休館のお知らせ</p>'));
  t('closure true: dated list item', cl('<li>2026年11月3日 臨時休館のご案内</li>'));
  t('closure false: 定休日 水曜', !cl('<p>定休日 水曜</p><p>営業時間 9:00-20:00</p>'));
  t('closure false: bare 休止', !cl('<p>休止</p><p>自動販売機は休止中です</p>'));
  t('closure false: outside notice area', !cl('<p>当館は設備改修のため臨時休業する場合があります</p>'));
  const hs = [{ id: '7', url: 'https://e.com/', hash: 'h1' }];
  t('review dismisses same hash only', isDismissed(hs, '7', 'https://e.com/', 'h1') && !isDismissed(hs, '7', 'https://e.com/', 'h2') && !isDismissed(hs, '8', 'https://e.com/', 'h1'));
  t('review until date expires', !isDismissed([{ ...hs[0], until: '2020-01-01' }], '7', 'https://e.com/', 'h1') && isDismissed([{ ...hs[0], until: '2999-01-01' }], '7', 'https://e.com/', 'h1'));
  const stt = { urls: { 'https://e.com/': { status: 'blocked', checkedAt: '2026-11-01T00:00:00Z', lastOk: '2026-10-01T00:00:00Z', reasons: [] }, 'https://f.com/': { status: 'unreachable', fails: 2, checkedAt: '2026-11-02T00:00:00Z', lastOk: '2026-10-01T00:00:00Z', reasons: ['x'] } } };
  const bo = buildOutputs([{ id: '1', name: 'A', urls: ['https://e.com/'] }, { id: '2', name: 'B', urls: ['https://f.com/'] }], stt, Date.parse('2026-11-05'));
  t('blocked stays blocked, 2 fails unreachable', bo.items['1'].state === 'blocked' && bo.items['2'].state === 'unreachable');
  t('public items carry only checked/state/changedAt', Object.values(bo.items).every((x) => Object.keys(x).sort().join() === 'changedAt,checked,state'));
  t('summary line', /closure items awaiting review 0 \(new 0\).*blocked 1/.test(summaryLine(bo.items, bo.queue, [], {})));
  t('snippets <=5, <=140, no < >', ex.snippets.length <= 5 && ex.snippets.every((s) => s.text.length <= 140 && !/[<>]/.test(s.text)));
  t('long line is windowed', extractNotices(['お知らせ' + 'x'.repeat(300) + '臨時休業' + 'y'.repeat(300)]).snippets[0].text.length <= 140);
  t('control chars stripped', cleanText('a\u0000b‮c\n d') === 'a b c d');
  const g = parseRobots('User-agent: *\nDisallow: /private\nAllow: /private/ok\nCrawl-delay: 5\n\nUser-agent: OnsenHackathonSourceTracker\nDisallow: /nope$\n');
  t('robots specific group wins', !robotsAllows(g, '/nope') && robotsAllows(g, '/nope/x') && robotsAllows(g, '/private'));
  const g2 = parseRobots('User-agent: *\nDisallow: /private\nAllow: /private/ok');
  t('robots longest match', !robotsAllows(g2, '/private/x') && robotsAllows(g2, '/private/ok/y') && robotsAllows(g2, '/'));
  t('robots disallow all', !robotsAllows(parseRobots('User-agent: *\nDisallow: /'), '/a'));
  const f = loadFacilities();
  t('facility loader finds records & urls', f.length > 50 && f.some((x) => x.urls.length) && f.every((x) => x.urls.every((u) => watchUrl(u))));
  console.log(bad ? `SELFTEST FAILED (${bad})` : 'SELFTEST PASSED');
  process.exit(bad ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
