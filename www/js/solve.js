// Solve tab: scan (photo or live camera with auto-capture), check colors and diagnose problems,
// then a step-by-step animated solution with off-track recovery.
import * as Core from './core.js';
import * as Two from './two.js';
import { cube } from './nxn.js';
import { CubeView } from './view.js';
import { $, h, sw, cap, sleep, describeMove, COLOR_HEX } from './ui.js';
import { addCoins, toast } from './state.js';

const FACES = 'URFDLB';
const STANDARD = { U: 'white', R: 'red', F: 'green', D: 'yellow', L: 'orange', B: 'blue' };
const CODE = { white: 'W', yellow: 'Y', red: 'R', orange: 'O', blue: 'B', green: 'G' };
const NAME = Object.fromEntries(Object.entries(CODE).map(([k, v]) => [v, k]));
const OUTER = FACES.split('').flatMap(c => [c, c + "'", c + '2']);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const S = {
  N: 3, screen: 'scan', scanIdx: 0, samples: {}, thumbs: {}, rescanFace: null, edits: {},
  colors: null, rgb: null, faceColor: null, solution: [], step: 0, startColors: null,
  recovery: null, resume: null, note: '', rewarded: false, valid: false, problemMode: null,
};
const per = () => S.N * S.N;

// ---------- 3x3 solver (Kociemba two-phase via cubejs, in a worker) ----------
const CUBEJS = [new URL('../vendor/cube.js', import.meta.url).href, new URL('../vendor/solve.js', import.meta.url).href];
export const solver = { ready: false, worker: null, pending: null };
function setSolverStatus(kind, text) { const st = $('solverStatus'); if (!st) return; st.className = 'status ' + kind; $('solverText').textContent = text; }
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); }); }
async function mainThreadInit() {
  try { if (!window.Cube) await loadScript(CUBEJS[0]); if (!window.Cube.initSolver) await loadScript(CUBEJS[1]); await sleep(30); window.Cube.initSolver(); solver.ready = true; setSolverStatus('ready', 'Solver ready'); }
  catch (e) { setSolverStatus('fail', 'Solver offline'); }
  updateSolveBtn();
}
function initSolver() {
  const code = `try { importScripts(${CUBEJS.map(u => JSON.stringify(u)).join(',')}); Cube.initSolver(); postMessage({type:'ready'}); }
    catch (e) { postMessage({type:'fail'}); }
    onmessage = e => { try { postMessage({type:'solution', s: Cube.fromString(e.data).solve()}); } catch (err) { postMessage({type:'error', message: String(err)}); } };`;
  try {
    const w = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
    solver.worker = w;
    const timer = setTimeout(() => { w.terminate(); solver.worker = null; mainThreadInit(); }, 25000);
    w.onmessage = e => {
      const d = e.data;
      if (d.type === 'ready') { clearTimeout(timer); solver.ready = true; setSolverStatus('ready', 'Solver ready'); updateSolveBtn(); }
      else if (d.type === 'fail') { clearTimeout(timer); w.terminate(); solver.worker = null; mainThreadInit(); }
      else if (solver.pending) { const p = solver.pending; solver.pending = null; d.type === 'solution' ? p.res(d.s) : p.rej(new Error(d.message)); }
    };
    w.onerror = ev => { ev.preventDefault?.(); clearTimeout(timer); w.terminate(); solver.worker = null; mainThreadInit(); };
  } catch (e) { mainThreadInit(); }
}
export function solve3(str) {
  if (solver.worker) return new Promise((res, rej) => { solver.pending = { res, rej }; solver.worker.postMessage(str); });
  return new Promise((res, rej) => setTimeout(() => { try { res(window.Cube.fromString(str).solve()); } catch (e) { rej(e); } }, 20));
}

// ---------- Colors <-> letters ----------
function toLetters(colors = S.colors) {
  if (colors.some(c => !c)) return { letters: colors.map(c => c ? 'X' : '?'), faceColor: S.faceColor };
  if (S.N === 3) {
    const byColor = {}; const faceColor = {};
    [...FACES].forEach((fc, fi) => { const c = colors[fi * 9 + 4]; byColor[c] = fc; faceColor[fc] = c; });
    return { letters: colors.map(c => byColor[c] || '?'), faceColor };
  }
  const r = Two.lettersFromColors(colors);
  return r.error ? { error: r.error, bad: r.bad } : r;
}
function validateColors(colors = S.colors) {
  const t = toLetters(colors);
  if (t.error) return { res: { ok: false, type: 'corner', bad: t.bad || [], message: t.error } };
  const nameOf = l => t.faceColor?.[l] || l;
  const res = S.N === 3 ? Core.validate(t.letters, nameOf) : Two.validate(t.letters, nameOf);
  if (res.type === 'unknown') res.bad = colors.map((c, i) => c ? -1 : i).filter(i => i >= 0);
  return { res, letters: t.letters, faceColor: t.faceColor };
}
// Two stickers whose colors were most likely swapped by the reader.
function suggestSwap() {
  if (!S.rgb) return null;
  const lab = S.rgb.map(Core.rgbToLab), groups = {};
  S.colors.forEach((c, i) => (groups[c] = groups[c] || []).push(lab[i]));
  const ref = Object.fromEntries(Object.entries(groups).map(([c, ls]) => [c, [0, 1, 2].map(k => ls.reduce((s, l) => s + l[k], 0) / ls.length)]));
  const fixed = i => S.N === 3 && i % 9 === 4;
  let best = null;
  for (let i = 0; i < S.colors.length; i++) for (let j = i + 1; j < S.colors.length; j++) {
    const a = S.colors[i], b = S.colors[j];
    if (a === b || fixed(i) || fixed(j)) continue;
    const delta = Core.dist(lab[i], ref[b]) + Core.dist(lab[j], ref[a]) - Core.dist(lab[i], ref[a]) - Core.dist(lab[j], ref[b]);
    if (best && delta >= best.delta) continue;
    const t = S.colors.slice(); t[i] = b; t[j] = a;
    if (validateColors(t).res.ok) best = { i, j, delta, colors: t };
  }
  // only blame the reader when the two readings were genuinely close calls
  return best && best.delta < MISREAD_MAX ? best : null;
}
const MISREAD_MAX = 40;
const codes = colors => colors.map(c => CODE[c]).join('');
const hexes = colors => colors.map(c => COLOR_HEX[c] || null);

