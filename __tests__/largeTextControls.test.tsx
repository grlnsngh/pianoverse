import React from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { act } from "react-test-renderer";
import PaperActions, { CopiesRow } from "@/components/PaperActions";
import { AmountInput, Button, Field, FormRow, Group, PickerSheet, Segmented, Stepper } from "@/components/ui";
import { lightColors as colors, maxScale } from "@/constants/theme";
import { findAllMemo, hostByTestId, mount, textContent } from "./helpers/ui";
import { findAllPressables, findPressable } from "./helpers/pressables";
import { atFontScale, setFontScale } from "./helpers/render";

/**
 * Controls with a big Font size (docs/large-text/PLAN.md, Batch L2): a box
 * that holds text is at least as high as the board draws it and grows with the
 * text, and what doesn't fit side by side stacks. At 100% each is as drawn.
 */

type Mounted = Awaited<ReturnType<typeof mount>>;
const flat = (style: unknown) => StyleSheet.flatten(style as any);
const texts = (renderer: Mounted) => renderer.root.findAllByType(Text);
const textNode = (renderer: Mounted, content: string) => texts(renderer).find((text) => textContent(text) === content)!;
const textStyle = (renderer: Mounted, content: string) => flat(textNode(renderer, content).props.style);

describe("Button", () => {
  const setup = (props = {}) => mount(<Button title="Extend to 21 Mar 2027" onPress={jest.fn()} {...props} />);
  const label = (renderer: Mounted) => renderer.root.findByType(Text);

  it("keeps its label to one line at 100%, and is at least 52 high with room above and below the label", async () => {
    const renderer = await setup();

    expect(label(renderer).props.numberOfLines).toBe(1);
    expect(flat(findPressable(renderer.root).props.style({ pressed: false }))).toMatchObject({ minHeight: 52 });
    expect(flat(findPressable(renderer.root).props.style({ pressed: false })).height).toBeUndefined();
    expect(flat(label(renderer).props.style)).toMatchObject({ flexShrink: 1, textAlign: "center" });
  });

  it("lets the label take two lines rather than cut it, from 125%", async () => {
    setFontScale(1.24);
    expect(label(await setup()).props.numberOfLines).toBe(1);

    setFontScale(1.5);
    const renderer = await setup({ size: "compact" });
    expect(label(renderer).props.numberOfLines).toBe(2);
    expect(flat(findPressable(renderer.root).props.style({ pressed: false }))).toMatchObject({ minHeight: 48 });
    setFontScale(1);
  });
});

describe("Field", () => {
  const setup = () => mount(<Field label="Email" value="meera@example.com" onChangeText={() => {}} />);
  const box = (renderer: Mounted) => flat(renderer.root.findAllByType(TextInput)[0].parent!.parent!.parent!.props.style);

  it("is at least 60 high, and its value at least 28, so bigger text makes it taller instead of clipping", async () => {
    const renderer = await setup();
    const input = flat(renderer.root.findByType(TextInput).props.style);

    expect(input).toMatchObject({ minHeight: 28 });
    expect(input.height).toBeUndefined();
    expect(JSON.stringify(box(renderer))).toContain("\"minHeight\":60");
    expect(JSON.stringify(box(renderer))).not.toContain("\"height\":60");
  });

  describe("at 150%", () => {
    atFontScale(1.5);

    it("is built the same way: nothing in it has a fixed height", async () => {
      const renderer = await setup();

      expect(flat(renderer.root.findByType(TextInput).props.style).height).toBeUndefined();
    });
  });
});

