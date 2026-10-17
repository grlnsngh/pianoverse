const mockParams: { key?: string } = { key: "asha%20mehta" };
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: () => mockParams,
}));
jest.mock("@/lib/appwrite", () => ({
  getRentPaymentsBetween: jest.fn(),
  getRentalHistory: jest.fn(),
}));

import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { router } from "expo-router";
import Customer from "@/app/customer/[key]";
import { getRentalHistory, getRentPaymentsBetween } from "@/lib/appwrite";
import { buildCustomers } from "@/utils/customers";
import { a11yProblems, describeProblems } from "./helpers/a11y";
import { makePiano, testUser } from "./helpers/fixtures";
import { mount } from "./helpers/ui";
import { allTexts, atFontScale, createTestStore, flushPromises, pressLabel, TEST_METRICS } from "./helpers/render";

/**
 * A customer's page with a deposit (canvas page "Security deposits"): the
 * deposit held for the rental they have now, and how each kept rental's
 * deposit ended. Today is 29 September 2026.
 */

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 12, 0, 0),
    doNotFake: ["setImmediate", "nextTick"],
  });
  jest.clearAllMocks();
  jest.mocked(getRentPaymentsBetween).mockResolvedValue([]);
  jest.mocked(getRentalHistory).mockResolvedValue([]);
  mockParams.key = "asha%20mehta";
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const kawai = makePiano({
  $id: "kawai",
  title: "Kawai K-300",
  category: "rentable",
  rental_customer_name: "Asha Mehta",
  rental_customer_mobile: "98765 43210",
  rental_period_start: "2026-09-01" as any,
  rental_period_end: "2027-03-01" as any,
  rental_price: 4500,
  rental_deposit: 9000,
  deposit_received_on: "2026-09-01" as any,
});

const kept = (id: string, extra: Record<string, unknown> = {}) =>
  ({
    $id: id,
    $createdAt: "2026-09-01T00:00:00.000+00:00",
    piano_id: "kawai",
    creator: testUser.accountId,
    customer_name: "Asha Mehta",
    period_start: "2025-06-01",
    period_end: "2025-09-01",
    price: 3500,
    closed_on: "2025-09-02",
    reason: "returned",
    ...extra,
  }) as any;

const open = async (items = [kawai]) => {
  const store = createTestStore({ user: testUser, items });
  const renderer = await mount(
    <Provider store={store}>
      <SafeAreaProvider initialMetrics={TEST_METRICS}>
        <Customer />
      </SafeAreaProvider>
    </Provider>
  );
  await flushPromises();
  return renderer;
};

const has = (renderer: any, text: string) => allTexts(renderer.root).includes(text);
const labels = (renderer: any) =>
  renderer.root
    .findAll((node: any) => typeof node.props.accessibilityLabel === "string")
    .map((node: any) => node.props.accessibilityLabel as string);

describe("the deposit held for a customer", () => {
  it("is on their page, with the piano and since when, and that it is refundable", async () => {
    const renderer = await open();

    expect(has(renderer, "Deposit held ₹9,000")).toBe(true);
    expect(has(renderer, "Kawai K-300, since 1 Sep")).toBe(true);
    expect(labels(renderer)).toContain("Deposit held ₹9,000, Kawai K-300, since 1 Sep. Refundable.");
  });

  it("opens the piano when it is pressed", async () => {
    const renderer = await open();

    await pressLabel(renderer.root, "Deposit held ₹9,000, Kawai K-300, since 1 Sep. Refundable.");

    expect(router.push).toHaveBeenCalledWith("/detail/kawai");
  });

  it("is not in what they paid in all", async () => {
    const renderer = await open();

    expect(has(renderer, "₹0")).toBe(true);
    expect(has(renderer, "No payments yet")).toBe(true);
  });

  it("is not there when none is held for them", async () => {
    const renderer = await open([{ ...kawai, rental_deposit: null, deposit_received_on: null } as any]);

    expect(allTexts((renderer as any).root).some((text: string) => text.startsWith("Deposit held"))).toBe(false);
  });

  it("is not there for a sold piano", async () => {
    expect(
      allTexts(((await open([{ ...kawai, sold_date: "2026-09-10" } as any])) as any).root).some((text: string) =>
        text.startsWith("Deposit held")
      )
    ).toBe(false);
  });

  it("has one card for each deposit when they have more than one", async () => {
    const weber = makePiano({
      $id: "weber",
      title: "Weber W-121",
      category: "rentable",
      rental_customer_name: "asha  mehta",
      rental_period_start: "2026-07-01" as any,
      rental_period_end: "2027-01-01" as any,
      rental_deposit: 5000,
      deposit_received_on: "2026-07-01" as any,
    });

    const renderer = await open([kawai, weber]);

    // The one held longest first
    const cards = allTexts((renderer as any).root).filter((text: string) => text.startsWith("Deposit held"));
    expect(cards).toEqual(["Deposit held ₹5,000", "Deposit held ₹9,000"]);
  });

  it("is usable: named, a role, big enough", async () => {
    const renderer = await open();

    expect(describeProblems(a11yProblems((renderer as any).root))).toEqual([]);
  });
});

