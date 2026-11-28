import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';

function installFixture() {
const rows = Array.from({length:2729}, (_, i) => ({id:`f-${i}`, name_ja:'温泉', prefecture:'長野県'}));
const photos = [
  {facility_id:'f-0', image_key:'legacy', image_path:'images/legacy.jpg', metadata:{}},
  {facility_id:'f-1', image_key:'approved', image_path:'images/approved.jpg', metadata:{monitor_approved:true}},
  {facility_id:'hidden', image_key:'hidden', image_path:'images/hidden.jpg', metadata:{}}
];
const notices = Array.from({length:1001}, (_, i) => ({
  id:i, facility_id:'f-2728', summary_ko:'공지', detected_at:'2026-11-28T00:00:00Z'
}));
const resources = {
  onsen_facilities: rows,
  onsen_photos: photos,
  facility_notices: [...notices, {id:1002, facility_id:'hidden', summary_ko:'숨김'}],
  onsen_catalog_revision: [{revision:7}]
};
globalThis.fetch = async (input, opts) => {
  if (!input.startsWith('https://')) return Response.json(null);
  const url = new URL(input), table = url.pathname.split('/').at(-1);
  const list = resources[table];
  if (!list) throw new Error('Unexpected resource: ' + table);
  if (table === 'onsen_facilities' && url.searchParams.get('unlisted') !== 'eq.false') throw new Error('Missing public filter');
  if (table === 'facility_notices' && url.searchParams.get('order') !== 'detected_at.desc,id.desc') throw new Error('Missing notice tie breaker');
  const offset = Number(url.searchParams.get('offset'));
  const page = list.slice(offset, offset + 437);
  return Response.json(page, {headers: opts?.headers?.Prefer === 'count=exact' ? {
    'Content-Range': page.length ? `0-${page.length - 1}/${list.length}` : '*/0'
  } : {}});
};
}
const fixture = `(${installFixture.toString()})();`;

const loader = fs.readFileSync(new URL('../web/db-loader.js', import.meta.url), 'utf8');

test('browser loads 2,729 facilities and every notice across a smaller server page size', {timeout:2000}, async () => {
  const window = {}, RAW = [], PHOTOS = {}, LOCAL_PHOTOS = {};
  let ready;
  const loaded = new Promise(resolve => { ready = resolve; });
  const document = {
    documentElement:{lang:'ko', dataset:{}}, hidden:true, getElementById:()=>null,
    addEventListener:ready, createElement:()=>({}), body:{appendChild(script) { script.onload(); }}
  };
  const context = vm.createContext({window, document, RAW, PHOTOS, LOCAL_PHOTOS, EXTRA:{}, IM_FIX:{}, Response, URL, AbortSignal});
  vm.runInContext(fixture, context);
  vm.runInContext(loader, context);
  await loaded;
  assert.equal(document.documentElement.dataset.catalog, 'supabase');
  assert.equal(RAW.length, 2729);
  assert.equal(window.ONSEN_NOTICES.get('f-2728').length, 1001);
  assert.equal(window.ONSEN_NOTICES.has('hidden'), false);
  assert.equal(PHOTOS['db:f-1'].shots[0][0], 'approved');
});

test('snapshot supports 2,729 facilities without freezing approved or hidden photos', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'onsen-catalog-test-'));
  try {
    fs.mkdirSync(path.join(folder, 'web', 'data'), {recursive:true});
    fs.mkdirSync(path.join(folder, 'tools'));
    fs.writeFileSync(path.join(folder, 'web', 'db-loader.js'), loader);
    fs.writeFileSync(path.join(folder, 'mock.mjs'), fixture);
    fs.copyFileSync(new URL('export-public-snapshot.mjs', import.meta.url), path.join(folder, 'tools', 'export-public-snapshot.mjs'));
    const result = spawnSync(process.execPath, ['--import', './mock.mjs', './tools/export-public-snapshot.mjs'], {cwd:folder, encoding:'utf8'});
    assert.equal(result.status, 0, result.stderr);
    const snapshot = JSON.parse(fs.readFileSync(path.join(folder, 'web', 'data', 'catalog-snapshot.json')));
    assert.equal(snapshot.rows.length, 2729);
    assert.equal(snapshot.notices.length, 1001);
    assert.deepEqual(snapshot.photos.map(photo => photo.image_key), ['legacy']);
  } finally {
    for (const subpath of ['web/data/catalog-snapshot.json', 'web/data', 'web/db-loader.js', 'web', 'tools/export-public-snapshot.mjs', 'tools', 'mock.mjs', '']) {
      const entry = path.join(folder, subpath);
      if (!fs.existsSync(entry)) continue;
      if (fs.statSync(entry).isDirectory()) fs.rmdirSync(entry);
      else fs.unlinkSync(entry);
    }
  }
});
