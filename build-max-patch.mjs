import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { gunzipSync } from 'node:zlib';

const SOURCE_ORIGIN = 'https://vetaltas.com';
const DIST = 'dist';
const LOGO_PATH = '/assets/vetaltas-logo-v4.svg';
const STATS_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>vetAltas 后台统计</title>
  <link rel="icon" href="/assets/vetaltas-logo-v4.svg" type="image/svg+xml" />
  <style>
    :root{color-scheme:light;--bg:#f3f7f7;--card:#fff;--text:#0f172a;--muted:#64748b;--line:#d9e4e3;--teal:#0f766e;--teal-dark:#115e59;--rose:#be123c;--amber:#b45309}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    header{border-bottom:1px solid var(--line);background:rgba(255,255,255,.94);backdrop-filter:blur(10px)}.bar{max-width:1120px;margin:auto;padding:18px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.brand{display:flex;align-items:center;gap:12px}.brand img{width:44px;height:44px;border-radius:8px}.brand h1{margin:0;font-size:24px}.brand p{margin:2px 0 0;color:var(--muted);font-weight:650}.actions{display:flex;gap:10px;flex-wrap:wrap}a,button{border-radius:8px;font-weight:800}a{color:var(--teal);text-decoration:none}.btn{display:inline-flex;align-items:center;border:1px solid var(--line);background:white;padding:10px 12px;color:var(--text)}.primary{border-color:var(--teal);background:var(--teal);color:white}
    main{max-width:1120px;margin:auto;padding:22px 18px 44px}.status{margin-bottom:16px;border:1px solid var(--line);background:white;border-radius:8px;padding:14px 16px;color:var(--muted);font-weight:700}.status.ok{border-color:#99f6e4;color:var(--teal-dark);background:#f0fdfa}.status.warn{border-color:#fde68a;color:var(--amber);background:#fffbeb}.status.bad{border-color:#fecdd3;color:var(--rose);background:#fff1f2}
    .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:16px;box-shadow:0 8px 24px rgba(15,23,42,.05)}.metric span{display:block;color:var(--muted);font-size:13px;font-weight:800}.metric b{display:block;margin-top:8px;color:var(--teal);font-size:34px;line-height:1}
    .section{margin-top:16px}.section h2{font-size:18px;margin:0 0 12px}.table-wrap{overflow:auto}.table{width:100%;border-collapse:collapse;min-width:680px}.table th,.table td{border-bottom:1px solid var(--line);padding:11px 10px;text-align:left;font-size:14px}.table th{color:var(--muted);font-size:12px;text-transform:uppercase}.muted{color:var(--muted)}.empty{padding:24px;color:var(--muted);font-weight:700;text-align:center}.pill{display:inline-flex;border-radius:999px;background:#ccfbf1;color:var(--teal-dark);padding:4px 8px;font-size:12px;font-weight:900}
    @media(max-width:820px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.brand h1{font-size:20px}}@media(max-width:520px){.grid{grid-template-columns:1fr}.actions{width:100%}.btn{justify-content:center;flex:1}}
  </style>
</head>
<body>
  <header>
    <div class="bar">
      <div class="brand">
        <img src="/assets/vetaltas-logo-v4.svg" alt="vetAltas" />
        <div><h1>vetAltas 后台统计</h1><p>连接当前最新版网站数据</p></div>
      </div>
      <div class="actions">
        <a class="btn" href="/">打开最新版网页</a>
        <button class="btn primary" id="refresh" type="button">刷新</button>
      </div>
    </div>
  </header>
  <main>
    <div id="status" class="status">正在连接后台...</div>
    <div class="grid">
      <div class="card metric"><span>访问事件</span><b id="events">0</b></div>
      <div class="card metric"><span>会话数</span><b id="sessions">0</b></div>
      <div class="card metric"><span>页面浏览</span><b id="views">0</b></div>
      <div class="card metric"><span>活跃秒数</span><b id="seconds">0</b></div>
    </div>
    <section class="card section">
      <h2>热门页面</h2>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>页面</th><th>标题</th><th>浏览</th></tr></thead>
          <tbody id="pages"><tr><td class="empty" colspan="3">暂无数据</td></tr></tbody>
        </table>
      </div>
    </section>
    <section class="card section">
      <h2>连接状态</h2>
      <p class="muted" id="details">等待检测...</p>
      <p><span class="pill" id="storage">checking</span></p>
    </section>
  </main>
  <script>
    const el = (id) => document.getElementById(id);
    function setStatus(text, mode) {
      el("status").className = "status " + mode;
      el("status").textContent = text;
    }
    function number(value) {
      return Number(value || 0).toLocaleString("zh-CN");
    }
    async function loadStats() {
      setStatus("正在连接后台...", "");
      try {
        const response = await fetch("/api/stats?ts=" + Date.now(), { cache: "no-store" });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const data = await response.json();
        if (!data.ok) throw new Error(data.error || "stats unavailable");
        el("events").textContent = number(data.total_events);
        el("sessions").textContent = number(data.sessions);
        el("views").textContent = number(data.page_views);
        el("seconds").textContent = number(data.active_seconds);
        el("storage").textContent = data.storage === "connected" ? "数据存储已连接" : "等待配置数据存储";
        el("details").textContent = data.storage === "connected"
          ? "后台已连接最新版网页统计接口。最近数据时间：" + (data.latest_event_at || "暂无")
          : "后台页面和接口已恢复；如需跨访客累计数据，请在 Vercel 配置 KV/Upstash Redis 环境变量。";
        const pages = Array.isArray(data.top_pages) ? data.top_pages : [];
        el("pages").innerHTML = pages.length
          ? pages.map((page) => "<tr><td><a href='" + page.path + "'>" + page.path + "</a></td><td>" + (page.title || "") + "</td><td>" + number(page.views) + "</td></tr>").join("")
          : "<tr><td class='empty' colspan='3'>暂无数据</td></tr>";
        setStatus("后台已连接最新版网页。", data.storage === "connected" ? "ok" : "warn");
      } catch (error) {
        setStatus("后台连接失败：" + error.message, "bad");
        el("details").textContent = "请确认 /api/stats 已随 Vercel 最新部署上线。";
      }
    }
    el("refresh").addEventListener("click", loadStats);
    loadStats();
  </script>
</body>
</html>
`;

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

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="vetAltas logo">
  <rect width="512" height="512" rx="96" fill="#f8fafc"/>
  <circle cx="256" cy="256" r="172" fill="#ffffff" stroke="#0f766e" stroke-width="30"/>
  <path d="M256 116v86M213 159h86" stroke="#14b8a6" stroke-width="34" stroke-linecap="round"/>
  <path d="M157 310c18-76 62-124 99-124s81 48 99 124" fill="none" stroke="#0f172a" stroke-width="32" stroke-linecap="round"/>
  <path d="M188 340h136" stroke="#0f172a" stroke-width="32" stroke-linecap="round"/>
  <circle cx="184" cy="254" r="20" fill="#0f172a"/>
  <circle cx="328" cy="254" r="20" fill="#0f172a"/>
</svg>
`;
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
await writeDist('stats/index.html', STATS_HTML);
await writeDist('stats.html', STATS_HTML);
await writeDist('admin/index.html', STATS_HTML);
console.log('Built vetAltas with maximum disease learning, case analysis, and lab indicator content.');
