# Pianoverse redesign: implementation plan and progress

This file is the single source of truth for **what is done and what is next**. Every Claude session reads it first and updates it as it works. Design details are in [SPEC.md](SPEC.md). The design boards are in [boards/](boards/) and at https://claude.ai/artifact/CAcG5EBb9ySAiSHWUE5Kez.

Stack notes: Expo SDK 51, expo-router 3.5, NativeWind v2 (`className`), react-native-paper (PaperProvider), react-native-tab-view driven by redux `navigation.activeTab`, reanimated 3.10, react-native-svg, expo-image, Appwrite backend, redux store. 62 Jest suites in `__tests__/` (46 before the redesign, plus 3 from Batch 0, 5 from Batch 1, 5 from Batch 2 and 3 from Batch 3).

## Working rules (every session)

1. Start by reading this file and `SPEC.md`. Run `git status` and `git log --oneline -10` and check they match the Session log. If the last session stopped mid-batch, continue from the first unticked sub-task.
2. Work on the branch `redesign/v2` (created in sub-task 0.1). Do not work on `main`.
3. Do one batch per session unless the owner says otherwise. Do the sub-tasks in order and **tick each one here as soon as it is done**, so an interrupted session loses nothing.
4. Before building a screen, open its board in `boards/` and read the exact sizes, colours and spacing. Match them. Do not add features the boards do not show.
5. Presentation only. Do not change Appwrite calls, redux logic or the `utils/` and `lib/` behaviour unless the batch says so. Reuse existing utils for status, money and dates.
6. Keep all 46 Jest suites green. When a UI string or structure changes on purpose, update the affected tests. Never delete or skip a test to get green. Add tests for new logic (status labels, Today selectors, and so on).
7. Before each commit run `npm run typecheck`, `npm test` and `npm run lint`. Never commit failing checks and never use `--no-verify`.
8. Commit at the end of every batch, and after any large sub-task, with the message `redesign: batch N <short name>`.
9. If the design and the code disagree, follow SPEC section 8. If it is not covered, pick the lowest-risk option, write it in **Decisions** below, and ask the owner only when it changes behaviour.
10. Use `npx expo install <pkg>` for Expo-compatible packages. Do not upgrade Expo, React Native or NativeWind.
11. Do not edit anything in `docs/redesign/boards/`.
12. When the batch is finished, or the owner says the limit is close: update Progress, add a Session log entry, commit, then print (a) a short "How to check this batch" list for the owner and (b) the exact prompt for the next session. **Do not start the next batch on your own.**

## Progress

Tick `[x]` when done. Add a short note in brackets if something differs from the plan.

- [x] **Batch 0. Foundations** (S): branch, fonts, tokens, icons, no-photo illustration
  - [x] 0.1 Create branch `redesign/v2` and commit `docs/redesign`
  - [x] 0.2 Install `@expo-google-fonts/figtree`, load Figtree 400/500/600/700 in `app/_layout.tsx` next to Poppins, add tailwind `fontFamily` keys [imported per weight from `@expo-google-fonts/figtree/<weight>` so only 4 font files are bundled; keys `font-figtree`, `font-figtree-medium`, `-semibold`, `-bold`]
  - [x] 0.3 `tailwind.config.js`: add the new colours and radii from SPEC section 3 (keep the old ones for now) [also `ink3`, `late-tint`, `late-tint-text` and radius `panel` (20), which SPEC section 3 lists but the Handoff snippet omits]
  - [x] 0.4 `constants/theme.ts`: colours, radii, spacing, type styles, motion durations and easing [also `fonts`, the `shadows.searchPill` and the five `pianoPalettes` for 0.6]
  - [x] 0.5 `components/ui/Icon.tsx` using `react-native-svg` and the path table in SPEC section 5 [31 icons; camelCase names such as `tabToday`, `categoryOnSale`, `cameraOff`; also `components/ui/index.ts`, which later batches extend]
  - [x] 0.6 `components/ui/PianoPhoto.tsx`: shows the photo, or the piano illustration when there is none or it fails (5 palettes chosen by hashing the id) [props `id`, `uri`, `style`, `contentFit`, `accessibilityLabel`, `children` (drawn on top, for badges); the wall colour shows while a photo loads]
  - [x] 0.7 Tests for theme and PianoPhoto, then typecheck, tests, lint, commit [3 new suites, 59 tests: `designTokens`, `icon`, `pianoPhoto`]
