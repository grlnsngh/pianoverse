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
import { Linking } from "react-native";
import { act, ReactTestRenderer } from "react-test-renderer";
import DetailScreen from "@/app/detail/[id]";
import { updateRentPayment } from "@/lib/appwrite";
import { PianoItem } from "@/redux/pianos/types";
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
  renderWithStore,
} from "./helpers/render";

/**
 * Changing a payment that was recorded: from the choices that pressing and
 * holding it opens, in a sheet, saved with Undo. Today is 29 September 2026.
 */

const rental = makePiano({
  $id: "piano-1",
  title: "Kawai K-300",
  category: "rentable",
  rental_customer_name: "Asha Mehta",
  rental_customer_mobile: "9876543210",
  rental_period_start: "2026-08-01" as any,
  rental_period_end: "2026-12-01" as any,
  rental_price: 4000,
});

let alerts: ReturnType<typeof captureAlerts>;

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 12, 0, 0),
    doNotFake: ["setImmediate", "nextTick"],
  });
  jest.clearAllMocks();
  fakeBackend.reset();
  fakeNotifications.reset();
  alerts = captureAlerts();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(Linking, "openURL").mockResolvedValue(true);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const seedPayment = (id: string, paidOn: string, amount: number, extra: Record<string, unknown> = {}) =>
  fakeBackend.payments.set(id, {
    $id: id,
    $createdAt: `${paidOn}T09:00:00.000+00:00`,
    piano_id: "piano-1",
    creator: testUser.accountId,
    amount,
    paid_on: paidOn,
    customer_name: "Asha Mehta",
    ...extra,
  });
const saved = (id: string) => fakeBackend.payments.get(id) as any;

const openDetail = async (piano: PianoItem = rental) => {
  fakeBackend.documents.set(piano.$id, { ...piano });
  const store = createTestStore({ user: testUser, items: [piano] });
  const renderer = renderWithStore(<DetailScreen />, store);
  await flushPromises();
  return { store, renderer };
};

const field = (renderer: ReactTestRenderer, label: string) => {
  const [node] = renderer.root.findAll(
    (candidate) => candidate.props.accessibilityLabel === label && typeof candidate.props.onChangeText === "function"
  );
  if (!node) throw new Error(`No field named "${label}"`);
  return node;
};
const typeInto = (renderer: ReactTestRenderer, label: string, text: string) =>
  act(() => {
    field(renderer, label).props.onChangeText(text);
  });
const buttons = (renderer: ReactTestRenderer, label: string) =>
  renderer.root.findAll(
    (node) => node.props.accessibilityLabel === label && typeof node.props.onPress === "function"
  );
/** Whether a button is greyed out: a disabled one has no press handler, so it is read from its state. */
const disabled = (renderer: ReactTestRenderer, label: string) => {
  const node = renderer.root.findAll(
    (candidate) =>
      candidate.props.accessibilityLabel === label && candidate.props.accessibilityState?.disabled !== undefined
  )[0];
  if (!node) throw new Error(`No button labelled "${label}"`);
  return node.props.accessibilityState.disabled as boolean;
};

/** Presses and holds the payment whose row says `text`. */
const holdPayment = async (renderer: ReactTestRenderer, text: string) => {
  const [row] = renderer.root.findAll(
    (node) => typeof node.props.onLongPress === "function" && (node.props.accessibilityLabel ?? "").includes(text)
  );
  if (!row) throw new Error(`No payment row with "${text}"`);
  await act(async () => {
    await row.props.onLongPress();
  });
  await flushPromises();
};

/** The sheet takes 240 ms to leave, and what it chose runs after 300 ms. */
const waitForSheetToLeave = () =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(350);
  });

/** Holds a payment and chooses Edit payment: its sheet opens. */
const openEditor = async (renderer: ReactTestRenderer, text: string) => {
  await holdPayment(renderer, text);
  await pressLabel(renderer.root, "Edit payment");
  await waitForSheetToLeave();
  await flushPromises();
};

const press = async (renderer: ReactTestRenderer, label: string) => {
  const [button] = buttons(renderer, label);
  if (!button) throw new Error(`No "${label}" button`);
  await act(async () => {
    await button.props.onPress();
  });
  await flushPromises();
};

