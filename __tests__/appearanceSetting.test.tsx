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
import { ReactTestRenderer } from "react-test-renderer";
import Profile from "@/app/(tabs)/profile";
import { darkColors, lightColors } from "@/constants/theme";
import { AppLockProvider } from "@/lib/AppLockContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import { testUser } from "./helpers/fixtures";
import {
  allTexts,
  createTestStore,
  flushPromises,
  pressText,
  renderWithStore,
} from "./helpers/render";
import { colorsDrawn, lightLeaks } from "./helpers/ui";

/** The Theme row of Account: Light, Dark or Match phone. */

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
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
    <ThemeProvider>
      <AppLockProvider>
        <Profile />
      </AppLockProvider>
    </ThemeProvider>,
    createTestStore({ user: testUser })
  );
  await flushPromises();
  return renderer;
};

/** The three options of the segmented control, with whether each is the chosen one. */
const options = (renderer: ReactTestRenderer) =>
  ["Light", "Dark", "Match phone"].map((label) => {
    const [node] = renderer.root.findAll(
      (candidate) =>
        typeof candidate.props.onPress === "function" &&
        candidate.props.accessibilityRole === "tab" &&
        candidate.props.accessibilityLabel === label
    );
    return { label, node, selected: !!node?.props.accessibilityState?.selected };
  });

describe("the Theme row on Account", () => {
  it("is under its own Appearance heading, with what it is for", async () => {
    const renderer = await openAccount();
    const texts = allTexts(renderer.root);

    expect(texts).toContain("Appearance");
    expect(texts).toContain("Theme");
    expect(texts).toContain("Light, dark, or the same as your phone");
  });

  it("offers Light, Dark and Match phone, with Light chosen until the person picks", async () => {
    const renderer = await openAccount();

    expect(options(renderer).map(({ label, selected }) => [label, selected])).toEqual([
      ["Light", true],
      ["Dark", false],
      ["Match phone", false],
    ]);
  });

  it("draws Account in the light theme to begin with", async () => {
    const renderer = await openAccount();

    expect(colorsDrawn(renderer)).toContain(lightColors.grouped);
    expect(colorsDrawn(renderer)).not.toContain(darkColors.grouped);
  });

  it("turns the whole screen dark when Dark is pressed, and keeps nothing of the light theme", async () => {
    const renderer = await openAccount();

    await pressText(renderer.root, "Dark");

    expect(options(renderer).map(({ selected }) => selected)).toEqual([false, true, false]);
    expect(colorsDrawn(renderer)).toContain(darkColors.grouped);
    expect(colorsDrawn(renderer)).toContain(darkColors.surface);
    expect(lightLeaks(renderer)).toEqual([]);
  });

  it("remembers Dark for the next time the app opens", async () => {
    const renderer = await openAccount();

    await pressText(renderer.root, "Dark");

    expect(await AsyncStorage.getItem("appearance:setting")).toBe("dark");
  });

  it("opens in dark when dark was saved, with Dark chosen", async () => {
    await AsyncStorage.setItem("appearance:setting", "dark");

    const renderer = await openAccount();

    expect(options(renderer).map(({ selected }) => selected)).toEqual([false, true, false]);
    expect(colorsDrawn(renderer)).toContain(darkColors.grouped);
    expect(lightLeaks(renderer)).toEqual([]);
  });

  it("goes back to light, and forgets the choice, when Light is pressed again", async () => {
    await AsyncStorage.setItem("appearance:setting", "dark");
    const renderer = await openAccount();

    await pressText(renderer.root, "Light");

    expect(options(renderer).map(({ selected }) => selected)).toEqual([true, false, false]);
    expect(colorsDrawn(renderer)).toContain(lightColors.grouped);
    expect(await AsyncStorage.getItem("appearance:setting")).toBeNull();
  });

  it("chooses Match phone, and remembers that", async () => {
    const renderer = await openAccount();

    await pressText(renderer.root, "Match phone");

    expect(options(renderer).map(({ selected }) => selected)).toEqual([false, false, true]);
    expect(await AsyncStorage.getItem("appearance:setting")).toBe("system");
  });
});
