jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);

import React from "react";
import { StyleSheet } from "react-native";
import { act, ReactTestRenderer } from "react-test-renderer";
import MarkAsSoldSheet from "@/components/MarkAsSoldSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import { AmountInput, DatePickerSheet } from "@/components/ui";
import type { NewPayment } from "@/lib/useRentPayments";
import { lightColors as colors, fonts } from "@/constants/theme";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import { allTexts, captureAlerts, createTestStore, flushPromises, renderWithStore } from "./helpers/render";
import { mount, textContent } from "./helpers/ui";

const flat = (style: unknown) => StyleSheet.flatten(style as any);
const ALL_BUT_DATE = [
  "hrtime",
  "nextTick",
  "performance",
  "queueMicrotask",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "requestIdleCallback",
  "cancelIdleCallback",
  "setImmediate",
  "clearImmediate",
  "setInterval",
  "clearInterval",
  "setTimeout",
  "clearTimeout",
] as const;

// Tuesday 15 September 2026: the 1st was a Tuesday, so the month starts on the second column
beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 8, 15, 12, 0, 0), doNotFake: [...ALL_BUT_DATE] });
  jest.clearAllMocks();
  fakeBackend.reset();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// One entry per control: a pressable is more than one node in the test tree
const isControl = (label: string) => (node: any) =>
  node?.props.accessibilityLabel === label && typeof node.props.onPress === "function";
const labelled = (renderer: ReactTestRenderer, label: string) =>
  renderer.root.findAll((node) => isControl(label)(node) && !isControl(label)(node.parent));
const press = async (renderer: ReactTestRenderer, label: string) => {
  const [node] = labelled(renderer, label);
  if (!node) throw new Error(`Nothing labelled "${label}"`);
  await act(async () => {
    await node.props.onPress();
  });
};
const day = (renderer: ReactTestRenderer, label: string) => labelled(renderer, label)[0];
const has = (renderer: ReactTestRenderer, text: string) => allTexts(renderer.root).includes(text);