const has = (renderer: ReactTestRenderer, text: string) => allTexts(renderer.root).includes(text);
/** Whether the Edit payment sheet is open: a closed one keeps its content for a moment while it leaves. */
const editorIsOpen = (renderer: ReactTestRenderer) =>
  renderer.root.findAll((node) => (node.props as any).title === "Edit payment" && (node.props as any).visible === true)
    .length > 0;

describe("the choices pressing and holding a payment opens", () => {
  it("are send the receipt, edit and delete, under the amount and the day", async () => {
    seedPayment("p", "2026-08-05", 5000);
    const { renderer } = await openDetail();

    await holdPayment(renderer, "₹5,000");

    expect(has(renderer, "₹5,000 · 5 Aug 2026")).toBe(true);
    for (const label of ["Send receipt", "Edit payment", "Delete payment"]) {
      expect(buttons(renderer, label)).not.toHaveLength(0);
    }
  });

  it("send the receipt, as tapping the payment does", async () => {
    seedPayment("p", "2026-08-05", 5000);
    const { renderer } = await openDetail();

    await holdPayment(renderer, "₹5,000");
    await pressLabel(renderer.root, "Send receipt");
    await waitForSheetToLeave();

    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    expect(decodeURIComponent((Linking.openURL as jest.Mock).mock.calls[0][0])).toContain("Received ₹5,000");
  });

  it("have names, roles and big enough targets", async () => {
    seedPayment("p", "2026-08-05", 5000);
    const { renderer } = await openDetail();

    await holdPayment(renderer, "₹5,000");

    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });

  it("let a screen reader edit with an action, without the choices", async () => {
    seedPayment("p", "2026-08-05", 5000);
    const { renderer } = await openDetail();
    const [row] = renderer.root.findAll(
      (node) => typeof node.props.onLongPress === "function" && (node.props.accessibilityLabel ?? "").includes("₹5,000")
    );

    await act(async () => {
      row.props.onAccessibilityAction({ nativeEvent: { actionName: "edit" } });
    });
    await flushPromises();

    expect(has(renderer, "Edit payment")).toBe(true);
    expect(field(renderer, "Amount")).toBeTruthy();
  });
});

describe("the Edit payment sheet", () => {
  it("opens with the payment as it was recorded", async () => {
    seedPayment("p", "2026-08-05", 5000, { note: "UPI", customer_name: "Asha Mehta" });
    const { renderer } = await openDetail();

    await openEditor(renderer, "₹5,000");

    expect(has(renderer, "Edit payment")).toBe(true);
    expect(field(renderer, "Amount").props.value).toBe("5,000");
    expect(has(renderer, "5 Aug 2026")).toBe(true);
    expect(field(renderer, "Paid by").props.value).toBe("Asha Mehta");
    expect(field(renderer, "Note").props.value).toBe("UPI");
  });

  it("can't be saved until something is different", async () => {
    seedPayment("p", "2026-08-05", 5000);
    const { renderer } = await openDetail();
    await openEditor(renderer, "₹5,000");
    expect(disabled(renderer, "Save changes")).toBe(true);

    typeInto(renderer, "Note", "UPI");
    expect(disabled(renderer, "Save changes")).toBe(false);

    typeInto(renderer, "Note", "");
    expect(disabled(renderer, "Save changes")).toBe(true);
  });

  it("starts again from the payment that was opened, not the last one", async () => {
    seedPayment("a", "2026-08-05", 5000, { note: "First" });
    seedPayment("b", "2026-09-02", 4200, { note: "Second" });
    const { renderer } = await openDetail();

    await openEditor(renderer, "₹4,200");
    expect(field(renderer, "Note").props.value).toBe("Second");
    await press(renderer, "Cancel");
    await waitForSheetToLeave();

    await openEditor(renderer, "₹5,000");
    expect(field(renderer, "Note").props.value).toBe("First");
    expect(field(renderer, "Amount").props.value).toBe("5,000");
  });

  it("has names, roles and big enough targets", async () => {
    seedPayment("p", "2026-08-05", 5000);
    const { renderer } = await openDetail();
    await openEditor(renderer, "₹5,000");

    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });
});

