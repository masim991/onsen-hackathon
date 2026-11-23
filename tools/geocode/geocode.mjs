// Safe geocoder for hot-spring facilities. See README.md. Usage:
//   node tools/geocode/geocode.mjs [--limit N] [--ids a,b] [--only-missing] [--area-only] [--local]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
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
const WEB = path.resolve(HERE, '../../web');
const OUT = path.join(WEB, 'data/coords.json');
const CACHE = path.join(HERE, 'cache.json');
const UA = 'OnsenHackathonGeocoder/1.0';
const SUPA = 'https://frncsllpkxrsgxyqsfwd.supabase.co'; // same public read-only catalog the site uses
const SUPA_KEY = 'sb_publishable_7rJJBUzpz-WimUPB6eSOZg_cz4K_fGW';
const today = () => new Date().toISOString().slice(0, 10);

// ---------- args ----------
const argv = process.argv.slice(2);
const flag = (n) => argv.includes('--' + n);
const val = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };
const LIMIT = val('limit') ? Number(val('limit')) : Infinity;
const IDS = val('ids') ? new Set(val('ids').split(',')) : null;

// ---------- load local globals (prefectures, area names, fallback records) ----------
const ctx = { console, setTimeout, clearTimeout };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
const read = (f) => fs.readFileSync(path.join(WEB, f), 'utf8');
vm.runInContext(['data.js', 'photo-assets.js', 'extra.js', 'additional.js', 'survey.js', 'prefectures.js', 'ryokan-research.js', 'ryokan-types.js']
  .map(read).join('\n;') + '\n;globalThis.RAW=RAW;', ctx);
vm.runInContext(read('vendor/japan-prefectures.js') + '\n;globalThis.JP=JAPAN_PREFECTURES;', ctx);
vm.runInContext(read('i18n-data.js') + '\n;globalThis.DI=DATA_I18N;', ctx);
const PREF_NAMES = Object.keys(ctx.DI.prefs); // feature.properties.id (1..47) -> name
const POLY = {}; // prefecture name -> [ [outer, holes...], ... ]
for (const f of ctx.JP.features) {
  const g = f.geometry;
  POLY[PREF_NAMES[f.properties.id - 1]] = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
}

