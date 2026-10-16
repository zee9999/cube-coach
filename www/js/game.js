// Play tab: virtual cubes from 2x2 to 7x7, swipe to turn, timer, best times, daily challenge, coins.
import { cube, SCRAMBLE_LENGTH, seeded } from './nxn.js';
import { CubeView } from './view.js';
import { $, h, sleep, fmtTime } from './ui.js';
import { data, update, addCoins, spend, toast } from './state.js';
import { equippedSkin } from './market.js';
import * as Two from './two.js';
import { solve3, solver } from './solve.js';
import { afterGame, banner } from './ads.js';

const SIZES = [2, 3, 4, 5, 6, 7];
const DIFFS = [
  { id: 'easy', name: 'Easy', len: N => N + 1, mult: 0.3 },
  { id: 'medium', name: 'Medium', len: N => 2 * N + 4, mult: 0.6 },
  { id: 'full', name: 'Full', len: N => SCRAMBLE_LENGTH[N], mult: 1 },
];
const REWARD = { 2: 20, 3: 50, 4: 120, 5: 250, 6: 400, 7: 600 };
const HINT_COST = 20;
const G = { N: 3, diff: 'full', state: null, history: [], start: 0, timer: 0, moves: 0, daily: false, playing: false, view: null, hinting: false };
const today = () => new Date().toISOString().slice(0, 10);
const dailyKey = () => today();
const hash = s => [...s].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) | 0, 7);

function skinColors() { const { colors } = equippedSkin(); return colors; }
const hexOf = state => { const c = skinColors(); return [...state].map(l => c[l]); };

function renderLobby() {
  $('game-lobby').hidden = false; $('game-play').hidden = true;
  const sizes = $('sizePick'); sizes.innerHTML = '';
  SIZES.forEach(N => sizes.append(h('button', { class: 'pick', 'aria-pressed': G.N === N ? 'true' : 'false', onclick: () => { G.N = N; renderLobby(); } }, `${N}×${N}`)));
  const diffs = $('diffPick'); diffs.innerHTML = '';
  DIFFS.forEach(d => diffs.append(h('button', { class: 'pick', 'aria-pressed': G.diff === d.id ? 'true' : 'false', onclick: () => { G.diff = d.id; renderLobby(); } }, d.name)));
  const diff = DIFFS.find(d => d.id === G.diff);
  const best = data.best[`${G.N}-${G.diff}`];
  $('lobbyInfo').textContent = `${diff.len(G.N)}-move scramble · up to ${Math.round(REWARD[G.N] * diff.mult)} coins` + (best ? ` · best ${fmtTime(best.time)} (${best.moves} moves)` : '');
  const done = data.daily[dailyKey()];
  $('dailyBtn').disabled = !!done;
  $('dailyState').textContent = done ? `Done today in ${fmtTime(done.time)}. New one tomorrow.` : 'Same 3×3 scramble for everyone today. +100 coins bonus.';
  const tbl = $('bestTable'); tbl.innerHTML = '';
  tbl.append(h('tr', {}, h('th', {}, 'Size'), ...DIFFS.map(d => h('th', {}, d.name))));
  SIZES.forEach(N => tbl.append(h('tr', {}, h('td', {}, `${N}×${N}`), ...DIFFS.map(d => { const b = data.best[`${N}-${d.id}`]; return h('td', {}, b ? fmtTime(b.time) : '–'); }))));
  banner(true);
}

function startGame(daily) {
  G.daily = daily;
  const N = daily ? 3 : G.N, m = cube(N);
  const len = daily ? SCRAMBLE_LENGTH[3] : DIFFS.find(d => d.id === G.diff).len(N);
  const sc = m.scramble(len, daily ? seeded(hash(dailyKey())) : Math.random);
  G.state = m.apply(m.solved, sc); G.scramble = sc; G.history = []; G.moves = 0; G.start = 0; G.playing = true; G.curN = N;
  $('game-lobby').hidden = true; $('game-play').hidden = false; $('gameOver').hidden = true;
  banner(false);
  const { skin } = equippedSkin();
  if (!G.view) G.view = new CubeView($('gameCube'), { N, swipe: true, skin, onTurn: tok => turn(tok) });
  else { G.view.skin = skin; G.view.setSize(N); }
  G.view.locked = false;
  G.view.resetView(); G.view.resize();
  G.view.setColors(hexOf(G.state));
  $('gameTitle').textContent = daily ? 'Daily challenge' : `${N}×${N} · ${DIFFS.find(d => d.id === G.diff).name}`;
  $('hintBtn').textContent = data.pro ? 'Hint' : `Hint (${HINT_COST})`;
  renderPad(N);
  tick();
}
function renderPad(N) {
  const pad = $('movePad'); pad.innerHTML = '';
  const toks = ['U', "U'", 'D', "D'", 'R', "R'", 'L', "L'", 'F', "F'", 'B', "B'"];
  if (N >= 4) toks.push('Uw', "Uw'", 'Rw', "Rw'", 'Fw', "Fw'");
  if (N === 3) toks.push('M', "M'");
  toks.forEach(t => pad.append(h('button', { onclick: () => turn(t) }, t)));
}
function tick() {
  cancelAnimationFrame(G.timer);
  const loop = () => {
    $('gameTime').textContent = fmtTime(G.start ? performance.now() - G.start : 0);
    $('gameMoves').textContent = `${G.moves} moves`;
    if (G.playing) G.timer = requestAnimationFrame(loop);
  };
  loop();
}
async function turn(tok, undo = false) {
  if (!G.playing) return;
  const m = cube(G.curN);
  if (!G.start) G.start = performance.now();
  G.state = m.apply(G.state, [tok]);
  if (!undo) { G.history.push(tok); G.moves++; }
  const target = G.state;
  await G.view.animate(tok, 170);
  G.view.setColors(hexOf(target));
  if (m.isSolved(G.state) && G.playing) finish();
}
function undo() { if (!G.history.length || !G.playing) return; const t = G.history.pop(); G.moves++; turn(cube(G.curN).invert(t), true); }