describe("a kept rental's deposit on the customer's page", () => {
  it("says how it ended", async () => {
    jest.mocked(getRentalHistory).mockResolvedValue([
      kept("h1", { deposit: 7000, deposit_refunded: 7000 }),
      kept("h2", { period_start: "2024-01-01", period_end: "2024-04-01", closed_on: "2024-04-02", deposit: 6000 }),
    ]);

    const renderer = await open();

    expect(has(renderer, "Deposit ₹7,000 · refunded in full")).toBe(true);
    expect(has(renderer, "Deposit ₹6,000 · not settled")).toBe(true);
    expect(labels(renderer)).toContain(
      "Kawai K-300, 1 Jun 2025 to 1 Sep 2025 · ₹3,500 rent, Deposit ₹7,000 · refunded in full"
    );
  });

  it("says what was kept, and for what", async () => {
    jest.mocked(getRentalHistory).mockResolvedValue([
      kept("h1", { deposit: 9000, deposit_refunded: 4500, deposit_note: "unpaid rent" }),
    ]);

    const renderer = await open();

    expect(has(renderer, "Deposit ₹9,000 · refunded ₹4,500, kept ₹4,500 for unpaid rent")).toBe(true);
  });

  it("has no deposit line for a rental that held none", async () => {
    jest.mocked(getRentalHistory).mockResolvedValue([kept("h1")]);

    const renderer = await open([{ ...kawai, rental_deposit: null } as any]);

    expect(allTexts((renderer as any).root).some((text: string) => text.startsWith("Deposit ₹"))).toBe(false);
  });
});

describe("at 150% text", () => {
  atFontScale(1.5);

  it("keeps the deposit card and the history line usable", async () => {
    jest.mocked(getRentalHistory).mockResolvedValue([kept("h1", { deposit: 9000, deposit_refunded: 4500 })]);

    const renderer = await open();

    expect(has(renderer, "Deposit held ₹9,000")).toBe(true);
    expect(describeProblems(a11yProblems((renderer as any).root))).toEqual([]);
  });
});

describe("the customers' deposits, as worked out", () => {
  const pianos = [
    kawai,
    makePiano({
      $id: "samick",
      title: "Samick SU-118",
      category: "rentable",
      rental_customer_name: "Ravi Kumar",
      rental_deposit: 3000,
    } as any),
    makePiano({ $id: "none", title: "No deposit", category: "rentable", rental_customer_name: "Meera Kapoor" } as any),
    makePiano({
      $id: "sold",
      title: "Sold",
      category: "rentable",
      rental_customer_name: "Sold Buyer",
      rental_deposit: 100,
      sold_date: "2026-09-01" as any,
    } as any),
    makePiano({
      $id: "ware",
      title: "Warehouse",
      category: "warehouse",
      rental_customer_name: "Ware House",
      rental_deposit: 100,
    } as any),
  ];

  it("belong to whoever the rental is for, whether or not it is running", () => {
    const { customers } = buildCustomers([], pianos, []);
    const by = (name: string) => customers.find((customer) => customer.name === name);

    expect(by("Asha Mehta")?.deposits).toEqual([
      { pianoId: "kawai", title: "Kawai K-300", amount: 9000, since: new Date(2026, 8, 1) },
    ]);
    // A rental with no end date still holds its deposit
    expect(by("Ravi Kumar")?.deposits).toEqual([
      { pianoId: "samick", title: "Samick SU-118", amount: 3000, since: null },
    ]);
  });

  it("are none for a rental with no deposit, a sold piano or a piano that isn't a rental", () => {
    const { customers } = buildCustomers([], pianos, []);

    expect(customers.find((customer) => customer.name === "Meera Kapoor")?.deposits ?? []).toEqual([]);
    expect(customers.find((customer) => customer.name === "Sold Buyer")?.deposits ?? []).toEqual([]);
    expect(customers.find((customer) => customer.name === "Ware House")?.deposits ?? []).toEqual([]);
  });
});