describe("saving a change", () => {
  it("saves a new amount, shows it, tells the rest of the app, and says so", async () => {
    const toasts = captureToastCalls();
    seedPayment("p", "2026-08-05", 5000, { note: "UPI" });
    const { store, renderer } = await openDetail();
    await openEditor(renderer, "₹5,000");

    typeInto(renderer, "Amount", "4500");
    await press(renderer, "Save changes");

    expect(saved("p")).toMatchObject({ amount: 4500, paid_on: "2026-08-05", note: "UPI", customer_name: "Asha Mehta" });
    expect(has(renderer, "₹4,500 received · 1 payment")).toBe(true);
    expect(store.getState().payments.changeCount).toBe(1);
    expect(toasts.map((toast) => [toast.message, toast.variant])).toEqual([["Payment updated", "success"]]);
    expect(toasts[0].action?.label).toBe("Undo");
  });

  it("closes the sheet when it is saved", async () => {
    seedPayment("p", "2026-08-05", 5000);
    const { renderer } = await openDetail();
    await openEditor(renderer, "₹5,000");

    typeInto(renderer, "Amount", "4500");
    await press(renderer, "Save changes");
    await waitForSheetToLeave();

    expect(editorIsOpen(renderer)).toBe(false);
  });

  it("saves a new day, and puts the payments in the order of their days", async () => {
    seedPayment("a", "2026-08-05", 5000);
    seedPayment("b", "2026-09-02", 4200);
    const { renderer } = await openDetail();
    // A row is a few components deep, each passing the handler on: one entry per row
    const order = () =>
      renderer.root
        .findAll(
          (node) =>
            typeof node.props.onLongPress === "function" && typeof node.parent?.props.onLongPress !== "function"
        )
        .map((node) => node.props.accessibilityLabel as string);
    expect(order()).toEqual(["2 Sep 2026, ₹4,200", "5 Aug 2026, ₹5,000"]);

    await openEditor(renderer, "₹5,000");
    await pickDate(renderer.root, "Paid on", new Date(2026, 8, 20));
    await press(renderer, "Save changes");

    expect(saved("a").paid_on).toBe("2026-09-20");
    expect(order()).toEqual(["20 Sep 2026, ₹5,000", "2 Sep 2026, ₹4,200"]);
  });

  it("saves a corrected name, and cleans its spaces", async () => {
    seedPayment("p", "2026-08-05", 5000, { customer_name: "Asha Mehata" });
    const { renderer } = await openDetail();
    await openEditor(renderer, "₹5,000");

    typeInto(renderer, "Paid by", "  Asha   Mehta ");
    await press(renderer, "Save changes");

    expect(saved("p").customer_name).toBe("Asha Mehta");
  });

  it("gives a name to a payment that had none", async () => {
    seedPayment("p", "2026-08-05", 5000, { customer_name: null });
    const { renderer } = await openDetail();
    await openEditor(renderer, "₹5,000");
    expect(field(renderer, "Paid by").props.value).toBe("");

    typeInto(renderer, "Paid by", "Asha Mehta");
    await press(renderer, "Save changes");

    expect(saved("p").customer_name).toBe("Asha Mehta");
  });

  it("takes the note off with an empty one", async () => {
    seedPayment("p", "2026-08-05", 5000, { note: "UPI" });
    const { renderer } = await openDetail();
    await openEditor(renderer, "₹5,000");

    typeInto(renderer, "Note", "  ");
    await press(renderer, "Save changes");

    expect(saved("p").note).toBeNull();
  });

  it("sends only what changed, so it doesn't undo another change made meanwhile", async () => {
    seedPayment("p", "2026-08-05", 5000, { note: "UPI", customer_name: "Asha Mehta" });
    const { renderer } = await openDetail();
    await openEditor(renderer, "₹5,000");
    // The note is changed somewhere else while the sheet is open. The stored row is replaced,
    // not edited in place, since the fake backend hands the app the very object it stores
    fakeBackend.payments.set("p", { ...saved("p"), note: "Changed on another phone" });

    typeInto(renderer, "Amount", "4500");
    await press(renderer, "Save changes");

    expect(saved("p")).toMatchObject({ amount: 4500, note: "Changed on another phone", customer_name: "Asha Mehta" });
  });

  it("won't take an empty amount, and says so", async () => {
    seedPayment("p", "2026-08-05", 5000);
    const { renderer } = await openDetail();
    await openEditor(renderer, "₹5,000");

    typeInto(renderer, "Amount", "");
    await press(renderer, "Save changes");

    expect(alerts.titles()).toEqual(["Missing Details"]);
    expect(saved("p").amount).toBe(5000);
  });

  it("says which months an income moves between when the day goes into another month", async () => {
    seedPayment("p", "2026-09-03", 4000);
    const { renderer } = await openDetail();
    await openEditor(renderer, "₹4,000");
    expect(has(renderer, "This moves the payment from September 2026 to August 2026, so the income for both months changes.")).toBe(false);

    await pickDate(renderer.root, "Paid on", new Date(2026, 7, 20));
    expect(has(renderer, "This moves the payment from September 2026 to August 2026, so the income for both months changes.")).toBe(true);

    await pickDate(renderer.root, "Paid on", new Date(2026, 8, 25));
    expect(has(renderer, "This moves the payment from September 2026 to August 2026, so the income for both months changes.")).toBe(false);
  });
});

