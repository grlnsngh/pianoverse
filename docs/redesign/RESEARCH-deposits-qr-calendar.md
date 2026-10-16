# Research: security deposits (M4), QR labels (P4) and the availability calendar (P3)

Written 2026-10-16, after Batch 40. **Nothing here is built.** The owner asked for the research first and will say when to implement, in batches. Everything about the app comes from reading the code on `main` (Batch 38 and later); everything about the world comes from the sources linked below, and where a source is a vendor blog or a forum I say so. Each feature ends with the questions only the owner can answer, with the default I would use.

---

## 1. Security deposits (M4)

### What the app has today

- **No deposit tracking at all.** A deposit exists only on paper: the Rent card has a "Deposit, ₹" box, the Rental register a "Deposit" column, and the private-person agreement a row "Security deposit, refundable on return" with the clause: *refunded within 15 days of the piano's return, after deducting any unpaid rent and any charges for damage* (`utils/paperForms/agreementTerms.ts`). That clause is the owner's own rule, so it is the model for the refund.
- **A rental is not a record.** It is a handful of fields on the piano (`rental_customer_name`, `_mobile`, `_address`, `rental_period_start`, `_end`, `rental_price`). When it ends, is replaced or the piano is returned, a copy goes to `rental_history` (`utils/rentalHistory.ts`, `lib/useReturnPiano.ts`). History rows have no link to payments: payments are matched to a rental by the renter's name and dates (`utils/customers.ts`, `pastRentals`).
- **About a dozen places add up `rent_payments.amount`:** `utils/customers.ts` (three), `income.ts`, `pianoDetail.ts`, `pianoMoney.ts`, `rentDue.ts`, `stats.ts`, `today.ts`, `ledgerCsv.ts` (the payments file), the customer page, the Payments section, and (through `rentDue`) Rent due, the Morning summary and every reminder. This is the risk the ideas file already flagged for putting deposits in the payments table with a `kind` column: **every one of those has to learn to skip them, and a miss gives wrong income numbers without any error.**
- **The flows a deposit has to follow** (each one already exists and has Undo or a history entry): Add and Edit piano (rental fields), Extend rental, Mark as returned (with Undo that puts the rental back), the Edit screen replacing or ending a rental, Mark as sold, deleting a piano (its payments and history are deleted with it), deleting the account.

### What the world says

