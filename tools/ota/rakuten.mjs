#!/usr/bin/env node
// Rakuten Travel reference prices (separate from official prices). Requires a Rakuten Web Service App ID and Access Key.
// Writes ONLY public.ota_prices (never onsen_facilities / facility_changes), so an OTA "from" price can never be shown as the facility's own price.
// Politeness: <= 1 request/second, a few dozen facilities per run, oldest-checked first. Strict match: same prefecture + normalized name contained both ways.
// Usage: node rakuten.mjs [--limit 40] [--dry] | --selftest
//   env: RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY, SUPABASE_SERVICE_ROLE_KEY (writes only), SUPABASE_URL (optional)
// Terms to verify BEFORE enabling site display (docs were unreachable when this was written, see tools/prices/ota-notes.md): credit line, cache/storage limits, affiliate disclosure.
const ENDPOINT = 'https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20260731';
const norm = (s) => String(s || '').normalize('NFKC').replace(/[\s　・･\-－ー()（）「」『』【】\[\]]/g, '').replace(/(旅館|ホテル|温泉|の宿|別館|本館)/g, '').toLowerCase();
export function matchHotel(fac, hotels) {
  const a = norm(fac.name_ja);
  if (a.length < 2) return null;
  const matches = new Map();
  const pref = String(fac.prefecture || '').trim();
  if (!pref) return null;
  for (const entry of hotels) {
    const hotel = entry?.hotel ?? entry;
    const b = Array.isArray(hotel) ? hotel.find((part) => part?.hotelBasicInfo)?.hotelBasicInfo : hotel?.hotelBasicInfo;
    if (!b) continue;
    const name = norm(b.hotelName);
    const address = String(b.address1 || '').trim();
    const hotelNo = String(b.hotelNo ?? '');
    const yen = Number(b.hotelMinCharge);
    const nameMatches = name === a || (Math.min(a.length, name.length) >= 3 && (name.includes(a) || a.includes(name)));
    if (address.startsWith(pref) && nameMatches && /^[1-9][0-9]*$/.test(hotelNo) && Number.isInteger(yen) && yen >= 1000 && yen <= 1000000) {
      matches.set(hotelNo, { hotelNo, name: b.hotelName, yen, url: b.hotelInformationUrl || null });
    }
  }
  return matches.size === 1 ? matches.values().next().value : null;
}

