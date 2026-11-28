#!/usr/bin/env node
// Official-site stay price finder. Polite + read-only: robots.txt, SSRF guard, <=1 req/s/host, max 3 pages/facility.
// Official facility sites only (catalog `hp`); never OTA/booking sites. Never guesses: only strict "keyword near N,NNN円" matches.
// Writes ONLY tools/prices/cache.json and tools/prices/candidates.json. Raw HTML is never stored.
// Usage: node price-finder.mjs [--budget-min 25] [--concurrency 10] [--limit N] [--ids a,b] [--tier 1|2|3] [--refetch] [--selftest]
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { watchUrl, isPrivateIp, parseRobots, robotsAllows, cleanText } from '../tracker/source-tracker.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const F = { cache: path.join(HERE, 'cache.json'), cand: path.join(HERE, 'candidates.json'), catalog: path.join(ROOT, 'tools', 'catalog.json'), kinds: path.join(HERE, 'kinds.json') };
const UA = 'OnsenPriceFinder/1.0 (read-only; official site price check)';
// Sites answering 406 to an Accept header without */*  (see source-tracker.mjs).
const ACCEPT_HTML = 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8';
const LIM = { timeoutMs: 20000, robotsTimeoutMs: 10000, maxBody: 2.5 * 1024 * 1024, maxRedirects: 3, hostDelayMs: 1100, robotsMax: 256 * 1024, maxPages: 3, maxCrawlDelayMs: 20000 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function renameRetry(from, to) {
  for (let i = 0; i < 20; i++) {
    try { fs.renameSync(from, to); return; } catch (e) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150 + i * 50);
    }
  }
  fs.copyFileSync(from, to); fs.unlinkSync(from);
}
function atomicWrite(file, text) { const tmp = `${file}.${process.pid}.tmp`; fs.writeFileSync(tmp, text); renameRetry(tmp, file); }
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

