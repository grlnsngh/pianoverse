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
