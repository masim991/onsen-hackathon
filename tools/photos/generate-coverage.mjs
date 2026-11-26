import { writeFile, stat } from 'node:fs/promises';
import { assets, coverage } from './coverage-20261126.mjs';

const rows = [];
for (const [id, name] of coverage) {
  const asset = assets[name];
  if (!asset) throw new Error(`Missing asset: ${name}`);
  await stat(new URL(`../../web/${asset.path}`, import.meta.url));
  const caption = `${asset.captionKo || asset.title}${asset.kind === 'area' ? ' · 해당 시설 사진 아님' : ''}`;
  rows.push({
    facility_id: id, image_key: `coverage/20261126/${id}.jpg`, image_path: asset.path,
    caption, author: asset.author, license: asset.license, sort_order: 0,
    metadata: { kind: asset.kind, source: asset.source, terms: asset.terms,
      credit: `${asset.title} © ${asset.author} · ${asset.license}`,
      title: asset.title, coverage: true, resized: asset.resized,
      checked: '2026-11-26' },
  });
}
const js = `// Generated from tools/photos/coverage-20261126.mjs.\n`+
  `for (const p of ${JSON.stringify(rows)}) {\n`+
  `  const key = 'coverage:' + p.facility_id;\n`+
  `  LOCAL_PHOTOS[p.image_key] = p.image_path;\n`+
  `  PHOTOS[key] = { cap: p.caption, shots: [[p.image_key, p.author, p.license, {...p.metadata, caption:p.caption}]] };\n`+
  `  IM_FIX[p.facility_id] = key;\n`+
  `}\n`;
await writeFile(new URL('../../web/photo-coverage.js', import.meta.url), js);
const sql = `insert into public.onsen_photos (facility_id,image_key,image_path,caption,author,license,metadata,sort_order)\n`+
  `select facility_id,image_key,image_path,caption,author,license,metadata,sort_order\n`+
  `from jsonb_to_recordset($coverage$${JSON.stringify(rows)}$coverage$::jsonb)\n`+
  `as x(facility_id text,image_key text,image_path text,caption text,author text,license text,metadata jsonb,sort_order integer)\n`+
  `on conflict (facility_id,image_key) do update set image_path=excluded.image_path,caption=excluded.caption,author=excluded.author,license=excluded.license,metadata=excluded.metadata,sort_order=excluded.sort_order;`;
await writeFile(new URL('./coverage-20261126.sql', import.meta.url), sql);
console.log(`Generated ${rows.length} photo links from ${Object.keys(assets).length} licensed assets.`);
