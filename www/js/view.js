// Three.js cube for any N: layer-turn animation, swipe-to-turn, drag to look around,
// skins, sticker blinking and repair animations (twist / flip / swap).
/* global THREE */
import { cube, AXIS } from './nxn.js';

export const CLASSIC = { U: '#f3f4ef', R: '#d3263a', F: '#16a34a', D: '#ffd21f', L: '#ff7a1a', B: '#1f5fd6' };
export const GREY = '#737c88';
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export class CubeView {
  constructor(el, { N = 3, swipe = false, onTurn = null, skin = null } = {}) {
    this.el = el; this.swipe = swipe; this.onTurn = onTurn; this.busy = false; this.queue = Promise.resolve();
    this.skin = skin || { body: '#15181c', shape: 'rounded', size: 0.86 };
    const T = THREE;
    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    el.prepend(this.renderer.domElement);
    this.scene = new T.Scene();
    this.scene.add(new T.AmbientLight(0xffffff, 0.78));
    const dl = new T.DirectionalLight(0xffffff, 0.42); dl.position.set(3, 6, 5); this.scene.add(dl);
    this.cam = new T.PerspectiveCamera(30, 1, 0.1, 100);
    this.cam.position.set(5.6, 5.0, 8.4); this.cam.lookAt(0, -0.1, 0);
    this.group = new T.Group(); this.scene.add(this.group);
    this.pivot = new T.Group(); this.group.add(this.pivot);
    this.raycaster = new T.Raycaster();
    this.setSize(N);
    this.bindPointer();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(el);
  }

  setSize(N) {
    const T = THREE;
    if (this.cubies) this.cubies.forEach(c => { this.group.remove(c); });
    this.N = N; this.model = cube(N);
    const M = N - 1, sc = 1.5 / N;
    this.group.scale.set(sc, sc, sc);
    this.bodyMat = new T.MeshLambertMaterial({ color: this.skin.body });
    const bodyGeo = new T.BoxGeometry(1.97, 1.97, 1.97);
    const s = this.skin.size ?? 0.86, r = this.skin.shape === 'circle' ? s * 0.98 : this.skin.shape === 'square' ? 0.04 : 0.2;
    const shape = new T.Shape(), a = s;
    if (this.skin.shape === 'circle') shape.absarc(0, 0, a * 0.92, 0, Math.PI * 2, false);
    else {
      shape.moveTo(-a + r, -a); shape.lineTo(a - r, -a); shape.quadraticCurveTo(a, -a, a, -a + r); shape.lineTo(a, a - r);
      shape.quadraticCurveTo(a, a, a - r, a); shape.lineTo(-a + r, a); shape.quadraticCurveTo(-a, a, -a, a - r); shape.lineTo(-a, -a + r); shape.quadraticCurveTo(-a, -a, -a + r, -a);
    }
    const stGeo = new T.ShapeGeometry(shape, 10);
    const cubies = new Map();
    this.cubies = [];
    for (let x = -M; x <= M; x += 2) for (let y = -M; y <= M; y += 2) for (let z = -M; z <= M; z += 2) {
      if (Math.abs(x) !== M && Math.abs(y) !== M && Math.abs(z) !== M) continue;
      const c = new T.Group(); c.position.set(x, y, z); c.userData.home = [x, y, z];
      c.add(new T.Mesh(bodyGeo, this.bodyMat)); this.group.add(c); this.cubies.push(c); cubies.set(`${x},${y},${z}`, c);
    }
    this.stickers = this.model.geom.map((g, i) => {
      const c = cubies.get(g.p.join(','));
      const m = new T.Mesh(stGeo, new T.MeshLambertMaterial({ color: 0x888888, side: T.DoubleSide }));
      const [nx, ny, nz] = g.n;
      m.position.set(nx * 0.995, ny * 0.995, nz * 0.995);
      if (nx) m.rotation.y = nx * Math.PI / 2;
      if (ny) m.rotation.x = -ny * Math.PI / 2;
      if (nz < 0) m.rotation.y = Math.PI;
      m.userData.index = i; c.add(m); return m;
    });
    this.colors = new Array(this.model.size).fill('#888888');
    this.render();
  }

  setSkin(skin) { this.skin = skin; const cols = this.colors; this.setSize(this.N); this.setColors(cols); }

  setColors(cols) {
    this.colors = cols.slice();
    cols.forEach((c, i) => this.stickers[i].material.color.set(c || GREY));
    this.render();
  }

  resetView() { this.group.rotation.set(0, 0, 0); this.render(); }
  resize() {
    const w = this.el.clientWidth, h = this.el.clientHeight || w;
    if (!w) return;
    this.renderer.setSize(w, h, false); this.cam.aspect = w / h;
    this.cam.position.set(5.6, 5.0, 8.4).multiplyScalar(Math.max(1, 1 / this.cam.aspect) * (this.zoomOut || 1)); this.cam.lookAt(0, -0.1, 0);
    this.cam.updateProjectionMatrix(); this.render();
  }
  render() { this.renderer.render(this.scene, this.cam); }

  // Queues a move animation. Resolves once the layer is back in place (colors are not changed).
  animate(tok, dur) { this.queue = this.queue.then(() => this._animate(tok, dur)); return this.queue; }
  _animate(tok, dur) {
    const T = THREE, sp = this.model.spec(tok);
    const angle = sp.q === 3 ? Math.PI / 2 : sp.q === 2 ? -Math.PI : -Math.PI / 2;
    const n = sp.n;
    const layer = this.cubies.filter(c => !sp.coords || sp.coords.includes(c.userData.home[0] * n[0] + c.userData.home[1] * n[1] + c.userData.home[2] * n[2]));
    layer.forEach(c => this.pivot.add(c));
    const axis = new T.Vector3(...n);
    const d = reduceMotion() ? 0 : dur ?? (sp.q === 2 ? 560 : 360);
    this.busy = true;
    return new Promise(res => {
      const t0 = performance.now();
      const step = now => {
        const t = d ? Math.min(1, (now - t0) / d) : 1;
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        this.pivot.quaternion.setFromAxisAngle(axis, angle * e); this.render();
        if (t < 1) requestAnimationFrame(step);
        else { layer.forEach(c => this.group.add(c)); this.pivot.quaternion.identity(); this.busy = false; res(); }
      };
      requestAnimationFrame(step);
    });
  }

  // Animates a hands-on repair. kind: 'twist' (corner at top-front-right), 'flip' (top-front edge),
  // 'swap' (top-front and top-right edges). sign: +1/-1 twist direction.
  animateFix(kind, sign = 1) {
    const T = THREE, M = this.N - 1;
    const find = p => this.cubies.find(c => c.userData.home.every((v, i) => v === p[i]));
    const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const parts = [];
    if (kind === 'twist') {
      const c = find([M, M, M]); const dir = new T.Vector3(1, 1, 1).normalize();
      parts.push({ c, out: dir.clone().multiplyScalar(1.4), axis: dir, angle: sign * 2 * Math.PI / 3 });
    } else if (kind === 'flip') {
      const c = find([0, M, M]); const dir = new T.Vector3(0, 1, 1).normalize();
      parts.push({ c, out: dir.clone().multiplyScalar(1.6), axis: dir, angle: Math.PI });
    } else if (kind === 'swap') {
      const a = find([0, M, M]), b = find([M, M, 0]);
      parts.push({ c: a, out: new T.Vector3(0, 1, 1).normalize().multiplyScalar(1.6), to: b, axis: new T.Vector3(0, 1, 0), angle: Math.PI / 2 });
      parts.push({ c: b, out: new T.Vector3(1, 1, 0).normalize().multiplyScalar(1.6), to: a, axis: new T.Vector3(0, 1, 0), angle: -Math.PI / 2 });
    }
    const homes = parts.map(p => new T.Vector3(...p.c.userData.home));
    const dur = reduceMotion() ? 0 : 2200;
    this.busy = true;
    return new Promise(res => {
      const t0 = performance.now();
      const step = now => {
        const t = dur ? Math.min(1, (now - t0) / dur) : 1;
        parts.forEach((p, k) => {
          const home = homes[k];
          const outT = ease(Math.min(1, t / 0.25)), inT = ease(Math.max(0, (t - 0.75) / 0.25)), midT = ease(Math.min(1, Math.max(0, (t - 0.25) / 0.5)));
          let pos;
          if (p.to) {
            const other = homes[parts.findIndex(q => q.c === p.to)], otherOut = parts.find(q => q.c === p.to).out;
            const start = home.clone().add(p.out.clone().multiplyScalar(outT * (1 - inT)));
            const outA = home.clone().add(p.out), outB = other.clone().add(otherOut);
            const mid = outA.clone().lerp(outB, midT); mid.y += Math.sin(Math.PI * midT) * 1.2 * (k ? 1 : -0.4);
            if (t < 0.25) pos = start;
            else if (t < 0.75) pos = mid;
            else pos = other.clone().add(otherOut.clone().multiplyScalar(1 - inT));
          } else pos = home.clone().add(p.out.clone().multiplyScalar(outT * (1 - inT)));
          p.c.position.copy(pos);
          p.c.quaternion.setFromAxisAngle(p.axis, p.angle * midT);
        });
        this.render();
        if (t < 1) requestAnimationFrame(step);
        else {
          parts.forEach((p, k) => { p.c.position.copy(homes[k]); p.c.quaternion.identity(); });
          this.busy = false; this.render(); res();
        }
      };
      requestAnimationFrame(step);
    });
  }

  // Makes the given stickers flash until stopBlink() is called.
  blink(indices) {
    this.stopBlink(); if (!indices.length) return;
    let on = false;
    this.blinkTimer = setInterval(() => {
      on = !on;
      indices.forEach(i => this.stickers[i].material.color.set(on ? '#ffffff' : (this.colors[i] || GREY)));
      indices.forEach(i => this.stickers[i].scale.setScalar(on ? 1.12 : 1));
      this.render();
    }, 380);
  }
  stopBlink() {
    if (!this.blinkTimer) return;
    clearInterval(this.blinkTimer); this.blinkTimer = null;
    this.stickers.forEach((m, i) => { m.scale.setScalar(1); m.material.color.set(this.colors[i] || GREY); });
    this.render();
  }

  bindPointer() {
    const el = this.renderer.domElement;
    let drag = null;
    const ndc = e => { const r = el.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
    el.addEventListener('pointerdown', e => {
      el.setPointerCapture(e.pointerId);
      let hit = null;
      if (this.swipe && !this.locked) {
        this.raycaster.setFromCamera(ndc(e), this.cam);
        const hits = this.raycaster.intersectObjects(this.stickers, false);
        if (hits.length) hit = hits[0].object.userData.index;
      }
      drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, hit, done: false };
    });
    el.addEventListener('pointermove', e => {
      if (!drag) return;
      if (drag.hit !== null && drag.hit !== undefined) {
        const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
        if (!drag.done && Math.hypot(dx, dy) > 14) { drag.done = true; this.swipeTurn(drag.hit, dx, dy); }
        return;
      }
      this.group.rotation.y += (e.clientX - drag.x) * 0.01;
      this.group.rotation.x = Math.max(-1.3, Math.min(1.3, this.group.rotation.x + (e.clientY - drag.y) * 0.01));
      drag.x = e.clientX; drag.y = e.clientY; this.render();
    });
    const end = () => { drag = null; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }

  swipeTurn(i, dx, dy) {
    const T = THREE, g = this.model.geom[i], n = g.n;
    const toScreen = v => { const w = this.group.localToWorld(new T.Vector3(...v)); w.project(this.cam); return new T.Vector2(w.x, -w.y); };
    const p0 = toScreen(g.p);
    const tangents = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].filter(t => t[0] * n[0] + t[1] * n[1] + t[2] * n[2] === 0);
    const drag = new T.Vector2(dx, dy).normalize();
    let best = null;
    for (const t of tangents) {
      const sv = toScreen(g.p.map((v, k) => v + t[k])).sub(p0).normalize();
      const d = sv.dot(drag);
      if (!best || Math.abs(d) > Math.abs(best.d)) best = { t, d };
    }
    const t = best.t.map(v => v * Math.sign(best.d));
    const a = [n[1] * t[2] - n[2] * t[1], n[2] * t[0] - n[0] * t[2], n[0] * t[1] - n[1] * t[0]];
    const coord = g.p[0] * a[0] + g.p[1] * a[1] + g.p[2] * a[2];
    const tok = this.model.tokenFor(a, coord, 1);
    if (this.onTurn) this.onTurn(tok);
  }

  dispose() { this.ro.disconnect(); this.stopBlink(); this.renderer.dispose(); this.renderer.domElement.remove(); }
}

// Colors for a facelet-letter state using a letter -> hex map.
export const colorsFor = (state, map) => [...state].map(c => map[c] || GREY);
export { AXIS };
