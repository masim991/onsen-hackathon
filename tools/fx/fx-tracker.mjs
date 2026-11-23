// JPY -> KRW/USD tracker. Node 24, no deps. See README.md.
import fs from 'node:fs';
import path from 'node:path';
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


const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/data/fx.json');
const UA = 'OnsenHackathonFx/1.0';
const TIMEOUT_MS = 10_000, MAX_BYTES = 200_000, MAX_HOPS = 2;
const TOL = 0.015, STALE_MS = 36 * 3600e3, HIST_MAX = 48, HIST_GAP_MS = 30 * 60e3;
const RANGE = { KRW: [3, 15], USD: [0.003, 0.02] };

// Each source: whitelisted https url + a parser returning {asOf: ms, rates:{KRW,USD}}.
const SOURCES = [
  { name: 'open.er-api.com', url: 'https://open.er-api.com/v6/latest/JPY',
    parse: j => ({ asOf: j.time_last_update_unix * 1000, rates: { KRW: j.rates?.KRW, USD: j.rates?.USD } }) },
  { name: 'frankfurter.dev', url: 'https://api.frankfurter.dev/v1/latest?base=JPY&symbols=KRW,USD',
    parse: j => ({ asOf: Date.parse(j.date + 'T00:00:00Z'), rates: { KRW: j.rates?.KRW, USD: j.rates?.USD } }) }, // date-only
  { name: 'fawazahmed0 (jsdelivr)', url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/jpy.json',
    parse: j => ({ asOf: Date.parse(j.date + 'T00:00:00Z'), rates: { KRW: j.jpy?.krw, USD: j.jpy?.usd } }) }, // date-only
];
const HOSTS = new Set(SOURCES.map(s => new URL(s.url).host));

const okNum = (v, [lo, hi]) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

async function fetchJson(url) {
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const u = new URL(url);
    if (u.protocol !== 'https:' || !HOSTS.has(u.host)) throw new Error('host not allowed: ' + u.host);
    const res = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (res.status >= 300 && res.status < 400) { url = new URL(res.headers.get('location') ?? '', u).href; continue; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const chunks = []; let n = 0;
    for await (const c of res.body) { n += c.length; if (n > MAX_BYTES) throw new Error('response too large'); chunks.push(c); }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Error('bad JSON'); }
  }
  throw new Error('too many redirects');
}

async function fetchSource(s) {
  try {
    const { asOf, rates } = s.parse(await fetchJson(s.url));
    if (!Number.isFinite(asOf)) throw new Error('no timestamp');
    for (const k of Object.keys(RANGE)) if (!okNum(rates[k], RANGE[k])) throw new Error(`${k} invalid/out of range: ${rates[k]}`);
    return { name: s.name, ok: true, asOf: new Date(asOf).toISOString(), rates };
  } catch (e) { return { name: s.name, ok: false, asOf: null, rates: null, error: String(e.message ?? e).slice(0, 80) }; }
}

// Pure logic: sources (fetch results) + previous file + now(ms) -> new doc, or null if nothing publishable.
export function evaluate(sources, prev, now) {
  const live = sources.filter(s => s.ok && s.rates);
  // Outlier check: each source vs the median of all live sources (an outlier must not skew its own
  // reference, which "median of the others" does with 3 sources). With only 2 sources the median is
  // their mean, so tolerance halves to keep "the two differ by at most 1.5%".
  const tol = live.length === 2 ? TOL / 2 : TOL;
  const agreed = live.filter(s => live.length >= 2 && Object.keys(RANGE).every(k => {
    const m = median(live.map(o => o.rates[k]));
    return Math.abs(s.rates[k] - m) / m <= tol;
  }));
  const out = sources.map(s => ({ ...s, ok: agreed.includes(s),
    ...(s.ok && !agreed.includes(s) ? { error: 'outlier' } : {}) }));
  const iso = new Date(now).toISOString();
  if (agreed.length >= 2) {
    const rates = { KRW: median(agreed.map(s => s.rates.KRW)), USD: median(agreed.map(s => s.rates.USD)) };
    const asOfMs = Math.max(...agreed.map(s => Date.parse(s.asOf)));
    const status = now - asOfMs > STALE_MS ? 'stale' : agreed.length >= 3 ? 'ok' : 'degraded';
    const history = [...(prev?.history ?? [])];
    const last = history.at(-1);
    if (!last || last.KRW !== rates.KRW || last.USD !== rates.USD || now - Date.parse(last.t) >= HIST_GAP_MS)
      history.push({ t: iso, ...rates });
    return { base: 'JPY', rates, asOf: new Date(asOfMs).toISOString(), fetchedAt: iso, sources: out, status, history: history.slice(-HIST_MAX) };
  }
  // Not enough agreement: keep previous good value, mark stale.
  if (prev?.rates && Object.keys(RANGE).every(k => okNum(prev.rates[k], RANGE[k])))
    return { ...prev, fetchedAt: iso, sources: out, status: 'stale' };
  return null;
}

