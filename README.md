# Pianoverse: Inventory Management App 🎹

Welcome to **Pianoverse**, your comprehensive cross-platform inventory management app for pianos, built with the power of [React Native](https://reactnative.dev/) and [Expo](https://expo.dev). This app helps manage piano inventory across multiple categories like rentable, events, on sale and warehouse, and keeps track of sold pianos.

## Technologies Used

- **Front-end Framework:** [React Native](https://reactnative.dev/)
- **Front-end Framework:** [Expo](https://docs.expo.dev/) (SDK 57, Expo Router, React Native 0.86, React 19)
- **Back-end:** [Appwrite](https://appwrite.io/)
- **State:** [Redux](https://redux.js.org/)
- **UI:** our own components and design tokens (`components/ui/`, `constants/theme.ts`), drawn with React Native styles, in the [Figtree](https://fonts.google.com/specimen/Figtree) font
- **Motion:** [Reanimated](https://docs.swmansion.com/react-native-reanimated/) and [Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/), with [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)

## Features

- **Three tabs:** Today (what is due, overdue and received), Pianos (grid or list, search, filters, select several) and Account (income, reminders, CSV export, sign out). The design is in `docs/redesign/`.
- **Cross-platform:** Built for iOS and Android phones, in a light or a dark theme; the app also starts on the web.
- **Dark theme:** Account, Appearance, Theme: **Light**, **Dark** or **Match phone**. The choice is kept on the phone and shows at once, everywhere; until someone picks, the app matches the phone (dark on a phone set to dark) and changes when the phone does. The phone's own keyboard, date pickers and dialogs follow the theme chosen (`app.json` is `"userInterfaceStyle": "automatic"`). Every colour comes from one of two palettes in `constants/theme.ts` (`lightColors`, `darkColors`, the same names in both), read in a screen with `useColors()` or `makeStyles` from `lib/ThemeContext.tsx`, never imported directly.
- **Category Management:** Rentable, events, on sale and warehouse pianos, each with their own details.
- **Rentals:** Due dates with reminders at 9:00 a week before, the day before, on the day, and when overdue. Extend a rental by 1, 3 or 6 months in one tap, and mark a piano as **returned** when it comes back: the rental is kept in its history and the piano goes back into stock.
- **Overdue view:** Today lists rentals that have ended but not been extended, with the rent still to collect.
- **Rent payments:** Record each payment for a rented piano (amount, date, note) and see what has been received. Press and hold a payment to send its receipt, edit it (the amount, the day, who paid and the note, with Undo) or delete it.
- **Sales:** Mark a piano as sold with the buyer, price and date; sold pianos leave the stock and can be shown with a filter.
- **Search and filters:** Search by title, make, customer, mobile, model or B-number; filter by category, active or overdue rentals, and sold pianos.
- **Customers:** A Customers screen (Account, Reports) lists everyone who has rented a piano, what they paid and which pianos, and a rented piano's page shows its previous renters. It is worked out from the names saved with the rent payments and, from when it was switched on, the rentals kept in `rental_history`.
- **Tuning and service log:** each piano's page has a **Service** section: log a tuning, repair, cleaning, move or other service with its day, an optional cost and a note; see when the next tuning is due; press and hold an entry to edit or delete it (with Undo); **Show all** opens the piano's whole log by year with what was spent. Each piano has its own **tuning interval** (every 3, 6 or 12 months, or no reminders; 6 until changed), and the next tuning is the last tuning plus it (repairs, cleaning and moves don't move it). **Today** lists **Service due** (overdue or due within a week, the most overdue first), the phone reminds at 9:00 on the due day, and a rented piano that is due has a WhatsApp button with a message about booking the visit, signed with the business name from the letterhead details. The rules are in `utils/serviceLog.ts`; the entries are in the Appwrite table `service_log` and the interval in `pianos.tuning_interval_months`.
- **Income:** Today shows the rent received this month (from the payments you record), and Account the piano counts and this month's sales.
- **Adding a piano:** Three steps with a progress bar (the basics, the category details, a review), a Make list with a letter strip, a calendar for every date, and the camera or library for photos.
- **Quick actions:** Swipe a piano in the list for Edit and Delete, pull down to refresh, and feel a light tap when something is saved. Everything only fades if the phone asks for Reduce Motion.
- **Photos:** Add up to 10 photos to a piano by taking them with the camera or choosing them. The first is the cover shown in the lists, and the piano's page lets you swipe through all of them. Tap a photo to see it on the whole screen: pinch or double tap to zoom, swipe or use the arrows for the next photo. Photos are resized before upload.
- **Income:** Today shows the rent received in the last six months as a chart, with a dot over months a piano was sold in, and an Income screen with twelve months month by month (rent and sales).
- **App lock:** Optionally ask for your fingerprint, face or screen lock when you open Pianoverse and after a minute away (Account, Security). It uses the phone's own prompt and turns itself off if the phone has no screen lock any more.
- **Customers:** Call or WhatsApp a rental customer from the piano's page.
- **Edit profile:** Tap your name on Account to change or remove your profile picture (take one or choose one, cropped square) and to change your name. A picture you chose is never replaced by your Google photo, and a removed one stays removed.
- **Sign in with Google:** Sign in or create an account with a Google account instead of a password, from the Sign in and Create account screens. It needs the one-time setup under "Sign in with Google" in Backend (Appwrite) below, and a build made after it was added. A new account gets the person's Google name, and the Google photo is shown in the circle on Account (for an account that already existed, the photo only; its name stays). Nothing more is asked of Google than the basic sign-in already allows (name, email and photo; no phone number).
- **Reminders and receipts:** Remind a customer about a rental that has ended or is about to end, and send a receipt for a payment, each as a WhatsApp message already typed for you to check and send.
- **Rent due:** Today lists the rentals that owe rent, the most owed first, each with a WhatsApp reminder that says how much; a rented piano's page shows what is due or that the rent is paid up. Rent is counted monthly, in advance, on the day of the month the rental started, from the payments you record, starting with the month of the first payment recorded for the rental (the rules are in `utils/rentDue.ts`).
- **Sharing and export:** Share a piano's details, or export the whole list as CSV. Account, Your data also downloads **payments** as a CSV for a period you choose (this month, last month, this or last financial year, April to March, or all of them) and **customers** as a CSV, for a spreadsheet or your accountant. Amounts are plain numbers and days are yyyy-MM-dd, so a spreadsheet can add and sort them.
- **Paper forms:** Account, Paper, **Paper forms**: blank forms laid out like the app, for owners who would rather write on paper than keep customers in an app: a rent card, rent receipts (three to a page with an office copy), a piano register, a rental register, a handover and return check, and a two-page **rental agreement** for a hotel or a private person with your terms printed, or all of them as one kit (9 pages). Every form and agreement can carry your **letterhead** (Paper forms, Your letterhead): **None**, **My printed paper** (space left at the top and bottom for a printed pad, with a test page to check it), **Make one** (five designs, eight colours, your logo or initials, Clean or Elegant lettering) or **Upload mine** (a letterhead image exported from Canva or scanned, as a whole page or a top strip). Agreements get the full letterhead on page 1 and a small one after, the rent card, receipts and handover the small one, and the registers stay plain. Each screen shows the real page as it will print (`react-native-webview`), and agreements take as many pages as they need. The letterhead, its images and your business details are kept on the phone only and forgotten at sign out. Each makes 1 to 20 copies, and **Save PDF**, **Print** (a Wi-Fi printer) or **Share** (WhatsApp, email, Drive). The PDF is made on the phone with `expo-print` from the HTML in `utils/paperForms/` (change the wording or columns there; it goes over the air) and kept in the app's documents as "Rent card.pdf". The agreement's terms are plain text in `utils/paperForms/agreementTerms.ts`, with a guide at the top for editing them; the letterhead designs are in `utils/paperForms/letterheads.ts`. Nothing is filled in from the app's records and the forms' contents are never uploaded. **Usage counts:** each form opened, and each PDF saved, printed or shared, is counted in the Appwrite table `form_events` (which form, what was done, the pages, when, the app version and the phone's system, with the account), so you can see which forms are used; a count made offline waits on the phone (`lib/formEvents.ts`) and goes when there is a connection. Needs a build made with runtime 5 or later.
- **Offline list:** The piano list is kept on the device and shown when there is no connection.
- **Password Reset:** Secure password recovery with a web page that looks like the app (see below).
- **Crash reports:** an installed build sends a report to Sentry (the owner's `pianoverse` project) when the app crashes or hits an error: the error and where, the screen's route, the phone's model and system, the app version and update, and the account's ID. No screenshots, no screen text, no touches; phone numbers and emails are masked (`lib/crashReports.ts`). Nothing is sent while developing or from the web. See "Crash reports (Sentry)" below.
- **Privacy policy and deleting the account:** Account, Privacy has the privacy policy (a web page) and **Delete account**, which deletes the account and everything in it (pianos, photos, payments, kept rentals, form usage counts, the profile) after asking first, through an Appwrite Function (see "Deleting an account" below). Google Play asks for both.

## 🌐 GitHub Pages Deployment

This project includes a **password reset system** that utilizes GitHub Pages for hosting the web interface. Two URLs are hosted on GitHub Pages:

### Live URLs:

- **Main Site:** https://grlnsngh.github.io/pianoverse/
- **Password Reset:** https://grlnsngh.github.io/pianoverse/reset-password.html
- **Privacy policy:** https://grlnsngh.github.io/pianoverse/privacy.html (Google Play Console, App content, Privacy policy)
- **Delete your account:** https://grlnsngh.github.io/pianoverse/delete-account.html (Google Play Console, Data safety, the "delete account" link)

They are published from `main`, so a change to them shows once it is merged. The addresses the app uses are in `constants/links.ts`, with the contact address, pianoverse.app.dev@gmail.com.

### How It Works:

1. Users can request password reset from the mobile app
2. Appwrite sends an email with a secure reset link
3. Users click the link to open the web-based password reset interface
4. After successfully resetting their password, users are redirected back to the app

### Deployment Details:

- **Hosting:** GitHub Pages (Free)
- **Backend:** Appwrite Cloud
- **Framework:** Plain HTML, CSS and JavaScript, no build step; the look (colours, type, motion) is the app's, in `web/site.css`. The pages are `index.html`, `reset-password.html`, `privacy.html` and `delete-account.html`; the scripts and the mark are in `web/`.
- **Security:** Appwrite handles all authentication and token validation. The reset page allows only its own files, Google Fonts and Appwrite (Content-Security-Policy) and never passes its link on to another site.
- **The reset email:** `email/password-recovery.html` is the template for Appwrite's "Reset password" email. Appwrite only lets you save it when the project uses your own SMTP server; how to set it up is in [docs/redesign/WEB.md](docs/redesign/WEB.md).

## Getting Started

Follow these steps to get started with Pianoverse:

### Prerequisites

- [Node.js](https://nodejs.org/) 22, the version in `.nvmrc` (Expo SDK 57 needs 20.19.4 or later). In WSL, `nvm install` and then `nvm use` in the project pick it; `nvm alias default 22` makes it the one every new terminal starts with.
- [EAS CLI](https://docs.expo.dev/build/setup/) 24 or later, for builds and updates: `npm i -g eas-cli@latest` (in WSL too, where the builds run). `eas.json` refuses older ones.
- The Expo CLI comes with the project; run it with `npx expo`.

### Installation

Clone the repository:

```sh
git clone https://github.com/grlnsngh/pianoverse.git
cd pianoverse
```

Install dependencies:

```sh
npm install
```

## Running the App

Start the app by running:

```sh
npx expo start
```

You will see options to open the app in:

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## Backend (Appwrite)

Photos are uploaded through the Appwrite SDK, which only works with React Native's own `fetch`. Since Expo SDK 56 the default is Expo's `fetch`, so `.env` sets `EXPO_PUBLIC_USE_RN_FETCH=1` to keep React Native's. Keep that line; `__tests__/fetchSetting.test.ts` fails without it.

**What the app expects of Appwrite is in `appwrite/project.json`**: every table with its ID, columns, indexes and permissions, and the photo bucket, pulled from the live project. Check the live project against it with:

```sh
npm run check:appwrite
```

It needs the Appwrite CLI signed in (`appwrite login`) and only reads. It lists anything missing or different in plain words (a table under another ID, a column that was never added, permissions opened up) and fails if there is any. The tests use the same file: their stand-in for Appwrite refuses a table, a column, a type or a length the live project doesn't have, so a mismatch shows up in `npm test` too. After changing a table on purpose, change the app with it and refresh the file with `appwrite pull tables --config-file appwrite/project.json --force` (and `pull buckets` for the bucket).

The tables below are explained for people; the file is the exact truth. Besides the `users` and `pianos` tables, the app needs a `rent_payments` table (ID `rent_payments`):

| Column     | Type              |
| ---------- | ----------------- |
| `piano_id` | string, required  |
| `creator`  | string, required  |
| `amount`   | float, required   |
| `paid_on`  | datetime, required |
| `note`     | string, optional  |
| `customer_name` | string, optional |

Permissions: **Create** for All users only, with **Row level security** on. (The `string` columns of this table and of `pianos` are **Varchar** in newer consoles, with the same size.) Each payment then belongs to the account that recorded it. Without the table, a rented piano's page shows "Couldn't load payments" and deleting a piano still works.

`customer_name` holds who was renting the piano when the payment was recorded, so the name on the Today tab stays right after the piano is rented to someone else. It was only added on 2026-10-15 (it had been missing, so a payment would have been saved without its name; there were no payments yet). The app still saves a payment without the name if the column is ever missing.

Indexes: `pianos.by_creator`, `rent_payments.by_creator_paid_on` and `by_piano_paid_on`, `rental_history.by_creator` and `by_piano`, `form_events.by_creator`, `service_log.by_creator_serviced_on` and `by_piano_serviced_on`, one for each way the app looks rows up.

The tuning and service log is the `service_log` table (ID `service_log`, created 2026-10-15): `piano_id` varchar 255 required, `creator` varchar 255 required, `serviced_on` datetime required, `kind` varchar 20 required (`tuning`, `repair`, `cleaning`, `moving` or `other`), `cost` float 0 or more optional, `note` varchar 1000 optional; Create for All users, Row level security on. Each piano's tuning interval is `pianos.tuning_interval_months`, an optional integer 0 to 24 (empty means every 6 months, 0 means no reminders). A piano's service log is deleted with it, and an account's with the account.

**The photo bucket** (`files`) can be read by anyone with a photo's address (the app shows photos without signing in to the image loader), and only signed-in people can upload. **File security is on** and there is no bucket-wide delete, so only a photo's owner can change or delete it (each file carries its uploader's permissions). Until 2026-10-15 any signed-in account could delete any photo. The list of files is still readable by anyone, and file names carry the piano's title; changing that means private photos or other names (a later change).

Rentals that are over are kept in a `rental_history` table, so a piano's page and a customer's page can show who rented it and when. It was created with an ID of its own, `6abdffe40034432a5cde`, which is what the app and the delete-account function use (`rentalHistoryCollectionId` in `lib/appwrite.ts`, `rentalHistoryTableId` in `functions/delete-account/src/config.js`); if it is ever made again, use that ID or change both. Newer Appwrite consoles call the text type **Varchar**, since the old **String** type is deprecated:

| Column             | Type                        |
| ------------------ | --------------------------- |
| `piano_id`         | varchar (255), required     |
| `creator`          | varchar (255), required     |
| `closed_on`        | datetime, required          |
| `piano_title`      | varchar (255), optional     |
| `customer_name`    | varchar (255), optional     |
| `customer_mobile`  | varchar (50), optional      |
| `customer_address` | varchar (1000), optional    |
| `period_start`     | datetime, optional          |
| `period_end`       | datetime, optional          |
| `price`            | float, optional             |
| `reason`           | varchar (50), optional      |

Permissions: **Create** for All users only, with **Row level security** on, like `rent_payments`. A row is added when the Edit screen saves a piano whose rental is over: it is rented to someone else, or from a new start date, or taken off the piano, or the piano stops being a rental, or it is marked as returned (the reason is then `returned`, and Undo deletes the row again). Extending a rental, correcting a name or changing the rent or number is the same rental and adds nothing. **Create the table before using this version.** Without it the app still works: the piano is saved and a message says the old rental wasn't kept, and a piano's previous renters come from its payments only. A piano's rentals are deleted with it.

The paper forms' usage counts are kept in a `form_events` table (ID `form_events`, created 2026-10-15):

| Column        | Type                                     |
| ------------- | ---------------------------------------- |
| `creator`     | varchar (255), required: the account ID  |
| `form`        | varchar (40), required: `rent_card`, `receipts`, `piano_register`, `rental_register`, `handover`, `agreement_hotel`, `agreement_private`, `kit` or `letterhead_test` |
| `action`      | varchar (20), required: `opened`, `saved`, `printed` or `shared` |
| `pages`       | integer 0 to 10000, optional             |
| `app_version` | varchar (50), optional: `1.1.20`, or `1.1.20+a1b2c3d4` for an update |
| `platform`    | varchar (20), optional: `android` or `ios` |
| `happened_at` | datetime, required: when it happened, which may be before the row arrived |

An index `by_creator` on `creator`. Permissions: **Create** for All users only, with **Row level security** on; the app gives each row no permissions at all, so nobody can read a count back from the app: you read them in the console (Databases, `form_events`; filter by `form` or `creator`, and match `creator` to the `accountId` in `users`). A count that Appwrite can't take yet (no connection, signed out, the table missing) waits on the phone, at most 200, and signing out forgets the ones not sent.

**Google Play's data safety form** (Play Console, App content, Data safety) must say so: under **App activity**, tick **App interactions**, collected, not shared, **processed ephemerally: no**, **required** (not optional), for **Analytics**; it is linked to the user's account and deleted with it.
The `pianos` table also needs an `image_urls` column: an array of varchar (size 1000), not required. It holds the link of every photo in the order shown, and `image_url` stays the cover (the first photo). Pianos saved before this column existed simply have one photo. **Create the column before using this version**: creating or editing a piano writes to it, and fails while it is missing.

### Crash reports (Sentry)

The app uses `@sentry/react-native` (a native package, part of runtime 5) and sends reports to the Sentry project `pianoverse` of the organization `grow-by-pixel` (the DSN is in `lib/crashReports.ts`; it can only send, so it is safe in the app). Reports come only from installed builds. In Sentry: **Issues** lists the crashes and errors with the screen and phone they happened on, and **Releases** shows each version with how many sessions ended without a crash (a session is sent when the app opens, which also shows that reporting works).

**In Sentry's project settings**, under Security & Privacy, turn on **Prevent Storing of IP Addresses** and keep **Data Scrubber** on. The app already sends no IP address, names or numbers; this is a second lock.

**Readable stack traces (optional, later).** A build's JavaScript is compiled, so a report's stack trace shows positions, not function names, until the build's source maps are uploaded. That needs a Sentry auth token, which is a secret: create one in Sentry (Settings, Auth Tokens, an organization token), set it as `SENTRY_AUTH_TOKEN` in the shell that builds (never in the repository), and remove `SENTRY_DISABLE_AUTO_UPLOAD` from that profile in `eas.json`. Until then every build skips the upload (otherwise it fails without a token). For an over-the-air update, the source maps would be uploaded after `eas update` with `npx sentry-expo-upload-sourcemaps dist`.

**Google Play's data safety form** gets one more row for crash reports: under **App info and performance**, tick **Crash logs** and **Diagnostics**, collected, not shared, required, for **App functionality** and **Analytics**.

### Sign in with Google (one-time setup)

The buttons are in the app, but Google and Appwrite have to be told about each other first. Until then the button answers "Google sign-in isn't switched on for Pianoverse yet." Nothing else in the app is affected. The app opens Google's page in the phone's browser, Appwrite signs the person in and sends them back to the app (`appwrite-callback-<project id>://`, which is a second scheme in `app.json`), and the app makes its own `users` row for a first-time sign-in.

1. **Appwrite Console** ([cloud.appwrite.io/console](https://cloud.appwrite.io/console)), your project, **Auth, Social providers** (a tab next to Settings; not "OAuth2 server"), **Google**: the dialog has two switches, **Native sign-in** and **Browser sign-in**. Pianoverse uses **Browser sign-in**, so switch that one on and leave Native sign-in off. The dialog then shows the **redirect address** (and the App ID and App secret fields); copy the address, and keep the dialog open or come back to it. **It may show a regional address** such as `https://fra.cloud.appwrite.io/v1/account/sessions/oauth2/callback/google/66b2693000154e2fa3c8`, but the app talks to `https://cloud.appwrite.io/v1` and Appwrite builds the address Google must allow from the host it was asked on, so what the app sends is `https://cloud.appwrite.io/v1/account/sessions/oauth2/callback/google/66b2693000154e2fa3c8`. **Give Google both addresses** in step 3 (a missing one gives `Error 400: redirect_uri_mismatch`).
2. **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)): pick or create a project, then open **Google Auth Platform** (search for it; its menu is Overview, Branding, Audience, Clients, Data Access, Verification Center, Settings). On **Overview** press **Get started** and fill in the four steps: **App information** (app name Pianoverse, your email as the support email), **Audience** (**External**), **Contact information** (your email) and **Finish** (agree to the policy, then **Create**). Then open **Audience**: while the app is in **Testing**, only the Google accounts listed under **Test users** can sign in, so **Add users** with your Google account and your staff's. **Publish app** there when anyone should be able to (with only the basic sign-in scopes it usually needs no review).
3. In Google Auth Platform, open **Clients, Create client**: application type **Web application** (it is called web because Appwrite's server does the Google login, not the phone), any name, and under **Authorized redirect URIs** press **Add URI** and paste the addresses from step 1 (one **Add URI** for each, exactly as written: `https`, no trailing `/`, no spaces). **Create.** Google then shows the **Client ID** and the **Client secret**: **copy both now**, because Google shows the secret only once (if it is lost, add a new secret on the client's page).
4. Back in the Appwrite Google dialog (with **Browser sign-in** on): paste the Client ID as **App ID** and the Client secret as **App secret**, and **Update**.
5. Overview, Platforms in Appwrite: the Android platform with the package `com.grlnsngh.pianoverse` is already there (the app uses it). Nothing to add.
6. Make a new build (this adds a native package, so it is a new runtime, 3) and install it. Over-the-air updates cannot add it.

A person who signs in with Google and whose email is already an account is put on that account (Appwrite matches the email), so their pianos are all there. Someone new gets a new account and an empty piano list.

### Deleting an account (one-time setup)

An app can't delete an Appwrite account, so **Account, Delete account** runs an Appwrite Function, `delete-account` (`functions/delete-account`). It deletes the person's rent payments, kept rentals, service log, form usage counts, pianos, their photos and profile photo, their `users` row and then the account, and only for whoever runs it, signed in. Until it is set up, Delete account says the account couldn't be deleted, and nothing else changes. Its settings are in `appwrite.config.json`: Node 22, runnable by signed-in users only, and a key for each run with only the users, rows and files scopes.

With the Appwrite CLI, from the project folder:

```sh
npm i -g appwrite-cli
appwrite login
appwrite push functions
```

`appwrite login` asks for your Appwrite account (choose `https://cloud.appwrite.io/v1`). `push` makes the function, or updates it, and uploads `functions/delete-account`; Appwrite builds it with `npm install`. Push again after changing the function (**Batch 32 changed it**: it now deletes `form_events` rows and uses the real `rental_history` ID).

Or by hand in the Appwrite Console: **Functions, Create function**, Node.js 22, ID **`delete-account`** (exactly), upload `functions/delete-account` as a `.tar.gz`, entrypoint `src/main.js`, build command `npm install`. Then in its **Settings**: **Execute access** "Users", **Scopes** `users.read`, `users.write`, `rows.read`, `rows.write`, `files.read`, `files.write`, and timeout 30 seconds.

**A request by email** (from `delete-account.html`, for someone without the app): check it came from the account's own address, then run the same deletion with an API key. Make one in the Appwrite Console (Overview, API keys) with the same six scopes, and don't save it in the repository:

```sh
cd functions/delete-account
npm install
APPWRITE_API_KEY=<the key> node delete-by-email.js someone@example.com
APPWRITE_API_KEY=<the key> node delete-by-email.js someone@example.com --yes
```

The first shows the account it found; `--yes` deletes it. Reply to say it's done; the page promises it within 30 days.

## Project Structure

- `app/`: screens only. [Expo Router](https://docs.expo.dev/router/introduction/) turns every file here into a route.
- `components/`: the screens' parts (piano cards and rows, sheets, dialogs); `components/ui/` holds the design system (buttons, fields, sheets, segmented control and so on).
- `constants/`: the theme (the light and dark colour palettes, radii, spacing, type, motion), categories and companies.
- `docs/redesign/`: the plan, the spec and the boards the screens follow, and [IDEAS.md](docs/redesign/IDEAS.md), the list of features that could be built next.
- `lib/`: Appwrite access and data hooks, and `ThemeContext.tsx`, which holds the light, dark or match-the-phone choice and gives every screen the colours for it.
- `redux/`: the store (pianos, filters, signed-in user, active tab).
- `services/`: rental reminders.
- `utils/`: dates, rental status, form handling, validation and other helpers.
- `web/` and the pages at the top level (`index.html`, `reset-password.html`, `privacy.html`, `delete-account.html`): what opens in a browser, served by GitHub Pages from `main`.
- `email/`: the reset email's template.
- `functions/delete-account/`: the Appwrite Function behind Delete account, and `delete-by-email.js` for deletion requests by email. `appwrite.config.json` holds its settings for the Appwrite CLI.
- `__tests__/`: Jest tests, with in-memory fakes for Appwrite and notifications.

## Testing

```sh
npm test            # run the tests once
npm run test:watch  # re-run tests as files change
npm run typecheck   # TypeScript check
npm run lint        # ESLint
```

GitHub Actions runs the lint, the type check and the tests on every pull request.

## Incrementing Version

Android only accepts an APK whose versionCode is higher than the installed one, so a build you install over an older one needs a higher version. (A fix sent as an over-the-air update, below, needs no new version.) **You don't have to do this yourself:** `npm run build:android` (next section) raises the version and the versionCode in `app.json` when it is needed. It is needed when `last-build.json`, which records the last build made, says the current number was already built; a number that hasn't been built yet is used as it is.

To raise them by hand instead (for example from "1.1.9" to "1.1.10" and versionCode 20 to 21):

```sh
npm run plus
```

## Build for Android Internal Testing

To build the project for Android internal testing (an APK you can install) **on your own computer**:

```sh
npm run build:android
```

It raises the version first if the current one was already built (see above), runs `eas build -p android --profile preview --local`, and when the build works writes down what was built in `last-build.json`. Then **commit `app.json` and `last-build.json`** (it prints the command), so that `main` matches the build on your phone. If the build fails, the record is not written, so the next run builds the same number again instead of skipping one.

Options go after `--`: `npm run build:android -- --bump` raises the version even when it isn't needed, `-- --no-bump` builds with the version as it is, and anything else (for example `--clear-cache` or `--profile production`) is passed to `eas`. Plain `eas build -p android --profile preview --local` still works, but then the version is yours to raise (`npm run plus`).

The build runs on your machine, not on Expo's servers, so it needs no paid plan; you only have to be logged in to Expo once (`eas login`). Without `--local` the same command builds in Expo's cloud, where the free plan allows a limited number of builds a month. (Expo officially supports local builds on macOS and Linux; on Windows they have worked here, but Expo doesn't test that.) Changes to native settings (`app.json` plugins, splash screen, permissions) and new native modules only reach users through a new build.

The app targets Android 16 (API level 36), which Google Play asks of new apps and updates. A build needs the Android SDK platform 36, build-tools 35 and 36, CMake 3.22.1 and NDK 27.1 and 27.0; Gradle downloads the NDKs when they are missing.

**In WSL the builds use a Linux Android SDK of their own**, `~/Android/Sdk`: `~/.bashrc` sets `ANDROID_HOME=$HOME/Android/Sdk`. Don't point it at the Windows SDK (`/mnt/c/.../Android/Sdk`): the tools Android Studio puts there are Windows programs, which Gradle in WSL can't run (`Installed Build Tools revision 35.0.0 is corrupted`), and it is slow to build through `/mnt/c`. To set it up again, put Google's Linux [command-line tools](https://developer.android.com/studio#command-line-tools-only) in `~/Android/Sdk/cmdline-tools/latest`, then:

```sh
sdkmanager --sdk_root=$HOME/Android/Sdk "platform-tools" "platforms;android-36" "build-tools;36.0.0" "build-tools;35.0.0" "cmake;3.22.1" "ndk;27.1.12297006"
```

If the build stops with `A problem occurred starting process 'command 'node''` (Gradle can't start `node`), a Gradle daemon left over from your previous build is being reused. Stop it and build again: `pkill -f GradleDaemon` (in WSL). A build started from a terminal that has `ANDROID_HOME` set (the interactive shell, not a bare `wsl -e bash script`) is needed too, or Gradle says `SDK location not found`.

If it stops with `OutOfMemoryError: Metaspace`, Gradle needs more memory than the project's `gradle.properties` gives it (many cores run many workers at once). In WSL, `~/.gradle/gradle.properties` raises it for every build on the machine: `org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8`.

## Fixing the App Without a New Build (Over-the-Air Updates)

A change to the app's JavaScript (screens, wording, logic, styles) can be sent straight to installed phones, with no new APK and no version bump. This works for builds made **from this version on**, because they carry `expo-updates`.

```sh
npm run update -- --message "Fix the reminder wording"
```

That publishes to the `preview` channel, which is what `eas build --profile preview` builds listen to (`npm run update:production` is for the `production` profile). Publish from an up-to-date `main`, never from a branch that isn't finished. The phone looks for an update when the app starts and when you come back to it after ten minutes; when one has downloaded, a message says **An update is ready** with a **Restart** button, and if you ignore it the update is used the next time the app starts. The bottom of the Account tab shows `Version 1.1.15 · update 9f8e7d6c` once an update is running.

**When a new build is needed instead:** a native package is added, removed or upgraded, or a native setting in `app.json` changes (permissions, plugins, icon, splash, scheme). An update built for the old native part would crash a phone that has the new one, and the other way round. So `runtimeVersion` in `app.json` names the native part: an update only reaches builds with the same number. `__tests__/runtimeVersion.test.ts` fails when the native part changes; the fix is to raise `runtimeVersion`, record the new list in that test, and make a new build before publishing any update.

**If nothing arrives:** the installed app must be a build made with `expo-updates` (Account shows `Version 1.1.15` or later, and the build was made after this was added), made from a project whose `runtimeVersion` in `app.json` is the same as the one you publish from; the phone needs internet; and the update must go to the channel the build was made for (`preview` for `--profile preview`). The first time, `eas update` may say the channel doesn't exist: create it once with `eas channel:create preview`. `eas update:list` and the project's Updates page on expo.dev show what has been published.

**If an update turns out bad:** publish the fix the same way, or send the previous one again with `eas update:republish`.
## Clear Cache and Start Fresh

To start the project with a clear cache, you can use the following command:

```sh
npx expo start -c
```

## License

This project is licensed under the [MIT License](https://opensource.org/license/mit).
