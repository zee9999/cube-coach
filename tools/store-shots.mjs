// Store screenshots: drives the web app in headless Chrome, captures each scene at phone size,
// then frames it with a headline at the exact sizes the App Store and Google Play ask for.
// Run: node tools/store-shots.mjs   (needs Chrome or Edge installed; no npm packages)
// Output: resources/store/<set>/NN-name.png

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WWW = join(ROOT, 'www');
const OUT = join(ROOT, 'resources', 'store');

// Phone viewport the app is captured at (CSS px) and its pixel density.
const PHONE = { width: 390, height: 844, scale: 3 };

// Final sizes. CSS size x scale = pixels.
const SETS = [
  { id: 'ios-6.9', width: 440, height: 956, scale: 3 },   // 1320 x 2868, iPhone 6.9" (required)
  { id: 'play-phone', width: 360, height: 640, scale: 3 }, // 1080 x 1920, Google Play phone
];

// Seeded player so the shots look lived-in but not maxed out.
const PLAYER = {
  coins: 1240, owned: ['classic', 'black', 'pastel'], equipped: { stickers: 'classic', body: 'black' },
  best: { '2-medium': { time: 41.3, moves: 18 }, '3-easy': { time: 28.4, moves: 14 }, '3-full': { time: 94.6, moves: 112 }, '4-easy': { time: 63.1, moves: 30 } },
  learned: ['read', 'pieces', 'cross'], pro: false, daily: {}, solves: 7, firstRun: false,
};

const SCENES = [
  {
    name: 'scan', hash: 'solve', accent: '#16a34a',
    title: 'Scan your cube', sub: 'Point the camera at each side. Misread stickers get fixed in one tap.',
    run: `await until(() => document.getElementById('solverText').textContent.includes('ready'));
          document.getElementById('demoBtn').click(); await sleep(600);`,
  },
  {
    name: 'solve', hash: 'solve', accent: '#1f5fd6',
    title: 'Every move in 3D', sub: 'About 20 moves to solved, with plain instructions for each turn.',
    run: `await until(() => document.getElementById('solverText').textContent.includes('ready'));
          document.getElementById('demoBtn').click(); await sleep(400);
          document.getElementById('solveBtn').click();
          await until(() => !document.getElementById('screen-solve').hidden);
          await sleep(800); document.getElementById('nextBtn').click(); await sleep(900);
          document.getElementById('nextBtn').click(); await sleep(1200); const top = document.querySelector('header.top').offsetHeight;
          window.scrollTo(0, document.getElementById('cube3d').getBoundingClientRect().top + scrollY - top - 12); await sleep(300);`,
  },
  {
    name: 'play', hash: 'play', accent: '#ff7a1a',
    title: 'Play 2x2 up to 7x7', sub: 'Swipe to turn. Timer, best times and a daily challenge.',
    run: `[...document.querySelectorAll('#sizePick button')].find(b => b.textContent.includes('5'))?.click();
          [...document.querySelectorAll('#diffPick button')].find(b => b.textContent.includes('Full'))?.click();
          await sleep(200); document.getElementById('playBtnStart').click(); await sleep(3500);
          document.getElementById('padToggle').click(); await sleep(200);
          for (const i of [0, 3, 7]) { document.querySelectorAll('#movePad button')[i]?.click(); await sleep(700); }
          await sleep(2200);`,
  },
  {
    name: 'learn', hash: 'learn', accent: '#ffd21f',
    title: 'Learn the method', sub: 'Step-by-step lessons for 2x2 to 5x5, with animated 3D demos.',
    run: `document.querySelectorAll('#lessonList .lesson-row')[2].click(); await sleep(800);
          document.getElementById('lessonStep')?.click(); await sleep(1200);`,
  },
  {
    name: 'shop', hash: 'shop', accent: '#d3263a',
    title: 'Make it yours', sub: 'Earn coins as you play and unlock sticker sets and cube styles.',
    run: `document.getElementById('shopMode').hidden = true; await sleep(300);`,
  },
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm' };

function serve() {
  const files = new Map();
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(req.url.split('?')[0]);
    if (files.has(path)) { res.writeHead(200, { 'content-type': files.get(path).type }); return res.end(files.get(path).body); }
    try {
      const file = path === '/' ? 'index.html' : path;
      const body = await readFile(join(WWW, file));
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok({ server, files, port: server.address().port })));
}

function findChrome() {
  const c = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
  const hit = c.find(existsSync); if (!hit) throw new Error('Chrome or Edge not found; set CHROME to its path.'); return hit;
}

async function launch() {
  const profile = join(tmpdir(), 'cube-coach-shots-' + Date.now());
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(findChrome(), ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars',
    '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/list`); const t = (await r.json()).find(x => x.type === 'page'); if (t) return { proc, profile, ws: t.webSocketDebuggerUrl }; } catch { /* starting */ }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome did not start');
}

