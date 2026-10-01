import React from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";
import Svg, { Path } from "react-native-svg";
import { FormRow, Group } from "@/components/ui";
import { ICONS } from "@/components/ui/Icon";
import { lightColors as colors, fonts } from "@/constants/theme";
import { ReactTestInstance } from "react-test-renderer";
import { hostByTestId, mount, textContent } from "./helpers/ui";

type Mounted = Awaited<ReturnType<typeof mount>>;

const flat = (style: unknown) => StyleSheet.flatten(style as any);
const texts = (renderer: Mounted) => renderer.root.findAllByType(Text);
const row = (renderer: Mounted) => hostByTestId(renderer.root, "row");
const rowStyle = (renderer: Mounted) => flat(row(renderer).props.style);
const textStyle = (renderer: Mounted, content: string) =>
  flat(texts(renderer).find((text) => textContent(text) === content)!.props.style);

describe("Group", () => {
  const three = (
    <>
      <FormRow label="Title" value="Schumann S-110" />
      <FormRow label="Make" value="Schumann" />
      <FormRow label="Company" value="Kirpalsons" />
    </>
  );

  it("is a white panel with radius 16 that clips its rows", async () => {
    const renderer = await mount(<Group testID="g">{three}</Group>);

    expect(flat(hostByTestId(renderer.root, "g-panel").props.style)).toMatchObject({
      backgroundColor: colors.white,
      borderRadius: 16,
      overflow: "hidden",
    });
  });

  it("can have the larger radius of the cards on Account and Detail", async () => {
    const renderer = await mount(
      <Group testID="g" radius="panel">
        {three}
      </Group>
    );

    expect(flat(hostByTestId(renderer.root, "g-panel").props.style).borderRadius).toBe(20);
  });

  it("draws a hairline between rows, but not above the first or below the last", async () => {
    const renderer = await mount(<Group testID="g">{three}</Group>);
    const panel = hostByTestId(renderer.root, "g-panel");
    const parts = panel.children
      .filter((child): child is ReactTestInstance => typeof child !== "string")
      .map((child) => (child.props.style && flat(child.props.style).height === 1 ? child : "row"));

    expect(parts.map((part) => (part === "row" ? "row" : "line"))).toEqual([
      "row",
      "line",
      "row",
      "line",
      "row",
    ]);
    for (const part of parts) {
      if (part === "row") continue;
      expect(flat(part.props.style)).toMatchObject({ height: 1, backgroundColor: colors.hairline });
    }
  });

  it("counts rows wrapped in a fragment, even nested, as rows of the group", async () => {
    const renderer = await mount(
      <Group testID="g">
        <>
          <FormRow label="A" value="1" />
          <>
            <FormRow label="B" value="2" />
            {false}
            <FormRow label="C" value="3" />
          </>
        </>
        <FormRow label="D" value="4" />
      </Group>
    );
    const panel = hostByTestId(renderer.root, "g-panel");
    const lines = panel.children.filter(
      (child): child is ReactTestInstance =>
        typeof child !== "string" && flat(child.props.style)?.height === 1
    );

    expect(texts(renderer).map(textContent)).toEqual(["A", "1", "B", "2", "C", "3", "D", "4"]);
    expect(lines).toHaveLength(3);
  });

  it("has no line for a single row", async () => {
    const renderer = await mount(
      <Group testID="g">
        <FormRow label="Title" value="Schumann" />
      </Group>
    );

    expect(hostByTestId(renderer.root, "g-panel").children).toHaveLength(1);
  });

  it("skips rows that are left out", async () => {
    const show = false;
    const renderer = await mount(
      <Group testID="g">
        <FormRow label="Title" value="A" />
        {show && <FormRow label="Hidden" value="B" />}
        {null}
        <FormRow label="Make" value="C" />
      </Group>
    );

    expect(texts(renderer).map(textContent)).toEqual(["Title", "A", "Make", "C"]);
    // Two rows, so exactly one line between them
    expect(hostByTestId(renderer.root, "g-panel").children).toHaveLength(3);
  });

  it("has a heading above and a hint below when given", async () => {
    const renderer = await mount(
      <Group title="Show" footer="A 6-month rental. You’ll get reminders before it ends.">
        {three}
      </Group>
    );
    const heading = texts(renderer).find((text) => textContent(text) === "Show")!;
    const hint = texts(renderer).find((text) => textContent(text).startsWith("A 6-month"))!;

    expect(flat(heading.props.style)).toMatchObject({
      fontFamily: fonts.semibold,
      fontSize: 14,
      color: colors.ink2,
      marginLeft: 16,
      marginBottom: 8,
    });
    expect(heading.props.accessibilityRole).toBe("header");
    expect(flat(hint.props.style)).toMatchObject({
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 18,
      color: colors.ink2,
      marginTop: 8,
      marginHorizontal: 16,
    });
  });

  it("has neither heading nor hint by default", async () => {
    const renderer = await mount(<Group>{three}</Group>);

    expect(texts(renderer).map(textContent)).toEqual([
      "Title",
      "Schumann S-110",
      "Make",
      "Schumann",
      "Company",
      "Kirpalsons",
    ]);
  });
});

