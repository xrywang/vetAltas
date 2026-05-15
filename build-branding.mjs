import { readdir, readFile, writeFile } from 'node:fs/promises';

await import('./build-answerguard.mjs');

const assetDir = 'dist/assets';
const files = await readdir(assetDir);
const jsFile = files.find((file) => file.endsWith('.js'));
if (!jsFile) throw new Error('No built JS asset found');

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="title desc">
  <title id="title">vetAltas logo</title>
  <desc id="desc">Dog and cat silhouettes with a medical cross and stethoscope circle.</desc>
  <rect width="512" height="512" rx="96" fill="#ffffff"/>
  <path d="M383 139a190 190 0 1 0 7 187" fill="none" stroke="#0f4d63" stroke-width="22" stroke-linecap="round"/>
  <path d="M129 337c15-69 52-111 103-158 17-16 25-46 41-44 15 2 8 50 15 62 9 14 43 33 59 54 13 17 19 40 10 54-11 17-41 14-62 9-20-5-44-2-66 16-22 17-48 21-100 7Z" fill="#0f4d63"/>
  <path d="M136 363c16-47 43-75 75-94 10-6 10-30 22-29 15 2 11 30 21 39 12 10 39 16 49 34 8 15-2 30-19 36-22 8-50 2-72 12-23 10-45 18-76 2Z" fill="#0f4d63"/>
  <path d="M360 117h31v44h43v31h-43v44h-31v-44h-43v-31h43z" fill="#65b7a8"/>
  <path d="M390 324c0-40 28-68 67-68s67 28 67 68v34" fill="none" stroke="#0f4d63" stroke-width="18" stroke-linecap="round" transform="translate(-56 20)"/>
  <circle cx="334" cy="378" r="12" fill="#0f4d63"/>
  <circle cx="468" cy="378" r="12" fill="#0f4d63"/>
</svg>
`;

await writeFile(`${assetDir}/vetaltas-logo.svg`, logoSvg);
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
          src: '/assets/vetaltas-logo.svg',
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

const logoMarker =
  'u.createElement("div",{className:"flex h-10 w-10 items-center justify-center rounded-lg bg-teal-700 text-white"},u.createElement(Ut.Stethoscope,{className:"h-5 w-5"}))';
const logoReplacement =
  'u.createElement("img",{src:"/assets/vetaltas-logo.svg",alt:"vetAltas logo",className:"h-10 w-10 rounded-lg bg-white object-cover"})';
if (js.includes(logoMarker)) {
  js = js.replace(logoMarker, logoReplacement);
}

await writeFile(jsPath, js);

const htmlPath = 'dist/index.html';
let html = await readFile(htmlPath, 'utf8');
html = html.replace(/<title>.*?<\/title>/, '<title>vetAltas</title>');
if (!html.includes('/assets/vetaltas-logo.svg')) {
  html = html.replace(
    '</title>',
    '</title>\n    <link rel="icon" type="image/svg+xml" href="/assets/vetaltas-logo.svg" />\n    <link rel="apple-touch-icon" href="/assets/vetaltas-logo.svg" />\n    <link rel="manifest" href="/site.webmanifest" />\n    <meta name="application-name" content="vetAltas" />\n    <meta name="theme-color" content="#0f4d63" />\n    <meta property="og:site_name" content="vetAltas" />\n    <meta property="og:title" content="vetAltas" />\n    <meta property="og:image" content="/assets/vetaltas-logo.svg" />',
  );
}
await writeFile(htmlPath, html);

console.log('Applied vetAltas branding, favicon, and logo assets.');
