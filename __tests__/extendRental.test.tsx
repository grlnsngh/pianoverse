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

import React from "react";
import { act, ReactTestRenderer } from "react-test-renderer";
import { addDays, addMonths, format } from "date-fns";
import DetailScreen from "@/app/detail/[id]";
import { Sheet } from "@/components/ui";
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
const day = (date: Date) => format(date, "d MMM yyyy");

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

// The choices are radio buttons named "3 months, Until 29 Dec 2026". A pressable is
// more than one node in the test tree, so only the outermost of each is kept.
const isOption = (node: any) =>
  node?.props.accessibilityRole === "radio" && typeof node.props.onPress === "function";
const options = (renderer: ReactTestRenderer) =>
  renderer.root.findAll((node) => isOption(node) && !isOption(node.parent));
const optionStartingWith = (renderer: ReactTestRenderer, name: string) => {
  const [node] = options(renderer).filter((candidate) =>
    (candidate.props.accessibilityLabel as string).startsWith(`${name},`)
  );
  if (!node) throw new Error(`No option "${name}"`);
  return node;
};
const chooseOption = async (renderer: ReactTestRenderer, name: string) => {
  const node = optionStartingWith(renderer, name);
  await act(async () => {
    node.props.onPress();
  });
};
const selectedOptions = (renderer: ReactTestRenderer) =>
  options(renderer)
    .filter((node) => node.props.accessibilityState?.selected)
    .map((node) => (node.props.accessibilityLabel as string).split(",")[0]);
const pressExtend = async (renderer: ReactTestRenderer, label: string) => pressLabel(renderer, label);

// A day of the calendar in the "New end date" sheet
const dayButton = (renderer: ReactTestRenderer, date: Date) => {
  const label = format(date, "EEEE d MMMM yyyy");
  const [node] = renderer.root.findAll(
    (candidate) =>
      candidate.props.accessibilityLabel === label &&
      typeof candidate.props.onPress === "function"
  );
  if (!node) throw new Error(`No day "${label}" in the calendar`);
  return node;
};

const savedEnd = () => fakeBackend.documents.get("piano-1")?.rental_period_end;

const openSheet = async (piano: PianoItem) => {
  const screen = openDetail(piano);
  await pressLabel(screen.renderer, "Extend rental");
  return screen;
};