// ---------- geometry ----------
const ringHas = (ring, x, y) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const inPoly = (polys, lon, lat) => polys.some(p => ringHas(p[0], lon, lat) && !p.slice(1).some(h => ringHas(h, lon, lat)));
const km = (a, b) => { // haversine
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
// Prefecture polygons are simplified, so a coastal true point may fall just outside: allow 2 km of slack.
const nearEdgeKm = (polys, lon, lat) => {
  let best = Infinity;
  const kx = 111.32 * Math.cos(lat * Math.PI / 180), ky = 110.57;
  for (const p of polys) for (let i = 1; i < p[0].length; i++) {
    const [x1, y1] = p[0][i - 1], [x2, y2] = p[0][i];
    const ax = (x1 - lon) * kx, ay = (y1 - lat) * ky, bx = (x2 - lon) * kx, by = (y2 - lat) * ky;
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
};
const inPref = (pref, lon, lat) => { const p = POLY[pref]; return !!p && (inPoly(p, lon, lat) || nearEdgeKm(p, lon, lat) < 2); };
const prefCentroid = (pref) => { // centroid of the largest outer ring
  let best = null, bestA = -1;
  for (const p of POLY[pref]) {
    const r = p[0]; let a = 0, cx = 0, cy = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const f = r[j][0] * r[i][1] - r[i][0] * r[j][1];
      a += f; cx += (r[j][0] + r[i][0]) * f; cy += (r[j][1] + r[i][1]) * f;
    }
    if (Math.abs(a) > bestA) { bestA = Math.abs(a); best = { lon: cx / (3 * a), lat: cy / (3 * a) }; }
  }
  return best;
};
const validNum = ({ lat, lon }) => Number.isFinite(lat) && Number.isFinite(lon) && lat >= 20 && lat <= 46 && lon >= 122 && lon <= 154;

// ---------- name matching ----------
const GENERIC = /温泉郷|温泉|旅館|ホテル|日帰り|民宿|の湯|の宿|宿|館|荘|ryokan|hotel|onsen/gi;
const norm = (s) => String(s || '').normalize('NFKC').toLowerCase().replace(/[\s・\-ー—–_.,、。'"「」『』]/g, '');
const mainName = (s) => String(s || '').normalize('NFKC').replace(/[（(][^）)]*[）)]/g, ' ').replace(/[「」『』]/g, ' ').trim();
const keyOf = (s) => norm(mainName(s)).replace(GENERIC, '');
// 0 = no match; 3 = same name; 2 = key contained in candidate name; 1 = key only in display_name
const nameScore = (jp, c) => {
  const key = keyOf(jp);
  if (key.length < 2) return 0;
  const full = norm(mainName(jp)), cn = norm(c.name);
  if (cn && cn === full) return 3;
  const ck = cn.replace(GENERIC, '');
  if (cn && (ck.includes(key) || (ck.length >= 3 && key.includes(ck)))) return 2;
  return norm(c.display).includes(key) ? 1 : 0;
};
const FAC_OK = (c) =>
  (['tourism', 'leisure', 'building', 'man_made'].includes(c.category) && !/^(attraction|viewpoint|information|picnic_site|artwork|museum|gallery)$/.test(c.type))
  || (c.category === 'amenity' && /^(public_bath|spa|bath|sauna|social_facility|restaurant|cafe|community_centre)$/.test(c.type))
  || (c.category === 'natural' && c.type === 'hot_spring');

// ---------- HTTP (polite: serial, 1 req/s, backoff, timeouts) ----------
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : { q: {} };
let lastReq = 0, httpCount = 0;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function getJson(url, headers = {}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const wait = lastReq + 1100 - Date.now();
    if (wait > 0) await sleep(wait);
    lastReq = Date.now(); httpCount++;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(15000) });
      if (res.ok) return await res.json();
      if (res.status !== 429 && res.status < 500) throw new Error('HTTP ' + res.status);
    } catch (e) { if (/HTTP 4/.test(e.message)) throw e; }
    await sleep(2000 * 2 ** attempt); // 2s,4s,8s,16s,32s
  }
  throw new Error('request failed: ' + url.split('?')[0]);
}
const compactN = (r) => ({ lat: +r.lat, lon: +r.lon, category: r.category, type: r.type, name: r.name || '', display: r.display_name || '', osmType: r.osm_type || '' });
async function nominatim(q) {
  const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=jp&accept-language=ja&limit=5&q=' + encodeURIComponent(q);
  return cache.q[url] ??= (await getJson(url)).map(compactN);
}
async function gsi(q) {
  const url = 'https://msearch.gsi.go.jp/address-search/AddressSearch?q=' + encodeURIComponent(q);
  return cache.q[url] ??= (await getJson(url)).slice(0, 5).map(f => ({ lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], name: '', display: f.properties.title || '' }));
}

// ---------- resolution ----------
async function facility(r) {
  const q = `${mainName(r.jp)} ${r.pref}`;
  const cands = (await nominatim(q)).filter(c => validNum(c) && inPref(r.pref, c.lon, c.lat) && FAC_OK(c))
    .map(c => ({ ...c, s: nameScore(r.jp, c) })).filter(c => c.s > 0);
  if (!cands.length) return null;
  const top = Math.max(...cands.map(c => c.s));
  const best = cands.filter(c => c.s === top);
  if (best.some(c => km(c, best[0]) > 5)) return { rejected: 'ambiguous' };
  const c = best[0];
  return { lat: c.lat, lon: c.lon, precision: 'facility', source: 'osm', query: q, osmType: `${c.osmType}/${c.category}=${c.type}`, matched: c.name || c.display.split(',')[0] };
}
const GSI_MUNI = (key) => new RegExp('^(?:.+?郡)?' + key + '.{0,1}[市区町村]|[市区郡]' + key + '.{0,1}[市区町村]?$'); // key is the municipality (or ward-level locality), not a street/facility that merely contains it
// first candidate, or null when candidates are >5 km apart (a bare name like 湯の川 can exist in several towns)
const uniq = (cs) => (cs.length && cs.every(c => km(c, cs[0]) <= 5) ? cs[0] : null);
const areaMemo = new Map();
const area = (r) => { const k = r.pref + '|' + r.areaJa; if (!areaMemo.has(k)) areaMemo.set(k, areaImpl(r)); return areaMemo.get(k); };
async function areaImpl(r) {
  const pieces = String(r.areaJa || '').normalize('NFKC').split(/[()（）s]+/).filter(Boolean);
  const ok = (c) => validNum(c) && inPref(r.pref, c.lon, c.lat);
  for (const base of pieces) {
    const key = base.replace(/温泉郷|温泉|地方|エリア|周辺|地区/g, '');
    if (norm(key).length < 2) continue;
    const same = new Set([base, key, key + '温泉'].map(norm)), muni = /[市町村区]$/.test(key), re = muni ? new RegExp('^(?:.+?郡)?' + key) : GSI_MUNI(key);
    const found = async (q) => {
      // GSI: accept a municipality/locality whose name starts with the key, or a place named exactly like the area
      let c = uniq([...await gsi(r.pref + q), ...await gsi(q)].filter(c => ok(c) && (re.test(c.display.replace(r.pref, '')) || same.has(norm(c.display.replace(r.pref, ''))))));
      if (c) return { c, src: 'gsi' };
      c = uniq((await nominatim(`${q} ${r.pref}`)).filter(c => ok(c) && norm(c.name).includes(norm(key)) &&
        (/^(place|boundary|natural|landuse)$/.test(c.category) || (c.category === 'railway' && c.type === 'station') || (c.category === 'amenity' && c.type === 'bus_station'))));
      return c && { c, src: 'osm' };
    };
    for (const q of new Set(muni ? [base] : [key + '温泉', base, key])) {
      const f = await found(q);
      if (f) return { lat: f.c.lat, lon: f.c.lon, precision: 'area', source: f.src, query: q + ' ' + r.pref, osmType: f.src === 'osm' ? `${f.c.osmType}/${f.c.category}=${f.c.type}` : '', matched: f.c.name || f.c.display.split(',')[0] };
    }
  }
  return null;
}

