# Pianoverse: Inventory Management App 🎹

Welcome to **Pianoverse**, your comprehensive cross-platform inventory management app for pianos, built with the power of [React Native](https://reactnative.dev/) and [Expo](https://expo.dev). This app helps manage piano inventory across multiple categories like rentable, events, on sale and warehouse, and keeps track of sold pianos.

## Technologies Used

- **Front-end Framework:** [React Native](https://reactnative.dev/)
- **Front-end Framework:** [Expo](https://docs.expo.dev/) (SDK 51, Expo Router)
- **Back-end:** [Appwrite](https://appwrite.io/)
- **State:** [Redux](https://redux.js.org/)
- **UI:** our own components and design tokens (`components/ui/`, `constants/theme.ts`), drawn with React Native styles, in the [Figtree](https://fonts.google.com/specimen/Figtree) font
- **Motion:** [Reanimated](https://docs.swmansion.com/react-native-reanimated/) and [Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/), with [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)

## Features

- **Three tabs:** Today (what is due, overdue and received), Pianos (grid or list, search, filters, select several) and Account (income, reminders, CSV export, sign out). The design is in `docs/redesign/`.
- **Cross-platform:** Built for iOS and Android phones in light mode; the app also starts on the web.
- **Category Management:** Rentable, events, on sale and warehouse pianos, each with their own details.
- **Rentals:** Due dates with reminders at 9:00 a week before, the day before, on the day, and when overdue. Extend a rental by 1, 3 or 6 months in one tap.
- **Overdue view:** Today lists rentals that have ended but not been extended, with the rent still to collect.
- **Rent payments:** Record each payment for a rented piano (amount, date, note) and see what has been received.
- **Sales:** Mark a piano as sold with the buyer, price and date; sold pianos leave the stock and can be shown with a filter.
- **Search and filters:** Search by title, make, customer, mobile, model or B-number; filter by category, active or overdue rentals, and sold pianos.
- **Income:** Today shows the rent received this month (from the payments you record), and Account the piano counts and this month's sales.
- **Adding a piano:** Three steps with a progress bar (the basics, the category details, a review), a Make list with a letter strip, a calendar for every date, and the camera or library for photos.
- **Quick actions:** Swipe a piano in the list for Edit and Delete, pull down to refresh, and feel a light tap when something is saved. Everything only fades if the phone asks for Reduce Motion.
- **Photos:** Add up to 10 photos to a piano by taking them with the camera or choosing them. The first is the cover shown in the lists, and the piano's page lets you swipe through all of them. Tap a photo to see it on the whole screen: pinch or double tap to zoom, swipe or use the arrows for the next photo. Photos are resized before upload.
- **Customers:** Call or WhatsApp a rental customer from the piano's page.
- **Sharing and export:** Share a piano's details, or export the whole list as CSV.
- **Offline list:** The piano list is kept on the device and shown when there is no connection.
- **Password Reset:** Secure password recovery system with web-based interface.

## 🌐 GitHub Pages Deployment

This project includes a **password reset system** that utilizes GitHub Pages for hosting the web interface. Two URLs are hosted on GitHub Pages:

### Live URLs:

- **Main Site:** https://grlnsngh.github.io/pianoverse/
- **Password Reset:** https://grlnsngh.github.io/pianoverse/reset-password.html

### How It Works:

1. Users can request password reset from the mobile app
2. Appwrite sends an email with a secure reset link
3. Users click the link to open the web-based password reset interface
4. After successfully resetting their password, users are redirected back to the app

### Deployment Details:

- **Hosting:** GitHub Pages (Free)
- **Backend:** Appwrite Cloud
- **Framework:** Plain HTML/JavaScript for maximum compatibility
- **Security:** Appwrite handles all authentication and token validation

## Getting Started

Follow these steps to get started with Pianoverse:

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or 20.
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

Besides the `users` and `pianos` tables, the app needs a `rent_payments` table (use `rent_payments` as its ID when creating it):

| Column     | Type              |
| ---------- | ----------------- |
| `piano_id` | string, required  |
| `creator`  | string, required  |
| `amount`   | float, required   |
| `paid_on`  | datetime, required |
| `note`     | string, optional  |
| `customer_name` | string, optional |

Permissions: **Create** for All users only, with **Row level security** on. Each payment then belongs to the account that recorded it. Without the table, a rented piano's page shows "Couldn't load payments" and deleting a piano still works.

`customer_name` holds who was renting the piano when the payment was recorded, so the name on the Today tab stays right after the piano is rented to someone else. Create it (size 255, not required). Until it exists, payments are still saved, just without the name, and payments recorded before it existed show the piano's title.

The `pianos` table also needs an `image_urls` column: an array of varchar (size 1000), not required. It holds the link of every photo in the order shown, and `image_url` stays the cover (the first photo). Pianos saved before this column existed simply have one photo. **Create the column before using this version**: creating or editing a piano writes to it, and fails while it is missing.

## Project Structure

- `app/`: screens only. [Expo Router](https://docs.expo.dev/router/introduction/) turns every file here into a route.
- `components/`: the screens' parts (piano cards and rows, sheets, dialogs); `components/ui/` holds the design system (buttons, fields, sheets, segmented control and so on).
- `constants/`: the theme (colours, radii, spacing, type, motion), categories and companies.
- `docs/redesign/`: the plan, the spec and the boards the screens follow.
- `lib/`: Appwrite access and data hooks.
- `redux/`: the store (pianos, filters, signed-in user, active tab).
- `services/`: rental reminders.
- `utils/`: dates, rental status, form handling, validation and other helpers.
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

To increment the app version and versionCode in app.json:

```sh
npm run plus
```

This script updates the version from e.g., "1.1.9" to "1.1.10" and versionCode from 20 to 21.

## Build for Android Internal Testing

To build the project for Android internal testing:

```sh
eas build -p android --profile preview --local
```

Changes to native settings (`app.json` plugins, splash screen, permissions) and new native modules only reach users through a new build, not an over-the-air update.

## Clear Cache and Start Fresh

To start the project with a clear cache, you can use the following command:

```sh
npx expo start -c
```

## License

This project is licensed under the [MIT License](https://opensource.org/license/mit).
