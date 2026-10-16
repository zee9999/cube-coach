// 3x3 facelet logic: moves, validation, color classification, problem diagnosis.
// Facelet order is U R F D L B, 9 stickers each, row-major (Kociemba convention).

export const FACES = 'URFDLB';
const f = (face, n) => FACES.indexOf(face) * 9 + n - 1;

export const CORNERS = [
  [f('U',9), f('R',1), f('F',3)], [f('U',7), f('F',1), f('L',3)], [f('U',1), f('L',1), f('B',3)], [f('U',3), f('B',1), f('R',3)],
  [f('D',3), f('F',9), f('R',7)], [f('D',1), f('L',9), f('F',7)], [f('D',7), f('B',9), f('L',7)], [f('D',9), f('R',9), f('B',7)]
];
const CORNER_COLORS = ['URF','UFL','ULB','UBR','DFR','DLF','DBL','DRB'];
export const EDGES = [
  [f('U',6), f('R',2)], [f('U',8), f('F',2)], [f('U',4), f('L',2)], [f('U',2), f('B',2)],
  [f('D',6), f('R',8)], [f('D',2), f('F',8)], [f('D',4), f('L',8)], [f('D',8), f('B',8)],
  [f('F',6), f('R',4)], [f('F',4), f('L',6)], [f('B',6), f('L',4)], [f('B',4), f('R',6)]
];
const EDGE_COLORS = ['UR','UF','UL','UB','DR','DF','DL','DB','FR','FL','BL','BR'];
export const AXIS = { U:[0,1,0], D:[0,-1,0], R:[1,0,0], L:[-1,0,0], F:[0,0,1], B:[0,0,-1] };
export const SOLVED = FACES.split('').map(c => c.repeat(9)).join('');

// x = right, y = up, z = toward the viewer.
function geom(i) {
  const face = FACES[(i / 9) | 0], k = i % 9, r = (k / 3) | 0, c = k % 3;
  switch (face) {
    case 'U': return { p: [c - 1, 1, r - 1], n: [0, 1, 0] };
    case 'D': return { p: [c - 1, -1, 1 - r], n: [0, -1, 0] };
    case 'F': return { p: [c - 1, 1 - r, 1], n: [0, 0, 1] };
    case 'B': return { p: [1 - c, 1 - r, -1], n: [0, 0, -1] };
    case 'R': return { p: [1, 1 - r, 1 - c], n: [1, 0, 0] };
    case 'L': return { p: [-1, 1 - r, c - 1], n: [-1, 0, 0] };
  }
}
export const GEOM = Array.from({ length: 54 }, (_, i) => geom(i));
const key = (p, n) => p.join(',') + '|' + n.join(',');
const INDEX = new Map(GEOM.map((g, i) => [key(g.p, g.n), i]));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function rotQ(v, n) {
  const cx = [n[1] * v[2] - n[2] * v[1], n[2] * v[0] - n[0] * v[2], n[0] * v[1] - n[1] * v[0]];
  const d = dot(n, v);
  return [-cx[0] + n[0] * d, -cx[1] + n[1] * d, -cx[2] + n[2] * d];
}
export const PERM = {};
const compose = (a, b) => a.map(i => b[i]);
function addMove(name, n, all) {
  const q = Array.from({ length: 54 }, (_, i) => i);
  GEOM.forEach((g, i) => { if (all || dot(g.p, n) === 1) q[INDEX.get(key(rotQ(g.p, n), rotQ(g.n, n)))] = i; });
  PERM[name] = q; PERM[name + '2'] = compose(q, q); PERM[name + "'"] = compose(compose(q, q), q);
}
for (const face of FACES) addMove(face, AXIS[face], false);
addMove('x', AXIS.R, true); addMove('y', AXIS.U, true); addMove('z', AXIS.F, true);
export const FACE_MOVES = FACES.split('').flatMap(c => [c, c + "'", c + '2']);

export const parse = s => Array.isArray(s) ? s : (s || '').trim().split(/\s+/).filter(Boolean);
export function applyArr(arr, moves) {
  let s = arr.slice();
  for (const m of parse(moves)) { const p = PERM[m]; if (!p) throw new Error('Unknown move ' + m); s = p.map(i => s[i]); }
  return s;
}
export const apply = (state, moves) => applyArr(state.split(''), moves).join('');
export const invert = m => m.length === 1 ? m + "'" : m[1] === '2' ? m : m[0];
export const invertAlg = moves => parse(moves).slice().reverse().map(invert);

function parity(perm) {
  let swaps = 0; const seen = new Array(perm.length).fill(false);
  for (let i = 0; i < perm.length; i++) {
    if (seen[i]) continue; let len = 0, j = i;
    while (!seen[j]) { seen[j] = true; j = perm[j]; len++; }
    swaps += len - 1;
  }
  return swaps % 2;
}

