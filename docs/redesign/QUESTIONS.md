# Questions for the owner

Every question that came up during the redesign, in one place. The work does **not** wait for an answer: for each one the app already does the **default** below, which is the lowest-risk choice. Test on your phone, then answer them together. Write your answer under **Your answer** and I will make the change in the next session.

- **How to answer:** a letter or a few words is enough, for example "Q4: add swipe rows" or "Q5: keep the list".
- **Where the details are:** [PLAN.md](PLAN.md) has the Decisions and Session log; each question names where it came from.
- **What to look at on your phone** is in each Session log's "How to check" list (in the chat at the end of each batch, and summarised in the Session log).
- New questions are added at the end of every session. Answered ones move to the section at the bottom.

Status key: **Open** = waiting for you. **Later** = not asked yet, comes up in a later batch, the default is set.

---

## Open now

### Q1. Should every Android toast look like the design's dark pill?
- **Status:** Open. Needed before Batch 8 (that is when saved / failed / undo toasts get wired).
- **Raised:** Batch 1 (toast), still open after Batch 2 (sheets).
- **What the app does now (default):** On Android a plain message such as "Payment recorded" is still the **native Android toast**. On iOS and web it is the design's dark pill. A toast with a button (Undo, Retry) is always the dark pill, on every platform.
- **Why:** sheets and dialogs are React Native modals, and a toast drawn inside the app appears **behind** an open modal. The native Android toast appears above everything.
- **Options:**
  - **A. Keep it as it is** (native for plain messages, dark pill for Undo and Retry). Nothing to do.
  - **B. Dark pill everywhere.** Android toasts then match iOS, but I have to make toasts draw above sheets and dialogs too (more work, and something to test on a phone).
- **Your answer:**

### Q2. Should a photo that fails to load show a "Retry" tile instead of the piano drawing?
- **Status:** Open. Needed before Batch 7 (Piano detail hero).
- **Raised:** Batch 1 (Feedback board vs SPEC).
- **What the app does now (default):** if a photo is missing **or fails to load**, the piano drawing is shown (as SPEC section 5 and plan item 0.6 say).
- **The conflict:** the Feedback board draws three photo states: loading (grey), no photo (the drawing) and **failed to load: a grey tile with a refresh icon and "Retry"**.
- **Options:**
  - **A. Drawing for failed photos too** (now). Simple, but a broken photo looks like "no photo" and cannot be retried without leaving the page.
  - **B. Retry tile for failed photos**, as on the Feedback board. Most useful on the piano's page.
- **Your answer:**

### Q3. Should the ⋮ menu (Edit, Delete) come back on the Pianos list, or swipe rows?
- **Status:** Open. Look at this on your phone first.
- **Raised:** Batch 4.
- **What the app does now (default):** cards and rows have **no ⋮ menu**, because no board draws one. Delete works by long-pressing a piano to select it, then the delete bar. Edit and Delete will be on each piano's own page after Batches 7 and 8.
- **Also:** the Handoff board says "swipe a list row for Edit and Delete", but no board draws it and the app has no gesture library.
- **Options:**
  - **A. Leave it as it is** (no quick Edit or Delete on the list).
  - **B. Swipe rows** in the list layout (Edit and Delete revealed by swiping). Needs a gesture library, so **a new native build**.
  - **C. Bring back a small ⋮ menu** on cards and rows (not on any board).
- **Your answer:**

### Q4. Should the Pianos list open as the photo grid or as the list?
- **Status:** Open. Look at this on your phone first.
- **Raised:** Batch 4.
- **What the app does now (default):** the **photo grid**, as on the Pianos board and the "photo first" principle. It used to open as the list. The old "card" layout now shows as the grid.
- **Options:** **A.** grid (now). **B.** list, as before (one line to change).
- **Your answer:**

