jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);
jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
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

import React from "react";
import { act, ReactTestRenderer } from "react-test-renderer";
import DetailScreen from "@/app/detail/[id]";
import DatePickerSheet from "@/components/ui/DatePickerSheet";
import * as appwrite from "@/lib/appwrite";
import { PianoItem } from "@/redux/pianos/types";
import { scheduleRentalDueNotification } from "@/services/notifications";
import { a11yProblems, describeProblems } from "./helpers/a11y";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  captureToastCalls,
  createTestStore,
  flushPromises,
  pickDate,
  pressLabel,
  pressText,
  renderWithStore,
} from "./helpers/render";

/**
 * Marking a rented piano as returned, from its page: the rental comes off, the
 * piano is in stock again, the rental is kept in its history, and Undo takes
 * it all back. Today is 29 September 2026.
 */

const rental = (extra: Record<string, unknown> = {}) =>
  makePiano({
    $id: "piano-1",
    title: "Kawai K-300",
    category: "rentable",
    creator: testUser.accountId,
    rental_customer_name: "Asha Mehta",
    rental_customer_mobile: "9876543210",
    rental_customer_address: "12 MG Road",
    rental_period_start: "2026-08-01" as any,
    rental_period_end: "2026-12-01" as any,
    rental_price: 4000,
    ...extra,
  });

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 12, 0, 0),
    doNotFake: ["setImmediate", "nextTick"],
  });
  jest.clearAllMocks();
  fakeBackend.reset();
  fakeNotifications.reset();
  captureAlerts();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const seedPayment = (paidOn: string, amount = 4000) => {
  const id = `p-${paidOn}`;
  fakeBackend.payments.set(id, {
    $id: id,
    $createdAt: `${paidOn}T09:00:00.000+00:00`,
    piano_id: "piano-1",
    creator: testUser.accountId,
    amount,
    paid_on: paidOn,
    customer_name: "Asha Mehta",
  });
};

const saved = () => fakeBackend.documents.get("piano-1") as any;
const kept = () => [...fakeBackend.history.values()] as any[];

const openDetail = async (piano: PianoItem = rental()) => {
  fakeBackend.documents.set(piano.$id, { ...piano });
  // The reminders the rental had when it was saved
  await scheduleRentalDueNotification(piano);
  const store = createTestStore({ user: testUser, items: [piano] });
  const renderer = renderWithStore(<DetailScreen />, store);
  await flushPromises();
  return { store, renderer };
};

const has = (renderer: ReactTestRenderer, text: string) => allTexts(renderer.root).includes(text);
const buttons = (renderer: ReactTestRenderer, label: string) =>
  renderer.root.findAll((node) => node.props.accessibilityLabel === label && typeof node.props.onPress === "function");
const sheetIsOpen = (renderer: ReactTestRenderer) =>
  renderer.root.findAll((node) => (node.props as any).title === "Mark as returned" && (node.props as any).visible === true)
    .length > 0;

/** The sheet takes 240 ms to leave, and what a menu row chose runs after 300 ms. */
const waitForSheetToLeave = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(350);
  });

/** Presses the row on the page that opens the sheet, then waits for the sheet to be up. */
const openSheet = async (renderer: ReactTestRenderer) => {
  await pressText(renderer.root, "Mark as returned");
  await flushPromises();
};

/** Presses the sheet's button (the last "Mark as returned" that can be pressed). */
const confirm = async (renderer: ReactTestRenderer) => {
  const pressable = buttons(renderer, "Mark as returned").pop();
  if (!pressable) throw new Error('No "Mark as returned" button');
  await act(async () => {
    await pressable.props.onPress();
  });
  await flushPromises();
};

