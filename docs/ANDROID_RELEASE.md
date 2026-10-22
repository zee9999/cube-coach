# Publishing Cube Coach on Google Play

Do the accounts first: verification can take several days, so start them before anything else.
Each step that says **you** needs your identity, payment details or your phone.

## Timeline at a glance
| Week | What happens |
|---|---|
| 1 | Accounts created and verified. Test APK on your phone. Upload key made. First closed test live. |
| 1 to 3 | Closed test runs with at least 12 testers for 14 days in a row (required for new personal accounts). |
| 3 | Apply for production access; Google reviews (usually a few days). |
| 3 to 4 | Public release. |

## Part A. Accounts (you)

### 1. Google Play developer account ($25 once)
1. Go to https://play.google.com/console/signup and sign in with the Google account that will own the app.
2. Choose **Yourself** (personal account). An organization account needs a D-U-N-S number, which takes longer.
3. Pay the $25 fee and complete identity verification (government ID, phone number). Google also asks you to confirm you have an Android device.
4. New personal accounts must run a **closed test with at least 12 testers opted in for 14 continuous days** before they can publish to everyone. Line up 12+ people now (family, colleagues, friends with Android phones). Check the exact current rule on the Console dashboard; it has changed before.

### 2. Payments profile (needed to sell Pro and coins)
In Play Console: **Setup > Payments profile**. Add your legal name, address, bank account and tax details.
Confirm that your country is on Google's list of supported merchant countries before relying on in-app sales.

### 3. RevenueCat (free tier, handles purchases)
1. Sign up at https://app.revenuecat.com and create a project called Cube Coach.
2. Add a **Google Play** app with package name `com.cubecoach.app`.
3. Follow RevenueCat's guide "Google Play service credentials" to create a Google Cloud service account and grant it access in Play Console (Users and permissions). Upload its JSON key to RevenueCat. It can take up to 36 hours to start working.
4. After the products exist in Play (Part C, step 6), import them in RevenueCat, create an entitlement named `pro`, and attach `cubecoach_pro` to it.
5. Copy the **public Android SDK key** (starts with `goog_`) into `www/js/config.js` as `revenueCatKeyAndroid`.

### 4. AdMob (free, shows ads)
1. Sign up at https://admob.google.com with the same Google account.
2. Add an Android app (choose "not published yet"), then create one **Banner** and one **Interstitial** ad unit.
3. Put the app id in `android/app/src/main/AndroidManifest.xml` (replace the test id after `APPLICATION_ID`) and the two unit ids in `www/js/config.js`. Set `admob.testing` to `false` only for the release build.
4. **Privacy & messaging > European regulations:** create a GDPR message for the app (use the privacy policy URL below) and publish it. The app already shows this consent form to users in the EEA, UK and Switzerland and adds "Ad privacy choices" to the Shop; without a published message no form appears and AdMob serves only limited ads there.
5. After the app is live, link it to the Play listing in AdMob and add an `app-ads.txt` (AdMob shows the line). It must sit at the root of the website domain on the Play listing, so for `zee9999.github.io` it goes in a `zee9999.github.io` repository, not in `cube-coach`.

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
   Choose a strong password when asked and store it, plus a copy of the `.jks` file, in your password manager or a safe backup. If you lose it you must ask Google support to reset the upload key.

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
Each run gets a higher version code automatically, so every upload is accepted.

## Part C. Play Console setup (you)
1. **Create app:** name "Cube Coach: Scan & Solve", default language English, App (not game) or Game > Puzzle, Free.
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
     - Collects or shares required data: Yes. Encrypted in transit: Yes. Users can request deletion: Yes (via the contact in the privacy policy).
     - Location > Approximate location: collected and shared, not optional. Purposes: Advertising or marketing, Analytics, Fraud prevention, security and compliance. (AdMob, from the IP address.)
     - App activity > App interactions: collected and shared, same three purposes. (AdMob.)
     - App info and performance > Diagnostics: collected and shared, same three purposes. (AdMob.)
     - Device or other IDs: collected and shared, same three purposes. (AdMob advertising ID.)
     - Financial info > Purchase history: collected, not shared, required. Purposes: App functionality, Analytics. (RevenueCat.)
     - Photos and videos: **do not** declare. Camera frames are processed on the device and never leave it.
   - Foreground service, health, financial features, news, government: none or not applicable.
4. **Store listing:** copy the text from `docs/store-listing.md`. Upload `resources/play-icon-512.png`, `resources/feature-graphic-1024x500.png`, and the five phone screenshots in `resources/store/play-phone/`.
5. **Closed testing:** Testing > Closed testing > Create track. Upload the `.aab`, accept Play App Signing, add your testers' emails (or a Google Group), choose countries, then send for review. Share the opt-in link with testers and ask them to keep the app installed for the full 14 days.
6. **Products:** once an `.aab` is uploaded, go to Monetize > Products > In-app products and create:
   - `cubecoach_pro`: Cube Coach Pro, $2.99 (non-consumable)
   - `cubecoach_coins_1000`: 1,000 coins, $0.99 (consumable)
7. Finish RevenueCat (Part A, step 3.4 and 3.5) and AdMob ids, push, build again, and upload the new `.aab` to the closed test so testers can try real purchases (testers added as "license testers" are not charged).
8. **Production:** after 14 days with 12+ testers, Play Console unlocks "Apply for production". Answer the questions about your test, then roll out to Production.

## Before every release
- `npx cap sync` after changing anything in `www/` (the cloud build does this for you).
- Test on a real phone.
- Keep `admob.testing: true` for test builds and `false` only for the production release.
