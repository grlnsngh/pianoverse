jest.mock("expo-router", () => ({
  router: { canGoBack: jest.fn(() => true), back: jest.fn(), replace: jest.fn() },
}));

import React from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { act } from "react-test-renderer";
import { Provider } from "react-redux";
import { AddFlowTopBar } from "@/components/AddFlowChrome";
import BackBar from "@/components/BackBar";
import SelectionHeader from "@/components/SelectionHeader";
import StickyActionBar from "@/components/StickyActionBar";
import ToastHost from "@/components/ToastHost";
import { Badge, Dialog, IconTabs, SearchPill, Sheet, TabBar } from "@/components/ui";
import { maxScale } from "@/constants/theme";
import { resetBottomBars } from "@/lib/bottomBars";
import { setToastListener, showToast } from "@/utils/toast";
import { hostByTestId, mount, textContent } from "./helpers/ui";
import { findAllPressables } from "./helpers/pressables";
import { atFontScale, createTestStore } from "./helpers/render";

/**
 * Headers, bars and badges with a big Font size (docs/large-text/PLAN.md,
 * Batch L3): a title never runs into the buttons beside it, a bar at the
 * bottom grows and tells the toasts how tall it is, and what doesn't fit
 * side by side stacks or scrolls. At 100% each is as drawn.
 */

type Mounted = Awaited<ReturnType<typeof mount>>;
const flat = (style: unknown) => StyleSheet.flatten(style as any);
const withInsets = (children: React.ReactNode, bottom = 34) => (
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 47, left: 0, right: 0, bottom },
    }}
  >
    {children}
  </SafeAreaProvider>
);
const texts = (renderer: Mounted) => renderer.root.findAllByType(Text);
const textNode = (renderer: Mounted, content: string) =>
  renderer.root.findAllByType(Text).find((text) => textContent(text) === content)!;
const hiddenCopies = (renderer: Mounted, content: string) =>
  renderer.root.findAll(
    (node) =>
      (node.type as unknown) === "View" &&
      node.props.accessibilityElementsHidden === true &&
      textContent(node) === content
  );
const layout = (node: { props: any }, height: number) =>
  act(() => node.props.onLayout({ nativeEvent: { layout: { width: 390, height } } }));

afterEach(() => {
  resetBottomBars();
  setToastListener(null);
});

describe("a sheet's title row", () => {
  const open = (title = "Record payment") =>
    mount(
      withInsets(
        <Sheet visible title={title} onClose={() => {}}>
          <Text>Body</Text>
        </Sheet>
      )
    );

  it("has Cancel at the left, the title between, and an unseen copy of Cancel at the right to keep it centred", async () => {
    const renderer = await open();
    const title = flat(textNode(renderer, "Record payment").props.style);

    expect(title).toMatchObject({ flex: 1, textAlign: "center" });
    expect(hiddenCopies(renderer, "Cancel")).toHaveLength(1);
    // The title row is the least it was drawn: a 44 button with 4 above and below
    const row = textNode(renderer, "Record payment").parent!;
    expect(flat(row.props.style)).toMatchObject({ minHeight: 52, flexDirection: "row", alignItems: "center" });
    expect(flat(row.props.style).height).toBeUndefined();
  });

  it("limits how big the title and the button grow", async () => {
    const renderer = await open();

    expect(textNode(renderer, "Record payment").props.maxFontSizeMultiplier).toBe(maxScale.section);
    expect(textNode(renderer, "Cancel").props.maxFontSizeMultiplier).toBe(maxScale.section);
  });

  it("keeps the real Cancel button the only one a screen reader finds", async () => {
    const renderer = await open();

    expect(findAllPressables(renderer.root).filter((p) => p.props.accessibilityLabel === "Cancel")).toHaveLength(1);
  });
});

describe("the Add and Edit piano top bar", () => {
  it("is laid out the same way: Cancel, a title that may wrap, and an unseen copy of Cancel", async () => {
    const renderer = await mount(<AddFlowTopBar onCancel={() => {}} title="Edit piano" />);

    expect(flat(textNode(renderer, "Edit piano").props.style)).toMatchObject({ flex: 1, textAlign: "center" });
    expect(textNode(renderer, "Edit piano").props.maxFontSizeMultiplier).toBe(maxScale.section);
    expect(hiddenCopies(renderer, "Cancel")).toHaveLength(1);
    expect(flat(textNode(renderer, "Edit piano").parent!.props.style).height).toBeUndefined();
  });
});