// Validates a 54-entry facelet array ('?' or null = unknown). Returns {ok, type, message, bad}.
export function validate(arr, nameOf) {
  const name = c => nameOf ? nameOf(c) : c;
  const s = Array.isArray(arr) ? arr : arr.split('');
  const unknown = s.map((c, i) => FACES.includes(c) ? -1 : i).filter(i => i >= 0);
  if (unknown.length) return { ok: false, type: 'unknown', bad: unknown, message: `${unknown.length} sticker${unknown.length > 1 ? 's' : ''} still need${unknown.length > 1 ? '' : 's'} a color.` };
  const counts = {}; for (const c of FACES) counts[c] = 0; s.forEach(c => counts[c]++);
  const off = FACES.split('').filter(c => counts[c] !== 9);
  if (off.length) {
    const bad = s.map((c, i) => counts[c] > 9 && i % 9 !== 4 ? i : -1).filter(i => i >= 0);
    return { ok: false, type: 'count', bad, message: `Each color needs exactly 9 stickers. Right now there are ${off.map(c => `${counts[c]} ${name(c)}`).join(', ')}.` };
  }
  const cp = [], co = [], usedC = {};
  for (let i = 0; i < 8; i++) {
    const cols = CORNERS[i].map(k => s[k]);
    const ori = cols.findIndex(c => c === 'U' || c === 'D');
    const desc = cols.map(name).join(', ');
    if (ori < 0) return { ok: false, type: 'corner', bad: CORNERS[i], message: `The corner with ${desc} has no ${name('U')} or ${name('D')} sticker. Every corner has one, so one of these is misread.` };
    const c1 = cols[(ori + 1) % 3], c2 = cols[(ori + 2) % 3];
    const j = CORNER_COLORS.findIndex(cc => cc[0] === cols[ori] && cc[1] === c1 && cc[2] === c2);
    if (j < 0) return { ok: false, type: 'corner', bad: CORNERS[i], message: `The corner with ${desc} can't exist on a real cube. One of its stickers is misread.` };
    if (usedC[j] !== undefined) return { ok: false, type: 'cornerDup', bad: [...CORNERS[i], ...CORNERS[usedC[j]]], message: `Two corners both read as ${desc}. One of them is misread.` };
    usedC[j] = i; cp[i] = j; co[i] = ori;
  }
  const ep = [], eo = [], usedE = {};
  for (let i = 0; i < 12; i++) {
    const cols = EDGES[i].map(k => s[k]);
    const desc = cols.map(name).join(' and ');
    let j = EDGE_COLORS.findIndex(e => e[0] === cols[0] && e[1] === cols[1]), o = 0;
    if (j < 0) { j = EDGE_COLORS.findIndex(e => e[1] === cols[0] && e[0] === cols[1]); o = 1; }
    if (j < 0) return { ok: false, type: 'edge', bad: EDGES[i], message: `The edge with ${desc} can't exist on a real cube. One of its stickers is misread.` };
    if (usedE[j] !== undefined) return { ok: false, type: 'edgeDup', bad: [...EDGES[i], ...EDGES[usedE[j]]], message: `Two edges both read as ${desc}. One of them is misread.` };
    usedE[j] = i; ep[i] = j; eo[i] = o;
  }
  if (co.reduce((a, b) => a + b, 0) % 3) return { ok: false, type: 'twist', bad: [], message: 'One corner is twisted in place. Turning the cube can never do that.' };
  if (eo.reduce((a, b) => a + b, 0) % 2) return { ok: false, type: 'flip', bad: [], message: 'One edge is flipped in place. Turning the cube can never do that.' };
  if (parity(cp) !== parity(ep)) return { ok: false, type: 'parity', bad: [], message: 'Two pieces are swapped. Turning the cube can never do that.' };
  return { ok: true, type: 'ok', bad: [], message: '' };
}

// Physical repair for a cube that was reassembled wrong. Returns the repaired state and
// what to animate, or null when the problem is not a physical one.
export function physicalFix(s) {
  const v = validate(s);
  if (v.type === 'twist') {
    const [u, r, fr] = CORNERS[0]; // top-front-right corner: U9, R1, F3
    for (const sign of [1, -1]) {
      const t = s.slice();
      if (sign === 1) { t[u] = s[r]; t[fr] = s[u]; t[r] = s[fr]; } else { t[r] = s[u]; t[u] = s[fr]; t[fr] = s[r]; }
      if (validate(t).type !== 'twist') return { kind: 'twist', sign, state: t, stickers: CORNERS[0] };
    }
  }
  if (v.type === 'flip') {
    const [a, b] = EDGES[1]; const t = s.slice(); t[a] = s[b]; t[b] = s[a];
    return { kind: 'flip', state: t, stickers: EDGES[1] };
  }
  if (v.type === 'parity') {
    const [u8, f2] = EDGES[1], [u6, r2] = EDGES[0]; const t = s.slice();
    t[u8] = s[u6]; t[f2] = s[r2]; t[u6] = s[u8]; t[r2] = s[f2];
    return { kind: 'swap', state: t, stickers: [...EDGES[1], ...EDGES[0]] };
  }
  return null;
}

