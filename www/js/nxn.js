// General N x N x N cube model used by the game, the Academy and the 2x2 solver.
// Sticker order per face matches core.js (U R F D L B, row-major), so N = 3 agrees with it.
//
// Notation: R = outer layer, R' counterclockwise, R2 half turn, 2R = second layer only,
// Rw = two outer layers, 3Rw = three outer layers, M/E/S = middle slice (odd N),
// x / y / z = whole-cube rotations.

export const FACES = 'URFDLB';
export const AXIS = { U:[0,1,0], D:[0,-1,0], R:[1,0,0], L:[-1,0,0], F:[0,0,1], B:[0,0,-1] };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function rotCW(v, n) { // quarter turn clockwise when looking at the face whose normal is n
  const cx = [n[1] * v[2] - n[2] * v[1], n[2] * v[0] - n[0] * v[2], n[0] * v[1] - n[1] * v[0]];
  const d = dot(n, v);
  return [-cx[0] + n[0] * d, -cx[1] + n[1] * d, -cx[2] + n[2] * d];
}
const cache = new Map();

export function cube(N) {
  if (cache.has(N)) return cache.get(N);
  const M = N - 1, per = N * N, size = 6 * per;
  const geom = [];
  for (let fi = 0; fi < 6; fi++) for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const u = 2 * c - M, w = 2 * r - M;
    let p, n;
    switch (FACES[fi]) {
      case 'U': p = [u, M, w]; n = [0, 1, 0]; break;
      case 'D': p = [u, -M, -w]; n = [0, -1, 0]; break;
      case 'F': p = [u, -w, M]; n = [0, 0, 1]; break;
      case 'B': p = [-u, -w, -M]; n = [0, 0, -1]; break;
      case 'R': p = [M, -w, -u]; n = [1, 0, 0]; break;
      case 'L': p = [-M, -w, u]; n = [-1, 0, 0]; break;
    }
    geom.push({ p, n });
  }
  const key = (p, n) => p.join(',') + '|' + n.join(',');
  const index = new Map(geom.map((g, i) => [key(g.p, g.n), i]));
  const solved = FACES.split('').map(c => c.repeat(per)).join('');
  const perms = new Map();

  // Builds the sticker permutation for turning the given layer coordinates about axis n.
  // coords: list of values of dot(p, n) to include (null = whole cube). q: clockwise quarter turns (1..3).
  function permFor(n, coords, q) {
    const p1 = Array.from({ length: size }, (_, i) => i);
    geom.forEach((g, i) => {
      if (coords && !coords.includes(dot(g.p, n))) return;
      p1[index.get(key(rotCW(g.p, n), rotCW(g.n, n)))] = i;
    });
    let out = p1;
    for (let k = 1; k < q; k++) out = out.map(i => p1[i]);
    return out;
  }
  const layerCoord = d => M - 2 * (d - 1); // depth 1 = outer layer

  // Parses one move token into {n, coords, q, depth list}.
  function spec(tok) {
    const m = /^(\d+)?([URFDLBMESxyz])(w)?(2'|2|')?$/.exec(tok);
    if (!m) throw new Error('Bad move ' + tok);
    const [, num, letter, wide, suf] = m;
    const q = suf === "'" ? 3 : suf && suf.startsWith('2') ? 2 : 1;
    if ('xyz'.includes(letter)) return { n: AXIS[{ x: 'R', y: 'U', z: 'F' }[letter]], coords: null, q, face: { x: 'R', y: 'U', z: 'F' }[letter], depths: null };
    if ('MES'.includes(letter)) {
      if (N % 2 === 0) throw new Error(letter + ' needs an odd cube');
      const face = { M: 'L', E: 'D', S: 'F' }[letter];
      return { n: AXIS[face], coords: [0], q, face, depths: [(N + 1) / 2] };
    }
    let depths;
    if (wide) depths = Array.from({ length: num ? +num : 2 }, (_, i) => i + 1);
    else depths = [num ? +num : 1];
    if (depths.some(d => d > N)) throw new Error('Layer out of range ' + tok);
    return { n: AXIS[letter], coords: depths.map(layerCoord), q, face: letter, depths };
  }
  function perm(tok) {
    if (perms.has(tok)) return perms.get(tok);
    const s = spec(tok); const p = permFor(s.n, s.coords, s.q);
    perms.set(tok, p); return p;
  }
  const parse = s => Array.isArray(s) ? s : (s || '').trim().split(/\s+/).filter(Boolean);
  function applyArr(arr, moves) {
    let s = arr.slice();
    for (const m of parse(moves)) { const p = perm(m); s = p.map(i => s[i]); }
    return s;
  }
  const apply = (state, moves) => applyArr(state.split(''), moves).join('');
  const isSolved = s => { for (let fi = 0; fi < 6; fi++) { const c = s[fi * per]; for (let k = 1; k < per; k++) if (s[fi * per + k] !== c) return false; } return true; };

  // Turns a swipe (rotation axis a, layer coordinate along a, +1 = counterclockwise about a) into a token.
  function tokenFor(a, coord, ccw) {
    let face = FACES.split('').find(c => dot(AXIS[c], a) === 1), d = (M - coord) / 2 + 1, prime = ccw > 0;
    if (d > Math.ceil(N / 2) || (N % 2 === 1 && d === (N + 1) / 2 && !'RUF'.includes(face))) {
      face = FACES.split('').find(c => dot(AXIS[c], a) === -1); d = N + 1 - d; prime = !prime;
    }
    return (d > 1 ? d : '') + face + (prime ? "'" : '');
  }

  function scramble(len, rng = Math.random) {
    const faces = FACES.split('');
    const axisOf = c => 'UD'.includes(c) ? 0 : 'RL'.includes(c) ? 1 : 2;
    const out = []; let lastAxis = -1, used = new Set();
    const maxWide = N >= 4 ? Math.floor(N / 2) : 1;
    while (out.length < len) {
      const face = faces[(rng() * 6) | 0], ax = axisOf(face);
      const width = N >= 4 ? 1 + ((rng() * maxWide) | 0) : 1;
      const k = face + width;
      if (ax === lastAxis && used.has(k)) continue;
      if (ax !== lastAxis) { used = new Set(); lastAxis = ax; }
      used.add(k);
      const tok = (width > 2 ? width : '') + face + (width > 1 ? 'w' : '') + ['', "'", '2'][(rng() * 3) | 0];
      out.push(tok);
    }
    return out;
  }
  const invert = m => m.endsWith("'") ? m.slice(0, -1) : m.endsWith('2') ? m : m + "'";
  const invertAlg = moves => parse(moves).slice().reverse().map(invert);

  // Piece type of a sticker: 'corner', 'edge', 'center' (by how many coordinates sit on the surface).
  const kind = i => { const c = geom[i].p.filter(v => Math.abs(v) === M).length; return c === 3 ? 'corner' : c === 2 ? 'edge' : 'center'; };

  const api = { N, size, per, geom, index, solved, spec, perm, parse, applyArr, apply, isSolved, tokenFor, scramble, invert, invertAlg, kind };
  cache.set(N, api);
  return api;
}

export const SCRAMBLE_LENGTH = { 2: 11, 3: 22, 4: 40, 5: 60, 6: 80, 7: 100 };

// Small seeded RNG for daily challenges.
export function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
