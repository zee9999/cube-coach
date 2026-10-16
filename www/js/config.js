// Store and ad settings. Fill these in before an app store release (see docs/APP_STORE.md).
export const CONFIG = {
  // RevenueCat public SDK keys (Project settings > API keys). Leave empty to disable real purchases.
  revenueCatKeyIOS: '',
  revenueCatKeyAndroid: '',
  // Entitlement identifier configured in RevenueCat that unlocks Pro.
  proEntitlement: 'pro',
  // Product identifiers, created identically in App Store Connect and Google Play Console.
  products: {
    pro: { id: 'cubecoach_pro', title: 'Cube Coach Pro', fallbackPrice: '$2.99' },
    coins: { id: 'cubecoach_coins_1000', title: '1,000 coins', fallbackPrice: '$0.99', coins: 1000 },
  },
  // AdMob. The defaults are Google's public test units: they never pay out. Replace for release.
  admob: {
    testing: true,
    bannerIOS: 'ca-app-pub-3940256099942544/2934735716',
    bannerAndroid: 'ca-app-pub-3940256099942544/6300978111',
    interstitialIOS: 'ca-app-pub-3940256099942544/4411468910',
    interstitialAndroid: 'ca-app-pub-3940256099942544/1033173712',
    interstitialEvery: 3,
  },
  privacyPolicyUrl: 'https://zee9999.github.io/cube-coach/privacy.html',
};
