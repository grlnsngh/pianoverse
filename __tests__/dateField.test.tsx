jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({ id: "piano-1" })),
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  })),
  usePathname: jest.fn(() => "/detail/piano-1"),
}));
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  return (props: any) => React.createElement("DateTimePicker", props);
});

import React, { useState } from "react";
import { TextInput } from "react-native";
import { act, ReactTestRenderer } from "react-test-renderer";
import DateField from "@/components/DateField";
import MarkAsSoldSheet from "@/components/MarkAsSoldSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  chooseDate,
  createTestStore,
  openDatePicker,
  renderWithStore,
} from "./helpers/render";

const pickers = (renderer: ReactTestRenderer) =>
  renderer.root.findAll((node) => (node.type as unknown) === "DateTimePicker");

// A form holding one date, like the piano forms do
const Form = ({ start }: { start: Date }) => {
  const [date, setDate] = useState(start);
  return <DateField title="Date of Purchase" value={date} onChange={setDate} />;
};

const renderForm = (start = new Date(2026, 8, 5)) =>
  renderWithStore(<Form start={start} />, createTestStore());

describe("a date field", () => {
  it("is a button showing the date, not a text box that opens the keyboard", () => {
    const renderer = renderForm();

    expect(renderer.root.findAllByType(TextInput).length).toBe(0);
    expect(allTexts(renderer.root)).toContain("Date of Purchase");
    expect(allTexts(renderer.root)).toContain("Sat Sep 05 2026");
    expect(pickers(renderer).length).toBe(0);
  });

  it("opens the date picker every time it is tapped", () => {
    const renderer = renderForm();

    chooseDate(renderer.root, "Date of Purchase", new Date(2026, 8, 10));
    expect(pickers(renderer).length).toBe(0);
    expect(allTexts(renderer.root)).toContain("Thu Sep 10 2026");

    // Tapping the same field again opens it again
    chooseDate(renderer.root, "Date of Purchase", new Date(2026, 8, 12));
    expect(allTexts(renderer.root)).toContain("Sat Sep 12 2026");
  });

  it("keeps the date when the picker is dismissed", () => {
    const renderer = renderForm();
    const picker = openDatePicker(renderer.root, "Date of Purchase");

    act(() => picker.props.onChange({ type: "dismissed" }, undefined));

    expect(pickers(renderer).length).toBe(0);
    expect(allTexts(renderer.root)).toContain("Sat Sep 05 2026");
  });
});

describe("the date fields of the sheets", () => {
  const piano = makePiano({ category: "rentable", rental_price: 4000 });

  it("let the sale date be picked, and not in the future", () => {
    const renderer = renderWithStore(
      <MarkAsSoldSheet piano={piano} visible onClose={jest.fn()} />,
      createTestStore({ user: testUser, items: [piano] })
    );

    expect(renderer.root.findAllByType(TextInput).length).toBeGreaterThan(0);
    const picker = openDatePicker(renderer.root, "Sale Date");
    expect(picker.props.maximumDate.toDateString()).toBe(
      new Date().toDateString()
    );

    act(() => picker.props.onChange({ type: "set" }, new Date(2026, 0, 3)));
    expect(allTexts(renderer.root)).toContain("Sat Jan 03 2026");
    // And again
    openDatePicker(renderer.root, "Sale Date");
  });

  it("let the day a payment was made be picked", () => {
    const renderer = renderWithStore(
      <RecordPaymentSheet
        piano={piano}
        visible
        onClose={jest.fn()}
        onSave={jest.fn(() => Promise.resolve(true))}
      />,
      createTestStore({ user: testUser, items: [piano] })
    );

    chooseDate(renderer.root, "Paid On", new Date(2026, 0, 3));

    expect(allTexts(renderer.root)).toContain("Sat Jan 03 2026");
  });
});
