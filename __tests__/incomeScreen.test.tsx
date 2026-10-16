jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
}));
jest.mock("@/lib/appwrite", () => ({
  getRentPaymentsBetween: jest.fn(),
  getServiceLog: jest.fn(),
  getExpenses: jest.fn(),
  createExpense: jest.fn(),
}));

import React from "react";
import { RefreshControl, StyleSheet } from "react-native";
import { act } from "react-test-renderer";
import { router } from "expo-router";
import Income from "@/app/income";
import { createExpense, getExpenses, getRentPaymentsBetween, getServiceLog } from "@/lib/appwrite";
import { resetExpensesForTests } from "@/lib/expensesStore";
import { resetServiceLogForTests } from "@/lib/serviceLogStore";
import { lightColors } from "@/constants/theme";
import { makePiano, testUser } from "./helpers/fixtures";
import { a11yProblems, describeProblems } from "./helpers/a11y";
import {
  allTexts,
  atFontScale,
  captureToastCalls,
  createTestStore,
  findButton,
  flushPromises,
  pressLabel,
  pressText,
  renderWithStore,
  typeInto,
} from "./helpers/render";

/**
 * The Income screen (canvas page "Expenses and profit"): twelve months of what
 * came in (rent received, pianos sold) against the costs (business expenses
 * and services that cost something), and the profit. Today is fixed at
 * 29 September 2026.
 */

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 12, 0, 0),
    doNotFake: ["setImmediate", "nextTick"],
  });
  jest.clearAllMocks();
  resetExpensesForTests();
  resetServiceLogForTests();
  jest.mocked(getRentPaymentsBetween).mockResolvedValue([]);
  jest.mocked(getServiceLog).mockResolvedValue([]);
  jest.mocked(getExpenses).mockResolvedValue([]);
  jest.mocked(router.canGoBack).mockReturnValue(true);
});
afterEach(() => {
  jest.useRealTimers();
});

const payment = (id: string, paidOn: string, amount: number) => ({
  $id: id,
  $createdAt: `${paidOn}T09:00:00.000+00:00`,
  piano_id: "weber",
  creator: testUser.accountId,
  amount,
  paid_on: paidOn,
});
const payments = [
  payment("p1", "2026-09-25", 5000),
  payment("p2", "2026-09-02", 6200),
  payment("p3", "2026-08-28", 3000),
  payment("p4", "2025-11-10", 4000),
];
const sold = makePiano({
  $id: "sold",
  category: "on_sale",
  sold_date: "2026-09-10" as any,
  sold_price: 142000,
});
const weber = makePiano({ $id: "weber", title: "Weber W-121", category: "rentable" });

const service = (id: string, servicedOn: string, cost: number | null, kind = "tuning") => ({
  $id: id,
  $createdAt: `${servicedOn}T10:00:00.000+00:00`,
  piano_id: "weber",
  creator: testUser.accountId,
  serviced_on: servicedOn,
  kind,
  cost,
});
const expense = (id: string, spentOn: string, amount: number, category: string, note?: string) => ({
  $id: id,
  $createdAt: `${spentOn}T11:00:00.000+00:00`,
  creator: testUser.accountId,
  spent_on: spentOn,
  amount,
  category,
  note: note ?? null,
});
// 1,200 + 2,000 + 6,000 of costs in the twelve months; the rest don't count
const entries = [service("s1", "2026-09-12", 1200), service("s2", "2026-09-20", null, "cleaning")];
const expenses = [
  expense("e1", "2026-08-01", 2000, "shop", "Shop rent, August"),
  expense("e2", "2026-07-05", 6000, "staff"),
  expense("e3", "2024-01-01", 9999, "other"),
];

const open = async ({
  paid = payments,
  items = [sold, weber],
  logged = entries,
  spent = expenses,
  user = testUser as any,
} = {}) => {
  jest.mocked(getRentPaymentsBetween).mockResolvedValue(paid);
  jest.mocked(getServiceLog).mockResolvedValue(logged as any);
  jest.mocked(getExpenses).mockResolvedValue(spent as any);
  const store = createTestStore({ user, items });
  const renderer = renderWithStore(<Income />, store);
  await flushPromises();
  return { renderer, store };
};

const has = (renderer: any, text: string) =>
  allTexts(renderer.root).includes(text);

const textNode = (renderer: any, text: string) =>
  renderer.root.findAll(
    (node: any) => node.type === "Text" && node.props.children === text
  )[0];

