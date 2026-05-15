import { readdir, readFile, writeFile } from 'node:fs/promises';

await import('./build-answerguard.mjs');

const assetDir = 'dist/assets';
const files = await readdir(assetDir);
const jsFile = files.find((file) => file.endsWith('.js'));
if (!jsFile) throw new Error('No built JS asset found');

const logoFile = 'vetaltas-logo-v3.svg';
const logoPath = `/assets/${logoFile}`;
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="title desc">
  <title id="title">vetAltas logo</title>
  <desc id="desc">Dog and cat silhouettes inside a stethoscope circle with a medical cross.</desc>
  <path d="M395 104C353 55 286 32 220 43 121 60 50 143 50 242c0 68 34 128 86 164" fill="none" stroke="#0f4d63" stroke-width="19" stroke-linecap="round"/>
  <path d="M135 384c4-74 31-129 82-173 16-14 33-32 50-59 7-12 23-8 23 6 0 31 3 51 14 65 24 9 49 22 70 43 14 14 13 32-4 42-23 14-59 5-93-15-31-18-63-16-88 9-19 19-31 48-37 91z" fill="#0f4d63"/>
  <path d="M164 397c8-41 31-73 67-92l12-47 31 39c30 6 56 24 69 49 8 16-2 33-22 38-23 7-50-2-74 7-27 10-53 22-83 6z" fill="#0f4d63"/>
  <path d="M345 132h34v46h46v34h-46v46h-34v-46h-46v-34h46z" fill="#65b7a8"/>
  <path d="M394 104c20 45 18 99 0 146" fill="none" stroke="#0f4d63" stroke-width="19" stroke-linecap="round"/>
  <circle cx="394" cy="250" r="16" fill="#0f4d63"/>
  <path d="M398 284c23-24 63-24 86 0 17 18 21 45 16 78" fill="none" stroke="#0f4d63" stroke-width="18" stroke-linecap="round"/>
  <path d="M394 284c-23-24-63-24-86 0-17 18-21 45-16 78" fill="none" stroke="#0f4d63" stroke-width="18" stroke-linecap="round"/>
  <circle cx="292" cy="374" r="12" fill="#0f4d63"/>
  <circle cx="500" cy="374" r="12" fill="#0f4d63"/>
</svg>
`;

await writeFile(`${assetDir}/${logoFile}`, logoSvg);
await writeFile(
  'dist/site.webmanifest',
  JSON.stringify(
    {
      name: 'vetAltas',
      short_name: 'vetAltas',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#0f4d63',
      icons: [
        {
          src: logoPath,
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any maskable',
        },
      ],
    },
    null,
    2,
  ),
);

const jsPath = `${assetDir}/${jsFile}`;
let js = await readFile(jsPath, 'utf8');

js = js.replaceAll('vet.practice', 'vetAltas');
js = js.replaceAll('/assets/vetaltas-logo.svg', logoPath);
js = js.replaceAll('/assets/vetaltas-logo-v2.svg', logoPath);

const logoMarker =
  'u.createElement("div",{className:"flex h-10 w-10 items-center justify-center rounded-lg bg-teal-700 text-white"},u.createElement(Ut.Stethoscope,{className:"h-5 w-5"}))';
const logoReplacement =
  `u.createElement("img",{src:"${logoPath}",alt:"vetAltas logo",className:"h-12 w-12 object-contain"})`;
if (js.includes(logoMarker)) {
  js = js.replace(logoMarker, logoReplacement);
}

await writeFile(jsPath, js);

const htmlPath = 'dist/index.html';
let html = await readFile(htmlPath, 'utf8');
html = html.replace(/<title>.*?<\/title>/, '<title>vetAltas</title>');
html = html.replaceAll('/assets/vetaltas-logo.svg', logoPath);
html = html.replaceAll('/assets/vetaltas-logo-v2.svg', logoPath);
if (!html.includes(logoPath)) {
  html = html.replace(
    '</title>',
    `</title>\n    <link rel="icon" type="image/svg+xml" href="${logoPath}" />\n    <link rel="apple-touch-icon" href="${logoPath}" />\n    <link rel="manifest" href="/site.webmanifest" />\n    <meta name="application-name" content="vetAltas" />\n    <meta name="theme-color" content="#0f4d63" />\n    <meta property="og:site_name" content="vetAltas" />\n    <meta property="og:title" content="vetAltas" />\n    <meta property="og:image" content="${logoPath}" />`,
  );
}
await writeFile(htmlPath, html);

console.log('Applied vetAltas branding with v3 logo assets.');
