// Ads: AdMob in the iOS/Android build, a small Pro promo card on the website. Pro removes both.
import { CONFIG } from './config.js';
import { data } from './state.js';

const cap = window.Capacitor;
const platform = cap?.getPlatform?.() || 'web';
const native = !!cap?.isNativePlatform?.();
let AdMob = null, ready = false, bannerShown = false, finished = 0;

export async function initAds() {
  if (!native || data.pro) return;
  try {
    AdMob = cap.registerPlugin('AdMob');
    await AdMob.initialize({ initializeForTesting: CONFIG.admob.testing });
    if (platform === 'ios') {
      const st = await AdMob.trackingAuthorizationStatus();
      if (st.status === 'notDetermined') await AdMob.requestTrackingAuthorization();
    }
    ready = true;
  } catch (e) { console.warn('Ads unavailable', e); }
}

// Shows the bottom banner on screens that allow it.
export async function banner(show) {
  const slotEls = document.querySelectorAll('.house-ad');
  slotEls.forEach(el => el.hidden = !show || data.pro || native);
  if (!native || !ready) return;
  try {
    if (show && !data.pro && !bannerShown) {
      await AdMob.showBanner({ adId: platform === 'ios' ? CONFIG.admob.bannerIOS : CONFIG.admob.bannerAndroid, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 64, isTesting: CONFIG.admob.testing });
      bannerShown = true;
    } else if ((!show || data.pro) && bannerShown) { await AdMob.removeBanner(); bannerShown = false; }
  } catch (e) { /* no fill */ }
}

// Call after a finished game. Shows a full-screen ad every few games.
export async function afterGame() {
  if (!native || !ready || data.pro) return;
  finished++;
  if (finished % CONFIG.admob.interstitialEvery !== 0) return;
  try {
    await AdMob.prepareInterstitial({ adId: platform === 'ios' ? CONFIG.admob.interstitialIOS : CONFIG.admob.interstitialAndroid, isTesting: CONFIG.admob.testing });
    await AdMob.showInterstitial();
  } catch (e) { /* no fill */ }
}
