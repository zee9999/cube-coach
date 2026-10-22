// In-app purchases. In the iOS/Android build this uses RevenueCat (Apple and Google billing).
// In RevenueCat, set cubecoach_pro to Non-consumable, or Pro is consumed and can't be restored.
// On the website it runs in demo mode: purchases are simulated and nothing is charged.
import { CONFIG } from './config.js';
import { data, update, addCoins, toast } from './state.js';

const cap = window.Capacitor;
const platform = cap?.getPlatform?.() || 'web';
const apiKey = platform === 'ios' ? CONFIG.revenueCatKeyIOS : platform === 'android' ? CONFIG.revenueCatKeyAndroid : '';
const isNative = !!cap?.isNativePlatform?.();
// native = real store billing; unconfigured = app build without keys (no purchases); demo = website
export const mode = isNative ? (apiKey ? 'native' : 'unconfigured') : 'demo';
const storeName = platform === 'ios' ? 'the App Store' : 'Google Play';
let Purchases = null;
const products = {}; // key -> store product (native)

export async function initStore() {
  if (mode !== 'native') return;
  try {
    Purchases = cap.registerPlugin('Purchases');
    await Purchases.configure({ apiKey });
    await loadProducts();
    applyCustomerInfo((await Purchases.getCustomerInfo()).customerInfo);
    // Pending payments (cash, slow cards, Ask to Buy) finish later and arrive here.
    Purchases.addCustomerInfoUpdateListener({}, info => { if (info) applyCustomerInfo(info); });
  } catch (e) { console.warn('Store unavailable', e); }
}
// Pro and coins are one-time products; on Android getProducts looks for subscriptions unless told otherwise.
async function loadProducts() {
  const ids = Object.values(CONFIG.products).map(p => p.id);
  const res = await Purchases.getProducts({ productIdentifiers: ids, type: 'NON_SUBSCRIPTION' });
  for (const p of res.products || []) {
    const key = Object.keys(CONFIG.products).find(k => CONFIG.products[k].id === p.identifier);
    if (key) products[key] = p;
  }
}
// Retry when the shop opens after products failed to load (for example offline at launch). Resolves true if more loaded.
export async function refreshProducts() {
  if (mode !== 'native' || !Purchases) return false;
  const before = Object.keys(products).length;
  try { await loadProducts(); } catch (e) { return false; }
  return Object.keys(products).length > before;
}
function applyCustomerInfo(info) {
  const pro = !!info?.entitlements?.active?.[CONFIG.proEntitlement];
  if (pro !== data.pro) update(d => { d.pro = pro; });
  creditCoinPacks(info);
}
// Coin packs are consumed, so each one is credited once by counting the coin-pack purchases on record.
// This also credits a pack whose payment was pending when the purchase screen closed.
function creditCoinPacks(info) {
  const list = info?.nonSubscriptionTransactions;
  if (!Array.isArray(list)) return;
  const def = CONFIG.products.coins;
  const n = list.filter(t => t.productIdentifier === def.id).length;
  const credited = data.coinPacks || 0;
  if (n > credited) { update(d => { d.coinPacks = n; }); addCoins((n - credited) * def.coins, 'Coin pack'); }
  else if (n < credited) update(d => { d.coinPacks = n; }); // refunded packs drop off the record
}
// In the store builds the price comes only from the store, so the shop never shows a price it can't charge.
export const priceOf = key => products[key]?.priceString || (mode === 'native' ? '' : CONFIG.products[key].fallbackPrice);

// Resolves true when the purchase went through.
export async function buy(key, confirmDemo) {
  const def = CONFIG.products[key];
  if (mode === 'native') {
    try {
      const prod = products[key];
      if (!prod) { toast('This item isn’t available right now. Try again later.'); return false; }
      const packsBefore = data.coinPacks || 0;
      const res = await Purchases.purchaseStoreProduct({ product: prod });
      applyCustomerInfo(res.customerInfo);
      // The purchase record can lag behind the purchase: credit this pack now and count it.
      if (key === 'coins' && (data.coinPacks || 0) === packsBefore) { update(d => { d.coinPacks = packsBefore + 1; }); addCoins(def.coins, 'Coin pack'); }
      return true;
    } catch (e) {
      const code = String(e?.code ?? '');
      const cancelled = code === '1' || e?.userCancelled || e?.data?.userCancelled;
      if (code === '20') toast(key === 'coins' ? `Payment pending. Your coins arrive when ${storeName} confirms it.` : `Payment pending. Pro unlocks when ${storeName} confirms it.`);
      else if (code === '6') toast('You already own this. Tap Restore purchases.');
      else if (!cancelled && !/cancel/i.test(String(e?.message || e))) toast('The purchase didn’t go through.');
      return false;
    }
  }
  if (mode === 'unconfigured') { toast('Purchases aren’t switched on in this test build yet.'); return false; }
  const ok = await confirmDemo(def, priceOf(key));
  if (!ok) return false;
  if (key === 'pro') update(d => { d.pro = true; });
  if (key === 'coins') addCoins(def.coins, 'Coin pack');
  return true;
}
export async function restore() {
  if (mode !== 'native') { toast('Restore works in the App Store and Google Play versions.'); return; }
  try { applyCustomerInfo((await Purchases.restorePurchases()).customerInfo); toast(data.pro ? 'Pro restored' : 'No purchases found for this account'); }
  catch (e) { toast('Couldn’t reach the store. Check your connection and try again.'); }
}