describe("BackBar", () => {
  it("lets a long title take two lines, and is at least 56 high", async () => {
    const renderer = await mount(<BackBar title="Rental agreement (private person)" fallback="/paper-forms" />);
    const title = textNode(renderer, "Rental agreement (private person)");

    expect(title.props.numberOfLines).toBe(2);
    expect(title.props.maxFontSizeMultiplier).toBe(maxScale.section);
    expect(flat(title.parent!.props.style)).toMatchObject({ minHeight: 56 });
  });
});

describe("the select-mode header", () => {
  const open = () => {
    const store = createTestStore({ items: [] });
    return mount(
      <Provider store={store}>
        <SelectionHeader />
      </Provider>
    );
  };

  it("lays the title over the middle of the bar at 100%, as drawn", async () => {
    const renderer = await open();
    const wrap = textNode(renderer, "0 selected").parent!;

    expect(flat(wrap.props.style)).toMatchObject({ position: "absolute", left: 0, right: 0 });
  });

  describe("at 150%", () => {
    atFontScale(1.5);

    it("puts the title between the two buttons so it can't run into them, and lets it wrap", async () => {
      const renderer = await open();
      const wrap = flat(textNode(renderer, "0 selected").parent!.props.style);

      expect(wrap.position).toBe("relative");
      expect(wrap.flex).toBe(1);
      expect(wrap.height).toBeUndefined();
      expect(flat(textNode(renderer, "0 selected").props.style).textAlign).toBe("center");
      expect(textNode(renderer, "0 selected").props.maxFontSizeMultiplier).toBe(maxScale.section);
    });
  });
});

describe("the tab bar", () => {
  const TABS = [
    { key: "today", label: "Today", icon: "tabToday" },
    { key: "pianos", label: "Pianos", icon: "tabPianos" },
  ] as const;
  const open = (bottom = 34) =>
    mount(withInsets(<TabBar testID="bar" tabs={TABS} active="today" onSelect={() => {}} />, bottom));

  it("is at least 84 high and no more than that at 100%: the tabs' own 51 plus 33 leaves the 84 as drawn", async () => {
    const renderer = await open();
    const style = flat(hostByTestId(renderer.root, "bar").props.style);

    expect(style.minHeight).toBe(84);
    expect(style.height).toBeUndefined();
    // 8 above + 26 icon + 3 + 14 label = 51, so 33 below keeps the bar at 84
    expect(style.paddingBottom).toBe(33);
  });

  it("limits the labels to 150% so they stay in the bar", async () => {
    const renderer = await open();

    expect(textNode(renderer, "Today").props.maxFontSizeMultiplier).toBe(maxScale.tabLabel);
  });
});

/** A tab bar and a sticky bar, either of which may be there, and the toasts above them. Same shape each time, so the toast host stays mounted. */
const Screen = ({ tabs, sticky }: { tabs: boolean; sticky: boolean }) => (
  <View>
    {tabs && <TabBar testID="bar" tabs={[{ key: "today", label: "Today", icon: "tabToday" }]} active="today" onSelect={() => {}} />}
    {sticky && <StickyActionBar info={{ amount: "₹4,000", caption: "Overdue", tone: "late" }} label="Record payment" onPress={() => {}} />}
    <ToastHost />
  </View>
);

describe("a toast above the bars", () => {
  const open = (extra: React.ReactNode = null) =>
    mount(
      withInsets(
        <View>
          <TabBar testID="bar" tabs={[{ key: "today", label: "Today", icon: "tabToday" }]} active="today" onSelect={() => {}} />
          {extra}
          <ToastHost />
        </View>
      )
    );
  const toastBottom = (renderer: Mounted) =>
    flat(
      renderer.root.find((node) => typeof node.type === "string" && node.props.accessibilityLiveRegion === "polite").props.style
    ).bottom;

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("sits 12 above the bar as drawn until the bar has been measured", async () => {
    const renderer = await open();
    await act(async () => showToast("Saved"));

    expect(toastBottom(renderer)).toBe(34 + 50 + 12);
  });

  it("sits 12 above the bar as tall as the bar says it is", async () => {
    const renderer = await open();
    layout(hostByTestId(renderer.root, "bar"), 120);
    await act(async () => showToast("Saved"));

    expect(toastBottom(renderer)).toBe(120 + 12);
  });

  it("follows the bar when it grows while the toast is on screen", async () => {
    const renderer = await open();
    await act(async () => showToast("Saved"));
    layout(hostByTestId(renderer.root, "bar"), 150);

    expect(toastBottom(renderer)).toBe(150 + 12);
  });

  it("follows the bar in front, and goes back to the one under it when that one leaves", async () => {
    const renderer = await mount(withInsets(<Screen tabs sticky />));
    layout(hostByTestId(renderer.root, "bar"), 90);
    layout(hostByTestId(renderer.root, "sticky-action-bar"), 140);
    await act(async () => showToast("Saved"));
    expect(toastBottom(renderer)).toBe(140 + 12);

    await act(async () => renderer.update(withInsets(<Screen tabs sticky={false} />)));
    expect(toastBottom(renderer)).toBe(90 + 12);

    await act(async () => renderer.update(withInsets(<Screen tabs={false} sticky={false} />)));
    expect(toastBottom(renderer)).toBe(34 + 50 + 12);
  });
});


