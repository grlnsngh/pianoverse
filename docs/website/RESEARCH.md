# The Pianoverse website: research

Written 2026-10-17, before the site was rebuilt (see [PLAN.md](PLAN.md)). The owner asked for the public pages to show the app (screenshots, the main features, a download link that becomes the Play Store listing later), to look made by hand rather than generated, and to work on a phone with zoom and a big Font size, and on a computer.

What is here was checked on the web on 2026-10-17; the sources are at the end. Where something could not be confirmed it says so.

## 1. Where the site is and what it can do

- **GitHub Pages**, from the `main` branch, at `https://grlnsngh.github.io/pianoverse/`. It is a *project* site, under `/pianoverse/`, not the domain's root.
- **Static files only**: HTML, CSS, images, and small scripts. No server code, no forms that send anything.
- **One file in the repository must stay under 100 MB.** The APK is about 140 MB, so it **cannot** be put in the repository or served by Pages.
- The pages already set a strict Content-Security-Policy (no inline scripts or styles), and the tests in `__tests__/webPages.test.ts` hold them to it and to the app's colours, font and motion. The new pages keep both.

## 2. Giving people the app

### Now: the APK
- **GitHub Releases** is the right home for it: one file may be up to 2 GiB, there is no limit on the total or on downloads, and a fixed address always gives the newest one: `https://github.com/grlnsngh/pianoverse/releases/latest/download/<file name>`. So the site's link never has to change when a new version comes out, as long as each release uploads its APK under the same name (for example `pianoverse.apk`).
- **Publishing a release makes the APK public**: anyone with the link can install it and create an account on the app's Appwrite project. That is the owner's decision (it is asked before any release is made).
- **Installing an APK** (Android 8 and later): the browser asks once for permission to "install unknown apps", then the phone shows the app's name and asks to install. The setting's place differs by maker and Android version (on most phones Settings, Apps, Special app access, Install unknown apps; on Samsung it is under the security settings, named differently in each One UI version), so the page also says to search Settings for "unknown apps". Google Play Protect may scan the file and warn; the page should say what that looks like and that it is expected for an app from outside the Play Store, without telling anyone to turn Play Protect off.
- **A change is coming:** Google will require apps installed on certified Android phones to come from a **registered developer**. It starts on 30 September 2026 in Brazil, Indonesia, Singapore and Thailand and goes worldwide during 2027. India's date was not found. Installing an unregistered APK will still be possible through an "advanced" flow or ADB, but ordinary people will be stopped. This is one more reason to move to the Play Store (or register as a developer) before 2027.
- **The app needs Android 7.0 or later** (`minSdk` 24 in the build).

### Later: the Play Store
- The address of the listing will be `https://play.google.com/store/apps/details?id=com.grlnsngh.pianoverse` (the app's package name).
- **The "Get it on Google Play" badge** must be Google's own artwork, unchanged, on a plain background, with clear space around it of a quarter of its height, and it may only link to Google Play. Google's badge page gives the files and the legal line ("Google Play and the Google Play logo are trademarks of Google LLC."). It is only used once the listing is live.
- Google Play also needs a **privacy policy page** and a **delete-account page**; both exist already (`privacy.html`, `delete-account.html`).

## 3. Text size, zoom and small screens

What the owner asked for: the pages must work on a phone with zoom on, with the phone's Font size at 150% (or more), and on a computer.

- **The standard to meet** is WCAG 2.2 level AA:
  - **1.4.4 Resize text:** text can be made twice as big (200%) without anything cut off or lost.
  - **1.4.10 Reflow:** at a width of 320 CSS px (a phone zoomed in, or a computer at 400% zoom) everything fits in one column with only up-and-down scrolling.
  - **1.4.12 Text spacing:** nothing breaks when someone's own style sheet sets line height to 1.5, paragraph spacing to 2× and letter spacing to 0.12×.
- **How phones treat the system Font size on web pages (2026):**
  - **Chrome on Android** does **not** apply the phone's Font size to web pages by default. It has its own **Text scaling** slider (Settings, Accessibility, up to 200%), which enlarges the text of every page, and pinch zoom. Google has proposed an opt-in, `<meta name="text-scale" content="scale">`, which makes Chrome follow the phone's Font size; it was still experimental (Canary, behind a flag) in February 2026. It only works when the page does not fix its base font size in px.
  - **Firefox on Android** follows the phone's Font size on every page.
  - **Safari on iPhone** follows the phone's text size only when the page uses `font: -apple-system-body` and sizes everything else relative to it.
  - A **WebView inside an app** follows the app's own setting (the app's paper previews set `textZoom` to 100 on purpose; that is not about these pages).
