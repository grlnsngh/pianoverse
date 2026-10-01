# Pianoverse: ideas and upcoming features

Written 2026-10-01, after Batch 28. This is the owner's backlog: what could be built next, roughly how big each piece is, what it needs, and the questions that have to be answered first. It is here so nobody has to research it again. **Nothing in this file is built unless it says so.**

**To start one**, tell Claude the ID and any answers, for example "Build M2, categories as in the file." Each batch then follows the usual process in `PLAN.md`: a new branch from an up-to-date `main`, tests, a pull request that you merge, and a "How to check" list.

How to read the tags:

- **Size:** S is under a day of work, M a few batches' worth of one screen plus its data, L needs a design discussion first.
- **JS only:** goes to the phone with `npm run update` (over the air), no new build.
- **Appwrite:** you create a table or column in the Appwrite console first (the exact columns are listed). The app is written to keep working until you do, the way the earlier tables were.
- **New build:** adds or changes a native package or a native setting, so `runtimeVersion` goes up and you build a new APK with `npm run build:android`.

The sizes are estimates, not promises. Prices and store rules below come from general knowledge, not from checking in 2026: **look them up before you decide.**

## At a glance

| ID | Idea | Size | Needs |
| --- | --- | --- | --- |
| M1 | UPI details in reminders | S | JS only (and one column, if saved in Appwrite) |
| M2 | Expenses and profit | M | Appwrite table |
| M3 | Purchase price and profit per piano | S | Appwrite column |
| M4 | Security deposits | M | Appwrite column |
| M5 | Rent exceptions | M | Your terms first; maybe a column |
| M6 | Keep what was owed on a return | S | Appwrite column |
| M7 | Income per piano | S | JS only |
| M8 | Online payments (a payment gateway) | L | Gateway account, server code, Appwrite |
| P1 | Tuning and service log | M | Appwrite table |
| P2 | Condition photos at handover and return | M | Appwrite table |
| P3 | Availability calendar | M | JS only |
| P4 | QR labels, scan to open a piano | M | New build |
| C1 | Enquiries and follow-ups | M | Appwrite table |
| C2 | Rental agreement | M | JS only (message), new build (PDF) |
| C3 | Customer documents (ID, signed agreement) | M | Appwrite, a private bucket |
| C4 | Fix a wrong history entry | S | JS only |
| D1 | Morning summary notification | S | JS only |
| D2 | Import pianos from a spreadsheet | M | New build |
| D3 | Dark mode | M | **Being built as Batch 29** |
| D4 | Another language | L | JS only |
| R1 | A real-data test pass | S | A test Appwrite project |
| R2 | Crash reporting | S | New build, an account |
| R3 | Play Store release | M | $25 developer account, a production build |
| R4 | Staff accounts | L | Design first |
| R5 | iPhone build | M | Apple developer account |

**Suggested order:** M1, then P1, then M2 with M3, then R1, which protects everything above. D3 is first because you asked for it.

---

## Money

### M1. UPI details in reminders (S)

The WhatsApp reminders (`utils/reminders.ts`) already say how much is due. Add "Pay ₹X to UPI ID yourname@bank" to the rent-due, ending and ended messages. The renter pays from any UPI app; you press Record payment, and Extend rental if it is an extension. No gateway, no fee, no keys, no server.

- A tappable `upi://pay?pa=…&pn=…&am=…&cu=INR&tn=…` link is a maybe: WhatsApp often doesn't make `upi://` links clickable. The UPI ID and the amount in plain text always work. Try the link on your phone before relying on it.
- **Where the UPI ID lives.** On the phone (AsyncStorage is already installed) needs nothing in Appwrite, but it is lost on a reinstall and a second phone doesn't have it. In the `users` table it needs one optional column, `upi_id` (varchar 255), and follows you everywhere. **Default: the `users` column**, since a reminder that silently lacks the line on another phone is the worse failure.
- Needs: JS only, plus the column. Account, Edit profile (or a new Payments row on Account) gets the field.

### M2. Expenses and profit (M)

Record what you spend (moving a piano, a repair, tuning) so Income shows profit, not only income. Today the app has no costs.

- New table `expenses` (ID `expenses`): `piano_id` varchar 255 optional, `creator` varchar 255 required, `amount` float required, `spent_on` datetime required, `category` varchar 50 optional, `note` varchar 1000 optional. Permissions like `rent_payments`: Create for All users, Row level security on.
- Screens: a Record expense button on a piano's page and on Account; the Income screen gets an Expenses row and a Profit row per month; the CSV export gets an expenses file.
- **Questions and defaults:** the categories (default: Moving, Repair, Tuning, Other); whether an expense may belong to no piano, like rent or a salary (default: yes); whether profit means income minus expenses in the same month (default: yes).

### M3. Purchase price and profit per piano (S)

