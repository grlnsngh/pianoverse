import React from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";
import Svg, { Path } from "react-native-svg";
import { act } from "react-test-renderer";
import { Field } from "@/components/ui";
import { ICONS } from "@/components/ui/Icon";
import { colors, fonts, radii } from "@/constants/theme";
import { hostByTestId, mount, textContent } from "./helpers/ui";

type Mounted = Awaited<ReturnType<typeof mount>>;
type Props = Partial<React.ComponentProps<typeof Field>>;

const setup = async (props: Props = {}) =>
  mount(<Field label="Email" value="" onChangeText={() => {}} {...props} />);

const input = (renderer: Mounted) => renderer.root.findByType(TextInput);
const ring = (renderer: Mounted) =>
  StyleSheet.flatten(hostByTestId(renderer.root, "field-ring").props.style);
const box = (renderer: Mounted) =>
  StyleSheet.flatten(renderer.root.findAllByType(Pressable)[0].props.style);
const focus = (renderer: Mounted) => act(() => input(renderer).props.onFocus({}));
const blur = (renderer: Mounted) => act(() => input(renderer).props.onBlur({}));

describe("Field at rest", () => {
  it("is 60 high with a 1 px grey outline and radius 12", async () => {
    const renderer = await setup();

    expect(box(renderer)).toMatchObject({ height: 60, borderRadius: radii.input });
    expect(ring(renderer)).toMatchObject({
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
    });
  });

  it("has its label inside at the top, 12 px medium grey", async () => {
    const renderer = await setup();
    const label = renderer.root.findAllByType(Text)[0];

    expect(textContent(label)).toBe("Email");
    expect(StyleSheet.flatten(label.props.style)).toMatchObject({
      fontFamily: fonts.medium,
      fontSize: 12,
      lineHeight: 16,
      color: colors.ink2,
    });
  });

  it("has a 16 px medium value below the label, and a grey placeholder", async () => {
    const renderer = await setup({ placeholder: "you@example.com" });

    expect(StyleSheet.flatten(input(renderer).props.style)).toMatchObject({
      fontFamily: fonts.medium,
      fontSize: 16,
      height: 28,
      color: colors.ink,
    });
    expect(input(renderer).props.placeholderTextColor).toBe(colors.ink3);
    expect(input(renderer).props.placeholder).toBe("you@example.com");
  });

  it("passes the usual text input props through", async () => {
    const onChangeText = jest.fn();
    const renderer = await setup({
      value: "a@b.co",
      onChangeText,
      keyboardType: "email-address",
      autoCapitalize: "none",
      autoComplete: "email",
    });

    expect(input(renderer).props).toMatchObject({
      value: "a@b.co",
      keyboardType: "email-address",
      autoCapitalize: "none",
      autoComplete: "email",
    });
    input(renderer).props.onChangeText("x");
    expect(onChangeText).toHaveBeenCalledWith("x");
  });

  it("is read out by its label", async () => {
    const renderer = await setup();

    expect(input(renderer).props.accessibilityLabel).toBe("Email");
  });
});

