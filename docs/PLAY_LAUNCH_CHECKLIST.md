# Google Play launch checklist

Researched 2026-10-23 against Google, AdMob and RevenueCat documentation. This checks [ANDROID_RELEASE.md](ANDROID_RELEASE.md) and the code against the rules in force today and lists what is missing or wrong. Each item was checked by two independent reviewers, and the sources behind the blockers were re-read by hand.

**You** = account or console work. **Code** = a change in this repo.

## 1. Decisions to make first

### 1.1 Your full address goes public if you sell anything
Personal accounts show your legal name, country and developer email on Google Play. Once you monetize (Pro or coins), Google also shows your **full address**, taken from the payments profile. Ads alone do not make you a merchant. Japan also shows the seller's name, phone and address for apps with in-app purchases.
Pick one before creating the payments profile:
- **A.** Accept it.
- **B.** Use an address you can legally use and prove, such as a registered business or office address. Documents must match the payments profile.
- **C.** Ship v1 with ads only and add Pro and coins in an update.

Whichever you pick, set a brand developer name (for example "Cube Coach") under Settings > Developer account > About you. Google reviews name changes before they appear.
Sources: [Required account information](https://support.google.com/googleplay/android-developer/answer/13628312), [Developer account information](https://support.google.com/googleplay/android-developer/answer/13634081).

### 1.2 Which countries at launch (privacy and teen laws)
Targeting 13+ means teens will use the app, and several markets now regulate that:

| Market | What it requires of you | Source |
|---|---|---|
| EEA and UK | An EU and a UK **GDPR representative**, because you sell to and show personalised ads to their users from outside the EU. That costs about EUR 420 to 950 a year per region. Parental consent applies below 13 to 16 depending on the country, and the UK Children's Code expects profiling ads to be off by default for under-18s. | [GDPR Art. 27](https://gdpr-info.eu/art-27-gdpr/), [Art. 8](https://gdpr-info.eu/art-8-gdpr/) |
| United States | **Texas SB 2420 is in effect.** A federal appeals court stayed the December 2025 injunction. You must take in age range and parental approval signals from the store, and in-app products may need their own age rating, which is set in Play Console. Google does not force the Age Signals API but says compliance is your responsibility. Similar laws are coming in other states. | [Play Help: US state age laws](https://support.google.com/googleplay/android-developer/answer/16569691) |
| Brazil | **Digital ECA** (enforced since 17 Mar 2026): apps likely used by adolescents must take in age-range data from the store. Loot boxes are banned (the app has none). No profiling ads to minors. | [Play: Brazil requirements](https://support.google.com/googleplay/android-developer/answer/6223646#digital_eca_requirements) |
| Vietnam | Games need a licence under Decree 147/2024 if they count as an "online electronic game". Cube Coach is offline, so leaving Vietnam out is caution, not a clear requirement. | [Play: country requirements](https://support.google.com/googleplay/android-developer/answer/6223646) |
| Turkey | Foreign data controllers may need VERBIS registration and a local representative. This was not confirmed from a primary source. | [KVKK](https://www.kvkk.gov.tr/) |
| South Korea, Japan, everywhere else | Nothing extra found. The Korean business-number rule applies only to Korean developers. | [Play: country requirements](https://support.google.com/googleplay/android-developer/answer/6223646) |

The US and Brazil both need the same code (section 2.2), so the realistic options are:
- **A. Recommended:** build the age handling, launch everywhere except the EEA, UK, Vietnam and Turkey, and add the EEA and UK once revenue covers a representative.
- **B.** Everywhere, with the age handling plus EU and UK representatives from day one.
- **C.** Everywhere, without representatives. Enforcement against tiny non-EU apps is rare, but this is a legal gap you would be choosing to carry.

### 1.3 Category: Game > Puzzle
[store-listing.md](store-listing.md) already says Games > Puzzle, and ANDROID_RELEASE.md now matches. As a game:
- `android:appCategory="game"` keeps the portrait lock on tablets (section 2.3).
- The February 2027 DEX-optimization rule starts at 50 MB for games. The app has 29 MB, so it does not apply. For an App, the threshold would be 10 MB and you would need R8.
- Free games are listed on Google Play Games on PC by default (opt-out in Console).
- The content rating may come out as PEGI 7 because of the daily challenge.

Sources: [Category and tags](https://support.google.com/googleplay/android-developer/answer/9859673), [Technical quality requirements](https://support.google.com/googleplay/android-developer/answer/17492799), [Content rating](https://support.google.com/googleplay/android-developer/answer/9898843).

## 2. Code changes

### 2.1 Before the first closed-test build
- **Fixed 2026-10-23: products never loaded.** `Purchases.getProducts` defaults to subscriptions on Android (`definitions.d.ts:10`, `PurchasesPlugin.kt:231`), so `cubecoach_pro` and `cubecoach_coins_1000` would never load and every Buy tap would say the item isn't available. [store.js](../www/js/store.js) now passes `type: 'NON_SUBSCRIPTION'` (iOS ignores it) and retries when the shop opens.
- **Fixed 2026-10-23: shop showed prices it could not sell.** In the store builds the shop now shows "Unavailable" and disables Buy until the store returns the product, instead of the hard-coded "$2.99"/"$0.99". In-app prices must match Play's billing sheet. Still open: hide Buy and Restore in builds where `revenueCatKeyAndroid` is empty. [Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738).
- **Fixed 2026-10-23: pending payments.** A pending payment (RevenueCat error code 20) used to show "You were not charged" and never credit the coins. It now says "Payment pending". Coins are credited when the payment completes, by counting coin-pack purchases in `customerInfo.nonSubscriptionTransactions` at launch and in `addCustomerInfoUpdateListener`, so each pack is credited once. Test this with the "slow test card" (section 4). [RevenueCat errors](https://www.revenuecat.com/docs/test-and-launch/errors).
- **Fixed 2026-10-23: back button.** Back used to send the app to the background from every screen, and on Android 16 with targetSdk 36 the old back callbacks are not called at all. With `@capacitor/app` 8.1.2, back now steps through: close sheet, then leave the game (asks first while a game is running) or the lesson, then the solve step, then the Solve tab, then minimize. The Privacy link uses the absolute URL, so it opens in the browser instead of trapping the user in the WebView. [Android 16 behaviour changes](https://developer.android.com/about/versions/16/behavior-changes-16), [Functionality policy](https://support.google.com/googleplay/android-developer/answer/9898783).
- **Fixed 2026-10-23: privacy policy ([privacy.html](../www/privacy.html)).**
  - It now names the developer (Zeyad Sherif Ibrahim Noureldin, Cairo, Egypt) and gives zee9x9@gmail.com for requests. GitHub issues are kept for bug reports only.
  - It has the GDPR items: legal basis per data type, recipients, transfers, retention, rights and the right to complain.
  - It says app data can be included in the phone's own backup.
  - It discloses Google Fonts and GitHub Pages hosting. Self-hosting the fonts would remove the Google Fonts disclosure and make the fonts work offline.

  Sources: [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311), [GDPR Art. 13](https://gdpr-info.eu/art-13-gdpr/), [Auto Backup](https://developer.android.com/identity/data/autobackup).
- **Code: release guard.** Make CI fail the signed release build while `revenueCatKeyAndroid` is empty.
- **Code: splash screen.** The launch screen is still the Capacitor template. Generate branded assets or set a solid `#0e1115` background. [Splash screens](https://developer.android.com/develop/ui/views/launch/splash-screen).

### 2.2 Before production
- **Code: age handling (needed for the US and Brazil, see 1.2).**
  - Add Play Age Signals (`com.google.android.play:age-signals:0.0.4`, beta) as a small local Capacitor plugin registered in `MainActivity`.
  - Fall back to a neutral year-of-birth question.
  - For under-18s, request non-personalised ads through the Mobile Ads SDK's age-restricted treatment (SDK 25.3+, which replaced the under-age-of-consent tag) and `npa`.
  - Use the signal only for compliance, never for ads or analytics.

  Sources: [Age Signals](https://developer.android.com/google/play/age-signals/request-age-signals), [Capacitor custom code](https://capacitorjs.com/docs/android/custom-code).
- **Code: consent before ads.** Initialise the Mobile Ads SDK only after the consent form and `canRequestAds`. Today `initialize` runs first in [ads.js](../www/js/ads.js). [AdMob quick start](https://developers.google.com/admob/android/quick-start).
- **Code: interstitial gap.** Skip the interstitial if one showed less than about 120 seconds ago, and set a frequency cap on the ad unit in AdMob. [AdMob interstitial guidance](https://support.google.com/admob/answer/6201362).
- **Code: banner spacing.** The banner sits flush on the tab bar, the placement AdMob names as a top cause of accidental clicks. Add a 12px non-tappable strip between them. [AdMob banner guidance](https://support.google.com/admob/answer/6275345).
- **Code: licences page.** The vendored cubejs solver ships without its MIT notice, and the app has no open-source notices. Add `www/licenses.html` covering cubejs (and the Kociemba credit), three.js, Capacitor, the AdMob and RevenueCat plugins, plus AndroidX (Apache-2.0). [cubejs licence](https://raw.githubusercontent.com/ldez/cubejs/master/LICENSE), [Google open-source notices](https://developers.google.com/android/guides/opensource).
- **Code: the free website gives Pro away.** Demo mode grants Pro with no ads, and it is the listing's Website link. Replace the demo grant with a "Get it on Google Play" sheet. [Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738).

### 2.3 Small fixes and checks
- **Code:** add `android:appCategory="game"` to `<application>`. Without it, Android 16 ignores the portrait lock on screens 600dp and wider. Check a Pixel Tablet emulator anyway. [Android 16 behaviour changes](https://developer.android.com/about/versions/16/behavior-changes-16).
- **Code:** check the banner position on Android 15 and 16 with 3-button navigation. On Android 15+ the AdMob plugin's inset handler replaces Capacitor's, which can leave a gap. [System Bars](https://capacitorjs.com/docs/apis/system-bars).
- **Code:** pin `playServicesAdsVersion` (it floats on `25.4.+`) so every build uses the same SDK. [Mobile Ads deprecation schedule](https://developers.google.com/admob/android/deprecation).
- **Code:** release AABs are downloadable by any GitHub user while the repo is public. Set `retention-days: 1` on the AAB artifact and delete it after downloading. Never make the repo private or rename it without first moving the privacy page: GitHub Free unpublishes Pages for private repos.
- **You:** start a new CI run (`gh workflow run`) for each upload. "Re-run" keeps the same run number, so Play rejects the duplicate versionCode. [Versioning](https://developer.android.com/studio/publish/versioning).

## 3. Accounts and Play Console (you), in order

1. **Create the app now.** Use Game, Free. Creating it registers `com.cubecoach.app` to you automatically (Android developer verification, mandatory for Play apps since 30 Sep 2026). Then check that Play Console's Android developer verification page shows it as registered. [Verification: Play Console](https://developer.android.com/developer-verification/guides/google-play-console).
2. **Support email (required).** Use zee9x9@gmail.com, the address in the privacy policy, as the developer email and under Grow users > Store presence > Store settings > Store listing contact details. The listing cannot be saved without it. [Store settings](https://support.google.com/googleplay/android-developer/answer/9859152).
3. **Payments profile (Egypt is supported).**
   - Payouts come by **USD wire**: US$100 minimum, around the 15th for the previous month, with bank fees from US$0 to 50+.
   - The bank account must be in your exact legal name; a USD account is preferred. The country is permanent, and PO boxes are not allowed.
   - Raise the payout threshold to about US$300 so one wire fee covers several months.

   Sources: [Supported locations](https://support.google.com/googleplay/android-developer/table/3539140), [Wire payouts](https://support.google.com/googleplay/android-developer/answer/2700656), [Bank details](https://support.google.com/paymentscenter/answer/7161440), [Payout threshold](https://support.google.com/paymentscenter/answer/7163445).
4. **US tax form W-8BEN** in the payments profile. Without it, Google may withhold 24 to 30% of US earnings. The form must be refreshed every 3 years. [Merchant tax info](https://support.google.com/googleplay/android-developer/answer/7163598), [Withholding](https://support.google.com/paymentscenter/answer/10349995).
5. **15% service fee: enroll before the first sale.**
   - Settings > Developer account > Associated developer accounts > create the Account Group (just your account) > Review and enroll. It is not automatic and not retroactive. Without it you pay 30%.
   - Users in the EEA, UK and US are on a newer fee model since 30 Jun 2026: a service fee plus a 5% billing fee. Check the rates in Console.
   - Google collects VAT from Egyptian buyers, and it adds 14% Egyptian VAT to its own fee unless you are VAT-registered.

   Sources: [Account Group](https://support.google.com/googleplay/android-developer/answer/10632485), [Service fees](https://support.google.com/googleplay/android-developer/answer/112622), [Tax rates](https://support.google.com/googleplay/android-developer/answer/138000).
6. **AdMob.**
   - Create the account now; verification can take up to 2 weeks.
   - Payouts in Egypt are in **EGP** (since May 2025) by wire: identity check at $0, an address PIN posted at $10, and payment at **EGP 5,000**. Use a mail-deliverable Cairo address.
   - Submit W-8BEN in AdMob too, declaring no US activities.
   - Set the maximum ad content rating to G and block gambling, dating and alcohol.
   - The app readiness review only starts once the Play listing is public, so expect limited ads for 2 to 3 days after launch.

   Sources: [AdMob thresholds](https://support.google.com/admob/answer/2772208), [AdMob US tax info](https://support.google.com/admob/answer/2772513), [App readiness](https://support.google.com/admob/answer/10564477), [Ads and content rating](https://support.google.com/googleplay/android-developer/answer/9857753).
7. **RevenueCat.**
   - Follow the service-credentials guide.
   - Connect **real-time developer notifications** (Pub/Sub), so refunds and pending purchases reach RevenueCat.
   - Set `cubecoach_pro` to **Non-consumable** and coins to Consumable in the RevenueCat product catalog. Play has no such flag, and an unflagged Pro gets consumed and can never be restored (Play Billing 8 cannot see consumed purchases).

   Sources: [Service credentials](https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials), [Google notifications](https://www.revenuecat.com/docs/platform-resources/server-notifications/google-server-notifications), [Non-consumables](https://www.revenuecat.com/docs/getting-started/entitlements/android-products).
8. **Products.** Go to Monetize with Play > Products > One-time products, and give each product a "Buy" purchase option. Product IDs can never be changed or reused. Set each product's age rating (Texas). [One-time products](https://support.google.com/googleplay/android-developer/answer/16430488).
9. **License testing.** Add the testers' Google Group under Settings > License testing. Otherwise closed testers pay real money. [Testing billing](https://developer.android.com/google/play/billing/test).
10. **Data safety.** The answers in ANDROID_RELEASE.md are right in substance. Also answer:
    - "My app does not allow users to create an account".
    - Processed ephemerally: No, for every ad data type.
    - Deletion requests: via the support email.

    [AdMob data disclosure](https://developers.google.com/admob/android/privacy/play-data-disclosure).
11. **Store listing.**
    - The short description was 81 characters, over the 80 limit. It is now "Cube solver by camera: follow animated moves, then play and learn 2x2 to 7x7." (77) in [store-listing.md](store-listing.md).
    - Nothing in the title or short description says "cube solver", the phrase people search. For example: "Cube Coach: Camera Cube Solver" (30).
    - Keep "Rubik's" and "Rubix" out of everything, translations included.

    Sources: [Listing limits and metadata](https://support.google.com/googleplay/android-developer/answer/13393723), [IP policy](https://support.google.com/googleplay/android-developer/answer/9888072).
12. **Countries:** as decided in 1.2. If Play asks for Brazil merchant details, provide them, or Brazil payments can be withheld.
13. **Managed publishing:** turn it on once the closed release is live, so the approved production release goes out when you choose. The first production release always goes to 100% (no staged rollout); later updates can be staged. [Staged rollouts](https://support.google.com/googleplay/android-developer/answer/6346149).

## 4. Closed test playbook

- **The rule:** at least 12 testers opted in **continuously** for the 14 days before you apply. A tester who leaves and rejoins restarts their own count. Recruit 15 to 20, log each opt-in date, and apply about day 16 or 17 after the 12th opt-in. [Testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465).
- **Setup:**
  - Add a Google Group as the testers, set a feedback email, and choose all countries.
  - The opt-in link appears only once the closed release is Published.
  - Give testers only the opt-in link. A sideloaded CI debug APK has a different signing key and blocks the Play install.
  - Don't also put testers on internal testing.

  [Closed testing setup](https://support.google.com/googleplay/android-developer/answer/9845334).
- **Engagement counts, not just headcount:**
  - Send testers a short task list: scan, play a 3x3 and a 5x5, two lessons, the daily challenge, and a test purchase in week 2.
  - Ship two updates during the test that fix their feedback.
  - Use the pre-launch report.
  - Don't use paid tester farms or review swaps. [Pre-launch report](https://support.google.com/googleplay/android-developer/answer/9842757).
- **Ads during the test:** keep `admob.testing: true` in every closed-test build, even with the real IDs. Testers must never tap live ads, because self-clicks can get the AdMob account disabled. [Invalid traffic](https://support.google.com/admob/answer/3342099).
- **Purchase test (license tester):**
  - The shop shows Play's local price.
  - Buy Pro.
  - Buy Pro again: Play says you already own it.
  - Uninstall, reinstall, then Restore.
  - Coins with the "slow test card" (pending, then credited).
  - A declined card.
- **The production access form** asks about your closed test (how recruiting went, whether testers used all features, a feedback summary and how you collected it), your app (specific target audience, value, first-year installs estimate), and readiness (changes made from the test, how you decided it was ready). Keep a dated log from day 1 so the answers have numbers. If refused, test about 14 more days, fix, and reapply.
- **Realistic timeline:** about 5 to 6 weeks.
  1. Closed release review (up to 7 days).
  2. 14+ days of testing.
  3. Production access review (usually up to 7 days).
  4. Production release review.

  [Review times](https://support.google.com/googleplay/android-developer/answer/9859654).

## 5. Launch day
- Before installing the production build: register your phone as an AdMob test device and never tap live ads.
- Build the production AAB with `admob.testing: false` and the real IDs.
- Publish `app-ads.txt` at `https://zee9999.github.io/app-ads.txt` (needs a public `zee9999.github.io` repo). Link the app in AdMob once the listing is public.

## 6. After launch
- **Target API:** 36 is fine now. Target 37 by about 31 Aug 2027. [Target API](https://support.google.com/googleplay/android-developer/answer/11926878).
- **Play Billing:** the app ships Billing Library 8.3.0, which meets today's rule (8+). Version 9 is required for updates from 31 Aug 2027, so update RevenueCat before then. [Billing deprecation](https://developer.android.com/google/play/billing/deprecation-faq).
- **Data safety and the privacy policy** must be updated before any release that changes SDKs or data flows. Watch Play's SDK Index warnings. [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469), [SDK Index](https://support.google.com/googleplay/android-developer/answer/10358880).
- **Account standing:** read every Play policy email and act before its deadline. One personal account means one strike history. Accounts with under 1,000 installs, unverified contacts and no Console use for 180 days are closed. [Account standing](https://support.google.com/googleplay/android-developer/answer/9899234).
- **Upload key:** keep the `.jks` and passwords in the password manager plus an encrypted offline copy. If lost, request an upload key reset in Play Console (about 48 hours). [App signing](https://support.google.com/googleplay/android-developer/answer/9842756).
- **Refunds:** users can get a refund from Google within 48 hours. After that, refund in Order management with **Refund + revoke**, so RevenueCat removes Pro.
- **The privacy URL must stay live:** add an uptime check or a monthly reminder.
- **Reviews:** an in-app review prompt in v1.1 after a positive moment, never tied to coins. Reply to reviews. An Arabic listing is cheap reach in MENA (keep "روبيك" out). [In-app review](https://developer.android.com/guide/playcore/in-app-review).

## 7. Already right (no action)
AAB, Play App Signing and the upload key flow. Target API 36. Billing Library 8.3.0. **No native libraries, so the 16 KB page-size rule is met** (checked in the CI APK). Edge-to-edge insets via CSS. Target audience 13+ with no child-appeal graphics. Ads, Advertising ID and camera declarations. Camera frames are not declared, because they never leave the device. Graphics meet the specs. No "Rubik's" anywhere. UMP consent form and "Ad privacy choices".

## 8. What to expect
Rough estimate from public ad benchmarks: about **USD 10 per 1,000 monthly active users per month**, so likely USD 10 to 50 a month at first. The first AdMob payout comes only after EGP 5,000. Paid install campaigns will not pay back. Useful first targets are leading indicators: installs, rating 4.3+, and day-to-day retention.
