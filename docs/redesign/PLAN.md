# Pianoverse redesign: implementation plan and progress

This file is the single source of truth for **what is done and what is next**. Every Claude session reads it first and updates it as it works. Design details are in [SPEC.md](SPEC.md). The design boards are in [boards/](boards/) and at https://claude.ai/artifact/CAcG5EBb9ySAiSHWUE5Kez.

Stack notes: Expo SDK 51, expo-router 3.5, NativeWind v2 (`className`), react-native-paper (PaperProvider), react-native-tab-view driven by redux `navigation.activeTab`, reanimated 3.10, react-native-svg, expo-image, Appwrite backend, redux store. 49 Jest suites in `__tests__/` (46 before the redesign, plus `designTokens`, `icon` and `pianoPhoto` from Batch 0).

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
- [ ] **Batch 1. Primitives A: buttons and feedback** (M)
  - [ ] 1.1 `Button` (primary, secondary, outline, destructive, text; pressed, loading, disabled)
  - [ ] 1.2 `Spinner` and `KeysLoader`
  - [ ] 1.3 `Skeleton` with the 1.5 s shimmer (reanimated), reduced-motion aware
  - [ ] 1.4 `Badge` (overdue and ending soon) and `Banner` (offline, syncing, error)
  - [ ] 1.5 Status helper: from the existing rental utils return `{ text, tone }` for overdue, ending soon and normal (unit tested)
  - [ ] 1.6 Restyle `ToastHost` to the toast spec (success, error with Retry, undo)
  - [ ] 1.7 Tests, checks, commit
- [ ] **Batch 2. Primitives B: forms and overlays** (M)
  - [ ] 2.1 `Field` (outlined, label inside, focus, error) and password "Show" toggle
  - [ ] 2.2 `Group` and `FormRow` (label left, value, chevron, hairlines)
  - [ ] 2.3 `Segmented` and `Switch`
  - [ ] 2.4 `Sheet`: restyle `components/BottomSheet.tsx` (grabber, dim, radius 24, Cancel and title row)
  - [ ] 2.5 `Dialog`: restyle `components/CustomAlertModal.tsx` (stacked buttons, destructive on top)
  - [ ] 2.6 Tests, checks, commit
- [ ] **Batch 3. Navigation shell** (M)
  - [ ] 3.1 New tab bar: Today, Pianos, Account (icons, labels, active state)
  - [ ] 3.2 `TabKey` becomes `today | pianos | account`; fix every `setActiveTab` call (SPEC section 8.4)
  - [ ] 3.3 Add flow becomes its own stack screen, opened from the orange + button; remove the centre Create tab
  - [ ] 3.4 Placeholder Today screen; Pianos keeps the old list for now
  - [ ] 3.5 Cross-fade between tabs (120 ms) and keep each tab's scroll position
  - [ ] 3.6 Update tests, checks, commit
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
- 2026-09-29, batch 0, **Note for Batch 1 (Button).** SPEC section 4 says buttons are 52 high with a 16/700 label, 48 high in compact spots. The Feedback and Foundations boards draw their buttons at 48 high with a 15/700 label. `type.button` in `theme.ts` is 16/22 700 (the spec default). When building `Button`, read the Feedback board, decide which sizes are standard and compact, and add a compact 15/700 style if needed.

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
