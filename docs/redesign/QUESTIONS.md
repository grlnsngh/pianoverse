# Questions for the owner

Every question that came up during the redesign, in one place. The work does **not** wait for an answer: for each one the app already does the **default** below, which is the lowest-risk choice. Write your answer under **Your answer** (or just say it in the chat) and I will make the change in the next session.

- **How to answer:** a letter or a few words is enough, for example "Q15: B".
- **Where the details are:** [PLAN.md](PLAN.md) has the Decisions and Session log; each question names where it came from.
- **What to look at on your phone** is in each Session log's "How to check" list (in the chat at the end of each batch, and summarised in the Session log).
- New questions are added at the end of every session. Answered ones move to the section at the bottom. Whenever you say "continue" while any are open, I show you each one in full in the chat.

Status key: **Open** = waiting for you.

---

## Open now

### Q17. Should deleting a piano have an Undo?
- **Status:** Open. Look at this on your phone first.
- **Raised:** Batch 8 (the Feedback board draws a "Piano deleted  Undo" toast).
- **In simple terms:** when you delete a piano, the app removes the piano **and its photos from the server at once**. Once the photos are gone they can't be brought back, so an Undo button on the toast would be a lie for a piano. Deleting a payment, marking a piano as sold and extending a rental **do** have Undo now, because those only change a few values.
- **What the app does now (default):** after deleting a piano you get "Deleted Kawai K-300 successfully" with no Undo. The question before it ("Delete Kawai K-300? This removes the piano, its photos and its payments. This can't be undone.") is what protects you.
- **Options:**
  - **A. No Undo for a deleted piano** (now).
  - **B. Wait about 5 seconds before really deleting**, so Undo can work: the piano disappears from the list at once, the toast has Undo, and the piano and its photos are only removed from the server when the 5 seconds pass. It is a bigger change, and if the app is closed in those 5 seconds the piano either comes back or is deleted late, so I would want to test it on your phone.
- **Your answer:**

---

## Not questions, but please look at these on your phone

These are things I could only check in tests. If any looks wrong, tell me and I will fix it.

