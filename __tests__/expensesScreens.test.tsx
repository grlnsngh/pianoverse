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

import { format, subDays, subMonths } from "date-fns";
import React from "react";
import { Linking, StyleSheet } from "react-native";
import { act, ReactTestRenderer } from "react-test-renderer";
import { router, useLocalSearchParams } from "expo-router";
import DetailScreen from "@/app/detail/[id]";
import ExpensesScreen from "@/app/expenses";
import PianoBasicsFields from "@/components/PianoBasicsFields";
import { forgetExpenses, getExpensesState, loadExpenses, resetExpensesForTests } from "@/lib/expensesStore";
import { resetLetterheadStoreForTests } from "@/lib/letterheadStore";
import { resetServiceLogForTests } from "@/lib/serviceLogStore";
import { PianoItem } from "@/redux/pianos/types";
import { toStoredDate } from "@/utils/dates";
import { createEmptyPianoForm } from "@/utils/pianoForm";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import { a11yProblems, describeProblems } from "./helpers/a11y";
import {
  allTexts,
  atFontScale,
  captureToastCalls,
  createTestStore,
  dialogOf,
  findButton,
  flushPromises,
  pressDialog,
  pressLabel,
  renderWithStore,
  typeInto,
} from "./helpers/render";

/** Expenses and each piano's money in the app (canvas page "Expenses and profit"). */

const day = (date: Date) => toStoredDate(date);
const today = new Date();

const rental = makePiano({
  $id: "piano-1",
  title: "Young Chang U-121",
  category: "rentable",
  rental_customer_name: "Meera Kapoor",
  rental_customer_mobile: "9876543210",
  rental_period_start: day(subDays(today, 60)) as any,
  rental_period_end: day(subDays(today, -60)) as any,
  rental_price: 4500,
  date_of_purchase: "2023-08-14" as any,
});

let seq = 0;
const created = () => `2026-01-01T00:00:${String(++seq).padStart(2, "0")}.000+00:00`;
const seedExpense = (spentOn: Date, amount: number, category: string, note?: string) => {
  const id = `exp-${++seq}`;
  fakeBackend.expenses.set(id, {
    $id: id,
    $createdAt: created(),
    creator: testUser.accountId,
    spent_on: day(spentOn),
    amount,
    category,
    ...(note ? { note } : {}),
  });
  return id;
};
const seedService = (servicedOn: Date, kind: string, cost?: number, pianoId = "piano-1") => {
  const id = `svc-${++seq}`;
  fakeBackend.service.set(id, {
    $id: id,
    $createdAt: created(),
    piano_id: pianoId,
    creator: testUser.accountId,
    serviced_on: day(servicedOn),
    kind,
    ...(cost ? { cost } : {}),
  });
  return id;
};
const seedPayment = (paidOn: Date, amount: number, pianoId = "piano-1") => {
  const id = `pay-${++seq}`;
  fakeBackend.payments.set(id, {
    $id: id,
    $createdAt: created(),
    piano_id: pianoId,
    creator: testUser.accountId,
    amount,
    paid_on: day(paidOn),
  });
};

const expenseRows = () => [...fakeBackend.expenses.values()];

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  fakeNotifications.reset();
  resetServiceLogForTests();
  resetExpensesForTests();
  resetLetterheadStoreForTests();
  (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "piano-1" });
  jest.spyOn(Linking, "openURL").mockResolvedValue(true as any);
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

const open = async (screen: React.ReactElement, pianos: PianoItem[] = [rental]) => {
  for (const piano of pianos) fakeBackend.documents.set(piano.$id, { ...piano });
  const renderer = renderWithStore(screen, createTestStore({ user: testUser, items: pianos }));
  await flushPromises();
  return renderer;
};

const has = (renderer: ReactTestRenderer, text: string) => allTexts(renderer.root).includes(text);

/** Lets a closing sheet's 300 ms pass, so what it chose opens. */
const sheetCloses = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 350)));

