import React from "react";
import { AppState } from "react-native";
import { act, create } from "react-test-renderer";
import useAppUpdates, { CHECK_EVERY_MS } from "@/lib/useAppUpdates";
import { captureToastCalls } from "./helpers/render";

/**
 * Over-the-air updates in the app: what is said when an update has been
 * downloaded, and when the app looks for one. expo-updates is replaced by a
 * stand-in whose answers each test chooses.
 */

const mockUpdates = {
  isEnabled: true,
  isUpdatePending: false,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
};

jest.mock("expo-updates", () => ({
  get isEnabled() {
    return mockUpdates.isEnabled;
  },
  useUpdates: () => ({ isUpdatePending: mockUpdates.isUpdatePending }),
  checkForUpdateAsync: (...args: unknown[]) =>
    mockUpdates.checkForUpdateAsync(...args),
  fetchUpdateAsync: (...args: unknown[]) =>
    mockUpdates.fetchUpdateAsync(...args),
  reloadAsync: (...args: unknown[]) => mockUpdates.reloadAsync(...args),
}));

const Probe = () => {
  useAppUpdates();
  return null;
};

const noListener = () => {};
let onAppState: (state: string) => void = noListener;
const mounted: ReturnType<typeof create>[] = [];
const remove = jest.fn();
let now = 1_000_000;

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdates.isEnabled = true;
  mockUpdates.isUpdatePending = false;
  mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false });
  mockUpdates.fetchUpdateAsync.mockResolvedValue({ isNew: true });
  mockUpdates.reloadAsync.mockResolvedValue(undefined);
  onAppState = noListener;
  now = 1_000_000;
  jest.spyOn(Date, "now").mockImplementation(() => now);
  jest.spyOn(AppState, "addEventListener").mockImplementation(((
    _type: string,
    listener: (state: string) => void
  ) => {
    onAppState = listener;
    return { remove };
  }) as any);
});

afterEach(() => {
  // Close every app a test opened, so none keeps listening for the next one
  mounted.splice(0).forEach((renderer) => act(() => renderer.unmount()));
  jest.restoreAllMocks();
});

const mount = () => {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<Probe />);
  });
  mounted.push(renderer);
  return renderer;
};

const comeBack = async (afterMs: number) => {
  now += afterMs;
  await act(async () => {
    onAppState("active");
  });
};

describe("when an update has been downloaded", () => {
  it("says so, with a button to restart into it", () => {
    mockUpdates.isUpdatePending = true;
    const toasts = captureToastCalls();

    mount();

    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe("An update is ready");
    expect(toasts[0].duration).toBe("long");
    expect(toasts[0].action?.label).toBe("Restart");
  });

  it("restarts the app when the button is pressed", () => {
    mockUpdates.isUpdatePending = true;
    const toasts = captureToastCalls();
    mount();

    toasts[0].action?.onPress();

    expect(mockUpdates.reloadAsync).toHaveBeenCalledTimes(1);
  });

  it("says nothing when no update is waiting", () => {
    const toasts = captureToastCalls();

    mount();

    expect(toasts).toEqual([]);
  });

  it("says it once, however often the page draws again", () => {
    mockUpdates.isUpdatePending = true;
    const toasts = captureToastCalls();
    const renderer = mount();

    act(() => {
      renderer.update(<Probe />);
    });
    act(() => {
      renderer.update(<Probe />);
    });

    expect(toasts).toHaveLength(1);
  });

  it("copes with a restart that fails", async () => {
    mockUpdates.isUpdatePending = true;
    mockUpdates.reloadAsync.mockRejectedValue(new Error("no runtime"));
    const toasts = captureToastCalls();
    mount();

    await act(async () => {
      toasts[0].action?.onPress();
    });

    expect(mockUpdates.reloadAsync).toHaveBeenCalledTimes(1);
  });
});

describe("when the app comes back to the front", () => {
  it("looks for an update after a while, and downloads one that is there", async () => {
    mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true });
    mount();

    await comeBack(CHECK_EVERY_MS + 1);

    expect(mockUpdates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(mockUpdates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
  });

  it("downloads nothing when there is no update", async () => {
    mount();

    await comeBack(CHECK_EVERY_MS + 1);

    expect(mockUpdates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(mockUpdates.fetchUpdateAsync).not.toHaveBeenCalled();
  });

  it("doesn't look again within ten minutes", async () => {
    mount();

    await comeBack(CHECK_EVERY_MS - 1000);
    expect(mockUpdates.checkForUpdateAsync).not.toHaveBeenCalled();

    await comeBack(CHECK_EVERY_MS + 1);
    await comeBack(60_000);
    expect(mockUpdates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
  });

  it("only looks when the app is in front, not when it goes away", async () => {
    mount();
    now += CHECK_EVERY_MS * 2;

    await act(async () => {
      onAppState("background");
      onAppState("inactive");
    });

    expect(mockUpdates.checkForUpdateAsync).not.toHaveBeenCalled();
  });

  it("says nothing when it can't reach the server", async () => {
    mockUpdates.checkForUpdateAsync.mockRejectedValue(new Error("offline"));
    const toasts = captureToastCalls();
    mount();

    await comeBack(CHECK_EVERY_MS + 1);

    expect(toasts).toEqual([]);
    expect(mockUpdates.fetchUpdateAsync).not.toHaveBeenCalled();
  });

  it("stops listening when the app closes", () => {
    const renderer = mount();

    act(() => renderer.unmount());

    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe("where updates are switched off", () => {
  it("does nothing: no listener, no check, no message, even with an update pending", async () => {
    mockUpdates.isEnabled = false;
    mockUpdates.isUpdatePending = true;
    const toasts = captureToastCalls();

    mount();
    await comeBack(CHECK_EVERY_MS + 1);

    expect(AppState.addEventListener).not.toHaveBeenCalled();
    expect(mockUpdates.checkForUpdateAsync).not.toHaveBeenCalled();
    expect(toasts).toEqual([]);
  });
});