describe("FormRow on a page", () => {
  const setup = (width?: number) =>
    mount(
      <Group>
        <FormRow testID="row" label="Purchase price" value="₹ 1,20,000" onPress={() => {}} labelWidth={width} />
      </Group>
    );

  it("has a label column of the board's width at 100% and one line each", async () => {
    const renderer = await setup(112);

    expect(textStyle(renderer, "Purchase price").width).toBe(112);
    expect(textNode(renderer, "Purchase price").props.numberOfLines).toBe(1);
    expect(textNode(renderer, "₹ 1,20,000").props.numberOfLines).toBe(1);
  });

  it("makes the label column grow with the text before the big-text layout starts", async () => {
    setFontScale(1.15);
    const renderer = await setup(112);

    expect(textStyle(renderer, "Purchase price").width).toBe(Math.round(112 * 1.15));
    setFontScale(1);
  });

  describe("at 150%", () => {
    atFontScale(1.5);

    it("puts the label above its value, with no column and no one-line limit", async () => {
      const renderer = await setup(112);
      const label = textNode(renderer, "Purchase price");
      const value = textNode(renderer, "₹ 1,20,000");

      expect(flat(label.props.style).width).toBeUndefined();
      expect(label.props.numberOfLines).toBeUndefined();
      expect(value.props.numberOfLines).toBeUndefined();
      // One stack holds the label and then the value line, so the label is above the value
      const stacks = renderer.root.findAll(
        (node) => (node.type as unknown) === "View" && flat(node.props.style ?? {}).gap === 2
      );
      expect(stacks).toHaveLength(1);
      expect(textContent(stacks[0])).toBe("Purchase price₹ 1,20,000");
    });

    it("keeps the row at least 56 high and makes it taller with its text", async () => {
      const renderer = await setup();
      const style = flat(hostByTestId(renderer.root, "row").props.style);

      expect(style.minHeight).toBe(56);
      expect(style.height).toBeUndefined();
    });

    it("keeps a text field's label above it too, and the field still takes the whole width", async () => {
      const renderer = await mount(
        <Group>
          <FormRow label="Customer" prefix="₹" input={{ value: "4000", onChangeText: () => {} }} />
        </Group>
      );
      const input = flat(renderer.root.findByType(TextInput).props.style);

      expect(flat(textNode(renderer, "Customer").props.style).width).toBeUndefined();
      expect(input).toMatchObject({ flex: 1, alignSelf: "stretch" });
      expect(input.height).toBeUndefined();
    });
  });
});

describe("FormRow in a sheet at 150%", () => {
  atFontScale(1.5);

  it("keeps the label's words together and lets the value wrap, still on the right", async () => {
    const renderer = await mount(
      <Group inSheet>
        <FormRow testID="row" label="Paid on" value="Today, 15 Oct 2026" onPress={() => {}} />
      </Group>
    );

    expect(textNode(renderer, "Paid on").props.numberOfLines).toBeUndefined();
    // The label never shrinks (so "Paid on" is not broken in two), up to half the row
    expect(textStyle(renderer, "Paid on")).toMatchObject({ flexShrink: 0, maxWidth: "50%" });
    expect(textStyle(renderer, "Today, 15 Oct 2026")).toMatchObject({ textAlign: "right", flexShrink: 1 });
    expect(flat(hostByTestId(renderer.root, "row").props.style).minHeight).toBe(52);
  });

  it("puts the label above a text field, so its hint is read in full and not cut", async () => {
    const renderer = await mount(
      <Group inSheet>
        <FormRow label="Note" placeholder="Cash, UPI, cheque no." input={{ value: "", onChangeText: () => {} }} />
      </Group>
    );
    const input = renderer.root.findByType(TextInput);

    expect(textStyle(renderer, "Note").width).toBeUndefined();
    expect(textStyle(renderer, "Note").maxWidth).toBeUndefined();
    expect(flat(input.props.style).textAlign).toBe("left");
    // The label and the field are in one stack, the label first
    const stacks = renderer.root.findAll((node) => (node.type as unknown) === "View" && flat(node.props.style ?? {}).gap === 2);
    expect(stacks).toHaveLength(1);
  });
});

describe("FormRow in a sheet at 100%", () => {
  it("keeps a text field beside its label, the hint at the right, as drawn", async () => {
    const renderer = await mount(
      <Group inSheet>
        <FormRow label="Note" placeholder="Cash, UPI, cheque no." input={{ value: "", onChangeText: () => {} }} />
      </Group>
    );

    expect(flat(renderer.root.findByType(TextInput).props.style).textAlign).toBe("right");
    expect(renderer.root.findAll((node) => (node.type as unknown) === "View" && flat(node.props.style ?? {}).gap === 2)).toHaveLength(0);
  });
});