### Q5. Is the wording I chose for cases the boards don't draw OK?
- **Status:** Open. Read these on your phone.
- **Raised:** Batches 1 and 4.
- **What the app says now (default):**
  - A rental that ends **today**: "Ends today". One day left: "Ends in 1 day". (The old screens still say "Due today".)
  - A rental with **no end date**: "Available".
  - A **sold** piano in the list: "Sold 12 Sep 2026", and "· Sold" after its price.
  - A **warehouse** piano with no date: "In the warehouse". With a date: "Stored since Mar 2026" (on the board).
  - Sort link names: "Latest added", "Due date", "Purchase date", "Title A to Z", "Title Z to A".
  - Empty states I wrote: "No pianos in stock" (every piano sold), "No pianos match your filters".
  - **Today (Batch 6):** a rental that has ended reads "Ended 18 days ago" in Needs attention (the Main board's words) while the badge on the Pianos tab reads "Overdue · 18 days" (the spec's). Quiet lines: "Nothing needs your attention.", "No pianos yet. Add one with the + button.", "No payments yet", and "Couldn’t load payments. Pull down to try again."
- **Your answer** (tell me any wording to change):

### Q6. When should the branch be merged, and should I push it?
- **Status:** Open. Asked earlier in the chat, not answered yet.
- **Raised:** after Batch 3.
- **What is true now:** all the work is on the local branch `redesign/v2` (one commit per finished batch, plus the docs). **Nothing is pushed and nothing is merged.** `main` has not moved.
- **Options for merging:** **A.** after Batch 13, as the plan says (one pull request at the very end). **B.** after Batch 11, when every screen looks new, with Batches 12 and 13 as a second smaller pull request. Merging earlier than Batch 11 would put a half-redesigned app on `main`.
- **Options for the backup:** **push `redesign/v2` to GitHub** now (does not touch `main`), or keep it local.
- **Your answer:**

### Q10. Should search show results as you type, or only when you press the keyboard's search key?
- **Status:** Open. Look at this on your phone first.
- **Raised:** Batch 5.
- **What the app does now (default):** results update **as you type**, and the keyboard's search key just closes the keyboard. The Search board draws a field with a clear button and a "3 results" line and no Search button. It used to run the search only when you pressed the search key.
- **Options:** **A.** as you type (now). **B.** only on the search key, as before (a small change back).
- **Your answer:**

### Q11. Should search also look at the company?
- **Status:** Open. Look at this on your phone first.
- **Raised:** Batch 5 (Search board vs the app).
- **What the app does now (default):** search looks at the **title and make**, a rental's **customer name and mobile number**, and an event piano's **model and B-number**. It does **not** look at the company. The hint under the results says exactly that.
- **The conflict:** the Search board's hint says "title, make, company, and the customer's name or mobile number", and its example finds pianos by the company name.
- **Options:** **A.** leave the company out (now). **B.** add the company (a small change to what search finds).
- **Your answer:**

### Q12. What should the "Sold pianos" switch in Filters mean?
- **Status:** Open.
- **Raised:** Batch 5.
- **What the app does now (default):** off hides sold pianos; on shows **only** the sold ones. The switch's line says "Show only pianos that were sold".
- **The design says:** "Include them in the list", which reads as sold pianos **added to** the others.
- **Options:** **A.** only the sold ones (now, nothing changes). **B.** include them with the others (changes what the list shows when the switch is on).
- **Your answer:**

### Q13. Is the system's pull-to-refresh spinner good enough?
- **Status:** Open. Look at this on your phone first.
- **Raised:** Batch 5.
- **What the app does now (default):** pulling down shows the phone's **own** refresh spinner, coloured to match the app. The RefreshPianos board draws a custom ink spinner in a band under the tabs.
- **Why:** the custom one means replacing the system pull gesture, which feels different and can't be checked without a device.
- **Options:** **A.** the system spinner (now). **B.** the board's spinner (more work, and I would want to try it on your phone).
- **Your answer:**