- **What that means for building the pages:**
  - The root font size is left to the browser (100%), and every size (type, spacing, widths of text, button heights) is in `rem` or `em`, so all three ways of making text bigger, and zoom, grow the whole page together.
  - The opt-in meta tag for Chrome is added now (it costs nothing where it is not supported), with the Safari rule beside it.
  - No fixed heights on anything that holds text; buttons have a minimum height and padding, like the app's large-text rules in `CLAUDE.md`.
  - The layout is one column first, and only becomes two columns when there is room **in `em`**, so a big text size on a wide screen falls back to one column on its own.
  - Pinch zoom is never turned off (`user-scalable=no` and `maximum-scale` are not used).
- **How it is checked:** every page drawn in Chrome at 320, 360, 390, 768, 1280 and 1440 px wide, each at 100%, 150% and 200% text, looking for anything cut off, overlapping, or scrolling sideways; and the text-spacing style above applied once.

## 4. Looking made by hand

Critics of AI-made sites (2025–2026) name the same tells again and again:

- purple-to-blue gradients, glassy cards, floating shapes and particles, a "new" pill above the headline;
- a grid of three or six cards, each with an icon on top and two lines of vague praise;
- copy that would fit any product ("Streamline your workflow", "Unlock productivity", "Supercharge your business");
- fade-in on every element, and scroll effects that take over the page;
- the same font and the same rounded card everywhere; and a page that is "a good website for no company in particular".

What the new pages do instead:

- **The app's own look**, nothing borrowed: its orange, ink and warm greys, Figtree, its radii, its keyboard picture and mark. No gradient anywhere.
- **Real screenshots** of the app with real-looking data in rupees, Indian names and towns, not drawn mock-ups or stock photos.
- **Plain, specific words in the app's voice**: what the screen shows and what it saves you ("Meera Kapoor owes ₹7,000 for two months", "Tuning due for 3 pianos this week"), the way the app talks. A sentence that could be about any app is rewritten or cut.
- **No made-up proof**: no star ratings, download counts, logos of customers or quotes from people who don't exist. If a real person agrees to be quoted later, that goes in.
- **Features as screens with a sentence each**, laid out like a page of a manual, at different sizes, not an icon grid.
- Motion only where the app has it (a button press), and none when Reduce Motion is on.

## 5. What the landing page needs (from how people decide to install an app)

In order: what it is and for whom (one line); a way to get it, seen without scrolling; what it looks like (screens); what it does, task by task; what it costs (free) and where the data lives (private, on the owner's account); how to install from outside the Play Store and what the phone will say; how to get help; the legal pages. A page title and description, and a picture for when the link is shared on WhatsApp (Open Graph), so the link previews properly.

## Sources

- Google Play badges and their rules: [developer.android.com/distribute/tools/promote/badges](https://developer.android.com/distribute/tools/promote/badges)
- GitHub release file size and the latest-release link: [docs.github.com, About large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github), [Linking to releases](https://help.github.com/articles/linking-to-releases)
- Installing APKs: [How-To Geek, How to sideload apps on Android](https://howtogeek.com/313433/how-to-sideload-apps-on-android/), [Digital Trends](https://www.digitaltrends.com/?p=1310435)
- Developer verification for installed apps: [Android Authority, sideloading timeline](https://www.androidauthority.com/android-sideloading-changes-timeline-3679204/), [Bitdefender](https://www.bitdefender.com/en-us/blog/hotforsecurity/google-developer-verification-sideloaded-apps)
- Phones' text size on the web: [Adrian Roselli, Honoring Mobile OS Text Size (Feb 2026)](https://adrianroselli.com/2026/02/honoring-mobile-os-text-size.html), [CSSWG explainer, env(preferred-text-scale)](https://drafts.csswg.org/css-env-1/explainers/env-preferred-text-scale.md)
- WCAG 1.4.4, 1.4.10, 1.4.12: [Deque, text, resize, reflow and zoom](https://dequeuniversity.com/checklists/web/text), [Kent State, resize and reflow](https://www.kent.edu/node/957535)
- AI-made design tells: [21st.dev, website not look AI generated](https://21st.dev/blog/website-not-look-ai-generated), [925 Studios, AI slop web design](https://www.925studios.co/blog/ai-slop-web-design-guide), [UX Planet, how to spot AI-generated design](https://uxplanet.org/how-to-spot-ai-generated-design-697aaabe76c8)
