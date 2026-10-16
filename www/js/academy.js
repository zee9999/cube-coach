// Learn tab: tracks, lesson list and the lesson player.
import { cube, FACES } from './nxn.js';
import { CubeView, CLASSIC, GREY } from './view.js';
import { TRACKS, LESSONS, maskFn } from './lessons.js';
import { $, h, describeMove } from './ui.js';
import { data, update, addCoins } from './state.js';
import { banner } from './ads.js';

const A = { track: '3', lesson: null, demo: 0, ids: null, step: 0, alg: [], view: null, busy: false, playing: false };
const STD_NAME = { U: 'white', R: 'red', F: 'green', D: 'yellow', L: 'orange', B: 'blue' };

function renderTracks() {
  $('learn-list').hidden = false; $('learn-lesson').hidden = true;
  const tp = $('trackPick'); tp.innerHTML = '';
  TRACKS.forEach(t => tp.append(h('button', { class: 'pick', 'aria-pressed': A.track === t.id ? 'true' : 'false', onclick: () => { A.track = t.id; renderTracks(); } }, t.name)));
  const track = TRACKS.find(t => t.id === A.track);
  $('trackBlurb').textContent = track.blurb;
  const list = $('lessonList'); list.innerHTML = '';
  const lessons = LESSONS[A.track];
  const doneCount = lessons.filter(l => data.learned.includes(l.id)).length;
  $('trackProgress').textContent = `${doneCount} of ${lessons.length} learned`;
  lessons.forEach((l, i) => {
    const done = data.learned.includes(l.id);
    list.append(h('button', { class: 'lesson-row' + (done ? ' done' : ''), onclick: () => openLesson(l.id) },
      h('span', { class: 'num' }, done ? '✓' : String(i + 1)),
      h('span', { class: 'lt' }, h('b', {}, l.title), h('small', {}, l.summary))));
  });
  banner(true);
}

function lessonState() {
  const l = A.lesson, d = l.demos?.[A.demo];
  const N = TRACKS.find(t => t.id === A.track).N, m = cube(N);
  const base = d?.base ?? l.base ?? '';
  A.alg = d ? m.parse(d.alg) : [];
  let ids = m.applyArr(Array.from({ length: m.size }, (_, i) => i), base);
  ids = m.applyArr(ids, m.invertAlg(A.alg));
  A.ids = ids; A.step = 0; A.N = N; A.mask = maskFn(d?.mask || 'all', m);
}
const colorsOf = ids => { const m = cube(A.N); return ids.map(id => A.mask(id) ? CLASSIC[FACES[(id / m.per) | 0]] : GREY); };

function openLesson(id) {
  const l = LESSONS[A.track].find(x => x.id === id);
  A.lesson = l; A.demo = 0; A.playing = false;
  $('learn-list').hidden = true; $('learn-lesson').hidden = false;
  banner(false);
  $('lessonEyebrow').textContent = `${TRACKS.find(t => t.id === A.track).name} · Lesson ${LESSONS[A.track].indexOf(l) + 1}`;
  $('lessonTitle').textContent = l.title;
  const body = $('lessonBody'); body.innerHTML = '';
  l.body.forEach(p => body.append(h('p', {}, p)));
  const hasCube = !!(l.demos && l.demos.length) || !!l.practice;
  $('lessonCubeWrap').hidden = !hasCube;
  if (hasCube) {
    lessonState();
    if (!A.view) A.view = new CubeView($('lessonCube'), { N: A.N });
    else if (A.view.N !== A.N) A.view.setSize(A.N);
    A.view.resetView(); A.view.resize();
    A.view.setColors(colorsOf(A.ids));
  }
  const demos = $('demoPick'); demos.innerHTML = '';
  (l.demos || []).forEach((d, i) => demos.append(h('button', { class: 'pick', 'aria-pressed': i === A.demo ? 'true' : 'false', onclick: () => { if (A.busy) return; A.demo = i; A.playing = false; lessonState(); A.view.setColors(colorsOf(A.ids)); [...demos.children].forEach((b, j) => b.setAttribute('aria-pressed', j === i ? 'true' : 'false')); renderPlayer(); } }, d.label)));
  demos.hidden = !l.demos || l.demos.length < 2;
  const pad = $('practicePad'); pad.innerHTML = '';
  pad.hidden = !l.practice;
  (l.practice || []).forEach(t => pad.append(h('button', { onclick: () => practice(t) }, t)));
  const idx = LESSONS[A.track].indexOf(l), nextL = LESSONS[A.track][idx + 1];
  $('learnedBtn').textContent = data.learned.includes(l.id) ? (nextL ? 'Next lesson' : 'Back to lessons') : 'Mark as learned (+25)';
  $('learnedBtn').onclick = () => {
    if (!data.learned.includes(l.id)) { update(d => d.learned.push(l.id)); addCoins(25, 'Lesson learned'); }
    if (nextL) openLesson(nextL.id); else renderTracks();
  };
  renderPlayer();
  window.scrollTo({ top: 0 });
}

function renderPlayer() {
  const has = A.alg.length > 0;
  $('lessonPlayer').hidden = !has;
  if (!has) return;
  const k = A.step, n = A.alg.length;
  $('lessonNotation').textContent = k < n ? A.alg[k] : '✓';
  $('lessonMoveText').textContent = k < n ? describeMove(A.alg[k]).action : 'Done. Tap Restart to watch again.';
  const ml = $('lessonMoves'); ml.innerHTML = '';
  A.alg.forEach((m, i) => ml.append(h('span', { class: i < k ? 'past' : i === k ? 'now' : '' }, m)));
  $('lessonPlay').textContent = A.playing ? 'Pause' : k >= n ? 'Replay' : 'Play';
  $('lessonStep').disabled = k >= n;
}
async function stepOnce() {
  if (A.busy || A.step >= A.alg.length) return;
  A.busy = true;
  const tok = A.alg[A.step];
  await A.view.animate(tok, 420);
  A.ids = cube(A.N).applyArr(A.ids, [tok]); A.step++;
  A.view.setColors(colorsOf(A.ids)); A.busy = false; renderPlayer();
}
async function practice(tok) {
  if (A.busy) return; A.busy = true;
  await A.view.animate(tok, 300);
  A.ids = cube(A.N).applyArr(A.ids, [tok]); A.view.setColors(colorsOf(A.ids)); A.busy = false;
  $('practiceText').textContent = `${tok}: ${describeMove(tok).action}`;
}

export function initAcademy() {
  $('lessonBack').onclick = () => { A.playing = false; renderTracks(); };
  $('lessonRestart').onclick = () => { if (A.busy) return; A.playing = false; lessonState(); A.view.setColors(colorsOf(A.ids)); renderPlayer(); };
  $('lessonStep').onclick = () => { A.playing = false; stepOnce(); };
  $('lessonPlay').onclick = async () => {
    if (A.playing) { A.playing = false; renderPlayer(); return; }
    if (A.step >= A.alg.length) { lessonState(); A.view.setColors(colorsOf(A.ids)); }
    A.playing = true; renderPlayer();
    while (A.playing && A.step < A.alg.length) { await stepOnce(); await new Promise(r => setTimeout(r, 180)); }
    A.playing = false; renderPlayer();
  };
  $('lessonReset').onclick = () => A.view?.resetView();
}
export function showAcademy() { if ($('learn-lesson').hidden) renderTracks(); else A.view?.resize(); }
export { STD_NAME };