const longPress = async (renderer: ReactTestRenderer, labelStart: string) => {
  const node = renderer.root.find(
    (candidate) =>
      typeof candidate.props.onLongPress === "function" &&
      typeof candidate.props.accessibilityLabel === "string" &&
      candidate.props.accessibilityLabel.startsWith(labelStart)
  );
  await act(async () => node.props.onLongPress());
  await flushPromises();
};

const press = async (renderer: ReactTestRenderer, title: string) => {
  await act(async () => {
    findButton(renderer.root, title).props.onPress();
  });
  await flushPromises();
};

describe("the Expenses screen", () => {
  it("shows what the last twelve months cost, by kind, then every cost month by month", async () => {
    seedExpense(subDays(today, 3), 2000, "shop", "Shop rent");
    seedExpense(subMonths(today, 1), 1400, "transport", "Van fuel");
    seedExpense(subMonths(today, 14), 9999, "staff", "Long ago");
    seedService(subDays(today, 5), "tuning", 1200);
    seedService(subDays(today, 6), "cleaning");
    const renderer = await open(<ExpensesScreen />);
    const texts = allTexts(renderer.root);

    expect(has(renderer, "Expenses")).toBe(true);
    expect(has(renderer, "Last 12 months")).toBe(true);
    expect(has(renderer, "₹4,600")).toBe(true);
    expect(texts.indexOf("Shop and storage")).toBeLessThan(texts.indexOf("Transport"));
    expect(texts.indexOf("Transport")).toBeLessThan(texts.indexOf("Piano service"));
    // The older one is in its month's list, but not in the twelve months
    expect(has(renderer, "Long ago")).toBe(true);
    expect(has(renderer, "Shop rent")).toBe(true);
    expect(has(renderer, "Tuning · Young Chang U-121")).toBe(true);
    expect(has(renderer, `${format(subDays(today, 5), "d MMM")} · Piano service`)).toBe(true);
    expect(has(renderer, format(subMonths(today, 14), "MMMM yyyy"))).toBe(true);
    expect(has(renderer, "Cleaning · Young Chang U-121")).toBe(false);
  });

  it("opens the piano from a service's cost", async () => {
    seedService(subDays(today, 5), "repair", 1800);
    const renderer = await open(<ExpensesScreen />);

    await pressLabel(renderer.root, `Repair · Young Chang U-121, ${format(subDays(today, 5), "d MMM")} · Piano service, ₹1,800`);

    expect(router.push).toHaveBeenCalledWith("/detail/piano-1");
  });

  it("records a business expense from the bottom", async () => {
    const toasts = captureToastCalls();
    const renderer = await open(<ExpensesScreen />);

    await press(renderer, "Record expense");
    typeInto(renderer.root, "Amount", "2500");
    await pressLabel(renderer.root, "Advertising");
    typeInto(renderer.root, "Note", "Justdial listing");
    await press(renderer, "Save expense");

    expect(expenseRows()).toEqual([
      expect.objectContaining({
        creator: testUser.accountId,
        amount: 2500,
        category: "advertising",
        note: "Justdial listing",
        spent_on: day(today),
      }),
    ]);
    expect(toasts).toEqual([expect.objectContaining({ message: "Expense recorded", variant: "success" })]);
    expect(has(renderer, "Justdial listing")).toBe(true);
  });

  it("asks for the amount before saving", async () => {
    const renderer = await open(<ExpensesScreen />);
    const { Alert } = require("react-native");
    jest.spyOn(Alert, "alert").mockImplementation(() => {});

    await press(renderer, "Record expense");
    await press(renderer, "Save expense");

    expect(Alert.alert).toHaveBeenCalledWith("Missing Details", "Please enter the amount.");
    expect(expenseRows()).toHaveLength(0);
  });

  it("edits an expense after pressing and holding it, with Undo", async () => {
    const toasts = captureToastCalls();
    const id = seedExpense(subDays(today, 3), 2000, "shop", "Shop rent");
    const renderer = await open(<ExpensesScreen />);

    await longPress(renderer, "Shop rent,");
    await pressLabel(renderer.root, "Edit expense");
    await sheetCloses();
    typeInto(renderer.root, "Amount", "2200");
    await press(renderer, "Save changes");

    expect(fakeBackend.expenses.get(id)).toMatchObject({ amount: 2200, category: "shop" });
    const updated = toasts.find((toast) => toast.message === "Expense updated")!;
    await act(async () => updated.action!.onPress());
    await flushPromises();
    expect(fakeBackend.expenses.get(id)).toMatchObject({ amount: 2000 });
  });

  it("deletes an expense after asking, with Undo that brings it back", async () => {
    const toasts = captureToastCalls();
    seedExpense(subDays(today, 3), 6000, "staff", "Helper");
    const renderer = await open(<ExpensesScreen />);

    await longPress(renderer, "Helper,");
    await pressLabel(renderer.root, "Delete expense");
    await sheetCloses();
    expect(dialogOf(renderer.root)?.title).toBe("Delete this expense?");
    await pressDialog(renderer.root, "Delete");
    await flushPromises();

    expect(expenseRows()).toHaveLength(0);
    const deleted = toasts.find((toast) => toast.message === "Expense deleted")!;
    await act(async () => deleted.action!.onPress());
    await flushPromises();
    expect(expenseRows()).toEqual([expect.objectContaining({ amount: 6000, category: "staff", note: "Helper" })]);
  });

  it("says nothing has been spent yet", async () => {
    const renderer = await open(<ExpensesScreen />);

    expect(allTexts(renderer.root).some((text) => text.startsWith("Nothing spent yet."))).toBe(true);
  });

  it("still shows the services' costs when the expenses table isn't there, and says when one can't be saved", async () => {
    const toasts = captureToastCalls();
    fakeBackend.missingCollections.add("expenses");
    seedService(subDays(today, 5), "tuning", 1200);
    const renderer = await open(<ExpensesScreen />);

    expect(has(renderer, "Tuning · Young Chang U-121")).toBe(true);
    await press(renderer, "Record expense");
    typeInto(renderer.root, "Amount", "100");
    await press(renderer, "Save expense");

    expect(toasts).toEqual([expect.objectContaining({ message: "Couldn’t save. Check your connection.", variant: "error" })]);
  });

  it("is usable: everything named and big enough to press", async () => {
    seedExpense(subDays(today, 3), 2000, "shop", "Shop rent");
    seedService(subDays(today, 5), "tuning", 1200);
    const renderer = await open(<ExpensesScreen />);

    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });
});

