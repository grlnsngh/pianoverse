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
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  return (props: any) => React.createElement("DateTimePicker", props);
});

import React from "react";
import { act, ReactTestRenderer } from "react-test-renderer";
import { addDays } from "date-fns";
import DetailScreen from "@/app/detail/[id]";
import * as appwrite from "@/lib/appwrite";
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
  pressText,
  renderWithStore,
} from "./helpers/render";

const inDays = (days: number) => toStoredDate(addDays(new Date(), days));

const rental = makePiano({
  $id: "piano-1",
  title: "Kawai K-300",
  category: "rentable",
  rental_customer_name: "Asha Mehta",
  rental_customer_mobile: "9876543210",
  rental_period_start: inDays(-30) as any,
  rental_period_end: inDays(30) as any,
  rental_price: 4000,
});

const warehouse = makePiano({
  $id: "piano-1",
  title: "Yamaha U1",
  category: "warehouse",
});

let alerts: ReturnType<typeof captureAlerts>;

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  fakeNotifications.reset();
  alerts = captureAlerts();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const seedPayment = (
  id: string,
  paidOn: string,
  amount: number,
  extra: Record<string, unknown> = {}
) =>
  fakeBackend.payments.set(id, {
    $id: id,
    $createdAt: "2026-09-01T00:00:00.000+00:00",
    piano_id: "piano-1",
    creator: testUser.accountId,
    amount,
    paid_on: paidOn,
    ...extra,
  });

const field = (renderer: ReactTestRenderer, title: string) => {
  const [node] = renderer.root.findAll(
    (candidate) =>
      candidate.props.title === title &&
      typeof candidate.props.handleChangeText === "function"
  );
  if (!node) throw new Error(`No field titled "${title}"`);
  return node;
};

const typeInto = (renderer: ReactTestRenderer, title: string, text: string) =>
  act(() => {
    field(renderer, title).props.handleChangeText(text);
  });

const pressButton = async (renderer: ReactTestRenderer, title: string) => {
  const [button] = renderer.root.findAll(
    (node) =>
      node.props.title === title && typeof node.props.handlePress === "function"
  );
  if (!button) throw new Error(`No "${title}" button`);
  await act(async () => {
    await button.props.handlePress();
  });
  await flushPromises();
};

// Presses and holds the payment whose row says `text`: how a payment is deleted
const holdPayment = async (renderer: ReactTestRenderer, text: string) => {
  const [row] = renderer.root.findAll(
    (node) =>
      typeof node.props.onLongPress === "function" &&
      (node.props.accessibilityLabel ?? "").includes(text)
  );
  if (!row) throw new Error(`No payment row with "${text}"`);
  await act(async () => {
    await row.props.onLongPress();
  });
  await flushPromises();
};

const openDetail = async (
  piano: PianoItem = rental,
  user: typeof testUser | null = testUser
) => {
  fakeBackend.documents.set(piano.$id, { ...piano });
  const store = createTestStore({ user, items: [piano] });
  const renderer = renderWithStore(<DetailScreen />, store);
  await flushPromises();
  return { store, renderer };
};

describe("rent payment data", () => {
  it("saves a payment with a number for the amount and a calendar day", async () => {
    const payment = await appwrite.createRentPayment({
      pianoId: "piano-1",
      creator: "account-1",
      amount: 4000,
      paidOn: new Date(2026, 8, 5),
      note: "Cash",
    });

    expect(fakeBackend.payments.get(payment.$id)).toMatchObject({
      piano_id: "piano-1",
      creator: "account-1",
      amount: 4000,
      paid_on: "2026-09-05",
      note: "Cash",
    });
  });

  it("leaves out the note when there is none", async () => {
    const payment = await appwrite.createRentPayment({
      pianoId: "piano-1",
      creator: "account-1",
      amount: 4000,
      paidOn: new Date(2026, 8, 5),
    });

    expect(fakeBackend.payments.get(payment.$id)).not.toHaveProperty("note");
  });

  it("lists the payments of one piano, newest first", async () => {
    seedPayment("older", "2026-07-05", 4000);
    seedPayment("newer", "2026-08-05", 5000);
    seedPayment("other-piano", "2026-08-06", 900, { piano_id: "piano-2" });

    const payments = await appwrite.getRentPayments("piano-1");

    expect(payments.map((payment) => payment.$id)).toEqual(["newer", "older"]);
  });

  it("finds every payment, not just the first page", async () => {
    for (let i = 0; i < 130; i++) {
      seedPayment(`p-${i}`, "2026-01-01", 100);
    }

    expect(await appwrite.getRentPayments("piano-1")).toHaveLength(130);
  });

  it("deletes a payment", async () => {
    seedPayment("gone", "2026-07-05", 4000);
    seedPayment("kept", "2026-08-05", 5000);

    await appwrite.deleteRentPayment("gone");

    expect([...fakeBackend.payments.keys()]).toEqual(["kept"]);
  });

  it("deletes a piano's payments along with the piano", async () => {
    fakeBackend.documents.set("piano-1", { ...rental });
    seedPayment("mine", "2026-07-05", 4000);
    seedPayment("theirs", "2026-08-05", 900, { piano_id: "piano-2" });

    await appwrite.deletePianoEntry({ ...rental, image_url: "" });

    expect(fakeBackend.documents.has("piano-1")).toBe(false);
    expect([...fakeBackend.payments.keys()]).toEqual(["theirs"]);
  });

  it("still deletes the piano when its payments can't be cleared", async () => {
    fakeBackend.documents.set("piano-1", { ...rental });
    fakeBackend.missingCollections.add("rent_payments");

    await appwrite.deletePianoEntry({ ...rental, image_url: "" });

    expect(fakeBackend.documents.has("piano-1")).toBe(false);
  });
});

