# Store listing (Google Play and App Store)

Copy each field into the store console as is. Character limits are noted; every field below fits.

Do not use "Rubik's" anywhere in the listing, keywords or screenshots: it is a registered trademark and
listings that use it get rejected or taken down. Say "puzzle cube", "3x3 cube", "speed cube".

## Shared by both stores

**App name (30 max):** Cube Coach: Scan & Solve

**Full description (4,000 max):**

Stuck on a scrambled cube? Cube Coach is a camera cube solver: point your camera at your cube and it shows you exactly how to solve it, one animated move at a time.

SOLVE
• Scan a 3x3 or 2x2 cube with your camera. Hold each side steady and it captures automatically.
• Follow a short solution, about 20 moves for a 3x3, with a 3D animation and plain instructions for every turn.
• Misread a sticker? Cube Coach spots the two stickers most likely misread and fixes them in one tap.
• Cube put back together wrong? It detects twisted corners, flipped edges and swapped pieces, and animates how to fix them by hand.
• Lost your place? Rescan and it finds the wrong turn and shows how to undo it.

PLAY
• Virtual cubes from 2x2 up to 7x7. Swipe a sticker to turn.
• Easy, Medium and Full scrambles, a timer, move counter and best times.
• A daily challenge with the same scramble for everyone.
• Hints when you're stuck.

LEARN
• Step-by-step lessons for 3x3, 2x2, 4x4 and 5x5, each with animated 3D demos.
• From your first white cross to 4x4 parity, plus finger tricks and speed tips.

SHOP
• Earn coins by solving and learning, and spend them on sticker sets and cube styles.
• Cube Coach Pro, a one-time in-app purchase, removes ads, unlocks the Pro skins and gives free hints. Coin packs are also for sale.

Your camera images stay on your device and are never uploaded.

**Privacy policy:** https://zee9999.github.io/cube-coach/privacy.html
**Website / marketing URL:** https://zee9999.github.io/cube-coach/
**Support email:** zee9x9@gmail.com (also the privacy contact in `www/privacy.html`).

## Google Play only

**Short description (80 max):**
Cube solver by camera: follow animated moves, then play and learn 2x2 to 7x7.

**Category:** Games > Puzzle
**Tags (set in the console):** Puzzle, Logic puzzle, Brain teaser, Brain training. Play only has genre tags; "Educational" is left out because it can read as aimed at children.
**Contains ads:** Yes. **In-app purchases:** Yes ($0.99 to $2.99 per item).

**Graphics:**
| Asset | File | Size |
|---|---|---|
| App icon | `resources/play-icon-512.png` | 512 x 512 |
| Feature graphic | `resources/feature-graphic-1024x500.png` | 1024 x 500 |
| Phone screenshots (5) | `resources/store/play-phone/*.png` | 1080 x 1920 |

Tablet screenshots are optional; skip them for the first release.

## App Store only

**Subtitle (30 max):** Camera solver, games, lessons

**Promotional text (170 max, editable any time without review):**
Point your camera at a scrambled cube and get a short, animated solution. Then play 2x2 to 7x7 and learn the method step by step.

**Keywords (100 max, commas, no spaces; words already in the name are indexed, so they are left out):**
solver,puzzle,speedcube,3x3,2x2,4x4,5x5,camera,timer,tutorial,learn,beginner,algorithm,brain,game

**Primary category:** Games, subcategory Puzzle. **Secondary category:** Education.
**Age rating:** answer "None" to every content question. Expect 4+.
**Copyright:** 2026 <your full name or company>
**Support URL:** https://zee9999.github.io/cube-coach/ (Apple requires a page with a way to contact you: add the support email to the site footer before submitting).
**Devices:** iPhone only (`TARGETED_DEVICE_FAMILY = 1`), so no iPad screenshots are needed.

**Screenshots:** `resources/store/ios-6.9/*.png`, 1320 x 2868 (6.9" iPhone). App Store Connect scales these down for every smaller iPhone; no other sizes are required.

**App Review notes:**
Camera is used to read cube colors. To test without a cube, open the Solve tab and tap "Try a random scramble". Purchases can be tested with a sandbox account; "Restore purchases" is at the bottom of the Shop tab.

## Screenshots

All store screenshots are generated, not taken by hand. After any UI change, run:

```
node tools/store-shots.mjs
```

It starts the web app in headless Chrome at iPhone size, sets up a sample player (1,240 coins, no Pro), captures five scenes
(scan check, 3D solve, 5x5 game, lesson, shop) and frames each with a headline. Output:

- `resources/store/ios-6.9/` App Store, 1320 x 2868
- `resources/store/play-phone/` Google Play, 1080 x 1920
- `resources/store/raw/` the plain app screens, 1170 x 2532

Headlines and scenes live in the `SCENES` list at the top of the script.

The scan shot shows the color check step, not the live camera (headless Chrome has no camera). If you want a real
camera shot as the first image, take one on your phone mid-scan and put it through the same frame.
