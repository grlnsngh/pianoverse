// React Native's Jest preset stands in for its native Animated module, so an
// animation with useNativeDriver would only jump to its end. Here every
// animation runs in JavaScript, frame by frame, which is what the motion tests
// look at.
jest.mock("react-native/src/private/animated/NativeAnimatedHelper", () => {
  const actual = jest.requireActual("react-native/src/private/animated/NativeAnimatedHelper");
  actual.default.shouldUseNativeDriver = () => false;
  return actual;
});

// Native modules the app uses that Jest can't load
require("react-native-gesture-handler/jestSetup");
// Reanimated 4 runs its worklets through react-native-worklets, which is
// native; Jest gets its stand-in, and Reanimated itself runs as in the app
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// expo-notifications 58 sets its own foreground handler as soon as it is imported. Its native
// stand-in under Jest hands back a subscription that can't be removed, which trips the app's
// own setNotificationHandler (services/notifications.ts) when a test uses the real package
jest.mock("expo-notifications/build/NotificationsHandlerModule.native", () => ({
  __esModule: true,
  default: {
    addListener: () => ({ remove: () => {} }),
    removeListener: () => {},
    removeAllListeners: () => {},
    emit: () => {},
    listenerCount: () => 0,
    handleNotificationAsync: () => Promise.resolve(),
  },
}));

// Over-the-air updates are off in tests, like while developing; a test that
// needs them on mocks the module itself
jest.mock("expo-updates", () => ({
  isEnabled: false,
  useUpdates: () => ({ isUpdateAvailable: false, isUpdatePending: false }),
  checkForUpdateAsync: jest.fn(() => Promise.resolve({ isAvailable: false })),
  fetchUpdateAsync: jest.fn(() => Promise.resolve({ isNew: false })),
  reloadAsync: jest.fn(() => Promise.resolve()),
}));

// The phone's browser, which Google's sign-in opens. By default the person
// closes it without signing in; a test that needs otherwise changes the answer
jest.mock("expo-web-browser", () => ({
  openAuthSessionAsync: jest.fn(() => Promise.resolve({ type: "cancel" })),
  // A page such as the privacy policy, which the person closes again
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: "dismiss" })),
}));

// The phone's fingerprint and screen lock. Every test sees a phone that has one
// set up and says yes; a test that needs otherwise changes the answers
jest.mock("expo-local-authentication", () => ({
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC: 2 },
  getEnrolledLevelAsync: jest.fn(() => Promise.resolve(2)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
}));

// The web view that draws the real-page previews of the paper forms. In tests
// it draws nothing; a test reads the page it was given from its source prop,
// and its text zoom (the percent of the phone's Font size it follows)
jest.mock("react-native-webview", () => {
  const React = require("react");
  const { View } = require("react-native");
  const WebView = (props) =>
    React.createElement(View, {
      testID: props.testID ?? "webview",
      source: props.source,
      textZoom: props.textZoom,
    });
  return { __esModule: true, WebView, default: WebView };
});

// Sentry's crash reports (lib/crashReports.ts). Tests never send anything; a
// test can read what the app asked of it from these
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  captureException: jest.fn(),
  wrap: (component) => component,
}));

// React Native's Jest preset says the phone's Font size is 200%. The app
// follows it (lib/useTextScale.ts), so tests start at 100% like a normal phone;
// a test that wants more uses setFontScale or atFontScale from helpers/render
{
  const { Dimensions } = require("react-native");
  const window = Dimensions.get("window");
  Dimensions.set({ window: { ...window, fontScale: 1 }, screen: { ...window, fontScale: 1 } });
}

// The camera of the QR scanner (native). By default it is a plain view and the
// phone says yes to the camera; a test changes that with fakeCamera
jest.mock("expo-camera", () => require("./fakeCamera").createFakeCameraModule());
