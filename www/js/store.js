// In-app purchases. In the iOS/Android build this uses RevenueCat (Apple and Google billing).
// On the website it runs in demo mode: purchases are simulated and nothing is charged.
import { CONFIG } from './config.js';
import { data, update, addCoins, toast } from './state.js';

const cap = window.Capacitor;
const platform = cap?.getPlatform?.() || 'web';
const apiKey = platform === 'ios' ? CONFIG.revenueCatKeyIOS : platform === 'android' ? CONFIG.revenueCatKeyAndroid : '';
const isNative = !!cap?.isNativePlatform?.();
// native = real store billing; unconfigured = app build without keys (no purchases); demo = website
export const mode = isNative ? (apiKey ? 'native' : 'unconfigured') : 'demo';
let Purchases = null;
const products = {}; // key -> store product (native)

export async function initStore() {
  if (mode !== 'native') return;
  try {
    Purchases = cap.registerPlugin('Purchases');
    await Purchases.configure({ apiKey });
    const ids = Object.values(CONFIG.products).map(p => p.id);
    const res = await Purchases.getProducts({ productIdentifiers: ids });
    for (const p of res.products || []) {
      const key = Object.keys(CONFIG.products).find(k => CONFIG.products[k].id === p.identifier);
      if (key) products[key] = p;
    }
    applyCustomerInfo((await Purchases.getCustomerInfo()).customerInfo);
  } catch (e) { console.warn('Store unavailable', e); }
}
function applyCustomerInfo(info) {
  const pro = !!info?.entitlements?.active?.[CONFIG.proEntitlement];
  if (pro !== data.pro) update(d => { d.pro = pro; });
}
export const priceOf = key => products[key]?.priceString || CONFIG.products[key].fallbackPrice;

// Resolves true when the purchase went through.
export async function buy(key, confirmDemo) {
  const def = CONFIG.products[key];
  if (mode === 'native') {
    try {
      const prod = products[key];
      if (!prod) { toast('This item isn’t available right now. Try again later.'); return false; }
      const res = await Purchases.purchaseStoreProduct({ product: prod });
      applyCustomerInfo(res.customerInfo);
      if (key === 'coins') addCoins(def.coins, 'Coin pack');
      return true;
    } catch (e) {
      if (!e?.userCancelled && !/cancel/i.test(String(e?.message || e))) toast('The purchase didn’t go through. You were not charged.');
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
