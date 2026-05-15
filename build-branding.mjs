import { readdir, readFile, writeFile } from 'node:fs/promises';

await import('./build-answerguard.mjs');

const assetDir = 'dist/assets';
const files = await readdir(assetDir);
const jsFile = files.find((file) => file.endsWith('.js'));
if (!jsFile) throw new Error('No built JS asset found');

const logoFile = 'vetaltas-logo-v2.svg';
const logoPath = `/assets/${logoFile}`;
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="title desc">
  <title id="title">vetAltas logo</title>
  <desc id="desc">Dog and cat silhouettes inside a medical stethoscope circle with a cross.</desc>
  <path d="M401 131a183 183 0 1 0 2 247" fill="none" stroke="#0f4d63" stroke-width="18" stroke-linecap="round"/>
  <path d="M111 331c10-53 36-95 78-128 25-20 38-43 59-69 7-9 19-4 17 9-3 22-2 39 5 52 10 18 35 29 55 44 28 21 38 53 22 72-13 16-43 13-68 5-30-9-60 1-86 22-27 21-56 23-82-7Z" fill="#0f4d63"/>
  <path d="M143 363c11-37 32-66 64-83l10-45 28 36c24 5 47 20 58 42 7 14-3 28-20 33-18 6-41 0-61 8-23 10-49 22-79 9Z" fill="#0f4d63"/>
  <path d="M355 108h33v45h45v33h-45v45h-33v-45h-45v-33h45z" fill="#65b7a8"/>
  <path d="M397 333c0-45 31-77 75-77s75 32 75 77" fill="none" stroke="#0f4d63" stroke-width="18" stroke-linecap="round" transform="translate(-72 11)"/>
  <path d="M325 346v36m150-36v36" fill="none" stroke="#0f4d63" stroke-width="18" stroke-linecap="round"/>
  <circle cx="325" cy="392" r="13" fill="#0f4d63"/>
  <circle cx="475" cy="392" r="13" fill="#0f4d63"/>
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
if (!html.includes(logoPath)) {
  html = html.replace(
    '</title>',
    `</title>\n    <link rel="icon" type="image/svg+xml" href="${logoPath}" />\n    <link rel="apple-touch-icon" href="${logoPath}" />\n    <link rel="manifest" href="/site.webmanifest" />\n    <meta name="application-name" content="vetAltas" />\n    <meta name="theme-color" content="#0f4d63" />\n    <meta property="og:site_name" content="vetAltas" />\n    <meta property="og:title" content="vetAltas" />\n    <meta property="og:image" content="${logoPath}" />`,
  );
}
await writeFile(htmlPath, html);

console.log('Applied vetAltas branding with updated logo assets.');
