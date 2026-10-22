// Ads: AdMob in the iOS/Android build, a small Pro promo card on the website. Pro removes both.
import { CONFIG } from './config.js';
import { data } from './state.js';

const cap = window.Capacitor;
const platform = cap?.getPlatform?.() || 'web';
const native = !!cap?.isNativePlatform?.();
let AdMob = null, ready = false, bannerShown = false, finished = 0, interstitialLoaded = false, privacyOptions = false;

export async function initAds() {
  if (!native || data.pro) return;
  try {
    AdMob = cap.registerPlugin('AdMob');
    await AdMob.initialize({ initializeForTesting: CONFIG.admob.testing });
    // Google's consent form (EEA, UK, Switzerland). Shows only where required and only once a GDPR message is published in AdMob.
    let consent = await AdMob.requestConsentInfo();
    if (consent.status === 'REQUIRED' && consent.isConsentFormAvailable) consent = await AdMob.showConsentForm();
    privacyOptions = consent.privacyOptionsRequirementStatus === 'REQUIRED';
    if (platform === 'ios') {
      const st = await AdMob.trackingAuthorizationStatus();
      if (st.status === 'notDetermined') await AdMob.requestTrackingAuthorization();
    }
    if (!consent.canRequestAds) return;
    // Pad the page by the banner's height so it never covers buttons.
    AdMob.addListener('bannerAdSizeChanged', size => document.documentElement.style.setProperty('--ad', `${size.height || 0}px`));
    ready = true;
    loadInterstitial();
  } catch (e) { console.warn('Ads unavailable', e); }
}

// True where Google requires a way to change ad consent (shown in the Shop).
export const hasPrivacyOptions = () => privacyOptions;
export async function showPrivacyOptions() {
  try { await AdMob.showPrivacyOptionsForm(); } catch (e) { console.warn('Privacy options unavailable', e); }
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
    } else if ((!show || data.pro) && bannerShown) {
      await AdMob.removeBanner(); bannerShown = false;
      document.documentElement.style.setProperty('--ad', '0px');
    }
  } catch (e) { /* no fill */ }
}

// Loaded ahead of time so the ad opens the moment a game ends, never seconds later in the next game.
async function loadInterstitial() {
  try {
    await AdMob.prepareInterstitial({ adId: platform === 'ios' ? CONFIG.admob.interstitialIOS : CONFIG.admob.interstitialAndroid, isTesting: CONFIG.admob.testing });
    interstitialLoaded = true;
  } catch (e) { /* no fill */ }
}

// Call after a finished game. Shows a full-screen ad every few games.
export async function afterGame() {
  if (!native || !ready || data.pro) return;
  finished++;
  if (finished % CONFIG.admob.interstitialEvery !== 0) return;
  if (!interstitialLoaded) { loadInterstitial(); return; }
  interstitialLoaded = false;
  try { await AdMob.showInterstitial(); } catch (e) { /* expired */ }
  loadInterstitial();
}
