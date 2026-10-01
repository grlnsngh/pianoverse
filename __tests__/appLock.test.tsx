import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { AppState, BackHandler, Platform, Text } from "react-native";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import * as LocalAuthentication from "expo-local-authentication";
import { AppLock, AppLockProvider, useAppLock } from "@/lib/AppLockContext";
import { LOCK_AFTER_MS, LOCK_OFF_MESSAGE } from "@/utils/appLock";
import {
  allTexts,
  captureToastCalls,
  flushPromises,
  pressButton,
} from "./helpers/render";

/**
 * The app lock: locked at start and after a minute away when it is on, never
 * shutting the person out, and only turned on after the phone has checked them.
 */

const authenticateAsync = LocalAuthentication.authenticateAsync as jest.Mock;
const getEnrolledLevelAsync =
  LocalAuthentication.getEnrolledLevelAsync as jest.Mock;

let lock!: AppLock;
const Probe = () => {
  lock = useAppLock();
  return <Text>Your pianos</Text>;
};

const mounted: ReactTestRenderer[] = [];
let appStateListener: (state: string) => void = () => {};
const removeAppState = jest.fn();
let backPressed: () => boolean = () => false;
const removeBack = jest.fn();
let now = 5_000_000;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  authenticateAsync.mockResolvedValue({ success: true });
  getEnrolledLevelAsync.mockResolvedValue(
    LocalAuthentication.SecurityLevel.BIOMETRIC
  );
  now = 5_000_000;
  appStateListener = () => {};
  backPressed = () => false;
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(Date, "now").mockImplementation(() => now);
  jest.spyOn(AppState, "addEventListener").mockImplementation(((
    _type: string,
    listener: (state: string) => void
  ) => {
    appStateListener = listener;
    return { remove: removeAppState };
  }) as any);
  jest.spyOn(BackHandler, "addEventListener").mockImplementation(((
    _type: string,
    handler: () => boolean
  ) => {
    backPressed = handler;
    return { remove: removeBack };
  }) as any);
  jest.spyOn(BackHandler, "exitApp").mockImplementation(() => {});
});

afterEach(() => {
  mounted.splice(0).forEach((renderer) => act(() => renderer.unmount()));
  jest.restoreAllMocks();
});

const turnedOn = () => AsyncStorage.setItem("appLock:enabled", "1");

const open = async () => {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <AppLockProvider>
        <Probe />
      </AppLockProvider>
    );
  });
  await flushPromises();
  mounted.push(renderer);
  return renderer;
};

const lockScreen = (renderer: ReactTestRenderer) =>
  renderer.root.findAll(
    (node) =>
      typeof node.type === "string" && node.props.testID === "lock-screen"
  );

/** Whether a screen reader is kept out of the app's own screens. */
const screensHidden = (renderer: ReactTestRenderer) =>
  renderer.root.findAll(
    (node) =>
      typeof node.type === "string" &&
      node.props.importantForAccessibility === "no-hide-descendants"
  ).length > 0;

const away = async (ms: number) => {
  await act(async () => appStateListener("background"));
  now += ms;
  await act(async () => appStateListener("active"));
  await flushPromises();
};

describe("when the lock is off", () => {
  it("opens the app straight away and never asks the phone anything", async () => {
    const renderer = await open();

    expect(lockScreen(renderer)).toHaveLength(0);
    expect(allTexts(renderer.root)).toContain("Your pianos");
    expect(screensHidden(renderer)).toBe(false);
    expect(authenticateAsync).not.toHaveBeenCalled();
    expect(lock.enabled).toBe(false);
  });

  it("doesn't lock after any time away", async () => {
    const renderer = await open();

    await away(LOCK_AFTER_MS * 10);

    expect(lockScreen(renderer)).toHaveLength(0);
  });
});

