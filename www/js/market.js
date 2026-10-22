// Skin catalog. Sticker sets change the six colors; cube styles change the plastic and sticker shape.
import { data, update, spend, toast } from './state.js';

export const STICKERS = [
  { id: 'classic', name: 'Classic', price: 0, colors: { U: '#f3f4ef', R: '#d3263a', F: '#16a34a', D: '#ffd21f', L: '#ff7a1a', B: '#1f5fd6' } },
  { id: 'pastel', name: 'Pastel', price: 200, colors: { U: '#fdfcf7', R: '#f08a8a', F: '#8fd3a8', D: '#fbe39a', L: '#f7b885', B: '#93b8e8' } },
  { id: 'ocean', name: 'Ocean', price: 300, colors: { U: '#eaf7ff', R: '#ef476f', F: '#06d6a0', D: '#ffd166', L: '#118ab2', B: '#073b4c' } },
  { id: 'sunset', name: 'Sunset', price: 300, colors: { U: '#fff1e6', R: '#d62828', F: '#f77f00', D: '#fcbf49', L: '#9d4edd', B: '#2a6f97' } },
  { id: 'earth', name: 'Earth', price: 350, colors: { U: '#efe6d8', R: '#a0432d', F: '#6b8e23', D: '#d9a520', L: '#c97a40', B: '#46658f' } },
  { id: 'neon', name: 'Neon', price: 500, colors: { U: '#ffffff', R: '#ff2d6f', F: '#39ff88', D: '#f6ff3a', L: '#ff9f1c', B: '#2de2ff' } },
  { id: 'gold', name: 'Gold Edition', price: 1500, pro: true, colors: { U: '#fff6d8', R: '#9e2a2b', F: '#2f7d4f', D: '#e9b824', L: '#d67a1f', B: '#22406e' } },
  { id: 'aurora', name: 'Aurora', price: 1500, pro: true, colors: { U: '#f5f3ff', R: '#ff5d8f', F: '#4ade80', D: '#facc15', L: '#fb923c', B: '#818cf8' } },
];
export const BODIES = [
  { id: 'black', name: 'Black', price: 0, skin: { body: '#15181c', shape: 'rounded', size: 0.86 } },
  { id: 'white', name: 'White plastic', price: 150, skin: { body: '#eceee9', shape: 'rounded', size: 0.84 } },
  { id: 'stickerless', name: 'Stickerless', price: 400, skin: { body: '#1d1f22', shape: 'square', size: 0.97 } },
  { id: 'dots', name: 'Dots', price: 350, skin: { body: '#23272e', shape: 'circle', size: 0.8 } },
  { id: 'carbon', name: 'Carbon', price: 1200, pro: true, skin: { body: '#2b2f36', shape: 'rounded', size: 0.9 } },
];
export const all = () => [...STICKERS.map(s => ({ ...s, kind: 'stickers' })), ...BODIES.map(b => ({ ...b, kind: 'body' }))];
export const owns = item => item.price === 0 || data.owned.includes(item.id) || (item.pro && data.pro);

export function equippedSkin() {
  const st = STICKERS.find(s => s.id === data.equipped.stickers) || STICKERS[0];
  const bd = BODIES.find(b => b.id === data.equipped.body) || BODIES[0];
  return { colors: st.colors, skin: bd.skin };
}
export function buyWithCoins(item) {
  if (owns(item)) return true;
  if (!spend(item.price)) { toast(`You need ${item.price - data.coins} more coins`); return false; }
  update(d => { d.owned.push(item.id); });
  toast(`${item.name} unlocked`);
  return true;
}
export function equip(item) { if (!owns(item)) return; update(d => { d.equipped[item.kind] = item.id; }); }
// Puts the default back for an equipped skin the player no longer owns, for example a Pro skin after Pro ends.
export function unequipUnowned() {
  const st = STICKERS.find(s => s.id === data.equipped.stickers), bd = BODIES.find(b => b.id === data.equipped.body);
  const reset = {};
  if (st && !owns(st)) reset.stickers = STICKERS[0].id;
  if (bd && !owns(bd)) reset.body = BODIES[0].id;
  if (Object.keys(reset).length) update(d => { Object.assign(d.equipped, reset); });
}
