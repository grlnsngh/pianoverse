# Pianoverse: notes for Claude

Expo / React Native app. Plans and decisions live in `docs/`: [docs/redesign/PLAN.md](docs/redesign/PLAN.md) for feature batches, [docs/large-text/PLAN.md](docs/large-text/PLAN.md) for large text.

## Publishing a new APK: the website follows

The owner's rule (2026-10-17): whenever a new version is given out, the website must give that APK and say its version. So a new APK for everyone is made with **`npm run release:android`** (build, then publish), or an APK already built and tried is published with **`npm run publish:apk`**: it uploads `pianoverse.apk` to the GitHub release `v<version>`, fills in `web/release.json` and the `data-release` spans in `index.html` and `download.html`, and merges that to `main`. Don't edit those version, size and date words by hand.

**Two kinds of APK** (the owner's choice): the website always gets the **small** one (EAS profile `preview`: only the phones' code, native libraries compressed, about 53 MB; `plugins/with-apk-packaging.js`), made by `release:android`. Anything for testing, on phones or the emulators, is the **full** one (profile `test`: every processor's code, runs on the emulators natively), which is what plain `npm run build:android` makes. `publish:apk` refuses a full build. Both take the same over-the-air updates (channel `preview`). Details are in the README ("Giving a new version to everyone") and `docs/website/PLAN.md`.

## Large text: every screen must work with the phone's text made bigger

The owner's father uses the app on a Samsung Galaxy S24 FE with Font size turned up (about 150%), and other people may go to 200% or use a large Screen zoom (Display size). The boards are drawn at 100% text, so copying their sizes exactly breaks the app at larger sizes. This is not optional polish: build every new screen, sheet, row and component for it from the start, and don't hand in UI work that only works at 100%.

How Android does it: React Native multiplies every `fontSize`, `lineHeight` and `letterSpacing` by the phone's font scale (on Android 14 and later small text grows more than big text). Screen zoom makes the screen fewer points wide, often about 360 or less. At 100% nothing in these rules changes how a screen looks, so the boards still match.

Rules:

1. **No fixed `height` on anything that holds text.** Rows, buttons, fields, bars, headers, chips and cards use `minHeight` plus vertical padding. Fixed sizes are only for icons, photos, avatars, drawings and round icon buttons with no text.
2. **No fixed `width` on anything that holds text.** No label columns, cards or slots of a set width for words or numbers: use `minWidth`, `flex`, or let the text wrap. Nothing may be wider than a 320 wide screen; use the window width (`useWindowDimensions`) when a size must be set.
3. **Crowded rows must have somewhere to go.** When two things sit side by side (label and value, amount and button, title and price, two buttons, three counts), decide what happens when the text is 1.5 to 2 times bigger: they wrap, or they stack in big-text mode (`useTextScale().large`, from `lib/useTextScale.ts`, true from a font scale of 1.25). Choices that share a row (segmented controls, tabs) become a list or scroll sideways in big-text mode.
4. **`numberOfLines={1}` only where the full text is one tap away**, like a name in a list that opens the piano. Never on labels, form labels, buttons, tab labels or messages unless big-text mode gives them more lines.
5. **Never centre a title over absolutely placed side buttons.** Use three slots, like `components/BackBar.tsx`: left button, title with `flex: 1`, and a right button or an equal spacer. The title may take two lines.
6. **Limit only text that is already big.** Amounts, large titles and headlines of about 24 px and up, small fixed chrome such as badges, tab labels and counts, use `maxFontSizeMultiplier` from the `maxScale` table in `constants/theme.ts`. Ordinary text is never limited and font scaling is never turned off for it.
7. **Paper stays paper-sized.** Anything drawn by a web view must not grow: pass `textZoom: 100` to `Print.printToFileAsync` and `textZoom={100}` to every `WebView`. Text that is part of a drawing (initials on a thumbnail) gets `allowFontScaling={false}`.
8. **Bars at the bottom measure themselves.** Anything placed above the tab bar or a sticky bar (toasts) uses the bar's real height, not a constant.
9. **Check it before calling it done.** Think through each new layout at 150% and 200% and on a 360 wide screen. When the emulator is running, look at it with `adb shell settings put system font_scale 1.5` (then `2.0`, and `1.0` to reset) and `adb shell wm density 525` (`adb shell wm density reset` to undo). Components that switch layout in big-text mode get a test at a font scale of 1.5. The tests only check the styles, not how Android lays the text out: Batch L5 found five problems on the emulator that they had passed (rows with no padding once their text wrapped, a keyboard drawing rising behind a name, "18 / days" breaking in two, a clipped hint, a cut title), so look at a new screen at 1.5 and 2.0 on the emulator when you can; how it was set up is under Decisions (batch L5) in [docs/large-text/PLAN.md](docs/large-text/PLAN.md).
10. **Copy what holds up.** Account's rows (`minHeight: 64`, text that wraps), the Filters sheet, `TuningIntervalSheet`, the Paper forms list, the Letterhead screen and the kinds in Log service (chips that wrap onto more lines) already work at large sizes.

`lib/useTextScale.ts` and `maxScale` come from Batch L1 of [docs/large-text/PLAN.md](docs/large-text/PLAN.md). If they don't exist yet, add them as that batch describes rather than working around them. Existing screens that break these rules are listed there (F1 to F40) and are being fixed batch by batch. When you change one of them for another reason, fix its large-text problem too and tick it in that plan.