- [x] **Batch 1. Primitives A: buttons and feedback** (M)
  - [x] 1.1 `Button` (primary, secondary, outline, destructive, text; pressed, loading, disabled) [`size` regular 52 or compact 48; press feedback is immediate, see Decisions]
  - [x] 1.2 `Spinner` and `KeysLoader` [both stop when the phone asks for reduced motion, via the new `lib/useReducedMotion.ts`]
  - [x] 1.3 `Skeleton` with the 1.5 s shimmer (reanimated), reduced-motion aware [shimmer band is an SVG gradient, so no new native module; `useSkeletonDelay` implements the 200 ms rule]
  - [x] 1.4 `Badge` (overdue and ending soon) and `Banner` (offline, syncing, error)
  - [x] 1.5 Status helper: from the existing rental utils return `{ text, tone }` for overdue, ending soon and normal (unit tested) [`getRentalStatus(state, remaining)` and `getPianoRentalStatus(piano)` in `utils/rentalStatus.ts`; the old `getRentalStatusText` stays for the old screens; tests come in 1.7]
  - [x] 1.6 Restyle `ToastHost` to the toast spec (success, error with Retry, undo) [`showToast(message, { duration, variant, action })`; the old `showToast(message, "long")` form still works; Android keeps its native toast for plain messages, see Decisions]
  - [x] 1.7 Tests, checks, commit [5 new suites, 112 tests: `button`, `loaders`, `badgeAndBanner`, `rentalStatusTone`, `toastDesign`; plus `__tests__/helpers/ui.tsx`. Updated on purpose: the timing test in `toastAndSold`]
- [x] **Batch 2. Primitives B: forms and overlays** (M)
  - [x] 2.1 `Field` (outlined, label inside, focus, error) and password "Show" toggle [a `secureTextEntry` field gets the toggle; forwards its ref; the ring is drawn over the field so text never shifts]
  - [x] 2.2 `Group` and `FormRow` (label left, value, chevron, hairlines) [`FormRow` is a picker row (`onPress`) or a text row (`input`), with `prefix` and `labelWidth`; the Filters and Account rows are composed in their own batches, see Decisions]
  - [x] 2.3 `Segmented` and `Switch`
  - [x] 2.4 `Sheet`: restyle `components/BottomSheet.tsx` (grabber, dim, radius 24, Cancel and title row) [built as a new `components/ui/Sheet.tsx`; `BottomSheet.tsx` is untouched until Batch 8 moves its three sheets, see Decisions. Includes the 320 ms rise, dim fade, tap-the-dim and drag-down to leave]
  - [x] 2.5 `Dialog`: restyle `components/CustomAlertModal.tsx` (stacked buttons, destructive on top) [built as a new `components/ui/Dialog.tsx`; `CustomAlertModal.tsx` is untouched until its one user, `BulkOperationsBar`, moves in Batch 5]
  - [x] 2.6 Tests, checks, commit [5 new suites, 128 tests: `field`, `formRows`, `controls`, `sheet`, `dialog`]
- [x] **Batch 3. Navigation shell** (M)
  - [x] 3.1 New tab bar: Today, Pianos, Account (icons, labels, active state) [`components/ui/TabBar.tsx`, 84 high on an iPhone; the layout no longer uses `react-native-tab-view`]
  - [x] 3.2 `TabKey` becomes `today | pianos | account`; fix every `setActiveTab` call (SPEC section 8.4) [`create` became `router.push("/create")`, `home` became `pianos`; the app opens on Pianos until Batch 6, see Decisions]
  - [x] 3.3 Add flow becomes its own stack screen, opened from the orange + button; remove the centre Create tab [`app/(tabs)/create.tsx` moved to `app/create.tsx`; publishing now leaves the whole flow with `router.dismissAll()`]
  - [x] 3.4 Placeholder Today screen; Pianos keeps the old list for now [Today has the real header; the old Home swaps its piano logo for the orange +]
  - [x] 3.5 Cross-fade between tabs (120 ms) and keep each tab's scroll position [`components/ui/TabScenes.tsx`: a tab is created on first visit and then kept]
  - [x] 3.6 Update tests, checks, commit [3 new suites, 41 tests: `tabBar`, `tabsShell`, `todayScreen`; plus new cases in `formsAndBack` and `homeScreen`; the old `TabView` tests were replaced]
- [ ] **Batch 4. Pianos screen** (L)
  - [ ] 4.1 Search pill and the + button
  - [ ] 4.2 Category icon tabs (All, Rentable, Events, On sale, Warehouse)
  - [ ] 4.3 `PianoCard` (grid, with badges and category icon) using `PianoPhoto`
  - [ ] 4.4 `PianoRow` (compact list) and the grid/list toggle; map saved layout `card` to `grid`
  - [ ] 4.5 Count, sort link and header; keep list performance (see `__tests__/listRendering.test.tsx`, `rowRerenders.test.tsx`)
  - [ ] 4.6 `LoadingPianos` skeleton
  - [ ] 4.7 Tests, checks, commit
- [ ] **Batch 5. Pianos states, filters, search** (M)
  - [ ] 5.1 Filters sheet (`FilterButton`): Sort by, Show switches, Reset, "Show N pianos"
  - [ ] 5.2 Select mode and the delete bar with the confirmation dialog
  - [ ] 5.3 Pull to refresh (`RefreshPianos`), offline strip (`PianosOffline`)
  - [ ] 5.4 Empty state, load error state
  - [ ] 5.5 Search screen and no-results state
  - [ ] 5.6 Tests, checks, commit