describe("the sticky bar on a piano's page", () => {
  const info = { amount: "₹4,500", caption: "Overdue · 18 days", tone: "late" as const };
  const open = () =>
    mount(withInsets(<StickyActionBar info={info} label="Record payment" onPress={() => {}} />));
  const bar = (renderer: Mounted) => flat(hostByTestId(renderer.root, "sticky-action-bar").props.style);

  it("is a row at least 84 high at 100%, the amount beside the button", async () => {
    const renderer = await open();

    expect(bar(renderer)).toMatchObject({ minHeight: 84, paddingBottom: 34 });
    expect(bar(renderer).height).toBeUndefined();
    expect(bar(renderer).flexDirection).toBe("row");
    expect(textNode(renderer, "Overdue · 18 days").props.numberOfLines).toBe(1);
  });

  describe("at 150%", () => {
    atFontScale(1.5);

    it("puts the amount above a full-width button, with room around them", async () => {
      const renderer = await open();

      expect(bar(renderer)).toMatchObject({ flexDirection: "column", alignItems: "stretch", minHeight: 84 });
      expect(bar(renderer).paddingBottom).toBe(34 + 12);
      expect(bar(renderer).paddingTop).toBe(12);
    });

    it("lets the line under the amount take two lines", async () => {
      const renderer = await open();

      expect(textNode(renderer, "Overdue · 18 days").props.numberOfLines).toBe(2);
    });
  });
});

describe("the category tabs", () => {
  const TABS = [
    { key: "all", label: "All", icon: "categoryAll" },
    { key: "rentable", label: "Rentable", icon: "categoryRentable" },
    { key: "warehouse", label: "Warehouse", icon: "categoryWarehouse" },
  ] as const;
  const open = (onSelect = jest.fn()) =>
    mount(<IconTabs testID="tabs" tabs={TABS} active="all" onSelect={onSelect} accessibilityLabel="Category" />);

  it("shares the width equally at 100%, in a plain row", async () => {
    const renderer = await open();

    expect(renderer.root.findAllByType(ScrollView)).toHaveLength(0);
    for (const tab of findAllPressables(renderer.root)) expect(flat(tab.props.style).flex).toBe(1);
  });

  describe("at 150%", () => {
    atFontScale(1.5);

    it("scrolls sideways, each tab as wide as its label, so no label is cut", async () => {
      const renderer = await open();
      const scroll = renderer.root.findByType(ScrollView);

      expect(scroll.props.horizontal).toBe(true);
      expect(scroll.props.accessibilityRole).toBe("tablist");
      expect(flat(scroll.props.contentContainerStyle)).toMatchObject({ flexDirection: "row", flexGrow: 1, borderBottomWidth: 1 });
      for (const tab of findAllPressables(renderer.root)) {
        expect(flat(tab.props.style)).toMatchObject({ flex: 0, paddingHorizontal: 14 });
      }
      expect(findAllPressables(renderer.root).map(textContent)).toEqual(["All", "Rentable", "Warehouse"]);
    });

    it("still chooses a category when its tab is pressed", async () => {
      const onSelect = jest.fn();
      const renderer = await open(onSelect);

      findAllPressables(renderer.root)[2].props.onPress();

      expect(onSelect).toHaveBeenCalledWith("warehouse");
    });
  });
});