describe("Segmented", () => {
  const options = [
    { value: "hotel", label: "Hotel" },
    { value: "private", label: "Private person" },
  ] as const;
  const setup = () =>
    mount(<Segmented testID="seg" options={options} value="private" onChange={() => {}} accessibilityLabel="Who" />);
  const layout = async (renderer: Mounted) => {
    await act(async () => {
      hostByTestId(renderer.root, "seg").props.onLayout({ nativeEvent: { layout: { width: 300 } } });
    });
  };

  it("keeps its choices side by side with a sliding chip at 100%", async () => {
    const renderer = await setup();
    await layout(renderer);

    expect(flat(hostByTestId(renderer.root, "seg").props.style).flexDirection).toBe("row");
    expect(hostByTestId(renderer.root, "seg-chip")).toBeTruthy();
    expect(findAllPressables(renderer.root).map((tab) => tab.props.accessibilityState.selected)).toEqual([false, true]);
  });

  describe("at 150%", () => {
    atFontScale(1.5);

    it("gives each choice a row of its own, and no chip", async () => {
      const renderer = await setup();
      await layout(renderer);

      expect(flat(hostByTestId(renderer.root, "seg").props.style).flexDirection).toBe("column");
      expect(renderer.root.findAll((node) => node.props.testID === "seg-chip")).toHaveLength(0);
      for (const tab of findAllPressables(renderer.root)) {
        const style = flat(tab.props.style);
        expect(style.height).toBeUndefined();
        expect(style.minHeight).toBe(40);
      }
    });

    it("shows the chosen row as the white one, with its whole label", async () => {
      const renderer = await setup();
      const [hotel, privatePerson] = findAllPressables(renderer.root);

      expect(flat(privatePerson.props.style).backgroundColor).toBe(colors.white);
      expect(flat(hotel.props.style).backgroundColor).toBeUndefined();
      expect(privatePerson.findByType(Text).props.numberOfLines).toBeUndefined();
      expect(textContent(privatePerson)).toBe("Private person");
    });

    it("still changes the choice when a row is pressed", async () => {
      const onChange = jest.fn();
      const renderer = await mount(
        <Segmented testID="seg" options={options} value="private" onChange={onChange} accessibilityLabel="Who" />
      );

      findAllPressables(renderer.root)[0].props.onPress();

      expect(onChange).toHaveBeenCalledWith("hotel");
    });
  });
});

describe("AmountInput", () => {
  const setup = (width?: number) => mount(<AmountInput value={120000} onChangeValue={() => {}} label="Amount" width={width} />);

  it("is at least as wide as the board's box and as high as 56, and takes more when the digits need it", async () => {
    const renderer = await setup(210);
    const input = flat(renderer.root.findByType(TextInput).props.style);

    expect(input).toMatchObject({ minWidth: 210, minHeight: 56, flexShrink: 1 });
    expect(input.width).toBeUndefined();
    expect(input.height).toBeUndefined();
  });

  it("limits how much bigger the digits and the rupee sign grow with the phone's Font size", async () => {
    const renderer = await setup();

    expect(renderer.root.findByType(TextInput).props.maxFontSizeMultiplier).toBe(maxScale.amount);
    expect(textNode(renderer, "₹").props.maxFontSizeMultiplier).toBe(maxScale.amount);
  });
});

describe("PickerSheet", () => {
  const options = [
    { value: "a", label: "Oldest first" },
    { value: "b", label: "Highest price first" },
  ];
  const setup = () =>
    mount(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <PickerSheet visible title="Sort by" options={options} value="a" onSelect={() => {}} onClose={() => {}} />
      </SafeAreaProvider>
    );

  it("has rows at least 52 high whose label may wrap beside the check", async () => {
    const renderer = await setup();
    const rows = renderer.root.findAll(
      (node) => node.props.accessibilityRole === "radio" && typeof node.props.style === "function"
    );
    const style = flat(rows[0].props.style({ pressed: false }));

    expect(style).toMatchObject({ minHeight: 52, flexDirection: "row", alignItems: "center" });
    expect(style.height).toBeUndefined();
    expect(flat(rows[0].findByType(Text).props.style).flexShrink).toBe(1);
  });
});

describe("the copies row", () => {
  const setup = () => mount(<CopiesRow label="Cards" hint="One page each" value={3} onChange={() => {}} />);
  const rowOf = (renderer: Mounted) => flat(findAllMemo(renderer.root, Stepper)[0].parent!.props.style);

  it("is a row at least 60 high, the words beside the buttons, at 100%", async () => {
    const style = rowOf(await setup());

    expect(style).toMatchObject({ minHeight: 60, flexDirection: "row" });
    expect(style.height).toBeUndefined();
  });

  describe("at 150%", () => {
    atFontScale(1.5);

    it("puts the buttons under the words", async () => {
      expect(rowOf(await setup())).toMatchObject({ flexDirection: "column", alignItems: "flex-start" });
    });
  });

  it("gives the number room for more than two digits instead of a fixed slot", async () => {
    const renderer = await setup();

    expect(flat(textNode(renderer, "3").props.style)).toMatchObject({ minWidth: 36 });
    expect(flat(textNode(renderer, "3").props.style).width).toBeUndefined();
  });

  it("has Print and Share buttons at least 48 high", async () => {
    const renderer = await mount(<PaperActions busy={null} onSave={() => {}} onPrint={() => {}} onShare={() => {}} />);
    const print = renderer.root.findAll((node) => node.props.accessibilityLabel === "Print" && typeof node.props.style === "function")[0];

    expect(flat(print.props.style({ pressed: false })).minHeight).toBe(48);
  });
});
