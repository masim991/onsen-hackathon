// Fetch only directly identified facility photos from the vetted Commons plan.
// Stop at the first rate-limit response; do not retry or bypass it.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf8'));
const ids = new Set([
  'official-gunma-kusatsu-k0052','official-mie-kumano-yunokuchi',
  'official-hyogo-arima-goshoboh','official-fukuoka-hakata-fuji-no-sono',
  'official-gunma-kusatsu-k0012','official-kanagawa-hakone-gora-kansuiro',
  'official-gunma-ikaho-06','official-gunma-ikaho-08',
  'official-kanagawa-hakone-tonosawa-ichinoyu-honkan',
  'official-kanagawa-hakone-yoshiike-ryokan',
  'official-kanagawa-hakone-hakone-suishoen',
  'official-ishikawa-wakura-togetsuan','official-nagano-asama-higashiishikawa',
  'official-nagano-nozawa-sotoyu-1','official-nagano-nozawa-sotoyu-11',
  'official-yamagata-ginzan-kosekiya-annex','official-kanagawa-kogome',
  'official-nagano-matsumoto-awanoyu','official-hiroshima-miyajima-iwaso',
  'official-wakayama-yunomine-public','official-wakayama-yunomine-tsuboyu',
  'official-fukuoka-futsukaichi-hakatayu',
]);
const outDir = path.resolve(dir, '../../web/images');
for (const r of plan.filter(x => ids.has(x.id))) {
  const file = 'commons-' + crypto.createHash('sha256').update(r.key).digest('hex').slice(0,16) + '.jpg';
  const dest = path.join(outDir, file);
  if (fs.existsSync(dest)) { console.log('existing', r.id, file); continue; }
  const source = r.w <= 960 ? r.url : r.url.replace('/wikipedia/commons/', '/wikipedia/commons/thumb/') + '/960px-' + r.url.split('/').pop();
  const response = await fetch(source, {headers:{'User-Agent':'onsen-photo-import/1.0 (licensed site photos; 1 request/2s)'}});
  if (response.status === 429) { console.log('RATE_LIMIT', r.id); break; }
  if (!response.ok) { console.log('HTTP', response.status, r.id); continue; }
  const buf = Buffer.from(await response.arrayBuffer());
  if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf.length < 20000) { console.log('INVALID', r.id); continue; }
  fs.writeFileSync(dest, buf);
  console.log('saved', r.id, file, buf.length, r.artist, r.license, r.pageUrl);
  await new Promise(resolve => setTimeout(resolve, 2000));
}
