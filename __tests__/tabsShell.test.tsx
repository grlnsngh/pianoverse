jest.mock("@/app/(tabs)/home", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { __esModule: true, default: () => React.createElement(Text, null, "Pianos screen") };
});
jest.mock("@/app/(tabs)/profile", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { __esModule: true, default: () => React.createElement(Text, null, "Account screen") };
});
jest.mock("@/app/(tabs)/today", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { __esModule: true, default: () => React.createElement(Text, null, "Today screen") };
});

import fs from "fs";
import path from "path";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { act } from "react-test-renderer";
import TabsLayout from "@/app/(tabs)/_layout";
import { TabScenes } from "@/components/ui";
import { setActiveTab } from "@/redux/navigation/actions";
import { advance, hostByTestId, mount, textContent, update } from "./helpers/ui";
import { allTexts, createTestStore, renderWithStore } from "./helpers/render";

type Mounted = Awaited<ReturnType<typeof mount>>;

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

describe("TabScenes", () => {
  const mounts: string[] = [];
  const unmounts: string[] = [];
  const scene = (name: string) =>
    function NamedScene() {
      React.useEffect(() => {
        mounts.push(name);
        return () => {
          unmounts.push(name);
        };
      }, []);
      return <Text>{name}</Text>;
    };
  const scenes = { one: scene("one"), two: scene("two"), three: scene("three") };

  beforeEach(() => {
    mounts.length = 0;
    unmounts.length = 0;
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const opacityOf = (renderer: Mounted, key: string) =>
    StyleSheet.flatten(hostByTestId(renderer.root, `scene-${key}`).props.style).opacity as number;
  const host = (renderer: Mounted, key: string) => hostByTestId(renderer.root, `scene-${key}`);
  const shown = (renderer: Mounted) => renderer.root.findAllByType(Text).map(textContent);

  it("creates only the first tab's screen at first", async () => {
    const renderer = await mount(<TabScenes scenes={scenes} active="one" />);

    expect(shown(renderer)).toEqual(["one"]);
    expect(mounts).toEqual(["one"]);
  });

  it("creates a tab's screen the first time it is shown", async () => {
    const renderer = await mount(<TabScenes scenes={scenes} active="one" />);

    await update(renderer, <TabScenes scenes={scenes} active="three" />);

    expect(shown(renderer)).toEqual(["one", "three"]);
    expect(mounts).toEqual(["one", "three"]);
  });

  it("keeps a screen after its tab is left, so it keeps its scroll position and what was typed", async () => {
    const renderer = await mount(<TabScenes scenes={scenes} active="one" />);

    await update(renderer, <TabScenes scenes={scenes} active="two" />);
    await update(renderer, <TabScenes scenes={scenes} active="one" />);
    await update(renderer, <TabScenes scenes={scenes} active="two" />);

    // Each was created once and never thrown away
    expect(mounts).toEqual(["one", "two"]);
    expect(unmounts).toEqual([]);
  });

  it("shows the first tab at once, without fading in", async () => {
    const renderer = await mount(<TabScenes scenes={scenes} active="one" />);

    expect(opacityOf(renderer, "one")).toBe(1);
  });

  it("fades the new tab in over 120 ms, on top of the tab being left", async () => {
    const renderer = await mount(<TabScenes scenes={scenes} active="one" />);
    await update(renderer, <TabScenes scenes={scenes} active="two" />);

    expect(opacityOf(renderer, "two")).toBe(0);
    await advance(60);
    // Half way: the new one is part way in, the old one still fully there
    expect(opacityOf(renderer, "two")).toBeGreaterThan(0.2);
    expect(opacityOf(renderer, "two")).toBeLessThan(1);
    expect(opacityOf(renderer, "one")).toBe(1);

    await advance(80);
    expect(opacityOf(renderer, "two")).toBe(1);
    expect(opacityOf(renderer, "one")).toBe(0);
  });

  it("never dips through the background: one of the two is always fully there", async () => {
    const renderer = await mount(<TabScenes scenes={scenes} active="one" />);
    await update(renderer, <TabScenes scenes={scenes} active="two" />);

    for (let elapsed = 0; elapsed <= 160; elapsed += 20) {
      expect(Math.max(opacityOf(renderer, "one"), opacityOf(renderer, "two"))).toBe(1);
      if (elapsed === 0) continue;
      await advance(20);
    }
  });

  it("never slides: nothing is moved, only faded", async () => {
    const renderer = await mount(<TabScenes scenes={scenes} active="one" />);
    await update(renderer, <TabScenes scenes={scenes} active="two" />);
    await advance(60);

    for (const key of ["one", "two"]) {
      expect(StyleSheet.flatten(host(renderer, key).props.style).transform).toBeUndefined();
    }
  });

  it("fades the same way going back, with no blink: the tab left stays until it is covered", async () => {
    const renderer = await mount(<TabScenes scenes={scenes} active="one" />);
    await update(renderer, <TabScenes scenes={scenes} active="two" />);
    await advance(500);
    await update(renderer, <TabScenes scenes={scenes} active="one" />);

    // The returning tab starts clear and the one being left is still fully there
    expect(opacityOf(renderer, "one")).toBe(0);
    expect(opacityOf(renderer, "two")).toBe(1);
    await advance(64);
    expect(opacityOf(renderer, "one")).toBeGreaterThan(0.5);
    expect(opacityOf(renderer, "one")).toBeLessThan(1);
    expect(opacityOf(renderer, "two")).toBe(1);

    await advance(80);
    expect(opacityOf(renderer, "one")).toBe(1);
    expect(opacityOf(renderer, "two")).toBe(0);
  });

  it("doesn't blink when the tab it just left is chosen again straight away", async () => {
    const renderer = await mount(<TabScenes scenes={scenes} active="one" />);
    await update(renderer, <TabScenes scenes={scenes} active="two" />);
    await advance(40);
    await update(renderer, <TabScenes scenes={scenes} active="one" />);

    for (let elapsed = 0; elapsed <= 300; elapsed += 20) {
      // The tab that was never really left is fully visible the whole time
      expect(opacityOf(renderer, "one")).toBe(1);
      await advance(20);
    }
    // ...and the one that was fading in goes
    expect(opacityOf(renderer, "two")).toBe(0);
  });

  it("lets touches reach only the tab that is showing", async () => {
    const renderer = await mount(<TabScenes scenes={scenes} active="one" />);
    await update(renderer, <TabScenes scenes={scenes} active="two" />);

    expect(host(renderer, "two").props.pointerEvents).toBe("auto");
    expect(host(renderer, "one").props.pointerEvents).toBe("none");
    expect(StyleSheet.flatten(host(renderer, "two").props.style).zIndex).toBe(1);
    expect(StyleSheet.flatten(host(renderer, "one").props.style).zIndex).toBe(0);
  });

  it("hides the tabs that aren't showing from screen readers", async () => {
    const renderer = await mount(<TabScenes scenes={scenes} active="one" />);
    await update(renderer, <TabScenes scenes={scenes} active="two" />);

    expect(host(renderer, "one").props).toMatchObject({
      accessibilityElementsHidden: true,
      importantForAccessibility: "no-hide-descendants",
    });
    expect(host(renderer, "two").props).toMatchObject({
      accessibilityElementsHidden: false,
      importantForAccessibility: "auto",
    });
  });

  it("fills the space it is given", async () => {
    const renderer = await mount(<TabScenes scenes={scenes} active="one" />);

    expect(StyleSheet.flatten(host(renderer, "one").props.style)).toMatchObject({
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    });
  });
});

describe("the tabs layout", () => {
  const open = (store = createTestStore()) => ({
    store,
    renderer: renderWithStore(withSafeArea(<TabsLayout />), store),
  });
  const tab = (renderer: any, label: string) =>
    renderer.root
      .findAllByType(Pressable)
      .find((node: any) => node.props.accessibilityLabel === label);
  const selected = (renderer: any) =>
    renderer.root
      .findAllByType(Pressable)
      .filter((node: any) => node.props.accessibilityRole === "tab")
      .filter((node: any) => node.props.accessibilityState.selected)
      .map((node: any) => node.props.accessibilityLabel);

  it("has the bar with Today, Pianos and Account", () => {
    const { renderer } = open();

    const labels = renderer.root
      .findAllByType(Pressable)
      .filter((node: any) => node.props.accessibilityRole === "tab")
      .map((node: any) => node.props.accessibilityLabel);
    expect(labels).toEqual(["Today", "Pianos", "Account"]);
  });

  it("has no Create tab: adding a piano is a screen of its own", () => {
    const { renderer } = open();

    expect(tab(renderer, "Create")).toBeUndefined();
    expect(tab(renderer, "Add")).toBeUndefined();
  });

  it("opens on the Pianos tab, and creates only that screen", () => {
    const { store, renderer } = open();

    expect(store.getState().navigation.activeTab).toBe("pianos");
    expect(selected(renderer)).toEqual(["Pianos"]);
    expect(allTexts(renderer.root)).toContain("Pianos screen");
    expect(allTexts(renderer.root)).not.toContain("Account screen");
    expect(allTexts(renderer.root)).not.toContain("Today screen");
  });

  it("starts on Pianos after signing in, whichever tab was open before", () => {
    const store = createTestStore();
    act(() => {
      store.dispatch(setActiveTab("account"));
    });

    const { renderer } = open(store);

    expect(store.getState().navigation.activeTab).toBe("pianos");
    expect(selected(renderer)).toEqual(["Pianos"]);
  });

  it("switches to the tab that is pressed and keeps the one it left", () => {
    const { store, renderer } = open();

    act(() => tab(renderer, "Account").props.onPress());

    expect(store.getState().navigation.activeTab).toBe("account");
    expect(selected(renderer)).toEqual(["Account"]);
    expect(allTexts(renderer.root)).toEqual(
      expect.arrayContaining(["Pianos screen", "Account screen"])
    );
  });

  it("shows whichever tab another screen selects", () => {
    const { store, renderer } = open();

    act(() => {
      store.dispatch(setActiveTab("today"));
    });

    expect(selected(renderer)).toEqual(["Today"]);
    expect(allTexts(renderer.root)).toContain("Today screen");
  });

  it("puts the bar below the screens, outside them", () => {
    const { renderer } = open();
    const bar = renderer.root.findAll(
      (node: any) => node.props.accessibilityRole === "tablist" && typeof node.type === "string"
    )[0];

    expect(bar).toBeTruthy();
    // The bar isn't inside a scene, so a scene never covers or scrolls it
    expect(
      renderer.root.findAll(
        (node: any) => typeof node.type === "string" && /^scene-/.test(node.props.testID ?? "")
      ).every((scene: any) => !scene.findAll((n: any) => n === bar).length)
    ).toBe(true);
  });

  it("no longer uses the swipeable pager, so tabs fade instead of sliding", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "app", "(tabs)", "_layout.tsx"),
      "utf8"
    );

    expect(source).not.toContain("react-native-tab-view");
    expect(source).not.toContain("swipeEnabled");
  });
});