describe("Field focus", () => {
  it("draws a 2 px ink ring while it is being typed in", async () => {
    const renderer = await setup();

    focus(renderer);
    expect(ring(renderer)).toMatchObject({ borderWidth: 2, borderColor: colors.ink });

    blur(renderer);
    expect(ring(renderer)).toMatchObject({ borderWidth: 1, borderColor: colors.inputBorder });
  });

  it("still tells the screen about focus and blur", async () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const renderer = await setup({ onFocus, onBlur });

    focus(renderer);
    blur(renderer);

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("draws the ring over the field, so the text doesn't move when it thickens", async () => {
    const renderer = await setup();
    const before = StyleSheet.flatten(renderer.root.findAllByType(Pressable)[0].props.style);
    focus(renderer);
    const after = StyleSheet.flatten(renderer.root.findAllByType(Pressable)[0].props.style);

    // Padding and border of the field itself are the same focused or not
    expect(after).toEqual(before);
    expect(hostByTestId(renderer.root, "field-ring").props.pointerEvents).toBe("none");
  });

  it("focuses the input when the label or the empty space is tapped", async () => {
    const renderer = await setup();
    const focusSpy = jest.fn();
    // The test renderer has no native input, so give the ref something to call
    (input(renderer).instance as any).focus = focusSpy;

    renderer.root.findAllByType(Pressable)[0].props.onPress();

    expect(focusSpy).toHaveBeenCalled();
  });
});

describe("Field error", () => {
  const error = "Enter a valid email address.";

  it("turns the ring and the label red, 2 px", async () => {
    const renderer = await setup({ error });

    expect(ring(renderer)).toMatchObject({ borderWidth: 2, borderColor: colors.late });
    expect(StyleSheet.flatten(renderer.root.findAllByType(Text)[0].props.style).color).toBe(
      colors.late
    );
  });

  it("puts the message under the field with an alert icon", async () => {
    const renderer = await setup({ error });
    const texts = renderer.root.findAllByType(Text).map(textContent);
    const message = renderer.root.findAllByType(Text).find((t) => textContent(t) === error)!;

    expect(texts).toEqual(["Email", error]);
    expect(StyleSheet.flatten(message.props.style)).toMatchObject({
      fontFamily: fonts.medium,
      fontSize: 13,
      lineHeight: 18,
      color: colors.late,
    });
    const svg = renderer.root.findByType(Svg);
    expect(svg.props).toMatchObject({ width: 14, height: 14, stroke: colors.late, strokeWidth: 2.4 });
    expect(renderer.root.findAllByType(Path)[0].props.d).toBe(ICONS.alert[1].d);
  });

  it("stays red while focused", async () => {
    const renderer = await setup({ error });

    focus(renderer);

    expect(ring(renderer)).toMatchObject({ borderColor: colors.late, borderWidth: 2 });
  });

  it("is announced when it appears, and read with the field", async () => {
    const renderer = await setup({ error });
    const row = renderer.root.find(
      (node) => typeof node.type === "string" && node.props.accessibilityLiveRegion === "polite"
    );

    expect(row).toBeTruthy();
    expect(input(renderer).props.accessibilityHint).toBe(error);
  });

  it("has no message or icon without an error", async () => {
    const renderer = await setup();

    expect(renderer.root.findAllByType(Svg)).toHaveLength(0);
    expect(renderer.root.findAllByType(Text).map(textContent)).toEqual(["Email"]);
  });

  it("goes back to normal when the error is cleared", async () => {
    const renderer = await setup({ error });
    await act(async () =>
      renderer.update(<Field label="Email" value="a@b.co" onChangeText={() => {}} />)
    );

    expect(ring(renderer)).toMatchObject({ borderWidth: 1, borderColor: colors.inputBorder });
    expect(renderer.root.findAllByType(Svg)).toHaveLength(0);
  });
});

describe("Field disabled", () => {
  it("has a grouped fill and can't be edited", async () => {
    const renderer = await setup({ disabled: true });

    expect(box(renderer).backgroundColor).toBe(colors.grouped);
    expect(input(renderer).props.editable).toBe(false);
    expect(renderer.root.findAllByType(Pressable)[0].props.disabled).toBe(true);
  });

  it("is editable otherwise", async () => {
    const renderer = await setup();

    expect(input(renderer).props.editable).toBe(true);
  });
});

describe("Field with a password", () => {
  const passwordField = () => setup({ label: "Password", secureTextEntry: true });
  const toggle = (renderer: Mounted) => renderer.root.findAllByType(Pressable)[1];

  it("hides what is typed, and offers to Show it", async () => {
    const renderer = await passwordField();

    expect(input(renderer).props.secureTextEntry).toBe(true);
    expect(textContent(toggle(renderer))).toBe("Show");
    expect(toggle(renderer).props.accessibilityLabel).toBe("Show password");
    expect(toggle(renderer).props.accessibilityRole).toBe("button");
  });

  it("shows the password when Show is pressed, and hides it again with Hide", async () => {
    const renderer = await passwordField();

    act(() => toggle(renderer).props.onPress());
    expect(input(renderer).props.secureTextEntry).toBe(false);
    expect(textContent(toggle(renderer))).toBe("Hide");
    expect(toggle(renderer).props.accessibilityLabel).toBe("Hide password");

    act(() => toggle(renderer).props.onPress());
    expect(input(renderer).props.secureTextEntry).toBe(true);
    expect(textContent(toggle(renderer))).toBe("Show");
  });

  it("draws the toggle 14 px bold and underlined, in a 44 px high target", async () => {
    const renderer = await passwordField();

    expect(StyleSheet.flatten(toggle(renderer).props.style)).toMatchObject({ height: 44 });
    expect(StyleSheet.flatten(toggle(renderer).findByType(Text).props.style)).toMatchObject({
      fontFamily: fonts.bold,
      fontSize: 14,
      textDecorationLine: "underline",
    });
  });

  it("makes room for the toggle at the right edge", async () => {
    const renderer = await passwordField();

    expect(box(renderer).paddingRight).toBe(4);
  });

  it("has no toggle on an ordinary field", async () => {
    const renderer = await setup();

    expect(renderer.root.findAllByType(Pressable)).toHaveLength(1);
    expect(box(renderer).paddingRight).toBe(16);
  });
});

describe("Field ref", () => {
  it("gives the screen the input, so it can move focus to the next field", async () => {
    const ref = React.createRef<TextInput>();
    const renderer = await mount(
      <Field ref={ref} label="Email" value="" onChangeText={() => {}} />
    );

    expect(ref.current).toBe(input(renderer).instance);
  });

  it("works with a callback ref too", async () => {
    const received: unknown[] = [];
    await mount(
      <Field ref={(node) => received.push(node)} label="Email" value="" onChangeText={() => {}} />
    );

    expect(received.filter(Boolean)).toHaveLength(1);
  });
});