describe("the search pill", () => {
  const open = (filterCount = 2) => mount(<SearchPill testID="pill" onPress={() => {}} onFilterPress={() => {}} filterCount={filterCount} />);

  it("is at least 52 high and as round as it is high, with both lines of words, at 100%", async () => {
    const renderer = await open();
    const style = flat(hostByTestId(renderer.root, "pill").props.style);

    expect(style).toMatchObject({ minHeight: 52, borderRadius: 999 });
    expect(style.height).toBeUndefined();
    expect(textContent(textNode(renderer, "Search pianos"))).toBe("Search pianos");
    expect(textNode(renderer, "Title, make or customer")).toBeTruthy();
  });

  it("limits the number on the filter button", async () => {
    const renderer = await open();

    expect(textNode(renderer, "2").props.maxFontSizeMultiplier).toBe(maxScale.count);
  });

  describe("at 150%", () => {
    atFontScale(1.5);

    it("drops the second line, which the button's hint says anyway, so the title has the room", async () => {
      const renderer = await open();

      expect(renderer.root.findAllByType(Text).some((text) => textContent(text) === "Title, make or customer")).toBe(false);
      const search = findAllPressables(renderer.root).find((p) => p.props.accessibilityLabel === "Search pianos")!;
      expect(search.props.accessibilityHint).toBe("Title, make or customer");
    });
  });
});

describe("the badge on a photo", () => {
  const open = () => mount(<Badge onPhoto tone="late" label="Overdue · 18 days" />);
  // The number and its unit are held together, so a second line starts at "18 days"
  const NBSP = String.fromCharCode(160);

  it("limits how big its words grow, and sits at the corner as drawn at 100%", async () => {
    const renderer = await open();
    const text = textNode(renderer, "Overdue · 18 days");

    expect(text.props.maxFontSizeMultiplier).toBe(maxScale.badge);
    expect(text.props.numberOfLines).toBeUndefined();
    expect(flat(text.parent!.props.style).maxWidth).toBeUndefined();
  });

  describe("at 150%", () => {
    atFontScale(1.5);

    it("keeps clear of the category circle at the other corner, its words taking a second line", async () => {
      const renderer = await open();
      const text = textNode(renderer, `Overdue · 18${NBSP}days`);

      expect(text.props.numberOfLines).toBe(2);
      expect(flat(text.parent!.props.style)).toMatchObject({ maxWidth: "65%", position: "absolute", left: 8 });
      expect(flat(text.props.style).flexShrink).toBe(1);
    });

    it("can't break between the number and its unit (\"18 / days\"), and is still read out whole", async () => {
      const renderer = await open();

      expect(texts(renderer).some((text) => textContent(text) === `Overdue · 18${NBSP}days`)).toBe(true);
      expect(texts(renderer).some((text) => textContent(text) === "Overdue · 18 days")).toBe(false);
      const view = renderer.root.find((node) => (node.type as unknown) === "View" && node.props.accessibilityLabel === "Overdue · 18 days");
      expect(view).toBeTruthy();
    });
  });
});

describe("a dialog", () => {
  const open = () =>
    mount(
      <Dialog
        visible
        testID="dialog"
        title="Delete Young Chang U-121?"
        message="This removes the piano, its photos and its payments. This can’t be undone."
        actions={[
          { label: "Delete", tone: "destructive", onPress: () => {} },
          { label: "Cancel", onPress: () => {} },
        ]}
      />
    );
  const card = (renderer: Mounted) => flat(hostByTestId(renderer.root, "dialog-card").props.style);

  it("is 284 wide as drawn, on a screen wide enough", async () => {
    const renderer = await open();

    expect(card(renderer).width).toBe(284);
  });

  it("is never wider than the screen less 20 each side, however large the Screen zoom", async () => {
    const original = Dimensions.get("window");
    Dimensions.set({ window: { ...original, width: 300 }, screen: { ...original, width: 300 } });
    try {
      const renderer = await open();

      expect(card(renderer).width).toBe(260);
    } finally {
      Dimensions.set({ window: original, screen: original });
    }
  });

  it("never takes more than 90% of the screen, and scrolls its words rather than push the choices off it", async () => {
    const renderer = await open();

    expect(card(renderer).maxHeight).toBeCloseTo(Dimensions.get("window").height * 0.9);
    const scroll = renderer.root.findByType(ScrollView);
    expect(textContent(scroll)).toContain("Delete Young Chang U-121?");
    expect(textContent(scroll)).not.toContain("Cancel");
  });

  it("limits its title and lets a choice wrap, at least 52 high", async () => {
    const renderer = await open();

    expect(textNode(renderer, "Delete Young Chang U-121?").props.maxFontSizeMultiplier).toBe(maxScale.section);
    const row = findAllPressables(renderer.root)[0];
    expect(flat(row.props.style({ pressed: false }))).toMatchObject({ minHeight: 52, paddingVertical: 8 });
  });
});