- **A refundable deposit is not income.** Indian advance rulings (Maharashtra and Karnataka AAR) say an interest-free deposit that is returned is not consideration for a supply, so no GST on it, **but the part the lessor keeps or adjusts (for damage, or against dues) is taxable** ([ClearTax](https://cleartax.in/s/gst-on-security-deposit), [Avalara on the Karnataka ruling](https://www.avalara.com/blog/en/apac/2021/03/karnataka-aar-allows-applicability-of-gst-on-notional-interest-on-security-deposit.html), [Taxscan](https://www.taxscan.in/?p=99602)). These are advance rulings binding only on the applicants and secondary commentary, and I found no CBIC circular. **Treat it as a question for the accountant:** what the app must do is show deposits **held** separately from income, and separate **refunded** from **kept**.
- **Practice:** refund in full if the instrument comes back undamaged, otherwise less the repair cost, with damage beyond the deposit billed to the customer ([Vancouver Music Gallery](https://www.vancouvermusicgallery.com/?p=4732), a Belgian piano renter asks for two months' rent as the guarantee: [Maene](https://www.maene.be/en_BE/algemene-huurvoorwaarden)). I found **no Indian source** with piano deposit amounts, so there is nothing to suggest a default amount from; it has to come from the owner.

### Options for where a deposit lives

| | A. A `deposits` table | **B. Fields on the piano, copied to the history (recommended)** | C. `kind` column on `rent_payments` (the ideas file's default) |
|---|---|---|---|
| Fits how the app thinks | A new thing to join by piano, name and dates | **Same as the rent: part of the rental, so it follows it** | Looks natural in the payments list |
| Risk to income numbers | None | **None** (it never touches a payment) | **High**: about a dozen sums must skip it |
| Return, Undo, Edit-replace, delete piano | Each needs new code to find and settle the row | **Follow the rental automatically** (cleared on return, put back by Undo, copied to history) | Refund would be a negative payment, which breaks `amount > 0` checks |
| "Deposits held ₹X" | A new load | **Instant** (pianos are already in memory) | A load, and filter every time |
| Several deposit payments or a top-up | Yes | No (one deposit per rental) | Yes |
| Appwrite change | A new table | **4 columns, no table** | 1 column |

**Recommendation: B.** It keeps deposits out of every income sum by construction, makes Return/Undo/replace consistent for free, and needs no table. Its limit (one deposit per rental, no separate transaction log) matches how the owner describes it ("a deposit when a rental starts, refunded when it comes back"). If the owner wants part-payments or top-ups, choose A instead.

### What B would look like (to be drawn on the canvas first, as before)

- **Add and Edit piano, rental panel:** an optional **Deposit** row under Rent, and optionally **Received on**. Saved on the piano (`rental_deposit`, `deposit_received_on`).
- **The piano's page:** under Rental, "Deposit ₹10,000 held" (or "Deposit not yet received"). **Not** in Payments, not in income.
- **Mark as returned:** if a deposit is held, the sheet shows it and **suggests the refund by the owner's own clause**: deposit − unpaid rent (the sheet already knows what is owing) − damage charges (typed in). Fields: *Refund ₹* (editable) and *Kept ₹* with a reason (unpaid rent, damage, other). Undo puts everything back.
- **If kept for unpaid rent:** the kept amount should also be recorded as a rent payment ("From deposit"), so the customer's balance and income come out right. That is the **one** place a deposit touches a payment, and it is a real rent payment. **If kept for damage:** it is stored on the history row as a damage charge; whether it counts as income is the owner's and accountant's call.
- **History** (piano's Previous renters and the customer's Rental history): "Deposit ₹10,000 · refunded ₹5,500 · kept ₹4,500 (unpaid rent)". A rental that ended through the **Edit screen** without a return carries "Deposit not settled", fixable with the Batch 38 **Edit rental** sheet.
- **Totals:** "Deposits held ₹X" as one row on the Income screen (a liability, never added to income), per customer on their page, and a column in the piano list download and the rental history. The Morning summary, reminders and Rent due are untouched.
- **Appwrite:** `pianos.rental_deposit` (float, optional), `pianos.deposit_received_on` (datetime, optional), `rental_history.deposit` (float), `rental_history.deposit_refunded` (float), `rental_history.deposit_note` (varchar 255). No new table; the delete-account function needs no change. **JavaScript only; no build.**
- **Batches (three):** (1) the fields in Add/Edit, the piano's page and the held total; (2) the return and refund flow with Undo, history, the "kept for unpaid rent" payment; (3) the customer page, downloads, the "not settled" cases (replace, sell, delete), tests and docs.
- **Things that need care:** Mark as sold with a deposit still held (warn); a rental extended (deposit stays); a rental whose customer is swapped on the Edit screen (ask what happened to the deposit); the offline case (the return flow already tolerates failures with Retry/Undo).

### Questions for the owner (with my default)

1. Does your dad take a deposit on **every** rental, or only some? *Default: optional on each rental, empty means none.*
2. Is it a **fixed amount** per piano, or a number of months' rent? *Default: a typed amount; I can add "2 months' rent" as a quick fill.*
3. Is a deposit ever paid **in parts or topped up**? *Default: no; one amount (else option A).*
4. When part is kept **for damage**, is that income for the business, and does it carry GST? *Default: stored, shown as "kept", and not added to income until the accountant says; ask the accountant.*
5. Do **hotel/company** rentals take deposits, or only private people (the hotel agreement has none)? *Default: the same optional row for both.*
6. Do **event hires** (the Events category has no customer or dates in the app) take deposits? *Default: no, only rentals.*

---

## 2. QR labels (P4)

### What the app has today

- **The deep link already exists.** `app.json` registers the scheme `pianoverse`, and expo-router opens `pianoverse://detail/<piano id>` on the piano's page with no new code.
- **There is no way to read a QR code in the app.** `expo-camera` is not installed; the camera in `expo-image-picker` only takes photos. `react-native-svg`, `expo-print` and the WebView preview are installed, and the PDF pipeline (`lib/paperPdf.ts`) makes, keeps, opens, prints and shares A4 PDFs, on the letterhead.
- **The paper forms are all blank forms** ("nothing filled from records"). Labels would be the first PDF filled from the pianos, so the screen is new, but the PDF, preview and sharing parts are reusable.
- The Pianos tab already has **select several** (the bulk selection used for deleting), which fits "print labels for these pianos".
- A piano's ID is Appwrite's 20-character document ID. A deleted and re-added piano gets a new ID, so its old label stops working ("Piano not found" screen already exists).
- **No sign-in guard on deep links yet.** A notification tap waits until someone is signed in (`context/GlobalProvider.js`), but an address opened from outside goes through `app/+native-intent.tsx` (today it only handles Google's sign-in return and passes everything else straight on), so a label scanned while signed out would land on the piano's page with no pianos. That file is where the guard goes.

### What the world says

- **The phone's own camera often will not open a custom scheme.** Scanners decide what is clickable: they handle http(s), mailto, geo, sms; a custom-scheme code usually shows as plain text and needs a scanner that fires the intent ([forum thread](https://www.b4x.com/android/forum/threads/solved-run-the-app-from-a-custom-url-android-scheme-android-host.161506/post-990835), [a QR-to-app guide](https://u2l.ai/blog/qr-code-to-open-app.md); I found nothing specific about Google Lens, so that part is unverified). **So printing a code is not enough: the app needs its own scanner.** A fix through a web link would need Android App Links on a domain we control; the site is a GitHub Pages *project* page, so we cannot host the verification file at the domain root. Not worth it.
- **Scanner:** `expo-camera`'s `CameraView` with `barcodeScannerSettings={{ barcodeTypes: ["qr"] }}` and `onBarcodeScanned`, permission through `useCameraPermissions`; its config plugin needs a **new native build** to apply, and barcode scanning is included by default (it can be turned off to save size) ([Expo docs](https://docs.expo.dev/versions/latest/sdk/camera/)). Only one camera preview can be active at a time.
- **Size on paper:** about 2 cm square is the practical floor for a handheld scan, 2.5 cm is safer, with a white border of at least 4 modules, printed at 300 dpi; test a printed label with real phones and lighting before printing a sheet ([QR-Code-Generator](https://www.qr-code-generator.com/blog/qr-code-distance/), [Scanova](https://scanova.io/blog/minimum-qr-code-size/); vendor blogs).
- **Drawing a code needs no native package.** A small zero-dependency JavaScript encoder is enough: [`uqr`](https://github.com/unjs/uqr) (MIT, TypeScript, SVG output) or [`qrcode-generator`](https://github.com/kazuhikoarase/qrcode-generator) (MIT, TypeScript). The code becomes an inline SVG in the label's HTML, so labels print through the existing PDF pipeline and can ship **over the air**.

### Recommended design

- **What the code holds:** `pianoverse://detail/<id>` (about 40 characters, a 29 × 29 code, which fits a 2.5 cm square comfortably). Only the person's own signed-in app can open it, and the ID alone gives a stranger nothing.
- **A label:** the code, the piano's title and make, and the business name and phone from the Letterhead details ("If found, call…"), so the sticker also says whose piano it is. One piano per label.
- **Printing:** Pianos tab → select pianos → **Print labels**; or Account → Paper → Labels. The owner chooses a sticker-sheet size, and gets a PDF to print on A4 sticker paper (the standard A4 sheet formats are 21, 24, 40 or 65 labels; he should say which he buys). A **test page** helps line up the sheet, as the Letterhead already does.
- **Scanning:** a **Scan** button on the Pianos tab opens the camera; a code made by the app opens that piano; anything else says "That isn't a Pianoverse label". Camera permission uses the existing **camera denied** sheet.
- **Batches (two):** (1) labels: the encoder, the label PDF, the selection and size choice, tests (**JS only, no build**); (2) the scanner: `expo-camera`, the plugin, the permission flow, parsing, the guard for links from outside in `+native-intent.tsx` (**native: it rides in the 1.1.20 build, runtime 5 has never been built, so no runtime bump**).
- **Not decided by research, so it needs a real phone:** how well the printed code reads on the owner's printer and sticker paper, on his phones, indoors. I will ask him to print a test sheet after batch 1.

### Questions for the owner

1. Which **sticker sheet** and printer? (A4 sheet with 21, 24, 40 or 65 labels, or a label printer?) *Default: 24 per sheet (63.5 × 33.9 mm) and a "small" 65 per sheet, plus a test page.*
2. **Where does the label go** (inside the lid, the back, under the keyboard)? It sets how big and how durable. *Default: inside the lid.*
3. Should the label carry the **business name and phone** ("if found")? *Default: yes, from the Letterhead details; left out when none are set.*
4. Will the pianos be scanned mainly **at a customer's house** (tuner, return) or in the **warehouse**? *Default: both; it opens the piano's page, where Log service and Mark as returned are one tap away.*
5. Is the extra size and one more permission for a scanner acceptable? *Default: yes.*

---

## 3. The availability calendar (P3)

### What the app has today (this decides the whole feature)

- **Dates that exist:** the current rental's start and end on each piano; every ended rental in `rental_history` (`period_start`, `period_end`, `closed_on`; a piano marked as returned early ends on the day it came back); `warehouse_since_date`, `on_sale_import_date`, `sold_date`; services (tuning due dates).
- **What does not exist: future bookings.** A piano holds **one** rental. There is no "reserved from 1 Nov". So the app can say who has which piano **until when**, which are free **now**, and which were out in the past. It cannot know that a piano is promised for next month.
- **The Events category has no dates at all** (only purchase details), so event hires are not in the data. The ideas file said the calendar is "useful if you take event bookings"; the app cannot show them today.
- **A quirk:** `getRentalState` looks only at the **end** date, so a rental whose start is **in the future** already counts as rented out (Today, stock counts, the Pianos filters). The end date is inclusive: a piano ending today is still out and is free from tomorrow.

### What the world says

- The common pattern in rental software is a **month grid to scan across dates, plus a day (or timeline) view to see which specific units are free**, with filtering by item or group ([EZRentOut](https://blog.ezrentout.com/using-the-availability-calendar-with-equipment-rental-software/), [VEVS](https://vevs.com/equipment-rental-software/management-software.php), [Rentman's timeline view](https://www.softwareadvice.com/retail/rentman-profile/)). The sources do not say how to lay it out on a phone; that part is my judgement: **a dense timeline of every piano against every day does not fit a phone, and a list of what is free on the chosen day does.**
- The owner's real question is probably the one a customer asks on the phone: **"Do you have a grand available on 15 November?"**

### Options

| | **1. Availability from the dates we have (recommended first)** | 2. Add bookings (future rentals) | 3. A plain month grid with dots |
|---|---|---|---|
| Answers "free on 15 Nov?" | For today and anything not promised yet; knows nothing about promises | Yes, fully | Poorly: dots do not say which piano |
| New data | None | A `bookings` table, and a way to turn a booking into the current rental when it starts | None |
| Build | **One batch, JavaScript only** | Two or three batches, touches Return/Replace/reminders | One small batch |
| Risk | Shows "free" for a piano that is promised but not recorded | The booking-to-rental hand-over has to be right | Low value |

**Recommendation:** build option 1 first, then decide on option 2 after the owner has used it. A future-dated rental can already be entered as a piano's current rental, which is a workable stand-in for one booking per piano.

### What option 1 would look like (to be drawn on the canvas first)

- **Availability screen** (entry: Pianos tab or Account → Reports; to be chosen): a **month calendar** (the existing date-picker's month grid, which already copes with large text) with a marker on days a rental starts or ends; tap a day (or pick one) and see **Free that day (7)** and **Out (5), back on …**, grouped by category, filtered by make or category.
- **Free from:** for a piano out now, "Free from 12 Dec" (the day after its end). Also a **Coming back soon** list for the next 30 days.
- **On a piano's page:** "Booked periods": the current rental and the past ones from its history, with the days they were out.
- **Data:** the pianos (already in memory) and the kept rentals (one load, the same as the customer pages). Nothing new in Appwrite, **no build**. A rental with no end date is "out, no end date"; a kept rental with no dates is left out.
- **Large text:** the grid is 7 columns of numbers (like the date picker), the lists reflow and rows grow.
- **Tests:** the free/out rules (inclusive end day, future start, sold, warehouse, rentals with no dates), the lists, the filters, large text.

### Questions for the owner

1. Is the real question **"what is free on date X"**, or **"when is this piano back"**? *Default: both, from the same screen.*
2. Do customers **book ahead** (promise a piano for later while it is still out)? How far ahead? *Default: sometimes; if often, plan option 2 after a month of use.*
3. Do you take **event hires** that need dates (a piano out for a day or a weekend)? *Default: not yet; they would need bookings (option 2) or a new "event hire" record.*
4. Should a piano **in service** (repair, moving) show as unavailable? *Default: no.*
5. Where should it open from? *Default: a calendar icon on the Pianos tab header.*

---

## Decisions so far (2026-10-16): the defaults, until the owner confirms with his father

The owner said to go with the recommended answers for now and to update them after he asks his father. Everything below is built to these, and each is a small change if the answer turns out different.

**Deposits** (option B, fields on the piano and the history)
1. Optional on each rental: empty means no deposit.
2. A typed amount, with a quick fill of "2 months' rent".
3. One deposit per rental; no part-payments or top-ups.
4. Kept **for unpaid rent**: the kept amount is also recorded as a rent payment ("From deposit"). Kept **for damage**: stored as "kept" on the history row and **not** added to income until the accountant says.
5. The same optional row for hotel and private rentals.
6. Rentals only: not event hires.

**QR labels**
1. Sheets of **24** (63.5 × 33.9 mm, the default) and **65** (38.1 × 21.2 mm, small), plus a test page; each label is the code, the piano's title and make and, when the Letterhead has them, the business name and phone ("If found, call…").
2. The label goes inside the lid.
3. Scanning is from the **Pianos tab** (a Scan button) and opens the piano's page.

**Availability calendar**
1. One screen answers both: **On a day** (what is free and what is out, with when it is back) and **Back soon** (rentals ended but not returned, and rentals ending in the next 30 days).
2. Version 1 uses only the dates the app already has; bookings (promising a piano for later) wait until the owner has used it. A future-dated rental can stand in for one booking per piano.
3. No event hires, and a piano in service still counts as available.
4. It opens from a **calendar icon in the Pianos tab header**.
5. **Changed from the section above:** no "Booked periods" section on the piano's page, because Previous renters already lists the past rentals with their dates. The Rental section gets one line instead: **"Free from 13 Dec 2026"**.

---

## Suggested order and builds

| # | Batch | Needs |
|---|---|---|
| 41 | Availability calendar (option 1) | JS only, over the air |
| 42 | QR labels: print | JS only (one small JS package), over the air |
| 43 | Deposits 1: the fields, the piano's page, the held total | JS + 2 Appwrite columns |
| 44 | Deposits 2: return and refund, with Undo and history | JS + 3 Appwrite columns |
| 45 | Deposits 3: the customer page, downloads, unsettled cases | JS only |
| 46 | QR labels: the scanner | **Native: `expo-camera`, one build** |

The scanner is the only piece that needs a new phone build, and since runtime 5 has never been built it can go into the 1.1.20 build with everything else. Each batch gets its own canvas page for the owner to approve first, like the service log and the expenses did.

**Gaps in this research:** no Indian data on piano deposit sizes (the owner must say); the tax treatment of a kept deposit is from advance rulings and commentary and needs the accountant; the QR print size and sticker sheets must be tried on the owner's printer and phones; Google Lens and Samsung's camera behaviour with custom schemes is unverified (which is why the app gets its own scanner).
