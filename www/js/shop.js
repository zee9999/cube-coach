// Shop tab: Pro, coin pack and skins.
import { $, h, sheet } from './ui.js';
import { data } from './state.js';
import { CONFIG } from './config.js';
import { STICKERS, BODIES, owns, buyWithCoins, equip } from './market.js';
import { buy, restore, priceOf, mode, refreshProducts } from './store.js';
import { hasPrivacyOptions, showPrivacyOptions } from './ads.js';

// Website only: Pro and coin packs are sold in the Android app.
async function offerApp(def) {
  const live = CONFIG.playStoreLive;
  const open = await sheet(`${def.title} is sold in the app`, [
    h('p', {}, live ? 'Get Cube Coach on Google Play to buy it. The website stays free to use.' : 'Cube Coach for Android is coming soon to Google Play. The website stays free to use.'),
  ], live ? [{ label: 'Not now', value: false }, { label: 'Open Google Play', value: true, primary: true }] : [{ label: 'OK', value: false, primary: true }]);
  if (open) window.open(CONFIG.playStoreUrl, '_blank', 'noopener');
}

function preview(item) {
  if (item.kind === 'stickers') return h('div', { class: 'swatches' }, ['U', 'R', 'F', 'D', 'L', 'B'].map(f => h('i', { style: `background:${item.colors[f]}` })));
  const s = item.skin, r = s.shape === 'circle' ? '50%' : s.shape === 'square' ? '1px' : '3px';
  return h('div', { class: 'mini-face', style: `background:${s.body}` }, ['#d3263a', '#16a34a', '#1f5fd6', '#ffd21f', '#f3f4ef', '#ff7a1a', '#16a34a', '#d3263a', '#ffd21f'].map(c => h('i', { style: `background:${c};border-radius:${r};margin:${s.size > 0.95 ? 0 : 2}px` })));
}

export function renderShop() {
  $('shopMode').hidden = mode === 'native';
  $('shopMode').textContent = mode === 'unconfigured' ? 'Test build: Pro and coin packs aren’t on sale yet.' : 'On the website, Pro and coin packs are sold in the Android app. Skins work here with the coins you earn.';
  // Only the store build with RevenueCat sells. The website points to the app; a store build without a key shows no buy buttons.
  const selling = mode === 'native', web = mode === 'demo';
  $('proBtn').hidden = $('coinsBtn').hidden = mode === 'unconfigured';
  $('restoreBtn').hidden = !selling;
  const proPrice = priceOf('pro'), coinsPrice = priceOf('coins');
  $('proPrice').textContent = data.pro ? 'Active' : selling ? proPrice || 'Unavailable' : '';
  $('proBtn').disabled = data.pro || (selling && !proPrice);
  $('proBtn').textContent = data.pro ? 'You have Pro' : web ? 'Get Pro in the app' : proPrice ? `Get Pro · ${proPrice}` : 'Get Pro';
  $('coinsBtn').disabled = selling && !coinsPrice;
  $('coinsBtn').textContent = web ? 'Coin packs in the app' : coinsPrice ? `Buy 1,000 coins · ${coinsPrice}` : 'Buy 1,000 coins';
  if (selling && (!proPrice || !coinsPrice)) refreshProducts().then(ok => { if (ok) renderShop(); });
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
  $('proBtn').onclick = async () => { if (await buy('pro', offerApp)) renderShop(); };
  $('coinsBtn').onclick = async () => { if (await buy('coins', offerApp)) renderShop(); };
  $('restoreBtn').onclick = async () => { await restore(); renderShop(); };
  $('adPrivacyBtn').onclick = showPrivacyOptions;
}