describe("rent payments on the Detail screen", () => {
  it("says so when a rented piano has no payments yet", async () => {
    const { renderer } = await openDetail();

    const texts = allTexts(renderer.root);
    expect(texts).toContain("Payments");
    expect(texts).toContain("No payments recorded yet");
    // The main action of a rented piano's page, in the bar at the bottom
    expect(texts).toContain("Record payment");
  });

  it("is only shown for rented pianos", async () => {
    seedPayment("p", "2026-08-05", 5000);
    const { renderer } = await openDetail(warehouse);

    expect(allTexts(renderer.root)).not.toContain("Payments");
    expect(allTexts(renderer.root)).not.toContain("Record payment");
    expect(fakeBackend.listCalls).toEqual([]);
  });

  it("lists the payments, newest first, with what has been received", async () => {
    seedPayment("older", "2026-07-05", 3500, { note: "Cash" });
    seedPayment("newer", "2026-08-05", 5000, { note: "UPI" });
    seedPayment("other-piano", "2026-08-06", 900, { piano_id: "piano-2" });
    const { renderer } = await openDetail();

    const texts = allTexts(renderer.root);
    expect(texts).toContain("₹8,500 received · 2 payments");
    expect(texts).toContain("5 Aug 2026");
    expect(texts).toContain("UPI");
    expect(texts).not.toContain("₹900");
    expect(texts.indexOf("₹5,000")).toBeLessThan(texts.indexOf("₹3,500"));
    expect(texts).not.toContain("No payments recorded yet");
  });

  it("records a payment, suggesting the rent", async () => {
    const toasts = captureToasts();
    const { renderer } = await openDetail();

    await pressText(renderer.root, "Record payment");
    expect(field(renderer, "Amount").props.value).toBe("4000");
    typeInto(renderer, "Note", "  Cash ");
    await pressButton(renderer, "Save Payment");

    expect(alerts.titles()).toEqual([]);
    expect([...fakeBackend.payments.values()]).toEqual([
      expect.objectContaining({
        piano_id: "piano-1",
        creator: "account-1",
        amount: 4000,
        paid_on: toStoredDate(new Date()),
        note: "Cash",
      }),
    ]);
    expect(toasts).toEqual(["Payment recorded"]);

    const texts = allTexts(renderer.root);
    expect(texts).toContain("₹4,000 received · 1 payment");
    expect(texts).toContain("Cash");
    expect(texts).not.toContain("No payments recorded yet");
  });

  it("lets the rest of the app know when a payment is recorded or deleted", async () => {
    const { store, renderer } = await openDetail();
    expect(store.getState().payments.changeCount).toBe(0);

    await pressText(renderer.root, "Record payment");
    await pressButton(renderer, "Save Payment");
    expect(store.getState().payments.changeCount).toBe(1);

    await holdPayment(renderer, "₹4,000");
    await alerts.pressButton("Delete");
    expect(store.getState().payments.changeCount).toBe(2);
  });

  it("doesn't say anything changed when saving fails", async () => {
    const { store, renderer } = await openDetail();

    await pressText(renderer.root, "Record payment");
    fakeBackend.missingCollections.add("rent_payments");
    await pressButton(renderer, "Save Payment");

    expect(store.getState().payments.changeCount).toBe(0);
  });

  it("records a different amount than the rent", async () => {
    const { renderer } = await openDetail();

    await pressText(renderer.root, "Record payment");
    typeInto(renderer, "Amount", "2500.5");
    await pressButton(renderer, "Save Payment");

    expect([...fakeBackend.payments.values()][0].amount).toBe(2500.5);
    expect(allTexts(renderer.root)).toContain("₹2,500.5 received · 1 payment");
  });

  it("needs an amount", async () => {
    const { renderer } = await openDetail();

    await pressText(renderer.root, "Record payment");
    typeInto(renderer, "Amount", "");
    await pressButton(renderer, "Save Payment");

    expect(alerts.titles()).toEqual(["Missing Details"]);
    expect(alerts.spy.mock.calls[0][1]).toBe("Please enter the amount.");
    expect(fakeBackend.payments.size).toBe(0);
  });

  it("asks to sign in again when nobody is signed in", async () => {
    const { renderer } = await openDetail(rental, null);

    await pressText(renderer.root, "Record payment");
    await pressButton(renderer, "Save Payment");

    expect(alerts.titles()).toEqual(["Couldn't Save"]);
    expect(alerts.spy.mock.calls[0][1]).toBe("Please sign in again.");
    expect(fakeBackend.payments.size).toBe(0);
  });

  it("keeps the sheet open and says so when the payment can't be saved", async () => {
    const { renderer } = await openDetail();

    await pressText(renderer.root, "Record payment");
    fakeBackend.missingCollections.add("rent_payments");
    await pressButton(renderer, "Save Payment");

    expect(alerts.titles()).toEqual(["Couldn't Save"]);
    expect(field(renderer, "Amount")).toBeTruthy();
  });

  it("deletes a payment after asking", async () => {
    const toasts = captureToasts();
    seedPayment("p", "2026-08-05", 5000);
    const { renderer } = await openDetail();

    await holdPayment(renderer, "₹5,000");
    expect(alerts.titles()).toEqual(["Delete Payment"]);
    expect(fakeBackend.payments.size).toBe(1);
    await alerts.pressButton("Delete");

    expect(fakeBackend.payments.size).toBe(0);
    expect(toasts).toEqual(["Payment deleted"]);
    expect(allTexts(renderer.root)).toContain("No payments recorded yet");
  });

  it("keeps the payment when the delete is cancelled", async () => {
    seedPayment("p", "2026-08-05", 5000);
    const { renderer } = await openDetail();

    await holdPayment(renderer, "₹5,000");
    await alerts.pressButton("Cancel");

    expect(fakeBackend.payments.size).toBe(1);
    expect(allTexts(renderer.root)).toContain("₹5,000 received · 1 payment");
  });

  it("says so when the payments can't be loaded, and tries again", async () => {
    fakeBackend.missingCollections.add("rent_payments");
    const { renderer } = await openDetail();

    expect(allTexts(renderer.root)).toContain("Couldn't load payments");
    expect(allTexts(renderer.root)).not.toContain("No payments recorded yet");

    fakeBackend.missingCollections.clear();
    seedPayment("p", "2026-08-05", 5000);
    await pressText(renderer.root, "Retry");

    expect(allTexts(renderer.root)).toContain("₹5,000 received · 1 payment");
    expect(allTexts(renderer.root)).not.toContain("Couldn't load payments");
  });
});

