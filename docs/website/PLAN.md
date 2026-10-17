# The Pianoverse website: plan

Started 2026-10-17. The owner asked for the public site to show the app (screenshots, the main features, a download link that later becomes the Play Store listing), researched and planned first, built in batches, looking made by hand, and working on any phone or computer with zoom and a big Font size. The research is in [RESEARCH.md](RESEARCH.md); what the site was before is in [../redesign/WEB.md](../redesign/WEB.md).

Tick `[x]` when done.

## Decisions (the defaults; the owner can change any)

1. **Pages:** a new **landing page** (`index.html`, replacing the old one) and a new **download page** (`download.html`). The reset page, privacy policy and delete-account page stay, with the new footer.
2. **The APK is hosted on GitHub Releases**, uploaded as `pianoverse.apk` on each release, so one fixed link always gives the newest: `https://github.com/grlnsngh/pianoverse/releases/latest/download/pianoverse.apk`. Publishing a release makes the APK public, so **the owner is asked before the first one is made**. Until then the download button says the download is being prepared and gives the email address.
3. **The Play Store later:** when the listing is live, the download page's main button becomes Google's "Get it on Google Play" badge linking to `https://play.google.com/store/apps/details?id=com.grlnsngh.pianoverse`, and the APK becomes a small "or download the APK" link. Both places are marked in the HTML with `PLAY STORE:` comments, and the steps are under "Switching to the Play Store" below.
4. **Screenshots are real**, taken from the app on the Android emulator, signed in to the owner's account with the demo data (`scripts/demo/`), with Android's demo status bar (full battery, a fixed time). Saved as WebP in two sizes. No drawn phone around them, no stock photos.
5. **The look is the app's**: its colours, Figtree, radii and keyboard picture, light only, no gradients, no icon grids, no animation beyond a button press. The words are plain and specific, in the app's voice. Nothing made up: no ratings, download counts, customer logos or quotes.
6. **Large text first:** every size in `rem`/`em`, the root left at 100%, no fixed heights on anything holding text, one column until there is room in `em` for two, pinch zoom never blocked; Chrome's text-scale opt-in and Safari's system-text rule are added.
7. **No scripts** on the landing and download pages (the Content-Security-Policy says `script-src 'none'`).
8. **Who made it:** the page says it was built with a family piano business that rents pianos in India, without naming it, until the owner says the name may be used.

## Batches

- [x] **Batch S1. Research and plan** (S). This file and [RESEARCH.md](RESEARCH.md): GitHub Pages and Releases, installing an APK and the developer-verification change coming in 2026–2027, the Play badge's rules, how phones treat text size on the web, WCAG reflow and resize, and what makes a site look generated.
- [ ] **Batch S2. Real screenshots** (S)
  - [ ] S2.1 The emulator signed in to the owner's account with the demo data; Android's demo status bar; Font size 100%
  - [ ] S2.2 The screens: Today, Pianos, a rented piano's page, Record payment or Rent due, Income, Deposits held, the availability calendar, Paper forms with the letterhead, a QR label, the service log
  - [ ] S2.3 Cropped to the app (no navigation bar), saved as WebP at 360 and 720 px wide in `web/screens/`, each with its words for a screen reader
  - [ ] S2.4 `scripts/site/screenshots.md`: how to take them again after the app changes
- [x] **Batch S3. The landing page** (M) [written; waits for the screenshots of S2]
  - [x] S3.1 Top: the mark, the name, and a Download link
  - [x] S3.2 First screen: what it is and for whom, **Download for Android** (to the download page) with the version and size, and the Today screen beside it
  - [x] S3.3 What it does, one task at a time, each with its screenshot and one or two plain sentences: rent and reminders, a piano's page, money and income, deposits, the calendar, tuning and service, paper forms and the letterhead, QR labels
  - [x] S3.4 Free, private, and how updates arrive; how to install from outside the Play Store in three lines (more on the download page)
  - [x] S3.5 Questions: forgot password (the old page's three steps), which phones, iPhone, staff, deleting your data, contact
  - [ ] S3.6 Footer on every page: Download, Privacy policy, Delete your account, the email; Open Graph picture (1200 × 630) for links shared on WhatsApp
- [ ] **Batch S4. The download page** (S)
  - [x] S4.1 The button to the APK (Releases), version, size, Android 7.0 or later, the date
  - [x] S4.2 Installing, step by step, in the words the phone uses, for most phones and for Samsung; what Play Protect may say; how to update; how to remove it
  - [x] S4.3 "Coming to Google Play" and the place where the badge will go
  - [ ] S4.4 The first release with `pianoverse.apk` (**only with the owner's yes**)
- [ ] **Batch S5. Checked on every size** (S)
  - [ ] S5.1 Every page drawn in Chrome at 320, 360, 390, 768, 1280 and 1440 px, each at 100%, 150% and 200% text, and with the WCAG text-spacing style; fix whatever breaks
  - [ ] S5.2 Tests: the new pages in `__tests__/webPages.test.ts` (files exist, no inline styles or scripts, zoom allowed, text-scale meta, images with words and sizes, only the app's colours, sizes in rem on the new parts)
  - [ ] S5.3 README, `docs/redesign/WEB.md`, the phone check in `docs/redesign/QUESTIONS.md`

## Switching to the Play Store (when the listing is live)

1. Download Google's "Get it on Google Play" badge (English, PNG or SVG) from Google's badge page and save it as `web/google-play-badge.svg` (or `.png`).
2. In `download.html` and `index.html`, at each `PLAY STORE:` comment: make the main button the badge, linking to `https://play.google.com/store/apps/details?id=com.grlnsngh.pianoverse`, keep a quarter of its height clear around it, and add Google's legal line in the footer. Keep a small "Download the APK" link for phones without the Play Store.
3. Change the install steps on the download page to "Open the Play Store listing and tap Install".

## Not now

- A custom domain (`pianoverse.app` or similar), which would also allow Android App Links (`/.well-known/assetlinks.json` must be at the domain's root, which a project site under `/pianoverse/` can't have).
- Hindi or Punjabi pages (with the app's own D4, if it is done).
- A page for TPS's own customers (what they rent, prices): a different site for a different reader.

## Session log

### 2026-10-17
- S1 done. The emulator (Pixel 8, Android 15) has the app, updated to 1.1.20; it was signed out, and signing in needs the owner (S2).
- S3 and S4 written. Checked in Chrome at 320, 360, 390 and 1280 px, at 100%, 150% and 200% text (phone widths in frames, since a headless window can't be narrower than about 500 px). Found and fixed: the name in the top bar cut off at 200% on 320 px, the headline then smaller than the section titles, the small titles smaller than the body text, the screenshots beside the pairs shrinking to thumbnails, the download box running off the screen, and the button's words in the link colour. The two columns now come from container queries in rem, so a big text size on a wide screen falls back to one column too.
- The old pages (privacy, delete account, reset password) had their type in px: at 200% their titles were smaller than their text and the email address ran off the screen. Their sizes are in rem now, the fields and buttons have minimum heights, and long addresses wrap.
