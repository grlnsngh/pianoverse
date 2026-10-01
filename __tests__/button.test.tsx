import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { ReactTestRenderer } from "react-test-renderer";
import { Button } from "@/components/ui";
import Spinner from "@/components/ui/Spinner";
import { lightColors as colors, fonts } from "@/constants/theme";
import { findAllMemo, mount } from "./helpers/ui";

type Props = Partial<React.ComponentProps<typeof Button>>;

const setup = async (props: Props = {}) => {
  const onPress = jest.fn();
  const renderer = await mount(
    <Button title="Save payment" onPress={onPress} {...props} />
  );
  return { renderer, onPress };
};

const pressableOf = (renderer: ReactTestRenderer) =>
  renderer.root.findByType(Pressable);
const styleOf = (renderer: ReactTestRenderer, pressed = false) =>
  StyleSheet.flatten(pressableOf(renderer).props.style({ pressed }));
const spinnersOf = (renderer: ReactTestRenderer) =>
  findAllMemo(renderer.root, Spinner);
const labelStyle = (renderer: ReactTestRenderer) =>
  StyleSheet.flatten(renderer.root.findByType(Text).props.style);

describe("Button looks", () => {
  it("is a primary button by default: orange, ink label, 52 high, radius 14", async () => {
    const { renderer } = await setup();

    expect(styleOf(renderer)).toMatchObject({
      backgroundColor: colors.brand,
      height: 52,
      borderRadius: 14,
    });
    expect(labelStyle(renderer)).toMatchObject({
      color: colors.ink,
      fontFamily: fonts.bold,
      fontSize: 16,
    });
    expect(renderer.root.findByType(Text).props.children).toBe("Save payment");
  });

  it("is 48 high when compact, for a sticky bar", async () => {
    const { renderer } = await setup({ size: "compact" });

    expect(styleOf(renderer).height).toBe(48);
  });

  it("has a grey secondary button", async () => {
    const { renderer } = await setup({ variant: "secondary" });

    expect(styleOf(renderer)).toMatchObject({ backgroundColor: colors.fill, borderRadius: 14 });
    expect(labelStyle(renderer)).toMatchObject({ color: colors.ink, fontFamily: fonts.bold });
  });

  it("has an outline button with a 1 px ink border, radius 12 and a lighter label", async () => {
    const { renderer } = await setup({ variant: "outline" });

    expect(styleOf(renderer)).toMatchObject({
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.ink,
      borderRadius: 12,
    });
    expect(labelStyle(renderer).fontFamily).toBe(fonts.semibold);
  });

  it("has a red destructive button with a white label", async () => {
    const { renderer } = await setup({ variant: "destructive" });

    expect(styleOf(renderer)).toMatchObject({ backgroundColor: colors.late });
    expect(labelStyle(renderer)).toMatchObject({ color: colors.white, fontFamily: fonts.bold });
  });

  it("has a text button with no fill, in ink or in orange", async () => {
    const ink = await setup({ variant: "text" });
    const brand = await setup({ variant: "text", tone: "brand" });

    expect(styleOf(ink.renderer).backgroundColor).toBe("transparent");
    expect(labelStyle(ink.renderer)).toMatchObject({ color: colors.ink, fontFamily: fonts.semibold });
    expect(labelStyle(brand.renderer).color).toBe(colors.brandText);
  });

  it("lets the screen decide its width", async () => {
    const { renderer } = await setup({ style: { flex: 1 } });

    expect(styleOf(renderer).flex).toBe(1);
  });
});

