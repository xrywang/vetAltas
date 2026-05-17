import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

await import('./build-max-patch.mjs');

const DIST = 'dist';
const statsHtml = await readFile('stats-page.html', 'utf8');

async function writeDist(path, content) {
  const file = join(DIST, path.replace(/^\//, ''));
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

await writeDist('stats/index.html', statsHtml);
await writeDist('stats.html', statsHtml);
await writeDist('admin/index.html', statsHtml);
console.log('Built stats dashboard routes.');