describe("the Extend rental sheet", () => {
  it("offers 1, 3, 6 and 12 months and a date of your own, with the day each one leads to", async () => {
    const end = addDays(today(), 10);
    const { renderer } = await openSheet(rentalEnding(end));

    expect(options(renderer).map((node) => node.props.accessibilityLabel)).toEqual([
      `1 month, Until ${day(addMonths(end, 1))}`,
      `3 months, Until ${day(addMonths(end, 3))}`,
      `6 months, Until ${day(addMonths(end, 6))}`,
      `12 months, Until ${day(addMonths(end, 12))}`,
      "Choose a date, Pick the new end date",
    ]);
  });

  it("opens with 3 months chosen, and the button says the day it will extend to", async () => {
    const end = addDays(today(), 10);
    const { renderer } = await openSheet(rentalEnding(end));

    expect(selectedOptions(renderer)).toEqual(["3 months"]);
    expect(allTexts(renderer.root)).toContain(`Extend to ${day(addMonths(end, 3))}`);
  });

  it("says a running rental is counted from its end date", async () => {
    const end = addDays(today(), 10);
    const { renderer } = await openSheet(rentalEnding(end));

    expect(allTexts(renderer.root)).toContain(
      `This rental ends on ${day(end)}. The new period is counted from that day.`
    );
  });

  it("changes nothing until the button is pressed, and the button follows the choice", async () => {
    const end = addDays(today(), 10);
    const { renderer } = await openSheet(rentalEnding(end));

    await chooseOption(renderer, "6 months");

    expect(selectedOptions(renderer)).toEqual(["6 months"]);
    expect(allTexts(renderer.root)).toContain(`Extend to ${day(addMonths(end, 6))}`);
    expect(savedEnd()).toBe(toStoredDate(end));
  });

  it("extends by a month and moves the reminders", async () => {
    const toasts = captureToasts();
    const end = addDays(today(), 10);
    const { store, renderer } = await openSheet(rentalEnding(end));

    await chooseOption(renderer, "1 month");
    const newEnd = addMonths(end, 1);
    await pressExtend(renderer, `Extend to ${day(newEnd)}`);

    expect(alerts.titles()).toEqual([]);
    expect(savedEnd()).toBe(toStoredDate(newEnd));
    expect(store.getState().pianos.items[0].rental_period_end).toBe(toStoredDate(newEnd));
    expect(toasts).toEqual([`Rental extended to ${day(newEnd)}`]);
    const reminderDueDates = fakeNotifications
      .rentalReminders("piano-1")
      .map((reminder) => reminder.content.data.dueDate);
    expect(reminderDueDates.length).toBeGreaterThan(0);
    expect(new Set(reminderDueDates)).toEqual(new Set([toStoredDate(newEnd)]));
  });

  it("extends by the 3 months it opens on, and by 12", async () => {
    const end = addDays(today(), 10);
    const first = await openSheet(rentalEnding(end));
    await pressExtend(first.renderer, `Extend to ${day(addMonths(end, 3))}`);
    expect(savedEnd()).toBe(toStoredDate(addMonths(end, 3)));

    fakeBackend.reset();
    const second = await openSheet(rentalEnding(end));
    await chooseOption(second.renderer, "12 months");
    await pressExtend(second.renderer, `Extend to ${day(addMonths(end, 12))}`);
    expect(savedEnd()).toBe(toStoredDate(addMonths(end, 12)));
  });

  it("closes once it has saved", async () => {
    const end = addDays(today(), 10);
    const { renderer } = await openSheet(rentalEnding(end));

    await pressExtend(renderer, `Extend to ${day(addMonths(end, 3))}`);

    const sheet = renderer.root.findAllByType(Sheet).find((node) => node.props.title === "Extend rental");
    expect(sheet?.props.visible).toBe(false);
  });

  describe("for a rental that has already ended", () => {
    it("counts the new period from today, and says so", async () => {
      const end = addDays(today(), -5);
      const { renderer } = await openSheet(rentalEnding(end));

      expect(allTexts(renderer.root)).toContain(
        `This rental ended on ${day(end)}, so the new period is counted from today.`
      );
      expect(options(renderer).slice(0, 4).map((node) => node.props.accessibilityLabel)).toEqual([
        `1 month, Until ${day(addMonths(today(), 1))}`,
        `3 months, Until ${day(addMonths(today(), 3))}`,
        `6 months, Until ${day(addMonths(today(), 6))}`,
        `12 months, Until ${day(addMonths(today(), 12))}`,
      ]);
    });

    it("extends from today, not from the old end date", async () => {
      const end = addDays(today(), -5);
      const { renderer } = await openSheet(rentalEnding(end));

      await pressExtend(renderer, `Extend to ${day(addMonths(today(), 3))}`);

      expect(savedEnd()).toBe(toStoredDate(addMonths(today(), 3)));
    });
  });

  it("counts a rental that ends today from today", async () => {
    const { renderer } = await openSheet(rentalEnding(today()));

    await chooseOption(renderer, "1 month");
    await pressExtend(renderer, `Extend to ${day(addMonths(today(), 1))}`);

    expect(savedEnd()).toBe(toStoredDate(addMonths(today(), 1)));
  });

  describe("Choose a date", () => {
    // The calendar opens on the month of the earliest day, so fix "today" in the
    // middle of a month: no test then depends on the day it is run
    beforeEach(() => {
      jest.useFakeTimers({
        now: new Date(2026, 8, 15, 12, 0, 0),
        doNotFake: [
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
        ],
      });
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it("turns the button into Choose a date, which opens the calendar", async () => {
      const end = addDays(today(), 10);
      const { renderer } = await openSheet(rentalEnding(end));

      await chooseOption(renderer, "Choose a date");
      expect(selectedOptions(renderer)).toEqual(["Choose a date"]);
      expect(allTexts(renderer.root).some((text) => text.startsWith("Extend to"))).toBe(false);

      await pressLabel(renderer, "Choose a date");
      expect(allTexts(renderer.root)).toContain("New end date");
      expect(allTexts(renderer.root)).toContain("Done");
    });

    it("saves the day picked, which can be the day after the current end and not earlier", async () => {
      const end = addDays(today(), 10);
      const { renderer } = await openSheet(rentalEnding(end));
      await chooseOption(renderer, "Choose a date");
      await pressLabel(renderer, "Choose a date");

      // The end date itself and the days before it can't be chosen
      expect(dayButton(renderer, end).props.accessibilityState.disabled).toBe(true);
      const next = addDays(end, 1);
      expect(dayButton(renderer, next).props.accessibilityState.disabled).toBe(false);

      await act(async () => {
        dayButton(renderer, next).props.onPress();
      });
      await pressLabel(renderer, "Done");

      expect(savedEnd()).toBe(toStoredDate(next));
    });

    it("counts the earliest day from today for a rental that has ended", async () => {
      const end = addDays(today(), -5);
      const { renderer } = await openSheet(rentalEnding(end));
      await chooseOption(renderer, "Choose a date");
      await pressLabel(renderer, "Choose a date");

      // Today is over for this rental's purposes: the first day that can be chosen is tomorrow
      expect(dayButton(renderer, today()).props.accessibilityState.disabled).toBe(true);
      expect(dayButton(renderer, addDays(today(), 1)).props.accessibilityState.disabled).toBe(false);
    });

    it("changes nothing when the calendar is cancelled", async () => {
      const end = addDays(today(), 10);
      const { renderer } = await openSheet(rentalEnding(end));
      await chooseOption(renderer, "Choose a date");
      await pressLabel(renderer, "Choose a date");

      await pressLabel(renderer, "Cancel");
      await flushPromises();

      expect(savedEnd()).toBe(toStoredDate(end));
    });
  });

  it("is only offered for rentals that haven't been sold", () => {
    const end = addDays(today(), 10);
    const texts = (piano: PianoItem) => allTexts(openDetail(piano).renderer.root);

    expect(texts(makePiano({ $id: "piano-1" }))).not.toContain("Extend rental");
    expect(texts(rentalEnding(end, { sold_date: toStoredDate(today()) as any }))).not.toContain("Extend rental");
    expect(queryAllByText(openDetail(rentalEnding(end)).renderer.root, "Extend rental").length).toBeGreaterThan(0);
  });
});