describe("when the lock is on", () => {
  beforeEach(turnedOn);

  it("starts locked, and asks the phone by itself", async () => {
    authenticateAsync.mockReturnValue(new Promise(() => {}));
    const renderer = await open();

    expect(lockScreen(renderer)).toHaveLength(1);
    expect(allTexts(renderer.root)).toContain("Pianoverse is locked");
    expect(authenticateAsync).toHaveBeenCalledTimes(1);
    expect(authenticateAsync.mock.calls[0][0].promptMessage).toBe(
      "Unlock Pianoverse"
    );
  });

  it("keeps a screen reader out of the screens under the lock", async () => {
    authenticateAsync.mockReturnValue(new Promise(() => {}));
    const renderer = await open();

    expect(screensHidden(renderer)).toBe(true);
  });

  it("opens when the phone says yes", async () => {
    const renderer = await open();

    expect(lockScreen(renderer)).toHaveLength(0);
    expect(screensHidden(renderer)).toBe(false);
    expect(lock.locked).toBe(false);
    expect(lock.enabled).toBe(true);
  });

  it("stays locked when the person backs out, without scolding, and the button asks again", async () => {
    authenticateAsync.mockResolvedValueOnce({
      success: false,
      error: "user_cancel",
    });
    const renderer = await open();

    expect(lockScreen(renderer)).toHaveLength(1);
    expect(lock.message).toBe("");

    await pressButton(renderer.root, "Unlock");

    expect(authenticateAsync).toHaveBeenCalledTimes(2);
    expect(lockScreen(renderer)).toHaveLength(0);
  });

  it("says so after too many wrong tries", async () => {
    authenticateAsync.mockResolvedValue({ success: false, error: "lockout" });
    const renderer = await open();

    expect(lockScreen(renderer)).toHaveLength(1);
    expect(allTexts(renderer.root)).toContain(
      "Too many tries. Wait a moment, or use your screen lock."
    );
  });

  it("says it couldn't check, when it couldn't", async () => {
    authenticateAsync.mockRejectedValue(new Error("hardware error"));
    const renderer = await open();

    expect(allTexts(renderer.root)).toContain("Couldn’t check it. Try again.");
  });

  it("asks once at a time, not twice for two quick presses", async () => {
    let finish: (value: unknown) => void = () => {};
    authenticateAsync.mockReturnValue(
      new Promise((resolve) => (finish = resolve))
    );
    await open();

    await act(async () => {
      lock.unlock();
      lock.unlock();
    });

    expect(authenticateAsync).toHaveBeenCalledTimes(1);
    await act(async () => finish({ success: true }));
  });

  it("locks again after a minute away, and asks again", async () => {
    const renderer = await open();
    authenticateAsync.mockClear();
    authenticateAsync.mockReturnValue(new Promise(() => {}));

    await away(LOCK_AFTER_MS);

    expect(lockScreen(renderer)).toHaveLength(1);
    expect(authenticateAsync).toHaveBeenCalledTimes(1);
  });

  it("doesn't lock when the person was away for less, such as to send a WhatsApp message", async () => {
    const renderer = await open();
    authenticateAsync.mockClear();

    await away(LOCK_AFTER_MS - 1000);

    expect(lockScreen(renderer)).toHaveLength(0);
    expect(authenticateAsync).not.toHaveBeenCalled();
  });

  it("counts each time away from the start, not from the first", async () => {
    const renderer = await open();

    await away(LOCK_AFTER_MS - 1000);
    await away(LOCK_AFTER_MS - 1000);

    expect(lockScreen(renderer)).toHaveLength(0);
  });

  it("leaves the app on the back button, instead of going on into the screens under it", async () => {
    authenticateAsync.mockReturnValue(new Promise(() => {}));
    await open();

    expect(backPressed()).toBe(true);

    expect(BackHandler.exitApp).toHaveBeenCalledTimes(1);
  });

  it("gives the back button back once it is open", async () => {
    await open();

    expect(BackHandler.addEventListener).toHaveBeenCalledTimes(1);
    expect(removeBack).toHaveBeenCalledTimes(1);
  });
});