describe("the Money section on a piano's page", () => {
  it("shows what the piano earned and cost, and its profit, with the working", async () => {
    seedPayment(subMonths(today, 1), 4500);
    seedPayment(subMonths(today, 2), 4500);
    seedService(subMonths(today, 3), "tuning", 1200);
    const renderer = await open(<DetailScreen />, [{ ...rental, purchase_price: 5000 }]);

    ["Money", "Since 14 Aug 2023", "Earned", "₹9,000", "Costs", "₹6,200", "Profit", "₹2,800"].forEach((text) =>
      expect(has(renderer, text)).toBe(true)
    );
    ["Rent received · 2 payments", "Bought for", "−₹5,000", "Service · 1 entry", "−₹1,200", "Profit so far"].forEach((text) =>
      expect(has(renderer, text)).toBe(true)
    );
    // About this piano has it too
    expect(has(renderer, "₹5,000")).toBe(true);
  });

  it("asks what the piano was bought for before it can show a profit, and opens Edit for it", async () => {
    seedPayment(subMonths(today, 1), 4500);
    const renderer = await open(<DetailScreen />);

    expect(has(renderer, "Add what you paid for it to see its profit")).toBe(true);
    expect(has(renderer, "Profit")).toBe(false);
    await pressLabel(renderer.root, "Add Bought for");

    expect(router.push).toHaveBeenCalledWith("/edit/piano-1");
  });

  it("counts a sold piano's sale, and its profit is no longer 'so far'", async () => {
    seedPayment(subMonths(today, 4), 4500);
    const sold = { ...rental, category: "on_sale", purchase_price: 40000, sold_date: day(subDays(today, 10)) as any, sold_price: 60000 };
    const renderer = await open(<DetailScreen />, [sold]);

    expect(has(renderer, "Sold for")).toBe(true);
    expect(has(renderer, "₹64,500")).toBe(true);
    expect(has(renderer, "₹24,500")).toBe(true);
    expect(has(renderer, "Profit so far")).toBe(false);
  });

  it("shows a loss as a loss", async () => {
    seedPayment(subMonths(today, 1), 4500);
    const renderer = await open(<DetailScreen />, [{ ...rental, purchase_price: 50000 }]);

    expect(has(renderer, "Loss")).toBe(true);
    expect(has(renderer, "Loss so far")).toBe(true);
    expect(has(renderer, "₹45,500")).toBe(true);
  });
});