async function hint() {
  if (G.hinting || !G.playing) return;
  if (!data.pro && !spend(HINT_COST)) { toast(`Hints cost ${HINT_COST} coins. Earn coins by solving, or get Pro.`); return; }
  G.hinting = true;
  try {
    let move;
    // Undoing everything (scramble + your moves, with redundant turns merged) is always a valid path.
    const back = simplify(cube(G.curN).invertAlg([...G.scramble, ...G.history]));
    if (G.curN > 3) move = back[0];
    else if (G.curN === 2) {
      const STD = { U: 'white', R: 'red', F: 'green', D: 'yellow', L: 'orange', B: 'blue' };
      const lf = Two.lettersFromColors([...G.state].map(l => STD[l]));
      move = Two.solve(lf.letters)[0];
    } else {
      if (!solver.ready) { toast('The solver is still loading. Try again in a moment.'); if (!data.pro) addCoins(HINT_COST, 'refund'); return; }
      const sol = (await solve3(G.state)).trim().split(/\s+/).filter(Boolean);
      move = (back.length <= sol.length ? back : sol)[0];
    }
    if (move) { toast(`Hint: ${move}`); await turn(move); }
  } catch (e) { toast('No hint available right now.'); }
  finally { G.hinting = false; }
}

// Merges consecutive turns of the same layer (R R -> R2, R R' -> nothing).
function simplify(moves) {
  const out = [];
  const amt = t => t.endsWith("'") ? 3 : t.endsWith('2') ? 2 : 1;
  const base = t => t.replace(/['2]+$/, '');
  for (const t of moves) {
    const last = out[out.length - 1];
    if (last && base(last) === base(t)) {
      const a = (amt(last) + amt(t)) % 4; out.pop();
      if (a) out.push(base(t) + ['', '', '2', "'"][a]);
    } else out.push(t);
  }
  return out;
}

function finish() {
  G.playing = false; G.view.locked = true;
  const time = performance.now() - G.start;
  const N = G.curN, diff = DIFFS.find(d => d.id === G.diff);
  let coins = G.daily ? REWARD[3] + 100 : Math.round(REWARD[N] * diff.mult);
  const key = G.daily ? null : `${N}-${G.diff}`;
  let record = false;
  update(d => {
    d.solves++;
    if (G.daily) d.daily[dailyKey()] = { time, moves: G.moves };
    if (key) { const b = d.best[key]; if (!b || time < b.time) { d.best[key] = { time, moves: G.moves }; record = !!b; } }
  });
  if (record) coins += Math.round(coins * 0.5);
  addCoins(coins, G.daily ? 'Daily challenge' : record ? 'New best time' : 'Solved');
  $('overTime').textContent = fmtTime(time);
  $('overStats').textContent = `${G.moves} moves · +${coins} coins${record ? ' · new best!' : ''}`;
  $('gameOver').hidden = false;
  tick();
  afterGame();
}

export function initGame() {
  $('playBtnStart').onclick = () => startGame(false);
  $('dailyBtn').onclick = () => startGame(true);
  $('undoBtn').onclick = undo;
  $('hintBtn').onclick = hint;
  $('padToggle').onclick = () => { const p = $('movePad'); p.hidden = !p.hidden; $('padToggle').setAttribute('aria-pressed', String(!p.hidden)); };
  $('quitBtn').onclick = () => { G.playing = false; renderLobby(); };
  $('againBtn').onclick = () => startGame(G.daily ? false : false);
  $('lobbyBtn').onclick = () => renderLobby();
  $('gameReset').onclick = () => G.view?.resetView();
}
export function showGame() { if (!G.playing) renderLobby(); else G.view?.resize(); }
export function hideGame() { banner(false); }
let lastSkin = '';
export function refreshSkin() {
  const key = JSON.stringify(data.equipped);
  if (key === lastSkin) return; lastSkin = key;
  if (G.view && G.state) { G.view.setSkin(equippedSkin().skin); G.view.setColors(hexOf(G.state)); }
}