A `purchase_price` column (float, optional) on `pianos`, a field in Add and Edit piano, and the Mark as sold sheet shows profit: sale price minus purchase price (and minus that piano's expenses once M2 exists). Default: an optional field for every category.

### M4. Security deposits (M)

Record a deposit when a rental starts and refund it when the piano comes back.

- Cleanest design: a `kind` column on `rent_payments` (varchar 20, optional; empty means rent; `deposit` and `refund` are the others), so a deposit is never counted as rent received or as rent paid towards what is due. **Every place that adds up payments has to learn to skip them** (Rent due, Income, Today, the CSV, Customers): that is where the risk is, so it needs thorough tests.
- Mark as returned (Batch 28) would ask "Refund the deposit of ₹X?".
- **Questions:** do you take deposits at all (if not, skip this); is it refunded in full; does it count as income if kept? Default: one deposit per rental, refunded in full on return.

### M5. Rent exceptions (M)

Rent due assumes monthly, in advance, on the start date's day (`utils/rentDue.ts`, Q31 in `QUESTIONS.md`). Exceptions are not built because the rules aren't known. Examples to choose from: rent due at the end of the month, quarterly, a custom day, a free period, a discount.

- **Needs your terms first.** Write down two or three real cases and what you want Rent due to say for each.
- Probably a per-rental setting on the piano (a `rent_terms` column or a few). Size depends on how many cases.

### M6. Keep what was owed on a return (S)

Batch 28 doesn't save what the renter still owed when a piano is returned. Add `owed_at_return` (float, optional) to `rental_history`, save it in `lib/useReturnPiano.ts`, and show "left ₹X unpaid" in the piano's and the customer's history. Undo already deletes the row.

### M7. Income per piano (S)

A piano's page shows what it has earned: rent received over its life (and its sale, if sold). It can all be worked out from the payments already saved. JS only. Batch 18 listed per-piano and per-customer income as "not built".

### M8. Online payments, a payment gateway (L)

**The question that started this:** "Should people pay online to extend their rental?" The answer so far: not yet. Do M1 first.

Why it is large:

- **Renters don't use the app.** It is your tool. "Pay to extend" would mean a payment link they open outside the app.
- **Real accounts and keys.** You open an account with a gateway (Razorpay, Cashfree and PhonePe are the usual ones in India) and complete its business checks. The secret keys stay with you: Claude never types them into anything. Check each provider's current fees, settlement time and rules before choosing; fees are a percentage of every payment.
- **A server piece.** A small Appwrite Function (server code) holds the secret key, creates a payment link for an amount and a rental, and receives the gateway's "paid" call (a webhook). The app can't do this safely on its own.
- **Money bugs are costly.** The same webhook can arrive twice, an amount can differ from what was asked, a link can expire, or a payment can match no rental.

How it would be built, in phases (stop after any phase):

1. **M1** (UPI details in the message). Works today, free.
2. **Payment link.** A "Send payment link" button on a rent-due row: the Function creates a link for the amount due and the app puts it in the WhatsApp message. Recording stays manual.
3. **Automatic recording.** The webhook handler checks the gateway's signature, checks the amount, and writes the `rent_payments` row (creator = the owner's user ID, with a `gateway_ref` column, varchar 100, unique, so a repeated webhook can't record twice, and a `method` column). Optionally extends the rental.

Needs: the gateway account and a test mode (build and try everything with test keys first), a deployed Appwrite Function with the keys in its environment settings, the extra columns, and a decision on GST, refunds and disputes with your accountant. Questions: which gateway, who pays the fee (you or the renter), and whether a payment extends the rental by itself or only records.

---

## Looking after pianos

### P1. Tuning and service log (M)

Pianos need regular tuning and repairs. Record each one and get a reminder when the next is due.

- New table `service_log` (ID `service_log`): `piano_id` varchar 255 required, `creator` varchar 255 required, `serviced_on` datetime required, `kind` varchar 50 (Tuning, Repair, Cleaning, Other), `cost` float optional, `note` varchar 1000 optional, `next_due` datetime optional. Permissions like `rent_payments`.
- A Service section on the piano's page; Today gets a "Service due" list; a local notification at 9:00 on the due day (reuses `services/` reminders, JS only).
- If M2 exists, a cost also becomes an expense (one entry the owner sees once, not twice).
- **Question and default:** the next-due date is picked when logging, and the sheet suggests six months after.

### P2. Condition photos at handover and return (M)

Photos of the piano when it goes out and when it comes back: proof in a damage dispute. It fits Mark as returned.

- New table `rental_photos`: `piano_id`, `creator` (varchar 255, required), `taken_on` datetime required, `stage` varchar 20 (`handover` or `return`), `image_urls` varchar 1000 array, `note` varchar 1000 optional.
- Reuses the photo picker, resize and upload helpers in `lib/appwrite.ts`. Storage use grows: check your Appwrite plan's storage limit.

### P3. Availability calendar (M)

One month calendar of event dates and rental starts and ends, to see what is booked when. Built from dates already saved, so JS only. Useful if you take event bookings.

### P4. QR labels, scan to open a piano (M)

Print a QR label for each piano (from the piano's ID or B-number); scanning it with the app opens that piano. The QR drawing can use `react-native-svg` (installed). **Scanning needs a camera-scanning native package** (`expo-camera`), so this is a new build (`runtimeVersion` 4).

---

## Customers

### C1. Enquiries and follow-ups (M)

People who asked about a piano but haven't rented or bought yet.

- New table `enquiries`: `creator` varchar 255 required, `name` varchar 255, `mobile` varchar 50, `interest` varchar 1000, `piano_id` varchar 255 optional, `follow_up_on` datetime optional, `status` varchar 20 (open, won, lost), `note` varchar 1000 optional.
- A list under Account (or Today "Follow up" for the day's calls), a one-tap WhatsApp and call, and a "turned into a rental" step.

### C2. Rental agreement (M)

Fill in a piano's rental terms (names, address, rent, dates, deposit, your terms) as a message to send, or a PDF.

- **You write the terms** (and in which language); Claude doesn't draft legal terms, and you may want them checked.
- The WhatsApp-message version is JS only. **A PDF needs a native package** (`expo-print`), so a new build. Default: the message version first.

### C3. Customer documents (M)

A photo of the renter's ID or the signed agreement attached to a rental.

- **Sensitive.** If the piano photo bucket can be read by anyone with the link (check its permissions in the Appwrite console), ID photos must NOT go there. They need their own private bucket and per-file permissions so only the creator reads them, deleted with the rental.
- Ask yourself whether you need to keep ID photos at all; the safest data is data you don't hold.

### C4. Fix a wrong history entry (S)

Edit or delete a kept rental from the piano's page or the customer's page. `deleteRentalHistoryEntry` already exists in `lib/appwrite.ts`; the edit and the screens are new. JS only.

---

## Daily use

### D1. Morning summary notification (S)

At 9:00: "2 rentals due, ₹18,000 to collect." JS only (`expo-notifications` is installed). **Limit:** a scheduled phone notification has its text fixed when it is scheduled, so the numbers are only as fresh as the last time the app was opened (the app would reschedule on every start and after every change). A summary that is always right would need a server schedule (an Appwrite Function), which is much bigger.

### D2. Import pianos from a spreadsheet (M)

Add a whole stock list at once from a CSV. The app can export CSV (Batch 27) but not import. **Needs a file picker native package** (`expo-document-picker`, not installed), so a new build. Needs a column layout you agree to, and a preview showing what will be added before anything is saved.

### D3. Dark mode (M)

**Being built as Batch 29.** See its entry in `PLAN.md` for what was decided.

### D4. Another language (L)

Hindi or Punjabi, if your staff would prefer one. Every message in the app is written inline today, so this means moving them into one table first (most of the work) and then translating. The translations should be checked by a native speaker. JS only.

---

## Reliability and release

### R1. A real-data test pass (S)

All 28 batches were tested against in-memory fakes, never against the real Appwrite. A second Appwrite project (or database) with the same tables, and a short checklist to run on it, would catch what the fakes can't (permissions, column types, size limits).

- A script (`scripts/setup-appwrite.js`, run by you with an API key you create and keep) could create every table and column, which also shortens the README's setup steps.
- Claude can't use your Appwrite console or keys; you run the script.

### R2. Crash reporting (S)

The app tells you when something breaks on a phone (today only you would notice). Sentry has a free tier. **It is a native package**, so a new build, and names and phone numbers must be scrubbed from what it sends. You create the account; its project key (DSN) goes in the project's settings.

### R3. Play Store release (M)

Phones would update automatically, instead of installing an APK by hand on each one.

- A one-time developer fee (about $25: check). A production build is an Android App Bundle (`eas build --profile production`), plus a store listing, a privacy policy page (GitHub Pages is already set up for pages), and Google's data safety form.
- **Check the current rules for a new developer account:** Google has required a period of closed testing with a minimum number of testers before the first public release. Allow weeks, not days.

### R4. Staff accounts that share pianos (L)

Today every piano, payment and rental belongs to the account that made it (rows are created without explicit permissions, so only the creator can read, change or delete them). Sharing needs a design:

- **Options:** (a) one shared login: works now, but nobody can tell who did what; (b) Appwrite Teams, with rows readable and writable by the team, staff invited by email and roles (owner, staff); (c) a full audit trail on top.
- **A migration:** every existing row would need its permissions changed to include the team, by a script you run.
- **Questions to answer first:** what may staff do (see income? delete? export?); do staff use their own Google accounts; does the owner want to see who changed what.
- **Default: don't build until those are answered.**

### R5. iPhone build (M)

The README says the app is for iOS and Android, but only Android builds have been made and tried. An iPhone build needs an Apple developer account (a yearly fee: check) and a test on a real iPhone. Browser sign-in, app lock and notifications should work but are untried there.

---

## Notes

- **Cost to the owner of each Appwrite change:** a table or column is a minute or two in the console. Claude lists the exact types in the pull request, and the app keeps working without it, as the earlier tables did.
- **New builds** are the expensive thing for you (a build, installing the APK on every phone). Where a feature can be JS only, it is kept so; where it can't, several native changes are best bundled into one build (P4, D2, C2's PDF, R2 together would be one new runtime).
- **Already built, not an idea:** Edit a payment (26), CSV export (27), Mark as returned (28). Phone checks for 26 to 28 are in `QUESTIONS.md`.
