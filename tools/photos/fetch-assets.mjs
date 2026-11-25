#!/usr/bin/env node
// One-off/batch importer step 1: download approved photo_assets (official-site images) with the same safe fetcher as the monitor
// (https only, public hosts, robots.txt, <=5MB, image magic bytes). Usage: node fetch-assets.mjs <outDir> <id=url> [<id=url> ...]
import fs from 'node:fs';
import path from 'node:path';
import { fetchSafe } from '../tracker/source-tracker.mjs';
const [out, ...pairs] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const magic = (b) => (b[0] === 0xff && b[1] === 0xd8 ? 'jpg' : b.subarray(1, 4).toString() === 'PNG' ? 'png' : b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' ? 'webp' : null);
for (const p of pairs) {
  const i = p.indexOf('='), id = p.slice(0, i), url = p.slice(i + 1);
  try {
    const r = await fetchSafe(url, { accept: 'image/*', anyType: true, maxBody: 5 * 1024 * 1024 });
    const ext = magic(r.body); if (!ext || r.truncated) throw new Error('not an image / too large');
    fs.writeFileSync(path.join(out, `${id}.${ext}`), r.body);
    console.log(`ok ${id} ${ext} ${r.body.length}`);
  } catch (e) { console.log(`FAIL ${id} ${String(e.message).slice(0, 80)}`); }
}
