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
- **Your answer** (tell me any wording to change):

### Q6. When should the branch be merged, and should I push it?
- **Status:** Open. Asked earlier in the chat, not answered yet.
- **Raised:** after Batch 3.
- **What is true now:** all the work is on the local branch `redesign/v2` (one commit per finished batch, plus the docs). **Nothing is pushed and nothing is merged.** `main` has not moved.
- **Options for merging:** **A.** after Batch 13, as the plan says (one pull request at the very end). **B.** after Batch 11, when every screen looks new, with Batches 12 and 13 as a second smaller pull request. Merging earlier than Batch 11 would put a half-redesigned app on `main`.
- **Options for the backup:** **push `redesign/v2` to GitHub** now (does not touch `main`), or keep it local.
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
- The full step-by-step list for each batch is in the chat message that ended that batch and in [PLAN.md](PLAN.md)'s Session log.

---

## Answered

_(Nothing yet. Answered questions will be moved here with the answer and the batch that acted on it.)_
