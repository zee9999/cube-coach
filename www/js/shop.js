// Shop tab: Pro, coin pack and skins.
import { $, h, sheet } from './ui.js';
import { data } from './state.js';
import { STICKERS, BODIES, owns, buyWithCoins, equip } from './market.js';
import { buy, restore, priceOf, mode, refreshProducts } from './store.js';
import { hasPrivacyOptions, showPrivacyOptions } from './ads.js';

function confirmDemo(def, price) {
  return sheet(`Buy ${def.title}?`, [
    h('p', {}, `Price: ${price}`),
    h('p', { class: 'small muted' }, 'Demo mode: nothing is charged on the website. In the App Store and Google Play versions this opens the store’s own checkout.'),
  ], [{ label: 'Cancel', value: false }, { label: 'Buy (demo)', value: true, primary: true }]);
}

function preview(item) {
  if (item.kind === 'stickers') return h('div', { class: 'swatches' }, ['U', 'R', 'F', 'D', 'L', 'B'].map(f => h('i', { style: `background:${item.colors[f]}` })));
  const s = item.skin, r = s.shape === 'circle' ? '50%' : s.shape === 'square' ? '1px' : '3px';
  return h('div', { class: 'mini-face', style: `background:${s.body}` }, ['#d3263a', '#16a34a', '#1f5fd6', '#ffd21f', '#f3f4ef', '#ff7a1a', '#16a34a', '#d3263a', '#ffd21f'].map(c => h('i', { style: `background:${c};border-radius:${r};margin:${s.size > 0.95 ? 0 : 2}px` })));
}

export function renderShop() {
  $('shopMode').hidden = mode === 'native';
  $('shopMode').textContent = mode === 'unconfigured' ? 'Test build: purchases are switched off until the store is set up.' : 'Demo mode on the website: purchases are simulated and nothing is charged.';
  const proPrice = priceOf('pro'), coinsPrice = priceOf('coins');
  $('proPrice').textContent = data.pro ? 'Active' : proPrice || 'Unavailable';
  $('proBtn').disabled = data.pro || !proPrice;
  $('proBtn').textContent = data.pro ? 'You have Pro' : proPrice ? `Get Pro · ${proPrice}` : 'Get Pro';
  $('coinsBtn').disabled = !coinsPrice;
  $('coinsBtn').textContent = coinsPrice ? `Buy 1,000 coins · ${coinsPrice}` : 'Buy 1,000 coins';
  if (mode === 'native' && (!proPrice || !coinsPrice)) refreshProducts().then(ok => { if (ok) renderShop(); });
  $('adPrivacyBtn').hidden = !hasPrivacyOptions();
  for (const [listId, items, kind] of [['stickerList', STICKERS, 'stickers'], ['bodyList', BODIES, 'body']]) {
    const list = $(listId); list.innerHTML = '';
    items.forEach(raw => {
      const item = { ...raw, kind };
      const have = owns(item), on = data.equipped[kind] === item.id;
      const label = on ? 'Equipped' : have ? 'Equip' : item.pro && !data.pro ? `${item.price} coins or Pro` : `${item.price} coins`;
      list.append(h('div', { class: 'item' + (on ? ' on' : '') },
        preview(item),
        h('div', { class: 'item-name' }, item.name, item.pro ? h('span', { class: 'badge' }, 'Pro') : ''),
        h('button', { class: 'btn small-btn' + (have && !on ? ' primary' : ''), disabled: on, onclick: () => { if (have || buyWithCoins(item)) { equip(item); renderShop(); } } }, label)));
    });
  }
}

export function initShop() {
  $('proBtn').onclick = async () => { if (await buy('pro', confirmDemo)) renderShop(); };
  $('coinsBtn').onclick = async () => { if (await buy('coins', confirmDemo)) renderShop(); };
  $('restoreBtn').onclick = async () => { await restore(); renderShop(); };
  $('adPrivacyBtn').onclick = showPrivacyOptions;
}
