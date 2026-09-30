import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { IconTabs, PickerSheet, SearchPill, Skeleton, StateView } from "@/components/ui";
import type { IconTabItem } from "@/components/ui";
import { ICONS } from "@/components/ui/Icon";
import PianosSkeleton from "@/components/PianosSkeleton";
import { colors, fonts } from "@/constants/theme";
import { findAllMemo, hostByTestId, mount, textContent } from "./helpers/ui";

type Mounted = Awaited<ReturnType<typeof mount>>;
const flat = (style: unknown) => StyleSheet.flatten(style as any);

describe("IconTabs", () => {
  const TABS: IconTabItem<"all" | "rentable" | "events">[] = [
    { key: "all", label: "All", icon: "categoryAll" },
    { key: "rentable", label: "Rentable", icon: "categoryRentable" },
    { key: "events", label: "Events", icon: "categoryEvents" },
  ];
  const setup = (active: "all" | "rentable" | "events" = "all", tabs = TABS) => {
    const onSelect = jest.fn();
    return {
      onSelect,
      mounted: mount(
        <IconTabs
          testID="tabs"
          tabs={tabs}
          active={active}
          onSelect={onSelect}
          accessibilityLabel="Category"
        />
      ),
    };
  };
  const tabs = (renderer: Mounted) => renderer.root.findAllByType(Pressable);

  it("is a row of equal tabs over a hairline", async () => {
    const renderer = await setup().mounted;

    expect(flat(hostByTestId(renderer.root, "tabs").props.style)).toMatchObject({
      flexDirection: "row",
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
    });
    for (const tab of tabs(renderer)) {
      expect(flat(tab.props.style)).toMatchObject({
        flex: 1,
        alignItems: "center",
        gap: 4,
        paddingTop: 8,
        paddingBottom: 10,
        borderBottomWidth: 2,
        marginBottom: -1,
      });
    }
    expect(tabs(renderer).map(textContent)).toEqual(["All", "Rentable", "Events"]);
  });

  it("shows the active tab in ink and bold, with a 2 px ink line under it", async () => {
    const renderer = await setup("rentable").mounted;
    const [all, rentable] = tabs(renderer);

    expect(flat(rentable.props.style).borderBottomColor).toBe(colors.ink);
    expect(rentable.findByType(Svg).props).toMatchObject({
      width: 24,
      height: 24,
      stroke: colors.ink,
      strokeWidth: 1.9,
    });
    expect(flat(rentable.findByType(Text).props.style)).toMatchObject({
      color: colors.ink,
      fontFamily: fonts.bold,
      fontSize: 12,
      lineHeight: 16,
    });

    expect(flat(all.props.style).borderBottomColor).toBe("transparent");
    expect(all.findByType(Svg).props).toMatchObject({ stroke: colors.ink2, strokeWidth: 1.75 });
    expect(flat(all.findByType(Text).props.style)).toMatchObject({
      color: colors.ink2,
      fontFamily: fonts.semibold,
    });
  });

  it("draws each tab's icon from the set", async () => {
    const renderer = await setup().mounted;
    const paths = renderer.root.findAllByType(Path).map((path) => path.props.d);

    expect(paths).toEqual([
      ICONS.categoryAll[0].d,
      ICONS.categoryRentable[0].d,
      ICONS.categoryEvents[0].d,
    ]);
  });

  it("reports the tab that is pressed", async () => {
    const { mounted, onSelect } = setup();
    const renderer = await mounted;

    tabs(renderer)[2].props.onPress();

    expect(onSelect).toHaveBeenCalledWith("events");
  });

  it("is a tab list, with the active tab selected, for screen readers", async () => {
    const renderer = await setup("events").mounted;

    expect(hostByTestId(renderer.root, "tabs").props).toMatchObject({
      accessibilityRole: "tablist",
      accessibilityLabel: "Category",
    });
    expect(tabs(renderer).map((tab) => tab.props.accessibilityState.selected)).toEqual([
      false,
      false,
      true,
    ]);
    expect(tabs(renderer).map((tab) => tab.props.accessibilityRole)).toEqual(Array(3).fill("tab"));
  });

  it("greys out a disabled tab and stops it being pressed", async () => {
    const renderer = await setup("rentable", [
      { ...TABS[0], disabled: true },
      TABS[1],
      { ...TABS[2], disabled: true },
    ]).mounted;
    const [all, rentable, events] = tabs(renderer);

    expect(all.props.disabled).toBe(true);
    expect(events.props.disabled).toBe(true);
    expect(flat(all.props.style).opacity).toBe(0.4);
    expect(all.props.accessibilityState).toMatchObject({ disabled: true });
    // The one that is still open is left alone
    expect(rentable.props.disabled).toBeFalsy();
    expect(flat(rentable.props.style).opacity).toBeUndefined();
  });
});

