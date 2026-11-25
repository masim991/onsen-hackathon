// Recheck the hand-picked Commons entries and cache 1200px source thumbnails locally.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const manifestFile = resolve(root, 'web/pref-banner-photos.js');
const scope = { window: {} };
runInNewContext(await readFile(manifestFile, 'utf8'), scope);
const entries = Object.entries(scope.window.PREF_BANNER_PHOTOS);
const clean = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
const titleOf = entry => `File:${decodeURIComponent(entry.imageKey.slice('commons/'.length)).replaceAll('_', ' ')}`;
const result = new Map();
for (let offset = 0; offset < entries.length; offset += 20) {
  const batch = entries.slice(offset, offset + 20);
  const q = new URL('https://commons.wikimedia.org/w/api.php');
  q.search = new URLSearchParams({action:'query',format:'json',prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'1200',titles:batch.map(([,entry]) => titleOf(entry)).join('|')});
  const response = await fetch(q, {headers:{'User-Agent':'OnsenCatalog/1.0 (license verification)'}});
  if (!response.ok) throw Error(`Commons metadata ${response.status}`);
  const body = await response.json();
  for (const page of Object.values(body.query?.pages || {})) {
    if (page.imageinfo?.[0]) result.set(page.title.toLowerCase(), page.imageinfo[0]);
  }
}

const output = {};
await mkdir(resolve(root, 'web/images/pref-banner'), {recursive:true});
for (let i = 0; i < entries.length; i++) {
  const [pref, entry] = entries[i];
  const info = result.get(titleOf(entry).toLowerCase());
  if (!info) throw Error(`${pref}: Commons page missing (${entry.imageKey})`);
  const currentLicense = clean(info.extmetadata?.LicenseShortName?.value);
  if (currentLicense.toLowerCase() !== entry.license.toLowerCase()) throw Error(`${pref}: license changed ${entry.license} → ${currentLicense}`);
  const artist = clean(info.extmetadata?.Artist?.value).toLocaleLowerCase();
  const storedAuthor = clean(entry.author).toLocaleLowerCase().replace(/^photo:\s*/, '');
  if (storedAuthor && !artist.includes(storedAuthor) && !storedAuthor.includes(artist)) process.stderr.write(`${pref}: author text differs (${entry.author} / ${artist})\n`);
  if (!info.thumburl) throw Error(`${pref}: thumbnail missing`);
  const stem = `images/pref-banner/${String(i + 1).padStart(2, '0')}`;
  let existing = '';
  for (const ext of ['jpg','png','webp']) {
    try { await access(resolve(root, 'web', `${stem}.${ext}`)); existing = `${stem}.${ext}`; break; } catch {}
  }
  if (existing) { output[pref] = {...entry, imagePath:existing, resized:true}; continue; }
  let response;
  for (const delay of [0,5000,15000,30000]) {
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    response = await fetch(info.thumburl, {headers:{'User-Agent':'OnsenCatalog/1.0 (licensed thumbnail cache)'}});
    if (response.ok || response.status !== 429) break;
  }
  if (!response.ok) throw Error(`${pref}: thumbnail ${response.status}`);
  const mime = response.headers.get('content-type') || '';
  const extension = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : mime.includes('jpeg') ? 'jpg' : '';
  if (!extension) throw Error(`${pref}: unsupported image type ${mime}`);
  const imagePath = `${stem}.${extension}`;
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 3000 || buffer.length > 4_000_000) throw Error(`${pref}: unexpected size ${buffer.length}`);
  await writeFile(resolve(root, 'web', imagePath), buffer);
  output[pref] = {...entry, imagePath, resized:true};
  process.stdout.write(`${pref} ${imagePath} ${Math.round(buffer.length / 1024)} KiB\n`);
}
const source = `// Curated Commons images of the named facility. Each entry was rechecked via Commons imageinfo.\n// If a prefecture is absent, the banner uses its atmospheric fallback.\nwindow.PREF_BANNER_PHOTOS = Object.freeze(${JSON.stringify(output, null, 2)});\n`;
await writeFile(manifestFile, source, 'utf8');
process.stdout.write(`Verified and cached ${Object.keys(output).length} prefecture photos.\n`);
