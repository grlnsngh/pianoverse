import React from "react";
import { act } from "react-test-renderer";
import { Pressable, StyleSheet, Text } from "react-native";
import { Segmented, Switch } from "@/components/ui";
import { colors, fonts } from "@/constants/theme";
import {
  advance,
  animatedStyles,
  hostByTestId,
  mount,
  setReduceMotion,
  textContent,
  update,
} from "./helpers/ui";

type Mounted = Awaited<ReturnType<typeof mount>>;

const flat = (style: unknown) => StyleSheet.flatten(style as any);

/** "#RRGGBB" as the "rgba(r, g, b, 1)" that Reanimated's colour interpolation returns. */
const asRgba = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, 1)`;
};
const channels = (color: string) => color.match(/[\d.]+/g)!.map(Number).slice(0, 3);

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("Switch", () => {
  const setup = (props: Partial<React.ComponentProps<typeof Switch>> = {}) => {
    const onValueChange = jest.fn();
    return {
      onValueChange,
      mounted: mount(
        <Switch
          testID="switch"
          value={false}
          onValueChange={onValueChange}
          accessibilityLabel="Overdue only"
          {...props}
        />
      ),
    };
  };
  const track = (renderer: Mounted) => animatedStyles(renderer.root)[0];
  const thumb = (renderer: Mounted) => animatedStyles(renderer.root)[1];
  const pressable = (renderer: Mounted) => renderer.root.findByType(Pressable);

  it("is a 51 x 31 track with a 27 px white thumb", async () => {
    const renderer = await setup().mounted;
    const trackView = renderer.root.findAll(
      (node) => typeof node.type === "string" && node.props.jestAnimatedStyle !== undefined
    );

    expect(flat(trackView[0].props.style)).toMatchObject({
      width: 51,
      height: 31,
      padding: 2,
      borderRadius: 15.5,
    });
    expect(flat(trackView[1].props.style)).toMatchObject({
      width: 27,
      height: 27,
      borderRadius: 13.5,
      backgroundColor: colors.white,
    });
  });

  it("is grey with the thumb on the left when off", async () => {
    const renderer = await setup({ value: false }).mounted;

    expect(track(renderer).backgroundColor).toBe(asRgba(colors.switchOff));
    expect(thumb(renderer).transform[0].translateX).toBe(0);
  });

  it("is orange with the thumb on the right when on", async () => {
    const renderer = await setup({ value: true }).mounted;

    expect(track(renderer).backgroundColor).toBe(asRgba(colors.brand));
    // 51 wide, minus 2 px padding each side, minus the 27 px thumb
    expect(thumb(renderer).transform[0].translateX).toBe(20);
  });

  it("asks for the opposite value when pressed", async () => {
    const off = setup({ value: false });
    pressable(await off.mounted).props.onPress();
    const on = setup({ value: true });
    pressable(await on.mounted).props.onPress();

    expect(off.onValueChange).toHaveBeenCalledWith(true);
    expect(on.onValueChange).toHaveBeenCalledWith(false);
  });

  it("slides the thumb and fades the colour over 200 ms", async () => {
    const { mounted } = setup({ value: false });
    const renderer = await mounted;

    await update(
      renderer,
      <Switch value onValueChange={() => {}} accessibilityLabel="Overdue only" />
    );
    await advance(100);
    const halfwayX = thumb(renderer).transform[0].translateX;
    const halfwayColour = channels(track(renderer).backgroundColor);
    expect(halfwayX).toBeGreaterThan(5);
    expect(halfwayX).toBeLessThan(20);
    // Between the grey (217) and the orange (255) in the red channel, and past the grey's blue
    expect(halfwayColour[2]).toBeLessThan(204);

    await advance(120);
    expect(thumb(renderer).transform[0].translateX).toBe(20);
    expect(track(renderer).backgroundColor).toBe(asRgba(colors.brand));
  });

  it("does not animate when it first appears", async () => {
    const renderer = await setup({ value: true }).mounted;

    // At the first frame it is already where it should be
    expect(thumb(renderer).transform[0].translateX).toBe(20);
    expect(track(renderer).backgroundColor).toBe(asRgba(colors.brand));
  });

  it("jumps, and only fades its colour over 120 ms, with reduced motion", async () => {
    setReduceMotion(true);
    const renderer = await setup({ value: false }).mounted;

    await update(
      renderer,
      <Switch value onValueChange={() => {}} accessibilityLabel="Overdue only" />
    );
    await advance(20);
    expect(thumb(renderer).transform[0].translateX).toBe(20);
    expect(channels(track(renderer).backgroundColor)[2]).toBeGreaterThan(1);

    await advance(120);
    expect(track(renderer).backgroundColor).toBe(asRgba(colors.brand));
  });

  it("is a switch that says what it controls and whether it is on", async () => {
    const on = await setup({ value: true }).mounted;
    const off = await setup({ value: false }).mounted;

    expect(pressable(on).props).toMatchObject({
      accessibilityRole: "switch",
      accessibilityLabel: "Overdue only",
      accessibilityState: { checked: true, disabled: false },
    });
    expect(pressable(off).props.accessibilityState).toMatchObject({ checked: false });
  });

  it("has a tap area of at least 44 px high", async () => {
    const renderer = await setup().mounted;
    const { top, bottom } = pressable(renderer).props.hitSlop;

    expect(31 + top + bottom).toBeGreaterThanOrEqual(44);
  });

  it("dims and ignores presses when disabled", async () => {
    const { mounted, onValueChange } = setup({ disabled: true });
    const renderer = await mounted;

    expect(pressable(renderer).props.disabled).toBe(true);
    expect(pressable(renderer).props.accessibilityState).toMatchObject({ disabled: true });
    expect(flat(pressable(renderer).props.style).opacity).toBe(0.4);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe("Segmented", () => {
  const options = [
    { value: "rentable", label: "Rentable" },
    { value: "events", label: "Events" },
    { value: "on_sale", label: "On sale" },
    { value: "warehouse", label: "Warehouse" },
  ] as const;

  const setup = (value: (typeof options)[number]["value"] = "rentable") => {
    const onChange = jest.fn();
    return {
      onChange,
      mounted: mount(
        <Segmented
          testID="seg"
          options={options}
          value={value}
          onChange={onChange}
          accessibilityLabel="Category"
        />
      ),
    };
  };
  const tabs = (renderer: Mounted) => renderer.root.findAllByType(Pressable);
  // The track is 340 wide on the tests' phone: each of the four options is 84
  const layout = async (renderer: Mounted) => {
    await act(async () => {
      hostByTestId(renderer.root, "seg").props.onLayout({ nativeEvent: { layout: { width: 340 } } });
    });
  };
  const chip = (renderer: Mounted) => hostByTestId(renderer.root, "seg-chip");

  it("is a grey track with 2 px padding and radius 10", async () => {
    const renderer = await setup().mounted;

    expect(flat(hostByTestId(renderer.root, "seg").props.style)).toMatchObject({
      flexDirection: "row",
      padding: 2,
      borderRadius: 10,
      backgroundColor: colors.hairline,
    });
  });

  it("has one 40 px high option each, sharing the width equally", async () => {
    const renderer = await setup().mounted;

    expect(tabs(renderer)).toHaveLength(4);
    for (const tab of tabs(renderer)) {
      expect(flat(tab.props.style)).toMatchObject({ flex: 1, height: 40, borderRadius: 8 });
    }
    expect(tabs(renderer).map((tab) => textContent(tab))).toEqual(
      options.map((option) => option.label)
    );
  });

  it("shows the chosen one as a white chip with a bold ink label", async () => {
    const renderer = await setup("events").mounted;
    await layout(renderer);
    await advance(20);
    const [rentable, events] = tabs(renderer);

    // The chip is one white piece behind the options, which have no fill of their own
    expect(flat(chip(renderer).props.style)).toMatchObject({
      position: "absolute",
      width: 84,
      height: 40,
      borderRadius: 8,
      backgroundColor: colors.white,
    });
    expect(animatedStyles(renderer.root)[0].transform).toEqual([{ translateX: 84 }]);
    expect(flat(events.props.style).backgroundColor).toBeUndefined();
    expect(flat(events.findByType(Text).props.style)).toMatchObject({
      fontFamily: fonts.bold,
      fontSize: 14,
      color: colors.ink,
    });
    expect(flat(rentable.props.style).backgroundColor).toBeUndefined();
    expect(flat(rentable.findByType(Text).props.style)).toMatchObject({
      fontFamily: fonts.semibold,
      color: colors.ink2,
    });
  });

  it("reports the option pressed", async () => {
    const { mounted, onChange } = setup("rentable");
    const renderer = await mounted;

    tabs(renderer)[2].props.onPress();

    expect(onChange).toHaveBeenCalledWith("on_sale");
  });

  it("says nothing when the chosen one is pressed again", async () => {
    const { mounted, onChange } = setup("events");
    const renderer = await mounted;

    tabs(renderer)[1].props.onPress();

    expect(onChange).not.toHaveBeenCalled();
  });

  it("has no chip until it knows how wide it is", async () => {
    const renderer = await setup().mounted;

    expect(renderer.root.findAll((node) => node.props.testID === "seg-chip")).toHaveLength(0);
  });

  it("slides the chip to the new option in 200 ms", async () => {
    const { mounted } = setup("rentable");
    const renderer = await mounted;
    await layout(renderer);
    expect(animatedStyles(renderer.root)[0].transform).toEqual([{ translateX: 0 }]);

    await update(
      renderer,
      <Segmented testID="seg" options={options} value="warehouse" onChange={() => {}} accessibilityLabel="Category" />
    );
    await advance(100);
    const halfway = animatedStyles(renderer.root)[0].transform[0].translateX;
    await advance(120);

    expect(halfway).toBeGreaterThan(0);
    expect(halfway).toBeLessThan(252);
    expect(animatedStyles(renderer.root)[0].transform).toEqual([{ translateX: 252 }]);
  });

  it("jumps instead of sliding with Reduce Motion on", async () => {
    setReduceMotion(true);
    const { mounted } = setup("rentable");
    const renderer = await mounted;
    await layout(renderer);

    await update(
      renderer,
      <Segmented testID="seg" options={options} value="on_sale" onChange={() => {}} accessibilityLabel="Category" />
    );
    await advance(20);

    expect(animatedStyles(renderer.root)[0].transform).toEqual([{ translateX: 168 }]);
  });

  it("is a tab list with the chosen tab selected, for screen readers", async () => {
    const renderer = await setup("events").mounted;

    expect(hostByTestId(renderer.root, "seg").props).toMatchObject({
      accessibilityRole: "tablist",
      accessibilityLabel: "Category",
    });
    expect(tabs(renderer).map((tab) => tab.props.accessibilityState.selected)).toEqual([
      false,
      true,
      false,
      false,
    ]);
    expect(tabs(renderer).map((tab) => tab.props.accessibilityRole)).toEqual(Array(4).fill("tab"));
    expect(tabs(renderer)[3].props.accessibilityLabel).toBe("Warehouse");
  });

  it("works with two options", async () => {
    const renderer = await mount(
      <Segmented
        options={[
          { value: "a", label: "Grid" },
          { value: "b", label: "List" },
        ]}
        value="a"
        onChange={() => {}}
        accessibilityLabel="Layout"
      />
    );

    expect(tabs(renderer)).toHaveLength(2);
  });
});