### Q14. What should "In stock" count on Today?
- **Status:** Open. Look at this on your phone first.
- **Raised:** Batch 6.
- **What the app does now (default):** every piano that has **not been sold**, whatever its category, **including rentals that are out**. On the Main board's sample, "10 In stock" sits next to "3 On rent", which could mean either.
- **Options:** **A.** every unsold piano (now). **B.** only pianos that are here: leave out the rentals that are out (so In stock plus On rent make the total).
- **Your answer:**

### Q15. Should Recent payments show the customer's name?
- **Status:** Open.
- **Raised:** Batch 6.
- **What the app does now (default):** each payment shows the piano's **current** customer name, then the piano and the day (as the Main board). A payment is only saved with the piano, not with who paid, so if a piano was re-rented to someone else, its **older payments show the new customer's name**. A piano with no customer shows its title instead.
- **Options:** **A.** keep it (now, matches the board). **B.** show the piano's title only, which is always true. **C.** save the customer's name with each new payment (a change to what is stored, so a later batch, and older payments would still lack it).
- **Your answer:**

---

## Later (not asked yet, the default is set)

### Q7. Extend rental: keep the current rule or use the design's?
- **Status:** Later. Comes up in Batch 8 (Extend rental sheet). SPEC section 8 says to ask before changing it.
- **Default:** keep today's rule: **+1, +3 or +6 months counted from the current end date**.
- **The design shows:** 1, 3, 6 and **12** months plus **"Choose a date"**, counted **from today** for a rental that has already ended.
- **Options:** **A.** keep today's rule (only the look changes). **B.** the design's options and counting. This changes what the button does to a rental's end date, so please decide before Batch 8.
- **Your answer:**

### Q8. Haptic feedback on save?
- **Status:** Later. Batch 12.5 (optional).
- **Default:** none. `expo-haptics` is not installed, and adding it means **a new native build**.
- **Your answer:** yes / no

### Q9. Removing the unused pager libraries and the release
- **Status:** Later. Batch 13.
- **What:** `react-native-tab-view` and `react-native-pager-view` are no longer used (the tabs fade instead of swiping). Removing them is a **native dependency change**, so it needs a new build. Batch 13 also bumps the version (`npm run plus`) and opens the pull request.
- **Default:** remove them in Batch 13 and say so in the pull request.
- **Your answer** (any objection, or a version you want):

---

## Not questions, but please look at these on your phone

These are things I could only check in tests. If any looks wrong, tell me and I will fix it.

- **Batch 0:** the piano drawing (no-photo) and the icons look like the boards.
- **Batch 1:** the toast on iOS; spinner, keys loader, skeleton shimmer; the Reduce Motion setting stopping them.
- **Batch 2:** the sheet and dialog (drag down a sheet, keyboard against a sheet with a text field). They are not used by any screen yet.
- **Batch 3:** the new tab bar (84 high), the tab fade (no flash), the Add screen opening and closing, the Android back button, publishing landing on Pianos.
- **Batch 4:** the Pianos header, tabs, grid and list, photo fallback, filter panel opening from the pill and the sort link, select mode, offline strip, empty states.
- **Batch 5:** the filter sheet (Sort by list on top of it, the "Show N pianos" button), select mode (top bar, red Delete bar in the tab bar's place, the dialog, Android back), the refresh spinner, and Search (keyboard up at once, results as you type, bold matches, Clear, Cancel, no results).
- **Batch 6:** the app opening on Today (then switch to Pianos at once: its list should be there), the amount and the three counts against what you know, Needs attention (order, red and orange), the Rented out shelf (sideways scroll, the bars, See all), Recent payments, pull down on Today, the skeleton on a slow connection, and airplane mode.
- The full step-by-step list for each batch is in the chat message that ended that batch and in [PLAN.md](PLAN.md)'s Session log.

---

## Answered

_(Nothing yet. Answered questions will be moved here with the answer and the batch that acted on it.)_