describe("the Payments section (Detail board)", () => {
  const seedMany = (count: number) =>
    Array.from({ length: count }, (_, i) =>
      seedPayment(`p${i}`, `2026-0${(i % 8) + 1}-05`, 1000 * (i + 1), { $createdAt: `2026-09-0${i + 1}T00:00:00.000+00:00` })
    );
  // One entry per row: a pressable is more than one node in the test tree
  const isRow = (node: any) =>
    typeof node?.props.onLongPress === "function" && typeof node.props.accessibilityHint === "string";
  const rows = (renderer: ReactTestRenderer) =>
    renderer.root.findAll((node) => isRow(node) && !isRow(node.parent));

  it("shows the latest three payments and offers the rest", async () => {
    seedMany(5);
    const { renderer } = await openDetail();

    expect(rows(renderer)).toHaveLength(3);
    expect(allTexts(renderer.root)).toContain("Show all 5 payments");
  });

  it("shows every payment on Show all, and folds them back on Show fewer", async () => {
    seedMany(5);
    const { renderer } = await openDetail();

    await pressText(renderer.root, "Show all 5 payments");
    expect(rows(renderer)).toHaveLength(5);
    expect(allTexts(renderer.root)).toContain("Show fewer");

    await pressText(renderer.root, "Show fewer");
    expect(rows(renderer)).toHaveLength(3);
  });

  it("has no Show all for three payments or fewer", async () => {
    seedMany(3);
    const { renderer } = await openDetail();

    expect(rows(renderer)).toHaveLength(3);
    expect(allTexts(renderer.root).some((text) => /^Show (all|fewer)/.test(text))).toBe(false);
  });

  it("says how to delete a payment, since no button does", async () => {
    seedPayment("p", "2026-08-05", 5000);
    const { renderer } = await openDetail();

    expect(allTexts(renderer.root)).toContain("Press and hold a payment to delete it.");
    expect(rows(renderer)[0].props.accessibilityHint).toBe("Press and hold to delete this payment");
  });

  it("doesn't say it when there are no payments to delete", async () => {
    const { renderer } = await openDetail();

    expect(allTexts(renderer.root)).not.toContain("Press and hold a payment to delete it.");
  });

  it("lets a screen reader delete a payment with an action, too", async () => {
    seedPayment("p", "2026-08-05", 5000);
    const { renderer } = await openDetail();
    const [row] = rows(renderer);

    expect(row.props.accessibilityActions).toEqual([{ name: "delete", label: "Delete payment" }]);
    await act(async () => {
      row.props.onAccessibilityAction({ nativeEvent: { actionName: "delete" } });
    });

    expect(alerts.titles()).toEqual(["Delete Payment"]);
  });

  it("reads a payment as its day, its note and its amount", async () => {
    seedPayment("p", "2026-08-05", 5000, { note: "UPI" });
    const { renderer } = await openDetail();

    expect(rows(renderer)[0].props.accessibilityLabel).toBe("5 Aug 2026, UPI, ₹5,000");
  });
});