describe("DatePickerSheet (DatePicker board)", () => {
  const open = async (props: Partial<React.ComponentProps<typeof DatePickerSheet>> = {}) => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const element = (visible: boolean, value = new Date(2026, 8, 15)) => (
      <DatePickerSheet
        visible={visible}
        title="Purchased"
        value={value}
        onSelect={onSelect}
        onClose={onClose}
        {...props}
      />
    );
    const renderer = renderWithStore(element(true), createTestStore());
    return { renderer, onSelect, onClose, element };
  };

  it("shows the month, the days of the week from Monday, and the title", async () => {
    const { renderer } = await open();

    expect(has(renderer, "September 2026")).toBe(true);
    expect(has(renderer, "Purchased")).toBe(true);
    expect(allTexts(renderer.root).filter((text) => /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/.test(text))).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
    expect(textContent(renderer.root.findAll((node) => node.props.accessibilityRole === "header" && textContent(node) === "September 2026")[0])).toBe("September 2026");
  });

  it("lays the days out as 44 px circles, with the 1st under Tuesday", async () => {
    const { renderer } = await open();
    const days = renderer.root.findAll(
      (node) =>
        /^\w+ \d+ \w+ 2026$/.test(node.props.accessibilityLabel ?? "") &&
        typeof node.props.onPress === "function"
    );

    // September has 30 days
    expect(new Set(days.map((node) => node.props.accessibilityLabel)).size).toBe(30);
    expect(flat(day(renderer, "Tuesday 1 September 2026").props.style)).toMatchObject({
      width: 44,
      height: 44,
      borderRadius: 22,
    });
    // Monday 31 August isn't part of it, so the first row starts with a blank cell
    expect(labelled(renderer, "Monday 31 August 2026")).toHaveLength(0);
  });

  it("marks the chosen day in solid ink, and today with an orange ring", async () => {
    const { renderer } = await open({ value: new Date(2026, 8, 3) });

    const chosen = flat(day(renderer, "Thursday 3 September 2026").props.style);
    expect(chosen.backgroundColor).toBe(colors.ink);
    expect(day(renderer, "Thursday 3 September 2026").props.accessibilityState.selected).toBe(true);
    const today = flat(day(renderer, "Tuesday 15 September 2026").props.style);
    expect(today).toMatchObject({ borderWidth: 2, borderColor: colors.brand });
    expect(day(renderer, "Tuesday 15 September 2026").props.accessibilityState.selected).toBe(false);
  });

  it("writes the chosen day in white bold, and the rest in medium ink", async () => {
    const { renderer } = await open({ value: new Date(2026, 8, 3) });
    const text = (label: string) =>
      flat(day(renderer, label).findAll((node) => (node.type as unknown) === "Text")[0].props.style);

    expect(text("Thursday 3 September 2026")).toMatchObject({ fontFamily: fonts.bold, color: colors.white });
    expect(text("Friday 4 September 2026")).toMatchObject({ fontFamily: fonts.medium, color: colors.ink });
  });

  it("gives back the day picked only when Done is pressed", async () => {
    const { renderer, onSelect, onClose } = await open();

    await press(renderer, "Sunday 20 September 2026");
    expect(onSelect).not.toHaveBeenCalled();
    await press(renderer, "Done");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toEqual(new Date(2026, 8, 20));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("changes nothing on Cancel", async () => {
    const { renderer, onSelect, onClose } = await open();

    await press(renderer, "Sunday 20 September 2026");
    await press(renderer, "Cancel");

    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves between months, a Monday-first grid each time", async () => {
    const { renderer } = await open();

    await press(renderer, "Next month");
    expect(has(renderer, "October 2026")).toBe(true);
    expect(labelled(renderer, "Thursday 1 October 2026")).toHaveLength(1);
    expect(labelled(renderer, "Saturday 31 October 2026")).toHaveLength(1);

    await press(renderer, "Previous month");
    await press(renderer, "Previous month");
    expect(has(renderer, "August 2026")).toBe(true);
    expect(labelled(renderer, "Saturday 1 August 2026")).toHaveLength(1);
  });

  it("can pick a day in another month", async () => {
    const { renderer, onSelect } = await open();

    await press(renderer, "Next month");
    await press(renderer, "Thursday 8 October 2026");
    await press(renderer, "Done");

    expect(onSelect.mock.calls[0][0]).toEqual(new Date(2026, 9, 8));
  });

  it("greys out the days after the latest and before the earliest, which can't be chosen", async () => {
    const { renderer } = await open({
      minimumDate: new Date(2026, 8, 10),
      maximumDate: new Date(2026, 8, 20),
    });

    expect(day(renderer, "Wednesday 9 September 2026").props.accessibilityState.disabled).toBe(true);
    expect(day(renderer, "Thursday 10 September 2026").props.accessibilityState.disabled).toBe(false);
    expect(day(renderer, "Sunday 20 September 2026").props.accessibilityState.disabled).toBe(false);
    expect(day(renderer, "Monday 21 September 2026").props.accessibilityState.disabled).toBe(true);
    const text = flat(
      day(renderer, "Monday 21 September 2026").findAll((node) => (node.type as unknown) === "Text")[0].props.style
    );
    expect(text.color).toBe(colors.disabledText);
  });

  it("stops the month buttons at the earliest and the latest day", async () => {
    const { renderer } = await open({
      minimumDate: new Date(2026, 8, 10),
      maximumDate: new Date(2026, 8, 20),
    });

    // Both limits are in September, so neither neighbour month can be reached
    expect(labelled(renderer, "Previous month")[0].props.disabled).toBe(true);
    expect(labelled(renderer, "Next month")[0].props.disabled).toBe(true);
  });

  it("allows the neighbouring months when the limits are further away", async () => {
    const { renderer } = await open({ maximumDate: new Date(2026, 11, 31) });

    expect(labelled(renderer, "Previous month")[0].props.disabled).toBeFalsy();
    expect(labelled(renderer, "Next month")[0].props.disabled).toBeFalsy();
  });

  it("starts from the current value each time it opens", async () => {
    let setOpen!: (open: boolean) => void;
    const Wrapper = () => {
      const [visible, set] = React.useState(true);
      setOpen = set;
      return (
        <DatePickerSheet
          visible={visible}
          title="Purchased"
          value={new Date(2026, 8, 3)}
          onSelect={jest.fn()}
          onClose={jest.fn()}
        />
      );
    };
    const renderer = renderWithStore(<Wrapper />, createTestStore());
    await press(renderer, "Next month");
    await press(renderer, "Thursday 8 October 2026");

    act(() => setOpen(false));
    act(() => setOpen(true));

    expect(has(renderer, "September 2026")).toBe(true);
    expect(day(renderer, "Thursday 3 September 2026").props.accessibilityState.selected).toBe(true);
  });

  it("names every day in full for a screen reader, and says which is chosen", async () => {
    const { renderer } = await open();

    expect(day(renderer, "Tuesday 15 September 2026").props.accessibilityRole).toBe("button");
    expect(day(renderer, "Tuesday 15 September 2026").props.accessibilityState.selected).toBe(true);
  });
});

describe("AmountInput", () => {
  const Harness = ({ start = 0, onValue }: { start?: number; onValue?: (n: number) => void }) => {
    const [value, setValue] = React.useState(start);
    return (
      <AmountInput
        value={value}
        onChangeValue={(next) => {
          setValue(next);
          onValue?.(next);
        }}
        label="Amount"
      />
    );
  };
  const input = (renderer: ReactTestRenderer) =>
    renderer.root.findAll(
      (node) => node.props.accessibilityLabel === "Amount" && typeof node.props.onChangeText === "function"
    )[0];
  const type = (renderer: ReactTestRenderer, text: string) =>
    act(() => {
      input(renderer).props.onChangeText(text);
    });

  it("draws the amount with Indian digit grouping", async () => {
    const renderer = await mount(<Harness start={120000} />);

    expect(input(renderer).props.value).toBe("1,20,000");
  });

  it("groups the digits as they are typed, and tells the form the number", async () => {
    const onValue = jest.fn();
    const renderer = await mount(<Harness onValue={onValue} />);

    type(renderer, "1250000");

    expect(input(renderer).props.value).toBe("12,50,000");
    expect(onValue).toHaveBeenLastCalledWith(1250000);
  });

  it("keeps the decimal part, up to two places, and ignores letters and a third decimal", async () => {
    const onValue = jest.fn();
    const renderer = await mount(<Harness onValue={onValue} />);

    type(renderer, "2500.5");
    expect(input(renderer).props.value).toBe("2,500.5");
    expect(onValue).toHaveBeenLastCalledWith(2500.5);

    type(renderer, "2,500.55");
    expect(input(renderer).props.value).toBe("2,500.55");

    type(renderer, "2,500.555");
    expect(input(renderer).props.value).toBe("2,500.55");

    type(renderer, "25a");
    expect(input(renderer).props.value).toBe("2,500.55");
  });

  it("lets a decimal point be typed before its digits", async () => {
    const renderer = await mount(<Harness />);

    type(renderer, "12.");
    expect(input(renderer).props.value).toBe("12.");

    type(renderer, ".5");
    expect(input(renderer).props.value).toBe("0.5");
  });

  it("is empty for nothing, with a 0 to show where to type, and reports 0", async () => {
    const onValue = jest.fn();
    const renderer = await mount(<Harness start={4500} onValue={onValue} />);

    type(renderer, "");

    expect(input(renderer).props.value).toBe("");
    expect(input(renderer).props.placeholder).toBe("0");
    expect(onValue).toHaveBeenLastCalledWith(0);
  });

  it("follows a change made from outside, such as a sheet opening again", async () => {
    const renderer = await mount(<AmountInput value={4500} onChangeValue={jest.fn()} label="Amount" />);
    expect(input(renderer).props.value).toBe("4,500");

    await act(async () => {
      renderer.update(<AmountInput value={0} onChangeValue={jest.fn()} label="Amount" />);
    });

    expect(input(renderer).props.value).toBe("");
  });

  it("is drawn at 44 px bold with a grey rupee sign in front, hidden from screen readers", async () => {
    const renderer = await mount(<AmountInput value={4500} onChangeValue={jest.fn()} label="Amount" width={180} />);

    expect(flat(input(renderer).props.style)).toMatchObject({
      fontFamily: fonts.bold,
      fontSize: 44,
      color: colors.ink,
      width: 180,
      height: 56,
    });
    const rupee = renderer.root.findAll((node) => (node.type as unknown) === "Text" && textContent(node) === "₹")[0];
    expect(flat(rupee.props.style)).toMatchObject({ fontSize: 44, color: colors.ink2 });
    expect(rupee.props.accessibilityElementsHidden).toBe(true);
    expect(input(renderer).props.keyboardType).toBe("decimal-pad");
  });
});

describe("the Record payment sheet (RecordPayment board)", () => {
  const rental = makePiano({
    $id: "piano-1",
    title: "Young Chang U-121",
    category: "rentable",
    rental_customer_name: "Meera Kapoor",
    rental_price: 4500,
  });
  const open = (piano = rental, onSave = jest.fn((_payment: NewPayment) => Promise.resolve(true))) => {
    const onClose = jest.fn();
    const renderer = renderWithStore(
      <RecordPaymentSheet piano={piano} visible onClose={onClose} onSave={onSave} />,
      createTestStore({ user: testUser, items: [piano] })
    );
    return { renderer, onSave, onClose };
  };

  it("says whose piano it is, suggests the rent, and shows the day as today", () => {
    const { renderer } = open();

    expect(has(renderer, "Record payment")).toBe(true);
    expect(has(renderer, "Meera Kapoor · Young Chang U-121")).toBe(true);
    expect(has(renderer, "Rent is ₹4,500")).toBe(true);
    expect(has(renderer, "Paid on")).toBe(true);
    expect(has(renderer, "Today, 15 Sep 2026")).toBe(true);
    expect(has(renderer, "Note")).toBe(true);
    expect(has(renderer, "Save payment")).toBe(true);
  });

  it("names only the piano when nobody is renting it", () => {
    const { renderer } = open(makePiano({ $id: "piano-1", title: "Young Chang U-121", category: "rentable", rental_price: 4500 }));

    expect(has(renderer, "Young Chang U-121")).toBe(true);
    expect(allTexts(renderer.root).some((text) => text.startsWith(" ·") || text.endsWith("· Young Chang U-121"))).toBe(false);
  });

  it("has no 'Rent is' line for a rental with no rent recorded", () => {
    const { renderer } = open(makePiano({ $id: "piano-1", title: "Young Chang U-121", category: "rentable" }));

    expect(allTexts(renderer.root).some((text) => text.startsWith("Rent is"))).toBe(false);
  });

  it("saves the amount, the day, the note and the renter's name with the payment", async () => {
    const { renderer, onSave, onClose } = open();
    act(() => {
      renderer.root
        .findAll((node) => node.props.accessibilityLabel === "Note" && typeof node.props.onChangeText === "function")[0]
        .props.onChangeText("  UPI ");
    });

    await press(renderer, "Save payment");
    await flushPromises();

    expect(onSave).toHaveBeenCalledWith({
      amount: 4500,
      paidOn: expect.any(Date),
      note: "UPI",
      customerName: "Meera Kapoor",
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("saves no name for a piano that nobody is renting", async () => {
    const { renderer, onSave } = open(makePiano({ $id: "piano-1", title: "Young Chang U-121", category: "rentable", rental_price: 4500 }));

    await press(renderer, "Save payment");
    await flushPromises();

    expect(onSave.mock.calls[0][0].customerName).toBeUndefined();
  });

  it("stays open when the payment can't be saved", async () => {
    const onSave = jest.fn((_payment: NewPayment) => Promise.resolve(false));
    const { renderer, onClose } = open(rental, onSave);

    await press(renderer, "Save payment");
    await flushPromises();

    expect(onClose).not.toHaveBeenCalled();
  });

  it("asks for an amount instead of saving nothing", async () => {
    const alerts = captureAlerts();
    const { renderer, onSave } = open(makePiano({ $id: "piano-1", title: "Young Chang U-121", category: "rentable" }));

    await press(renderer, "Save payment");

    expect(alerts.titles()).toEqual(["Missing Details"]);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("can't be paid for a day after today", async () => {
    const { renderer } = open();
    await press(renderer, "Paid on, Today, 15 Sep 2026");

    expect(day(renderer, "Wednesday 16 September 2026").props.accessibilityState.disabled).toBe(true);
  });
});

describe("the Mark as sold sheet (MarkSold board)", () => {
  const piano = makePiano({ $id: "piano-1", title: "Young Chang U-121", category: "on_sale", on_sale_price: 120000 });
  const open = () =>
    renderWithStore(
      <MarkAsSoldSheet piano={piano} visible onClose={jest.fn()} />,
      createTestStore({ user: testUser, items: [piano] })
    );

  it("names the piano, suggests the asking price, and lists the day, the buyer and the address", () => {
    const renderer = open();

    expect(has(renderer, "Mark as sold")).toBe(true);
    expect(has(renderer, "Sale price for Young Chang U-121")).toBe(true);
    expect(
      renderer.root.findAll((node) => node.props.accessibilityLabel === "Sale price" && typeof node.props.onChangeText === "function")[0].props.value
    ).toBe("1,20,000");
    ["Sold on", "Today, 15 Sep 2026", "Buyer", "Address", "Confirm sale"].forEach((text) => expect(has(renderer, text)).toBe(true));
    expect(
      renderer.root.findAll((node) => node.props.placeholder === "Who bought it?").length
    ).toBeGreaterThan(0);
    expect(renderer.root.findAll((node) => node.props.placeholder === "Optional").length).toBeGreaterThan(0);
  });

  it("says what marking it sold does, and that it can be undone", () => {
    const renderer = open();

    expect(has(renderer, "The piano leaves your stock and is marked Sold. You can undo this later from its page.")).toBe(true);
  });

  it("can't be dated after today", async () => {
    const renderer = open();
    await press(renderer, "Sold on, Today, 15 Sep 2026");

    expect(day(renderer, "Wednesday 16 September 2026").props.accessibilityState.disabled).toBe(true);
  });
});