describe("the action", () => {
  it("is on the page of a piano that has a rental", async () => {
    const { renderer } = await openDetail();

    expect(has(renderer, "Mark as returned")).toBe(true);
  });

  it("is in the ⋯ menu too, and opens the sheet once the menu has closed", async () => {
    const { renderer } = await openDetail();
    await pressLabel(renderer.root, "More options");
    const menu = renderer.root.findAll((node) => node.props.testID === "piano-actions-sheet" && "visible" in node.props)[0];
    const labels = menu
      .findAll((node) => typeof node.props.onPress === "function" && typeof node.props.accessibilityLabel === "string")
      .map((node) => node.props.accessibilityLabel as string);
    expect(labels.indexOf("Extend rental")).toBeLessThan(labels.indexOf("Mark as returned"));
    expect(labels.indexOf("Mark as returned")).toBeLessThan(labels.indexOf("Edit piano"));

    const row = menu.findAll(
      (node) => node.props.accessibilityLabel === "Mark as returned" && typeof node.props.onPress === "function"
    )[0];
    await act(async () => row.props.onPress());
    expect(sheetIsOpen(renderer)).toBe(false);
    await waitForSheetToLeave();

    expect(sheetIsOpen(renderer)).toBe(true);
  });

  it("is not on the page of a rentable piano with nothing on it, which is already in stock", async () => {
    const { renderer } = await openDetail(
      rental({
        rental_customer_name: null,
        rental_customer_mobile: null,
        rental_customer_address: null,
        rental_period_start: null,
        rental_period_end: null,
        rental_price: null,
      })
    );

    expect(has(renderer, "Mark as returned")).toBe(false);
  });

  it("is not on the page of a piano that isn't a rental, or one that was sold", async () => {
    expect(has((await openDetail(makePiano({ $id: "piano-1", category: "warehouse" }))).renderer, "Mark as returned")).toBe(false);
    expect(has((await openDetail(rental({ sold_date: "2026-09-10" }))).renderer, "Mark as returned")).toBe(false);
  });
});

describe("the sheet", () => {
  it("names the renter and the piano, and says what will happen", async () => {
    const { renderer } = await openDetail();

    await openSheet(renderer);

    expect(sheetIsOpen(renderer)).toBe(true);
    expect(has(renderer, "Asha Mehta · Kawai K-300")).toBe(true);
    expect(has(renderer, "The rental is saved in the piano’s history, and the piano goes back into stock.")).toBe(true);
  });

  it("says the piano came back today, unless the person says otherwise", async () => {
    const { renderer } = await openDetail();

    await openSheet(renderer);

    expect(has(renderer, "Today, 29 Sep 2026")).toBe(true);
  });

  it("lets the day be picked, from the start of the rental up to today", async () => {
    const { renderer } = await openDetail();
    await openSheet(renderer);

    await pressLabel(renderer.root, "Returned on, Today, 29 Sep 2026");

    const [calendar] = renderer.root.findAll((node) => node.type === DatePickerSheet && node.props.visible === true);
    expect(calendar.props.title).toBe("Returned on");
    expect(calendar.props.minimumDate).toEqual(new Date(2026, 7, 1));
    expect(calendar.props.maximumDate.getTime()).toBeGreaterThanOrEqual(new Date(2026, 8, 29).getTime());
    expect(calendar.props.maximumDate.getFullYear()).toBe(2026);
  });

  it("has no earliest day for a rental that starts in the future", async () => {
    const { renderer } = await openDetail(rental({ rental_period_start: "2027-01-10", rental_period_end: "2027-06-10" }));
    await openSheet(renderer);

    await pressLabel(renderer.root, "Returned on, Today, 29 Sep 2026");

    const [calendar] = renderer.root.findAll((node) => node.type === DatePickerSheet && node.props.visible === true);
    expect(calendar.props.minimumDate).toBeUndefined();
  });

  it("warns, in red, when the renter still owes rent, since that stops showing in Rent due", async () => {
    const { renderer } = await openDetail();
    expect(has(renderer, "₹4,000 due · 1 month, since 1 Sep")).toBe(true);

    await openSheet(renderer);

    expect(
      has(
        renderer,
        "Asha Mehta still owes ₹4,000 of rent. Once the piano is returned it no longer shows in Rent due."
      )
    ).toBe(true);
  });

  it("doesn't warn when the rent is paid up", async () => {
    seedPayment("2026-08-02");
    seedPayment("2026-09-03");
    const { renderer } = await openDetail();
    expect(has(renderer, "Rent is paid up")).toBe(true);

    await openSheet(renderer);

    expect(allTexts(renderer.root).some((text) => text.includes("still owes"))).toBe(false);
  });

  it("has names, roles and big enough targets", async () => {
    const { renderer } = await openDetail();
    await openSheet(renderer);

    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });
});

