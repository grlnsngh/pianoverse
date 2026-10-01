// Native modules the app uses that Jest can't load
require("react-native-gesture-handler/jestSetup");
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

// The phone's fingerprint and screen lock. Every test sees a phone that has one
// set up and says yes; a test that needs otherwise changes the answers
jest.mock("expo-local-authentication", () => ({
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC: 2 },
  getEnrolledLevelAsync: jest.fn(() => Promise.resolve(2)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
}));
