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
import { Provider } from "react-redux";
import Customers from "@/app/customers";
import Customer from "@/app/customer/[key]";
import { getRentalHistory, getRentPaymentsBetween } from "@/lib/appwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import { mount } from "./helpers/ui";
import { allTexts, createTestStore, flushPromises } from "./helpers/render";

/** The Customers screens with the rentals that were kept. Today is 29 September 2026. */

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
  rental_period_start: "2026-08-01" as any,
  rental_period_end: "2026-12-01" as any,
  rental_price: 4000,
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
    reason: "replaced",
    ...extra,
  }) as any;

const open = async (element: React.ReactElement, items = [kawai]) => {
  const store = createTestStore({ user: testUser, items });
  const renderer = await mount(<Provider store={store}>{element}</Provider>);
  await flushPromises();
  return renderer;
};

const has = (renderer: any, text: string) =>
  allTexts(renderer.root).includes(text);
const labels = (renderer: any) =>
  renderer.root
    .findAll((node: any) => typeof node.props.accessibilityLabel === "string")
    .map((node: any) => node.props.accessibilityLabel as string);

describe("the Customers list with kept rentals", () => {
  it("asks for them for the signed-in owner", async () => {
    await open(<Customers />);

    expect(getRentalHistory).toHaveBeenCalledWith(testUser.accountId);
  });

  it("lists someone who only appears in a kept rental, with no payments yet", async () => {
    jest
      .mocked(getRentalHistory)
      .mockResolvedValue([
        kept("h1", {
          customer_name: "Priya Nair",
          piano_id: "gone",
          piano_title: "Yamaha U1",
        }),
      ]);

    const renderer = await open(<Customers />);

    expect(has(renderer, "Priya Nair")).toBe(true);
    expect(has(renderer, "Yamaha U1 · No payments yet")).toBe(true);
    expect(has(renderer, "2 customers")).toBe(true);
  });

  it("carries on without them when they can't be loaded", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.mocked(getRentalHistory).mockRejectedValue(new Error("offline"));

    const renderer = await open(<Customers />);

    expect(has(renderer, "Asha Mehta")).toBe(true);
    expect(has(renderer, "Couldn’t load customers")).toBe(false);
  });
});

describe("a customer's page with kept rentals", () => {
  it("shows their rentals: the piano, the dates and the rent", async () => {
    jest.mocked(getRentalHistory).mockResolvedValue([kept("h1")]);

    const renderer = await open(<Customer />);

    expect(has(renderer, "Rental history")).toBe(true);
    expect(labels(renderer)).toContain(
      "Kawai K-300, 1 Jun 2025 to 1 Sep 2025 · ₹3,500 rent"
    );
  });

  it("shows the newest first, and names a piano that is gone from the kept rental", async () => {
    jest.mocked(getRentalHistory).mockResolvedValue([
      kept("older", {
        closed_on: "2025-01-02",
        period_start: "2024-10-01",
        period_end: "2025-01-01",
        piano_id: "gone",
        piano_title: "Old Yamaha",
      }),
      kept("newer"),
    ]);

    const renderer = await open(<Customer />);
    const texts = allTexts(renderer.root);

    expect(texts.indexOf("Kawai K-300")).toBeLessThan(
      texts.indexOf("Old Yamaha")
    );
  });

  it("has no Rental history section when none was kept", async () => {
    const renderer = await open(<Customer />);

    expect(has(renderer, "Rental history")).toBe(false);
  });

  it("opens a customer who only has a kept rental", async () => {
    mockParams.key = "priya%20nair";
    jest
      .mocked(getRentalHistory)
      .mockResolvedValue([kept("h1", { customer_name: "Priya Nair" })]);

    const renderer = await open(<Customer />);

    expect(has(renderer, "Priya Nair")).toBe(true);
    expect(has(renderer, "No payments yet")).toBe(true);
    expect(has(renderer, "Rental history")).toBe(true);
  });
});
