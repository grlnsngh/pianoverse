# Pianoverse: Inventory Management App 🎹

Welcome to **Pianoverse**, your comprehensive cross-platform inventory management app for pianos, built with the power of [React Native](https://reactnative.dev/) and [Expo](https://expo.dev). This app helps manage piano inventory across multiple categories like rentable, events, on sale and warehouse, and keeps track of sold pianos.

## Technologies Used

- **Front-end Framework:** [React Native](https://reactnative.dev/)
- **Front-end Framework:** [Expo](https://docs.expo.dev/) (SDK 51, Expo Router)
- **Back-end:** [Appwrite](https://appwrite.io/)
- **State:** [Redux](https://redux.js.org/)
- **UI Library:** [React Native Paper](https://callstack.github.io/react-native-paper/)
- **CSS Framework:** [Tailwind](https://tailwindcss.com/) through [NativeWind v2](https://www.nativewind.dev/v2)

## Features

- **Cross-platform:** Runs on iOS, Android, and web.
- **Category Management:** Rentable, events, on sale and warehouse pianos, each with their own details.
- **Rentals:** Due dates with reminders at 9:00 a week before, the day before, on the day, and when overdue. Extend a rental by 1, 3 or 6 months in one tap.
- **Overdue view:** Home points out rentals that have ended but not been extended.
- **Sales:** Mark a piano as sold with the buyer, price and date; sold pianos leave the stock and can be shown with a filter.
- **Search and filters:** Search by title, make, customer, mobile, model or B-number; filter by category, active or overdue rentals, and sold pianos.
- **Income:** Profile shows the rent from active rentals and this month's sales.
- **Photos:** Take a photo with the camera or choose one; photos are resized before upload.
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

## Project Structure

- `app/`: screens only. [Expo Router](https://docs.expo.dev/router/introduction/) turns every file here into a route.
- `components/`: shared UI (piano rows, form fields, sheets, filter button).
- `constants/`: categories, companies, colours, icons and images.
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