// ---- Color handling ----
export function rgbToLab([r, g, b]) {
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const R = lin(r), G = lin(g), B = lin(b);
  let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let Y = (R * 0.2126 + G * 0.7152 + B * 0.0722);
  let Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const fx = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  X = fx(X); Y = fx(Y); Z = fx(Z);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
export const dist = (a, b) => Math.hypot((a[0] - b[0]) * 0.6, a[1] - b[1], a[2] - b[2]);

// Min-cost square assignment. Returns ans[row] = column.
export function hungarian(a) {
  const n = a.length, INF = 1e18;
  const u = new Array(n + 1).fill(0), v = new Array(n + 1).fill(0), p = new Array(n + 1).fill(0), way = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0;
    const minv = new Array(n + 1).fill(INF), used = new Array(n + 1).fill(false);
    do {
      used[j0] = true; const i0 = p[j0]; let delta = INF, j1 = 0;
      for (let j = 1; j <= n; j++) if (!used[j]) {
        const cur = a[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= n; j++) { if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta; }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const ans = new Array(n);
  for (let j = 1; j <= n; j++) ans[p[j] - 1] = j - 1;
  return ans;
}

// rgb: 54 samples in facelet order. Centers are the color references; exactly 9 per color.
export function classify(rgb) {
  const lab = rgb.map(rgbToLab);
  const ref = [0, 1, 2, 3, 4, 5].map(fi => lab[fi * 9 + 4]);
  const cost = lab.map((l, i) => Array.from({ length: 54 }, (_, slot) => {
    const fi = (slot / 9) | 0;
    if (i % 9 === 4) return ((i / 9) | 0) === fi ? 0 : 1e6;
    return dist(l, ref[fi]);
  }));
  return hungarian(cost).map(slot => FACES[(slot / 9) | 0]).join('');
}

// When a scanned cube is invalid, finds the two stickers whose colors most likely got swapped
// by the reader (swapping them makes the cube valid at the smallest color-distance cost).
export function suggestSwap(state, rgb) {
  const lab = rgb.map(rgbToLab);
  const ref = {}; [...FACES].forEach((c, fi) => ref[c] = lab[fi * 9 + 4]);
  let best = null;
  for (let i = 0; i < 54; i++) for (let j = i + 1; j < 54; j++) {
    if (i % 9 === 4 || j % 9 === 4 || state[i] === state[j]) continue;
    const delta = dist(lab[i], ref[state[j]]) + dist(lab[j], ref[state[i]]) - dist(lab[i], ref[state[i]]) - dist(lab[j], ref[state[j]]);
    if (best && delta >= best.delta) continue;
    const t = state.slice(); t[i] = state[j]; t[j] = state[i];
    if (validate(t).ok) best = { i, j, delta, state: t };
  }
  return best;
}

export const COLOR_NAMES = ['white', 'yellow', 'red', 'orange', 'blue', 'green'];
const TYPICAL = { white: [225, 228, 222], yellow: [225, 205, 45], red: [175, 30, 42], orange: [235, 105, 30], blue: [25, 75, 185], green: [25, 150, 80] };
export const TYPICAL_LAB = Object.fromEntries(Object.entries(TYPICAL).map(([k, v]) => [k, rgbToLab(v)]));
// Names six color samples (one per face). Returns {U:'white', ...} for the given face letters.
export function nameColors(samples, letters = FACES) {
  const cost = samples.map(rgbToLab).map(l => COLOR_NAMES.map(n => dist(l, TYPICAL_LAB[n])));
  const ans = hungarian(cost); const out = {};
  [...letters].forEach((fc, i) => out[fc] = COLOR_NAMES[ans[i]]);
  return out;
}

// Works out where a rescanned cube is relative to a solution in progress.
// applyFn(state, moves) must apply moves for the cube size in use.
export function diagnose(start, solution, current, step, applyFn, moveSet) {
  const states = [start];
  for (let k = 0; k < solution.length; k++) states.push(applyFn(states[k], [solution[k]]));
  const order = states.map((_, k) => k).sort((a, b) => Math.abs(a - step) - Math.abs(b - step));
  for (const k of order) if (states[k] === current) return { kind: 'onStep', step: k };
  for (const k of order) for (const m of moveSet) {
    if (applyFn(states[k], [m]) === current) return { kind: 'wrongMove', step: k, did: m, undo: invert(m), expected: solution[k] };
  }
  return null;
}