- [ ] **Batch 6. Today screen** (L)
  - [ ] 6.1 Selectors: received this month, in stock, on rent, sold this month, needs attention order, recent payments (unit tested, reuse `utils/stats.ts`)
  - [ ] 6.2 Header, income block and the three counts
  - [ ] 6.3 Needs attention list
  - [ ] 6.4 Rented out shelf with progress bars
  - [ ] 6.5 Recent payments
  - [ ] 6.6 `LoadingToday` skeleton and pull to refresh
  - [ ] 6.7 Tests, checks, commit
- [ ] **Batch 7. Piano detail** (L)
  - [ ] 7.1 Photo hero, pager count, back, share and more; `PhotoViewer` restyle (`PhotoViewer` board)
  - [ ] 7.2 Title block and status line; rented sections (customer, rental period bar, payments, about)
  - [ ] 7.3 Events, warehouse and on-sale details; sold state with the Sale section
  - [ ] 7.4 Sticky action bar with the primary action by state
  - [ ] 7.5 Action list (extend, edit, mark as sold, delete) and `LoadingDetail` skeleton
  - [ ] 7.6 Tests, checks, commit
- [ ] **Batch 8. Detail sheets and dialogs** (M)
  - [ ] 8.1 Record payment sheet (big amount, date, note)
  - [ ] 8.2 Extend rental sheet (keep the current 1, 3, 6 month rule; see SPEC 8.2)
  - [ ] 8.3 Mark as sold sheet
  - [ ] 8.4 The six dialogs (delete piano, delete payment, undo sale, discard changes, delete selected, stop adding)
  - [ ] 8.5 Toasts for saved, failed and undo
  - [ ] 8.6 Tests, checks, commit
- [ ] **Batch 9. Add and edit flow** (L)
  - [ ] 9.1 Step 1 basics (photos, title, make, company, purchased, notes) with the 3-segment progress
  - [ ] 9.2 Make picker sheet and date picker sheet
  - [ ] 9.3 Step 2: segmented category and its fields (rentable, events, on sale, warehouse)
  - [ ] 9.4 Step 3 review, Publishing progress and Published success screens
  - [ ] 9.5 Camera denied sheet; use `MAX_PHOTOS` for the limit text
  - [ ] 9.6 Edit screen reuses the same fields; discard-changes and stop-adding dialogs
  - [ ] 9.7 Tests, checks, commit
- [ ] **Batch 10. Account** (M)
  - [ ] 10.1 Profile card with the three counts
  - [ ] 10.2 Your data rows (CSV export, last updated)
  - [ ] 10.3 Reminders explanation with the sample notification
  - [ ] 10.4 Sign out with the confirmation sheet (still clears local pianos and reminders)
  - [ ] 10.5 Tests, checks, commit
- [ ] **Batch 11. Launch and auth** (L)
  - [ ] 11.1 Native splash colour and in-app Splash
  - [ ] 11.2 Welcome screen (replaces the unauthenticated view of `app/index.tsx`)
  - [ ] 11.3 Sign in, sign up, forgot and reset password restyled, with error and loading states
  - [ ] 11.4 NotifyPrimer shown once after first sign-in
  - [ ] 11.5 Tests, checks, commit
- [ ] **Batch 12. Motion and accessibility** (M)
  - [ ] 12.1 Sheet, toast, tab, step and success animations to the Motion board timings
  - [ ] 12.2 Photo card to hero transition, or the fade fallback in SPEC section 7
  - [ ] 12.3 Reduced-motion handling everywhere
  - [ ] 12.4 Accessibility pass: 44 px targets, labels on icon buttons, text contrast, screen-reader order
  - [ ] 12.5 Optional: `expo-haptics` on save
  - [ ] 12.6 Tests, checks, commit
- [ ] **Batch 13. Cleanup and release** (S)
  - [ ] 13.1 Remove Poppins, the old colour tokens, unused icons and images, and dead components
  - [ ] 13.2 Update `README.md` (features, screenshots list) and `app.json` if needed
  - [ ] 13.3 Full run on Android and iOS: every board compared with the real screen
  - [ ] 13.4 Final typecheck, tests, lint; version bump with `npm run plus`; open the pull request

## Batch notes

**Batch 0.** Boards: `Foundations`, `Handoff`. No visible change in the app when it is done.

**Batches 1 and 2.** Boards: `Feedback`, `Dialogs`, `SignIn` (Field), `Add1Basics` and `RecordPayment` (rows), `Filters` (sheet, switch), `Add2Details` (segmented). Put new components in `components/ui/` and export them from one index. Old components stay until their screens move.

**Batch 3.** Boards: `Main`, `Pianos` (tab bar). Look at `app/(tabs)/_layout.tsx` (react-native-tab-view with `SceneMap`), `redux/navigation/`, and every caller of `setActiveTab` (`home.tsx`, `profile.tsx`, `review.tsx`, `EmptyState.tsx`).

