# Publishing Cube Coach on Google Play

Do the accounts first: verification can take several days, so start them before anything else.
Each step that says **you** needs your identity, payment details or your phone.
Researched gaps, decisions and code fixes are in [PLAY_LAUNCH_CHECKLIST.md](PLAY_LAUNCH_CHECKLIST.md); read its section 1 before setting up payments.

## Timeline at a glance
| Week | What happens |
|---|---|
| 1 | Accounts created and verified. Test APK on your phone. Upload key made. First closed release sent for review (up to 7 days for new accounts). |
| 2 to 4 | Closed test runs with at least 12 testers opted in for 14 days in a row (required for new personal accounts). Ship 1 or 2 updates from their feedback. |
| 4 to 5 | Apply for production access; Google reviews (usually 7 days or less). |
| 5 to 6 | Production release reviewed, then public. If production access is refused, add 2 to 3 weeks. |

## Part A. Accounts (you)

### 1. Google Play developer account ($25 once)
1. Go to https://play.google.com/console/signup and sign in with the Google account that will own the app.
2. Choose **Yourself** (personal account). An organization account needs a D-U-N-S number, which takes longer.
3. Pay the $25 fee and complete identity verification (government ID, phone number). Google also asks you to confirm you have an Android device.
4. New personal accounts must run a **closed test with at least 12 testers opted in for 14 continuous days** before they can publish to everyone. The 12 must still be opted in on the day you apply, and a tester who leaves and rejoins starts their 14 days again. Line up 15 to 20 people now (family, colleagues, friends with Android phones) so dropouts don't reset you.
5. Under **Settings > Developer account > Account details**, check that your contact email and phone show as verified.

### 2. Payments profile (needed to sell Pro and coins)
Monetizing makes your **full address public** on the listing; decide which address to use first (checklist 1.1).
In Play Console: **Settings > Payments profile**. Egypt is supported:
- Country Egypt (cannot be changed later), legal name exactly as on your ID and bank account, a street address (no PO box).
- Bank account in your own name, in Egypt. A USD account is preferred: Google pays by USD wire once you have earned at least US$100, around the 15th of the next month. Raise the payout threshold to about US$300 so one bank fee covers several months.
- **US tax info:** submit the W-8BEN as an individual, or Google may withhold 24 to 30% of US earnings. It must be renewed every 3 years.
- **15% fee:** go to **Settings > Developer account > Associated developer accounts**, create an Account Group with just your account, then **Review and enroll**. Do it before the first sale: it is not automatic and not retroactive (otherwise the fee is 30%).
- Google charges Egyptian VAT to buyers in Egypt, and adds 14% VAT to its own fee unless you are VAT-registered.

### 3. RevenueCat (free tier, handles purchases)
1. Sign up at https://app.revenuecat.com and create a project called Cube Coach.
2. Add a **Google Play** app with package name `com.zeecorp.cubecoach`.
3. Follow RevenueCat's guide "Google Play service credentials" to create a Google Cloud service account and grant it access in Play Console (Users and permissions). Upload its JSON key to RevenueCat. It can take up to 36 hours to start working.
4. After the products exist in Play (Part C, step 6), import them in RevenueCat (Product catalog > Products). Set `cubecoach_pro` to **Non-consumable** and `cubecoach_coins_1000` to Consumable: Play has no such setting, and a Pro purchase that RevenueCat consumes can never be restored. Then create an entitlement named `pro` and attach `cubecoach_pro` to it.
5. Copy the **public Android SDK key** (starts with `goog_`) into `www/js/config.js` as `revenueCatKeyAndroid`. The same commit must include the `getProducts` fix in checklist 2.1, or no product loads.
6. Real-time notifications: in RevenueCat's Google Play app settings click **Connect to Google** and copy the Pub/Sub topic. In Play Console go to **Monetize with Play > Monetization setup > Real-time developer notifications**, paste it, then **Send test notification** and confirm RevenueCat shows it as received. This is how refunds and pending purchases reach the app.