describe("FormRow on a page", () => {
  it("is 56 high with a 16 px gap and 16 px sides", async () => {
    const renderer = await mount(
      <Group>
        <FormRow testID="row" label="Purchased" value="3 Sep 2026" />
      </Group>
    );

    expect(rowStyle(renderer)).toMatchObject({
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingHorizontal: 16,
    });
  });

  it("puts a grey 16 px label in an 84 px column, then the value in ink medium", async () => {
    const renderer = await mount(
      <Group>
        <FormRow testID="row" label="Purchased" value="3 Sep 2026" />
      </Group>
    );

    expect(textStyle(renderer, "Purchased")).toMatchObject({
      fontFamily: fonts.regular,
      fontSize: 16,
      color: colors.ink2,
      width: 84,
    });
    expect(textStyle(renderer, "3 Sep 2026")).toMatchObject({
      fontFamily: fonts.medium,
      fontSize: 16,
      color: colors.ink,
      textAlign: "left",
    });
  });

  it("widens the label column for one long label, or for the whole group", async () => {
    const one = await mount(
      <Group>
        <FormRow label="Purchase price" labelWidth={112} value="₹7,80,000" />
      </Group>
    );
    const all = await mount(
      <Group labelWidth={112}>
        <FormRow label="Bought from" value="Meera" />
      </Group>
    );

    expect(textStyle(one, "Purchase price").width).toBe(112);
    expect(textStyle(all, "Bought from").width).toBe(112);
  });

  it("shows the placeholder in grey when there is no value", async () => {
    const renderer = await mount(
      <Group>
        <FormRow label="Make" placeholder="Choose" />
      </Group>
    );

    expect(textStyle(renderer, "Choose").color).toBe(colors.ink3);
  });

  it("is a plain row, not a button, when it has nothing to press", async () => {
    const renderer = await mount(
      <Group>
        <FormRow testID="row" label="Make" value="Schumann" />
      </Group>
    );

    expect(renderer.root.findAllByType(Pressable)).toHaveLength(0);
    expect(renderer.root.findAllByType(Svg)).toHaveLength(0);
  });
});

describe("FormRow in a sheet", () => {
  const inSheet = (child: React.ReactNode) => mount(<Group inSheet>{child}</Group>);

  it("is 52 high, with the label on the left and the value on the right", async () => {
    const renderer = await inSheet(<FormRow testID="row" label="Paid on" value="Today, 29 Sep 2026" />);

    expect(rowStyle(renderer).height).toBe(52);
    expect(textStyle(renderer, "Paid on").width).toBeUndefined();
    expect(textStyle(renderer, "Today, 29 Sep 2026")).toMatchObject({
      textAlign: "right",
      flexGrow: 1,
    });
  });

  it("right-aligns an input too", async () => {
    const renderer = await inSheet(
      <FormRow label="Note" placeholder="Cash, UPI, cheque no." input={{ value: "", onChangeText: () => {} }} />
    );

    expect(flat(renderer.root.findByType(TextInput).props.style).textAlign).toBe("right");
  });
});