describe("when saving fails", () => {
  it("says so, keeps the sheet and what was typed, changes nothing, and works when tried again", async () => {
    const toasts = captureToastCalls();
    seedPayment("p", "2026-08-05", 5000);
    const { store, renderer } = await openDetail();
    await openEditor(renderer, "₹5,000");
    typeInto(renderer, "Amount", "4500");
    fakeBackend.failNextDocumentUpdate = true;

    await press(renderer, "Save changes");

    expect(saved("p").amount).toBe(5000);
    expect(store.getState().payments.changeCount).toBe(0);
    expect(toasts.map((toast) => [toast.message, toast.variant])).toEqual([
      ["Couldn’t save. Check your connection.", "error"],
    ]);
    expect(editorIsOpen(renderer)).toBe(true);
    expect(field(renderer, "Amount").props.value).toBe("4,500");
    expect(has(renderer, "₹5,000 received · 1 payment")).toBe(true);

    await press(renderer, "Save changes");
    await waitForSheetToLeave();

    expect(saved("p").amount).toBe(4500);
    expect(editorIsOpen(renderer)).toBe(false);
    expect(has(renderer, "₹4,500 received · 1 payment")).toBe(true);
  });
});

describe("undoing a change", () => {
  const edit = async (renderer: ReactTestRenderer, change: () => void) => {
    await openEditor(renderer, "₹5,000");
    change();
    await press(renderer, "Save changes");
  };

  it("puts back every field that was changed", async () => {
    const toasts = captureToastCalls();
    seedPayment("p", "2026-08-05", 5000, { note: "UPI", customer_name: "Asha Mehata" });
    const { store, renderer } = await openDetail();

    await edit(renderer, () => {
      typeInto(renderer, "Amount", "4500");
      typeInto(renderer, "Paid by", "Asha Mehta");
      typeInto(renderer, "Note", "");
    });
    expect(saved("p")).toMatchObject({ amount: 4500, customer_name: "Asha Mehta", note: null });

    await act(async () => {
      await toasts[0].action?.onPress();
    });
    await flushPromises();

    expect(saved("p")).toMatchObject({ amount: 5000, customer_name: "Asha Mehata", note: "UPI", paid_on: "2026-08-05" });
    expect(has(renderer, "₹5,000 received · 1 payment")).toBe(true);
    expect(store.getState().payments.changeCount).toBe(2);
    expect(toasts.map((toast) => toast.message)).toEqual(["Payment updated", "Change undone"]);
  });

  it("puts back the day too", async () => {
    const toasts = captureToastCalls();
    seedPayment("p", "2026-08-05", 5000);
    const { renderer } = await openDetail();

    await openEditor(renderer, "₹5,000");
    await pickDate(renderer.root, "Paid on", new Date(2026, 8, 20));
    await press(renderer, "Save changes");
    expect(saved("p").paid_on).toBe("2026-09-20");

    await act(async () => {
      await toasts[0].action?.onPress();
    });
    await flushPromises();

    expect(saved("p").paid_on).toBe("2026-08-05");
  });

  it("says so when it can't be undone, and leaves the change", async () => {
    const toasts = captureToastCalls();
    seedPayment("p", "2026-08-05", 5000);
    const { renderer } = await openDetail();
    await edit(renderer, () => typeInto(renderer, "Amount", "4500"));
    fakeBackend.failNextDocumentUpdate = true;

    await act(async () => {
      await toasts[0].action?.onPress();
    });
    await flushPromises();

    expect(saved("p").amount).toBe(4500);
    expect(toasts.map((toast) => [toast.message, toast.variant])).toEqual([
      ["Payment updated", "success"],
      ["Couldn’t undo the change. Check your connection.", "error"],
    ]);
  });
});

