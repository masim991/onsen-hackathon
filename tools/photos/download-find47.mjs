import { mkdir, writeFile } from 'node:fs/promises';

const images = {
  kirishima: '000/000/214',
  niyodo: '000/001/752',
  iya: '000/000/863',
};

await mkdir(new URL('../../web/images/', import.meta.url), { recursive: true });
for (const [name, id] of Object.entries(images)) {
  const url = `https://find47.jp/uploads/image_file/content/${id}/web.jpg`;
  const response = await fetch(url);
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`${name}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 20000) throw new Error(`${name}: unexpectedly small image`);
  await writeFile(new URL(`../../web/images/find47-${name}.jpg`, import.meta.url), bytes);
  console.log(name, bytes.length);
}
