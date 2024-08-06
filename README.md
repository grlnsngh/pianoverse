# Pianoverse: Inventory Management App 🎹

Welcome to **Pianoverse**, your comprehensive cross-platform inventory management app for pianos, built with the power of [React Native](https://reactnative.dev/) and [Expo](https://expo.dev). This app helps manage piano inventory across multiple categories like rentable, events, on sale, sold, and warehouse.

## Technologies Used

- **Front-end:** React Native with Expo
- **Back-end:** Appwrite

## Features

- **Cross-platform:** Runs seamlessly on iOS, Android, and web.
- **Category Management:** Efficiently manage pianos across different categories.
- **Real-time Updates:** Keep your inventory updated in real time with Appwrite backend.

## Getting Started

Follow these steps to get started with Pianoverse:

### Prerequisites

- Ensure you have [Node.js](https://nodejs.org/) installed.
- Install Expo CLI globally by running:

```sh
npm install -g expo-cli
```

### Installation

Clone the repository:

```sh
git clone https://github.com/yourusername/pianoverse.git
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

## Resetting the Project

To reset the project to a fresh state:

```sh
npm run reset-project
```

This command moves the starter code to the **app-example** directory and creates a blank **app** directory for new development.

## Build for Android Internal Testing

To build the project for Android internal testing:

```sh
eas build -p android --profile preview --local
```

## Clear Cache and Start Fresh

To start the project with a clear cache, you can use the following command:

```sh
npx expo start -c
```

## License

This project is licensed under the [MIT License](https://opensource.org/license/mit).
