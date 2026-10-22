// Age signals from Google Play (Android only), as US state app-store laws and Brazil's Digital ECA require.
// Users under 18 get no ads (ads.js). The answer is used for nothing else and only the derived result is kept,
// in the app's data on this device.
import { data, update } from './state.js';

const cap = window.Capacitor;
const AgeSignals = cap?.isNativePlatform?.() && cap.getPlatform() === 'android' ? cap.registerPlugin('AgeSignals') : null;
const DAY = 86400000;

// The last minor result Play gave on this device: 'child', 'teen' (also for unverified where the law requires it) or null.
export function savedMinor() {
  const s = data.age?.state;
  return s === 'child' ? 'child' : s === 'teen' || s === 'verify' ? 'teen' : null;
}

// Resolves 'child' (under 13), 'teen' (13 to 17), 'adult' or 'unknown'. Never rejects.
export function checkAge() {
  if (!AgeSignals) return Promise.resolve('unknown');
  const saved = data.age || {}, since = Date.now() - (saved.at || 0);
  // Asked again after a month: the Play account on this device can change. Play shows its own prompt
  // to people who haven't chosen whether to share, so someone who declined isn't asked again sooner.
  if (saved.state === 'adult' && since < 30 * DAY) return Promise.resolve('adult');
  if (saved.state === 'declined' && since < 30 * DAY) return Promise.resolve('unknown');
  const fallback = savedMinor() || 'unknown';
  return AgeSignals.check().then(r => {
    const state = r?.state || 'unknown';
    // No answer, or a refusal, never lifts a minor result Play gave earlier.
    if (state === 'unknown' || (state === 'declined' && fallback !== 'unknown')) return fallback;
    update(d => { d.age = { state, at: Date.now() }; });
    // 'verify': age unknown where the law requires verification (for example Texas), so treated as a minor.
    return state === 'verify' ? 'teen' : state === 'declined' ? 'unknown' : state;
  }, () => fallback);
}