### 4. AdMob (free, shows ads)
1. Sign up at https://admob.google.com with the same Google account. Do it early: account verification can take up to 2 weeks.
2. Add an Android app (choose "not published yet"), then create one **Banner** and one **Interstitial** ad unit.
3. Put the app id in `android/app/src/main/AndroidManifest.xml` (replace the test id after `APPLICATION_ID`) and the two unit ids in `www/js/config.js`. Keep `admob.testing: true` in **every closed-test build**, and set it to `false` only for the AAB that goes to Production. You and your testers must never tap live ads: AdMob treats it as invalid traffic and can disable the account.
   - **Blocking controls > Content:** set the maximum ad content rating to PG (the app also caps it in code) and block gambling, dating and alcohol.
   - **Payments:** AdMob pays Egyptian accounts in EGP by wire once you reach EGP 5,000. A PIN is posted to your address after US$10, so use a Cairo address that reliably gets mail. Submit the W-8BEN under **Payments > Settings > United States tax info**, declaring no US activities.
4. **Privacy & messaging > European regulations:** create a GDPR message for the app (use the privacy policy URL below) and publish it. The app already shows this consent form where it is required (Switzerland at launch, and the EEA and UK if they are added later) and adds "Ad privacy choices" to the Shop; without a published message no form appears and AdMob serves only limited ads there.
5. After the app is live, link it to the Play listing in AdMob and add an `app-ads.txt` (AdMob shows the line). The file must sit at the root of the website domain on the Play listing, so for `zee9999.github.io` it goes in a `zee9999.github.io` repository, not in `cube-coach`. AdMob's app review starts only once the listing is public, so expect limited ads for the first 2 to 3 days.

## Part B. First Android build

### 1. Test build on your phone (today, no installs on your PC)
Every push to GitHub builds a test APK in the cloud.
1. Open https://github.com/zee9999/cube-coach/actions/workflows/android.yml and click the latest green run.
2. Under **Artifacts**, download `cube-coach-test-apk` (a zip). Unzip it to get `app-debug.apk`.
3. Send it to your Android phone, open it and allow "install unknown apps" for your file manager when asked.
4. Test: live camera scan, a game, a lesson. Purchases are switched off in this build on purpose.

### 2. Create your upload key (you, once)
Google signs the final app with its own key (Play App Signing). You sign uploads with an **upload key** that only you hold.

1. Install a Java 21 JDK (needed for `keytool`), for example:
   ```bash
   winget install EclipseAdoptium.Temurin.21.JDK
   ```
   Or install Android Studio, which also gives you an emulator.
2. In a folder **outside** the project (for example `D:\Keys`), run:
   ```bash
   keytool -genkeypair -v -keystore cubecoach-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
   Choose a strong password when asked and store it, plus a copy of the `.jks` file, in your password manager **and** an encrypted offline copy. If you lose it, an account owner requests an upload key reset in Play Console under Play app signing (it takes about 2 days).

### 3. Give the cloud build your key (you)
In PowerShell, from the folder that holds the `.jks`:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("cubecoach-upload.jks")) | gh secret set CC_KEYSTORE_BASE64 --repo zee9999/cube-coach
```
```powershell
gh secret set CC_KEY_ALIAS --body upload --repo zee9999/cube-coach
```
```powershell
gh secret set CC_KEYSTORE_PASSWORD --repo zee9999/cube-coach
```
```powershell
gh secret set CC_KEY_PASSWORD --repo zee9999/cube-coach
```
The last two prompt you to paste the password (same password for both unless you chose different ones). Secrets are encrypted and never shown in logs.

### 4. Build the release bundle
```bash
gh workflow run android.yml --repo zee9999/cube-coach
```
When the run is green, download the `cube-coach-release-aab` artifact. That `.aab` is what you upload to Play.
Each run gets a higher version code automatically, so every upload is accepted. Start a new run for every upload: **Re-run** keeps the old run number, and Play rejects a version code it has already seen.

## Part C. Play Console setup (you)
1. **Create app: done 2026-10-23.** "Cube Coach: Scan & Solve", English (United States), Game, Free, package **`com.zeecorp.cubecoach`** (`com.cubecoach.app` was already taken on Play, so the Android application ID was changed to match). Creating it registered the package to your account for Android developer verification.
   - **Store listing contact details** (Grow users > Store presence > Store settings): a contact email is required. Use zee9x9@gmail.com (the same address as the privacy policy), and set the website to https://zee9999.github.io/cube-coach/.
