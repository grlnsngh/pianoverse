jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);
jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  })),
  usePathname: jest.fn(() => "/"),
}));
jest.mock("@/context/GlobalProvider", () => {
  const context = {
    user: require("./helpers/fixtures").testUser,
    setUser: jest.fn(),
    setIsLogged: jest.fn(),
  };
  return { useGlobalContext: () => context };
});

const mockRunning = {
  version: "2.3.4" as string | undefined,
  updateId: null as string | null,
  isEmbeddedLaunch: true,
};
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockRunning.version ? { version: mockRunning.version } : null;
    },
  },
}));
jest.mock("expo-updates", () => ({
  get updateId() {
    return mockRunning.updateId;
  },
  get isEmbeddedLaunch() {
    return mockRunning.isEmbeddedLaunch;
  },
  isEnabled: false,
  useUpdates: () => ({ isUpdatePending: false }),
}));

import React from "react";
import Profile from "@/app/(tabs)/profile";
import { versionLabel } from "@/utils/appVersion";
import { testUser } from "./helpers/fixtures";
import { allTexts, createTestStore, renderWithStore } from "./helpers/render";

const textsOfAccount = () =>
  allTexts(
    renderWithStore(<Profile />, createTestStore({ user: testUser })).root
  );

beforeEach(() => {
  mockRunning.version = "2.3.4";
  mockRunning.updateId = null;
  mockRunning.isEmbeddedLaunch = true;
});

describe("the version line", () => {
  it("says the version, and when an update is running, the start of its ID", () => {
    expect(versionLabel("1.1.15", null, true)).toBe("Version 1.1.15");
    expect(
      versionLabel("1.1.15", "9f8e7d6c-1111-2222-3333-444455556666", false)
    ).toBe("Version 1.1.15 · update 9f8e7d6c");
  });

  it("names no update when the app runs the one built into it", () => {
    expect(
      versionLabel("1.1.15", "9f8e7d6c-1111-2222-3333-444455556666", true)
    ).toBe("Version 1.1.15");
    expect(versionLabel("1.1.15", undefined, undefined)).toBe("Version 1.1.15");
  });

  it("is left out when the version isn't known", () => {
    expect(versionLabel(undefined, null, true)).toBeNull();
    expect(versionLabel("", "9f8e7d6c", false)).toBeNull();
  });
});

describe("the Account tab's version line", () => {
  it("shows the version at the bottom", () => {
    const texts = textsOfAccount();

    expect(texts[texts.length - 1]).toBe("Version 2.3.4");
  });

  it("shows which update is running after one has arrived", () => {
    mockRunning.updateId = "abcdef12-0000-0000-0000-000000000000";
    mockRunning.isEmbeddedLaunch = false;

    const texts = textsOfAccount();

    expect(texts[texts.length - 1]).toBe("Version 2.3.4 · update abcdef12");
  });

  it("shows nothing when the version isn't known", () => {
    mockRunning.version = undefined;

    expect(textsOfAccount().some((text) => text.startsWith("Version"))).toBe(
      false
    );
  });
});
