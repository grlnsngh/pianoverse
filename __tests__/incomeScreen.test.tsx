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
}));

import React from "react";
import { RefreshControl } from "react-native";
import { act } from "react-test-renderer";
import { Provider } from "react-redux";
import { router } from "expo-router";
import Income from "@/app/income";
import { getRentPaymentsBetween } from "@/lib/appwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import { a11yProblems, describeProblems } from "./helpers/a11y";
import { mount } from "./helpers/ui";
import {
  allTexts,
  createTestStore,
  flushPromises,
  pressLabel,
  pressText,
} from "./helpers/render";

/**
 * The Income screen: twelve months of rent received and pianos sold. Today is
 * fixed at 29 September 2026.
 */

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 12, 0, 0),
    doNotFake: ["setImmediate", "nextTick"],
  });
  jest.clearAllMocks();
  jest.mocked(getRentPaymentsBetween).mockResolvedValue([]);
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

const open = async ({
  paid = payments,
  items = [sold],
  user = testUser as any,
} = {}) => {
  jest.mocked(getRentPaymentsBetween).mockResolvedValue(paid);
  const store = createTestStore({ user, items });
  const renderer = await mount(
    <Provider store={store}>
      <Income />
    </Provider>
  );
  await flushPromises();
  return { renderer, store };
};

const has = (renderer: any, text: string) =>
  allTexts(renderer.root).includes(text);

describe("the Income screen", () => {
  it("asks for the twelve months up to this one, for the signed-in owner", async () => {
    await open();

    expect(getRentPaymentsBetween).toHaveBeenCalledTimes(1);
    const [account, from, to] = jest.mocked(getRentPaymentsBetween).mock
      .calls[0];
    expect(account).toBe(testUser.accountId);
    expect(from).toEqual(new Date(2025, 9, 1));
    expect(to).toEqual(new Date(2026, 9, 1));
  });

  it("shows what came in over the twelve months, and how much was rent and how much sales", async () => {
    const { renderer } = await open();

    expect(has(renderer, "Income")).toBe(true);
    expect(has(renderer, "Last 12 months")).toBe(true);
    // 5,000 + 6,200 + 3,000 + 4,000 of rent and a piano sold for 1,42,000
    expect(has(renderer, "₹1,60,200")).toBe(true);
    expect(has(renderer, "Rent ₹18,200 · Sales ₹1,42,000")).toBe(true);
  });

  it("lists the months, this one first, each with what it was made of", async () => {
    const { renderer } = await open();
    const texts = allTexts(renderer.root);

    expect(texts.indexOf("September 2026")).toBeLessThan(
      texts.indexOf("August 2026")
    );
    expect(texts.indexOf("August 2026")).toBeLessThan(
      texts.indexOf("November 2025")
    );
    expect(has(renderer, "2 payments · 1 piano sold")).toBe(true);
    expect(has(renderer, "₹1,53,200")).toBe(true);
    expect(has(renderer, "1 payment")).toBe(true);
    // All twelve are there, the empty ones too
    expect(texts.filter((text) => text === "Nothing recorded")).toHaveLength(9);
  });

  it("draws the chart, and tells a screen reader the amounts instead of the bars", async () => {
    const { renderer } = await open();
    const [chart] = renderer.root.findAll(
      (node: any) =>
        typeof node.type === "string" &&
        typeof node.props.accessibilityLabel === "string" &&
        node.props.accessibilityLabel.startsWith("Rent received by month.")
    );

    expect(chart.props.accessibilityLabel).toContain(
      "September 2026: ₹11,200, 1 piano sold for ₹1,42,000"
    );
    expect(chart.props.accessibilityLabel).toContain("November 2025: ₹4,000");
    expect(has(renderer, "Rent received")).toBe(true);
    expect(has(renderer, "Piano sold")).toBe(true);
  });

  it("says so when nothing has come in", async () => {
    const { renderer } = await open({ paid: [], items: [] });

    expect(
      has(
        renderer,
        "No income recorded yet. Rent you record and pianos you mark as sold show up here."
      )
    ).toBe(true);
    expect(has(renderer, "Last 12 months")).toBe(false);
  });

  it("says it couldn't load, and tries again from the button", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest
      .mocked(getRentPaymentsBetween)
      .mockRejectedValueOnce(new Error("offline"));
    const store = createTestStore({ user: testUser, items: [sold] });
    const renderer = await mount(
      <Provider store={store}>
        <Income />
      </Provider>
    );
    await flushPromises();

    expect(has(renderer, "Couldn’t load income")).toBe(true);
    expect(has(renderer, "Last 12 months")).toBe(false);

    jest.mocked(getRentPaymentsBetween).mockResolvedValue(payments);
    await pressText(renderer.root, "Try again");

    expect(has(renderer, "Couldn’t load income")).toBe(false);
    expect(has(renderer, "₹1,60,200")).toBe(true);
  });

  it("keeps what it showed when a later load fails", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const { renderer } = await open();
    jest.mocked(getRentPaymentsBetween).mockRejectedValue(new Error("offline"));

    await act(async () => {
      await renderer.root.findByType(RefreshControl).props.onRefresh();
    });
    await flushPromises();

    expect(has(renderer, "₹1,60,200")).toBe(true);
    expect(has(renderer, "Couldn’t load income")).toBe(false);
  });

  it("loads again when pulled down", async () => {
    const { renderer } = await open();

    await act(async () => {
      await renderer.root.findByType(RefreshControl).props.onRefresh();
    });

    expect(getRentPaymentsBetween).toHaveBeenCalledTimes(2);
    expect(renderer.root.findByType(RefreshControl).props.refreshing).toBe(
      false
    );
  });

  it("asks for nothing without a signed-in user", async () => {
    const { renderer } = await open({ user: null, items: [] });

    expect(getRentPaymentsBetween).not.toHaveBeenCalled();
    expect(
      has(
        renderer,
        "No income recorded yet. Rent you record and pianos you mark as sold show up here."
      )
    ).toBe(true);
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