async function search(keyword, appId, accessKey, fetchImpl = fetch) {
  const u = new URL(ENDPOINT); u.searchParams.set('applicationId', appId); u.searchParams.set('format', 'json'); u.searchParams.set('keyword', keyword); u.searchParams.set('hits', '5'); u.searchParams.set('searchField', '1');
  const r = await fetchImpl(u, { headers: { 'user-agent': 'OnsenReferencePrice/1.0 (read-only)', accessKey }, redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (r.status === 404 && /\bnot_found\b|not found/i.test(JSON.stringify(await r.json().catch(() => null)))) return [];
  if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { http: r.status });
  const j = await r.json();
  if (!Array.isArray(j.hotels)) throw new Error('Unexpected Rakuten response');
  return j.hotels;
}
export async function runBatch({ facilities, appId, accessKey, fetchImpl, put, sleepMs = 1100 }) {
  const st = { checked: 0, matched: 0, nomatch: 0, errors: 0 };
  for (const f of facilities) {
    try {
      const m = matchHotel(f, await search(f.name_ja, appId, accessKey, fetchImpl));
      st.checked++; m ? st.matched++ : st.nomatch++;
      await put(f, m);
    } catch (e) { st.errors++; console.warn(JSON.stringify({result:'ota_rakuten_error', facility_id:f.id, http:e.http ?? null})); if ([401, 403, 429].includes(e.http)) break; } // bad key / limit: stop the run
    if (sleepMs) await new Promise((r) => setTimeout(r, sleepMs));
  }
  return st;
}
function restSink() {
  const base = (process.env.SUPABASE_URL || 'https://frncsllpkxrsgxyqsfwd.supabase.co').replace(/\/$/, ''), key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  const h = { apikey: key, authorization: 'Bearer ' + key, 'content-type': 'application/json' };
  const rq = async (method, path, body, prefer) => { const r = await fetch(base + '/rest/v1/' + path, { method, headers: { ...h, ...(prefer ? { prefer } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error(method + ' ' + path.split('?')[0] + ' HTTP ' + r.status); return r.status === 204 ? null : r.json(); };
  return {
    // stay-capable public facilities without an official price, never-checked first, then oldest check
    async pick(n) {
      const facs = await rq('GET', 'onsen_facilities?unlisted=eq.false&select=id,name_ja,prefecture,record&limit=2000');
      const checks = new Map((await rq('GET', 'ota_prices?ota=eq.rakuten&select=facility_id,checked_at&limit=5000')).map((x) => [x.facility_id, x.checked_at]));
      const need = facs.filter((f) => f.name_ja && f.record && f.record.stay === '可' && !(f.record.monitor && f.record.monitor.price) && !(Number(f.record.room) > 0));
      need.sort((a, b) => String(checks.get(a.id) || '').localeCompare(String(checks.get(b.id) || '')));
      return need.slice(0, n).map((f) => ({ id: f.id, name_ja: f.name_ja, prefecture: f.prefecture }));
    },
    async put(f, m) { await rq('POST', 'ota_prices?on_conflict=facility_id,ota', { facility_id: f.id, ota: 'rakuten', status: m ? 'matched' : 'nomatch', min_yen: m ? m.yen : null, hotel_no: m ? m.hotelNo : null, matched_name: m ? m.name : null, info_url: m ? m.url : null, checked_at: new Date().toISOString() }, 'resolution=merge-duplicates,return=minimal'); },
  };
}
async function selftest() {
  let bad = 0; const t = (n, c) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) bad++; };
  const fac = { id: 'x', name_ja: '旅館 壱の井', prefecture: '熊本県' };
  const hs = [{ hotelBasicInfo: { hotelNo: 1, hotelName: '黒川温泉 旅館壱の井', address1: '熊本県', hotelMinCharge: 19000, hotelInformationUrl: 'https://travel.rakuten.co.jp/HOTEL/1/' } }, { hotelBasicInfo: { hotelNo: 2, hotelName: '別の宿', address1: '北海道', hotelMinCharge: 9000 } }];
  t('match: same prefecture + name contained', matchHotel(fac, hs)?.yen === 19000 && matchHotel(fac, hs).hotelNo === '1');
  t('no match: other prefecture / short name / absurd price', matchHotel({ ...fac, prefecture: '北海道' }, [hs[0]]) === null && matchHotel({ name_ja: '湯', prefecture: '熊本県' }, hs) === null && matchHotel(fac, [{ hotelBasicInfo: { ...hs[0].hotelBasicInfo, hotelMinCharge: 5 } }]) === null);
  const puts = []; const fakeFetch = async (u, options) => {
    t('new API uses the access-key header and app ID', u.hostname === 'openapi.rakuten.co.jp' && options.headers.accessKey === 'TEST-KEY' && u.searchParams.get('applicationId') === 'TEST' && !u.searchParams.has('accessKey'));
    return { ok: true, status: 200, json: async () => ({ hotels: String(u).includes('%E5%A3%B1') ? hs.map((hotel) => ({hotel:[hotel]})) : [] }) };
  };
  t('missing address and ambiguous results do not match', !matchHotel(fac, [{hotelBasicInfo:{...hs[0].hotelBasicInfo, address1:''}}]) && !matchHotel(fac, [hs[0], {hotelBasicInfo:{...hs[0].hotelBasicInfo,hotelNo:3}}]));
  const st = await runBatch({ facilities: [fac, { id: 'y', name_ja: '存在しない宿', prefecture: '熊本県' }], appId: 'TEST', accessKey: 'TEST-KEY', fetchImpl: fakeFetch, put: async (f, m) => puts.push([f.id, m && m.yen]), sleepMs: 0 });
  t('batch: one matched, one nomatch, both recorded', st.matched === 1 && st.nomatch === 1 && puts.length === 2 && puts[0][1] === 19000 && puts[1][1] === null);
  const stop = await runBatch({ facilities: [fac, fac], appId: 'BAD', fetchImpl: async () => ({ ok: false, status: 403 }), put: async () => {}, sleepMs: 0 });
  t('batch: bad key (403) stops the run', stop.errors === 1 && stop.checked === 0);
  console.log(bad ? 'SELFTEST FAILED (' + bad + ')' : 'SELFTEST PASSED'); process.exit(bad ? 1 : 0);
}
async function main() {
  const a = process.argv.slice(2);
  if (a.includes('--selftest')) return selftest();
  const appId = process.env.RAKUTEN_APP_ID, accessKey = process.env.RAKUTEN_ACCESS_KEY;
  if (!appId || !accessKey) throw new Error('Set RAKUTEN_APP_ID and RAKUTEN_ACCESS_KEY');
  if (a.includes('--probe')) {
    const keyword = a[a.indexOf('--probe') + 1];
    if (!keyword || keyword.startsWith('--')) throw new Error('--probe needs a Japanese facility name');
    const hotels = await search(keyword, appId, accessKey);
    console.log(JSON.stringify({result:'ota_rakuten_probe', hotels:hotels.length}));
    return;
  }
  const limit = a.includes('--limit') ? Number(a[a.indexOf('--limit') + 1]) : 40;
  if (!Number.isInteger(limit) || limit < 1 || limit > 250) throw new Error('--limit must be between 1 and 250');
  const dry = a.includes('--dry'), sink = restSink(), facilities = await sink.pick(limit);
  const st = await runBatch({ facilities, appId, accessKey, put: dry ? async () => {} : sink.put });
  console.log(JSON.stringify({ result: 'ota_rakuten_summary', ...st }));
  if (st.errors) process.exitCode = 1;
}
if (import.meta.url === new URL(process.argv[1], 'file:///').href.replace(/\\/g, '/') || process.argv[1]?.endsWith('rakuten.mjs')) main().catch((e) => { console.error(String(e.message).slice(0, 200)); process.exit(1); });