describe("what a corrected payment does for the rent due", () => {
  it("clears the rent due on the piano's page once a misspelled name is put right", async () => {
    // Recorded under a misspelled name, so it isn't counted for Asha Mehta
    seedPayment("aug", "2026-08-02", 4000, { customer_name: "Asha Mehata" });
    seedPayment("sep", "2026-09-03", 4000, { customer_name: "Asha Mehata" });
    const { renderer } = await openDetail();
    expect(has(renderer, "₹4,000 due · 1 month, since 1 Sep")).toBe(true);

    await holdPayment(renderer, "3 Sep 2026");
    await pressLabel(renderer.root, "Edit payment");
    await waitForSheetToLeave();
    await flushPromises();
    typeInto(renderer, "Paid by", "Asha Mehta");
    await press(renderer, "Save changes");

    expect(has(renderer, "Rent is paid up")).toBe(true);
    expect(has(renderer, "₹4,000 due · 1 month, since 1 Sep")).toBe(false);
  });

  it("changes what is due when the amount is corrected", async () => {
    seedPayment("aug", "2026-08-02", 4000);
    seedPayment("sep", "2026-09-03", 4000);
    const { renderer } = await openDetail();
    expect(has(renderer, "Rent is paid up")).toBe(true);

    await holdPayment(renderer, "3 Sep 2026");
    await pressLabel(renderer.root, "Edit payment");
    await waitForSheetToLeave();
    await flushPromises();
    typeInto(renderer, "Amount", "3000");
    await press(renderer, "Save changes");

    expect(has(renderer, "₹1,000 due · 1 month, since 1 Sep")).toBe(true);
  });
});

describe("updateRentPayment", () => {
  it("sends only the fields it is given", async () => {
    seedPayment("p", "2026-08-05", 5000, { note: "UPI" });

    await updateRentPayment("p", { amount: 4500 });

    expect(saved("p")).toMatchObject({ amount: 4500, paid_on: "2026-08-05", note: "UPI", customer_name: "Asha Mehta" });
  });

  it("stores the day as a calendar day", async () => {
    seedPayment("p", "2026-08-05", 5000);

    await updateRentPayment("p", { paidOn: new Date(2026, 8, 7, 23, 30) });

    expect(saved("p").paid_on).toBe("2026-09-07");
  });

  it("takes a note or a name off with an empty one, and trims what it keeps", async () => {
    seedPayment("p", "2026-08-05", 5000, { note: "UPI" });

    await updateRentPayment("p", { note: "   ", customerName: "" });
    expect(saved("p")).toMatchObject({ note: null, customer_name: null });

    await updateRentPayment("p", { note: "  Cash  ", customerName: " Ravi Kumar " });
    expect(saved("p")).toMatchObject({ note: "Cash", customer_name: "Ravi Kumar" });
  });

  it("gives back the payment as it is now", async () => {
    seedPayment("p", "2026-08-05", 5000);

    await expect(updateRentPayment("p", { amount: 4500 })).resolves.toMatchObject({ $id: "p", amount: 4500 });
  });

  it("fails when Appwrite does, and for a payment that isn't there", async () => {
    seedPayment("p", "2026-08-05", 5000);
    fakeBackend.failNextDocumentUpdate = true;

    await expect(updateRentPayment("p", { amount: 1 })).rejects.toThrow("Network request failed");
    await expect(updateRentPayment("missing", { amount: 1 })).rejects.toThrow();
    expect(saved("p").amount).toBe(5000);
  });
});
