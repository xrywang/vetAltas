import { readdir, readFile, writeFile } from 'node:fs/promises';

await import('./build-labfix.mjs');

const assetDir = 'dist/assets';
const files = await readdir(assetDir);
const jsFile = files.find((file) => file.endsWith('.js'));
if (!jsFile) throw new Error('No built JS asset found');
const jsPath = `${assetDir}/${jsFile}`;
let js = await readFile(jsPath, 'utf8');

const oldYn = 'const yn=e=>Ur[e]||Uc(e),fl=';
const newYn = 'const yn=e=>Ur[e]||(()=>{const t=Uc(e),n=t.replace(/\\b(?:PU|PD|CKD|AKI|SDMA|UPC|ECG|CBC|BP|T4|PCR|FIP|FeLV|FIV|IBD|GI|IVDD|CCL|CHF|CIRDC|IMHA|ALT|ALP|HCM|ACTH|TSH|BAL|A:G|fPLI)\\b/g,"");return t!==e&&/[\\u4e00-\\u9fff]/.test(t)&&!/[A-Za-z]{4,}/.test(n)?t:`需要人工核查 / Needs manual verification（${e}）`})(),fl=';

if (js.includes(oldYn)) {
  js = js.replace(oldYn, newYn);
}

await writeFile(jsPath, js);
console.log('Guarded unverified English answer feedback with manual verification labels.');
