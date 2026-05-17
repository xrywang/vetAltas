import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { gunzipSync } from 'node:zlib';

const SOURCE_ORIGIN = 'https://vetaltas.com';
const DIST = 'dist';
const LOGO_PATH = '/assets/vetaltas-logo-v4.svg';

async function read(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'vetaltas-build' } });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
  return res.text();
}

async function writeDist(path, content) {
  const file = join(DIST, path.replace(/^\//, ''));
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

function extractGzipConst(source, name) {
  const match = source.match(new RegExp(`const ${name} = gunzipSync\\(Buffer\\.from\\('([^']+)',\\s*'base64'\\)\\)\\.toString\\(\\);`));
  if (!match) throw new Error(`Could not find ${name}`);
  return gunzipSync(Buffer.from(match[1], 'base64')).toString();
}

function extractTemplateConst(source, name) {
  const match = source.match(new RegExp('const ' + name + ' = `([\\s\\S]*?)`;'));
  if (!match) throw new Error(`Could not find ${name}`);
  return match[1];
}

const originalSource = await readFile('build-original.mjs', 'utf8');
const caseSource = await readFile('build-casefix.mjs', 'utf8');
const labSource = await readFile('build-labfix.mjs', 'utf8');
const catAdd = extractGzipConst(originalSource, 'catAdd');
const dogAdd = extractGzipConst(originalSource, 'dogAdd');
const additionalCases = extractGzipConst(caseSource, 'additionalCases');
const labAdd = extractTemplateConst(labSource, 'labAdd');

function appendToFirstMarker(source, markers, addition, label) {
  const marker = markers.find(([full]) => source.includes(full));
  if (!marker) throw new Error(`${label} marker not found`);
  const [full, before, after] = marker;
  return source.replace(full, `${before}${addition}${after}`);
}

function patchDiseaseLearning(js) {
  if (!js.includes('Br=[') && !js.includes('Mr=[')) return js;
  if (js.includes('cat-felv')) return js;

  js = appendToFirstMarker(
    js,
    [
      ['sources:[D.merck,D.vca]}],Mr=[', 'sources:[D.merck,D.vca]}', '],Mr=['],
      ['sources:[D.merck,D.vca]}],Or=[', 'sources:[D.merck,D.vca]}', '],Or=['],
    ],
    catAdd,
    'Cat disease array',
  );
  js = appendToFirstMarker(
    js,
    [
      ['sources:[D.merck,D.aaha]}],Ac=[', 'sources:[D.merck,D.aaha]}', '],Ac=['],
      ['sources:[D.merck,D.aaha]}],Er=[', 'sources:[D.merck,D.aaha]}', '],Er=['],
    ],
    dogAdd,
    'Dog disease array',
  );

  const labelMarker = '"Endocrine / Emergency":"内分泌急症"},xm=';
  if (!js.includes('"Hematologic / Immune"') && js.includes(labelMarker)) {
    js = js.replace(
      labelMarker,
      '"Endocrine / Emergency":"内分泌急症",Oncology:"肿瘤学（Oncology）","Hematologic / Immune":"血液 / 免疫（Hematologic / Immune）",Neurologic:"神经系统（Neurologic）"},xm=',
    );
  }
  return js;
}

function patchCaseAnalysis(js) {
  if (!js.includes('Gu=[') && !js.includes('Ic=[')) return js;

  const caseMarkers = [
    {
      marker: '],ao=Ic.filter(e=>e.species==="cat"),oo=Ic.filter(e=>e.species==="dog").slice(0,8),om=[',
      replacement: `${additionalCases}],ao=Ic.filter(e=>e.species==="cat"),oo=Ic.filter(e=>e.species==="dog"),om=[`,
      dogSlice: 'oo=Ic.filter(e=>e.species==="dog").slice(0,8)',
    },
    {
      marker: '}],ju=Gu.filter(e=>e.species==="cat"),Vu=Gu.filter(e=>e.species==="dog").slice(0,8),kp=[',
      replacement: `}${additionalCases}],ju=Gu.filter(e=>e.species==="cat"),Vu=Gu.filter(e=>e.species==="dog"),kp=[`,
      dogSlice: 'Vu=Gu.filter(e=>e.species==="dog").slice(0,8)',
    },
  ];

  if (!js.includes('case-cat-felv')) {
    const caseMarker = caseMarkers.find(({ marker }) => js.includes(marker));
    if (!caseMarker) throw new Error('Case array marker not found');
    js = js.replace(caseMarker.marker, caseMarker.replacement);
  }
  for (const { dogSlice } of caseMarkers) {
    js = js.replace(dogSlice, dogSlice.replace('.slice(0,8)', ''));
  }
  return js.replace('label:"物种分布"', 'label:"病例分布"');
}

function patchLabIndicators(js) {
  if (!js.includes('Ou=[') && !js.includes('xu=[')) return js;
  if (js.includes('id:"albumin",name:"Albumin"')) return js;

  const disclaimerName = js.includes('disclaimer:xe}],C=') ? 'xe' : 'fe';
  const labAddForBundle = labAdd.replaceAll('disclaimer:fe', `disclaimer:${disclaimerName}`);
  const labMarker = `tips:"Classify jaundice as prehepatic, hepatic, or posthepatic using CBC, liver enzymes, imaging, and urine.",disclaimer:${disclaimerName}}],C=`;
  if (!js.includes(labMarker)) throw new Error('Lab marker not found');

  return js.replace(
    labMarker,
    `tips:"Classify jaundice as prehepatic, hepatic, or posthepatic using CBC, liver enzymes, imaging, and urine.",disclaimer:${disclaimerName}}${labAddForBundle}],C=`,
  );
}

function patchBundle(js) {
  return patchLabIndicators(patchCaseAnalysis(patchDiseaseLearning(js)))
    .replaceAll('/public/logo.png', LOGO_PATH)
    .replaceAll('/assets/vetaltas-logo.svg', LOGO_PATH)
    .replaceAll('/assets/vetaltas-logo-v2.svg', LOGO_PATH)
    .replaceAll('/assets/vetaltas-logo-v3.svg', LOGO_PATH);
}

let html = await read(`${SOURCE_ORIGIN}/`);
const assetPaths = [...html.matchAll(/(?:src|href)="(\/(?!\/)[^"#?]+)(?:[?#][^"]*)?"/g)]
  .map((m) => m[1])
  .filter((path) => !path.endsWith('/'))
  .filter((path, index, paths) => paths.indexOf(path) === index);
if (!assetPaths.some((p) => p.endsWith('.js'))) throw new Error('No JS asset found in source page');

let logoSvg;
try {
  logoSvg = await read(`${SOURCE_ORIGIN}${LOGO_PATH}`);
} catch {
  logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="vetAltas logo">
  <rect width="512" height="512" rx="96" fill="#f8fafc"/>
  <circle cx="256" cy="256" r="176" fill="none" stroke="#0f766e" stroke-width="34"/>
  <path d="M164 282c0-66 42-116 92-116s92 50 92 116" fill="none" stroke="#0f172a" stroke-width="34" stroke-linecap="round"/>
  <path d="M190 330h132" stroke="#0f172a" stroke-width="34" stroke-linecap="round"/>
  <path d="M256 108v88M212 152h88" stroke="#14b8a6" stroke-width="36" stroke-linecap="round"/>
</svg>
`;
}
await writeDist(LOGO_PATH, logoSvg);
html = html
  .replaceAll('/public/logo.png', LOGO_PATH)
  .replaceAll('/assets/vetaltas-logo.svg', LOGO_PATH)
  .replaceAll('/assets/vetaltas-logo-v2.svg', LOGO_PATH)
  .replaceAll('/assets/vetaltas-logo-v3.svg', LOGO_PATH);

for (const path of assetPaths) {
  let content = await read(`${SOURCE_ORIGIN}${path}`);
  if (path.endsWith('.js')) {
    const patched = patchBundle(content);
    if (patched !== content) {
      const cacheSafePath = path.endsWith('-diseases.js') ? path : path.replace(/\.js$/, '-diseases.js');
      await writeDist(cacheSafePath, patched);
      html = html.replaceAll(path, cacheSafePath);
      continue;
    }
  }
  await writeDist(path, content);
}

await writeDist('index.html', html);
console.log('Built vetAltas with maximum disease learning, case analysis, and lab indicator content.');