describe("SearchPill", () => {
  const setup = (props: Partial<React.ComponentProps<typeof SearchPill>> = {}) => {
    const onPress = jest.fn();
    const onFilterPress = jest.fn();
    return {
      onPress,
      onFilterPress,
      mounted: mount(
        <SearchPill testID="pill" onPress={onPress} onFilterPress={onFilterPress} {...props} />
      ),
    };
  };
  const pill = (renderer: Mounted) => flat(hostByTestId(renderer.root, "pill").props.style);
  const buttons = (renderer: Mounted) => renderer.root.findAllByType(Pressable);

  it("is a white 52 px pill with a hairline and the search shadow", async () => {
    const renderer = await setup().mounted;

    expect(pill(renderer)).toMatchObject({
      height: 52,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: colors.hairline,
      backgroundColor: colors.white,
      shadowOpacity: 0.08,
      shadowRadius: 6,
    });
  });

  it("says what it searches, in two lines", async () => {
    const renderer = await setup().mounted;
    const [title, hint] = renderer.root.findAllByType(Text);

    expect(textContent(title)).toBe("Search pianos");
    expect(flat(title.props.style)).toMatchObject({ fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 });
    expect(textContent(hint)).toBe("Title, make or customer");
    expect(flat(hint.props.style)).toMatchObject({ fontSize: 12, lineHeight: 16, color: colors.ink2 });
  });

  it("has a 20 px search icon", async () => {
    const renderer = await setup().mounted;
    const icon = renderer.root.findAllByType(Svg)[0];

    expect(icon.props).toMatchObject({ width: 20, height: 20, stroke: colors.ink, strokeWidth: 2 });
    expect(renderer.root.findAllByType(Path)[0].props.d).toBe(ICONS.search[1].d);
  });

  it("opens the search screen when the pill is pressed", async () => {
    const { mounted, onPress, onFilterPress } = setup();
    const renderer = await mounted;

    buttons(renderer)[0].props.onPress();

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onFilterPress).not.toHaveBeenCalled();
    expect(buttons(renderer)[0].props).toMatchObject({
      accessibilityRole: "button",
      accessibilityLabel: "Search pianos",
      accessibilityHint: "Title, make or customer",
    });
  });

  it("has a round 40 px filter button inside its right end", async () => {
    const { mounted, onFilterPress } = setup();
    const renderer = await mounted;
    const filter = buttons(renderer)[1];

    expect(flat(filter.props.style)).toMatchObject({
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.controlBorder,
    });
    expect(filter.findByType(Svg).props).toMatchObject({ width: 18, height: 18, strokeWidth: 1.9 });
    expect(pill(renderer)).toMatchObject({ gap: 6, paddingLeft: 4, paddingRight: 6 });

    filter.props.onPress();
    expect(onFilterPress).toHaveBeenCalledTimes(1);
  });

  it("has no filter button when there is nothing to filter", async () => {
    const renderer = await setup({ onFilterPress: undefined }).mounted;

    expect(buttons(renderer)).toHaveLength(1);
    expect(flat(buttons(renderer)[0].props.style).paddingLeft).toBe(16);
  });

  it("says how many filters are on, on the button and to screen readers", async () => {
    const none = await setup().mounted;
    const two = await setup({ filterCount: 2 }).mounted;

    expect(none.root.findAll((n) => n.props.testID === "active-filter-badge")).toHaveLength(0);
    expect(buttons(none)[1].props.accessibilityLabel).toBe("Filters");

    const badge = hostByTestId(two.root, "active-filter-badge");
    expect(textContent(badge)).toBe("2");
    expect(flat(badge.props.style)).toMatchObject({ backgroundColor: colors.brand });
    expect(buttons(two)[1].props.accessibilityLabel).toBe("Filters, 2 active");
  });
});