**Batches 4 and 5.** Boards: `Pianos`, `LoadingPianos`, `RefreshPianos`, `PianosOffline`, `PianosSelect`, `EmptyPianos`, `LoadError`, `Filters`, `Search`, `NoResults`. Files: `app/(tabs)/home.tsx`, `components/CardItem.tsx`, `ListItem.tsx`, `FilterButton.tsx`, `BulkOperationsBar.tsx`, `EmptyState.tsx`, `SearchInput.tsx`, `app/search/[query].tsx`.

**Batch 6.** Boards: `Main`, `LoadingToday`, `NotifyPrimer` (later, in batch 11). New file `app/(tabs)/today.tsx`.

**Batches 7 and 8.** Boards: `Detail`, `DetailSale`, `DetailSold`, `LoadingDetail`, `PhotoViewer`, `RecordPayment`, `ExtendRental`, `MarkSold`, `Dialogs`. Files: `app/detail/[id].tsx`, `components/PhotoGallery.tsx`, `PhotoViewer.tsx`, `RentPayments.tsx`, `RecordPaymentSheet.tsx`, `ExtendRentalSheet.tsx`, `MarkAsSoldSheet.tsx`, `lib/useDeletePiano.ts`, `lib/useUpdatePiano.ts`.

**Batch 9.** Boards: `Add1Basics`, `Add2Details`, `Add3Review`, `Publishing`, `Published`, `MakePicker`, `DatePicker`, `CameraDenied`. Files: `app/(tabs)/create.tsx`, `app/review.tsx`, `app/edit/[id].tsx`, `components/PianoFormFields.tsx`, `PianoPhotoField.tsx`, `DateField.tsx`, `CompanyAssociatedPicker.tsx`, `PriceField.tsx`, `utils/pianoForm.ts`.

**Batch 10.** Boards: `Account`, `SignOutConfirm`. File: `app/(tabs)/profile.tsx`. Keep the existing CSV export (`utils/csvExport.ts`).

**Batch 11.** Boards: `Splash`, `Welcome`, `SignIn`, `SigningIn`, `SignInError`, `SignUp`, `Forgot`, `NotifyPrimer`. Files: `app/index.tsx`, `app/(auth)/*.tsx`, `services/notifications.ts` (permission request timing only).

**Batches 12 and 13.** Board: `Motion`, plus a final pass over every board.

## Decisions

Record every choice that is not obvious from the boards. Format: `date, batch, decision, reason`.