describe("Mark as sold", () => {
  it("shows the profit the sale makes on the piano", async () => {
    seedPayment(subMonths(today, 1), 108000);
    seedService(subMonths(today, 2), "repair", 7900);
    const renderer = await open(<DetailScreen />, [{ ...rental, purchase_price: 40000 }]);

    await pressLabel(renderer.root, "Mark as sold");
    typeInto(renderer.root, "Sale price", "120000");

    expect(has(renderer, "Profit on this piano")).toBe(true);
    expect(has(renderer, "₹1,80,100")).toBe(true);
    ["Sale", "₹1,20,000", "Rent received", "₹1,08,000", "−₹40,000", "Service", "−₹7,900"].forEach((text) =>
      expect(has(renderer, text)).toBe(true)
    );
  });

  it("asks for Bought for when it isn't known", async () => {
    const renderer = await open(<DetailScreen />);

    await pressLabel(renderer.root, "Mark as sold");

    expect(has(renderer, "Add what you paid for it (Bought for, on its Edit page) to see the profit on this piano.")).toBe(true);
  });
});

describe("Bought for when adding or editing a piano", () => {
  it("is a row of the first panel, after Purchased, and says what it is for", async () => {
    const onChange = jest.fn();
    const renderer = renderWithStore(
      <PianoBasicsFields form={createEmptyPianoForm()} onChange={onChange} photo={null} />,
      createTestStore({ user: testUser })
    );
    const texts = allTexts(renderer.root);

    expect(texts.indexOf("Purchased")).toBeLessThan(texts.indexOf("Bought for"));
    expect(has(renderer, "What you paid for it. Used only for this piano’s profit; leave it empty if you don’t know.")).toBe(true);
    typeInto(renderer.root, "Bought for", "85,000");
    expect(onChange).toHaveBeenLastCalledWith({ purchasePrice: 85000 });
  });
});

describe("signing out", () => {
  it("forgets the expenses on this phone", async () => {
    seedExpense(subDays(today, 3), 2000, "shop");
    await loadExpenses(testUser.accountId);
    expect(getExpensesState().expenses).toHaveLength(1);

    forgetExpenses();

    expect(getExpensesState()).toEqual({ accountId: null, expenses: [], status: "idle" });
  });
});

describe("with a big Font size", () => {
  atFontScale(1.5);

  it("puts the Money section's numbers one under another, so none is cut", async () => {
    seedPayment(subMonths(today, 1), 4500);
    const renderer = await open(<DetailScreen />, [{ ...rental, purchase_price: 1000 }]);

    const earned = renderer.root.findAll(
      (node) => typeof node.type === "string" && node.props.accessibilityLabel === "Earned, ₹4,500"
    )[0];
    expect(StyleSheet.flatten(earned.props.style).flexDirection).toBe("row-reverse");
  });
});