// ---------- catalog ----------
async function loadCatalog() {
  const areaJa = ctx.DI.areaJa || {};
  const local = new Map(ctx.RAW.map(r => [String(r.id), r]));
  let rows = [];
  if (!flag('local')) {
    try {
      for (let o = 0; ; o += 1000) {
        const b = await getJson(`${SUPA}/rest/v1/onsen_facilities?select=id,name_ja,prefecture,area,record&order=id.asc&offset=${o}&limit=1000`, { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY });
        rows.push(...b); if (b.length < 1000) break;
      }
    } catch (e) { console.warn('Supabase unavailable, using local records only:', e.message); rows = []; }
  }
  if (!rows.length) rows = ctx.RAW.map(r => ({ id: r.id, name_ja: r.jp, prefecture: r.pref, area: r.a, record: r }));
  return rows.map(w => {
    const l = local.get(String(w.id)) || {};
    return { id: String(w.id), jp: w.name_ja || l.jp, pref: w.prefecture || l.pref, areaJa: w.record?.area_ja || l.area_ja || areaJa[w.area] || areaJa[l.a] || '' };
  }).filter(r => r.jp && POLY[r.pref]);
}

// ---------- main ----------
const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')).items || {} : {};
const items = { ...existing };
const atomic = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file + '.tmp', data); renameRetry(file + '.tmp', file); };
const save = () => {
  atomic(OUT, JSON.stringify({ generated: new Date().toISOString(), tool: 'geocode v1', items }, null, 1));
  atomic(CACHE, JSON.stringify(cache));
};

let list = await loadCatalog();
if (IDS) list = list.filter(r => IDS.has(r.id));
if (flag('only-missing')) list = list.filter(r => !items[r.id]);
list = list.slice(0, LIMIT);
const counts = { facility: 0, area: 0, prefecture: 0 }, stat = { rejected: 0, errors: 0 };
let done = 0;
for (const r of list) {
  try {
    let res = flag('area-only') ? null : await facility(r);
    const ar = await area(r);
    if (res?.rejected || (res && ar && km(res, ar) > 40)) { stat.rejected++; res = null; } // ambiguous, or far from its own hot-spring area
    res ??= ar;
    if (!res) { const c = prefCentroid(r.pref); res = { lat: c.lat, lon: c.lon, precision: 'prefecture', source: 'pref', query: r.pref, osmType: '' }; }
    if (!validNum(res)) throw new Error('invalid coordinate');
    items[r.id] = { lat: +res.lat.toFixed(5), lon: +res.lon.toFixed(5), precision: res.precision, source: res.source, query: res.query, osmType: res.osmType, ...(res.matched && { matched: res.matched }), checked: today() };
    counts[res.precision]++;
  } catch (e) { stat.errors++; console.warn(`skip ${r.id} ${r.jp}: ${e.message}`); }
  if (++done % 25 === 0) { save(); console.log(`${done}/${list.length} facility=${counts.facility} area=${counts.area} prefecture=${counts.prefecture} rejected=${stat.rejected} errors=${stat.errors}`); }
}
save();
console.log(`done ${done}/${list.length}: facility=${counts.facility} area=${counts.area} prefecture=${counts.prefecture} rejected(ambiguous)=${stat.rejected} errors=${stat.errors} http=${httpCount}; total in coords.json=${Object.keys(items).length}`);
