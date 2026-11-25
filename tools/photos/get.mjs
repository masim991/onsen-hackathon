// plan.json 의 사진을 web/images 로 받는다(이미 있으면 건너뜀). 429면 길게 쉬고 재시도.
import fs from 'fs';
import crypto from 'crypto';
const UA = 'onsen-photo-import/1.0 (static-site photo import; polite, 1 req/2s)';
import { fileURLToPath } from 'url';
const OUT = fileURLToPath(new URL('../../web/images/', import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const plan = JSON.parse(fs.readFileSync('plan.json', 'utf8'));
const W = 1280;
const fileOf = key => 'commons-' + crypto.createHash('sha256').update(key).digest('hex').slice(0, 16) + '.jpg';
const src = r => {
  if (r.w <= W) return r.url;
  const m = r.url.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/(.+)\/([^/]+)$/);
  return `${m[1]}/thumb/${m[2]}/${m[3]}/${W}px-${m[3]}`;
};
let fail = 0, waited = false, stop = false; // 429 대기는 실행 전체에서 1회만
for (const r of plan) {
  r.local = 'images/' + fileOf(r.key);
  if (r.key === '1/11/Osawa_Onsen_Toujiya.jpg') { r.local = 'images/commons-osawa-20261119.jpg'; continue; } // 기존 로컬 파일 재사용
  if (fs.existsSync(OUT + fileOf(r.key))) continue;
  let ok = false;
  for (let a = 0; a < 2 && !ok; a++) {
    const res = await fetch(src(r), { headers: { 'User-Agent': UA } });
    if (res.status === 429) {
      if (waited) { console.log('429 persists, STOP', r.id); stop = true; break; }
      console.log('429, wait 5 min once', r.id); waited = true; await sleep(300000); continue;
    }
    if (!res.ok) { console.log('ERR', res.status, r.id); break; }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf[0] !== 0xFF || buf[1] !== 0xD8) { console.log('NOT JPEG', r.id, res.headers.get('content-type')); break; }
    fs.writeFileSync(OUT + fileOf(r.key), buf); ok = true; console.log('ok', r.id, buf.length);
  }
  if (stop) break;
  if (!ok) { fail++; if (fail >= 3) { console.log('stop: repeated failures'); break; } }
  await sleep(2000);
}
fs.writeFileSync('plan.json', JSON.stringify(plan, null, 1));
console.log('done fail', fail);