describe("the Income screen", () => {
  it("asks for the twelve months of payments, the service log and the expenses, for the signed-in owner", async () => {
    await open();

    expect(getRentPaymentsBetween).toHaveBeenCalledTimes(1);
    const [account, from, to] = jest.mocked(getRentPaymentsBetween).mock
      .calls[0];
    expect(account).toBe(testUser.accountId);
    expect(from).toEqual(new Date(2025, 9, 1));
    expect(to).toEqual(new Date(2026, 9, 1));
    expect(getServiceLog).toHaveBeenCalledWith(testUser.accountId);
    expect(getExpenses).toHaveBeenCalledWith(testUser.accountId);
  });

  it("shows the profit of the twelve months, with what came in and what it cost", async () => {
    const { renderer } = await open();

    expect(has(renderer, "Income")).toBe(true);
    expect(has(renderer, "Profit, last 12 months")).toBe(true);
    // 18,200 of rent and a piano sold for 1,42,000, less 9,200 of costs
    expect(has(renderer, "₹1,51,000")).toBe(true);
    expect(has(renderer, "Income ₹1,60,200 · Costs ₹9,200")).toBe(true);
  });

  it("lists the months, this one first, each with what came in, what went out and the profit", async () => {
    const { renderer } = await open();
    const texts = allTexts(renderer.root);

    expect(texts.indexOf("September 2026")).toBeLessThan(texts.indexOf("August 2026"));
    expect(texts.indexOf("August 2026")).toBeLessThan(texts.indexOf("July 2026"));
    expect(texts.indexOf("July 2026")).toBeLessThan(texts.indexOf("November 2025"));
    expect(has(renderer, "₹1,53,200 in · ₹1,200 out · 1 piano sold")).toBe(true);
    expect(has(renderer, "₹1,52,000")).toBe(true);
    expect(has(renderer, "₹3,000 in · ₹2,000 out")).toBe(true);
    expect(has(renderer, "₹1,000")).toBe(true);
    expect(has(renderer, "₹4,000 in · ₹0 out")).toBe(true);
    // All twelve are there, the empty ones too
    expect(texts.filter((text) => text === "Nothing recorded")).toHaveLength(8);
  });

  it("shows a month that cost more than it brought in as a loss, in red", async () => {
    const { renderer } = await open();

    expect(has(renderer, "₹0 in · ₹6,000 out")).toBe(true);
    const loss = textNode(renderer, "−₹6,000");
    expect(StyleSheet.flatten(loss.props.style).color).toBe(lightColors.late);
    expect(
      renderer.root.findAll(
        (node: any) => node.props.accessibilityLabel === "July 2026, loss ₹6,000, ₹0 in · ₹6,000 out"
      ).length
    ).toBeGreaterThan(0);
  });

  it("draws the chart with the costs below the line, and tells a screen reader the amounts instead", async () => {
    const { renderer } = await open();
    const [chart] = renderer.root.findAll(
      (node: any) =>
        typeof node.type === "string" &&
        typeof node.props.accessibilityLabel === "string" &&
        node.props.accessibilityLabel.startsWith("Rent and costs by month.")
    );

    expect(chart.props.accessibilityLabel).toContain(
      "September 2026: rent ₹11,200, 1 piano sold for ₹1,42,000, costs ₹1,200"
    );
    expect(chart.props.accessibilityLabel).toContain("July 2026: rent ₹0, costs ₹6,000");
    expect(chart.findAll((node: any) => typeof node.type === "string" && node.props.testID === "cost-bar")).toHaveLength(3);
    expect(has(renderer, "Rent received")).toBe(true);
    expect(has(renderer, "Piano sold")).toBe(true);
    expect(has(renderer, "Costs, below the line")).toBe(true);
  });

  it("opens the Expenses screen from its row", async () => {
    const { renderer } = await open();

    await pressLabel(renderer.root, "Expenses, ₹9,200 in 12 months");

    expect(router.push).toHaveBeenCalledWith("/expenses");
  });

  it("counts a month that only cost something, and shows a loss for the year in red", async () => {
    const { renderer } = await open({ paid: [], items: [], logged: [], spent: [expense("e1", "2026-09-01", 2000, "shop")] });

    expect(has(renderer, "Profit, last 12 months")).toBe(true);
    const total = textNode(renderer, "−₹2,000");
    expect(total).toBeDefined();
    expect(has(renderer, "Income ₹0 · Costs ₹2,000")).toBe(true);
  });

  it("says so when nothing came in and nothing was spent", async () => {
    const { renderer } = await open({ paid: [], items: [], logged: [], spent: [] });

    expect(
      has(renderer, "Nothing recorded yet. Rent you record, pianos you mark as sold and expenses show up here.")
    ).toBe(true);
    expect(has(renderer, "Profit, last 12 months")).toBe(false);
    // Recording one is still there
    expect(findButton(renderer.root, "Record expense")).toBeDefined();
  });

  it("says it couldn't load, and tries again from the button", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.mocked(getRentPaymentsBetween).mockRejectedValueOnce(new Error("offline"));
    jest.mocked(getServiceLog).mockResolvedValue(entries as any);
    jest.mocked(getExpenses).mockResolvedValue(expenses as any);
    const store = createTestStore({ user: testUser, items: [sold, weber] });
    const renderer = renderWithStore(<Income />, store);
    await flushPromises();

    expect(has(renderer, "Couldn’t load income")).toBe(true);
    expect(has(renderer, "Profit, last 12 months")).toBe(false);

    jest.mocked(getRentPaymentsBetween).mockResolvedValue(payments);
    await pressText(renderer.root, "Try again");

    expect(has(renderer, "Couldn’t load income")).toBe(false);
    expect(has(renderer, "₹1,51,000")).toBe(true);
  });

  it("still shows what came in when the expenses can't be loaded, and says the costs may be short", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.mocked(getExpenses).mockRejectedValue(new Error("offline"));
    jest.mocked(getRentPaymentsBetween).mockResolvedValue(payments);
    jest.mocked(getServiceLog).mockResolvedValue(entries as any);
    const store = createTestStore({ user: testUser, items: [sold, weber] });
    const renderer = renderWithStore(<Income />, store);
    await flushPromises();

    expect(has(renderer, "Couldn’t load all the expenses, so the costs may be short. Pull down to try again.")).toBe(true);
    expect(has(renderer, "Income ₹1,60,200 · Costs ₹1,200")).toBe(true);
  });

  it("keeps what it showed when a later load fails", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const { renderer } = await open();
    jest.mocked(getRentPaymentsBetween).mockRejectedValue(new Error("offline"));

    await act(async () => {
      await renderer.root.findByType(RefreshControl).props.onRefresh();
    });
    await flushPromises();

    expect(has(renderer, "₹1,51,000")).toBe(true);
    expect(has(renderer, "Couldn’t load income")).toBe(false);
  });

  it("loads the payments, the service log and the expenses again when pulled down", async () => {
    const { renderer } = await open();

    await act(async () => {
      await renderer.root.findByType(RefreshControl).props.onRefresh();
    });

    expect(getRentPaymentsBetween).toHaveBeenCalledTimes(2);
    expect(getServiceLog).toHaveBeenCalledTimes(2);
    expect(getExpenses).toHaveBeenCalledTimes(2);
    expect(renderer.root.findByType(RefreshControl).props.refreshing).toBe(false);
  });

  it("asks for nothing without a signed-in user", async () => {
    const { renderer } = await open({ user: null, items: [] });

    expect(getRentPaymentsBetween).not.toHaveBeenCalled();
    expect(getServiceLog).not.toHaveBeenCalled();
    expect(getExpenses).not.toHaveBeenCalled();
    expect(
      has(renderer, "Nothing recorded yet. Rent you record, pianos you mark as sold and expenses show up here.")
    ).toBe(true);
  });

  it("records an expense from the bottom, and the profit takes it in", async () => {
    const toasts = captureToastCalls();
    jest.mocked(createExpense).mockImplementation(async (input: any) => ({
      $id: "new",
      $createdAt: "2026-09-29T12:00:00.000+00:00",
      creator: input.creator,
      spent_on: "2026-09-29",
      amount: input.amount,
      category: input.category,
      note: input.note,
    }));
    const { renderer } = await open();

    await act(async () => {
      findButton(renderer.root, "Record expense").props.onPress();
    });
    await flushPromises();
    expect(has(renderer, "A business cost, not for one piano")).toBe(true);
    typeInto(renderer.root, "Amount", "1000");
    await pressLabel(renderer.root, "Staff");
    typeInto(renderer.root, "Note", "Helper for the move");
    await act(async () => {
      findButton(renderer.root, "Save expense").props.onPress();
    });
    await flushPromises();

    expect(createExpense).toHaveBeenCalledWith(
      expect.objectContaining({ creator: testUser.accountId, amount: 1000, category: "staff", note: "Helper for the move" })
    );
    expect(toasts.map((toast) => toast.message)).toContain("Expense recorded");
    // 9,200 + 1,000 of costs now
    expect(has(renderer, "Income ₹1,60,200 · Costs ₹10,200")).toBe(true);
    expect(has(renderer, "₹1,50,000")).toBe(true);
  });

  it("goes back, or to Today when there is nowhere to go back to", async () => {
    const { renderer } = await open();

    await pressLabel(renderer.root, "Back");
    expect(router.back).toHaveBeenCalledTimes(1);

    jest.mocked(router.canGoBack).mockReturnValue(false);
    await pressLabel(renderer.root, "Back");
    expect(router.replace).toHaveBeenCalledWith("/today");
  });

  it("is usable: everything named and big enough to press", async () => {
    const { renderer } = await open();

    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });
});

describe("the Income screen with a big Font size", () => {
  atFontScale(1.5);

  it("puts each month's profit under the month, and the Expenses total in its line", async () => {
    const { renderer } = await open();

    const row = renderer.root.findAll(
      (node: any) =>
        typeof node.type === "string" &&
        typeof node.props.accessibilityLabel === "string" &&
        node.props.accessibilityLabel.startsWith("September 2026, profit")
    )[0];
    expect(StyleSheet.flatten(row.props.style).flexDirection).toBe("column");
    expect(has(renderer, "₹9,200 · piano service and business costs")).toBe(true);
  });
});
