# Questions for the owner

Every question that came up during the redesign, in one place. The work does **not** wait for an answer: for each one the app already does the **default** below, which is the lowest-risk choice. Write your answer under **Your answer** (or just say it in the chat) and I will make the change in the next session.

- **How to answer:** a letter or a few words is enough, for example "Q15: B".
- **Where the details are:** [PLAN.md](PLAN.md) has the Decisions and Session log; each question names where it came from.
- **What to look at on your phone** is in each Session log's "How to check" list (in the chat at the end of each batch, and summarised in the Session log).
- New questions are added at the end of every session. Answered ones move to the section at the bottom. Whenever you say "continue" while any are open, I show you each one in full in the chat.

Status key: **Open** = waiting for you.

---

## Open now

None right now.

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
- **Batch 13 (the whole redesign, on a real phone):** **needs a new native build first.** Build it (`eas build -p android --profile preview --local`, or a development build on iPhone), sign in, and go through each board in `docs/redesign/boards/` next to the real screen: Splash and Welcome; Sign in, Create account and the two reset screens (keyboard up); Today (the amount, the three counts, Needs attention, Recent payments, pull to refresh); Pianos (grid and list, swipe a row, select several and delete, filters and Sort by, Search); a piano's page for a rental, a piano on sale, an events and a warehouse piano, and a sold one (the photo viewer, Record payment, Extend rental, Mark as sold, Undo sale, Edit, Delete); Add a piano (the three steps, the Make list, the calendar, the camera sheet, Publishing and Published); Account (the counts, Download piano list, Last updated, reminders, Sign out). Then the same with **Reduce Motion** on (everything should only fade), with **airplane mode** (the offline strip, Retry), and once with **TalkBack** or **VoiceOver** on a list row and a toast. Anything that differs from a board: tell me which screen and which board.
- **Batch 27 (CSV export of payments and customers; JavaScript only, so it can go over the air to the 1.1.18 build):** from an up-to-date `main` run `npm run update -- --message "CSV export" --platform android` and press **Restart** when the app says an update is ready. Open **Account**: **Your data** now has **Download piano list**, **Download payments** and **Download customers**. Press **Download payments**: a sheet asks which period (**This month**, **Last month**, **This financial year**, **Last financial year**, **All payments**), each with the dates it covers (a financial year is April to March). Choose one: the file opens in a spreadsheet app (or the share sheet asks which app). **Check the file:** one line per payment, the oldest first; **Amount** is a plain number you can add up (no ₹ or commas); **Date paid** is like 2026-09-03; the customer, piano and note are there; a name in Hindi, if you have one, shows properly. A period with no payments says so instead of making an empty file. Press **Download customers**: one line per customer, with their number, **Renting now** (Yes or No), their pianos, how many payments, **Total paid**, the **Last payment** and how many earlier rentals were kept. While one download is being made, the other two rows can’t be pressed. Tell me how it looks in the app that opens it, and anything you’d like as another column.
- **Batch 26 (Edit a payment; JavaScript only, so it can go over the air to the 1.1.18 build):** from an up-to-date `main` run `npm run update -- --message "Edit payment" --platform android` and press **Restart** when the app says an update is ready. Open a **rented piano that has payments** and press and hold one: a sheet opens with **Send receipt**, **Edit payment** and **Delete payment** (red). **Edit payment** opens a sheet with the amount, **Paid on**, **Paid by** and **Note** filled in; **Save changes** is greyed out until you change something. Change the amount and save: the list shows it, and "Payment updated" has **Undo**, which puts the old value back. Change the day to a different month: a line says which months the income moves between. **Fix a misspelled name** in **Paid by**: if that payment had made the piano look unpaid, the red "due" line on the piano’s page and the row on **Today** should go away (Rent due counts a payment only under the renter’s exact name). Clear the **Note** and save: the note goes. Check **Today** and **Income**: this month’s received changes after you edit an amount. **Delete payment** still asks first and still has Undo; tapping a payment still sends its receipt. With airplane mode on, saving says "Couldn’t save" and the sheet stays open with what you typed. If saving says it couldn’t on a good connection, tell me: Appwrite may not let the account update its own payments.
- **Batch 25 (Edit profile; JavaScript only, so it can go over the air to the 1.1.18 build):** from an up-to-date `main` run `npm run update -- --message "Edit profile" --platform android` and press **Restart** when the app says an update is ready. Open **Account** and tap the card with your name and email (it now has an arrow): **Edit profile** opens. **Change photo**, then **Choose from gallery**: crop a square, and you see "Photo updated"; go back and your picture is in the Account circle. Try **Take a photo** too (the phone asks for the camera the first time; if you refuse, a sheet explains how to allow it and offers the gallery). **Remove photo** asks first; after it, the orange letter is back. **Then sign out and sign in with Google again: the Google photo should NOT come back** (you removed it on purpose). Change the picture again and sign in with Google once more: your own picture stays. In the **Name** field type a new name and press **Save**: Account shows it ("Name updated"); a name under 3 characters shows a message instead. With airplane mode on, saving or changing a picture says it couldn’t, and nothing changes. In the Appwrite console, Storage: a picture you replace or remove should be deleted from the bucket. If you see "Couldn’t save your photo" on a good connection, tell me: the `avatar` column may not take a file’s address.
- **Batch 23 and 24 (JavaScript only for 24, so it can go over the air to the 1.1.18 build):** from an up-to-date `main` run `npm run update -- --message "Google photo" --platform android` and press **Restart** when the app says an update is ready. **Sign out, then sign in with Google again** (the photo is read at a Google sign-in, so an account that was already signed in gets it the next time). Open **Account**: your **Google photo** should now fill the circle in place of the letter. Your name stays the one you signed up with (see Q33). Sign out and in again: the photo is still there. A brand-new Google account (one that has never used Pianoverse) should be created with its Google name and photo. If the photo doesn’t appear, tell me; nothing else is affected and the letter stays. For Batch 23, make your next build with `npm run build:android` and check the version it picks (see the README).
- **Batch 22 (Sign in with Google; needs a NEW BUILD, 1.1.17, and the setup in Q32 first):** after the setup in Q32, make the build (`eas build -p android --profile preview --local`, as before) and install it over the old one. Sign out (Account), and on the Sign in screen press **Continue with Google**: Google’s page opens in a browser, pick the account, and you land back in the app (a "Welcome! Signed in with Google" message) on Today. **Look for:** the app should go straight back to where you were, with **no flash of the Welcome screen** or a "not found" page on the way back. Open **Account**: your name and email are the Google ones. Sign out and sign in with Google again: the same pianos are there. **Try the Gmail you already use for an email and password account:** your existing pianos and payments should be there (Appwrite puts the Google sign-in on the same account); if you see an empty list, or a message saying an account already exists, tell me exactly what it said. On **Create account** the same button is there. Press the button and close Google’s page with Back: you stay on the same screen with no error. With airplane mode on: a message that Pianoverse can’t be reached. Before Q32 is done you would see "Google sign-in isn’t switched on for Pianoverse yet." Check that Rent due, the fingerprint lock and the other new screens are in the new build too.
- **Batch 21 (rent due; JavaScript only, so it can go over the air):** needs the 1.1.16 build (runtime 2). From an up-to-date `main` run `npm run update -- --message "Rent due" --platform android` and press **Restart** when the app says an update is ready. Open **Today**: after Needs attention there is a **Rent due** list (it only appears when something is due), the most owed first, each row showing the piano, the customer and a red line like "₹8,000 due · 2 months". Tap a row to open the piano; tap the round chat button on its right to open that customer’s WhatsApp with a reminder typed that says how much is due (a rental with no number has no button, just an arrow). Open one of those pianos: under the customer there is a red line like "₹8,000 due · 2 months, since 1 Aug", and **Send reminder** is there even when the rental has months left. Use **Record payment** for the amount due and go back to Today: the row is gone, and the piano’s line says **Rent is paid up** (or how much is paid ahead). Check it against what you know. **An older rental that began before you recorded payments should show one month at most, not every month since it started**; if a rental shows more or less than you are owed, tell me its dates, its rent and its payments. A payment recorded under a differently spelled name does not count for that rental. Pull down on Today to load again.
- **Batch 20 (real rental history; JavaScript only, so it can go over the air; create the table first):** create the `rental_history` table (Q30). Merge, then from an up-to-date `main` run `npm run update -- --message "Rental history" --platform android` and press **Restart**. Open a piano that is rented to someone, **Edit** it, change the customer and the **Starts** date, and Save. Open that piano: **Previous renters** now has the old rental with its dates and rent (and, if that person had payments in it, how many and how much). Open **Account, Customers** and that person: **Rental history** lists it. Then check what must **not** be kept: extend a rental (Extend rental, or change only **Ends**), correct a customer’s spelling, change the rent: none of these adds anything. Change a rented piano into another kind (say Warehouse): its old rental is kept. Before the table exists you would see "Saved, but the old rental wasn’t kept: rental_history isn’t set up in Appwrite yet." Delete a test piano: its history goes too.
- **Batch 19 (customers and rental history; JavaScript only, so it can go over the air):** needs the 1.1.16 build (runtime 2). From an up-to-date `main` run `npm run update -- --message "Customers" --platform android` and press **Restart** when the app says an update is ready. Open **Account**: before Your data there is a **Reports** group with **Income** and **Customers**. Tap **Customers**: everyone who has rented a piano is listed, the ones with a piano now first (marked **Renting now**), each with their pianos, how many payments and what they paid in all; a note at the bottom counts payments recorded before names were saved. Tap a customer: their number with call and WhatsApp buttons, what they paid in all, the piano they have now, the pianos they had before, and every payment newest first; tap a piano to open it. Open a **rented piano** that has had more than one renter: after Payments there is **Previous renters** with the others who paid rent for it, how many payments, which months and how much; tap one to open them. Record a payment for a new name and check that the customer appears. Pull down on the lists to load again; with airplane mode on, **Try again** appears.
- **Batch 18 (income report; JavaScript only, so it can go over the air):** this works only on a phone with the 1.1.16 build (the one with the app lock; the 1.1.15 build has runtime 1 and gets nothing). From an up-to-date `main` run `npm run update -- --message "Income report" --platform android`, open the app and press **Restart** when it says an update is ready. Open **Today** and scroll to the bottom: there is an **Income** section with the last six months as black bars (the rent you received each month), an orange dot over any month you sold a piano in, this month’s name in bold, and a line like "Rent: October so far ₹6,000 · September ₹12,500". Tap **See all months**: the **Income** screen shows the last twelve months, the total with rent and sales apart, and every month with its payments and sales. Pull down on either screen to load again. Record a payment and go back to Today: the chart and the line change. With airplane mode on, the section says it couldn’t load, and the Income screen has a **Try again** button.
- **Batch 17 (app lock; needs one new full build):** the version is already 1.1.16, so stop any old Gradle daemon (`pkill -f GradleDaemon` in WSL) and run `eas build -p android --profile preview --local`, then install it. Open Account: there is a **Security** group with **App lock**. Turn it on: the phone’s own fingerprint (or face, or screen lock) question appears, and a message says App lock is on. Close the app (swipe it away) and open it: it should show **Pianoverse is locked** and ask for your fingerprint by itself; backing out of the question leaves the lock screen with an **Unlock** button. Go to WhatsApp for under a minute and come back: no question. Stay away for over a minute: it asks. Press the Back button on the lock screen: the app closes. Turn it off in Account: no question, and a message says it is off. Try turning it on with the phone’s screen lock removed (Settings, Security): a message says to set one up first. **Updates:** this build has runtime version 2, so `npm run update` reaches only this build and later ones; the 1.1.15 build gets nothing more.
- **Batch 16 (over-the-air updates; needs one new build):** the version is already 1.1.15 (the installed build is 1.1.14), so just run `eas build -p android --profile preview --local` (as before; it builds on your computer), install it, open Account and read the line at the bottom (`Version 1.1.15`). Then try an update: from an up-to-date `main`, run `npm run update -- --message "Test" --platform android` (you will be asked to log in to Expo the first time). Open the app: within a few seconds a message says **An update is ready** with **Restart**. Press it; the app restarts and the Account line now ends with `· update` and a short code. Close the app fully and open it again the next day without pressing Restart to see that the update is used anyway. `docs/redesign/WEB.md` is not involved.
- **Batch 15 (rent collection helpers; needs the next build):** on a rental that has a customer number: open the piano's page and tap **Remind customer** (WhatsApp opens on the customer's chat with the reminder typed; nothing is sent until you press send). On a rental that has ended or ends within a week, a **Send reminder** button shows under the customer too. Record a payment: the toast has **Send receipt**, which opens the same chat with the receipt typed. Tap a payment in the list: the same receipt. Pressing and holding a payment still deletes it. Try a piano with no customer number (no reminder offered, and the receipt opens the share sheet), and a payment recorded for an earlier customer (share sheet, never the new customer's chat).
- **Batch 14 (the web pages and the email; after the merge into `main`, since GitHub Pages builds from `main`):** open https://grlnsngh.github.io/pianoverse/ and then `reset-password.html` (with no link it should say the link isn't valid), on your phone and on a computer. For a real reset: in the app choose Sign in, then Forgot password, use your own email, open the link from the email on your phone, try a short password and two that differ (the red messages), Show / Hide, then choose a good one and watch the check draw in, then tap **Open Pianoverse**. With Reduce Motion on, the pages should only fade. The email itself can only be looked at once Q23 is answered; `docs/redesign/WEB.md` has the steps.
- **Batch 12:** **needs a new native build first** (`expo-haptics`, `react-native-gesture-handler`, and the Batch 11 `app.json` changes; one build covers both). In the Pianos list in the list layout: swipe a row left for Edit and Delete (Edit opens the Edit screen, Delete asks first), only one row open at a time, and a long press still starts choosing pianos; the photo grid has no swipe. Pull down on Pianos and on Today: the phone's own spinner should **not** show (look closely on Android for a faint disc at the top), and the ink spinner in its band should show until the refresh ends. Add a piano: the steps slide 24 px and fade, the category choice's white chip slides. Open a piano: its page fades in and grows a little and the bar rises after it. Feel the taps: a light one when a payment is saved, when a piano is published and when an edit is saved; a firmer one when you confirm Delete, Discard or Undo sale and when you press Sign out; none when a save fails. Turn on Reduce Motion (Android: Remove animations; iOS: Reduce Motion): nothing should slide, only fade. With TalkBack or VoiceOver: a row in the list offers Edit and Delete as actions, and a toast is read out.
- **Batch 11:** **needs a new native build first** (the orange launch screen, the white base and light mode are in `app.json`). The launch screen into the app's own splash (orange, the logo popping in, the keys loader) and then the Welcome screen: the keyboard illustration on a short and a tall phone, Sign in and Create account; each of the four auth screens with the keyboard up (the button still reachable), Show / Hide on passwords, the message under a field when you leave it, pressing the button with fields empty, the red box (try a wrong password, and airplane mode), the greyed "Signing in" state, and opening the reset link from the email; system dialogs and the keyboard now light; and on a fresh install (or after clearing the app's data) the "Get reminders before rentals end" sheet after signing in: Turn on reminders (the phone's own question follows, then a rental's reminders should be set) and Not now (it should not come back).
- **Batch 10:** the Account tab: the card on a narrow phone (a long email), the three counts against Today, Download piano list (the share sheet on Android and iOS, and the spinner while it works), Last updated (pull down on Pianos, come back, and the time should be new; airplane mode should still show it), the reminders card and its sample notification, and Sign out (the sheet, Cancel, the red button showing "Signing out", what happens in airplane mode, and that signing in again shows a fresh list).
- **Batch 9:** from the orange + on Today: the Add screen with the keyboard up (the field you are typing in and Continue both still visible), Add and then "Take a photo" / "Choose from gallery", the first photo marked Cover and tapping another to make it the cover, the × that removes a photo, many photos sliding sideways; the Make sheet (search as you type, the A to Z headings, the letters at the right edge, the tick on the chosen one), Company, the calendar for Purchased; Continue with something missing (it says what); step 2 with each of the four choices, the +91 before the mobile number, the calendars for Starts and Ends (Ends can't be before the day after Starts) and the sentence under the rental; the review (the Edit links go to the right step with what you typed still there); Add piano on a slow connection and with airplane mode on (the keys loader, "Uploading photo 2 of 3", the bar, and the error that brings you back to the review); the Published screen (the check, View piano, Add another, Done, and the Android back button); refuse the camera in the phone's settings to see the "Camera access is off" sheet; Cancel, the Android back button and the iOS swipe back on the Add screen with something typed ("Stop adding this piano?"); editing a piano from its page (the same fields on one screen, Save changes, Cancel with a change made).
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

### Q17. Should deleting a piano have an Undo?
- **Answer:** No Undo for a deleted piano (option A), keep it as it is (2026-09-30).
- **Why:** the piano's photos are removed from the server at once and can't be brought back, so an Undo would not be honest. The "Delete <title>? This can't be undone." question is what protects you. Deleting a payment, marking as sold and extending a rental keep their Undo.

### Q18. Should Model number, B number and Notes be optional?
- **Answer:** Keep the default (option A): all three stay required (2026-09-30).
- **Why it stays:** the design marks Model number and B number as "Optional", but the app has always required them and Notes. They show "Required" in grey and an empty Notes box says "Please add some notes.". Nothing to build.

### Q19. Should the category list come back on the Account tab?
- **Answer:** No, leave Account as the board draws it (option A, the default) (2026-09-30).
- **Why it stays:** the Pianos tab already has the category tabs that do the same filtering, and Today shows the money and what needs attention. Nothing to build.

### Q20. Should the phone's own splash screen show the logo too?
- **Answer:** No, plain orange and then the logo pops in (option A, the default) (2026-09-30).
- **Why it stays:** it is seamless, and a launch picture would be one more file to keep in step with the logo. Nothing to build.

### Q21. Two colours are a little darker than the boards. Is that OK?
- **Answer:** Stick with the design: use the boards' exact colours (option B) (2026-09-30).
- **Acted on:** the placeholder grey is the boards' `#77716A` again and the unselected labels of the segmented control are the boards' secondary grey again. Four pairs of these are a little under the usual 4.5:1 for text (4.1 to 4.49); they are listed in `__tests__/colorContrast.test.ts` so that they can't get worse.

### Q22. Should react-dom and react-native-web stay in the project?
- **Answer:** Keep them (option A, the default) (2026-09-30).
- **Why it stays:** `npm run web` still starts the app in a browser. Nothing to build for the packages themselves; the pages that open in a browser are listed and planned in `docs/redesign/WEB.md`.

### Q25. Should the app in a browser (`npm run web`) get a phone-width column?
- **Answer:** Leave it as it is (option A, the default) (2026-10-01).
- **Why it stays:** Pianoverse is a phone app; the app in a browser is only for development. Nothing to build.

### Q23. Which email service should send the app's emails, so the reset email can look like the app?
- **Answer:** Leave it as it is (option A, the default) (2026-10-01).
- **Why it stays:** Appwrite keeps sending its own plain reset email, which still opens the new reset page. `email/password-recovery.html` stays in the project, ready to paste into the Appwrite console if you ever set up an SMTP server (the steps are in `docs/redesign/WEB.md`).

### Q24. Is support@pianoverse.com a real address?
- **Answer:** Keep it as it is (option A) (2026-10-01), although it is **not a real mailbox**.
- **Why it stays:** you chose not to worry about it. The two pages and the email still say "Questions? support@pianoverse.com", so anyone who writes there gets no answer. If you want that changed later, option B (another address) or C (remove the lines) is a small change.

### Q26. What should the reminder and the receipt say, and in which language?
- **Answer:** Keep English (option A, the default) (2026-10-01).
- **Why it stays:** the words are in one file, `utils/reminders.ts`, so another language or other wording later is a small change.

### Q27. How soon should the app lock after you leave it?
- **Answer:** One minute (option A, the default) (2026-10-01).
- **Why it stays:** sending a WhatsApp reminder, taking a photo or answering a call and coming straight back doesn't ask again, and a phone left on a table still locks. It is one number, `LOCK_AFTER_MS` in `utils/appLock.ts`.

### Q28. How should piano sales show in the income?
- **Answer:** As built (option A, the default) (2026-10-01): the chart shows the rent as bars with an orange dot over a month a piano was sold, and the totals on the Income screen include both.
- **Why it stays:** a sale is many times a month’s rent and flattens every other bar when stacked. Sales are also counted in each month’s row and in "Sold this month" on Today.

### Q29. Should the app keep a real history of rentals?
- **Answer:** Yes, keep a real history (option B) (2026-10-01).
- **Acted on:** Batch 20. A rental is kept in a new `rental_history` table when the Edit screen replaces or ends it (see Q30 for the table). It starts from now: earlier rentals are known only from payments.

### Q30. Please create the rental_history table in Appwrite
- **Answer:** Created (option A) (2026-10-01): the table exists and the Batch 20 pull request is merged.
- **Acted on:** nothing more to build. The app keeps a replaced or ended rental in it, and shows it under Previous renters and Rental history. The columns and permissions are in the README. Still to try on the phone: the Batch 20 check above.

### Q31. Rent due: when does rent fall due, and where does counting start?
- **Answer:** Keep it as built (option A, the default) (2026-10-01): rent is monthly, paid in advance on the start date’s day of the month, and counting starts with the month of the first payment recorded for the rental.
- **Why it stays:** it is what you agreed to for now (“usually in advance, but there can be exceptions”). The rules are all in `utils/rentDue.ts`. If you later want the whole backlog counted from the start date (option B), or a rental with its own due day or end-of-month payment (option C, which needs a new column in Appwrite), tell me which rentals and I will change it.

### Q32. Please set up Google sign-in in Google Cloud and Appwrite
- **Answer:** Set up (option A) (2026-10-01), and **Continue with Google works on the phone** (“working perfectly fine”).
- **What it took:** the Google client needed **both** redirect addresses, `https://fra.cloud.appwrite.io/v1/...` as Appwrite’s dialog showed it and `https://cloud.appwrite.io/v1/...`, which is the one the app really sends; with only the first, Google answered `Error 400: redirect_uri_mismatch`. The README and this file now say so. Still not reported: the checks about the return to the app (no flash of the Welcome screen) and about the Gmail that already had an email and password account.

### Q33. Should the app follow the name on the Google account?
- **Answer:** Keep it as built (option A, the default) (2026-10-01): only a **brand new** account gets its name from Google; an account that already exists keeps the name it was signed up with. The photo follows Google.
- **Why it stays:** the app has no screen to edit a name, so it can’t tell a name you chose from one it set; following Google every time would rename your own existing account. If that changes (for example a screen to edit the name), options B and C are a small change.
