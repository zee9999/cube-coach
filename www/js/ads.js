// Ads: AdMob in the iOS/Android build, a small Pro promo card on the website. Pro removes both.
// Users Google Play reports as under 18 see no ads at all, so the age answer never leaves the device.
import { CONFIG } from './config.js';
import { data } from './state.js';
import { checkAge, savedMinor } from './age.js';

const cap = window.Capacitor;
const platform = cap?.getPlatform?.() || 'web';
const native = !!cap?.isNativePlatform?.();
let AdMob = null, sdkStarted = false, ready = false, minor = false, privacyOptions = false;
let bannerShown = false, wantBanner = false, bannerOps = Promise.resolve();
let finished = 0, interstitialLoaded = false, lastInterstitial = 0;
// Clear space between the banner and the tab bar, so a tap meant for a tab never lands on the ad.
const BANNER_GAP = 12;
// Never show two full-screen ads less than this far apart, however quickly games end.
const INTERSTITIAL_MIN_GAP_MS = 120000;
// How long to wait for Play's age answer before going by the last answer saved on this device.
const AGE_WAIT_MS = 4000;
const isMinor = state => state === 'teen' || state === 'child';

export async function initAds() {
  if (!native || data.pro) return;
  try {
    AdMob = cap.registerPlugin('AdMob');
    // Google's consent form (Switzerland, and the EEA and UK if added), gathered before the ads SDK starts.
    // Shows only where required and only once a GDPR message is published in AdMob.
    let consent = await AdMob.requestConsentInfo();
    if (consent.status === 'REQUIRED' && consent.isConsentFormAvailable) consent = await AdMob.showConsentForm();
    privacyOptions = consent.privacyOptionsRequirementStatus === 'REQUIRED';
    if (platform === 'ios') {
      const st = await AdMob.trackingAuthorizationStatus();
      if (st.status === 'notDetermined') await AdMob.requestTrackingAuthorization();
    }
    if (!consent.canRequestAds) return;
    const age = checkAge();
    const first = await Promise.race([age, new Promise(r => setTimeout(() => r(null), AGE_WAIT_MS))]);
    minor = isMinor(first ?? savedMinor());
    // A slow answer still counts: stop ads for a minor, or start them if the saved minor result no longer holds.
    age.then(state => { if (isMinor(state)) stopAds(); else if (minor) { minor = false; startAds(); } });
    await startAds();
  } catch (e) { console.warn('Ads unavailable', e); }
}

async function startAds() {
  if (minor || data.pro) return;
  try {
    if (!sdkStarted) {
      sdkStarted = true;
      // ParentalGuidance keeps ads in line with the app's Everyone content rating.
      await AdMob.initialize({ initializeForTesting: CONFIG.admob.testing, maxAdContentRating: 'ParentalGuidance' });
      // Pad the page by the banner's height plus the gap so it never covers buttons.
      AdMob.addListener('bannerAdSizeChanged', size => document.documentElement.style.setProperty('--ad', `${size.height ? size.height + BANNER_GAP : 0}px`));
      AdMob.addListener('interstitialAdShowed', () => { lastInterstitial = Date.now(); });
      // The plugin clears an interstitial when it closes, so the next one is loaded only after that.
      AdMob.addListener('interstitialAdDismissed', () => loadInterstitial());
      AdMob.addListener('interstitialAdFailedToShow', () => loadInterstitial());
    }
    if (minor) return;
    ready = true;
    loadInterstitial();
    syncBanner();
  } catch (e) { console.warn('Ads unavailable', e); }
}

function stopAds() {
  minor = true; ready = false; interstitialLoaded = false;
  syncBanner();
}

// True where Google requires a way to change ad consent (shown in the Shop).
export const hasPrivacyOptions = () => privacyOptions;
export async function showPrivacyOptions() {
  try { await AdMob.showPrivacyOptionsForm(); } catch (e) { console.warn('Privacy options unavailable', e); }
}

// Shows the bottom banner on screens that allow it.
export function banner(show) {
  wantBanner = show;
  document.querySelectorAll('.house-ad').forEach(el => el.hidden = !show || data.pro || native);
  return syncBanner();
}

// One banner change at a time, each ending in the latest wanted state.
function syncBanner() {
  if (!AdMob) return bannerOps;
  bannerOps = bannerOps.then(async () => {
    const want = wantBanner && ready && !minor && !data.pro;
    try {
      if (want && !bannerShown) {
        await AdMob.showBanner({ adId: platform === 'ios' ? CONFIG.admob.bannerIOS : CONFIG.admob.bannerAndroid, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 64 + BANNER_GAP, isTesting: CONFIG.admob.testing });
        bannerShown = true;
      } else if (!want && bannerShown) {
        await AdMob.removeBanner(); bannerShown = false;
        document.documentElement.style.setProperty('--ad', '0px');
      }
    } catch (e) { /* no fill */ }
  });
  return bannerOps;
}

// Loaded ahead of time so the ad opens the moment a game ends, never seconds later in the next game.
async function loadInterstitial() {
  if (!ready || minor || data.pro) return;
  try {
    await AdMob.prepareInterstitial({ adId: platform === 'ios' ? CONFIG.admob.interstitialIOS : CONFIG.admob.interstitialAndroid, isTesting: CONFIG.admob.testing });
    // An ad that finished loading after ads were stopped is never shown.
    if (ready && !minor) interstitialLoaded = true;
  } catch (e) { /* no fill */ }
}

// Call after a finished game. Shows a full-screen ad every few games.
export async function afterGame() {
  if (!native || !ready || minor || data.pro) return;
  finished++;
  if (finished % CONFIG.admob.interstitialEvery !== 0) return;
  if (Date.now() - lastInterstitial < INTERSTITIAL_MIN_GAP_MS) return;
  if (!interstitialLoaded) { loadInterstitial(); return; }
  interstitialLoaded = false;
  try { await AdMob.showInterstitial(); } catch (e) { loadInterstitial(); }
}
