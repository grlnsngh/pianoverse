jest.mock("expo-notifications", () => require("./helpers/fakeNotifications").createFakeNotificationsModule());
jest.mock("react-native-appwrite", () => require("./helpers/fakeAppwrite").createFakeAppwriteModule());
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
import BulkOperationsBar from "@/components/BulkOperationsBar";
import { selectAllItems, setBulkSelectionMode, setFilteredPianoListItems } from "@/redux/pianos/actions";
import { PianoItem } from "@/redux/pianos/types";
import { a11yProblems, describeProblems } from "./helpers/a11y";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureToastCalls,
  createTestStore,
  dialogOf,
  flushPromises,
  pressDialog,
  pressText,
  renderWithStore,
  typeInto,
} from "./helpers/render";

/**
 * Selling or deleting a piano while a deposit is still held for its rental
 * (canvas page "Security deposits"). Today is 29 September 2026.
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
    rental_period_start: "2026-09-01" as any,
    rental_period_end: "2027-02-28" as any,
    rental_price: 4500,
    ...extra,
  });
const withDeposit = (extra: Record<string, unknown> = {}) =>
  rental({ rental_deposit: 9000, deposit_received_on: "2026-09-01" as any, ...extra });

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 12, 0, 0),
    doNotFake: ["setImmediate", "nextTick"],
  });
  jest.clearAllMocks();
  fakeBackend.reset();
  fakeNotifications.reset();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const saved = () => fakeBackend.documents.get("piano-1") as any;
const kept = () => [...fakeBackend.history.values()] as any[];
const has = (renderer: ReactTestRenderer, text: string) => allTexts(renderer.root).includes(text);
const waitForDialog = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(350);
  });

const openDetail = async (piano: PianoItem) => {
  fakeBackend.documents.set(piano.$id, { ...piano });
  const store = createTestStore({ user: testUser, items: [piano] });
  const renderer = renderWithStore(<DetailScreen />, store);
  await flushPromises();
  return renderer;
};

const sheetIsOpen = (renderer: ReactTestRenderer, title: string) =>
  renderer.root.findAll((node) => (node.props as any).title === title && (node.props as any).visible === true).length > 0;

const confirmSale = async (renderer: ReactTestRenderer) => {
  typeInto(renderer.root, "Buyer", "Vikram Sethi");
  typeInto(renderer.root, "Sale price", "50000");
  const button = renderer.root
    .findAll((node) => node.props.accessibilityLabel === "Confirm sale" && typeof node.props.onPress === "function")
    .pop()!;
  await act(async () => {
    await button.props.onPress();
  });
  await flushPromises();
};

describe("Mark as sold, while a deposit is held", () => {
  it("asks first, saying whose deposit it is and what the choices do", async () => {
    const renderer = await openDetail(withDeposit());

    await pressText(renderer.root, "Mark as sold");

    expect(dialogOf(renderer.root)).toEqual({
      title: "A deposit is still held",
      message:
        "Asha Mehta’s ₹9,000 deposit hasn’t been settled. Mark the piano as returned first to refund it, or sell it and settle the deposit later from its history.",
      actions: ["Mark as returned", "Sell anyway", "Cancel"],
    });
    expect(sheetIsOpen(renderer, "Mark as sold")).toBe(false);
  });

  it("opens Mark as returned from the question, to refund it first", async () => {
    const renderer = await openDetail(withDeposit());
    await pressText(renderer.root, "Mark as sold");

    await pressDialog(renderer.root, "Mark as returned");
    await flushPromises();

    expect(sheetIsOpen(renderer, "Mark as returned")).toBe(true);
    expect(sheetIsOpen(renderer, "Mark as sold")).toBe(false);
  });

  it("opens Mark as sold from the question, saying where the deposit goes", async () => {
    const renderer = await openDetail(withDeposit());
    await pressText(renderer.root, "Mark as sold");

    await pressDialog(renderer.root, "Sell anyway");
    await flushPromises();

    expect(sheetIsOpen(renderer, "Mark as sold")).toBe(true);
    expect(has(renderer, "The ₹9,000 deposit is kept in Asha Mehta’s rental history as not settled. Settle it there with Edit rental.")).toBe(true);
  });

  it("changes nothing when the question is cancelled", async () => {
    const renderer = await openDetail(withDeposit());
    await pressText(renderer.root, "Mark as sold");

    await pressDialog(renderer.root, "Cancel");
    await flushPromises();

    expect(sheetIsOpen(renderer, "Mark as sold")).toBe(false);
    expect(sheetIsOpen(renderer, "Mark as returned")).toBe(false);
    expect(saved().sold_date).toBeUndefined();
  });

  it("sells it, keeping the deposit in the rental's history as not settled and taking it off the piano", async () => {
    const renderer = await openDetail(withDeposit());
    await pressText(renderer.root, "Mark as sold");
    await pressDialog(renderer.root, "Sell anyway");
    await flushPromises();

    await confirmSale(renderer);

    expect(saved()).toMatchObject({ sold_date: "2026-09-29", sold_price: 50000, sold_to_name: "Vikram Sethi" });
    expect(saved().rental_deposit).toBeNull();
    expect(saved().deposit_received_on).toBeNull();
    expect(kept()).toHaveLength(1);
    expect(kept()[0]).toMatchObject({
      piano_id: "piano-1",
      customer_name: "Asha Mehta",
      period_start: "2026-09-01",
      period_end: "2026-09-29",
      reason: "ended",
      closed_on: "2026-09-29",
      deposit: 9000,
    });
    expect(kept()[0]).not.toHaveProperty("deposit_refunded");
  });

  it("takes the deposit back to the piano with Undo, and the kept rental away", async () => {
    const toasts = captureToastCalls();
    const renderer = await openDetail(withDeposit());
    await pressText(renderer.root, "Mark as sold");
    await pressDialog(renderer.root, "Sell anyway");
    await flushPromises();
    await confirmSale(renderer);
    expect(kept()).toHaveLength(1);

    const undo = toasts.find((toast) => toast.action?.label === "Undo")!;
    await act(async () => {
      await undo.action!.onPress();
    });
    await flushPromises();

    expect(saved().sold_date).toBeNull();
    expect(saved()).toMatchObject({ rental_deposit: 9000, deposit_received_on: "2026-09-01" });
    expect(kept()).toEqual([]);
  });

  it("doesn't ask for a piano whose rental holds no deposit, and keeps nothing", async () => {
    const renderer = await openDetail(rental());

    await pressText(renderer.root, "Mark as sold");
    await flushPromises();

    expect(dialogOf(renderer.root)).toBeNull();
    expect(sheetIsOpen(renderer, "Mark as sold")).toBe(true);
    expect(has(renderer, "Settle it there with Edit rental.")).toBe(false);
    await confirmSale(renderer);
    expect(saved()).toMatchObject({ sold_price: 50000 });
    expect(kept()).toEqual([]);
  });

  it("names the deposit without a name when there is no customer", async () => {
    const renderer = await openDetail(withDeposit({ rental_customer_name: "" }));

    await pressText(renderer.root, "Mark as sold");

    expect(dialogOf(renderer.root)?.message).toContain("The ₹9,000 deposit hasn’t been settled.");
  });

  it("is usable: named, a role, big enough", async () => {
    const renderer = await openDetail(withDeposit());
    await pressText(renderer.root, "Mark as sold");
    await pressDialog(renderer.root, "Sell anyway");
    await flushPromises();

    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });
});

describe("deleting a piano while a deposit is held", () => {
  it("says the deposit goes with it", async () => {
    const renderer = await openDetail(withDeposit());

    await pressText(renderer.root, "Delete piano");
    await waitForDialog();

    expect(dialogOf(renderer.root)).toMatchObject({
      title: "Delete Kawai K-300?",
      message:
        "This removes the piano, its photos and its payments. Asha Mehta’s ₹9,000 deposit is still held: it is removed too, so settle it first. This can’t be undone.",
    });
  });

  it("says what it always did when no deposit is held", async () => {
    const renderer = await openDetail(rental());

    await pressText(renderer.root, "Delete piano");
    await waitForDialog();

    expect(dialogOf(renderer.root)?.message).toBe(
      "This removes the piano, its photos and its payments. This can’t be undone."
    );
  });
});

describe("deleting several pianos while deposits are held", () => {
  const pianos = [
    withDeposit({ $id: "a", title: "Piano a" }),
    withDeposit({ $id: "b", title: "Piano b", rental_deposit: 5000 }),
    rental({ $id: "c", title: "Piano c" }),
  ];

  const choose = async (selected: string[]) => {
    const store = createTestStore({ user: testUser, items: pianos });
    act(() => {
      store.dispatch(setFilteredPianoListItems(pianos) as any);
      store.dispatch(setBulkSelectionMode(true) as any);
      store.dispatch(selectAllItems(selected) as any);
    });
    const renderer = renderWithStore(<BulkOperationsBar onRefresh={jest.fn()} />, store);
    await flushPromises();
    return renderer;
  };

  it("says how much is held for the pianos chosen, in the singular for one", async () => {
    const one = await choose(["a"]);
    await pressText(one.root, "Delete 1 piano");
    expect(dialogOf(one.root)?.message).toBe(
      "Its photos and payments are removed too. ₹9,000 of deposits still held for its rental is removed too, so settle it first. This can’t be undone."
    );
  });

  it("says how much is held for several", async () => {
    const two = await choose(["a", "b", "c"]);
    await pressText(two.root, "Delete 3 pianos");
    expect(dialogOf(two.root)?.message).toBe(
      "Their photos and payments are removed too. ₹14,000 of deposits still held for 2 of the rentals are removed too, so settle them first. This can’t be undone."
    );
  });

  it("says nothing about deposits when none is held for the pianos chosen", async () => {
    const renderer = await choose(["c"]);
    await pressText(renderer.root, "Delete 1 piano");

    expect(dialogOf(renderer.root)?.message).toBe("Its photos and payments are removed too. This can’t be undone.");
  });
});
