// plan.json -> photo-assets 추가분 + DB insert SQL (다운로드가 끝난 항목만)
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
const IMG = fileURLToPath(new URL('../../web/', import.meta.url));
const plan = JSON.parse(fs.readFileSync('plan.json', 'utf8'));
const today = '2026-11-23';
const artistFix = { 'photo: Qurren (talk) Taken with Canon PowerShot G9 X': 'Qurren', 'User: (WT-shared) Jpatokal at wts wikivoyage': 'Jpatokal', 'Fumiaki Yoshimatsu from Tokyo, Japan': 'Fumiaki Yoshimatsu' };
const capKind = { 'official-ishikawa-wakura-togetsuan': '입구 사진', 'official-hiroshima-miyajima-iwaso': '현관 사진', 'official-tottori-misasa-kawarafuro': '사진' };
const licUrl = l => {
  let m;
  if (l === 'CC0') return 'https://creativecommons.org/publicdomain/zero/1.0/';
  if ((m = l.match(/^CC BY(-SA)? ([\d.]+)$/))) return `https://creativecommons.org/licenses/by${m[1] ? '-sa' : ''}/${m[2]}/`;
  return '';
};
const rows = [], skippedNoFile = [];
for (const r of plan) {
  const local = r.key === '1/11/Osawa_Onsen_Toujiya.jpg' ? 'images/commons-osawa-20261119.jpg'
    : 'images/commons-' + crypto.createHash('sha256').update(r.key).digest('hex').slice(0, 16) + '.jpg';
  if (!fs.existsSync(IMG + local)) { skippedNoFile.push(r.id); continue; }
  const author = artistFix[r.artist] || r.artist;
  const url = licUrl(r.license);
  const resized = r.w > 1280 && local !== 'images/commons-osawa-20261119.jpg';
  const meta = {
    kind: 'facility', credit: `${author} · ${r.license === 'Public domain' ? 'Public domain' : r.license}`, source: r.pageUrl, resized,
    ...(url ? { terms: url, license_url: url } : {}),
    image_role: 'facility', batch: 'photos3-20261229', checked: today, match: r.from === 'cat' ? 'category-pick' : 'file-page', remote_image: false,
  };
  rows.push({ facility_id: r.id, image_key: r.key, image_path: local, caption: `${r.nameKo} ${capKind[r.id] || '외관 사진'}`, author, license: r.license, metadata: meta, sort_order: 0, _r: r });
}
fs.writeFileSync('rows.json', JSON.stringify(rows.map(({ _r, ...x }) => x)));
const sql = `insert into onsen_photos (facility_id,image_key,image_path,caption,author,license,metadata,sort_order)
select x.facility_id,x.image_key,x.image_path,x.caption,x.author,x.license,x.metadata,x.sort_order
from jsonb_to_recordset($j$${JSON.stringify(rows.map(({ _r, ...x }) => x))}$j$::jsonb) as x(facility_id text,image_key text,image_path text,caption text,author text,license text,metadata jsonb,sort_order int)
where exists (select 1 from onsen_facilities f where f.id=x.facility_id)
on conflict (facility_id,image_key) do nothing returning facility_id;`;
fs.writeFileSync('insert.sql', sql);
// photo-assets 추가분: 같은 key는 한 번만 LOCAL_PHOTOS에 넣는다
const seen = new Set(['1/11/Osawa_Onsen_Toujiya.jpg']);
let js = '\n// 2026-11-23 스프레드시트에서 찾은 Wikimedia Commons 사진(라이선스·저작자 확인). DB onsen_photos(batch photos3-20261229)와 같은 내용.\n';
for (const r of rows) {
  const k = r.image_key, v = 'c3_' + crypto.createHash('sha256').update(r.facility_id).digest('hex').slice(0, 8);
  if (!seen.has(k)) { js += `LOCAL_PHOTOS[${JSON.stringify(k)}] = ${JSON.stringify(r.image_path)};\n`; seen.add(k); }
  js += `PHOTOS.${v} = { cap: ${JSON.stringify(r.caption)}, shots: [[${JSON.stringify(k)}, ${JSON.stringify(r.author)}, ${JSON.stringify(r.license)}, { source: ${JSON.stringify(r.metadata.source)}, credit: ${JSON.stringify(r.metadata.credit)}, kind: 'facility'${r.metadata.resized ? ', resized: true' : ''}${r.metadata.terms ? `, terms: ${JSON.stringify(r.metadata.terms)}` : ''} }]] };\n`;
  js += `IM_FIX[${JSON.stringify(r.facility_id)}] = '${v}';\n`;
}
fs.writeFileSync('assets-add.js', js);
console.log('rows', rows.length, 'no file', skippedNoFile.length);
