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

import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { AppState } from "react-native";
import { act, ReactTestRenderer } from "react-test-renderer";
import * as LocalAuthentication from "expo-local-authentication";
import Profile from "@/app/(tabs)/profile";
import { AppLockProvider } from "@/lib/AppLockContext";
import { testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureToastCalls,
  createTestStore,
  dialogOf,
  flushPromises,
  pressDialog,
  renderWithStore,
} from "./helpers/render";

/** The App lock switch on the Account tab. */

const authenticateAsync = LocalAuthentication.authenticateAsync as jest.Mock;
const getEnrolledLevelAsync =
  LocalAuthentication.getEnrolledLevelAsync as jest.Mock;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  authenticateAsync.mockResolvedValue({ success: true });
  getEnrolledLevelAsync.mockResolvedValue(
    LocalAuthentication.SecurityLevel.BIOMETRIC
  );
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((() => ({ remove: jest.fn() })) as any);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const openAccount = async () => {
  const renderer = renderWithStore(
    <AppLockProvider>
      <Profile />
    </AppLockProvider>,
    createTestStore({ user: testUser })
  );
  await flushPromises();
  return renderer;
};

const lockSwitch = (renderer: ReactTestRenderer) => {
  const [node] = renderer.root.findAll(
    (candidate) =>
      candidate.props.accessibilityLabel === "App lock" &&
      typeof candidate.props.onValueChange === "function"
  );
  if (!node) throw new Error("No App lock switch");
  return node;
};

const flip = async (renderer: ReactTestRenderer, value: boolean) => {
  await act(async () => {
    await lockSwitch(renderer).props.onValueChange(value);
  });
  await flushPromises();
};

describe("the App lock switch on Account", () => {
  it("is there, off to start with, and says what it does", async () => {
    const renderer = await openAccount();

    expect(allTexts(renderer.root)).toContain("Security");
    expect(allTexts(renderer.root)).toContain("App lock");
    expect(allTexts(renderer.root)).toContain(
      "Ask for your fingerprint or screen lock when you open Pianoverse"
    );
    expect(lockSwitch(renderer).props.value).toBe(false);
  });

  it("turns on once the phone has checked the person, and says so", async () => {
    const toasts = captureToastCalls();
    const renderer = await openAccount();

    await flip(renderer, true);

    expect(authenticateAsync).toHaveBeenCalledTimes(1);
    expect(lockSwitch(renderer).props.value).toBe(true);
    expect(await AsyncStorage.getItem("appLock:enabled")).toBe("1");
    expect(toasts.map((toast) => [toast.message, toast.variant])).toEqual([
      ["App lock is on", "success"],
    ]);
  });

  it("stays off when the person backs out of the phone's question, quietly", async () => {
    authenticateAsync.mockResolvedValue({
      success: false,
      error: "user_cancel",
    });
    const toasts = captureToastCalls();
    const renderer = await openAccount();

    await flip(renderer, true);

    expect(lockSwitch(renderer).props.value).toBe(false);
    expect(await AsyncStorage.getItem("appLock:enabled")).toBeNull();
    expect(toasts).toEqual([]);
  });

  it("explains, with a question to answer, when the phone has no fingerprint or screen lock", async () => {
    getEnrolledLevelAsync.mockResolvedValue(
      LocalAuthentication.SecurityLevel.NONE
    );
    const renderer = await openAccount();

    await flip(renderer, true);

    const dialog = dialogOf(renderer.root);
    expect(dialog?.title).toBe("Set up a screen lock first");
    expect(dialog?.message).toContain("Set one up in your phone's settings");
    expect(lockSwitch(renderer).props.value).toBe(false);
    expect(authenticateAsync).not.toHaveBeenCalled();

    await pressDialog(renderer.root, "OK");
    expect(dialogOf(renderer.root)).toBeNull();
  });

  it("says when there were too many wrong tries", async () => {
    authenticateAsync.mockResolvedValue({ success: false, error: "lockout" });
    const toasts = captureToastCalls();
    const renderer = await openAccount();

    await flip(renderer, true);

    expect(toasts.map((toast) => [toast.message, toast.variant])).toEqual([
      ["Too many tries. Wait a moment and try again.", "error"],
    ]);
    expect(lockSwitch(renderer).props.value).toBe(false);
  });

  it("says when it couldn't turn on", async () => {
    authenticateAsync.mockRejectedValue(new Error("hardware error"));
    const toasts = captureToastCalls();
    const renderer = await openAccount();

    await flip(renderer, true);

    expect(toasts.map((toast) => toast.message)).toEqual([
      "Couldn't turn on app lock. Try again.",
    ]);
  });

  it("turns off without asking the phone anything", async () => {
    await AsyncStorage.setItem("appLock:enabled", "1");
    const toasts = captureToastCalls();
    const renderer = await openAccount();
    expect(lockSwitch(renderer).props.value).toBe(true);
    authenticateAsync.mockClear();

    await flip(renderer, false);

    expect(authenticateAsync).not.toHaveBeenCalled();
    expect(lockSwitch(renderer).props.value).toBe(false);
    expect(await AsyncStorage.getItem("appLock:enabled")).toBeNull();
    expect(toasts.map((toast) => toast.message)).toEqual(["App lock is off"]);
  });

  it("is named for a screen reader, which can't see the switch", async () => {
    const renderer = await openAccount();

    expect(lockSwitch(renderer).props.accessibilityLabel).toBe("App lock");
  });
});
