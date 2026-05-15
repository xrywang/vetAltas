import { copyFile, readdir, readFile, writeFile } from 'node:fs/promises';

await import('./build-original.mjs');

const assetDir = 'dist/assets';
const files = await readdir(assetDir);
const jsFile = files.find((file) => file.endsWith('.js'));
if (!jsFile) throw new Error('No built JS asset found');

const cacheSafeJsFile = jsFile.replace(/\.js$/, '-diseases.js');
await copyFile(`${assetDir}/${jsFile}`, `${assetDir}/${cacheSafeJsFile}`);

const htmlPath = 'dist/index.html';
const html = await readFile(htmlPath, 'utf8');
await writeFile(htmlPath, html.replace(`/assets/${jsFile}`, `/assets/${cacheSafeJsFile}`));

console.log(`Updated HTML to use cache-safe JS asset: ${cacheSafeJsFile}`);