// ---------- Scan ----------
function steps() {
  const two = S.N === 2;
  return [
    { f: 'F', title: 'Front', how: two ? 'Hold the cube any way you like. This side faces the camera. Remember which side is on top.' : 'Hold the cube with the white center on top and the green center facing you.', facing: two ? null : 'green', edge: two ? ['top', null, 'Keep this side on top'] : ['top', 'white', 'White on top'] },
    { f: 'R', title: 'Right side', how: 'Turn the whole cube so its right side faces you (the front moves to your left). Keep the same side on top.', facing: two ? null : 'red', edge: two ? ['top', null, 'Same side on top'] : ['top', 'white', 'White on top'] },
    { f: 'B', title: 'Back', how: 'Turn the whole cube the same way again. Same side on top.', facing: two ? null : 'blue', edge: two ? ['top', null, 'Same side on top'] : ['top', 'white', 'White on top'] },
    { f: 'L', title: 'Left side', how: 'Turn it the same way once more. Same side on top.', facing: two ? null : 'orange', edge: two ? ['top', null, 'Same side on top'] : ['top', 'white', 'White on top'] },
    { f: 'U', title: 'Top', how: two ? 'Turn once more so the first side faces you, then tip the top toward you so it faces the camera. The first side must be along the bottom edge of the photo.' : 'Turn once more so green faces you, then tip the top toward you so white faces the camera. Green must be along the bottom edge of the photo.', facing: two ? null : 'white', edge: two ? ['bottom', null, 'First side at the bottom'] : ['bottom', 'green', 'Green at the bottom'] },
    { f: 'D', title: 'Bottom', how: two ? 'Roll the cube so the bottom faces the camera, with the first side along the top edge of the photo.' : 'Roll the cube so yellow faces the camera and green is along the top edge of the photo.', facing: two ? null : 'yellow', edge: two ? ['top', null, 'First side at the top'] : ['top', 'green', 'Green at the top'] },
  ];
}
const stage = { img: null, live: false, zoom: 1, ox: 0, oy: 0, size: 0, dpr: 1, last: null, spread: null };
let canvas, ctx;
const auto = { on: true, since: 0, prev: null, cooldown: 0, progress: 0, msg: '' };

