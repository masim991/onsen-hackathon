#!/usr/bin/env node
// Merge confidence=high candidates into web/data/prices.json and write web/data/price-stats.json.
// Touches only those two files. Per facility: best basis (2meals > 1meal > room-only > person > room), lowest minYen of that basis = "from".
// Same-basis candidates spreading more than 3x are treated as ambiguous and skipped (never guess).
// Usage: node apply.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = { prices: path.join(ROOT, 'web', 'data', 'prices.json'), stats: path.join(ROOT, 'web', 'data', 'price-stats.json') };
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
function renameRetry(from, to) {
  for (let i = 0; i < 20; i++) {
    try { fs.renameSync(from, to); return; } catch (e) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150 + i * 50);
    }
  }
  fs.copyFileSync(from, to); fs.unlinkSync(from);
}
const atomicWrite = (f, t) => { const tmp = `${f}.${process.pid}.tmp`; fs.writeFileSync(tmp, t); renameRetry(tmp, f); };

const ORDER = ['per-person-2meals', 'per-person-1meal', 'per-person-room-only', 'per-person', 'room'];
const BASIS = { 'per-person-2meals': '1泊2食', 'per-person-1meal': '1泊朝食/夕食付', 'per-person-room-only': '素泊まり', 'per-person': '1名1泊(食事条件不明)', room: '1室1泊' };
// Tourism-association / municipal / aggregator pages are not the facility's own site: a domain shared by 2+ facilities, *.lg.jp, a kanko/tourism name, or the extras below.
const ASSOC_EXTRA = ['e-yuzawa.gr.jp'];
const domainOf = (u) => { try { return new URL(u).hostname.replace(/^www./, ''); } catch { return ''; } };
const median = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };

const excluded = new Set(Object.keys(readJson(path.join(HERE, 'removed-prices.json'), {})));
export function build(cand, catalog) {
  const meta = new Map(catalog.map((x) => [String(x.id), x]));
  const items = {}; let skippedAmbiguous = 0;
  for (const [id, list] of Object.entries(cand.items || {})) {
    if (excluded.has(id)) continue; // manually reviewed and rejected (tools/prices/removed-prices.json, internal)
    const high = list.filter((c) => c.confidence === 'high' && Number.isFinite(c.minYen));
    for (const kind of ORDER) {
      const g = high.filter((c) => c.kind === kind);
      if (!g.length) continue;
      const lo = g.reduce((a, b) => (b.minYen < a.minYen ? b : a));
      if (Math.max(...g.map((c) => c.minYen)) > lo.minYen * 3) { skippedAmbiguous++; break; }
      items[id] = { from: lo.minYen, unit: lo.unit === 'room/night' ? 'JPY/room/night' : 'JPY/person/night', basis: BASIS[kind], src: lo.sourceUrl, checked: (lo.checkedAt || '').slice(0, 10) };
      break;
    }
  }
  const perDomain = {};
  for (const it of Object.values(items)) perDomain[domainOf(it.src)] = (perDomain[domainOf(it.src)] || 0) + 1;
  for (const it of Object.values(items)) {
    const d = domainOf(it.src);
    if (perDomain[d] >= 2 || /.lg.jp$/.test(d) || /kanko|kankou|tourism/.test(d) || ASSOC_EXTRA.includes(d)) it.assoc = true;
  }
  // stats: only the facility's own-site prices (not association pages), comparable (per person, 1泊2食)
  const byPref = {};
  const bucket = (o, k, v) => { (o[k] ||= []).push(v); };
  for (const [id, it] of Object.entries(items)) {
    if (it.basis !== BASIS['per-person-2meals'] || it.assoc) continue;
    const m = meta.get(id); if (!m || !m.pref) continue;
    bucket(byPref, m.pref, it.from);
  }
  const fin = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v.length >= 5).map(([k, v]) => [k, { n: v.length, median: median(v), min: Math.min(...v), max: Math.max(...v) }]));
  return { items, stats: { byPref: fin(byPref) }, skippedAmbiguous };
}

function main() {
  const cand = readJson(path.join(HERE, 'candidates.json'), { items: {} });
  const catalog = readJson(path.join(ROOT, 'tools', 'catalog.json'), []);
  const { items, stats, skippedAmbiguous } = build(cand, catalog);
  const gen = new Date().toISOString();
  if (process.argv.includes('--dry')) { console.log(Object.keys(items).length, 'items'); return; }
  atomicWrite(OUT.prices, JSON.stringify({ generated: gen, tool: 'price-finder v1', note: 'From-prices extracted from official facility sites; excl. tax/service unless stated. Each item has its source page.', items }, null, 1));
  atomicWrite(OUT.stats, JSON.stringify({ generated: gen, basis: '1泊2食 per person, own-site prices only (no association pages), at least 5 per prefecture', ...stats }, null, 1));
  console.log(`prices ${Object.keys(items).length} (ambiguous skipped ${skippedAmbiguous}); byPref ${Object.keys(stats.byPref).length}, assoc ${Object.values(items).filter((x) => x.assoc).length}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
