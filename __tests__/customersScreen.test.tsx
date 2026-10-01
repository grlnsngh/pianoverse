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
  getRentalHistory: jest.fn(() => Promise.resolve([])),
}));

import React from "react";
import { Linking, RefreshControl } from "react-native";
import { act } from "react-test-renderer";
import { Provider } from "react-redux";
import { router } from "expo-router";
import Customers from "@/app/customers";
import Customer from "@/app/customer/[key]";
import { getRentPaymentsBetween } from "@/lib/appwrite";
import { statusLine } from "@/utils/pianoDetail";
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
 * The Customers list and a customer's page, worked out from the payments and
 * the pianos. Today is 29 September 2026.
 */

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 12, 0, 0),
    doNotFake: ["setImmediate", "nextTick"],
  });
  jest.clearAllMocks();
  jest.mocked(getRentPaymentsBetween).mockResolvedValue([]);
  jest.mocked(router.canGoBack).mockReturnValue(true);
  jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  mockParams.key = "asha%20mehta";
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const rental = (
  id: string,
  title: string,
  customer: string,
  end: string,
  extra = {}
) =>
  makePiano({
    $id: id,
    title,
    category: "rentable",
    rental_customer_name: customer,
    rental_customer_mobile: "98765 43210",
    rental_period_start: "2026-01-01" as any,
    rental_period_end: end as any,
    rental_price: 4000,
    ...extra,
  });
const kawai = rental("kawai", "Kawai K-300", "Asha Mehta", "2026-12-01");
const weber = makePiano({
  $id: "weber",
  title: "Weber W-121",
  category: "warehouse",
});
const pianos = [kawai, weber];

const payment = (
  id: string,
  pianoId: string,
  paidOn: string,
  amount: number,
  customer: string | null,
  note?: string
) => ({
  $id: id,
  $createdAt: `${paidOn}T09:00:00.000+00:00`,
  piano_id: pianoId,
  creator: testUser.accountId,
  amount,
  paid_on: paidOn,
  note,
  customer_name: customer,
});
const payments = [
  payment("p1", "kawai", "2026-09-02", 4000, "Asha Mehta", "UPI"),
  payment("p2", "kawai", "2026-08-02", 4000, "Asha Mehta"),
  payment("p3", "weber", "2026-06-10", 2500, "Asha Mehta"),
  payment("p4", "weber", "2026-05-12", 3000, "Ravi Kumar"),
  payment("p5", "kawai", "2026-04-01", 100, null),
];

const open = async (
  element: React.ReactElement,
  { paid = payments, items = pianos, user = testUser as any } = {}
) => {
  jest.mocked(getRentPaymentsBetween).mockResolvedValue(paid);
  const store = createTestStore({ user, items });
  const renderer = await mount(<Provider store={store}>{element}</Provider>);
  await flushPromises();
  return renderer;
};

const has = (renderer: any, text: string) =>
  allTexts(renderer.root).includes(text);
const button = (renderer: any, label: string) =>
  renderer.root.findAll(
    (node: any) =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === "function"
  )[0];

describe("the Customers list", () => {
  it("asks for every payment, for the signed-in owner", async () => {
    await open(<Customers />);

    expect(getRentPaymentsBetween).toHaveBeenCalledTimes(1);
    const [account, from, to] = jest.mocked(getRentPaymentsBetween).mock
      .calls[0];
    expect(account).toBe(testUser.accountId);
    expect(from).toEqual(new Date(2000, 0, 1));
    expect(to).toEqual(new Date(2026, 9, 1));
  });

  it("lists the customers, the one who has a piano now first, with what they paid", async () => {
    const renderer = await open(<Customers />);
    const texts = allTexts(renderer.root);

    expect(has(renderer, "Customers")).toBe(true);
    expect(has(renderer, "2 customers")).toBe(true);
    expect(texts.indexOf("Asha Mehta")).toBeLessThan(
      texts.indexOf("Ravi Kumar")
    );
    expect(has(renderer, "Kawai K-300 and Weber W-121 · 3 payments")).toBe(
      true
    );
    expect(has(renderer, "₹10,500")).toBe(true);
    expect(has(renderer, "Renting now")).toBe(true);
    expect(has(renderer, "Weber W-121 · 1 payment")).toBe(true);
    expect(has(renderer, "Last paid 12 May 2026")).toBe(true);
  });

  it("says how many payments aren't listed under anyone, because no name was saved", async () => {
    const renderer = await open(<Customers />);

    expect(
      has(
        renderer,
        "1 payment was recorded before names were saved, so it isn’t listed under anyone."
      )
    ).toBe(true);
  });

  it("opens a customer, by the name in the address", async () => {
    const renderer = await open(<Customers />);

    await act(async () => {
      button(
        renderer,
        "Ravi Kumar, Weber W-121 · 1 payment, paid ₹3,000, Last paid 12 May 2026"
      ).props.onPress();
    });

    expect(router.push).toHaveBeenCalledWith("/customer/ravi%20kumar");
  });

  it("says so when there are none yet", async () => {
    const renderer = await open(<Customers />, { paid: [], items: [weber] });

    expect(
      has(
        renderer,
        "No customers yet. They show up here once you record a rent payment or rent a piano to someone."
      )
    ).toBe(true);
  });

  it("says it couldn't load, and tries again from the button", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest
      .mocked(getRentPaymentsBetween)
      .mockRejectedValueOnce(new Error("offline"));
    const store = createTestStore({ user: testUser, items: pianos });
    const renderer = await mount(
      <Provider store={store}>
        <Customers />
      </Provider>
    );
    await flushPromises();
    expect(has(renderer, "Couldn’t load customers")).toBe(true);

    jest.mocked(getRentPaymentsBetween).mockResolvedValue(payments);
    await pressText(renderer.root, "Try again");

    expect(has(renderer, "Couldn’t load customers")).toBe(false);
    expect(has(renderer, "Asha Mehta")).toBe(true);
  });

  it("loads again when pulled down, and goes back", async () => {
    const renderer = await open(<Customers />);

    await act(async () => {
      await renderer.root.findByType(RefreshControl).props.onRefresh();
    });
    expect(getRentPaymentsBetween).toHaveBeenCalledTimes(2);

    await pressLabel(renderer.root, "Back");
    expect(router.back).toHaveBeenCalledTimes(1);
    jest.mocked(router.canGoBack).mockReturnValue(false);
    await pressLabel(renderer.root, "Back");
    expect(router.replace).toHaveBeenCalledWith("/profile");
  });

  it("is usable: everything named and big enough to press", async () => {
    const renderer = await open(<Customers />);

    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });
});