2. **Declarations** (when creating the app): tick all three.
   - Developer Program Policies: the app is checked against them (camera on device only, ads only between screens, Play Billing for purchases, no "Rubik's" wording).
   - Play App Signing: Google keeps the app signing key; you sign uploads with your upload key (Part B, step 2).
   - US export laws: the app uses only the standard HTTPS built into Android and Google's SDKs, which is exempt. Nothing to file.
3. **App content** (Policy > App content):
   - Privacy policy: https://zee9999.github.io/cube-coach/privacy.html
   - Ads: Yes, contains ads.
   - App access: all functionality is available without special access.
   - Content rating: fill in the questionnaire. No violence, no user-generated content, no user interaction, no location sharing; digital purchases: yes. Expect "Everyone" / PEGI 3.
   - Target audience: tick only **13-15, 16-17 and 18+**. "Could your app unintentionally appeal to children?" No. Ticking any age under 13 puts the app in the Families program, which needs child-safe ad settings this build doesn't use.
   - Advertising ID: Yes. Purposes: Advertising or marketing, Analytics, Fraud prevention, security and compliance.
   - Data safety (matches the privacy policy; Google's and RevenueCat's own disclosure guides):
     - Collects or shares required data: Yes. Encrypted in transit: Yes. Account creation: "My app does not allow users to create an account". Users can request deletion: Yes (via the support email in the privacy policy).
     - For every data type below: processed ephemerally **No**, and collection is required (not optional).
     - Location > Approximate location: collected and shared, not optional. Purposes: Advertising or marketing, Analytics, Fraud prevention, security and compliance. (AdMob, from the IP address.)
     - App activity > App interactions: collected and shared, same three purposes. (AdMob.)
     - App info and performance > Diagnostics: collected and shared, same three purposes. (AdMob.)
     - Device or other IDs: collected and shared, same three purposes. (AdMob advertising ID.)
     - Financial info > Purchase history: collected, not shared, required. Purposes: App functionality, Analytics. (RevenueCat.)
     - Photos and videos: **do not** declare. Camera frames are processed on the device and never leave it.
   - Foreground service, health, financial features, news, government: none or not applicable.
4. **Store listing:** copy the text from `docs/store-listing.md`. Upload `resources/play-icon-512.png`, `resources/feature-graphic-1024x500.png`, and the five phone screenshots in `resources/store/play-phone/`.
5. **Closed testing:** Testing > Closed testing > Create track. Upload the `.aab`, accept Play App Signing, add your testers as a Google Group, set a feedback email, choose the production countries (step 8), then send for review. The opt-in link appears once the release is Published. Share only that link (not the CI debug APK) and ask testers to stay opted in until you say production access is granted. Track each tester's opt-in date. The closed test playbook is in checklist section 4.
6. **Products:** once an `.aab` is uploaded, go to **Monetize with Play > Products > One-time products** and create both products, each with one "Buy" purchase option. Product IDs can never be changed or reused. Set each product's age rating (required for Texas users).
   - `cubecoach_pro`: Cube Coach Pro, $2.99 (set as non-consumable in RevenueCat, Part A step 3.4)
   - `cubecoach_coins_1000`: 1,000 coins, $0.99 (consumable)
7. **License testing:** go to **Settings > License testing**, add the same Google Group, and save. Testers who are not license testers pay real money. Then finish RevenueCat (Part A, steps 3.4 to 3.6) and AdMob ids, push, build again, and upload the new `.aab` to the closed test so testers can try purchases.
8. **Countries** (Test and release > Production > Countries/regions): add all, then remove the 27 EU countries, Iceland, Liechtenstein, Norway, the United Kingdom, Vietnam and Türkiye (checklist 1.2). Testing tracks follow these countries.
9. **Age signals** (Play Console > Age signals): keep the default age ranges (0-12, 13-15, 16-17, 18+). The app turns ads off for anyone Play reports as under 18.
10. **Production:** once 12+ testers have been opted in for 14 days in a row (apply around day 16 or 17 to be safe), Play Console unlocks "Apply for production". Answer the questions about your test from your test log. Google usually reviews within 7 days. The first production release always goes to 100% of the chosen countries.

## Before every release
- `npx cap sync` after changing anything in `www/` (the cloud build does this for you).
- Test on a real phone.
- Keep `admob.testing: true` for test and closed-test builds and `false` only for the production release.
- If the release changes SDKs or what data the app sends, update Data safety and the privacy policy first.
