// Supabase 공개 카탈로그(onsen_facilities)를 tools/catalog.json 으로 내보낸다. 읽기 전용, publishable 키만 사용.
// 익명 키는 RLS 때문에 unlisted=true(숨김) 시설을 받지 못한다 -> 이 카탈로그도 기본적으로 공개 목록(486건)만 담는다. 전체가 필요하면 service 키/관리자 JWT로 읽는다.
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../web/db-loader.js', import.meta.url), 'utf8');
const project = src.match(/const project = '([^']+)'/)[1], key = src.match(/const key = '([^']+)'/)[1];
const rows = [];
for (let offset = 0; ; offset += 1000) {
  const r = await fetch(`${project}/rest/v1/onsen_facilities?select=*&order=id.asc&offset=${offset}&limit=1000`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const b = await r.json(); rows.push(...b); if (b.length < 1000) break;
}
const items = rows.map(r => ({ id: String(r.id), n: r.name_ko, jp: r.name_ja, pref: r.prefecture, a: r.area, hp: r.official_url, srcUrl: r.source_url, ...r.record }));
// Same rules as web/db-loader.js esc()/safeUrl(): no markup, no script/data URLs, URLs must be https. Offenders block the export.
const BAD = /<|javascript:|data:/i, URLISH = /^https?:\/\//i;
const offenders = [];
const scan = (v, id, trail) => {
  if (typeof v === 'string') {
    if (BAD.test(v)) offenders.push(`${id} ${trail}: ${v.slice(0, 60)}`);
    else if (URLISH.test(v) && !/^https:\/\//i.test(v)) offenders.push(`${id} ${trail}: non-https URL ${v.slice(0, 60)}`);
    else if (/(^|\.)(hp|srcUrl)$/.test(trail) && v && !/^https:\/\//i.test(v)) offenders.push(`${id} ${trail}: not an https URL`);
  } else if (Array.isArray(v)) v.forEach((x, i) => scan(x, id, `${trail}[${i}]`));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) scan(x, id, `${trail}.${k}`);
};
items.forEach((it) => scan(it, it.id, ''));
if (offenders.length) {
  console.error(`REFUSING to write catalog.json: ${offenders.length} unsafe field(s) in ${new Set(offenders.map((o) => o.split(' ')[0])).size} rows`);
  offenders.slice(0, 50).forEach((o) => console.error('  ' + o));
  process.exit(1);
}
fs.writeFileSync(new URL('./catalog.json', import.meta.url), JSON.stringify(items));
console.log('exported', items.length, 'rows; with jp name', items.filter(i => i.jp).length, '; with official url', items.filter(i => i.hp).length);
