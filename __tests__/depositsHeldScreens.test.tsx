jest.mock("expo-notifications", () => require("./helpers/fakeNotifications").createFakeNotificationsModule());
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
}));

import React from "react";
import { StyleSheet } from "react-native";
import { router } from "expo-router";
import DepositsScreen from "@/app/deposits";
import Income from "@/app/income";
import { getExpenses, getRentPaymentsBetween, getServiceLog } from "@/lib/appwrite";
import { resetExpensesForTests } from "@/lib/expensesStore";
import { PianoDataContext, type PianoLoadStatus } from "@/lib/PianoDataContext";
import { resetServiceLogForTests } from "@/lib/serviceLogStore";
import { a11yProblems, describeProblems } from "./helpers/a11y";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  atFontScale,
  createTestStore,
  flushPromises,
  pressLabel,
  renderWithStore,
} from "./helpers/render";

/**
 * The Deposits held row on Income and its list (canvas page "Security
 * deposits"): deposits are held for the customers, so they are never part of
 * the income or the profit. Today is 29 September 2026.
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

const rented = (id: string, title: string, who: string, deposit: number | null, since: string | null, extra = {}) =>
  makePiano({
    $id: id,
    title,
    category: "rentable",
    rental_customer_name: who,
    rental_period_start: "2026-07-01" as any,
    rental_period_end: "2027-01-01" as any,
    rental_price: 4500,
    rental_deposit: deposit,
    deposit_received_on: since as any,
    ...extra,
  } as any);

const youngChang = rented("yc", "Young Chang U-121", "Meera Kapoor", 9000, "2026-09-01");
const weber = rented("weber", "Weber W-121", "Karan Malhotra", 10000, "2026-07-14");
const kawai = rented("kawai", "Kawai K-300", "Asha Mehta", 8000, "2026-06-02");
const noDeposit = rented("none", "Samick SU-118", "Ravi Kumar", null, null);
const stock = [youngChang, weber, kawai, noDeposit];

const payment = {
  $id: "p1",
  $createdAt: "2026-09-25T09:00:00.000+00:00",
  piano_id: "weber",
  creator: testUser.accountId,
  amount: 5000,
  paid_on: "2026-09-25",
};

const openIncome = async (items = stock, paid: any[] = [payment]) => {
  jest.mocked(getRentPaymentsBetween).mockResolvedValue(paid);
  const renderer = renderWithStore(<Income />, createTestStore({ user: testUser, items }));
  await flushPromises();
  return renderer;
};

const openList = async (items = stock, status: PianoLoadStatus = "ready") => {
  const refresher = { current: jest.fn(async () => undefined) as any };
  const renderer = renderWithStore(
    <PianoDataContext.Provider value={{ status, reportStatus: () => {}, refresher }}>
      <DepositsScreen />
    </PianoDataContext.Provider>,
    createTestStore({ user: testUser, items })
  );
  await flushPromises();
  return { renderer, refresher };
};

type Rendered = Awaited<ReturnType<typeof openIncome>>;
const has = (renderer: Rendered, text: string) => allTexts(renderer.root).includes(text);
const rows = (renderer: Rendered) =>
  renderer.root
    .findAll((node) => node.props.accessibilityHint === "Opens this piano" && typeof node.props.onPress === "function")
    .map((node) => node.props.accessibilityLabel as string);

describe("the Deposits held row on Income", () => {
  it("is under Expenses, with what is held and how many rentals", async () => {
    const renderer = await openIncome();

    expect(has(renderer, "Deposits held")).toBe(true);
    expect(has(renderer, "3 rentals · refundable, not income")).toBe(true);
    expect(has(renderer, "₹27,000")).toBe(true);
  });

  it("is never in the profit, the income or the costs", async () => {
    const renderer = await openIncome();

    // Only the ₹5,000 payment is income
    expect(has(renderer, "Income ₹5,000 · Costs ₹0")).toBe(true);
    expect(has(renderer, "₹5,000")).toBe(true);
  });

  it("opens the list", async () => {
    const renderer = await openIncome();

    await pressLabel(renderer.root, "Deposits held, ₹27,000, 3 rentals · refundable, not income");

    expect(router.push).toHaveBeenCalledWith("/deposits");
  });

  it("is not there when no deposit is held", async () => {
    const renderer = await openIncome([noDeposit]);

    expect(has(renderer, "Deposits held")).toBe(false);
  });

  it("is not there for a deposit left on a sold piano, or on one that isn't a rental", async () => {
    const renderer = await openIncome([
      rented("sold", "Sold piano", "Someone", 5000, "2026-01-01", { sold_date: "2026-09-10" }),
      rented("wh", "Warehouse piano", "", 5000, "2026-01-01", { category: "warehouse", rental_customer_name: null }),
    ]);

    expect(has(renderer, "Deposits held")).toBe(false);
  });

  it("is there even when nothing else has been recorded", async () => {
    const renderer = await openIncome(stock, []);

    expect(has(renderer, "Nothing recorded yet. Rent you record, pianos you mark as sold and expenses show up here.")).toBe(true);
    expect(has(renderer, "Deposits held")).toBe(true);
  });

  it("is usable: named, a role, big enough", async () => {
    const renderer = await openIncome();

    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });
});

describe("the Deposits held list", () => {
  it("has the total, that it isn't income, and each deposit with who, the piano and since when, the oldest first", async () => {
    const { renderer } = await openList();

    expect(has(renderer as any, "Deposits held")).toBe(true);
    expect(has(renderer as any, "₹27,000")).toBe(true);
    expect(has(renderer as any, "Refundable. Not part of your income or profit.")).toBe(true);
    expect(rows(renderer as any)).toEqual([
      "Asha Mehta, Kawai K-300 · since 2 Jun, ₹8,000",
      "Karan Malhotra, Weber W-121 · since 14 Jul, ₹10,000",
      "Meera Kapoor, Young Chang U-121 · since 1 Sep, ₹9,000",
    ]);
  });

  it("opens the piano of a row", async () => {
    const { renderer } = await openList();

    await pressLabel(renderer.root, "Karan Malhotra, Weber W-121 · since 14 Jul, ₹10,000");

    expect(router.push).toHaveBeenCalledWith("/detail/weber");
  });

  it("names the piano when there is no customer, and leaves out a day that isn't known", async () => {
    const { renderer } = await openList([rented("a", "Piano A", "", 3000, null, { rental_customer_name: "" })]);

    expect(rows(renderer as any)).toEqual(["Piano A, ₹3,000"]);
  });

  it("says when no deposit is held", async () => {
    const { renderer } = await openList([noDeposit]);

    expect(
      has(
        renderer as any,
        "No deposits are held. A deposit you note on a rental shows here until the rental ends. It is refundable, so it is never counted as income."
      )
    ).toBe(true);
    expect(has(renderer as any, "Refundable. Not part of your income or profit.")).toBe(false);
  });

  it("says it couldn't load the pianos when that failed and there are none", async () => {
    const { renderer } = await openList([], "failed");

    expect(has(renderer as any, "Couldn’t load your pianos")).toBe(true);
  });

  it("goes back", async () => {
    const { renderer } = await openList();
    await pressLabel(renderer.root, "Back");
    expect(router.back).toHaveBeenCalled();

    jest.mocked(router.canGoBack).mockReturnValueOnce(false);
    await pressLabel(renderer.root, "Back");
    expect(router.replace).toHaveBeenCalledWith("/income");
  });

  it("asks for the pianos again when pulled down", async () => {
    const { renderer, refresher } = await openList();
    const control = renderer.root.findAll((node) => typeof node.props.onRefresh === "function")[0];

    await control.props.onRefresh();

    expect(refresher.current).toHaveBeenCalled();
  });

  it("is usable: named, a role, big enough", async () => {
    const { renderer } = await openList();

    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });
});

describe("at a big Font size", () => {
  atFontScale(1.5);

  it("puts the amount under the words on Income and in the list", async () => {
    const renderer = await openIncome();
    // The detail line carries the amount, as Expenses' does
    expect(has(renderer, "₹27,000 · 3 rentals · refundable, not income")).toBe(true);

    const { renderer: list } = await openList();
    const amounts = (list as any).root.findAll(
      (node: any) => (node.type as unknown) === "Text" && StyleSheet.flatten(node.props.style)?.fontVariant?.length && node.children.join("") === "₹8,000"
    );
    expect(amounts).toHaveLength(1);
    expect(describeProblems(a11yProblems((list as any).root))).toEqual([]);
  });
});