describe("marking the piano as returned", () => {
  it("takes the rental off the piano and keeps the piano a rentable one, in stock", async () => {
    const { renderer } = await openDetail();
    await openSheet(renderer);

    await confirm(renderer);

    expect(saved()).toMatchObject({
      category: "rentable",
      rental_customer_name: null,
      rental_customer_mobile: null,
      rental_customer_address: null,
      rental_period_start: null,
      rental_period_end: null,
      rental_price: null,
    });
  });

  it("closes the sheet, and the page has no rental on it any more", async () => {
    const { renderer } = await openDetail();
    expect(has(renderer, "Rental")).toBe(true);
    await openSheet(renderer);

    await confirm(renderer);
    await waitForSheetToLeave();

    expect(sheetIsOpen(renderer)).toBe(false);
    expect(has(renderer, "Rental")).toBe(false);
    expect(has(renderer, "Mark as returned")).toBe(false);
    // Her number and the actions about her rental are gone; she is an earlier renter now
    expect(has(renderer, "9876543210")).toBe(false);
    expect(buttons(renderer, "Remind customer")).toHaveLength(0);
    expect(buttons(renderer, "Extend rental").length).toBeGreaterThan(0);
  });

  it("says so, with Undo", async () => {
    const toasts = captureToastCalls();
    const { renderer } = await openDetail();
    await openSheet(renderer);

    await confirm(renderer);

    expect(toasts[0]).toMatchObject({
      message: "Piano marked as returned",
      variant: "success",
      duration: "long",
      action: { label: "Undo" },
    });
  });

  it("keeps the rental in the piano's history: who, when, the rent, the day it came back and why", async () => {
    const { renderer } = await openDetail();
    await openSheet(renderer);

    await confirm(renderer);

    expect(kept()).toHaveLength(1);
    expect(kept()[0]).toMatchObject({
      piano_id: "piano-1",
      piano_title: "Kawai K-300",
      creator: testUser.accountId,
      customer_name: "Asha Mehta",
      customer_mobile: "9876543210",
      customer_address: "12 MG Road",
      period_start: "2026-08-01",
      // It came back before the agreed end, so it ends the day it came back
      period_end: "2026-09-29",
      price: 4000,
      closed_on: "2026-09-29",
      reason: "returned",
    });
  });

  it("goes by the day that was picked", async () => {
    const { renderer } = await openDetail();
    await openSheet(renderer);

    await pickDate(renderer.root, "Returned on", new Date(2026, 8, 20));
    await confirm(renderer);

    expect(kept()[0]).toMatchObject({ closed_on: "2026-09-20", period_end: "2026-09-20" });
  });

  it("keeps the agreed end for a rental that had already ended", async () => {
    const { renderer } = await openDetail(rental({ rental_period_end: "2026-09-10" }));
    await openSheet(renderer);

    await confirm(renderer);

    expect(kept()[0]).toMatchObject({ period_end: "2026-09-10", closed_on: "2026-09-29" });
  });

  it("stops the rental's reminders", async () => {
    const { renderer } = await openDetail();
    expect(fakeNotifications.rentalReminders("piano-1").length).toBeGreaterThan(0);
    await openSheet(renderer);

    await confirm(renderer);

    expect(fakeNotifications.rentalReminders("piano-1")).toHaveLength(0);
  });

  it("tells the screens that show history to load it again, and the page then shows the renter as an earlier one", async () => {
    const { store, renderer } = await openDetail();
    expect(has(renderer, "Previous renters")).toBe(false);
    await openSheet(renderer);

    await confirm(renderer);

    expect(store.getState().payments.changeCount).toBe(1);
    expect(has(renderer, "Previous renters")).toBe(true);
  });

  it("keeps the payments the renter made", async () => {
    seedPayment("2026-08-02");
    const { renderer } = await openDetail();
    await openSheet(renderer);

    await confirm(renderer);

    expect(fakeBackend.payments.size).toBe(1);
    expect(has(renderer, "₹4,000 received · 1 payment")).toBe(true);
  });
});