function renderScanHeader() {
  const st = steps()[S.scanIdx];
  $('scanEyebrow').textContent = S.rescanFace ? 'Rescan one face' : `Face ${S.scanIdx + 1} of 6`;
  $('scanTitle').textContent = st.title;
  $('scanHow').textContent = st.how;
  const chips = $('scanChips'); chips.innerHTML = '';
  if (st.facing) chips.append(h('span', { class: 'chip' }, sw(st.facing), `${cap(st.facing)} center facing the camera`));
  chips.append(h('span', { class: 'chip' }, st.edge[1] ? sw(st.edge[1]) : h('span', { class: 'sw ghost' }), st.edge[2]));
  const t = $('thumbs'); t.innerHTML = '';
  steps().forEach((s, i) => {
    const b = h('button', { class: 'thumb' + (i === S.scanIdx ? ' current' : '') + (S.thumbs[s.f] ? ' filled' : ''), 'aria-label': `${s.title}${S.thumbs[s.f] ? ' (scanned, tap to redo)' : ''}`, onclick: () => { S.scanIdx = i; auto.prev = null; renderScanHeader(); renderStage(); } });
    if (S.thumbs[s.f]) b.append(h('img', { src: S.thumbs[s.f], alt: '' }), h('small', {}, s.f)); else b.append(s.f);
    t.append(b);
  });
  $('autoRow').hidden = !stage.live;
}
function sizeCanvas() {
  const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2), px = Math.max(1, Math.round(r.width * dpr));
  if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
  stage.size = r.width; stage.dpr = dpr;
}
function gridRect() { const S2 = stage.size, G = S2 * 0.78; return { x: (S2 - G) / 2, y: (S2 - G) / 2, g: G }; }
const srcDims = img => img.videoWidth ? [img.videoWidth, img.videoHeight] : [img.width, img.height];
function sampleCells() {
  const { x, y, g } = gridRect(), N = S.N, c = g / N, d = stage.dpr, out = [], spread = [];
  for (let r = 0; r < N; r++) for (let k = 0; k < N; k++) {
    const w = Math.max(2, Math.round(c * 0.4 * d));
    const sx = Math.round((x + k * c + c * 0.3) * d), sy = Math.round((y + r * c + c * 0.3) * d);
    const data = ctx.getImageData(sx, sy, w, w).data, px = [];
    for (let i = 0; i < data.length; i += 4) px.push([data[i], data[i + 1], data[i + 2]]);
    px.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
    const keep = px.slice(Math.floor(px.length * 0.1), Math.ceil(px.length * 0.85));
    const avg = [0, 1, 2].map(ch => keep.reduce((s, p) => s + p[ch], 0) / keep.length);
    const sd = Math.sqrt(keep.reduce((s, p) => s + [0, 1, 2].reduce((t, ch) => t + (p[ch] - avg[ch]) ** 2, 0), 0) / (keep.length * 3));
    out.push(avg.map(Math.round)); spread.push(sd);
  }
  stage.spread = spread;
  return out;
}
function renderStage() {
  if (!canvas) return;
  sizeCanvas();
  const SZ = stage.size, d = stage.dpr;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.fillStyle = '#15181c'; ctx.fillRect(0, 0, SZ, SZ);
  const img = stage.img;
  $('stageEmpty').hidden = !!img; $('zoomRow').hidden = !img; $('useBtn').disabled = !img;
  if (!img) return;
  const [w, hh] = srcDims(img); if (!w || !hh) return;
  const s = (SZ / Math.min(w, hh)) * stage.zoom, dw = w * s, dh = hh * s;
  const maxX = Math.max(0, (dw - SZ) / 2), maxY = Math.max(0, (dh - SZ) / 2);
  stage.ox = Math.max(-maxX, Math.min(maxX, stage.ox)); stage.oy = Math.max(-maxY, Math.min(maxY, stage.oy));
  ctx.drawImage(img, (SZ - dw) / 2 + stage.ox, (SZ - dh) / 2 + stage.oy, dw, dh);
  stage.last = sampleCells();
  drawGrid(stage.last);
  if (stage.live) autoCheck();
}
function drawGrid(samples) {
  const { x, y, g } = gridRect(), N = S.N, c = g / N, st = steps()[S.scanIdx], SZ = stage.size;
  ctx.save();
  ctx.fillStyle = 'rgba(10,12,15,0.45)';
  ctx.fillRect(0, 0, SZ, y); ctx.fillRect(0, y + g, SZ, SZ - y - g); ctx.fillRect(0, y, x, g); ctx.fillRect(x + g, y, SZ - x - g, g);
  ctx.strokeStyle = auto.progress > 0 ? `rgba(95,208,138,${0.5 + auto.progress / 2})` : 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
  for (let i = 0; i <= N; i++) {
    ctx.beginPath(); ctx.moveTo(x + i * c, y); ctx.lineTo(x + i * c, y + g); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + i * c); ctx.lineTo(x + g, y + i * c); ctx.stroke();
  }
  ctx.fillStyle = st.edge[1] ? COLOR_HEX[st.edge[1]] : 'rgba(255,255,255,0.75)';
  ctx.fillRect(x, st.edge[0] === 'top' ? y - 12 : y + g + 6, g, 6);
  ctx.font = '600 12px "IBM Plex Sans", system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText(st.edge[2], SZ / 2, st.edge[0] === 'top' ? y - 18 : y + g + 26);
  if (samples) samples.forEach((rgb, i) => {
    const cx = x + (i % N) * c + c / 2, cy = y + ((i / N) | 0) * c + c / 2;
    ctx.beginPath(); ctx.arc(cx, cy, Math.min(10, c * 0.12), 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${rgb.join(',')})`; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  });
  if (stage.live && auto.on) {
    if (auto.progress > 0) { ctx.fillStyle = '#5fd08a'; ctx.fillRect(x, y + g + (st.edge[0] === 'bottom' ? 34 : 8), g * auto.progress, 5); }
    if (auto.msg) { ctx.fillStyle = 'rgba(10,12,15,0.7)'; const tw = ctx.measureText(auto.msg).width + 20; ctx.fillRect(SZ / 2 - tw / 2, SZ - 34, tw, 24); ctx.fillStyle = '#fff'; ctx.fillText(auto.msg, SZ / 2, SZ - 17); }
  }
  ctx.restore();
}

// Auto-capture: when every cell holds one steady, even color and this isn't a face already scanned.
function autoCheck() {
  if (!auto.on || !stage.last) { auto.progress = 0; auto.msg = ''; return; }
  const now = performance.now();
  if (now < auto.cooldown) { auto.progress = 0; return; }
  const labs = stage.last.map(Core.rgbToLab);
  const even = stage.spread.every(sd => sd < 26) && labs.every(l => l[0] > 18); // no black frames while the camera warms up
  const st = steps()[S.scanIdx];
  const others = Object.entries(S.samples).filter(([f]) => f !== st.f).map(([, s]) => s.map(Core.rgbToLab));
  const center = S.N === 3 ? 4 : -1;
  const same = others.some(o => center >= 0 ? Core.dist(o[center], labs[center]) < 16 : o.reduce((t, l, i) => t + Core.dist(l, labs[i]), 0) / o.length < 10);
  // steady = every cell stays close to its running average (tolerates sensor noise and flicker)
  const steady = auto.prev && labs.every((l, i) => Core.dist(l, auto.prev[i]) < 12);
  auto.prev = auto.prev && steady ? auto.prev.map((p, i) => p.map((v, k) => v * 0.7 + labs[i][k] * 0.3)) : labs;
  if (!even) { auto.since = 0; auto.progress = 0; auto.msg = 'Fill the grid with one face'; return; }
  if (same) { auto.since = 0; auto.progress = 0; auto.msg = `Already scanned. Show the ${st.title.toLowerCase()}`; return; }
  if (!steady) { auto.since = 0; auto.progress = 0; auto.msg = 'Hold steady'; return; }
  if (!auto.since) auto.since = now;
  auto.progress = Math.min(1, (now - auto.since) / 700); auto.msg = 'Hold steady';
  if (auto.progress >= 1) { auto.since = 0; auto.progress = 0; auto.cooldown = now + 600; navigator.vibrate?.(35); useFace(); }
}

function useFace() {
  renderStage();
  if (!stage.last) return;
  const st = steps()[S.scanIdx];
  S.samples[st.f] = stage.last.map(c => c.slice());
  const { x, y, g } = gridRect(), d = stage.dpr;
  const tc = document.createElement('canvas'); tc.width = tc.height = 96;
  tc.getContext('2d').drawImage(canvas, x * d, y * d, g * d, g * d, 0, 0, 96, 96);
  S.thumbs[st.f] = tc.toDataURL('image/jpeg', 0.8);
  const wrap = $('stageWrap'); wrap.classList.remove('flash'); void wrap.offsetWidth; if (!reduceMotion) wrap.classList.add('flash');
  if (!stage.live) stage.img = null;
  if (S.rescanFace) { S.rescanFace = null; finishScan(true); return; }
  const next = steps().findIndex(s => !S.samples[s.f]);
  if (next < 0) { finishScan(false); return; }
  S.scanIdx = next; auto.prev = null; renderScanHeader(); renderStage();
}

async function loadImage(file) {
  const url = URL.createObjectURL(file);
  const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const m = 1400, sc = Math.min(1, m / Math.max(im.width, im.height));
  const cv = document.createElement('canvas'); cv.width = Math.round(im.width * sc); cv.height = Math.round(im.height * sc);
  cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url); return cv;
}

// live camera
let stream = null, raf = 0, video = null, preferLive = false;
const liveSupported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && window.isSecureContext;
async function startLive() {
  if (stage.live) return;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
    if (!video) { video = h('video', { class: 'cam-video', playsinline: true, muted: true, autoplay: true }); video.muted = true; document.body.append(video); }
    video.srcObject = stream; await video.play();
    stage.img = video; stage.live = true; stage.zoom = 1; stage.ox = stage.oy = 0; $('zoom').value = 1;
    preferLive = true; auto.prev = null;
    $('liveBtn').textContent = 'Stop camera'; $('liveBtn').classList.remove('primary'); $('liveNote').hidden = true; $('autoRow').hidden = false;
    let n = 0; const loop = () => { if (!stage.live) return; if (n++ % 2 === 0) renderStage(); raf = requestAnimationFrame(loop); }; loop();
  } catch (err) {
    stopLive();
    $('liveNote').hidden = false;
    $('liveNote').textContent = err && err.name === 'NotAllowedError'
      ? 'Camera access was blocked. Allow it for this app in your settings and tap Start camera again, or use Take photo.'
      : 'The camera couldn’t start here. Use Take photo instead.';
  }
}
function stopLive() {
  stage.live = false; cancelAnimationFrame(raf);
  if (stream) stream.getTracks().forEach(t => t.stop()); stream = null;
  if (video) video.srcObject = null;
  if (stage.img && stage.img.tagName === 'VIDEO') stage.img = null;
  if ($('liveBtn')) { $('liveBtn').textContent = 'Start camera'; if (liveSupported()) $('liveBtn').classList.add('primary'); }
  if ($('autoRow')) $('autoRow').hidden = true;
}
export function pause() { stopLive(); solveView?.stopBlink(); fixView?.stopBlink(); }
export function resume() { if (S.screen === 'scan') { renderStage(); if (preferLive && !stage.img) startLive(); } }

function finishScan(single) {
  stopLive();
  const rgb = []; for (const fc of FACES) rgb.push(...S.samples[fc]);
  let colors;
  if (S.N === 3) {
    const faceColor = Core.nameColors(FACES.split('').map(fc => S.samples[fc][4]));
    colors = [...Core.classify(rgb)].map(l => faceColor[l]);
  } else colors = Two.classify(rgb);
  if (single) for (const [i, c] of Object.entries(S.edits)) colors[i] = c; else S.edits = {};
  S.colors = colors; S.rgb = rgb; S.solution = []; S.problemMode = null;
  const { res } = validateColors();
  if (res.ok && (S.N === 2 || solver.ready)) runSolve();
  else { renderNet(); show('check'); }
}

function resetScan(keepResume) {
  S.samples = {}; S.thumbs = {}; S.scanIdx = 0; S.rescanFace = null; S.edits = {}; stage.img = null; auto.prev = null;
  if (!keepResume) S.resume = null;
}

// ---------- Check ----------
let paint = null;
const NET_POS = { U: [1, 0], L: [0, 1], F: [1, 1], R: [2, 1], B: [3, 1], D: [1, 2] };
function renderNet() {
  const N = S.N, net = $('net'); net.innerHTML = '';
  net.style.gridTemplateColumns = `repeat(${4 * N}, 1fr)`;
  [...FACES].forEach((fc, fi) => {
    const [cx, cy] = NET_POS[fc];
    for (let k = 0; k < N * N; k++) {
      const i = fi * N * N + k, center = N === 3 && k === 4;
      const b = h('button', { class: 'st' + (center ? ' center' : ''), 'data-i': i, style: `grid-column:${cx * N + (k % N) + 1};grid-row:${cy * N + ((k / N) | 0) + 1}` });
      if (center) b.disabled = true;
      b.onclick = () => {
        if (!paint) { const v = $('verdict'); v.className = 'verdict err'; v.textContent = 'Pick a color below first, then tap the stickers to paint.'; setTimeout(updateNet, 1800); return; }
        S.colors[i] = paint; S.edits[i] = paint; S.solution = []; S.problemMode = null; updateNet();
      };
      net.append(b);
    }
  });
  const pal = $('palette'); pal.innerHTML = '';
  for (const c of Core.COLOR_NAMES) {
    const b = h('button', { style: `background:${COLOR_HEX[c]}`, 'aria-label': 'Paint ' + c, 'aria-pressed': paint === c ? 'true' : 'false' });
    b.onclick = () => { paint = paint === c ? null : c; [...pal.children].forEach((x, j) => x.setAttribute('aria-pressed', Core.COLOR_NAMES[j] === paint ? 'true' : 'false')); };
    pal.append(b);
  }
  updateNet();
}
function updateNet() {
  const { res } = validateColors();
  [...$('net').querySelectorAll('.st')].forEach(b => {
    const i = +b.dataset.i, c = S.colors[i];
    b.style.background = c ? COLOR_HEX[c] : 'var(--c-none)';
    b.classList.toggle('unknown', !c); b.classList.toggle('bad', res.bad.includes(i));
    b.setAttribute('aria-label', `${FACES[(i / per()) | 0]} sticker ${i % per() + 1}: ${c || 'unknown'}`);
  });
  const v = $('verdict');
  v.className = 'verdict ' + (res.ok ? 'ok' : 'err');
  v.textContent = res.ok ? 'This is a real, solvable cube.' : res.message;
  S.valid = res.ok;
  updateSolveBtn();
  renderProblem(res);
}
function updateSolveBtn() {
  const b = $('solveBtn'); if (!b) return;
  const need = S.N === 3 && !solver.ready;
  b.disabled = !S.valid || need;
  b.textContent = need && S.valid ? 'Preparing solver…' : 'Solve';
}

// Problem panel: likely misread pair, physical repair (with animation), or suspects to recheck.
let fixView = null;
function ensureFixView() {
  const el = $('fixCube');
  if (!fixView) fixView = new CubeView(el, { N: S.N });
  else if (fixView.N !== S.N) fixView.setSize(S.N);
  fixView.resetView();
  return fixView;
}
function renderProblem(res) {
  const panel = $('problem');
  fixView?.stopBlink();
  if (res.ok || res.type === 'unknown') { panel.hidden = true; return; }
  panel.hidden = false;
  const body = $('problemBody'); body.innerHTML = '';
  const actions = $('problemActions'); actions.innerHTML = '';
  const view = ensureFixView(); view.setColors(hexes(S.colors));
  const sg = S.problemMode === 'physical' ? null : suggestSwap();
  const { letters, faceColor } = validateColors();
  const physical = ['twist', 'flip', 'parity'].includes(res.type) && letters ? (S.N === 3 ? Core.physicalFix(letters) : Two.physicalFix(letters)) : null;
  const where = i => { const f = FACES[(i / per()) | 0]; return { U: 'top', D: 'bottom', F: 'front', B: 'back', L: 'left', R: 'right' }[f] + ' face'; };

  if (sg) {
    $('problemTitle').textContent = 'Two stickers were probably misread';
    const a = S.colors[sg.i], b = S.colors[sg.j];
    body.append(
      h('p', {}, 'Swapping these two makes a real, solvable cube. They’re flashing on the cube and outlined above.'),
      h('ul', { class: 'fixlist' },
        h('li', {}, 'On the ', where(sg.i), ': reads ', sw(a), ` ${a}, probably `, sw(b), ` ${b}`),
        h('li', {}, 'On the ', where(sg.j), ': reads ', sw(b), ` ${b}, probably `, sw(a), ` ${a}`)));
    view.blink([sg.i, sg.j]);
    [...$('net').querySelectorAll('.st')].forEach(x => { if (+x.dataset.i === sg.i || +x.dataset.i === sg.j) x.classList.add('bad'); });
    actions.append(
      h('button', { class: 'btn primary grow', onclick: () => { S.colors = sg.colors; S.edits[sg.i] = sg.colors[sg.i]; S.edits[sg.j] = sg.colors[sg.j]; updateNet(); } }, 'Fix these two'),
      h('button', { class: 'btn grow', onclick: () => { S.problemMode = 'physical'; updateNet(); } }, 'They’re right'));
    return;
  }
  if (physical) {
    const st = physical.stickers.map(i => S.colors[i]);
    let title, steps, cta;
    if (physical.kind === 'twist') {
      title = 'A corner is twisted';
      const dir = physical.sign > 0 ? 'counterclockwise' : 'clockwise';
      steps = [
        'First compare the colors above with your cube. If they match, the cube itself has a twisted corner (it happens when a corner gets knocked).',
        h('span', {}, 'Hold the cube the way you scanned it. Grip the top-front-right corner: ', sw(st[0]), ` ${st[0]} on top, `, sw(st[2]), ` ${st[2]} on the front, `, sw(st[1]), ` ${st[1]} on the right.`),
        `Twist it ${dir} by a third of a turn, as if you were looking straight at that corner, until it clicks. If it won’t twist, turn the top layer 45°, pop the corner out and put it back rotated.` ];
      cta = 'I’ve twisted it';
    } else if (physical.kind === 'flip') {
      title = 'An edge is flipped';
      steps = [
        'First compare the colors above with your cube. If they match, one edge was put back upside down.',
        h('span', {}, 'Turn the top layer 45°. Pry out the top-front edge (', sw(st[0]), ` ${st[0]} and `, sw(st[1]), ` ${st[1]}), flip it over and press it back in.`),
        'Turn the top layer back.' ];
      cta = 'I’ve flipped it';
    } else {
      title = 'Two pieces are swapped';
      steps = [
        'First compare the colors above with your cube. If they match, the cube was put back together with two pieces swapped.',
        h('span', {}, 'Turn the top layer 45° and pop out the top-front edge (', sw(st[0]), ' ', sw(st[1]), ') and the top-right edge (', sw(st[2]), ' ', sw(st[3]), ').'),
        'Swap their places, keeping the top stickers on top, and turn the top layer back.' ];
      cta = 'I’ve swapped them';
    }
    $('problemTitle').textContent = title;
    body.append(h('ol', { class: 'fixlist' }, steps.map(s => h('li', {}, s))));
    const play = async () => { view.setColors(hexes(S.colors)); await sleep(200); await view.animateFix(physical.kind, physical.sign); view.setColors(hexes(physical.state.map(l => faceColor[l]))); };
    play();
    actions.append(
      h('button', { class: 'btn grow', onclick: play }, 'Show again'),
      h('button', { class: 'btn primary grow', onclick: () => { S.colors = physical.state.map(l => faceColor[l]); S.problemMode = null; updateNet(); toast('Fixed. The cube is solvable now.'); } }, cta));
    return;
  }
  $('problemTitle').textContent = 'Some stickers look misread';
  body.append(h('p', {}, res.message), h('p', { class: 'muted small' }, 'The flashing stickers are the suspects. Compare them with your cube and paint the right color, or rescan that face.'));
  view.blink(res.bad);
  if (Object.keys(S.samples).length === 6) {
    const faces = [...new Set(res.bad.map(i => FACES[(i / per()) | 0]))];
    faces.forEach(fc => actions.append(h('button', { class: 'btn grow', onclick: () => { S.rescanFace = fc; S.scanIdx = steps().findIndex(s => s.f === fc); show('scan'); } }, `Rescan ${steps().find(s => s.f === fc).title.toLowerCase()}`)));
  }
}

// ---------- Solve ----------
let solveView = null;
function ensureSolveView() {
  if (!solveView) solveView = new CubeView($('cube3d'), { N: S.N });
  else if (solveView.N !== S.N) solveView.setSize(S.N);
  return solveView;
}
const model = () => cube(S.N);
const colorsAt = k => model().applyArr(S.startColors, S.solution.slice(0, k));

async function runSolve() {
  const { res, letters } = validateColors();
  if (!res.ok) { renderNet(); show('check'); return; }
  const b = $('solveBtn'); if (b) { b.disabled = true; b.textContent = 'Solving…'; }
  S.note = '';
  if (S.resume) {
    const r = S.resume; S.resume = null;
    const app = (s, mv) => cube(S.N).apply(s, mv);
    const d = Core.diagnose(codes(r.startColors), r.solution, codes(S.colors), r.step, app, OUTER);
    if (d) {
      S.startColors = r.startColors; S.solution = r.solution; S.step = d.step; S.rewarded = r.rewarded;
      S.recovery = d.kind === 'wrongMove' ? { colors: S.colors.slice(), ...d } : null;
      if (d.kind === 'onStep') toast(`You’re on track: move ${Math.min(d.step + 1, r.solution.length)} of ${r.solution.length}`);
      show('solve'); renderSolve(true); updateSolveBtn(); return;
    }
    S.note = 'Your cube didn’t match the plan, so this is a fresh solution from where it is now.';
  }
  try {
    const str = letters.join('');
    const moves = S.N === 3 ? Core.parse(await solve3(str)) : Two.solve(letters);
    if (!cube(S.N).isSolved(cube(S.N).apply(str, moves))) throw new Error('check failed');
    S.solution = moves; S.startColors = S.colors.slice(); S.step = 0; S.recovery = null; S.rewarded = false;
    show('solve'); renderSolve(true);
  } catch (e) {
    renderNet(); show('check');
    const v = $('verdict'); v.className = 'verdict err'; v.textContent = 'The solver couldn’t solve this. Re-check the colors and try again.';
  }
  updateSolveBtn();
}

let playing = false;
function renderSolve(resetCube) {
  const view = ensureSolveView();
  const n = S.solution.length, k = S.step, rec = S.recovery;
  const hold = $('holdNote'); hold.innerHTML = '';
  if (S.note) hold.append(h('p', { class: 'note' }, S.note));
  if (S.N === 3) {
    const fc = toLetters(S.startColors).faceColor;
    hold.append(h('p', {}, 'Keep ', sw(fc.F), ` ${fc.F} facing you and `, sw(fc.U), ` ${fc.U} on top the whole time. Do each move, then tap Done, next.`));
  } else hold.append(h('p', {}, 'Hold the cube exactly the way you scanned it (same front, same top). Do each move, then tap Done, next.'));
  $('recovery').hidden = !rec;
  $('mainPlayer').hidden = !!rec;
  const colorOf = f => S.N === 3 ? toLetters(S.startColors).faceColor[f] : null;
  if (rec) {
    if (resetCube) view.setColors(hexes(rec.colors));
    const d = describeMove(rec.undo, colorOf);
    $('recNotation').textContent = rec.undo;
    $('recText').innerHTML = '';
    $('recText').append(h('div', {}, `It looks like you turned ${rec.did} instead of ${rec.expected}. Undo it:`), h('div', { class: 'strong' }, d.action));
    return;
  }
  if (resetCube) view.setColors(hexes(colorsAt(k)));
  $('progress').textContent = n ? `Move ${Math.min(k + 1, n)} of ${n}` : 'No moves needed';
  $('barFill').style.width = (n ? (k / n) * 100 : 100) + '%';
  const done = k >= n;
  $('notation').textContent = done ? '✓' : S.solution[k];
  const mt = $('moveText'); mt.innerHTML = '';
  if (done) {
    mt.append(h('div', { class: 'solved-banner' }, 'Solved'), h('div', { class: 'small muted' }, 'Every face should now be one color.'));
    if (!S.rewarded && n) { S.rewarded = true; addCoins(30, 'Solved with the coach'); }
  } else {
    const d = describeMove(S.solution[k], colorOf);
    mt.append(h('div', {}, d.action), d.note ? h('div', { class: 'small muted' }, d.color ? sw(d.color) : '', ' ', d.note) : '');
  }
  $('prevBtn').disabled = k === 0 || view.busy;
  $('nextBtn').disabled = done || view.busy;
  $('showBtn').hidden = done;
  $('playBtn').textContent = playing ? 'Pause' : 'Play all';
  $('playBtn').disabled = done && !playing;
  const ml = $('moves'); ml.innerHTML = '';
  S.solution.forEach((m, i) => ml.append(h('button', { class: i < k ? 'past' : i === k ? 'now' : '', 'aria-label': `Jump to move ${i + 1}: ${m}`, onclick: () => { if (view.busy) return; playing = false; S.step = i; renderSolve(true); } }, m)));
}
async function next() {
  if (solveView.busy || S.step >= S.solution.length) return;
  await solveView.animate(S.solution[S.step]);
  S.step++; solveView.setColors(hexes(colorsAt(S.step))); renderSolve(false);
}
async function prev() {
  if (solveView.busy || S.step === 0) return;
  await solveView.animate(cube(S.N).invert(S.solution[S.step - 1]));
  S.step--; solveView.setColors(hexes(colorsAt(S.step))); renderSolve(false);
}

// ---------- Navigation inside the tab ----------
function show(screen) {
  S.screen = screen;
  for (const s of ['scan', 'check', 'solve']) {
    $('screen-' + s).hidden = s !== screen;
    const b = $('nav-' + s);
    if (s === screen) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  }
  $('nav-scan').classList.toggle('done', !!S.colors && screen !== 'scan');
  $('nav-check').disabled = !S.colors;
  $('nav-check').classList.toggle('done', screen === 'solve');
  $('nav-solve').disabled = !S.solution.length && screen !== 'solve';
  if (screen !== 'scan') stopLive();
  if (screen !== 'check') fixView?.stopBlink();
  if (screen === 'scan') { renderScanHeader(); renderStage(); if (preferLive && !stage.img) startLive(); }
  if (screen === 'solve') { ensureSolveView().resize(); }
  window.scrollTo({ top: 0 });
}

function setSize(N) {
  if (S.N === N) return;
  stopLive(); S.N = N; S.colors = null; S.rgb = null; S.solution = []; S.recovery = null; resetScan(); paint = null;
  document.querySelectorAll('#sizeToggle button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.n === N ? 'true' : 'false'));
  show('scan');
}

export function initSolve() {
  canvas = $('stage'); ctx = canvas.getContext('2d', { willReadFrequently: true });
  document.querySelectorAll('#sizeToggle button').forEach(b => b.onclick = () => setSize(+b.dataset.n));
  $('nav-scan').onclick = () => show('scan');
  $('nav-check').onclick = () => { if (S.colors) { renderNet(); show('check'); } };
  $('nav-solve').onclick = () => { if (S.solution.length) { show('solve'); renderSolve(true); } };

  $('photoInput').addEventListener('click', () => { preferLive = false; });
  $('photoInput').addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0]; e.target.value = '';
    if (!file) return;
    stopLive(); stage.img = await loadImage(file); stage.zoom = 1; stage.ox = 0; stage.oy = 0; $('zoom').value = 1; renderStage();
  });
  $('zoom').addEventListener('input', e => { stage.zoom = +e.target.value; renderStage(); });
  const pointers = new Map(); let pinch = null;
  canvas.addEventListener('pointerdown', e => { if (!stage.img) return; canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, [e.clientX, e.clientY]); if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: stage.zoom }; } });
  canvas.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    const p = pointers.get(e.pointerId); pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size === 2 && pinch) { const [a, b] = [...pointers.values()]; stage.zoom = Math.max(1, Math.min(4, pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)); $('zoom').value = stage.zoom; }
    else if (!stage.live) { stage.ox += e.clientX - p[0]; stage.oy += e.clientY - p[1]; }
    renderStage();
  });
  const endPtr = e => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; };
  canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);

  if (liveSupported()) { $('liveBtn').hidden = false; $('liveBtn').classList.add('primary'); $('emptyTitle').textContent = 'Start the camera or take a photo'; }
  $('liveBtn').onclick = () => { if (stage.live) { preferLive = false; stopLive(); stage.img = null; renderStage(); } else startLive(); };
  $('autoToggle').addEventListener('change', e => { auto.on = e.target.checked; auto.since = 0; auto.progress = 0; });
  document.addEventListener('visibilitychange', () => { if (document.hidden && stage.live) stopLive(); else if (!document.hidden && preferLive && S.screen === 'scan' && !stage.img && !$('tab-solve').hidden) startLive(); });
  $('useBtn').onclick = useFace;

  $('manualBtn').onclick = () => {
    S.colors = Array.from({ length: 6 * per() }, (_, i) => S.N === 3 && i % 9 === 4 ? STANDARD[FACES[(i / 9) | 0]] : null);
    S.rgb = null; S.solution = []; resetScan(); renderNet(); show('check');
  };
  $('demoBtn').onclick = () => {
    const m = model(); const sc = S.N === 3 ? m.scramble(25) : Array.from({ length: 12 }, () => Two.MOVES[(Math.random() * 9) | 0]);
    S.colors = [...m.apply(m.solved, sc)].map(l => STANDARD[l]);
    S.rgb = null; S.solution = []; resetScan(); renderNet(); show('check');
  };
  $('rescanBtn').onclick = () => { resetScan(); show('scan'); };
  $('solveBtn').onclick = runSolve;

  $('nextBtn').onclick = () => { playing = false; next(); };
  $('prevBtn').onclick = () => { playing = false; prev(); };
  $('showBtn').onclick = async () => {
    if (solveView.busy || S.step >= S.solution.length) return;
    await solveView.animate(S.solution[S.step]); solveView.setColors(hexes(colorsAt(S.step + 1)));
    await sleep(450); solveView.setColors(hexes(colorsAt(S.step)));
  };
  $('playBtn').onclick = async () => {
    if (playing) { playing = false; renderSolve(false); return; }
    playing = true; renderSolve(false);
    while (playing && S.step < S.solution.length) { await next(); await sleep(300); }
    playing = false; renderSolve(false);
  };
  $('resetView').onclick = () => solveView?.resetView();
  $('offTrackBtn').onclick = () => {
    S.resume = { startColors: S.startColors, solution: S.solution, step: S.step, rewarded: S.rewarded };
    resetScan(true); show('scan'); toast('Rescan your cube the same way as before');
  };
  $('recShow').onclick = async () => {
    const rec = S.recovery; if (!rec || solveView.busy) return;
    solveView.setColors(hexes(rec.colors)); await solveView.animate(rec.undo);
    solveView.setColors(hexes(cube(S.N).applyArr(rec.colors, [rec.undo]))); await sleep(500); solveView.setColors(hexes(rec.colors));
  };
  $('recDone').onclick = () => { S.recovery = null; renderSolve(true); toast('Back on track'); };

  window.addEventListener('resize', () => { if (S.screen === 'scan') renderStage(); });
  renderScanHeader();
  requestAnimationFrame(renderStage);
  initSolver();
}

// test hooks
window.cubeCoach = { S, stage, solver, useFace, renderStage, steps, finishScan };
