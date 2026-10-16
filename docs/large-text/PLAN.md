# Large text: findings and plan

People who turn up **Font size** (and often **Display size**) in Android settings, like the owner's dad at about 150%, see parts of Pianoverse cut off, squeezed or overlapping. This file lists every place that breaks, the approach to fix it, and the work in batches. It works like [docs/redesign/PLAN.md](../redesign/PLAN.md): every session reads this file first and ticks sub-tasks as they are done.

First written 2026-10-14; checked again on 2026-10-15 to cover everything added in Batches 30 to 35 (F28 to F40). The rules every new screen must follow so this doesn't happen again are in [CLAUDE.md](../../CLAUDE.md).

The design boards (https://claude.ai/artifact/CAcG5EBb9ySAiSHWUE5Kez, offline copy in [docs/redesign/boards/](../redesign/boards/)) are all drawn on a 390 px wide phone at 100% text. They say nothing about large text, so this plan decides it: **at 100% text nothing changes; above it, boxes grow and crowded rows stack.**

## 1. What Android does

- **Font size** sets a `fontScale` (Android 14 and later offer 85% to 200%; older phones usually stop at 130%, some go further). React Native multiplies every `fontSize`, `lineHeight` and `letterSpacing` of every `Text` and `TextInput` by it. Nothing in the app limits it: `maxFontSizeMultiplier` is never set.
- On **Android 14 and later the scaling is non-linear**: small text grows more than big text. At 150%, 14 px becomes about 22 px while 32 px stays about 32 px; at 200%, 12 px becomes 24 px while 32 px becomes about 40 px. On Android 13 and older it is linear (at 150%, 44 px becomes 66 px). React Native uses Android's own conversion, so it follows whichever the phone does.
- **Display size** changes the screen density, so the same phone becomes fewer points wide (411 can become about 360 or less). Boxes grow with the text, so it rarely clips, but anything with a fixed width gets tight.
- What breaks is always one of three things: a box with a fixed `height` that the bigger text no longer fits, a `numberOfLines={1}` text that gets cut with "…", or a row that puts two things side by side and runs out of width.

## 2. What the code does today

- Nothing reads `fontScale` and nothing sets `maxFontSizeMultiplier` (checked across `app/`, `components/`, `lib/`).
- Sizes in `constants/theme.ts` and the components are copied from the boards, so about 25 boxes that hold text have a fixed `height`, and about 50 texts are one line.
- Screens built later (Account rows, Filters, Income and Customers rows, toasts, banners, the search screen) already use `minHeight` and flowing rows, and mostly hold up.

## 3. Findings

**From** is the text size at which the problem shows on a typical 411 wide phone with linear scaling (Android 13 and older). On narrower phones it starts earlier. On Android 14 and later, small and body text (labels, rows, buttons, tabs) breaks at about the same size, but big text (20 px and up: amounts, titles) grows less, so F6, F18 and F23 show only from about 180% there, and F1, F10 and F17 a step later. **High** = text can't be read, things overlap, or a control is hard to use. **Medium** = cut early or looks broken. **Low** = cosmetic.

### Shared parts (they show up on many screens)

| # | Where it shows | What goes wrong | From | Severity | Code |
| --- | --- | --- | --- | --- | --- |
| F1 | Every text field: Sign in, Sign up, Forgot, Reset password, Edit profile | The field is a fixed 60 high and the typed text a fixed 28. The label and value no longer fit: the value sits on the bottom border with its descenders cut, and at 200% it spills out of the box. | 150% | High | [Field.tsx:151](../../components/ui/Field.tsx#L151), [:161](../../components/ui/Field.tsx#L161) |
| F2 | Add and Edit piano forms (Add1Basics, Add2Details) | The label column is a fixed 84 wide (112 for prices) and one line, so labels read "Custo…", "Purchase p…", "Monthly r…". Rows are a fixed 56 (52 in sheets). | 130% | High | [FormRow.tsx:67](../../components/ui/FormRow.tsx#L67), [:73](../../components/ui/FormRow.tsx#L73), [:115](../../components/ui/FormRow.tsx#L115), [Group.tsx:14](../../components/ui/Group.tsx#L14), [PianoCategoryFields.tsx:24](../../components/PianoCategoryFields.tsx#L24) |
| F3 | Category choice on Add and Edit; Theme on Account | Options share one row, one line each: "Rentable", "Warehouse" and "Match phone" are cut. "Warehouse" is already at the edge at 100% on a narrow phone. | 130% | High | [Segmented.tsx:112](../../components/ui/Segmented.tsx#L112), [:141](../../components/ui/Segmented.tsx#L141) |
| F4 | Every sheet with a title (Record payment, Extend rental, Mark as sold, Edit payment, Mark returned, Filters, Sort by, date picker); the Add and Edit top bar; select mode on Pianos | "Cancel" is pinned to the left and the title is centred on the whole width, in a fixed 52 high row. A title like "Record payment" runs into "Cancel"; in select mode "3 selected" runs into both "Cancel" and "Select all". | 150% | High | [Sheet.tsx:276](../../components/ui/Sheet.tsx#L276), [AddFlowChrome.tsx:92](../../components/AddFlowChrome.tsx#L92), [SelectionHeader.tsx:73](../../components/SelectionHeader.tsx#L73) |
| F5 | Sticky bar on a piano's page (Detail, DetailSale, DetailSold) | Fixed 50 high. The button ("Record payment") never shrinks and takes about 60% of the width, so the amount wraps onto two lines and the amount and status spill above the bar's top line. | 150% | High | [StickyActionBar.tsx:35](../../components/StickyActionBar.tsx#L35), [:38](../../components/StickyActionBar.tsx#L38), [:51](../../components/StickyActionBar.tsx#L51) |
| F6 | Big amount fields: Record payment, Mark as sold, Edit payment | 44 px digits in a fixed 180 (210) by 56 box. "1,20,000" no longer fits, scrolls inside the field, and the tops of the digits are cut. | 130% | High | [AmountInput.tsx:64](../../components/ui/AmountInput.tsx#L64), [:102](../../components/ui/AmountInput.tsx#L102) |
| F7 | Buttons | A fixed 52 (48 compact), one line. Fine at full width, but labels get cut when two buttons share a row (Add flow footer, the sticky bar) or the label is long ("Extend to 21 Mar 2027"). | 150% | Medium | [Button.tsx:164](../../components/ui/Button.tsx#L164), [:195](../../components/ui/Button.tsx#L195) |
| F8 | Tab bar (Today, Pianos, Account) and toasts | The bar is a fixed 50 above the system inset, so labels drop into the gesture area at 150% and partly off screen at 200%. Toasts are placed using that same 50, so once a bar grows, a toast covers it. | 150% | Medium | [TabBar.tsx:39](../../components/ui/TabBar.tsx#L39), [ToastHost.tsx:137](../../components/ToastHost.tsx#L137), [theme.ts:207](../../constants/theme.ts#L207) |
| F9 | Badges on photos (Pianos grid, Search) | "Overdue · 18 days" grows wider than the photo and runs under the category circle. | 150% | Medium | [Badge.tsx:43](../../components/ui/Badge.tsx#L43), [PianoCard.tsx:72](../../components/PianoCard.tsx#L72) |
| F10 | Search pill on Pianos | A fixed 52 high with two lines: the lines touch the pill's edges at 150% and spill out at 180%. The 18 px filter count cuts its number. | 150% | Medium | [SearchPill.tsx:85](../../components/ui/SearchPill.tsx#L85), [:115](../../components/ui/SearchPill.tsx#L115) |
| F11 | Lists in sheets: Sort by, the ⋯ menu on a piano, payment actions, photo options on Edit profile and Add piano | Rows are a fixed 52; a label that wraps overlaps the next row. | 180% | Medium | [PickerSheet.tsx:84](../../components/ui/PickerSheet.tsx#L84), [PianoActionsSheet.tsx:43](../../components/PianoActionsSheet.tsx#L43), [PaymentActionsSheet.tsx:60](../../components/PaymentActionsSheet.tsx#L60), [edit-profile.tsx:308](../../app/edit-profile.tsx#L308), [PianoPhotoField.tsx:190](../../components/PianoPhotoField.tsx#L190) |
| F12 | Dialogs (delete piano, delete payment, discard changes) | A fixed 284 wide with 52 high choices. The message wraps fine, but a choice that wraps at 200% is cut, and with a large Display size there is little room either side. | 200% | Low | [Dialog.tsx:8](../../components/ui/Dialog.tsx#L8), [:147](../../components/ui/Dialog.tsx#L147) |
| F13 | Date picker | Month row a fixed 48, weekday row 32: tight at 200%, fine at 150%. | 200% | Low | [DatePickerSheet.tsx:182](../../components/ui/DatePickerSheet.tsx#L182), [:198](../../components/ui/DatePickerSheet.tsx#L198) |

### Screens

| # | Screen (board) | What goes wrong | From | Severity | Code |
| --- | --- | --- | --- | --- | --- |
| F14 | Pianos (Pianos) | The five category tabs share the width, one line each: "Rentable" and "Warehouse" are cut. | 150% | High | [IconTabs.tsx:73](../../components/ui/IconTabs.tsx#L73), [home.tsx:71](../../app/(tabs)/home.tsx#L71) |
| F15 | Pianos, list layout | The price on the right keeps its full width, so the title, make and status are squeezed into what is left and cut after a few words (a few letters on a narrow phone). | 150% | High | [PianoRow.tsx:120](../../components/PianoRow.tsx#L120) |
| F16 | Pianos, grid layout; Search results | Each card line is one line: title, make and "price · status" are cut early; often only the price is left. | 130% | Medium | [PianoCard.tsx:82](../../components/PianoCard.tsx#L82) |
| F17 | Extend rental (ExtendRental) | Options are a fixed 56 high with two lines of text (60 px at 150%), so each option overlaps the next. | 150% | High | [ExtendRentalSheet.tsx:138](../../components/ExtendRentalSheet.tsx#L138) |
| F18 | Today (Main) | "Received in October" is 44 px with no limit: a lakh figure ("₹12,45,000") breaks in the middle of the number onto two lines. | 150% | Medium | [today.tsx:168](../../app/(tabs)/today.tsx#L168), [:305](../../app/(tabs)/today.tsx#L305) |
| F19 | Today (Main) | In stock / On rent / Sold this month in three columns: the sold amount is one line and is cut ("₹1,42,…"). | 150% | Medium | [today.tsx:180](../../app/(tabs)/today.tsx#L180) |
| F20 | Today rows and the Rented out shelf | Title, customer and status are one line each and are cut sooner. The rows themselves grow fine. | 150% | Low | [AttentionRow.tsx:42](../../components/AttentionRow.tsx#L42), [RentDueRow.tsx:52](../../components/RentDueRow.tsx#L52), [ShelfCard.tsx:49](../../components/ShelfCard.tsx#L49) |
| F21 | Piano page details (Detail) | Label and value side by side: long values wrap into a narrow right-aligned column. | 150% | Medium | [DetailParts.tsx:95](../../components/DetailParts.tsx#L95) |
| F22 | Make picker (MakePicker) | The A to Z index grows with the text: 26 letters need about 590 px at 150% and run off the bottom of the sheet. | 150% | Medium | [MakePickerSheet.tsx:227](../../components/MakePickerSheet.tsx#L227) |
| F23 | Income | Same big amount problem as Today. The 12 chart bars are a fixed 28 wide, wider than a phone with a large Display size allows, so bars overlap. | 150%, or large Display size | Medium | [income.tsx:210](../../app/income.tsx#L210), [IncomeChart.tsx:18](../../components/IncomeChart.tsx#L18) |
| F24 | Welcome (signed out only) | Does not scroll. The headline takes three or four lines and pushes "Create account" off the bottom of shorter screens. | 150% | Medium | [WelcomeScreen.tsx:84](../../components/WelcomeScreen.tsx#L84) |
| F25 | Account (Account) | Rows grow and hold up. The profile counts get cramped; "Sold this month" wraps unevenly. | 150% | Low | [profile.tsx:318](../../app/(tabs)/profile.tsx#L318) |
| F26 | Piano not found | "Go back" button is a fixed 128 wide; its label is cut. | 200% | Low | [detail/[id].tsx:487](../../app/detail/[id].tsx#L487) |
| F27 | Loading skeletons (LoadingToday, LoadingPianos, LoadingDetail) | Drawn at 100% sizes, so the page jumps when content arrives. | 130% | Low | leave as is |

### Added since the first audit: paper forms, letterhead, service log (Batches 30 to 35, checked 2026-10-15)

| # | Where it shows | What goes wrong | From | Severity | Code |
| --- | --- | --- | --- | --- | --- |
| F28 | **Every PDF from Paper forms**: each form, both agreements, the full kit | expo-print draws the PDF in Android's web view, and Android's web view enlarges text by the phone's Font size unless it is told not to (expo-print's changelog: `textZoom` exists "to override font scaling applied by the user's Android device settings"). The app doesn't pass it, so on the dad's phone every printed page comes out with text about 1.5 times the designed size. The pages were laid out for normal text (Batch 31A fills pages from Figtree's letter widths), so text overflows table cells, lines wrap, blocks run off the page and the page count no longer matches. | any size other than 100% | **High** | [paperPdf.ts:118](../../lib/paperPdf.ts#L118) |
| F29 | The page previews on every paper form, the agreement and the letterhead screens | Same cause in the preview's web view: the preview shows enlarged text, so it doesn't match the page that prints. | any size other than 100% | High | [PaperPreview.tsx:53](../../components/PaperPreview.tsx#L53) |
| F30 | "How many copies" row on a paper form and the agreement | A fixed 60 high, with the label and hint next to the − 1 + buttons: the hint wraps and the text spills out of the white box. | 150% | Medium | [PaperActions.tsx:124](../../components/PaperActions.tsx#L124) |
| F31 | Service on a piano's page | "Log service" and "Message <name>" share a row, a fixed 48 high and one line each: "Message R…" is cut and "Log service" runs out of its button. | 150% | Medium | [ServiceSection.tsx:186](../../components/ServiceSection.tsx#L186), [:197](../../components/ServiceSection.tsx#L197) |
| F32 | Letterhead > Your details | Form rows with a 100 wide label column: "What you do" and "Business" are cut. Same cause as F2. | 130% | Medium | [letterhead-details.tsx:45](../../app/letterhead-details.tsx#L45) |
| F33 | Agreement (Hotel / Private person); letterhead upload (Whole page / Top strip only); lettering (Clean / Elegant) | Two-choice segmented controls: "Private person" and "Top strip only" are cut on narrower phones. Same cause as F3. | 150% | Medium | [paper-agreement.tsx:67](../../app/paper-agreement.tsx#L67), [letterhead-upload.tsx:114](../../app/letterhead-upload.tsx#L114) |
| F34 | Make a letterhead, the design cards | Cards are a fixed 84 wide with the name under the drawing: "Monogram" breaks in the middle of the word. | 150% | Medium | [letterhead-make.tsx:231](../../app/letterhead-make.tsx#L231) |
| F35 | Letterhead thumbnails (Monogram) | The initials drawn on the tiny page grow with Font size and spill out of the drawing. | 130% | Low | [FormThumbnail.tsx:70](../../components/FormThumbnail.tsx#L70) |
| F36 | Empty Pianos list, "Prefer paper? Print forms" | A text button with a fixed 44 height and one line: the label is cut. | 150% | Low | [StateView.tsx:121](../../components/ui/StateView.tsx#L121) |
| F37 | A piano's service history ("Show all services") | Three numbers side by side, like Today's counts (F19): values are cut and labels wrap unevenly. | 150% | Low | [service/[id].tsx:118](../../app/service/[id].tsx#L118) |
| F38 | The copies stepper | The number sits in a fixed 36 wide slot: two digits touch its edges. | 200% | Low | [Stepper.tsx:75](../../components/ui/Stepper.tsx#L75) |
| F39 | Letterhead upload, the numbered steps | The number circles are a fixed 24: the digit is cut. | 200% | Low | [letterhead-upload.tsx:181](../../app/letterhead-upload.tsx#L181) |
| F40 | Top bar of the new screens (`BackBar`) | Built the right way (Back, title, an equal spacer), so the title never runs into Back; only a long title is cut to one line at big sizes. **This is the pattern F4 should copy.** | 180% | Low | [BackBar.tsx:24](../../components/BackBar.tsx#L24) |

These new parts already hold up: the Paper forms list, the Letterhead screen, the Tuning interval sheet, the kinds in Log service (they wrap onto more lines), the service rows, Today's Service due rows and Account's Paper forms row. They use `minHeight`, padding and text that wraps, which is what the rest should do.

## 4. Approach (decisions)

- **D1. Let text grow.** Don't switch off font scaling and don't limit ordinary text: large text is the reason the setting is on. Limit only text that is already big, where growing helps nobody and breaks the layout. A `maxScale` table in `constants/theme.ts`, passed as `maxFontSizeMultiplier`:
  - big numbers and titles (Today and Income amounts, amount fields, tab titles, piano title, Welcome and Lock headlines): **1.3**
  - section and sheet titles: **1.5**
  - small fixed chrome: tab labels **1.5**, photo badges **1.3**, filter count and A to Z index **1.2**
  - everything else: no limit (Android's own maximum, 200%)
- **D2. One switch for big text.** `lib/useTextScale.ts` returns `{ fontScale, large }` from `useWindowDimensions()`, with `large` when `fontScale >= 1.25`. On most phones 115% leaves the layout alone and 130% and up turns it on. It updates if the setting changes while the app is open.
- **D3. Fixed heights become minimum heights.** Rows, buttons, fields, sheet headers and bottom bars: `height: N` becomes `minHeight: N` plus vertical padding. At 100% they measure exactly what they do today, so the boards still match.
- **D4. In big-text mode, crowded rows stack:**
  - form rows: label above the value, full width
  - piano page details: label above the value
  - sticky bar: amount and status on top, a full-width button under them
  - Pianos list row: price under the status line
  - Today and Account counts: a short list ("In stock 12") instead of three columns
  - segmented choices: one choice per row
  - category tabs: scroll sideways, each tab as wide as its label
  - sheet, Add and select-mode headers: the title gets its own space between the side buttons and may take two lines
- **D5. Bottom bars measure themselves.** The tab bar and the sticky bar report their real height and toasts sit above that, not above a fixed 50.
- **D6. Nothing wider than the screen** (for Display size): dialog width is the smaller of 284 and the screen less 40; chart bars are the smaller of 28 and their column less 4; amount fields take the width they have.
- **D7. One-line text.** Keep `numberOfLines={1}` for names in lists, which open to the full text, but allow two lines for card and row titles and for button labels in big-text mode.
- **D8. Ship as an update.** All of this is JavaScript, so it can go out as an over-the-air update (`npm run update:production`) with no new build.
- **D9. Paper keeps its size.** A PDF and its preview must be the same on every phone, so web views and PDFs ignore the phone's Font size: `textZoom: 100` for `Print.printToFileAsync` and `textZoom={100}` on every `WebView`. This is the one place text must not grow.
- **D10. Text inside a drawing doesn't scale.** Initials on a paper thumbnail are part of a picture, not something to read: `allowFontScaling={false}`.

## 5. Owner questions

Each has a default; work goes ahead with the default until the owner answers. Move answered ones to **Answered**.

(none open)

### Answered

- **Q1. Which phone does your dad have?** *Answer (2026-10-14):* a Samsung Galaxy S24 FE on the latest Android update in India. It shipped with Android 14 (One UI 6.1), so it is Android 14 or later and uses the **non-linear** scaling: labels, rows, buttons and tabs break at 150%, while big amounts and titles grow much less. The exact Font size and Screen zoom levels are not known. *Acted on:* aim at everything up to 200% font and the largest Display size (Samsung calls it Screen zoom); check first on an Android 15 or 16 emulator, and do a shorter pass on Android 13 for other people on older phones (see section 7). Batch L5.
- **Q2. Pianos grid at big text.** *Answer:* the owner left it to us; keep two columns for now and change it later if it still looks wrong on the phone. *Acted on:* option (a), two columns, the title may take two lines, and price and status get their own lines. Batch L4.
- **Q3. Limits on already-big text.** *Answer:* (a), the limits in D1. Batch L1.
- **Q4. Category tabs on Pianos at big text.** *Answer:* (a), the row scrolls sideways and every label shows in full. Batch L3.

## 6. Batches

Tick `[x]` when done. Rules: work on a branch `feature/large-text` off `main`; keep `npm run typecheck`, `npm test` and `npm run lint` green before every commit; at 100% text nothing may change on screen (existing tests should pass untouched, and any that must change say why under Decisions); commit at the end of each batch as `large-text: batch N <name>`.

- [ ] **Batch L0. Paper forms print at their real size** (S) [L0.1 to L0.3 done 2026-10-15; L0.4 is the owner's check on a phone]. Do this first, on its own branch off `main`: the owner's printed forms are wrong today, and it is two lines.
  - [x] L0.1 `textZoom: 100` in `Print.printToFileAsync` in `lib/paperPdf.ts` (F28)
  - [x] L0.2 `textZoom={100}` on the `WebView` in `components/PaperPreview.tsx` (F29)
  - [x] L0.3 Tests that both pass 100; typecheck, tests, lint, commit [`paperPdf.test.ts` has the PDF case and the new `paperPreview.test.tsx` the preview; the web view mock in `__tests__/helpers/setup.js` now passes `textZoom` through. Both tests fail without the fix. 164 suites, 2597 tests green]
  - [ ] L0.4 On the emulator at Font size 150%, save a form and an agreement and compare them with the same PDFs made at 100%: same text size, same page count. Ship over the air to the runtime 5 build
- [x] **Batch L1. Foundations** (S) [done 2026-10-15]
  - [x] L1.1 `lib/useTextScale.ts` (`fontScale`, `large` at 1.25 and up) and a test helper in `__tests__/helpers/render.tsx` that renders at a chosen `fontScale` [`useTextScale()` returns `{ fontScale, large }`; `isLargeText` and `LARGE_TEXT_FROM` are exported. React Native's Jest preset says the phone's Font size is 200%, so `helpers/setup.js` now starts every test at 100%; `setFontScale(n)` and `atFontScale(n)` (a describe block's `beforeEach`/`afterEach`) in `helpers/render.tsx` change it]
  - [x] L1.2 `maxScale` table in `constants/theme.ts` (D1) and a short "Large text" section in `docs/redesign/SPEC.md` [section 9 of SPEC; the table has `amount` and `title` 1.3, `section` and `tabLabel` 1.5, `badge` 1.3, `count` 1.2; also `amountTextProps` for an amount's one-line fit]
  - [x] L1.3 Apply the limits to big text: Today and Income amounts (also one line that shrinks to fit, so a number never breaks), tab titles, piano title, Welcome and Lock headlines (F18, F23) [every `Text` that uses `type.largeTitle`, `type.pianoTitle` or `type.amount`: the titles of Today, Account, Customers, Income, Edit profile, Paper forms, Service history, the Add flow, the Sign in family, a customer's page, the piano page (and its price), the Welcome and Lock headlines and the "Published" title; the amounts on Today, Income and a customer's page. Section and sheet titles, tab labels and badges have their limits in the table and get them in Batch L3]
  - [x] L1.4 Tests, typecheck, lint, commit [`largeText.test.tsx`: the hook, the table, Today's title and amount, and two guards that fail when a screen uses a big title or amount style without its limit. 165 suites, 2609 tests]
- [x] **Batch L2. Controls** (M) [done 2026-10-15; not yet looked at on a phone]
  - [x] L2.1 `Button`: `minHeight`, label may take two lines in big-text mode (F7) [`minHeight` 52 or 48 plus 10 above and below the label; `numberOfLines` 2 from 125%; the label shrinks so a spinner and a long label share the row. The Back button of the Add flow is `minWidth: 104`, and Empty Pianos' link `minHeight: 44`, since both used to override the button's size]
  - [x] L2.2 `Field`: `minHeight`, typed text sized by its line height, not 28 (F1) [box `minHeight` 60 with 10 above and 6 below the label and value, so it is 60 at 100% and grows after; the value `minHeight` 28; the Show/Hide target `minHeight` 44]
  - [x] L2.3 `FormRow` and `Group`: `minHeight`; in big-text mode on a page the label sits above the value; in sheets label and value may wrap (F2, and Letterhead details F32) [`Group` has no sizes of its own, so only `FormRow` changed. Below 125% the label column grows with the text (84 at 100%, 97 at 115%); from 125% a page row stacks, and a sheet row lets its label and value wrap. A text field's row is as tall as the row (`alignSelf: stretch`) instead of `height: 100%`]
  - [x] L2.4 `Segmented`: one choice per row in big-text mode, whatever the number of choices (F3, F33) [from 125% the track is a column, the chosen row is the white one and the chip is not drawn; below it nothing changed, and its options keep their fixed 40 because their label is one line]
  - [x] L2.5 `AmountInput`: takes the width it has, limit 1.3, height from the text (F6) [`minWidth` 180 or 210 and `flexShrink` 1 instead of a width, `minHeight` 56, limit `maxScale.amount` on the digits and the rupee sign. To look at on a phone: the digits' box now follows the text's own width once it is wider than the board's]
  - [x] L2.6 Rows in `PickerSheet`, the action sheets, Edit profile and photo options, Extend rental options: `minHeight` (F11, F17) [each `minHeight` 52 or 56 with 8 above and below; the picker's label and the Extend rental texts shrink to leave room for the check]
  - [x] L2.7 `DatePickerSheet`: `minHeight` on the month and weekday rows (F13) [the month's name may wrap before it pushes the arrows off; the weekday heads take the `count` limit (1.2) since seven of them share the width]
  - [x] L2.7a The copies row: `minHeight`, and in big-text mode the stepper goes under the label; `Stepper`'s number gets a `minWidth` instead of a width (F30, F38) [also Print and Share `minHeight` 48]
  - [x] L2.8 Tests at 1.0 and 1.5 for each, typecheck, lint, commit [`largeTextControls.test.tsx`, 21 tests, 12 of which fail without the change. Eleven older assertions changed from `height` to `minHeight` on purpose (button, field, form row, picker, amount input, state view, filters and detail tests). 166 suites, 2630 tests]
- [x] **Batch L3. Headers, bars and badges** (M) [done 2026-10-15; not yet looked at on a phone]
  - [x] L3.1 `Sheet` title row, the Add and Edit top bar and the select-mode header: three slots (left button, title, right button or spacer of the same width), as `BackBar` already does, so the title never runs into a button and may take two lines; `BackBar` gets `minHeight` and a two-line title too (F4, F40) [the sheet and the Add flow use one layout at every size: Cancel, the title with `flex: 1`, and an unseen copy of Cancel at the other end so the title stays centred and has the room between to wrap in. Select mode keeps its title laid over the middle of the bar below 125%, since its two buttons differ in width, and puts it between them from 125%. Titles and their buttons take the `section` limit (1.5)]
  - [x] L3.2 `TabBar`: `minHeight`, label limit 1.5, reports its height (F8) [`lib/bottomBars.ts`: a bar calls `useReportBottomBar()` and puts the result on its `onLayout`; the bar in front wins and a bar that leaves is forgotten. A tab is 51 high at 100%, so the bar keeps the 84 of the board with 33 below it]
  - [x] L3.3 `StickyActionBar`: `minHeight`, stacked in big-text mode, reports its height (F5) [from 125% the amount and its line sit above a full-width button; the line may take two lines]
  - [x] L3.4 `ToastHost`: sits above the reported bar height (F8) [12 above the bar in front; the 100% value until a bar has been measured, and again once it has gone]
  - [x] L3.5 `IconTabs`: in big-text mode the row scrolls sideways and tabs take their label's width (F14, Q4)
  - [x] L3.6 `SearchPill`: `minHeight`; the hint line hides in big-text mode; filter count limit 1.2 (F10) [the pill's radius is 999 instead of 26, which is the same at 52 high and keeps it round when taller; the Search pianos button still says "Title, make or customer" to a screen reader]
  - [x] L3.7 `Badge`: limit 1.3, one line, leaves room for the category circle (F9) [on a photo, from 125%: at most 65% of the photo wide and the words may take a second line ("Overdue ·" / "18 days") rather than end in a dot; at 100% it is as drawn]
  - [x] L3.8 `Dialog`: width the smaller of 284 and the screen less 40; choices `minHeight` (F12) [also at most 90% of the screen high, its words scrolling inside so the choices can always be pressed, and the title takes the `section` limit]
  - [x] L3.9 Tests, typecheck, lint, commit [`largeTextBars.test.tsx`, 28 tests, 11 of which fail without the change, and a third guard in `largeText.test.tsx`: a screen that uses `type.section` or `type.sheetTitle` needs `maxScale.section`. Also the section titles of Today, a customer's page, the piano page, the Income card and the Add flow summary take the limit. Eight older assertions moved from `height` to `minHeight`. 167 suites, 2659 tests]
- [x] **Batch L4. Screens** (M) [done 2026-10-15; not yet looked at on a phone]
  - [x] L4.1 Today: counts become a list in big-text mode; row and shelf titles may take two lines (F19, F20) [the three counts are one line each, the number at the right; the rows of Attention, Rent due, Rented out, Recent payments and Service due, and the customers list, give every line two lines, and a customer's amounts go under the name]
  - [x] L4.2 Pianos grid card in big-text mode: still two columns, the title may take two lines, price and status on their own lines (Q2); the list row's price under the status line (F15, F16) [the grid keeps its two columns as the owner chose (Q2); its price and status get a line each, the status without its leading " · "]
  - [x] L4.3 Piano page: details stack in big-text mode; "Go back" button `minWidth` instead of a width (F21, F26) [the page's action rows (Edit, Share, Delete…) are `minHeight` 52 and wrap; the renter's name may take two lines]
  - [x] L4.4 Make picker: A to Z index limit 1.2, hidden when it doesn't fit the sheet (F22) [`indexFits`: 8 + letters x (13 x the Font size, up to 1.2, + 3) must fit the list's measured height; the make rows and headings stay a fixed height on purpose, since the jump to a letter adds them up: a make is one line, a heading takes the `section` limit]
  - [x] L4.5 Account counts become a list in big-text mode (F25)
  - [x] L4.6 Income chart bars fit their columns (F23, D6) [a bar is `width: 100%` up to 28, in a column that may shrink]
  - [x] L4.7 Welcome scrolls; the orange top gets shorter in big-text mode (F24) [the shortening was taken out again in Batch L5: on the emulator the keys of the drawn keyboard rose behind the name "Pianoverse". Welcome now only scrolls, and its orange top is as tall as at 100%]
  - [x] L4.8 Service on a piano's page: the two buttons get `minHeight` and stack in big-text mode; the service history numbers become a list like Today's (F31, F37)
  - [x] L4.9 Letterhead screens: design cards grow with their name and wrap by word; thumbnail initials don't scale; the upload step circles get a `minWidth` and `minHeight` (F34, F35, F39)
  - [x] L4.10 Empty Pianos: the "Prefer paper? Print forms" link uses the button's own `minHeight`, not a fixed height, and may take two lines (F36) [done in Batch L2, with the button]
  - [x] L4.11 Tests, typecheck, lint, commit [`largeTextScreens.test.tsx` (19 tests) and new cases in `accountScreen` and `serviceScreens`; 12 of the new ones fail without the change. 168 suites, 2684 tests]
- [ ] **Batch L5. Check on a phone** (S) [the emulator part was done 2026-10-15 on Android 15; the phone part is the owner's]
  - [~] L5.1 On the emulator, go through every screen in section 7 at 100%, 130%, 150% and 200%, and at the largest Display size; fix what is left [done at 150% and 200% for the screens listed under "What L5 looked at" below; not done at 130%, 180% or the largest Screen zoom, on an Android 13 image, or for the screens under "Not looked at"]
  - [ ] L5.2 Check at 100% that every screen still matches its board [only Welcome was looked at at 100%; the rest is covered by the tests, which pass with the sizes of the boards]
  - [ ] L5.3 Ship as an over-the-air update, then check on the dad's Galaxy S24 FE at his own settings (Q1); if the Pianos grid still looks wrong there, revisit Q2 [not done: needs the owner's go-ahead to publish, and his phone]
  - [ ] L5.4 Session log, commit

## 7. How to check

With the emulator running and the app open:

```bash
adb shell settings put system font_scale 1.5
```

```bash
adb shell wm density 525
```

Put them back with:

```bash
adb shell settings put system font_scale 1.0
```

```bash
adb shell wm density reset
```

`font_scale` takes 1.0, 1.3, 1.5, 1.8 and 2.0. For `wm density`, first read the phone's own value with `adb shell wm density` and use about 1.25 times it to copy the largest Display size (525 is that for a Pixel emulator, whose own value is 420).

The dad's Galaxy S24 FE is Android 14 or later (Q1), so do the full pass on an **Android 15 or 16** emulator image, which scales text the same non-linear way, and a shorter pass on an **Android 13** image (linear scaling) for people on older phones. A narrow emulator (about 360 wide) is the harsher test, and Screen zoom makes any phone narrower. On the phone itself, Samsung keeps both settings under Settings > Display: **Font size and style** and **Screen zoom**.

Screens to go through at each size: Welcome, Sign in (with an error), Sign up, Forgot; Today (with overdue and rent due rows); Pianos grid and list, select mode, Filters, Sort by, Search; a rented, an on-sale and a sold piano's page, the ⋯ menu, Record payment, Extend rental, Mark as sold, Mark returned, Edit payment, date picker; Add steps 1 to 3 with the Make picker and photo options; Edit piano; Account, Edit profile, Income, Customers, a customer's page; Paper forms, each form, the agreement (Hotel and Private person), and a PDF from each opened next to one made at 100%; Letterhead, Make one, Upload mine, My printed paper, Your details; Today's Service due, a piano's Service section, Log service, Tuning interval, the service history; every dialog (delete piano, delete payment, discard changes, sign out, delete account); a toast over the tab bar and over the sticky bar.

## 8. Prompts

First session:

```
Read docs/large-text/PLAN.md completely, then docs/redesign/SPEC.md and CLAUDE.md. Create the branch feature/large-text from main. Do the first unticked batch (L0, then L1), ticking each sub-task in docs/large-text/PLAN.md as soon as it is done. At 100% text nothing may change on screen. Before committing run npm run typecheck, npm test and npm run lint. When the batch is done, add a Session log entry, commit, and give me a short "how to check" list and the prompt for the next session. Show me every open owner question in full. Do not start the next batch.
```

Every later session:

```
Continue the large-text work. Read docs/large-text/PLAN.md (Progress, Decisions, Session log and Owner questions). Run git status and git log --oneline -10 and check they match the Session log. Do the next unticked batch, ticking sub-tasks as you go. Typecheck, tests and lint must pass before the commit. Then add a Session log entry, commit, give me the "how to check" list and the prompt for the next session, and show every open owner question in full. Do not start the following batch.
```

## What L5 looked at (2026-10-15, Android 15 emulator, 1080 x 2400 at 420 dpi)

**At 150%:** Welcome; the controls (text fields, form rows on a page and in a sheet, segmented choices, buttons, the amount field, the copies row); Pianos (search pill, category tabs, grid cards, list rows, a customer row); the sticky bar and a toast over it; Today; Account; a rented, overdue piano's page; the Paper forms list; the Rent card form with its page preview; Letterhead and its details; Add piano, step 1; a piano's service history.

**At 200%:** Welcome; Pianos (grid cards and badges); Account; a piano's page; the Record payment sheet; the date picker; Add piano, step 1; the Make picker with its index.

**Not looked at:** 130%, 180% and the largest Screen zoom; a narrow (360 wide) screen; Android 13 (linear scaling); Today, controls, bars and Paper forms at 200%; Sign in and Sign up; Letterhead make, upload and printed; the rental agreement; Extend rental, Mark as sold, Mark returned and Edit payment; the piano's ⋯ menu; dialogs; the select-mode header; Filters and Sort by; the Income chart; the customers list and a customer's page; the Welcome screen on a short phone; real data (long names, big amounts).

## Decisions

- 2026-10-14, owner answers. The target phone is a Samsung Galaxy S24 FE on Android 14 or later, so non-linear scaling is what matters most: the label, row, button and tab problems (F2, F3, F4, F5, F7, F8, F9, F14, F15, F16) show at 150% on it, while the big-number ones (F6, F18, F23) show only near 200%. All findings are still fixed, since other people may be on older phones. Q2 was left to us: two columns stay, with two-line titles in big-text mode, to be looked at again on the phone in L5. Q3 and Q4 take option (a).

- 2026-10-15, second audit. Batches 30 to 35 (paper forms, letterhead, usage counts, Appwrite check, crash reporting, service log) were checked the same way: F28 to F40. The PDFs (F28) are the worst problem in the app for the owner, since they are wrong on paper and not only on screen, so they get their own small Batch L0, done first. The owner asked that every future screen be built for large text from the start: the rules are in `CLAUDE.md` (section "Large text") and in rule 15 of `docs/redesign/PLAN.md`.

- 2026-10-15, batch L1, **A style can't carry a limit, so a guard test does.** `maxFontSizeMultiplier` is a `Text` prop, not a style, so `type.largeTitle` can't include it. `largeText.test.tsx` reads every file under `app/` and `components/` and fails when one spreads `type.largeTitle` or `type.pianoTitle` without `maxScale.title`, or `type.amount` without `amountTextProps`, so a new screen can't forget.
- 2026-10-15, batch L1, **Tests start at 100%.** React Native's Jest preset reports a Font size of 200%. Left alone, every screen that switches layout at 125% would be in big-text mode in every existing test, so `helpers/setup.js` sets 1 and a test that wants more asks for it.
- 2026-10-15, batch L1, **Nothing changes at 100%.** The limits don't act below their value, and an amount that already fits on one line doesn't shrink. Not yet looked at on a phone at 150%: that is Batch L5.

- 2026-10-15, batch L2, **A fixed height stays where the text can't grow into it.** The options of `Segmented` at under 125% keep their fixed 40 because each holds one line, and the sliding chip is placed by that height; the 44 px round and icon-only buttons stay too. Everything that holds words that can wrap is a minimum.
- 2026-10-15, batch L2, **Below 125% the label column grows with the text instead of switching layout.** A form row's labels are 84 wide (112 for prices) at 100%; at 115% they are 97 (129), so a label that fit still does, and the label-above-value layout starts only at 125%.
- 2026-10-15, batch L2, **Eleven tests changed on purpose.** They said `height: 52` and so on, which is now `minHeight: 52`. At 100% the sizes are the same.

- 2026-10-15, batch L3, **One layout at every size for the title rows.** The sheet's and the Add flow's title rows used to lay the button over the corner and centre the title on the whole row. They are now three slots with an unseen copy of Cancel at the right, which looks the same at 100% (the title is centred, the button is 44 high at 4 from the top and 8 from the side) and can't run into the button at any size. A conditional layout would have left the sizes between 100% and 125% to chance.
- 2026-10-15, batch L3, **Select mode is the exception.** Its left and right buttons differ ("Cancel" and "Select all"), so a copy of one can't centre the title. Below 125% it keeps the title over the middle of the bar, as drawn; from 125% the title sits between the buttons.
- 2026-10-15, batch L3, **A bar at the bottom tells the toasts how tall it is.** `lib/bottomBars.ts`. The constants in `bottomBar` stay for the bar's least height and for the toast's place before a bar has been measured.
- 2026-10-15, batch L3, **Eight tests changed on purpose.** `height: 84` and the like became `minHeight: 84`; the search pill's radius 26 became 999 (the same shape); the sheet's Cancel is no longer `position: absolute`.

- 2026-10-15, batch L4, **The make picker's rows keep a fixed height.** The jump to a letter adds up the headings and rows (`headingOffset`), so they must have known heights. A make is one line now (`numberOfLines` 1), which fits the row at any Font size; a make that is too long ends in a dot instead of overflowing.
- 2026-10-15, batch L4, **One list for every row of three counts.** Today, Account and a piano's service history show "In stock / On rent / Sold this month"-style columns; from 125% each becomes a line with the number at the right (`flexDirection: row-reverse`, so the order of the words for a screen reader is unchanged).
- 2026-10-15, batch L4, **The Welcome screen scrolls.** It is a `ScrollView` whose content is at least the screen, so at 100% the buttons stay at the bottom as drawn and with a big Font size nothing is pushed off the screen.

- 2026-10-15, batch L5, **What the emulator showed that the code review and the tests didn't.** (1) Welcome: shrinking the orange top (L4) let the drawn keys rise behind the name, so the shortening was removed. (2) Account's rows had no vertical padding, so with wrapped text their titles touched the lines between rows: `dataRow` and Sign out now have `paddingVertical` 12 with the same minimum heights. (3) The photo badge broke between the number and its unit ("Overdue · 18 / days"): from 125% the space after a digit is a non-breaking one. (4) A sheet's "Paid on" broke in two and the Note field's hint was cut at 200%: in a sheet the label now keeps its words together (up to half the row) and the value wraps, and a text field in a sheet gets its label above it, as on a page. (5) The letterhead row's title was cut ("Monogram · add…"): two lines from 125%. Tests: the code is checked against styles, and these five were about what Android's text engine does with them.
- 2026-10-15, batch L5, **How it was looked at.** A development build made in WSL (`eas build --profile development --local`), installed on an Android 15 emulator profile made for the purpose (`Pixel_8_Android_15`, a copy of the Android 13 one pointing at the Android 15 image), Metro on this PC and `adb reverse tcp:8081 tcp:8081`, `adb shell settings put system font_scale 1.5` (and `2.0`). Sign-in is not possible there without the owner's real credentials, so a scratch screen (not kept) seeded the redux store with six made-up pianos and opened the real screens; Today, Pianos and Account were drawn with those, and the piano page, Paper forms, Letterhead and Add piano were the real routes. The development build also created a `development` update channel on the EAS project.

(more added as batches go)

## Session log

### Session 0, 2026-10-14

Audit of every screen and shared component against Android Font size and Display size, written up as this plan. No code changed. Same day: the owner answered Q1 to Q4 (moved to Answered, see Decisions).

### Session 1, 2026-10-15

Second audit, of everything added since (Batches 30 to 35): F28 to F40 and Batch L0. Added the large-text rules to `CLAUDE.md` and to the redesign plan's working rules, so new work follows them. No app code changed.

### Session 2, 2026-10-15

Batch L0: `textZoom: 100` on the PDF (`lib/paperPdf.ts`) and on the page preview's web view (`components/PaperPreview.tsx`), with tests. Not yet checked on a phone (L0.4): at font scale 1.5, save a form and an agreement and compare them with PDFs made at 1.0.

### Session 3, 2026-10-15

Batch L1 (foundations): `lib/useTextScale.ts`, `maxScale` and `amountTextProps` in `constants/theme.ts`, the limits on every big title and amount, test helpers, SPEC section 9 and `largeText.test.tsx`. Batch L0 (the PDFs) was merged first as PR #50. Next: Batch L2 (controls).

### Session 4, 2026-10-15

Batch L2 (controls): `Button`, `Field`, `FormRow`, `Segmented`, `AmountInput`, the sheet rows, the date picker, the copies row and `Stepper`, with `largeTextControls.test.tsx`. Batch L1 was merged first (PR #51). Next: Batch L3 (headers, bars and badges).

### Session 5, 2026-10-15

Batch L3 (headers, bars and badges): sheet, Add flow, Back and select-mode titles, the tab bar, the sticky bar and the toasts above them (`lib/bottomBars.ts`), the category tabs, the search pill, the badge on a photo and the dialog, with `largeTextBars.test.tsx`. Batch L2 was merged first (PR #52). Next: Batch L4 (screens).

### Session 6, 2026-10-15

Batch L4 (screens): Today, Account and service counts as lists; two-line rows and shelf cards; the Pianos card and row (price on its own line); the piano page details and actions; the make picker index; the Income chart; Welcome; the service buttons; the letterhead cards, thumbnails and steps. Batch L3 was merged first (PR #53). Next: Batch L5 (check on a phone), which needs the owner's phone or an emulator.

### Session 7, 2026-10-15

Batch L5, the emulator part: a development build on an Android 15 emulator, the screens listed above at 150% and 200%, and five fixes the pass showed (Welcome's orange top, Account's row padding, the badge's line break, the sheets' label and field layout, the letterhead row's title). Batch L4 was merged first (PR #54). Not done: the over-the-air update and the check on the dad's phone, which need the owner.