- 2026-09-29, batch 0, **Figtree is imported one weight at a time** (`@expo-google-fonts/figtree/400Regular` and so on), not from the package root. The root file `require`s all 14 font files, so Metro would bundle them all. Loaded under the names in `fonts` (`constants/theme.ts`): `Figtree_400Regular`, `_500Medium`, `_600SemiBold`, `_700Bold`. Tailwind classes: `font-figtree`, `font-figtree-medium`, `font-figtree-semibold`, `font-figtree-bold`. Never set `fontWeight` with these fonts; pick the family.
- 2026-09-29, batch 0, **Tokens follow SPEC section 3, which is a superset of the Handoff board snippet.** Added `ink3`, `late-tint`, `late-tint-text` and radius `panel` (20) to Tailwind. `constants/theme.ts` also holds the values that only appear in SPEC section 4 or on the boards (`brandPressed` #E88A00, `disabledText` #A39D92, `switchOff` #D9D5CC, `brandOnInk` #FFB84D, `skeletonHighlight` #F8F7F4, `inkBody` #3C3831, `dim`, `progressTrack`). Pressed states and animations read them from `theme.ts`, because NativeWind v2 has no `active:` variant on plain Views (`theme.test.tsx` bans `hover:` and `focus:` for the same reason).
- 2026-09-29, batch 0, **The no-photo drawing follows SPEC section 5 (full detail), not the simplified drawing on the Foundations board.** Foundations shows the keyboard as one plain rectangle. Every screen board (Pianos, Detail, Main and others) has the 9 key separators and 7 black keys, and so does the spec.
- 2026-09-29, batch 0, **`PianoPhoto` draws the piano illustration only when needed** (no photo, or the photo failed), not underneath every photo. While a photo loads the frame shows the palette's wall colour. This keeps SVG work out of long lists. A failed address is remembered, so a broken photo does not retry in a loop; a new address gets its own try. The id-to-palette mapping (FNV-1a hash mod 5, palette order walnut, ebony, mahogany, oak, white) is pinned by a test: do not reorder the palettes.
- 2026-09-29, batch 0, **`Icon` is hidden from screen readers unless given `accessibilityLabel`**, because the button or row around an icon carries the label (the full accessibility pass is sub-task 12.4). Names are camelCase (`tabToday`, `categoryOnSale`, `cameraOff`, `chevronRight`). The stroke is 1.75, or 2 with `active`.
- 2026-09-29, batch 0, **`app.json` is not touched in Batch 0.** `__tests__/theme.test.tsx` pins the splash and background colour to `#161622` and `userInterfaceStyle` to `dark`. Batch 11 changes the native splash to `#FF9C01` and must update that test on purpose. Poppins, the navy tokens and `constants/colors.ts` stay until Batch 13.
- 2026-09-29, batch 1, **Button sizes: regular 52, compact 48, label 16 in both.** Checked every board that draws a button: all the real screens use 52 high with a 16/700 label (Welcome, SignIn, RecordPayment, Filters and others), and the sticky bars (Detail, DetailSale, DetailSold) and NoResults use 48 high, still 16. The 15px label is only on the two summary boards (Foundations, Feedback), so the SPEC is right and no 15px style was added. Outline and text buttons use a 600 label (`type.buttonQuiet`, from the Detail and NotifyPrimer boards); filled buttons use 700.
- 2026-09-29, batch 1, **Button states that no board draws are derived, lowest risk.** Pressed destructive is `late` at 90% brightness (`latePressed` #B02D19). Pressed outline fills with `grouped`. A pressed text button dims to 50% and does not shrink. Pressed and disabled looks for primary and secondary are exactly the Feedback board. A loading button keeps its normal colours (only a disabled one greys out) and keeps its width by remembering the width it had before loading.
- 2026-09-29, batch 1, **Press feedback is immediate (a `Pressable` style), not a 100 ms eased transition.** It is testable and feels the same on press-in. The 100 ms ease on release is left to the Motion pass (Batch 12).
- 2026-09-29, batch 1, **Skeleton shimmer is an SVG gradient band that slides across, not `expo-linear-gradient`.** `react-native-svg` is already in the installed dev build, so this adds no native module and needs no new dev-client build. All loops (spinner, keys, shimmer) stop with the phone's Reduce Motion setting through `lib/useReducedMotion.ts`, which follows the setting while the app is open and never throws if it cannot be read (React Native's Jest mock returns `undefined` for it). `useSkeletonDelay(loading)` is the 200 ms rule; screens use it.
- 2026-09-29, batch 1, **Status text.** `getRentalStatus` / `getPianoRentalStatus` return `{ text, tone }`: `Overdue · 18 days` (late), `Ends in 3 days` (soon, 1 to 7 days), `Ends today` (soon), `12 days left` (normal), and months from 60 days (`Overdue · 9 months`, `2 months left`, a month never reads 0). The boards do not draw the last-day case, so `Ends today` and `Ends in 1 day` are my wording; `Due today` is still what the old screens show. The old `getRentalStatusText` is untouched for the old screens.
- 2026-09-29, batch 1, **Toast.** Shape, colours and timings are the Feedback and Motion boards: rises 24 px and fades in over 220 ms, stays 3 s, sinks 12 px and fades out over 180 ms (about 3.4 s on screen; the old short toast was 2 s and long 3.5 s, now 3 s and 5 s), reduced motion is a 120 ms fade. `showToast(message, { duration, variant: "success" | "error", action: { label, onPress } })`; the old `showToast(message, "long")` form still works and every existing call site is unchanged. **Android still uses the native toast for plain messages**, because sheets and dialogs are React Native `Modal`s and an in-app toast would draw behind them. A toast with an action is always drawn in the app, because a native toast cannot hold a button. Open question for Batch 8 (see the owner note in the Session log): whether every Android toast should move to the in-app one. Position is unchanged (`insets.bottom + 96`); Batch 3 should re-check it against the new 84 px tab bar.
- 2026-09-29, batch 1, **Not built, on purpose.** The Feedback board also shows a known-length progress bar and an unknown-length one (Batch 9, Publishing), pull-to-refresh indicators (Batch 5.3), and a "Retry" tile for a photo that failed to load. `PianoPhoto` still shows the piano drawing when a photo fails, as SPEC section 5 and sub-task 0.6 say. The two disagree; the Retry tile matters most on the Detail hero (Batch 7), so decide there. Icons get a `strokeWidth` prop (the toast check needs 3.2).
- 2026-09-29, batch 2, **`Sheet` and `Dialog` are new components in `components/ui/`; `BottomSheet.tsx` and `CustomAlertModal.tsx` are not changed.** The plan says "restyle" them, but `BottomSheet` holds three live sheets (Extend rental, Mark as sold, Record payment) whose contents are white text on navy, and they would be unreadable on the new light sheet until Batch 8 rebuilds them. Same rule as Batch 1: old components stay until their screens move. Who moves when: `CustomAlertModal` has one user, `BulkOperationsBar`, which moves to `Dialog` in Batch 5.2; the `Alert.alert` confirmations move to `Dialog` in Batch 8.4 (their tests use `captureAlerts` and will change then); `BottomSheet` goes when the three sheets move in Batch 8. Batch 13.1 deletes both old files.
- 2026-09-29, batch 2, **`Sheet` already has its motion and drag** (320 ms rise with the dim fading in, 240 ms out, drag the header down more than 100 px to leave, tap the dim, back button, 120 ms fade with reduced motion). So Batch 12.1 only needs to check it against the Motion board. A drag past the threshold calls `onClose`; if the screen keeps the sheet open (say it asks "Discard changes?" first) the sheet comes back up rather than staying pulled down. Header row appears only when `title` is given; `tone` is `grouped` (form sheets) or `white` (text sheets); the footer holds the one orange button and clears the home indicator (28 below it on an iPhone). The sheet slides from its own height once measured. It keeps the old sheet's keyboard behaviour (padding on iOS only) and adds `statusBarTranslucent` so the dim covers the status bar on Android.
- 2026-09-29, batch 2, **`Dialog` follows the Dialogs board and enforces its rule.** 284 wide, radius 20, a full-width 52 px row per choice. Destructive choices are always drawn first (red, 700) so the safe choice is last, whatever order the caller gives. `emphasis` makes a safe choice 600 (the "Keep editing" and "Keep going" rows). Android back triggers the last (safe) choice, or `onDismiss` if given. Tapping the dim does nothing, like a system alert, so nobody dismisses a delete dialog by accident.
- 2026-09-29, batch 2, **`Group` and `FormRow` cover the Add piano and Record payment boards only.** `FormRow` is a picker row (`onPress`, chevron, spoken as "Make, Schumann") or a text row (`input`, with `prefix` such as ₹ or +91, `strong` for amounts, tabular digits on numeric keyboards, and `labelWidth` 84 or 112). `Group inSheet` gives the sheet layout (52 high, value on the right). The Filters rows (ink label, grey value, switch rows with a subtitle) and the Account rows (icon, 16/600 title, subtitle) are different layouts; compose them from `Group` in Batch 5 and Batch 10, and add a shared `ListRow` there if two batches need the same thing. `Group` treats rows inside a fragment as rows, so `{isRentable && <>…</>}` still gets its hairlines.
- 2026-09-29, batch 2, **`Field`.** The focus and error ring is drawn over the field, not as its border, so the text never shifts when it goes from 1 px to 2 px. An error keeps the red ring even while focused. The error text is announced when it appears and also given as the input's accessibility hint. It forwards its ref so a form can move focus to the next field. A `secureTextEntry` field gets the Show / Hide button (44 px target). The sign-in and sign-up screens still use `FormField` until Batch 11.
- 2026-09-29, batch 2, **`Switch` and `Segmented`.** Switch thumb slides in 200 ms; with reduced motion it jumps and only the colour fades over 120 ms; the tap area is at least 44 px high. `Segmented` takes 2 to 4 options, is spoken as a tab list, and ignores a press on the option that is already chosen.
- 2026-09-29, batch 2, **Animated styles that read a plain JS value pass it as an explicit dependency** (`useAnimatedStyle(fn, [reduced])`), or read a shared value instead. A closure value can otherwise go stale, which showed up in the skeleton in Batch 1 and would show up as a sheet that ignores the Reduce Motion setting being changed.
- 2026-09-30, batch 3, **The app opens on Pianos, not Today, until Batch 6.** Today is a placeholder (the real header with the date, the title and the orange +, and a line saying the rest is coming), so opening on it would greet you with an empty page. `INITIAL_TAB` in `redux/navigation/reducer.ts` is `pianos`; Batch 6 changes it to `today`. It is also the tab chosen after signing in, and the tab chosen again after publishing a piano or after a sign out.
- 2026-09-30, batch 3, **The Add flow is `app/create.tsx`, a screen above the tabs, and the centre Create tab is gone.** It is registered in the root `Stack` with `headerShown: false` and has its own Back button (the old dark screen otherwise, until Batch 9 rebuilds it). Because the form now sits under Review in the stack, publishing ends with `router.dismissAll()` (falling back to `router.replace("/home")` when the app was opened straight on the flow); `router.back()` would only have returned to the filled-in form. The orange + (`AddButton`) is on the Today header and, replacing its decorative piano logo, on the old Home header; the empty-state buttons and the two Account shortcuts use `router.push("/create")` too. The tab route names changed as SPEC 8.4 says: `create` became that push, `home` became `pianos`.
- 2026-09-30, batch 3, **The tab shell no longer uses `react-native-tab-view`.** There is no swipe between tabs (the design has none) and the change is a 120 ms fade, never a slide. `TabScenes` creates a tab the first time it is shown and then keeps it, which is what keeps each tab's scroll position and typed text; before, all three were created at start. The new tab fades in on top while the one being left stays underneath and goes when it is covered, so a navy screen and a white one never dip through a blank frame. `react-native-tab-view` and `react-native-pager-view` are now unused: remove them in Batch 13 (a native dependency, so that needs a new build).
- 2026-09-30, batch 3, **Tab fades use React Native's `Animated`, not Reanimated.** The first version used `withDelay` and `cancelAnimation` on a Reanimated shared value, and on every second switch the tab being left vanished at once and the returning one flashed for a frame. Sampling every frame showed it, and the there-and-back cases are now tests. `Switch` and `Sheet`, which use plain repeated `withTiming`, were checked the same way and are fine. The toast already used `Animated`. If a later batch needs to chain animations on one Reanimated value, sample it frame by frame before trusting it.
- 2026-09-30, batch 3, **Toast and bottom bars share one height rule.** `bottomBar` in `theme.ts`: 50 px of content plus the home indicator (at least 8), which is 84 on an iPhone, and a toast sits 12 px above it (96 on an iPhone, was 130). The sticky action bar on a piano page (Batch 7) is 84 high too, so the toast clears it the same way. `TabBar` uses the same numbers.
- 2026-09-30, batch 3, **The old screens keep their navy look for now**, so the light tab bar sits under a navy Pianos and Account until Batches 4, 5, 10 and 11 move them. Their own `SafeAreaView`s still add a bottom inset above the bar, as they did above the old bar; the Pianos and Account rebuilds should drop it.
- 2026-09-30, batch 3, **Tests changed on purpose.** Tab names in `store`, `overdueAndIncome`, `searchAndFilters` and the test store; the toast position; the five suites that import Create now import `@/app/create`; the publish tests now expect `dismissAll`. The router mocks in `rentalReminders`, `screenStartup` and `navigationAndRefresh` gained `canDismiss` and `dismissAll`: `rentalReminders` presses Publish, and with the old mock the new call would have thrown inside the publish `try` and been swallowed while its assertions still passed. The guard in `formsAndBack` that bans `router.push` to a tab route no longer lists `/create` (it is a real screen now) and instead checks that `create.tsx` is not inside `(tabs)`.

## Session log

Add one entry per session, newest last. Format:

```
### Session N, <date>
- Batch and sub-tasks done:
- Commit(s):
- Checks: typecheck / tests / lint results
- Known issues and follow-ups:
- Next: <first unticked sub-task>
```

### Session 1, 2026-09-29
- Batch and sub-tasks done: **Batch 0 Foundations**, all of 0.1 to 0.7. Branch `redesign/v2`; `@expo-google-fonts/figtree` installed and loaded; Tailwind colours, radii and font keys; `constants/theme.ts`; `components/ui/Icon.tsx` (31 icons); `components/ui/PianoPhoto.tsx` (photo, or the drawing in 5 palettes); `components/ui/index.ts`. Nothing on screen changes yet; no existing screen imports the new pieces.
- Commit(s): `docs: add redesign plan, spec, prompts and design boards` (sub-task 0.1), then `redesign: batch 0 foundations`.
- Checks: typecheck clean. Jest 49 suites, 468 tests pass (the original 46 suites and 409 tests are unchanged and green, plus 3 new suites with 59 tests). Lint 0 errors and 20 warnings, the same 20 as before the batch (none from new files).
- Known issues and follow-ups: (1) Checked in Jest only, not on a device or emulator; the piano drawing and icons are worth a look on a phone (see "How to check"). (2) The design canvas URL was not opened; the offline boards were used. (3) Sub-task 0.7 needs `theme.test.tsx` to keep passing, which is why `app.json` is untouched until Batch 11 (see Decisions). (4) `npm install` reports 75 audit warnings that were there before; not touched. (5) Batch 1 Button size question is in Decisions.
- Next: **1.1** `Button` (Batch 1, Primitives A). Read the `Feedback` board first.

### Session 2, 2026-09-29
- Batch and sub-tasks done: **Batch 1 Primitives A**, all of 1.1 to 1.7. New in `components/ui/` (all exported from the index): `Button`, `Spinner`, `KeysLoader`, `Skeleton` (+ `useSkeletonDelay`), `Badge`, `Banner`. New `lib/useReducedMotion.ts`. `utils/rentalStatus.ts` gained `getRentalStatus`, `getPianoRentalStatus` and `STATUS_TONE_COLORS`. `ToastHost` and `utils/toast.ts` restyled and extended. `Icon` gained a `strokeWidth` prop; `theme.ts` gained a few tokens. No existing screen uses the new pieces yet, so the app looks the same, except that toasts on iOS and web now look like the design.
- Commit(s): `redesign: batch 1 buttons and feedback`.
- Checks: typecheck clean. Jest 54 suites, 580 tests pass (the original 46 suites unchanged and green; 8 new suites, 171 new tests across Batches 0 and 1). Lint 0 errors and the same 20 warnings as before Batch 0 (none from new or changed files).
- Known issues and follow-ups: (1) Checked in Jest only, not on a device. Animation values were checked over fake time (spinner 0.8 s per turn, keys 1.1 s loop with 120 ms stagger, shimmer 1.5 s, toast 220 in, 3 s, 180 out, and everything stopping with Reduce Motion), but the look on a phone is unchecked; see "How to check". (2) **Owner question, changes behaviour, for Batch 8:** on Android plain toasts are still the native toast, not the design's ink pill, because in-app toasts draw behind sheets and dialogs (they are `Modal`s). Options: keep native for plain messages and use the in-app toast only for Undo and Retry (what is built now), or move every toast in-app and fix the layering. (3) The Feedback board shows a "Retry" tile for a failed photo, but SPEC and 0.6 say the drawing; decide in Batch 7. (4) The toast is positioned for the old tab bar; re-check in Batch 3. (5) `__tests__/helpers/ui.tsx` resets the `AccessibilityInfo` mocks after each test, since `restoreAllMocks` does not; use its `mount` for any test that renders a spinner, keys loader or skeleton, so the looping animations are unmounted.
- Next: **2.1** `Field` (Batch 2, Primitives B). Read the `SignIn`, `SignInError`, `Add1Basics`, `RecordPayment`, `Filters`, `Add2Details` and `Dialogs` boards first.

### Session 3, 2026-09-29
- Batch and sub-tasks done: **Batch 2 Primitives B**, all of 2.1 to 2.6. New in `components/ui/` (all exported from the index): `Field`, `Group`, `FormRow`, `Switch`, `Segmented`, `Sheet`, `Dialog`. `KeysLoader`'s animated style now names its dependency, and `theme.ts` gained `chevron` and `grabber`. No existing screen uses the new pieces yet, and `BottomSheet.tsx` and `CustomAlertModal.tsx` are unchanged (see Decisions), so the app looks exactly as before.
- Commit(s): `redesign: batch 2 forms and overlays`.
- Checks: typecheck clean. Jest 59 suites, 708 tests pass (the original 46 suites unchanged and green; 13 new suites across Batches 0 to 2). Lint 0 errors and the same 20 warnings as before Batch 0 (none from new or changed files).
- Known issues and follow-ups: (1) Checked in Jest only, not on a device. Motion was checked over fake time (sheet 320 in, 240 out, drag to leave, switch 200, reduced motion), but the feel of the drag, the keyboard against a sheet with a text field, and the fonts are unchecked on a phone; see "How to check". (2) `Sheet` uses React Native's `Modal`, so a toast from `ToastHost` still draws behind it (the Batch 1 owner question about Android toasts is unchanged). (3) The plan says "restyle" `BottomSheet` and `CustomAlertModal`; I built new components instead, see Decisions. (4) `Sheet` and `Dialog` need a `SafeAreaProvider` above them, as the root layout gives; tests wrap in one.
- Next: **3.1** New tab bar (Batch 3, Navigation shell). Read the `Main` and `Pianos` boards first, then `app/(tabs)/_layout.tsx`, `redux/navigation/` and every caller of `setActiveTab`.

### Session 4, 2026-09-30
- Batch and sub-tasks done: **Batch 3 Navigation shell**, all of 3.1 to 3.6. The first batch that changes what is on screen: a new white tab bar (Today, Pianos, Account), no centre Create tab, the Add flow as its own screen behind an orange + button, a placeholder Today tab, and tabs that fade instead of slide. New: `components/ui/TabBar.tsx`, `AddButton.tsx`, `TabScenes.tsx`; `app/(tabs)/today.tsx`; `app/create.tsx` (moved from `(tabs)`). Changed: `TabKey` and the reducer, `app/(tabs)/_layout.tsx`, the callers of `setActiveTab`, `app/review.tsx`, `ToastHost` position, `bottomBar` in `theme.ts`.
- Commit(s): `redesign: batch 3 navigation shell`.
- Checks: typecheck clean. Jest 62 suites, 752 tests pass (the original 46 suites are green; five of them and a few tests inside others were changed on purpose, see Decisions). Lint 0 errors and the same 20 warnings as before Batch 0.
- Known issues and follow-ups: (1) **Not run on a device.** Navigation is the riskiest thing so far to leave unchecked: the Add screen opening and closing, Back and the Android back button from it, publishing landing on Pianos, the tab fade, and the bar's height on your phone. See "How to check". (2) Links: `/home` and `/profile` still open the tabs, always on Pianos, since the tabs start on their first tab; `/create` now opens the Add screen itself instead of the tabs. (3) `react-native-tab-view` and `react-native-pager-view` are unused (Batch 13). (4) The old Home still has the old search box, filter button and cards; Batch 4 rebuilds them and its header with the + button. (5) The Batch 1 owner question about Android toasts is unchanged.
- Next: **4.1** Search pill and the + button (Batch 4, Pianos screen). Read the `Pianos`, `LoadingPianos` and `Search` boards first, then `app/(tabs)/home.tsx`, `components/CardItem.tsx`, `ListItem.tsx`, `SearchInput.tsx` and `__tests__/listRendering.test.tsx` and `rowRerenders.test.tsx` (list performance must stay).
