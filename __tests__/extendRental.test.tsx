jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);
jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), setParams: jest.fn() },
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

import React from "react";
import { act, ReactTestRenderer } from "react-test-renderer";
import { addDays, addMonths, format } from "date-fns";
import DetailScreen from "@/app/detail/[id]";
import { PianoItem } from "@/redux/pianos/types";
import { toStoredDate } from "@/utils/dates";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  captureToasts,
  createTestStore,
  flushPromises,
  queryAllByText,
  renderWithStore,
} from "./helpers/render";

const today = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const rentalEnding = (end: Date, overrides: Partial<PianoItem> = {}) =>
  makePiano({
    $id: "piano-1",
    title: "Kawai K-300",
    category: "rentable",
    rental_customer_name: "Asha Mehta",
    rental_customer_mobile: "9876543210",
    rental_period_start: toStoredDate(addDays(end, -60)) as any,
    rental_period_end: toStoredDate(end) as any,
    rental_price: 4000,
    ...overrides,
  });

let alerts: ReturnType<typeof captureAlerts>;

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  fakeNotifications.reset();
  alerts = captureAlerts();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const openDetail = (piano: PianoItem) => {
  fakeBackend.documents.set(piano.$id, { ...piano });
  const store = createTestStore({ user: testUser, items: [piano] });
  return { store, renderer: renderWithStore(<DetailScreen />, store) };
};

const pressText = async (renderer: ReactTestRenderer, text: string) => {
  const [node] = queryAllByText(renderer.root, text);
  if (!node) throw new Error(`No "${text}"`);
  let pressable: any = node;
  while (typeof pressable.props.onPress !== "function")
    pressable = pressable.parent;
  await act(async () => {
    await pressable.props.onPress();
  });
  await flushPromises();
};

const pressLabel = async (renderer: ReactTestRenderer, label: string) => {
  const [node] = renderer.root.findAll(
    (candidate) =>
      candidate.props.accessibilityLabel === label &&
      typeof candidate.props.onPress === "function"
  );
  if (!node) throw new Error(`Nothing labelled "${label}"`);
  await act(async () => {
    await node.props.onPress();
  });
  await flushPromises();
};

const savedEnd = () => fakeBackend.documents.get("piano-1")?.rental_period_end;

describe("extending a rental", () => {
  it("adds a month in one tap and moves the reminders", async () => {
    const toasts = captureToasts();
    const end = addDays(today(), 10);
    const { store, renderer } = openDetail(rentalEnding(end));

    await pressText(renderer, "Extend rental");
    const newEnd = addMonths(end, 1);
    expect(allTexts(renderer.root)).toContain(
      `until ${format(newEnd, "EEE, d MMM yyyy")}`
    );
    await pressLabel(renderer, "Extend by 1 month");

    expect(alerts.titles()).toEqual([]);
    expect(savedEnd()).toBe(toStoredDate(newEnd));
    expect(store.getState().pianos.items[0].rental_period_end).toBe(
      toStoredDate(newEnd)
    );
    expect(toasts).toEqual([
      `Rental extended to ${format(newEnd, "d MMM yyyy")}`,
    ]);
    const reminderDueDates = fakeNotifications
      .rentalReminders("piano-1")
      .map((reminder) => reminder.content.data.dueDate);
    expect(reminderDueDates.length).toBeGreaterThan(0);
    expect(new Set(reminderDueDates)).toEqual(new Set([toStoredDate(newEnd)]));
  });

  it("counts an overdue rental's extension from its old end date", async () => {
    const end = addDays(today(), -5);
    const { renderer } = openDetail(rentalEnding(end));

    await pressText(renderer, "Extend rental");
    await pressLabel(renderer, "Extend by 3 months");

    expect(savedEnd()).toBe(toStoredDate(addMonths(end, 3)));
  });

  it("can extend to a chosen date after the current end", async () => {
    const end = addDays(today(), 10);
    const { renderer } = openDetail(rentalEnding(end));

    await pressText(renderer, "Extend rental");
    await pressText(renderer, "Choose a date…");
    const [picker] = renderer.root.findAll(
      (node) => (node.type as unknown) === "DateTimePicker"
    );
    expect(toStoredDate(picker.props.minimumDate)).toBe(
      toStoredDate(addDays(end, 1))
    );
    const chosen = addDays(end, 45);
    await act(async () => {
      picker.props.onChange({ type: "set" }, chosen);
    });
    await flushPromises();

    expect(savedEnd()).toBe(toStoredDate(chosen));
  });

  it("changes nothing when the date picker is dismissed", async () => {
    const end = addDays(today(), 10);
    const { renderer } = openDetail(rentalEnding(end));

    await pressText(renderer, "Extend rental");
    await pressText(renderer, "Choose a date…");
    const [picker] = renderer.root.findAll(
      (node) => (node.type as unknown) === "DateTimePicker"
    );
    await act(async () => {
      picker.props.onChange({ type: "dismissed" }, undefined);
    });
    await flushPromises();

    expect(savedEnd()).toBe(toStoredDate(end));
  });

  it("is only offered for rentals that haven't been sold", () => {
    const end = addDays(today(), 10);
    const texts = (piano: PianoItem) =>
      allTexts(openDetail(piano).renderer.root);

    expect(texts(makePiano({ $id: "piano-1" }))).not.toContain("Extend rental");
    expect(
      texts(rentalEnding(end, { sold_date: toStoredDate(today()) as any }))
    ).not.toContain("Extend rental");
  });
});