describe("a customer's page", () => {
  it("shows who they are, their number, and what they have paid in all", async () => {
    const renderer = await open(<Customer />);

    expect(has(renderer, "Asha Mehta")).toBe(true);
    expect(has(renderer, "98765 43210")).toBe(true);
    expect(has(renderer, "Paid in all")).toBe(true);
    expect(has(renderer, "₹10,500")).toBe(true);
    expect(has(renderer, "3 payments · last paid 2 Sep 2026")).toBe(true);
  });

  it("calls them, and opens their WhatsApp", async () => {
    const renderer = await open(<Customer />);

    await act(async () => button(renderer, "Call Asha Mehta").props.onPress());
    expect(Linking.openURL).toHaveBeenCalledWith("tel:9876543210");

    await act(async () =>
      button(renderer, "Message on WhatsApp").props.onPress()
    );
    expect(Linking.openURL).toHaveBeenCalledWith("https://wa.me/919876543210");
  });

  it("separates the piano they have now, with its status, from the ones they had", async () => {
    const renderer = await open(<Customer />);
    const texts = allTexts(renderer.root);

    expect(has(renderer, "Renting now")).toBe(true);
    expect(has(renderer, "Rented before")).toBe(true);
    expect(texts.indexOf("Renting now")).toBeLessThan(
      texts.indexOf("Rented before")
    );
    expect(has(renderer, "Renting now · 2 payments")).toBe(true);
    expect(has(renderer, statusLine(kawai)!.text)).toBe(true);
    expect(has(renderer, "1 payment")).toBe(true);
  });

  it("opens a piano", async () => {
    const renderer = await open(<Customer />);

    await act(async () => {
      button(
        renderer,
        "Kawai K-300, Renting now · 2 payments, ₹8,000"
      ).props.onPress();
    });

    expect(router.push).toHaveBeenCalledWith("/detail/kawai");
  });

  it("lists their payments, newest first, with the piano and the note", async () => {
    const renderer = await open(<Customer />);
    const texts = allTexts(renderer.root);

    expect(texts.indexOf("2 Sep 2026")).toBeLessThan(
      texts.indexOf("2 Aug 2026")
    );
    expect(texts.indexOf("2 Aug 2026")).toBeLessThan(
      texts.indexOf("10 Jun 2026")
    );
    expect(has(renderer, "Kawai K-300 · UPI")).toBe(true);
    // Not Ravi Kumar's, and not the one with no name
    expect(has(renderer, "12 May 2026")).toBe(false);
    expect(has(renderer, "1 Apr 2026")).toBe(false);
  });

  it("opens a customer who has no piano now, with no number to call", async () => {
    mockParams.key = "ravi%20kumar";
    const renderer = await open(<Customer />);

    expect(has(renderer, "Ravi Kumar")).toBe(true);
    expect(has(renderer, "₹3,000")).toBe(true);
    expect(has(renderer, "Renting now")).toBe(false);
    expect(has(renderer, "Rented before")).toBe(true);
    expect(button(renderer, "Message on WhatsApp")).toBeUndefined();
  });

  it("opens a customer who hasn't paid yet", async () => {
    const renderer = await open(<Customer />, { paid: [] });

    expect(has(renderer, "No payments yet")).toBe(true);
    expect(has(renderer, "Renting now · no payments yet")).toBe(true);
    expect(has(renderer, "Payments")).toBe(false);
  });

  it("says when there is no such customer", async () => {
    mockParams.key = "nobody";
    const renderer = await open(<Customer />);

    expect(has(renderer, "Customer not found")).toBe(true);
    await pressText(renderer.root, "Go back");
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it("says it couldn't load, and tries again", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest
      .mocked(getRentPaymentsBetween)
      .mockRejectedValueOnce(new Error("offline"));
    const store = createTestStore({ user: testUser, items: pianos });
    const renderer = await mount(
      <Provider store={store}>
        <Customer />
      </Provider>
    );
    await flushPromises();
    expect(has(renderer, "Couldn’t load this customer")).toBe(true);

    jest.mocked(getRentPaymentsBetween).mockResolvedValue(payments);
    await pressText(renderer.root, "Try again");

    expect(has(renderer, "Paid in all")).toBe(true);
  });

  it("is usable: everything named and big enough to press", async () => {
    const renderer = await open(<Customer />);

    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });
});
