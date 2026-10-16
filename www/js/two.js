// 2x2 support: color reading without centers, validation, and an optimal solver
// (full distance table over the 3,674,160 states, built once in about half a second).

import { cube } from './nxn.js';
import { CORNERS as C3, GEOM as G3, rgbToLab, dist, hungarian, COLOR_NAMES, TYPICAL_LAB } from './core.js';

const two = cube(2);
const key = (p, n) => p.join(',') + '|' + n.join(',');
// Corner sticker triples in 2x2 indices, same order as the 3x3 table (U/D sticker first).
export const CORNERS = C3.map(tri => tri.map(i => two.index.get(key(G3[i].p, G3[i].n))));
const CORNER_COLORS = ['URF','UFL','ULB','UBR','DFR','DLF','DBL','DRB'];
export const FACES = 'URFDLB';
const DBL = 6;

// Reads 24 color samples into color names (exactly 4 of each) by balanced clustering.
export function classify(rgb) {
  const lab = rgb.map(rgbToLab);
  let ref = COLOR_NAMES.map(n => TYPICAL_LAB[n].slice());
  let assign = [];
  for (let it = 0; it < 8; it++) {
    const cost = lab.map(l => Array.from({ length: 24 }, (_, slot) => dist(l, ref[(slot / 4) | 0])));
    assign = hungarian(cost).map(slot => (slot / 4) | 0);
    ref = ref.map((r, ci) => {
      const mine = lab.filter((_, i) => assign[i] === ci);
      return mine.length ? [0, 1, 2].map(k => mine.reduce((s, m) => s + m[k], 0) / mine.length) : r;
    });
  }
  return assign.map(ci => COLOR_NAMES[ci]);
}

// Turns 24 color names into face letters, using the back-bottom-left corner as the fixed reference.
// Returns {letters, faceColor} or {error}.
export function lettersFromColors(colors) {
  const counts = {}; colors.forEach(c => counts[c] = (counts[c] || 0) + 1);
  const off = Object.entries(counts).filter(([, n]) => n !== 4);
  if (Object.keys(counts).length !== 6 || off.length) return { error: 'Each color needs exactly 4 stickers.', bad: [] };
  const together = {}; COLOR_NAMES.forEach(c => together[c] = new Set());
  for (const tri of CORNERS) { const cs = tri.map(i => colors[i]); cs.forEach(a => cs.forEach(b => together[a].add(b))); }
  const opp = {};
  for (const c of Object.keys(counts)) {
    const never = Object.keys(counts).filter(o => o !== c && !together[c].has(o));
    if (never.length !== 1) return { error: 'Some corners have impossible color combinations. A sticker is probably misread.', bad: [] };
    opp[c] = never[0];
  }
  const [d, b, l] = CORNERS[DBL].map(i => colors[i]);
  const faceColor = { D: d, B: b, L: l, U: opp[d], F: opp[b], R: opp[l] };
  if (new Set(Object.values(faceColor)).size !== 6) return { error: 'The corner colors don’t fit together. A sticker is probably misread.', bad: [...CORNERS[DBL]] };
  const byColor = Object.fromEntries(Object.entries(faceColor).map(([k, v]) => [v, k]));
  return { letters: colors.map(c => byColor[c]), faceColor };
}

function cubies(s) {
  const cp = [], co = [];
  for (let i = 0; i < 8; i++) {
    const cols = CORNERS[i].map(k => s[k]);
    const ori = cols.findIndex(c => c === 'U' || c === 'D');
    if (ori < 0) return { error: i };
    const j = CORNER_COLORS.findIndex(cc => cc[0] === cols[ori] && cc[1] === cols[(ori + 1) % 3] && cc[2] === cols[(ori + 2) % 3]);
    if (j < 0) return { error: i };
    cp[i] = j; co[i] = ori;
  }
  return { cp, co };
}

export function validate(arr, nameOf) {
  const s = Array.isArray(arr) ? arr : arr.split('');
  const name = c => nameOf ? nameOf(c) : c;
  const unknown = s.map((c, i) => FACES.includes(c) ? -1 : i).filter(i => i >= 0);
  if (unknown.length) return { ok: false, type: 'unknown', bad: unknown, message: `${unknown.length} sticker${unknown.length > 1 ? 's' : ''} still need${unknown.length > 1 ? '' : 's'} a color.` };
  const counts = {}; for (const c of FACES) counts[c] = 0; s.forEach(c => counts[c]++);
  const off = FACES.split('').filter(c => counts[c] !== 4);
  if (off.length) return { ok: false, type: 'count', bad: s.map((c, i) => counts[c] > 4 ? i : -1).filter(i => i >= 0), message: `Each color needs exactly 4 stickers. Right now there are ${off.map(c => `${counts[c]} ${name(c)}`).join(', ')}.` };
  const seen = {};
  for (let i = 0; i < 8; i++) {
    const cols = CORNERS[i].map(k => s[k]); const desc = cols.map(name).join(', ');
    const ori = cols.findIndex(c => c === 'U' || c === 'D');
    const j = ori < 0 ? -1 : CORNER_COLORS.findIndex(cc => cc[0] === cols[ori] && cc[1] === cols[(ori + 1) % 3] && cc[2] === cols[(ori + 2) % 3]);
    if (j < 0) return { ok: false, type: 'corner', bad: CORNERS[i], message: `The corner with ${desc} can't exist on a real cube. One of its stickers is misread.` };
    if (seen[j] !== undefined) return { ok: false, type: 'cornerDup', bad: [...CORNERS[i], ...CORNERS[seen[j]]], message: `Two corners both read as ${desc}. One of them is misread.` };
    seen[j] = i;
  }
  const { co } = cubies(s);
  if (co.reduce((a, b) => a + b, 0) % 3) return { ok: false, type: 'twist', bad: [], message: 'One corner is twisted in place. Turning the cube can never do that.' };
  return { ok: true, type: 'ok', bad: [], message: '' };
}