describe("Undo", () => {
  it("puts the rental back on the piano, as it was, and takes the kept rental away", async () => {
    const toasts = captureToastCalls();
    const { renderer, store } = await openDetail();
    await openSheet(renderer);
    await confirm(renderer);
    expect(kept()).toHaveLength(1);

    await act(async () => {
      await toasts[0].action?.onPress();
    });
    await flushPromises();

    expect(saved()).toMatchObject({
      category: "rentable",
      rental_customer_name: "Asha Mehta",
      rental_customer_mobile: "9876543210",
      rental_customer_address: "12 MG Road",
      rental_period_start: "2026-08-01",
      rental_period_end: "2026-12-01",
      rental_price: 4000,
    });
    expect(kept()).toEqual([]);
    expect(toasts.map((toast) => [toast.message, toast.variant])).toEqual([
      ["Piano marked as returned", "success"],
      ["Return undone", "success"],
    ]);
    expect(has(renderer, "Rental")).toBe(true);
    expect(has(renderer, "Mark as returned")).toBe(true);
    // Once for the history kept, once for the history taken away
    expect(store.getState().payments.changeCount).toBe(2);
  });

  it("brings the reminders back", async () => {
    const toasts = captureToastCalls();
    const { renderer } = await openDetail();
    await openSheet(renderer);
    await confirm(renderer);
    expect(fakeNotifications.rentalReminders("piano-1")).toHaveLength(0);

    await act(async () => {
      await toasts[0].action?.onPress();
    });
    await flushPromises();

    expect(fakeNotifications.rentalReminders("piano-1").length).toBeGreaterThan(0);
  });

  it("puts the rental back even though it wasn't kept in the history", async () => {
    const toasts = captureToastCalls();
    fakeBackend.missingCollections.add("rental_history");
    const { renderer } = await openDetail();
    await openSheet(renderer);
    await confirm(renderer);

    await act(async () => {
      await toasts[0].action?.onPress();
    });
    await flushPromises();

    expect(saved().rental_customer_name).toBe("Asha Mehta");
    expect(toasts[toasts.length - 1].message).toBe("Return undone");
  });

  it("says so, with Retry, when it can't be undone, and Retry undoes it", async () => {
    const toasts = captureToastCalls();
    const { renderer } = await openDetail();
    await openSheet(renderer);
    await confirm(renderer);
    fakeBackend.failNextDocumentUpdate = true;

    await act(async () => {
      await toasts[0].action?.onPress();
    });
    await flushPromises();

    expect(saved().rental_customer_name).toBeNull();
    const failed = toasts[toasts.length - 1];
    expect(failed).toMatchObject({
      message: "Couldn’t undo. Check your connection.",
      variant: "error",
      action: { label: "Retry" },
    });

    await act(async () => {
      await failed.action?.onPress();
    });
    await flushPromises();

    expect(saved().rental_customer_name).toBe("Asha Mehta");
    expect(kept()).toEqual([]);
  });

  it("still puts the rental back when the kept rental can't be taken away", async () => {
    const toasts = captureToastCalls();
    const { renderer } = await openDetail();
    await openSheet(renderer);
    await confirm(renderer);
    jest.spyOn(appwrite, "deleteRentalHistoryEntry").mockRejectedValueOnce(new Error("offline"));

    await act(async () => {
      await toasts[0].action?.onPress();
    });
    await flushPromises();

    expect(saved().rental_customer_name).toBe("Asha Mehta");
    expect(toasts[toasts.length - 1].message).toBe("Return undone");
  });
});

describe("when it doesn't work", () => {
  it("says so, keeps the sheet open, and changes nothing, when the piano can't be saved", async () => {
    const toasts = captureToastCalls();
    const { renderer } = await openDetail();
    await openSheet(renderer);
    fakeBackend.failNextDocumentUpdate = true;

    await confirm(renderer);

    expect(toasts.map((toast) => [toast.message, toast.variant])).toEqual([
      ["Couldn’t save. Check your connection.", "error"],
    ]);
    expect(saved().rental_customer_name).toBe("Asha Mehta");
    expect(kept()).toEqual([]);
    expect(sheetIsOpen(renderer)).toBe(true);
    expect(fakeNotifications.rentalReminders("piano-1").length).toBeGreaterThan(0);

    // The sheet is still open, so pressing the button again works
    await confirm(renderer);
    expect(saved().rental_customer_name).toBeNull();
  });

  it("is still returned, and says the rental wasn't kept, when rental_history isn't set up", async () => {
    const toasts = captureToastCalls();
    fakeBackend.missingCollections.add("rental_history");
    const { renderer } = await openDetail();
    await openSheet(renderer);

    await confirm(renderer);

    expect(saved().rental_customer_name).toBeNull();
    const last = toasts[toasts.length - 1];
    expect(last.message).toBe(
      "Saved, but the old rental wasn’t kept: rental_history isn’t set up in Appwrite yet."
    );
    expect(last.variant).toBe("error");
  });

  it("is still returned, with a Retry that keeps the rental, when the history can't be reached", async () => {
    const toasts = captureToastCalls();
    jest.spyOn(appwrite, "createRentalHistory").mockRejectedValueOnce(new Error("Network request failed"));
    const { renderer } = await openDetail();
    await openSheet(renderer);

    await confirm(renderer);

    expect(saved().rental_customer_name).toBeNull();
    const last = toasts[toasts.length - 1];
    expect(last.message).toBe("Saved, but couldn’t keep the old rental in its history.");
    expect(last.action?.label).toBe("Retry");
    expect(kept()).toEqual([]);

    await act(async () => {
      await last.action?.onPress();
    });
    await flushPromises();

    expect(kept()).toHaveLength(1);
    expect(kept()[0]).toMatchObject({ customer_name: "Asha Mehta", reason: "returned" });
  });
});
