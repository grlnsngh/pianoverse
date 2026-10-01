// Native modules the app uses that Jest can't load
require("react-native-gesture-handler/jestSetup");
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