describe("when the phone has nothing to check with any more", () => {
  beforeEach(turnedOn);

  it("turns the lock off at start instead of shutting the person out", async () => {
    getEnrolledLevelAsync.mockResolvedValue(
      LocalAuthentication.SecurityLevel.NONE
    );
    const toasts = captureToastCalls();

    const renderer = await open();

    expect(lockScreen(renderer)).toHaveLength(0);
    expect(lock.enabled).toBe(false);
    expect(await AsyncStorage.getItem("appLock:enabled")).toBeNull();
    expect(toasts.map((toast) => toast.message)).toEqual([LOCK_OFF_MESSAGE]);
    expect(authenticateAsync).not.toHaveBeenCalled();
  });

  it("does the same when the phone says so while unlocking", async () => {
    authenticateAsync.mockResolvedValue({
      success: false,
      error: "not_enrolled",
    });
    const toasts = captureToastCalls();

    const renderer = await open();

    expect(lockScreen(renderer)).toHaveLength(0);
    expect(lock.enabled).toBe(false);
    expect(await AsyncStorage.getItem("appLock:enabled")).toBeNull();
    expect(toasts.map((toast) => toast.message)).toEqual([LOCK_OFF_MESSAGE]);
  });

  it("accepts a phone with only a PIN or pattern, which the phone itself offers as the fallback", async () => {
    getEnrolledLevelAsync.mockResolvedValue(
      LocalAuthentication.SecurityLevel.SECRET
    );

    const renderer = await open();

    expect(lock.enabled).toBe(true);
    expect(lockScreen(renderer)).toHaveLength(0);
  });
});

describe("turning the lock on", () => {
  it("asks the phone first, and keeps the setting only if it says yes", async () => {
    await open();

    let result: Awaited<ReturnType<AppLock["enable"]>> | undefined;
    await act(async () => {
      result = await lock.enable();
    });

    expect(result).toEqual({ ok: true });
    expect(authenticateAsync.mock.calls[0][0].promptMessage).toBe(
      "Turn on app lock"
    );
    expect(lock.enabled).toBe(true);
    expect(lock.locked).toBe(false);
    expect(await AsyncStorage.getItem("appLock:enabled")).toBe("1");
  });

  it("doesn't turn on when the person backs out", async () => {
    await open();
    authenticateAsync.mockResolvedValue({
      success: false,
      error: "user_cancel",
    });

    let result: Awaited<ReturnType<AppLock["enable"]>> | undefined;
    await act(async () => {
      result = await lock.enable();
    });

    expect(result).toEqual({ ok: false, reason: "cancelled" });
    expect(lock.enabled).toBe(false);
    expect(await AsyncStorage.getItem("appLock:enabled")).toBeNull();
  });

  it("doesn't turn on, and says why, when the phone has no screen lock", async () => {
    await open();
    getEnrolledLevelAsync.mockResolvedValue(
      LocalAuthentication.SecurityLevel.NONE
    );

    let result: Awaited<ReturnType<AppLock["enable"]>> | undefined;
    await act(async () => {
      result = await lock.enable();
    });

    expect(result).toEqual({ ok: false, reason: "unavailable" });
    expect(authenticateAsync).not.toHaveBeenCalled();
    expect(lock.enabled).toBe(false);
  });

  it("doesn't turn on when the setting can't be saved, rather than saying it is on", async () => {
    await open();
    // Once: the storage stand-in is made of jest.fn()s, which restoring doesn't reset
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
      new Error("disk full")
    );

    let result: Awaited<ReturnType<AppLock["enable"]>> | undefined;
    await act(async () => {
      result = await lock.enable();
    });

    expect(result).toEqual({ ok: false, reason: "failed" });
    expect(lock.enabled).toBe(false);
  });

  it("starts listening for the app going away only once it is on", async () => {
    await open();
    expect(AppState.addEventListener).not.toHaveBeenCalled();

    await act(async () => {
      await lock.enable();
    });

    expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
  });

  it("turns off without asking, and forgets the setting", async () => {
    await turnedOn();
    await open();

    await act(async () => {
      await lock.disable();
    });

    expect(lock.enabled).toBe(false);
    expect(await AsyncStorage.getItem("appLock:enabled")).toBeNull();
    expect(removeAppState).toHaveBeenCalled();
  });
});

describe("on the web", () => {
  it("is never available, so it can't be turned on there", async () => {
    jest.replaceProperty(Platform, "OS", "web");
    await open();

    let result: Awaited<ReturnType<AppLock["enable"]>> | undefined;
    await act(async () => {
      result = await lock.enable();
    });

    expect(result).toEqual({ ok: false, reason: "unavailable" });
    expect(getEnrolledLevelAsync).not.toHaveBeenCalled();
  });
});

describe("a setting that can't be read", () => {
  it("counts as off, so nobody is locked out by a storage fault", async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
      new Error("unreadable")
    );

    const renderer = await open();

    expect(lockScreen(renderer)).toHaveLength(0);
    expect(lock.enabled).toBe(false);
  });
});
