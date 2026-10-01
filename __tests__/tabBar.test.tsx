import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { AddButton, TabBar } from "@/components/ui";
import type { TabBarItem } from "@/components/ui";
import { ICONS } from "@/components/ui/Icon";
import { lightColors as colors, fonts } from "@/constants/theme";
import { hostByTestId, mount, textContent } from "./helpers/ui";

type Mounted = Awaited<ReturnType<typeof mount>>;
const flat = (style: unknown) => StyleSheet.flatten(style as any);

const withInsets = (bottom: number, children: React.ReactNode) => (
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 47, left: 0, right: 0, bottom },
    }}
  >
    {children}
  </SafeAreaProvider>
);

const TABS: readonly TabBarItem<"today" | "pianos" | "account">[] = [
  { key: "today", label: "Today", icon: "tabToday" },
  { key: "pianos", label: "Pianos", icon: "tabPianos" },
  { key: "account", label: "Account", icon: "tabAccount" },
];

const bar = (
  active: "today" | "pianos" | "account" = "today",
  onSelect = jest.fn(),
  bottom = 34
) => ({
  onSelect,
  mounted: mount(
    withInsets(bottom, <TabBar testID="bar" tabs={TABS} active={active} onSelect={onSelect} />)
  ),
});

const tabs = (renderer: Mounted) => renderer.root.findAllByType(Pressable);
const barStyle = (renderer: Mounted) => flat(hostByTestId(renderer.root, "bar").props.style);

describe("TabBar", () => {
  it("has a tab each for Today, Pianos and Account, in that order", async () => {
    const renderer = await bar().mounted;

    expect(tabs(renderer).map(textContent)).toEqual(["Today", "Pianos", "Account"]);
  });

  it("is white with a hairline on top and 8 px of room above the icons", async () => {
    const renderer = await bar().mounted;

    expect(barStyle(renderer)).toMatchObject({
      flexDirection: "row",
      paddingTop: 8,
      backgroundColor: colors.page,
      borderTopWidth: 1,
      borderTopColor: colors.hairline,
    });
  });

  it("is 84 high on an iPhone: 50 plus the 34 px home indicator", async () => {
    const renderer = await bar("today", jest.fn(), 34).mounted;

    expect(barStyle(renderer).height).toBe(84);
  });

  it("keeps a little room below on a phone with no home indicator", async () => {
    const renderer = await bar("today", jest.fn(), 0).mounted;

    expect(barStyle(renderer).height).toBe(58);
  });

  it("shares its width equally, with a tap area of at least 44 px", async () => {
    const renderer = await bar().mounted;

    for (const tab of tabs(renderer)) {
      expect(flat(tab.props.style)).toMatchObject({ flex: 1, alignItems: "center" });
    }
    // 50 px of content height, more than the 44 px minimum
    expect(barStyle(renderer).height - 34).toBeGreaterThanOrEqual(44);
  });

  it("draws a 26 px icon over each label, with the icon from the set", async () => {
    const renderer = await bar().mounted;
    const drawn = renderer.root.findAllByType(Svg);

    expect(drawn).toHaveLength(3);
    for (const svg of drawn) {
      expect(svg.props).toMatchObject({ width: 26, height: 26 });
    }
    const paths = renderer.root.findAllByType(Path).map((p) => p.props.d);
    expect(paths).toContain(ICONS.tabToday[1].d);
    expect(paths).toContain(ICONS.tabPianos[1].d);
    expect(paths).toContain(ICONS.tabAccount[1].d);
  });

  it("shows the active tab in ink, bold, with a heavier icon", async () => {
    const renderer = await bar("pianos").mounted;
    const [today, pianos] = tabs(renderer);

    expect(flat(pianos.findByType(Text).props.style)).toMatchObject({
      color: colors.ink,
      fontFamily: fonts.bold,
      fontSize: 11,
    });
    expect(pianos.findByType(Svg).props).toMatchObject({ stroke: colors.ink, strokeWidth: 2 });

    // ...and the others in grey, semibold, at the normal weight
    expect(flat(today.findByType(Text).props.style)).toMatchObject({
      color: colors.ink3,
      fontFamily: fonts.semibold,
      fontSize: 11,
    });
    expect(today.findByType(Svg).props).toMatchObject({ stroke: colors.ink3, strokeWidth: 1.75 });
  });

  it("moves the active look when another tab becomes active", async () => {
    const first = await bar("today").mounted;
    const second = await bar("account").mounted;

    expect(tabs(first)[0].findByType(Svg).props.stroke).toBe(colors.ink);
    expect(tabs(second)[0].findByType(Svg).props.stroke).toBe(colors.ink3);
    expect(tabs(second)[2].findByType(Svg).props.stroke).toBe(colors.ink);
  });

  it("reports the tab that is pressed", async () => {
    const { mounted, onSelect } = bar("today");
    const renderer = await mounted;

    tabs(renderer)[2].props.onPress();

    expect(onSelect).toHaveBeenCalledWith("account");
  });

  it("is a tab list, with the active tab selected, for screen readers", async () => {
    const renderer = await bar("pianos").mounted;

    expect(hostByTestId(renderer.root, "bar").props.accessibilityRole).toBe("tablist");
    expect(tabs(renderer).map((tab) => tab.props.accessibilityState.selected)).toEqual([
      false,
      true,
      false,
    ]);
    expect(tabs(renderer).map((tab) => tab.props.accessibilityLabel)).toEqual([
      "Today",
      "Pianos",
      "Account",
    ]);
    expect(tabs(renderer).map((tab) => tab.props.accessibilityRole)).toEqual(Array(3).fill("tab"));
  });

  it("hides its icons from screen readers, since each tab has a label", async () => {
    const renderer = await bar().mounted;

    for (const svg of renderer.root.findAllByType(Svg)) {
      expect(svg.props.accessibilityElementsHidden).toBe(true);
    }
  });
});

describe("AddButton", () => {
  const setup = (props: Partial<React.ComponentProps<typeof AddButton>> = {}) => {
    const onPress = jest.fn();
    return { onPress, mounted: mount(<AddButton onPress={onPress} {...props} />) };
  };
  const button = (renderer: Mounted) => renderer.root.findByType(Pressable);

  it("is a 44 px orange circle", async () => {
    const renderer = await setup().mounted;

    expect(flat(button(renderer).props.style({ pressed: false }))).toMatchObject({
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
    });
  });

  it("has a 22 px ink plus in it", async () => {
    const renderer = await setup().mounted;

    expect(renderer.root.findByType(Path).props.d).toBe(ICONS.plus[0].d);
    expect(renderer.root.findByType(Svg).props).toMatchObject({
      width: 22,
      height: 22,
      stroke: colors.ink,
      strokeWidth: 2.2,
    });
  });

  it("calls onPress", async () => {
    const { mounted, onPress } = setup();
    const renderer = await mounted;

    button(renderer).props.onPress();

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("darkens and shrinks a little while pressed", async () => {
    const renderer = await setup().mounted;
    const style = button(renderer).props.style;

    expect(flat(style({ pressed: true }))).toMatchObject({
      backgroundColor: colors.brandPressed,
      transform: [{ scale: 0.98 }],
    });
    expect(flat(style({ pressed: false })).transform).toBeUndefined();
  });

  it("is a button called Add piano, or whatever it is told", async () => {
    const plain = await setup().mounted;
    const named = await setup({ accessibilityLabel: "Add payment" }).mounted;

    expect(button(plain).props).toMatchObject({
      accessibilityRole: "button",
      accessibilityLabel: "Add piano",
    });
    expect(button(named).props.accessibilityLabel).toBe("Add payment");
  });
});
