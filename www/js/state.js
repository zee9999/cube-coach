// Saved player data: coins, owned and equipped skins, best times, finished lessons, Pro status.

const KEY = 'cubecoach.v1';
const listeners = new Set();
const defaults = () => ({ coins: 150, owned: ['classic', 'black'], equipped: { stickers: 'classic', body: 'black' }, best: {}, learned: [], pro: false, daily: {}, solves: 0, firstRun: true });

function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return { ...defaults(), ...JSON.parse(raw) }; } catch (e) { /* storage blocked */ }
  return defaults();
}
export const data = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage blocked */ } listeners.forEach(fn => fn(data)); }
export const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export function update(fn) { fn(data); save(); }

export function addCoins(n, reason) { update(d => { d.coins += n; }); toast(`+${n} coins${reason ? ' · ' + reason : ''}`); }
export function spend(n) { if (data.coins < n) return false; update(d => { d.coins -= n; }); return true; }

export function toast(text) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); }
  el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2400);
}
