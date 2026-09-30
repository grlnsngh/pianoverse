jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({ id: "piano-1" })),
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  })),
  usePathname: jest.fn(() => "/"),
}));

import React from "react";
import { Platform, ToastAndroid } from "react-native";
import { act } from "react-test-renderer";
import { SafeAreaProvider } from "react-native-safe-area-context";
import FilterSheet from "@/components/FilterSheet";
import ToastHost from "@/components/ToastHost";
import EditScreen from "@/app/edit/[id]";
import { showToast } from "@/utils/toast";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  createTestStore,
  pressText,
  renderWithStore,
} from "./helpers/render";

// expo-router provides this around the whole app
const withSafeArea = (children: React.ReactNode) => (
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 47, left: 0, right: 0, bottom: 34 },
    }}
  >
    {children}
  </SafeAreaProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  captureAlerts();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("toasts", () => {
  it("shows a message on iOS, where ToastAndroid does nothing", () => {
    jest.useFakeTimers();
    const renderer = renderWithStore(withSafeArea(<ToastHost />), createTestStore());

    act(() => showToast("Piano entry created successfully."));
    expect(allTexts(renderer.root)).toEqual(["Piano entry created successfully."]);

    // It rises in over 220 ms, stays for 3 s, then leaves over 180 ms
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(allTexts(renderer.root)).toEqual(["Piano entry created successfully."]);
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(allTexts(renderer.root)).toEqual([]);
  });

  it("keeps long messages up for longer", () => {
    jest.useFakeTimers();
    const renderer = renderWithStore(withSafeArea(<ToastHost />), createTestStore());

    act(() => showToast("Password reset email sent!", "long"));
    act(() => {
      jest.advanceTimersByTime(3500);
    });
    expect(allTexts(renderer.root)).toEqual(["Password reset email sent!"]);

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(allTexts(renderer.root)).toEqual([]);
  });

  it("uses the native toast on Android", () => {
    jest.replaceProperty(Platform, "OS", "android");
    const show = jest.spyOn(ToastAndroid, "show").mockImplementation(() => {});

    showToast("Deleted Yamaha U1 successfully");

    expect(show).toHaveBeenCalledWith(
      "Deleted Yamaha U1 successfully",
      ToastAndroid.SHORT
    );
  });

  it("confirms a saved edit on iOS", async () => {
    const piano = makePiano();
    fakeBackend.documents.set(piano.$id, { ...piano });
    const renderer = renderWithStore(
      withSafeArea(
        <>
          <EditScreen />
          <ToastHost />
        </>
      ),
      createTestStore({ user: testUser, items: [piano] })
    );

    await pressText(renderer.root, "Save Changes");

    expect(allTexts(renderer.root)).toContain("Piano entry updated successfully");
  });
});

describe("filters", () => {
  it("no longer offers a Sold filter, which nothing could fill", async () => {
    const renderer = renderWithStore(
      withSafeArea(<FilterSheet visible onClose={() => {}} />),
      createTestStore()
    );

    const texts = allTexts(renderer.root);
    expect(texts).toContain("Active rentals");
    expect(texts).not.toContain("Sold");
  });
});