describe("Button when pressed", () => {
  it("darkens and shrinks to 0.98", async () => {
    const { renderer } = await setup();

    expect(styleOf(renderer, true)).toMatchObject({
      backgroundColor: colors.brandPressed,
      transform: [{ scale: 0.98 }],
    });
    expect(styleOf(renderer, false).transform).toBeUndefined();
  });

  it.each([
    ["secondary", colors.fillPressed],
    ["destructive", colors.latePressed],
    ["outline", colors.grouped],
  ] as const)("darkens a %s button", async (variant, fill) => {
    const { renderer } = await setup({ variant });

    expect(styleOf(renderer, true)).toMatchObject({
      backgroundColor: fill,
      transform: [{ scale: 0.98 }],
    });
  });

  it("dims a text button instead of shrinking it", async () => {
    const { renderer } = await setup({ variant: "text" });

    expect(styleOf(renderer, true)).toMatchObject({ opacity: 0.5 });
    expect(styleOf(renderer, true).transform).toBeUndefined();
  });

  it("calls onPress", async () => {
    const { renderer, onPress } = await setup();

    pressableOf(renderer).props.onPress();

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("Button disabled", () => {
  it("greys out, and can't be pressed", async () => {
    const { renderer } = await setup({ disabled: true });
    const pressable = pressableOf(renderer);

    expect(styleOf(renderer)).toMatchObject({ backgroundColor: colors.disabledFill });
    expect(labelStyle(renderer).color).toBe(colors.disabledText);
    expect(pressable.props.disabled).toBe(true);
    expect(pressable.props.onPress).toBeUndefined();
    expect(pressable.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it("doesn't darken or shrink when pressed", async () => {
    const { renderer } = await setup({ disabled: true });

    expect(styleOf(renderer, true)).toMatchObject({ backgroundColor: colors.disabledFill });
    expect(styleOf(renderer, true).transform).toBeUndefined();
  });

  it("keeps an outline button's outline, but softer", async () => {
    const { renderer } = await setup({ variant: "outline", disabled: true });

    expect(styleOf(renderer)).toMatchObject({
      backgroundColor: "transparent",
      borderColor: colors.controlBorder,
    });
    expect(labelStyle(renderer).color).toBe(colors.disabledText);
  });
});

describe("Button loading", () => {
  it("shows a spinner and the loading label", async () => {
    const { renderer } = await setup({ loading: true, loadingTitle: "Saving" });

    expect(spinnersOf(renderer)).toHaveLength(1);
    expect(spinnersOf(renderer)[0].props.size).toBe(18);
    expect(renderer.root.findByType(Text).props.children).toBe("Saving");
  });

  it("keeps its own label when no loading label is given", async () => {
    const { renderer } = await setup({ loading: true });

    expect(renderer.root.findByType(Text).props.children).toBe("Save payment");
  });

  it("has no spinner when it isn't loading", async () => {
    const { renderer } = await setup();

    expect(spinnersOf(renderer)).toHaveLength(0);
  });

  it("can't be pressed, and says it is busy", async () => {
    const { renderer } = await setup({ loading: true });
    const pressable = pressableOf(renderer);

    expect(pressable.props.disabled).toBe(true);
    expect(pressable.props.onPress).toBeUndefined();
    expect(pressable.props.accessibilityState).toEqual({ disabled: true, busy: true });
  });

  it("keeps its colours, instead of greying out like a disabled button", async () => {
    const { renderer } = await setup({ loading: true });

    expect(styleOf(renderer)).toMatchObject({ backgroundColor: colors.brand });
    expect(labelStyle(renderer).color).toBe(colors.ink);
  });

  it("keeps the width it had, so a shorter label doesn't shrink it", async () => {
    const { renderer } = await setup();
    const layout = (width: number) => ({ nativeEvent: { layout: { width, height: 52, x: 0, y: 0 } } });

    pressableOf(renderer).props.onLayout(layout(148));
    expect(styleOf(renderer).minWidth).toBeUndefined();

    renderer.update(<Button title="Save payment" loadingTitle="Saving" loading onPress={() => {}} />);
    expect(styleOf(renderer).minWidth).toBe(148);

    // Its width changing while it loads doesn't move the floor
    pressableOf(renderer).props.onLayout(layout(120));
    expect(styleOf(renderer).minWidth).toBe(148);
  });

  it("uses white on a red button", async () => {
    const { renderer } = await setup({ variant: "destructive", loading: true });

    expect(spinnersOf(renderer)[0].props.color).toBe(colors.white);
  });
});

describe("Button for screen readers", () => {
  it("is a button that reads its label", async () => {
    const { renderer } = await setup();

    expect(pressableOf(renderer).props).toMatchObject({
      accessibilityRole: "button",
      accessibilityLabel: "Save payment",
    });
  });

  it("reads the loading label while it loads", async () => {
    const { renderer } = await setup({ loading: true, loadingTitle: "Saving" });

    expect(pressableOf(renderer).props.accessibilityLabel).toBe("Saving");
  });

  it("takes a different label", async () => {
    const { renderer } = await setup({ accessibilityLabel: "Record rent payment" });

    expect(pressableOf(renderer).props.accessibilityLabel).toBe("Record rent payment");
  });

  it("hides the spinner, since the label already says what is happening", async () => {
    const { renderer } = await setup({ loading: true });

    expect(spinnersOf(renderer)[0].props.decorative).toBe(true);
  });
});