// ---------- safe fetch ----------
const err = (kind, msg) => Object.assign(new Error(msg), { kind });
const TRANSIENT_DNS = /^(?:EAI_AGAIN|ETIMEOUT|ESERVFAIL|ECONNREFUSED)$/;
function safeLookup(hostname, opts, cb) {
  const attempt = (left) => dns.lookup(hostname, { all: true, verbatim: true }, (e, addrs) => {
    if (e) {
      if (left > 0 && TRANSIENT_DNS.test(e.code || '')) { setTimeout(() => attempt(left - 1), 300); return; }
      return cb(e);
    }
    if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) return cb(err('blocked', 'private address'));
    const sorted = [...addrs].sort((a, b) => (a.family === b.family ? 0 : a.family === 4 ? -1 : 1));
    if (opts && opts.all) return cb(null, sorted);
    cb(null, sorted[0].address, sorted[0].family);
  });
  attempt(1);
}
const hostChain = new Map(), hostLast = new Map(), hostDelay = new Map();
function gate(host, fn) {
  const prev = hostChain.get(host) || Promise.resolve();
  const run = prev.then(async () => {
    const wait = (hostLast.get(host) || 0) + (hostDelay.get(host) || LIM.hostDelayMs) - Date.now();
    if (wait > 0) await sleep(wait);
    try { return await fn(); } finally { hostLast.set(host, Date.now()); }
  });
  hostChain.set(host, run.catch(() => {}));
  return run;
}
function requestOnce(url, accept, maxBody, anyType, timeoutMs = LIM.timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    let done = false;
    const finish = (fn, v) => { if (!done) { done = true; clearTimeout(timer); fn(v); } };
    const req = mod.request(u, { method: 'GET', lookup: safeLookup, headers: { 'User-Agent': UA, Accept: accept, 'Accept-Encoding': 'identity', 'Accept-Language': 'ja,en;q=0.8' } }, (res) => {
      const chunks = []; let n = 0;
      if (!anyType && res.statusCode < 300 && !/^(text\/html|application\/xhtml\+xml)/i.test(String(res.headers['content-type'] || ''))) { res.destroy(); return finish(resolve, { res, body: Buffer.alloc(0), truncated: false }); }
      // A body over the cap is a usable prefix: resolve before dropping the stream (destroy() emits 'aborted'/'error').
      res.on('data', (c) => {
        n += c.length;
        if (n > maxBody) { const keep = c.length - (n - maxBody); if (keep > 0) chunks.push(c.subarray(0, keep)); finish(resolve, { res, body: Buffer.concat(chunks), truncated: true }); res.destroy(); return; }
        chunks.push(c);
      });
      res.on('end', () => finish(resolve, { res, body: Buffer.concat(chunks), truncated: false }));
      res.on('error', (e) => finish(reject, e));
      res.on('aborted', () => finish(reject, err('unreachable', 'aborted')));
    });
    const timer = setTimeout(() => { req.destroy(); finish(reject, err('unreachable', 'timeout')); }, timeoutMs);
    req.on('error', (e) => finish(reject, e.kind ? e : e.message === 'private address' ? err('blocked', e.message) : /^(?:CERT_|UNABLE_TO_|DEPTH_ZERO|SELF_SIGNED|ERR_TLS|ERR_SSL|ERR_OSSL|HOSTNAME_MISMATCH|ERR_CERT)|ALTNAME/.test(e.code || '') ? err('blocked', 'TLS/certificate: ' + e.code) : err('unreachable', e.code || e.message)));
    req.end();
  });
}
async function requestWithRetry(url, accept, maxBody, anyType, timeoutMs) {
  const one = () => gate(new URL(url).host, () => requestOnce(url, accept, maxBody, anyType, timeoutMs));
  try { return await one(); }
  catch (e) { if (e.message !== 'timeout') throw e; await sleep(1200); return one(); }
}
const robotsCache = new Map();
function robotsFor(url) {
  const u = new URL(url), key = u.origin;
  if (!robotsCache.has(key)) robotsCache.set(key, (async () => {
    try {
      const r = await fetchSafe(key + '/robots.txt', { accept: 'text/plain,*/*;q=0.5', maxBody: LIM.robotsMax, skipRobots: true, anyType: true, timeoutMs: LIM.robotsTimeoutMs, retryTimeout: false });
      if (r.status >= 500) return { deny: true };
      if (r.status >= 400) return { rules: [], delay: 0 };
      const g = parseRobots(r.body.toString('utf8'));
      if (g.delay) hostDelay.set(u.host, Math.min(LIM.maxCrawlDelayMs, Math.max(LIM.hostDelayMs, g.delay * 1000)));
      return g;
    } catch (e) { return e.kind === 'blocked' ? { deny: true } : { rules: [], delay: 0 }; }
  })());
  return robotsCache.get(key);
}
async function fetchSafe(url, { accept = ACCEPT_HTML, maxBody = LIM.maxBody, skipRobots = false, anyType = false, timeoutMs = LIM.timeoutMs, retryTimeout = true } = {}) {
  try { return await fetchHops(url, { accept, maxBody, skipRobots, anyType, timeoutMs, retryTimeout }); }
  catch (e) {
    const conn = /^(?:timeout|ECONNRESET|ECONNREFUSED|EPIPE|EHOSTUNREACH|ENETUNREACH)$/.test(e.message || '') || /^(?:ECONNRESET|ECONNREFUSED|EPIPE|EHOSTUNREACH|ENETUNREACH)$/.test(e.code || '');
    if (e.kind === 'unreachable' && conn && /^http:\/\//i.test(String(url))) {
      const alt = 'https://' + String(url).slice(7);
      const r = await fetchHops(alt, { accept, maxBody, skipRobots, anyType, timeoutMs, retryTimeout });
      return { ...r, upgradedFrom: url };
    }
    throw e;
  }
}
async function fetchHops(url, { accept, maxBody, skipRobots, anyType, timeoutMs, retryTimeout }) {
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
    const { res, body, truncated } = retryTimeout
      ? await requestWithRetry(cur, accept, maxBody, anyType, timeoutMs)
      : await gate(u.host, () => requestOnce(cur, accept, maxBody, anyType, timeoutMs));
    const code = res.statusCode;
    if (code >= 300 && code < 400 && res.headers.location) {
      try { cur = new URL(res.headers.location, cur).href; } catch { throw err('unreachable', 'bad redirect'); }
      continue;
    }
    if (code === 401 || code === 403) throw err('blocked', 'HTTP ' + code);
    if (code === 429) throw err('unreachable', 'HTTP 429');
    if (code >= 400) throw err('unreachable', 'HTTP ' + code);
    const ct = String(res.headers['content-type'] || '').toLowerCase();
    if (!anyType && !/^(text\/html|application\/xhtml\+xml)/.test(ct)) throw err('blocked', 'not html');
    return { status: code, body, truncated, contentType: ct, finalUrl: cur };
  }
  throw err('unreachable', 'too many redirects');
}
function decodeBody(buf, contentType) {
  let cs = (contentType.match(/charset=["']?([\w-]+)/) || [])[1];
  if (!cs) cs = (buf.subarray(0, 4096).toString('latin1').match(/<meta[^>]+charset=["']?([\w-]+)/i) || [])[1];
  try { return new TextDecoder(cs || 'utf-8').decode(buf); } catch { return buf.toString('utf8'); }
}

// ---------- HTML -> rows (table cells joined on one row) ----------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', yen: '¥' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const c = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ' '; }
  return ENT[e.toLowerCase()] ?? m;
});
export function htmlToRows(html) {
  const t = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg|iframe|head)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<\/?(td|th)\b[^>]*>/gi, ' | ')
    .replace(/<\/?(br|p|div|li|ul|ol|tr|table|h[1-6]|dt|dd|dl|section|article|header|footer|nav|main|aside|form|option|tbody|thead)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '');
  const rows = [];
  for (const raw of decode(t).split('\n')) {
    const s = cleanText(raw).replace(/(?:\|\s*)+$/, '').replace(/^(?:\|\s*)+/, '').replace(/(\|\s*){2,}/g, '| ').trim();
    if (s.length >= 3) rows.push(s);
  }
  return rows;
}
const decodeURIComponentSafe = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
export function linksOf(html, base) {
  const out = [];
  for (const m of html.matchAll(/<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a\s*>/gi)) {
    const href = decode(m[1] ?? m[2]).trim();
    if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) continue;
    let u; try { u = new URL(href, base); } catch { continue; }
    const text = cleanText(decode(m[3].replace(/<[^>]*>/g, ' '))).replace(/([　-鿿])\s+(?=[　-鿿])/g, '$1').slice(0, 60);
    out.push({ url: u.href.replace(/#.*$/, ''), text });
  }
  return out;
}
const LINK_OK = /宿泊料金|料金|宿泊案内|宿泊|ご宿泊|お泊|プラン|客室|お部屋|ご利用案内|rates?|price|stay|room|accommodation|tariff|yado/i;
const LINK_BAD = /日帰り|日帰|入浴|立寄|デイ|レストラン|ランチ|食事|宴会|会議|プライバシー|個人情報|採用|求人|アクセス|地図|予約|booking|reserve|jalan|rakuten|ikyu|yahoo|facebook|twitter|instagram|line\.me|\.pdf(\?|$)|\.(jpg|png|zip|docx?|xlsx?)(\?|$)|login|cart|blog|news|faq|privacy|glamping|camp|dog/i;
const sameSite = (a, b) => new URL(a).hostname.replace(/^www\./, '') === new URL(b).hostname.replace(/^www\./, '');
export function pickLinks(html, base, n = LIM.maxPages - 1) {
  const sc = new Map();
  for (const l of linksOf(html, base)) {
    if (!/^https?:/i.test(l.url) || !sameSite(l.url, base) || l.url.replace(/\/$/, '') === base.replace(/\/$/, '')) continue;
    const pth = decodeURIComponentSafe(new URL(l.url).pathname);
    if (!LINK_OK.test(l.text + ' ' + pth) || LINK_BAD.test(l.text) || LINK_BAD.test(pth)) continue;
    let s = 0;
    if (/宿泊料金|宿泊案内|宿泊プラン/.test(l.text)) s += 6;
    if (/料金|price|rate/i.test(l.text)) s += 4;
    if (/宿泊|stay/i.test(l.text)) s += 3;
    if (/プラン|plan/i.test(l.text)) s += 2;
    if (/客室|お部屋|room|ご利用案内/i.test(l.text)) s += 2;
    if (/rate|price|ryokin|stay|yado|plan/i.test(l.url)) s += 1;
    if (!sc.has(l.url) || sc.get(l.url) < s) sc.set(l.url, s);
  }
  return [...sc].sort((a, b) => b[1] - a[1]).slice(0, n).map(([u]) => u);
}

// ---------- strict price extraction ----------
const AMT = /(?:[¥￥]\s*)?(\d{1,3}(?:,\d{3})+|\d{4,6})\s*(円|yen)?\s*(〜|~|～|から|-|－|ー)?\s*(?:(?:[¥￥]\s*)?(\d{1,3}(?:,\d{3})+|\d{4,6})\s*円)?/g;
const MEAL2 = /1泊\s*2食|一泊二食|1泊二食|2食付|二食付|夕朝食/;
const MEAL1 = /1泊\s*朝食|一泊朝食|朝食付|1泊\s*夕食|夕食付|1泊\s*食事付/;
const SUDO = /素泊まり|素泊り|素泊|食事なし|食事無し|泊のみ/;
const PERSON = /お一人様|おひとり様|1名|1人|一人|おひとり|ひとり|大人/;
const ROOM = /1室|一室|1部屋|室料/;
const STAYQ = /1泊|一泊|宿泊/;
const NEG = /中学|高校|学生|生徒|入湯税|宿泊税|消費税|税額|サービス料|子供|子ども|小学|幼児|未就学|添い寝|添寝|お子様|キッズ|こども|キャンセル|追加|オプション|延長|日帰り|日帰|休憩|デイ|入浴料|ペット|ご利用料|貸切|貸し切り|駐車|割引|値引|引き|OFF|off|クーポン|ポイント|還元|寄付|差額|加算|アップ|変更料|手数料|チャージ|飲み放題|宴会|会議|ランチ|昼食|ディナー|食事のみ|アレルギー|プレゼント|送迎|レンタル|貸出|布団代|寝具|エキストラ|コース料理|グランピング|キャンプ|テント|コテージ|ドッグ|ワンちゃん|犬/;
const AGE_NEG = /\d+\s*歳|歳(?:以上|未満)|年齢/;
const KW = /1泊\s*2食|一泊二食|1泊二食|2食付|二食付|夕朝食|1泊\s*朝食|一泊朝食|朝食付|1泊\s*夕食|夕食付|素泊|食事なし|食事無し|泊のみ|お一人様|おひとり様|1名|1人|一人|1室|一室|1部屋|室料|1泊|一泊/;
const MIN = { 'per-person-2meals': 4000, 'per-person-1meal': 3000, 'per-person-room-only': 2500, 'per-person': 3000, room: 4000 };
const MAXY = { 'per-person-2meals': 150000, 'per-person-1meal': 100000, 'per-person-room-only': 80000, 'per-person': 120000, room: 400000 };
const num = (s) => +String(s).replace(/,/g, '');

export function extractPrices(rows) {
  const out = [];
  for (const row of rows) {
    if (row.length > 400) continue;
    let prevEnd = 0;
    for (const m of row.matchAll(AMT)) {
      if (!m[2] && !/[¥￥]/.test(m[0])) continue; // a currency marker is mandatory
      const a = num(m[1]);
      const b = m[4] && m[3] ? num(m[4]) : null;
      const s = m.index, e = m.index + m[0].length;
      const lo0 = Math.max(prevEnd, s - 36); prevEnd = e;
      const before = row.slice(lo0, s), after = row.slice(e, e + 22).split(/[\d,]{4,}\s*円/)[0];
      const ctx = before.slice(before.lastIndexOf('。') + 1) + ' ' + after.split('。')[0];
      if (NEG.test(ctx) || AGE_NEG.test(ctx)) continue;
      if (/^\s*(以上|以下|未満|超|まで|引|OFF|off)/.test(row.slice(e))) continue; // thresholds/discounts, not prices
      if (!(STAYQ.test(ctx) || PERSON.test(ctx) || ROOM.test(ctx))) continue; // explicit stay/person/room qualifier required
      let kind = null;
      if (MEAL2.test(ctx)) kind = 'per-person-2meals';
      else if (MEAL1.test(ctx)) kind = 'per-person-1meal';
      else if (SUDO.test(ctx) && (STAYQ.test(ctx) || PERSON.test(ctx))) kind = 'per-person-room-only';
      else if (ROOM.test(ctx) && STAYQ.test(ctx) && !PERSON.test(ctx.replace(/1室\s*\d+\s*名/g, ''))) kind = 'room';
      else if (PERSON.test(ctx) && /1泊|一泊/.test(ctx)) kind = 'per-person';
      if (!kind) continue;
      if (!KW.test(before) && !KW.test(after)) continue;
      const lo = Math.min(a, b ?? a), hi = b != null ? Math.max(a, b) : null;
      if (lo < MIN[kind] || (hi ?? lo) > MAXY[kind]) continue;
      if (b != null && b < a) continue;
      const quote = cleanText(row.slice(Math.max(0, s - 36), e + 22)).slice(0, 80);
      out.push({ kind, minYen: lo, ...(hi && hi !== lo ? { maxYen: hi } : {}), unit: kind === 'room' ? 'room/night' : 'person/night', quote, confidence: 'high' });
    }
  }
  const seen = new Set();
  return out.filter((c) => { const k = c.kind + c.minYen + (c.maxYen || ''); if (seen.has(k)) return false; seen.add(k); return true; });
}

// Sentence-level campaign/eligibility filter (shared with tools/monitor/worker.mjs). Real false positives of the first run
// ('宿泊料金が6,000円以上で…', '旅行代金が…3,000円以上であること', premium course plans) came from conditions, not prices.
// shortcut: '円から' ("from" price) is NOT rejected (common legit form); only a threshold word right after the amount is.
export const CAMPAIGN = /ご宿泊のすべて|以上であること|対象|キャンペーン|割引|クーポン|ポイント|助成|補助|旅行代金が|適用|条件|特典|プレゼント|会員|限定プラン|スイート|特別室|プレミアム|ご夕食(?:の)?グレード|目安/;
export const THRESHOLD = /[\d,]{4,}\s*円?\s*(?:[(（][^)）]{0,15}[)）])?\s*(?:以上|以下|未満|超|まで)/;
export const LIMITED = /に限り|限定|特別価格|平日のみ|期間中|オフ期/;
export function extractPricesStrict(rows) {
  const sentences = rows.flatMap((r) => r.split(/[。！？]/)).filter((x) => x.length >= 3 && !CAMPAIGN.test(x) && !THRESHOLD.test(x.normalize('NFKC')));
  return extractPrices(sentences).map((c) => (LIMITED.test(c.quote) ? { ...c, confidence: 'medium' } : c));
}

// ---------- per-facility ----------
async function fetchPage(url) {
  try {
    const r = await fetchSafe(url);
    return { ok: true, html: decodeBody(r.body, r.contentType), finalUrl: r.finalUrl };
  } catch (e) { return { ok: false, status: e.kind === 'blocked' ? (/robots/.test(e.message) ? 'robots' : 'blocked') : 'unreachable', reason: String(e.message).slice(0, 60) }; }
}
async function processFacility(f, cache, refetch) {
  const prev = cache.facilities[f.id];
  if (prev && !refetch) return prev;
  const pages = {}; let reachable = false, robots = false;
  const now = new Date().toISOString();
  const cands = [];
  const home = await fetchPage(f.hp);
  const firstStatus = home.ok ? 'ok' : home.status;
  if (home.ok) {
    reachable = true;
    const base = home.finalUrl;
    const urls = [base, ...pickLinks(home.html, base)];
    for (const [i, u] of urls.entries()) {
      const p = i === 0 ? home : await fetchPage(u);
      if (!p.ok) { pages[u] = p.status; if (p.status === 'robots') robots = true; continue; }
      const c = extractPricesStrict(htmlToRows(p.html));
      pages[u] = 'ok:' + c.length;
      for (const x of c) cands.push({ ...x, sourceUrl: p.finalUrl, checkedAt: now });
    }
  } else if (home.status === 'robots') robots = true;
  const res = { hp: f.hp, status: firstStatus, reachable, robots, pages, candidates: cands, checkedAt: now };
  cache.facilities[f.id] = res;
  return res;
}

// ---------- main ----------
function parseArgs(argv) {
  const a = { budget: 25, conc: 10, limit: 0, ids: null, tier: 0, refetch: false, selftest: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = () => argv[++i];
    if (k === '--budget-min') a.budget = +v(); else if (k === '--concurrency') a.conc = Math.min(16, Math.max(1, +v()));
    else if (k === '--limit') a.limit = +v(); else if (k === '--ids') a.ids = new Set(v().split(','));
    else if (k === '--tier') a.tier = +v(); else if (k === '--refetch') a.refetch = true; else if (k === '--selftest') a.selftest = true;
    else { console.error('unknown ' + k); process.exit(2); }
  }
  return a;
}
export function loadTargets() {
  const cat = readJson(F.catalog, []);
  const kinds = readJson(F.kinds, {}); // id -> facility_kind (public catalog column; export-catalog.mjs omits it)
  const rows = [];
  for (const x of cat) {
    const hp = x.hp && watchUrl(x.hp);
    if (!hp || x.stay === '不可' || x.stay === '否') continue;
    const kind = kinds[x.id] || 'unknown';
    // tier 1 = site default list (kind=ryokan, stay=可: 1,015 facilities), 2 = other stay=可, 3 = stay unknown
    const tier = kind === 'ryokan' && x.stay === '可' ? 1 : x.stay === '可' ? 2 : 3;
    rows.push({ id: String(x.id), hp, kind, pref: x.pref, a: x.a, tier });
  }
  return rows.sort((a, b) => a.tier - b.tier || (+a.id - +b.id));
}
function writeCandidates(targets, cache) {
  const items = {};
  for (const t of targets) {
    const e = cache.facilities[t.id];
    if (e && e.candidates.length) items[t.id] = e.candidates;
  }
  atomicWrite(F.cand, JSON.stringify({ generated: new Date().toISOString(), tool: UA, note: 'Extracted from official facility sites. apply.mjs merges only confidence=high.', items }, null, 1));
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selftest) return selftest();
  let targets = loadTargets();
  if (args.tier) targets = targets.filter((t) => t.tier === args.tier);
  if (args.ids) targets = targets.filter((t) => args.ids.has(t.id));
  if (args.limit) targets = targets.slice(0, args.limit);
  const cache = readJson(F.cache, { version: 1, facilities: {} });
  cache.facilities ||= {};
  const todo = targets.filter((t) => args.refetch || !cache.facilities[t.id]);
  console.log(`targets ${targets.length} (tier1 ${targets.filter((t) => t.tier === 1).length}), to fetch ${todo.length}, budget ${args.budget} min`);
  const deadline = Date.now() + args.budget * 60000;
  let next = 0, done = 0;
  const save = () => { atomicWrite(F.cache, JSON.stringify(cache)); writeCandidates(targets, cache); };
  const worker = async () => {
    while (next < todo.length && Date.now() < deadline) {
      const t = todo[next++];
      try { await processFacility({ id: t.id, hp: t.hp }, cache, args.refetch); } catch (e) { cache.facilities[t.id] = { hp: t.hp, status: 'error', reachable: false, robots: false, pages: {}, candidates: [], checkedAt: new Date().toISOString(), reason: String(e.message).slice(0, 60) }; }
      if (++done % 25 === 0) { save(); console.log(`  ${done}/${todo.length}`); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(args.conc, todo.length || 1) }, worker));
  save();
  const st = { attempted: 0, reachable: 0, robots: 0, withCand: 0 };
  for (const t of targets) { const e = cache.facilities[t.id]; if (!e) continue; st.attempted++; if (e.reachable) st.reachable++; if (e.robots) st.robots++; if (e.candidates.length) st.withCand++; }
  console.log('summary', JSON.stringify(st), Date.now() >= deadline ? '(budget hit; rerun to resume)' : '');
}

function selftest() {
  let bad = 0; const t = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) bad++; };
  const x = (h) => extractPrices(htmlToRows(h));
  const a = x('<table><tr><td>1泊2食付</td><td>お一人様 12,000円〜</td></tr></table>');
  t('table 2meals from', a.length === 1 && a[0].kind === 'per-person-2meals' && a[0].minYen === 12000);
  t('素泊まり', x('<p>素泊まり 1名1泊 6,500円</p>')[0]?.kind === 'per-person-room-only');
  t('range', x('<p>1泊2食 お一人様 15,000円～22,000円</p>')[0]?.maxYen === 22000);
  t('child rejected', x('<p>小学生 1泊2食 8,000円</p>').length === 0);
  t('tax rejected', x('<p>入湯税 1泊 150円</p>').length === 0 && x('<p>1泊2食 12,000円 (税込)</p>').length === 1);
  t('no keyword rejected', x('<p>ご案内 12,000円</p>').length === 0 && x('<p>入浴料 1,000円</p>').length === 0);
  t('room', x('<p>1室 (1泊) 20,000円〜</p>')[0]?.kind === 'room');
  t('low price rejected', x('<p>1泊2食 お一人様 1,500円</p>').length === 0);
  t('no yen marker rejected', x('<p>1泊2食 お一人様 12000</p>').length === 0);
  // known false positives of the published prices.json (regex typo made the threshold check dead): must yield nothing
  const s = (h) => extractPricesStrict(htmlToRows(h));
  t('typo fixed: threshold word after amount rejected even in loose extractor', x('<p>1泊 素泊まり 8,000円 以上のプラン</p>').length === 0);
  for (const [n, h] of [['campaign eligibility', '<p>宿泊料金が6,000円(素泊まり・税抜き)以上でご宿泊のすべてのお客様に特典</p>'], ['travel-cost condition', '<p>1人1泊あたりの旅行代金が、平日5,000円、休日3,000円以上であること</p>'], ['premium course plan', '<p>1泊1名様 28,600円~ プレミアム特別室プラン</p>'], ['coupon', '<p>1泊2食 お一人様 3,000円クーポンをプレゼント</p>']]) t('strict reject: ' + n, s(h).length === 0);
  t('strict: limited-condition => medium', s('<p>平日(オフ期)に限り素泊まり8,800円のリーズナブルな料金で、1室お1人様からでも</p>')[0]?.confidence === 'medium');
  t('strict accept: normal from-price', s('<p>1泊2食付 お一人様 12,000円〜</p>')[0]?.confidence === 'high' && s('<p>1名様1泊¥6,300円~</p>')[0]?.minYen === 6300);
  t('links',pickLinks('<a href="/ryokin/">宿泊料金</a><a href="/day/">日帰り料金</a><a href="https://x.com/a">料金</a>', 'https://e.com/').join() === 'https://e.com/ryokin/');
  console.log(bad ? 'SELFTEST FAILED' : 'SELFTEST PASSED'); process.exit(bad ? 1 : 0);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
