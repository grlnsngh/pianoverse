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