export function physicalFix(s) {
  if (validate(s).type !== 'twist') return null;
  const [u, r, fr] = CORNERS[0];
  for (const sign of [1, -1]) {
    const t = s.slice();
    if (sign === 1) { t[u] = s[r]; t[fr] = s[u]; t[r] = s[fr]; } else { t[r] = s[u]; t[u] = s[fr]; t[fr] = s[r]; }
    if (validate(t).type !== 'twist') return { kind: 'twist', sign, state: t, stickers: CORNERS[0] };
  }
  return null;
}

// ---- Solver ----
export const MOVES = ['U', "U'", 'U2', 'R', "R'", 'R2', 'F', "F'", 'F2'];
const P = [0, 1, 2, 3, 4, 5, 7]; // positions other than the fixed back-bottom-left corner
const FACT = [1, 1, 2, 6, 24, 120, 720, 5040];
function permIndex(cp) {
  const v = P.map(pos => P.indexOf(cp[pos]));
  let idx = 0;
  for (let i = 0; i < 7; i++) { let smaller = 0; for (let j = i + 1; j < 7; j++) if (v[j] < v[i]) smaller++; idx += smaller * FACT[6 - i]; }
  return idx;
}
function permFromIndex(idx) {
  const avail = [0, 1, 2, 3, 4, 5, 6], v = [];
  for (let i = 0; i < 7; i++) { const f = FACT[6 - i], k = Math.floor(idx / f); idx %= f; v.push(avail.splice(k, 1)[0]); }
  const cp = new Array(8); cp[DBL] = DBL; P.forEach((pos, i) => cp[pos] = P[v[i]]); return cp;
}
function oriIndex(co) { let idx = 0; for (let i = 0; i < 6; i++) idx = idx * 3 + co[P[i]]; return idx; }
function oriFromIndex(idx) {
  const co = new Array(8).fill(0); let sum = 0;
  for (let i = 5; i >= 0; i--) { co[P[i]] = idx % 3; sum += co[P[i]]; idx = Math.floor(idx / 3); }
  co[7] = (3 - sum % 3) % 3; return co;
}
let tables = null;
export function init() {
  if (tables) return;
  const mv = MOVES.map(m => cubies(two.apply(two.solved, [m])));
  const pm = new Uint16Array(5040 * 9), om = new Uint16Array(729 * 9);
  for (let p = 0; p < 5040; p++) {
    const cp = permFromIndex(p);
    mv.forEach((m, k) => { pm[p * 9 + k] = permIndex(cp.map((_, i) => cp[m.cp[i]])); });
  }
  for (let o = 0; o < 729; o++) {
    const co = oriFromIndex(o);
    mv.forEach((m, k) => { om[o * 9 + k] = oriIndex(co.map((_, i) => (co[m.cp[i]] + m.co[i]) % 3)); });
  }
  const N = 5040 * 729, d = new Uint8Array(N).fill(255), q = new Int32Array(N);
  d[0] = 0; q[0] = 0; let head = 0, tail = 1;
  while (head < tail) {
    const s = q[head++], p = (s / 729) | 0, o = s % 729, nd = d[s] + 1;
    for (let k = 0; k < 9; k++) {
      const t = pm[p * 9 + k] * 729 + om[o * 9 + k];
      if (d[t] === 255) { d[t] = nd; q[tail++] = t; }
    }
  }
  tables = { pm, om, d };
}
export function solve(letters) {
  init();
  const c = cubies(letters);
  if (c.error !== undefined) throw new Error('invalid');
  const { pm, om, d } = tables;
  let p = permIndex(c.cp), o = oriIndex(c.co);
  const out = [];
  while (d[p * 729 + o] > 0) {
    const cur = d[p * 729 + o];
    let found = false;
    for (let k = 0; k < 9; k++) {
      const np = pm[p * 9 + k], no = om[o * 9 + k];
      if (d[np * 729 + no] === cur - 1) { out.push(MOVES[k]); p = np; o = no; found = true; break; }
    }
    if (!found) throw new Error('unsolvable');
  }
  return out;
}