describe("FormRow that opens a picker", () => {
  const picker = (props: Partial<React.ComponentProps<typeof FormRow>> = {}) => {
    const onPress = jest.fn();
    return {
      onPress,
      mounted: mount(
        <Group>
          <FormRow testID="row" label="Make" value="Schumann" onPress={onPress} {...props} />
        </Group>
      ),
    };
  };

  it("is a button that reads its label and value", async () => {
    const { mounted } = picker();
    const renderer = await mounted;
    const button = renderer.root.findByType(Pressable);

    expect(button.props.accessibilityRole).toBe("button");
    expect(button.props.accessibilityLabel).toBe("Make, Schumann");
  });

  it("reads its placeholder when nothing is chosen", async () => {
    const { mounted } = picker({ value: undefined, placeholder: "Choose" });
    const renderer = await mounted;

    expect(renderer.root.findByType(Pressable).props.accessibilityLabel).toBe("Make, Choose");
  });

  it("can be given a different spoken label", async () => {
    const { mounted } = picker({ accessibilityLabel: "Change make" });
    const renderer = await mounted;

    expect(renderer.root.findByType(Pressable).props.accessibilityLabel).toBe("Change make");
  });

  it("shows a grey chevron, 18 px", async () => {
    const { mounted } = picker();
    const renderer = await mounted;

    expect(renderer.root.findAllByType(Path)[0].props.d).toBe(ICONS.chevronRight[0].d);
    expect(renderer.root.findByType(Svg).props).toMatchObject({
      width: 18,
      height: 18,
      stroke: colors.chevron,
      strokeWidth: 2,
    });
  });

  it("can leave the chevron out, as on the Paid on row", async () => {
    const { mounted } = picker({ chevron: false });
    const renderer = await mounted;

    expect(renderer.root.findAllByType(Svg)).toHaveLength(0);
  });

  it("calls onPress when pressed", async () => {
    const { mounted, onPress } = picker();
    const renderer = await mounted;

    renderer.root.findByType(Pressable).props.onPress();

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("goes light grey while it is pressed", async () => {
    const { mounted } = picker();
    const renderer = await mounted;
    const style = renderer.root.findByType(Pressable).props.style;

    expect(flat(style({ pressed: false })).backgroundColor).toBeUndefined();
    expect(flat(style({ pressed: true })).backgroundColor).toBe(colors.grouped);
  });
});

describe("FormRow with a text field", () => {
  const field = (
    props: Partial<React.ComponentProps<typeof FormRow>> = {},
    groupProps: Partial<React.ComponentProps<typeof Group>> = {}
  ) =>
    mount(
      <Group {...groupProps}>
        <FormRow
          testID="row"
          label="Title"
          placeholder="Required"
          input={{ value: "Schumann S-110", onChangeText: () => {} }}
          {...props}
        />
      </Group>
    );
  const input = (renderer: Mounted) => renderer.root.findByType(TextInput);

  it("has a text input after the label, in ink medium, with a grey placeholder", async () => {
    const renderer = await field();

    expect(input(renderer).props.value).toBe("Schumann S-110");
    expect(input(renderer).props.placeholder).toBe("Required");
    expect(input(renderer).props.placeholderTextColor).toBe(colors.ink3);
    expect(flat(input(renderer).props.style)).toMatchObject({
      fontFamily: fonts.medium,
      fontSize: 16,
      color: colors.ink,
      flex: 1,
    });
  });

  it("is read out by its label", async () => {
    const renderer = await field();

    expect(input(renderer).props.accessibilityLabel).toBe("Title");
  });

  it("passes input props through", async () => {
    const onChangeText = jest.fn();
    const renderer = await field({
      input: { value: "", onChangeText, autoCapitalize: "words", maxLength: 60 },
    });

    input(renderer).props.onChangeText("Weber");
    expect(onChangeText).toHaveBeenCalledWith("Weber");
    expect(input(renderer).props).toMatchObject({ autoCapitalize: "words", maxLength: 60 });
  });

  it("shows a prefix such as ₹ in grey before the input", async () => {
    const renderer = await field({ label: "Rent", prefix: "₹" });

    expect(texts(renderer).map(textContent)).toEqual(["Rent", "₹"]);
    expect(textStyle(renderer, "₹")).toMatchObject({ color: colors.ink2, fontFamily: fonts.medium });
  });

  it("sets an amount in semibold when it is strong", async () => {
    const renderer = await field({
      input: { value: "4,500", onChangeText: () => {}, strong: true, keyboardType: "numeric" },
    });

    expect(flat(input(renderer).props.style).fontFamily).toBe(fonts.semibold);
  });

  it("lines up digits in a numeric or phone field", async () => {
    for (const keyboardType of ["numeric", "phone-pad", "number-pad", "decimal-pad"] as const) {
      const renderer = await field({ input: { value: "9", onChangeText: () => {}, keyboardType } });
      expect(flat(input(renderer).props.style).fontVariant).toEqual(["tabular-nums"]);
    }
    const text = await field();
    expect(flat(input(text).props.style).fontVariant).toBeUndefined();
  });

  it("focuses the input when the row is tapped", async () => {
    const renderer = await field();
    const focus = jest.fn();
    (input(renderer).instance as any).focus = focus;

    renderer.root.findAllByType(Pressable)[0].props.onPress();

    expect(focus).toHaveBeenCalled();
  });

  it("has no chevron", async () => {
    const renderer = await field();

    expect(renderer.root.findAllByType(Svg)).toHaveLength(0);
  });

  it("keeps the label column width, so several rows line up", async () => {
    const renderer = await field({}, { labelWidth: 112 });

    expect(textStyle(renderer, "Title").width).toBe(112);
  });

  it("is not one big accessible block, which would hide the input from a screen reader", async () => {
    const renderer = await field();

    expect(renderer.root.findAllByType(Pressable)[0].props.accessible).toBe(false);
  });
});

describe("FormRow outside a group", () => {
  it("uses the page layout", async () => {
    const renderer = await mount(<FormRow testID="row" label="Make" value="Schumann" />);

    expect(rowStyle(renderer).height).toBe(56);
    expect(textStyle(renderer, "Make").width).toBe(84);
  });

  it("keeps a View for a row with nothing to press", async () => {
    const renderer = await mount(<FormRow testID="row" label="Make" value="Schumann" />);

    expect(row(renderer).type).toBe("View");
  });
});