- **Batch 0:** the piano drawing (no-photo) and the icons look like the boards.
- **Batch 1:** the toast on iOS; spinner, keys loader, skeleton shimmer; the Reduce Motion setting stopping them.
- **Batch 2:** the sheet and dialog (drag down a sheet, keyboard against a sheet with a text field). They are not used by any screen yet.
- **Batch 3:** the new tab bar (84 high), the tab fade (no flash), the Add screen opening and closing, the Android back button, publishing landing on Pianos.
- **Batch 4:** the Pianos header, tabs, grid and list, photo fallback, filter panel opening from the pill and the sort link, select mode, offline strip, empty states.
- **Batch 5:** the filter sheet (Sort by list on top of it, the "Show N pianos" button), select mode (top bar, red Delete bar in the tab bar's place, the dialog, Android back), the refresh spinner, and Search (keyboard up at once, results as you type, bold matches, Clear, Cancel, no results).
- **Batch 6:** the app opening on Today (then switch to Pianos at once: its list should be there), the amount and the three counts against what you know (In stock is now only the pianos that are here), Needs attention (order, red and orange), the Rented out shelf (sideways scroll, the bars, See all), Recent payments, pull down on Today, the skeleton on a slow connection, and airplane mode.
- **Batch 8:** Record payment, Mark as sold and Extend rental, each with the keyboard up (the big amount, the rows) and with the calendar (month buttons, greyed days, Done); Extend rental on a running rental and on one that has ended; a toast showing above a sheet and above a dialog (Android and iOS: it should be the dark pill on both); Retry and Undo on the toasts (delete a payment then Undo, mark as sold then Undo, extend then Undo, turn on airplane mode and try to save); the Delete piano and Undo sale dialogs. **Create the `customer_name` column in Appwrite first** (see the README), then record a payment and look at Recent payments on Today.
- **Batch 7:** a piano's page for a rental, one on sale, events, warehouse and a sold one: the photo under the status bar and its three buttons, swiping through photos and the count, the viewer (pinch, double tap, the strip, the hint), the Retry tile (airplane mode, then back on, then Retry), the bar's height above the home indicator, the rental bar and its dates on a narrow phone, pressing and holding a payment, the ⋯ menu, and opening a piano from a notification just after the app starts.
- The full step-by-step list for each batch is in the chat message that ended that batch and in [PLAN.md](PLAN.md)'s Session log.

---

## Answered

### Q1. Should every Android toast look like the design's dark pill?
- **Answer:** Yes, follow the design: the dark pill everywhere (2026-09-30).
- **To be done in Batch 8.5:** plain Android messages stop using the native toast; toasts are drawn above sheets and dialogs too.

### Q2. Should a photo that fails to load show a "Retry" tile instead of the piano drawing?
- **Answer:** Yes, show Retry (2026-09-30).
- **Acted on in Batch 7:** the photo at the top of a piano's page and the full-screen viewer show the Feedback board's grey Retry tile when a photo can't load, and pressing it tries again. Cards, rows and small thumbnails still show the drawing, since a button doesn't fit in them.

### Q3. Should the ⋮ menu (Edit, Delete) come back on the Pianos list, or swipe rows?
- **Answer:** Swipe rows: install a gesture library that handles them (2026-09-30).
- **To be done in Batch 12.6:** install `react-native-gesture-handler` (needs a new native build), swipe a list row to reveal Edit and Delete, with screen-reader actions for the same.

### Q4. Should the Pianos list open as the photo grid or as the list?
- **Answer:** Grid by default (2026-09-30). This is how it already works.

### Q5. Is the wording I chose for cases the boards don't draw OK?
- **Answer:** Use my judgment (2026-09-30). The wording stays as it is in the app.

### Q6. When should the branch be merged, and should I push it?
- **Answer:** Push `redesign/v2` to GitHub after every batch as a backup copy. Merge into `main` only once everything is done (2026-09-30).
- **Acted on:** rule 14 in PLAN.md; the branch is pushed after each batch commit. Nothing is merged before Batch 13.

### Q7. Extend rental: keep the current rule or use the design's?
- **Answer:** Follow the design: 1, 3, 6 and 12 months plus "Choose a date", counted from today for a rental that has already ended (2026-09-30).
- **To be done in Batch 8.2:** this changes what the button does to a rental's end date, so the `extendRental` tests are updated on purpose.

### Q8. Haptic feedback on save?
- **Answer:** Yes (2026-09-30).
- **To be done in Batch 12.5:** install `expo-haptics` (needs a new native build; the same build as the gesture library).

### Q9. Removing the unused pager libraries and the release
- **Answer:** Remove everything that is unused, code and dependencies, once everything is done (2026-09-30).
- **To be done in Batch 13.1.**

### Q10. Should search show results as you type, or only when you press the keyboard's search key?
- **Answer:** As you type (2026-09-30). This is how it already works.

### Q11. Should search also look at the company?
- **Answer:** No, leave the company out (2026-09-30). This is how it already works.

### Q12. What should the "Sold pianos" switch in Filters mean?
- **Answer:** Show only the sold pianos (2026-09-30). This is how it already works.

### Q13. Is the system's pull-to-refresh spinner good enough?
- **Answer:** No, use the design's spinner, even though it is more work (2026-09-30).
- **To be done in Batch 12.7:** the RefreshPianos board's ink spinner in a band under the tabs, on Pianos and on Today.

### Q14. What should "In stock" count on Today?
- **Answer:** Only the pianos that are here. Rentals that are out are shown separately as "On rent" (2026-09-30).
- **Acted on (2026-09-30):** In stock = every piano that is not sold and not out with a customer (a running rental, or one that ended and hasn't come back). A rentable piano with no rental on it counts as in stock.

### Q15. Should Recent payments show the customer's name?
- **Answer:** Save the customer's name with each new payment from now on (option C) (2026-09-30).
- **In simple terms:** a payment used to be saved with only the piano, the amount and the date, so Today looked up the piano's *current* customer, which could be the wrong person for an old payment after a re-rent. From now on the name of whoever has the piano is saved *with the payment* when it is recorded, so it is always right for new payments.
- **To be done in Batch 8.1 (Record payment sheet):**
  - A new optional column, `customer_name` (string, optional), on the Appwrite `rent_payments` table. **You need to create this column in the Appwrite console** (the README will say so, like `image_urls`). Until it exists the app keeps working: recording a payment retries without the name, so nothing breaks.
  - New payments are saved with the piano's customer name at that moment.
  - Today's Recent payments shows the name saved with the payment. **Payments recorded before this change have no name, so they show the piano's title instead** (never the current customer's name, which could be wrong).

### Q16. A piano's page: things the boards don't draw, or that changed
- **Answer:** Use my judgment (2026-09-30). The page stays as built in Batch 7: a payment is deleted by pressing and holding it, ⋯ lists every action, the viewer's "Set as cover" and "Delete photo" are not built, a sold rental no longer shows its customer, and "Additional information" is gone.