function cdp(url) {
  const ws = new WebSocket(url); let id = 0; const wait = new Map(); const events = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { const w = wait.get(m.id); wait.delete(m.id); m.error ? w.no(new Error(m.error.message)) : w.ok(m.result); } else events.forEach(f => f(m)); };
  const send = (method, params = {}) => new Promise((ok, no) => { const i = ++id; wait.set(i, { ok, no }); ws.send(JSON.stringify({ id: i, method, params })); });
  const once = method => new Promise(ok => { const f = m => { if (m.method === method) { events.splice(events.indexOf(f), 1); ok(m.params); } }; events.push(f); });
  return new Promise(ok => ws.onopen = () => ok({ send, once, close: () => ws.close() }));
}

async function size(c, { width, height, scale }) {
  await c.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: true });
}
async function load(c, url) { const done = c.once('Page.loadEventFired'); await c.send('Page.navigate', { url }); await done; }
async function evaluate(c, body) {
  const expr = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
    const until = async (f, t = 15000) => { const s = Date.now(); while (!f()) { if (Date.now() - s > t) throw new Error('timeout'); await sleep(100); } };
    ${body} })()`;
  const r = await c.send('Runtime.evaluate', { expression: expr, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
}
async function shot(c) { const r = await c.send('Page.captureScreenshot', { format: 'png' }); return Buffer.from(r.data, 'base64'); }

function frame(scene, set) {
  const narrow = set.width / set.height > 0.5;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&family=Unbounded:wght@700&display=swap" rel="stylesheet">
<style>
  html, body { margin: 0; width: ${set.width}px; height: ${set.height}px; overflow: hidden; }
  body { background: radial-gradient(120% 60% at 50% 0%, ${scene.accent}55, transparent 60%), linear-gradient(#141920, #0b0e12);
    color: #e7ebf0; font-family: "IBM Plex Sans", sans-serif; display: flex; flex-direction: column; align-items: center; }
  .copy { padding: ${narrow ? 30 : 44}px 28px 0; text-align: center; }
  h1 { font: 700 ${narrow ? 26 : 31}px/1.15 Unbounded, sans-serif; margin: 0 0 10px; letter-spacing: -0.01em; }
  p { margin: 0 auto; font-size: ${narrow ? 14 : 16}px; line-height: 1.4; color: #b7c2d0; max-width: 330px; }
  .phone { margin-top: ${narrow ? 22 : 30}px; }
  .phone img { border-radius: ${narrow ? 24 : 36}px; border: ${narrow ? 5 : 7}px solid #232a33;
    box-shadow: 0 30px 60px rgba(0,0,0,.55), 0 0 0 1px #343d48; display: block; }
</style></head><body>
<div class="copy"><h1>${scene.title}</h1><p>${scene.sub}</p></div>
<div class="phone"><img src="/__raw.png"></div>
<script>/* fit the phone between the headline and the bottom edge */
  const img = document.querySelector('img');
  img.style.height = (innerHeight - img.getBoundingClientRect().top - ${narrow ? 28 : 44}) + 'px';</script>
</body></html>`;
}

async function main() {
  const { server, files, port } = await serve();
  const chrome = await launch();
  const c = await cdp(chrome.ws);
  await c.send('Page.enable');
  await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  const base = `http://127.0.0.1:${port}`;
  try {
    for (const [i, scene] of SCENES.entries()) {
      const tag = String(i + 1).padStart(2, '0') + '-' + scene.name;
      await size(c, PHONE);
      await load(c, base + '/');
      await evaluate(c, `localStorage.setItem('cubecoach.v1', ${JSON.stringify(JSON.stringify(PLAYER))});`);
      await load(c, `${base}/?s=${tag}#${scene.hash}`);
      await evaluate(c, `await document.fonts.ready; await sleep(800); ${scene.run}`);
      const raw = await shot(c);
      await mkdir(join(OUT, 'raw'), { recursive: true });
      await writeFile(join(OUT, 'raw', tag + '.png'), raw);
      files.set('/__raw.png', { type: 'image/png', body: raw });
      for (const set of SETS) {
        files.set('/__frame.html', { type: 'text/html', body: frame(scene, set) });
        await size(c, set);
        await load(c, base + '/__frame.html?' + tag);
        await evaluate(c, `await document.fonts.ready; await until(() => document.querySelector('img').complete); await sleep(200);`);
        await mkdir(join(OUT, set.id), { recursive: true });
        await writeFile(join(OUT, set.id, tag + '.png'), await shot(c));
      }
      console.log('done', tag);
    }
  } finally {
    c.close(); chrome.proc.kill(); server.close();
    await rm(chrome.profile, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch(e => { console.error(e); process.exit(1); });
