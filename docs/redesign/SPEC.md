# Pianoverse redesign: design spec

This is the reference for every batch in [PLAN.md](PLAN.md). Read it fully before starting a batch.

## 1. Sources of truth

- **Live design canvas (43 boards):** https://claude.ai/artifact/CAcG5EBb9ySAiSHWUE5Kez
  Read one board with the Artifact tool: `action: "read"`, that `url`, and `path: "project/<Board>.dc.html"`.
- **Offline copy of every board:** [`boards/`](boards/) (same `.dc.html` files plus `canvas.json`, which holds each board's position on the canvas). They are inline-styled HTML, so **open the matching board and read its exact sizes, colours and spacing before building a screen.** They are reference only; they are not part of the app build.
- Sample data on the boards (names, amounts, dates) is made up. Real data comes from the app's redux store and Appwrite.

Board file names by area:

| Area | Boards |
| --- | --- |
| Language | `Foundations`, `Handoff`, `Motion`, `Feedback`, `Dialogs` |
| Launch and auth | `Splash`, `Welcome`, `SignIn`, `SigningIn`, `SignInError`, `SignUp`, `Forgot`, `NotifyPrimer` |
| Tabs | `Main` (Today), `Pianos`, `Filters`, `Search`, `Account`, `SignOutConfirm` |
| Loading and states | `LoadingToday`, `LoadingPianos`, `LoadingDetail`, `RefreshPianos`, `EmptyPianos`, `NoResults`, `LoadError`, `PianosOffline`, `PianosSelect` |
| Detail | `Detail` (rented), `DetailSale`, `DetailSold`, `PhotoViewer`, `RecordPayment`, `ExtendRental`, `MarkSold` |
| Add and edit | `Add1Basics`, `Add2Details`, `Add3Review`, `Publishing`, `Published`, `MakePicker`, `DatePicker`, `CameraDenied` |

## 2. Product structure

- **Tabs:** Today, Pianos, Account. There is no centre Create tab. Adding a piano is the orange **+** button at the top right of Today and Pianos, and it opens the Add flow as its own stack screen.
- **Today** answers "what needs me?": money received this month, what is late or ending soon, the rentals out now, recent payments.
- **Pianos** is the inventory: search pill, category tabs, photo grid or compact list.
- **Account** holds the profile card, CSV export, last-updated time, the reminders explanation and Sign out.
- **Sticky action bar on the piano page** carries one primary action that depends on state:

| Piano state | Primary action |
| --- | --- |
| Rented (active or overdue) | Record payment |
| On sale | Mark as sold |
| Events or Warehouse | Edit piano |
| Sold | Undo sale |

- **Rental status text** (use the existing `utils/rentalStatus.ts` and `utils/pianoStatus.ts` logic, do not rewrite it):
  - End date passed: `Overdue · 18 days` (or months from about 60 days). Red `#C4321C`. Also a red badge on the photo.
  - 7 days or fewer left: `Ends in 3 days`. Orange text `#A85D00`. Also a white badge with an orange dot on the photo.
  - Otherwise: `12 days left` or `2 months left`, secondary grey.
- **Needs attention order:** overdue first (longest overdue on top), then rentals ending within 7 days, soonest first.
- **Today totals:** Received = payments dated in the current month. Sold = pianos whose sale date is this month. On rent = rentals that have not ended. Reuse `utils/stats.ts`, `lib/useRentReceived.ts` and the payments redux slice.
- **Money and dates:** `₹` with Indian grouping (`en-IN`, e.g. `₹1,42,000`), tabular figures (`fontVariant: ['tabular-nums']`). Dates like `21 Dec 2025`. Use the existing `utils/money.ts` and `utils/dates.ts`.

## 3. Tokens

Colours (replace the old navy and orange scheme):

| Token | Hex | Use |
| --- | --- | --- |
| `page` | `#FFFFFF` | Screens with lists |
| `grouped` | `#F6F5F2` | Screens and sheets made of grouped panels |
| `fill` | `#EFEDE8` | Search field fill, secondary buttons, input fill `#F1EFEA` |
| `hairline` | `#E7E4DD` | Dividers. Input borders use `#C9C4B9`. |
| `ink` | `#1A1814` | Primary text, selected states, active tab |
| `ink2` | `#6B665D` | Secondary text |
| `ink3` | `#6F6A62` | Placeholders, inactive tab labels (the boards' `#77716A` darkened a step for 4.5:1 contrast on grey fills, Batch 12.4) |
| `brand` | `#FF9C01` | Primary buttons (ink text on it), the + button, switches on, progress fill, splash and welcome |
| `brand-text` | `#A85D00` | Orange used as text or a link on white |
| `late` | `#C4321C` | Overdue text, badge fill, destructive buttons and text. Tint fill `#FCEDEA`, tint text `#7A1F10`. |

Category colours (`#EFEAAB`, `#ABD8EF`, `#EEBEC0`, `#C0EEBE`) are no longer shown as chips. Category is plain text plus an icon.

Type: **Figtree** 400, 500, 600, 700 (`@expo-google-fonts/figtree`). Amounts use tabular figures.

| Style | Size / line | Weight | Use |
| --- | --- | --- | --- |
| Large title | 32 / 38, -0.02em | 700 | Tab titles |
| Amount | 44 / 50, -0.025em | 700 | Received this month, sheet amounts |
| Piano title | 28 / 34, -0.02em | 700 | Detail page |
| Section | 20 / 26, -0.01em | 700 | Section titles |
| Row title | 16 / 22 | 600 | Card and row titles |
| Body | 16 / 22 | 400 or 500 | Form values, descriptions |
| Secondary | 14 / 20 | 400 | Meta lines |
| Status | 14 / 20 | 600 | Coloured status |
| Caption | 12 to 13 / 16 to 18 | 500 | Hints, badge text (12 / 18, 700) |
| Tab label | 11 / 14 | 600, active 700 | Tab bar |

Shape and space:

- Radii: input 12, control and button 14, card and photo 16, panel 20, sheet 24 (top corners only), avatar and + button full circle, badges and pills 999.
- 20 px screen margin, 8 pt rhythm. Minimum tap target 44 x 44.
- No shadows except the search pill (`0 1px 6px rgba(26,24,20,0.08)`) and the sticky bar hairline.
- Icons: 24 x 24 stroke icons, stroke 1.75 (2 when active), round caps and joins, drawn with `react-native-svg`. Path data is in section 5.

## 4. Components

Read the named board for exact values.

- **Button** (`Feedback`): height 52 (48 in compact spots), radius 14, 16 / 700 label. Primary = brand fill with ink text. Secondary = `fill`. Outline = 1 px ink border, radius 12. Destructive = `late` fill with white text. Text button = ink or brand-text, no fill. Pressed = darker fill (`#E88A00` for primary) and scale 0.98. Loading = 18 px spinner plus the label ("Saving"), width unchanged, not pressable. Disabled = `#EFEDE8` fill, `#A39D92` text.
- **Field, outlined** (`SignIn`): height 60, radius 12, 1 px `#C9C4B9` border, 12 / 500 label inside at the top, 16 / 500 value below. Focus = 2 px ink ring. Error = 2 px `late` ring, red label, red message with an alert icon under the field. Disabled = `grouped` fill.
- **Form row** (`Add1Basics`, `RecordPayment`): 56 high (52 in sheets), label on the left in secondary grey (84 px wide), value after it, hairline between rows, chevron for pickers. Sits in a white panel of radius 16.
- **Group panel:** white, radius 16 (20 on Account and Detail cards), hairline dividers, on a `grouped` background.
- **Segmented control** (`Add2Details`): `#E7E4DD` track, 2 px padding, radius 10, 40 high options, selected = white with 700 label.
- **Switch:** 51 x 31, on = brand, off = `#D9D5CC`, white 27 px thumb.
- **Badge on photo:** red pill (white text) for overdue, white pill with a 7 px orange dot for ending soon, 12 / 700, at top-left 8 px in.
- **Category icon on photo:** 30 px white circle top-right, 16 px category icon in ink.
- **Tab bar:** 84 high with a hairline top border, 26 px icons, 11 px labels. Active is ink and bold, inactive `ink3`.
- **Search pill** (`Pianos`): 52 high, radius 26, white, 1 px hairline, the shadow above. Search icon, two lines ("Search pianos" 14 / 700 and "Title, make or customer" 12 grey), and a 40 px round filter button with a 1 px border on the right.
- **Category tabs** (`Pianos`): five equal tabs, 24 px icon over a 12 px label, active gets ink text and a 2 px ink underline.
- **Piano card, grid** (`Pianos`): 2 columns, 12 gap, photo 169 high with radius 16, title 15 / 600, company 14 grey, then price in 700 followed by status in grey.
- **Piano row, list** (`Pianos`): 64 px thumbnail radius 12, title, "Category · Company", coloured status, price on the right, hairline starts at the text.
- **Shelf card** (`Main`): 244 x 152 photo radius 16, a 5 px progress bar along the bottom of the photo (track `rgba(26,24,20,0.28)`, fill brand), title, customer, status.
- **Sticky action bar** (`Detail`): 84 high, hairline top, amount 18 / 700 plus a one-line status on the left, primary button on the right.
- **Sheet** (`Filters`, `RecordPayment`): radius 24 on the top corners, 36 x 5 grabber, dim `rgba(26,24,20,0.45)`, `grouped` background for form sheets and white for text sheets. Title row has Cancel on the left and a centred 17 / 700 title.
- **Toast** (`Feedback`): `ink` fill, radius 14, 52 high, 14 / 600 white text, brand check circle or a red alert icon, optional action in `#FFB84D`. Shows for 3 seconds at the bottom above the tab bar.
- **Dialog** (`Dialogs`): 284 wide, radius 20, centred title and body, stacked full-width buttons separated by hairlines. The destructive choice is red and on top, the safe choice is last.
- **Banner** (`Feedback`): 12 radius strips: offline (`grouped`), syncing with a spinner (`grouped`), error (`#FCEDEA`).
- **Skeleton** (`LoadingToday`): base `#EFEDE8`, highlight `#F8F7F4`, 1.5 s linear shimmer, shapes and radii match the real layout. Real chrome (tab bar, search pill, buttons) never becomes a skeleton. Show a skeleton only after 200 ms.
- **Keys loader** (`Publishing`, `Splash`): five vertical bars that scale between 0.4 and 1 in sequence (120 ms stagger, 1.1 s loop). The centre bar is brand in `Publishing`.

## 5. Icons and the no-photo illustration

All icons are 24 x 24 stroke icons. Every `d` below is a single path unless noted.

| Icon | Path |
| --- | --- |
| search | circle cx 11 cy 11 r 7, plus `m20 20-3.5-3.5` |
| sliders | `M4 7h10M18 7h2M4 17h2M10 17h10`, circles (16,7,r2) and (8,17,r2) |
| plus | `M12 5v14M5 12h14` |
| chevron right / left / down | `m9 6 6 6-6 6` / `m15 6-6 6 6 6` / `m6 9 6 6 6-6` |
| check | `m5 12.5 4.5 4.5L19 7.5` |
| close | `M6 6l12 12M18 6 6 18` |
| more (3 dots) | filled circles at x 5, 12, 19, y 12, r 1.8 |
| share | `M12 15V4M8 8l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6` |
| phone | `M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z` |
| message | `M4 20l1.3-4.2A8 8 0 1 1 8.3 18.8L4 20z` |
| tab: Today (calendar) | rect x 3.5 y 5 w 17 h 15.5 rx 3, plus `M3.5 10h17M8 3v4M16 3v4` |
| tab: Pianos | rect x 3 y 5 w 18 h 14 rx 2.5, plus `M9 19v-4M15 19v-4M7.5 5v6M12 5v6M16.5 5v6` |
| tab: Account | circle (12,8,r4), plus `M4.5 20.5a7.5 7.5 0 0 1 15 0` |
| category: all | `M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z` |
| category: rentable (key) | `M12 15a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM11 12l9-9M16 7l3 3` |
| category: events (note) | `M9 18V5l11-2v13M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM20 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z` |
| category: on sale (tag) | `M3.5 12.5V4.5h8l9 9-8 8-9-9zM8 8.5h.01` |
| category: warehouse (box) | `M3 8l9-5 9 5v8l-9 5-9-5V8zM3 8l9 5 9-5M12 13v8` |
| bell | `M6 9a6 6 0 0 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9zM10 20a2 2 0 0 0 4 0` |
| download | `M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14` |
| logout | `M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M15 8l4 4-4 4M19 12H9` |
| wifi off | `M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18` |
| camera | `M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z`, circle (12,13,r3.5). Camera off adds `M3 3l18 18` |
| refresh | `M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5` |
| alert | circle (12,12,r9), plus `M12 7.5v5.5M12 16.5v.01` |
| list | `M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01` |
| pencil | `M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z` |
| trash | `M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13` |

**No-photo illustration** (also used while a photo is missing or failed): an upright piano drawn in `react-native-svg`, viewBox `0 0 160 160`, `preserveAspectRatio="xMidYMid slice"` so it crops like a photo. Layers, back to front: wall rect (full), floor rect (`y=112`, height 48), soft shadow ellipse (`cx 80 cy 115 rx 52 ry 4.5`, ink at 14% opacity), then a group `translate(28 40) scale(1.3)` containing the piano on an 80 x 60 grid:

- lid `rect x8 y8 w64 h6 rx2` (dark), body `rect x11 y14 w58 h22 rx1.5` (body), panel `rect x17 y19 w46 h12 rx1` (panel), key slip `rect x8 y36 w64 h4 rx1.5` (dark),
- keys `rect x13 y40 w54 h7` in `#F7F3EA` with 9 hairline separators (`#D2CABB`, 0.6) at x 18.4, 23.8, 29.2, 34.6, 40, 45.4, 50.8, 56.2, 61.6,
- 7 black keys `w2.4 h4.5` in `#2B2320` at x 17.2, 22.6, 33.4, 38.8, 44.2, 55, 60.4 (y 40),
- lower rail `rect x11 y47 w58 h5` (body), legs `rect w5 h11 rx1` (dark) at x 11 and x 64 (y 47).

Five palettes (`wall`, `floor`, `body`, `dark`, `panel`), picked by hashing the piano id so a piano always gets the same one:

| Name | wall | floor | body | dark | panel |
| --- | --- | --- | --- | --- | --- |
| walnut | `#E9E1D3` | `#D8CDBB` | `#6A5545` | `#4A3B30` | `#57453A` |
| ebony | `#DDE3DC` | `#C9D1C7` | `#34302E` | `#24211F` | `#2B2826` |
| mahogany | `#E8DDD9` | `#D8CBC6` | `#7A3E2F` | `#5A2B20` | `#683528` |
| oak | `#E1E6EA` | `#CFD5DB` | `#B08A5E` | `#8C6A43` | `#9C7A50` |
| white | `#EFE9E0` | `#DDD5C8` | `#F4F1EA` | `#D9D3C6` | `#E6E0D3` |

Brand mark (splash, welcome, notification icon): a rounded tile with seven piano keys. Read the exact SVG in `boards/Welcome.dc.html` and `boards/Splash.dc.html`.

## 6. Screens

For each, read the board first. Keep existing data logic; change presentation and structure only where noted.

- **Splash** (`Splash`): brand orange full screen, logo tile and wordmark, keys loader. Configure the native splash colour to `#FF9C01` in `app.json`. Shows only while auth and fonts load.
- **Welcome** (`Welcome`, replaces the unauthenticated view of `app/index.tsx`): orange keyboard illustration, headline "Every piano, every rental, in one place.", Sign in and Create account buttons.
- **Sign in, Create account, Reset** (`SignIn`, `SigningIn`, `SignInError`, `SignUp`, `Forgot`): outlined fields, "Show" toggle on passwords, field errors on blur or submit, loading button while submitting. Files: `app/(auth)/*.tsx`. Keep all validation and Appwrite calls.
- **Today** (`Main`, `LoadingToday`; new `app/(tabs)/today.tsx`): header with date and +, received-this-month amount, In stock / On rent / Sold this month, Needs attention list, Rented out shelf with progress bars, Recent payments.
- **Pianos** (`Pianos`, `LoadingPianos`, `RefreshPianos`, `PianosOffline`, `EmptyPianos`, `LoadError`; `app/(tabs)/home.tsx`): search pill, category tabs, count with sort and layout toggle, 2-column photo grid or compact list, pull to refresh, offline strip, skeleton, empty and error states. Layout choice replaces the old card/list/grid setting. Keep the offline cache.
- **Filters** (`Filters`; `components/FilterButton.tsx`): sheet with Sort by (existing five options), Show switches (Active rentals, Overdue only, Sold pianos), Reset, and a "Show N pianos" button. Category moves out to the tabs. Layout moves out to the toggle. Keep the filter state shape in `redux/pianos` and `utils/filters.ts`.
- **Search** (`Search`, `NoResults`; `app/search/[query].tsx`): same cards as Pianos, matched text bold, "N results", Cancel.
- **Select mode** (`PianosSelect`; `components/BulkOperationsBar.tsx`): long-press starts it, ink ring and check on selected photos, "N selected", Select all, red Delete bar. Confirm with the dialog.
- **Account** (`Account`, `SignOutConfirm`; `app/(tabs)/profile.tsx`): profile card with three counts, Download piano list (existing CSV export), Last updated (from the offline cache time), reminders explanation with a sample notification, Sign out with the confirmation sheet. Sign out still clears local pianos and reminders.
- **Piano detail** (`Detail`, `DetailSale`, `DetailSold`, `LoadingDetail`, `PhotoViewer`; `app/detail/[id].tsx`, `components/PhotoGallery.tsx`, `components/PhotoViewer.tsx`, `components/RentPayments.tsx`): photo hero with pager count, rounded content sheet, sections separated by hairlines, sticky action bar by state. Events show purchase price, bought from, model number and B number in the Details section. Warehouse shows "Stored since". Sold shows the Sale section and Undo sale.
- **Sheets** (`RecordPayment`, `ExtendRental`, `MarkSold`; `components/RecordPaymentSheet.tsx`, `ExtendRentalSheet.tsx`, `MarkAsSoldSheet.tsx`): big centred amount for payment and sale price, grouped rows below, one orange button.
- **Dialogs** (`Dialogs`; `components/CustomAlertModal.tsx` and the existing `Alert.alert` calls): delete piano, delete payment, undo sale, discard changes, delete selected, stop adding.
- **Add and edit** (`Add1Basics`, `Add2Details`, `Add3Review`, `Publishing`, `Published`, `MakePicker`, `DatePicker`, `CameraDenied`; `app/(tabs)/create.tsx`, `app/review.tsx`, `app/edit/[id].tsx`, `components/PianoFormFields.tsx`, `PianoPhotoField.tsx`, `DateField.tsx`, `CompanyAssociatedPicker.tsx`): three one-screen steps. Step 1 photos and basics, step 2 category with its fields, step 3 review. Make and dates open picker sheets. Publishing shows the keys loader and photo progress, then a success screen. Edit reuses the same fields and keeps the discard-changes confirmation.
- **NotifyPrimer** (`NotifyPrimer`): shown once after first sign-in, before the system notification prompt. "Turn on reminders" requests permission. "Not now" skips.

## 7. Motion

Durations in ms: press 100, switch 200, push and back 300, sheet in 320, sheet out 240, photo card to hero 380, tab switch 120 (cross-fade, no slide), add step 240 (24 px slide plus fade), toast in 220 and out 180 (stays 3 s), check pop 280 and draw 260, shimmer 1500 loop.
Easing: standard `bezier(0.2, 0, 0, 1)`, accelerate `bezier(0.3, 0, 1, 1)`, decelerate `bezier(0, 0, 0, 1)`.
Reduced motion: no slides, fades of 120 ms only, and shimmer, keys and spinners stop (static shapes stay).
The photo card to hero shared-element transition may not be practical on expo-router 3.5. If so, use a 240 ms fade and slight scale and note it in the session log.

## 8. Where the design differs from the current code (decide, then record in PLAN.md)

1. **Photo limit:** the design copy says "up to 6 photos". The app allows `MAX_PHOTOS` (10, in `utils/photos.ts`). **Use `MAX_PHOTOS`.**
2. **Extend rental:** the current sheet offers +1, +3 and +6 months counted from the current end date. The design shows 1, 3, 6 and 12 months plus "Choose a date", counted from today for ended rentals. **Keep the current behaviour first.** Ask the owner before changing the rule or adding options.
3. **Layouts:** the design offers grid and list only. The old "card" layout goes away. Map any saved layout value of `card` to `grid`.
4. **Tabs:** `TabKey` in `redux/navigation/actions.ts` is `home | create | profile`. It becomes `today | pianos | account`. Every `setActiveTab("create")` call becomes navigation to the Add flow, and `setActiveTab("home")` becomes `"pianos"` or `"today"` as fits.
5. **New screens with no current equivalent:** Today, Welcome (redesign), NotifyPrimer, the Publishing progress and Published screens, the select-mode top bar. Build them from existing data.
6. **Sample content:** anything on a board that looks like a real name, amount or date is placeholder.
7. **Haptics:** `expo-haptics` is not installed. Optional in the polish batch.