describe("StateView", () => {
  const setup = (props: Partial<React.ComponentProps<typeof StateView>> = {}) =>
    mount(<StateView testID="state" title="No pianos yet" {...props} />);
  const box = (renderer: Mounted) => flat(hostByTestId(renderer.root, "state").props.style);

  it("has a centred 24 px bold title", async () => {
    const renderer = await setup();
    const title = renderer.root.findByType(Text);

    expect(textContent(title)).toBe("No pianos yet");
    expect(flat(title.props.style)).toMatchObject({
      fontFamily: fonts.bold,
      fontSize: 24,
      lineHeight: 30,
      textAlign: "center",
      color: colors.ink,
    });
    expect(title.props.accessibilityRole).toBe("header");
  });

  it("has a grey line of help under it", async () => {
    const renderer = await setup({ message: "Add your first piano to start." });
    const message = renderer.root.findAllByType(Text)[1];

    expect(textContent(message)).toBe("Add your first piano to start.");
    expect(flat(message.props.style)).toMatchObject({
      fontFamily: fonts.regular,
      fontSize: 16,
      lineHeight: 22,
      color: colors.ink2,
      marginTop: 8,
      textAlign: "center",
    });
  });

  it("can show the piano drawing on a big rounded tile", async () => {
    const renderer = await setup({ art: "piano-1" });
    const svg = renderer.root.findAllByType(Svg)[0];
    const tile = renderer.root.find(
      (node) => typeof node.type === "string" && flat(node.props.style)?.width === 200
    );

    expect(svg.props.viewBox).toBe("0 0 160 160");
    expect(flat(tile.props.style)).toMatchObject({ width: 200, height: 200, borderRadius: 48 });
    expect(box(renderer).paddingTop).toBe(120);
    expect(flat(renderer.root.findByType(Text).props.style).marginTop).toBe(28);
  });

  it("can show an icon in a round grey badge", async () => {
    const renderer = await setup({ icon: "wifiOff" });
    const svg = renderer.root.findByType(Svg);
    const circle = renderer.root.find(
      (node) => typeof node.type === "string" && flat(node.props.style)?.width === 88
    );

    expect(svg.props).toMatchObject({ width: 40, height: 40, strokeWidth: 1.6, stroke: colors.ink });
    expect(renderer.root.findAllByType(Path)[0].props.d).toBe(ICONS.wifiOff[0].d);
    expect(flat(circle.props.style)).toMatchObject({
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.fillInput,
    });
    expect(box(renderer).paddingTop).toBe(140);
    expect(flat(renderer.root.findByType(Text).props.style).marginTop).toBe(24);
  });

  it("has one button that gets the person out of it, orange by default", async () => {
    const onAction = jest.fn();
    const renderer = await setup({ actionLabel: "Add your first piano", onAction });
    const button = renderer.root.findByType(Pressable);

    expect(textContent(button)).toBe("Add your first piano");
    expect(flat(button.props.style({ pressed: false }))).toMatchObject({
      backgroundColor: colors.brand,
      height: 52,
      marginTop: 28,
      paddingHorizontal: 28,
    });

    button.props.onPress();
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("can have the quieter grey button", async () => {
    const renderer = await setup({
      actionLabel: "Clear filters",
      onAction: () => {},
      actionVariant: "secondary",
    });

    expect(
      flat(renderer.root.findByType(Pressable).props.style({ pressed: false })).backgroundColor
    ).toBe(colors.fill);
  });

  it("has no button unless it has a label and something to do", async () => {
    const noHandler = await setup({ actionLabel: "Try again" });
    const noLabel = await setup({ onAction: () => {} });

    expect(noHandler.root.findAllByType(Pressable)).toHaveLength(0);
    expect(noLabel.root.findAllByType(Pressable)).toHaveLength(0);
  });

  it("has no picture at all when it has neither art nor an icon", async () => {
    const renderer = await setup();

    expect(renderer.root.findAllByType(Svg)).toHaveLength(0);
    expect(flat(renderer.root.findByType(Text).props.style).marginTop).toBe(0);
  });
});

describe("PianosSkeleton", () => {
  const shapes = (renderer: Mounted) =>
    findAllMemo(renderer.root, Skeleton).map((node) => node.props);

  it("is one busy, labelled thing for a screen reader", async () => {
    const renderer = await mount(<PianosSkeleton layout="grid" />);

    expect(hostByTestId(renderer.root, "pianos-skeleton").props).toMatchObject({
      accessible: true,
      accessibilityLabel: "Loading pianos",
      accessibilityState: { busy: true },
    });
  });

  it("has a small placeholder where the count and sort link go", async () => {
    const renderer = await mount(<PianosSkeleton layout="grid" />);

    expect(shapes(renderer)[0]).toMatchObject({ width: 70, height: 14, radius: 7 });
  });

  it("draws four cards for the grid: a 169 px photo and three lines each", async () => {
    const renderer = await mount(<PianosSkeleton layout="grid" />);
    const all = shapes(renderer);
    const photos = all.filter((shape) => shape.height === 169);

    expect(photos).toHaveLength(4);
    for (const photo of photos) expect(photo).toMatchObject({ width: "100%", radius: 16 });
    // count + 4 x (photo + 3 lines)
    expect(all).toHaveLength(1 + 4 * 4);
  });

  it("varies the line lengths from card to card, as on the board", async () => {
    const renderer = await mount(<PianosSkeleton layout="grid" />);
    const titles = shapes(renderer)
      .filter((shape) => shape.height === 15)
      .map((shape) => shape.width);

    expect(titles).toEqual([120, 100, 110, 126]);
  });

  it("draws six rows for the list: a 64 px thumbnail and three lines each", async () => {
    const renderer = await mount(<PianosSkeleton layout="list" />);
    const all = shapes(renderer);
    const thumbs = all.filter((shape) => shape.width === 64 && shape.height === 64);

    expect(thumbs).toHaveLength(6);
    for (const thumb of thumbs) expect(thumb.radius).toBe(12);
    expect(all).toHaveLength(1 + 6 * 4);
    expect(all.filter((shape) => shape.height === 169)).toHaveLength(0);
  });

  it("uses no real chrome: only grey shapes", async () => {
    const renderer = await mount(<PianosSkeleton layout="grid" />);

    expect(renderer.root.findAllByType(Pressable)).toHaveLength(0);
    expect(renderer.root.findAllByType(Text)).toHaveLength(0);
    expect(renderer.root.findAllByType(View).length).toBeGreaterThan(0);
  });
});

describe("PickerSheet", () => {
  const OPTIONS = [
    { value: "make", label: "Make" },
    { value: "model", label: "Model" },
    { value: "year", label: "Year" },
  ] as const;
  const setup = (value: "make" | "model" | "year" = "model", visible = true) => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    return {
      onSelect,
      onClose,
      mounted: mount(
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 47, left: 0, right: 0, bottom: 34 },
          }}
        >
          <PickerSheet
            visible={visible}
            title="Sort by"
            options={OPTIONS}
            value={value}
            onSelect={onSelect}
            onClose={onClose}
          />
        </SafeAreaProvider>
      ),
    };
  };
  const rows = (renderer: Mounted) =>
    renderer.root.findAllByType(Pressable).filter((node) => node.props.accessibilityRole === "radio");

  it("is a white sheet with the title, a Cancel button and a row per option", async () => {
    const renderer = await setup().mounted;

    expect(rows(renderer).map((row) => row.props.accessibilityLabel)).toEqual(["Make", "Model", "Year"]);
    expect(renderer.root.findAllByType(Text).map(textContent)).toEqual(
      expect.arrayContaining(["Sort by", "Cancel", "Make", "Model", "Year"])
    );
    const sheet = renderer.root.find(
      (node) => typeof node.type === "string" && node.props.accessibilityViewIsModal === true
    );
    expect(flat(sheet.props.style).backgroundColor).toBe(colors.white);
  });

  it("draws 52 px rows with a hairline between them", async () => {
    const renderer = await setup().mounted;

    expect(flat(rows(renderer)[0].props.style({ pressed: false }))).toMatchObject({
      height: 52,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairline,
      flexDirection: "row",
      justifyContent: "space-between",
    });
    expect(flat(rows(renderer)[0].props.style({ pressed: true })).backgroundColor).toBe(colors.grouped);
  });

  it("shows the chosen option in bold with a check, and the others in medium", async () => {
    const renderer = await setup("model").mounted;
    const [make, model] = rows(renderer);

    expect(model.props.accessibilityState).toEqual({ selected: true, checked: true });
    expect(flat(model.findByType(Text).props.style).fontFamily).toBe(fonts.bold);
    expect(model.findAllByType(Svg)).toHaveLength(1);
    expect(model.findByType(Svg).props).toMatchObject({ width: 22, height: 22, strokeWidth: 2.6, stroke: colors.ink });

    expect(make.props.accessibilityState).toEqual({ selected: false, checked: false });
    expect(flat(make.findByType(Text).props.style).fontFamily).toBe(fonts.medium);
    expect(make.findAllByType(Svg)).toHaveLength(0);
  });

  it("reports the option pressed, and closes only when told", async () => {
    const { mounted, onSelect, onClose } = setup();
    const renderer = await mounted;

    rows(renderer)[2].props.onPress();

    expect(onSelect).toHaveBeenCalledWith("year");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("is a radio group, for screen readers", async () => {
    const renderer = await setup().mounted;
    const group = renderer.root.find(
      (node) => typeof node.type === "string" && node.props.accessibilityRole === "radiogroup"
    );

    expect(group.props.accessibilityLabel).toBe("Sort by");
  });

  it("shows nothing while it is closed", async () => {
    const renderer = await setup("model", false).mounted;

    expect(rows(renderer)).toHaveLength(0);
  });
});