function readPrev() { try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { return null; } }
function writeAtomic(doc) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const tmp = OUT + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(doc));
  renameRetry(tmp, OUT);
}

async function runOnce() {
  const sources = await Promise.all(SOURCES.map(fetchSource));
  const doc = evaluate(sources, readPrev(), Date.now());
  const good = sources.filter(s => s.ok).length;
  if (!doc) { console.log(`${new Date().toISOString()} FAIL ${good}/${sources.length} sources usable, nothing published`); return false; }
  writeAtomic(doc);
  console.log(`${doc.fetchedAt} ${doc.status} KRW=${doc.rates.KRW} USD=${doc.rates.USD} asOf=${doc.asOf} ok=${doc.sources.filter(s => s.ok).map(s => s.name).join(',') || '-'}`);
  return true;
}

function selftest() {
  const T = Date.parse('2026-11-21T12:00:00Z'), fresh = '2026-11-21T00:00:00Z', old = '2026-11-19T00:00:00Z';
  const S = (name, KRW, USD, asOf = fresh, ok = true) => ({ name, ok, asOf, rates: ok ? { KRW, USD } : null });
  const good = { rates: { KRW: 8.4, USD: 0.0063 }, history: [] };
  const tests = [
    ['3 agreeing -> ok', () => evaluate([S('a', 8.4, .0063), S('b', 8.41, .00631), S('c', 8.39, .00629)], null, T)?.status === 'ok'],
    ['outlier rejected, 2 left -> degraded', () => { const d = evaluate([S('a', 8.4, .0063), S('b', 8.41, .0063), S('c', 9.5, .0063)], null, T); return d.status === 'degraded' && d.rates.KRW < 8.5 && d.sources[2].error === 'outlier'; }],
    ['2 sources disagree -> keep previous, stale', () => { const d = evaluate([S('a', 8.4, .0063), S('b', 9.0, .0063)], good, T); return d.status === 'stale' && d.rates.KRW === 8.4; }],
    ['no agreement, no previous -> null', () => evaluate([S('a', 8.4, .0063)], null, T) === null],
    ['old asOf -> stale', () => evaluate([S('a', 8.4, .0063, old), S('b', 8.4, .0063, old)], null, T).status === 'stale'],
    ['all failed keeps previous stale', () => evaluate([S('a', 0, 0, null, false)], good, T).status === 'stale'],
    ['range check rejects NaN/0/neg/out-of-range', () => !okNum(NaN, RANGE.KRW) && !okNum(0, RANGE.KRW) && !okNum(-8, RANGE.KRW) && !okNum(20, RANGE.KRW) && !okNum(0.5, RANGE.USD) && okNum(8.4, RANGE.KRW)],
    ['history trimmed to 48', () => { const h = Array.from({ length: 60 }, (_, i) => ({ t: new Date(T - (60 - i) * 36e5).toISOString(), KRW: 8, USD: .006 })); return evaluate([S('a', 8.4, .0063), S('b', 8.4, .0063)], { history: h }, T).history.length === 48; }],
  ];
  let fail = 0;
  for (const [n, f] of tests) { let r = false; try { r = f(); } catch { } if (!r) fail++; console.log((r ? 'PASS ' : 'FAIL ') + n); }
  console.log(fail ? `${fail} FAILED` : 'ALL PASS');
  return fail === 0;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) process.exit(selftest() ? 0 : 1);
  if (!args.includes('--watch')) process.exit((await runOnce().catch(e => (console.log('FAIL ' + e.message), false))) ? 0 : 1);
  const i = args.indexOf('--interval');
  const sec = Math.max(60, Number(args[i + 1]) || 300);
  let stop = false, timer, wake;
  const quit = () => { stop = true; clearTimeout(timer); wake?.(); };
  process.on('SIGINT', quit); process.on('SIGTERM', quit);
  console.log(`watching every ${sec}s (Ctrl+C to stop)`);
  while (!stop) {
    try { await runOnce(); } catch (e) { console.log('ERROR ' + e.message); }
    if (!stop) await new Promise(r => { wake = r; timer = setTimeout(r, sec * 1000); });
  }
  console.log('stopped');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
