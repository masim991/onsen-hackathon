#!/usr/bin/env node
// Export only rows visible to the public Data API for a current offline fallback.
// No service key or direct database connection is used.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const loader = fs.readFileSync(path.join(root, 'web', 'db-loader.js'), 'utf8');
const project = loader.match(/const project = '([^']+)'/)?.[1];
const key = loader.match(/const key = '([^']+)'/)?.[1];
if (!project || !key) throw new Error('Public Supabase configuration missing from db-loader.js');
const output = path.join(root, 'web', 'data', 'catalog-snapshot.json');

async function read(table, select, order, filter = '') {
  const rows = [];
  let total;
  for (;;) {
    const offset = rows.length;
    const url = `${project}/rest/v1/${table}?select=${select}&order=${order}${filter}&offset=${offset}&limit=1000`;
    const response = await fetch(url, {
      headers:{apikey:key, Authorization:`Bearer ${key}`, ...(offset === 0 ? {Prefer:'count=exact'} : {})},
      cache:'no-store',
      signal:AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`${table}: HTTP ${response.status}`);
    if (offset === 0) {
      const count = /\/(\d+)$/.exec(response.headers.get('Content-Range') || '');
      if (!count) throw new Error(`${table}: missing exact count`);
      total = Number(count[1]);
    }
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error(`${table}: invalid response`);
    rows.push(...batch);
    if (rows.length === total) return rows;
    if (!batch.length || rows.length > total) throw new Error(`${table}: count changed while reading`);
  }
}
const readRevision = async () => (await read('onsen_catalog_revision', 'revision', 'revision.asc', '&id=eq.true'))[0]?.revision;
const suspicious = /[<>`]|javascript:|data:text|\bon\w+\s*=/i;
const safeText = value => typeof value === 'string' ? value.length <= 500 && !suspicious.test(value) : Array.isArray(value) ? value.every(safeText) : value && typeof value === 'object' ? Object.values(value).every(safeText) : true;

let snapshot;
for (let attempt = 0; attempt < 3; attempt++) {
  const before = await readRevision();
  const [rows, photoRows, noticeRows] = await Promise.all([
    read('onsen_facilities', 'id,record,name_ko,name_ja,prefecture,area,facility_kind,official_url,source_url,source_checked,updated_at', 'id.asc', '&unlisted=eq.false'),
    read('onsen_photos', 'facility_id,image_key,image_path,caption,author,license,metadata,sort_order', 'facility_id.asc,sort_order.asc,image_key.asc'),
    read('facility_notices', 'id,facility_id,title,notice_date,summary_ko,source_url,detected_at', 'detected_at.desc,id.desc', '&published=eq.true&summary_ko=not.is.null')
  ]);
  const after = await readRevision();
  if (!Number.isSafeInteger(before) || before !== after) continue;
  if (!rows.length) throw new Error('No public facilities to export');
  const ids = new Set(rows.map(row => String(row.id)));
  if (ids.size !== rows.length || rows.some(row => !row.id || !row.name_ja || !row.prefecture)) throw new Error('Invalid facility rows');
  // Monitor approvals can be revoked independently of the static snapshot's lifetime.
  const photos = photoRows.filter(photo => ids.has(String(photo.facility_id)) && photo.metadata?.monitor_approved !== true && safeText(photo) && !['official/orihashi-kagoshima-2428.jpg','official/koshikano-kagoshima-2394.jpg'].includes(photo.image_key));
  const notices = noticeRows.filter(notice => ids.has(String(notice.facility_id)));
  snapshot = {generated:new Date().toISOString(), revision:after, rows, photos, notices};
  break;
}
if (!snapshot) throw new Error('Catalog changed during all snapshot attempts');
const json = JSON.stringify(snapshot);
const dryRun = process.argv.includes('--dry-run');
if (!dryRun) {
  const temporary = `${output}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, json, {flag:'wx'});
    fs.renameSync(temporary, output);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
console.log(JSON.stringify({...(dryRun ? {dryRun} : {output}), bytes:Buffer.byteLength(json), revision:snapshot.revision, facilities:snapshot.rows.length, photos:snapshot.photos.length, notices:snapshot.notices.length}));
