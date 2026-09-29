jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn(), back: jest.fn() },
  usePathname: jest.fn(() => "/profile"),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({
    user: require("./helpers/fixtures").testUser,
    setUser: jest.fn(),
    setIsLogged: jest.fn(),
  }),
}));
jest.mock("@/services/notifications", () => ({
  scheduleAllRentalNotifications: jest.fn(() => Promise.resolve([])),
  cancelRentalNotification: jest.fn(() => Promise.resolve()),
}));

import React from "react";
import { act } from "react-test-renderer";
import { addMonths, startOfMonth, subDays } from "date-fns";
import Profile from "@/app/(tabs)/profile";
import { getRentPaymentsBetween, RentPayment } from "@/lib/appwrite";
import { paymentsChanged } from "@/redux/payments/actions";
import { removePianoItems } from "@/redux/pianos/actions";
import { toStoredDate } from "@/utils/dates";
import { totalReceived } from "@/utils/stats";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  createTestStore,
  flushPromises,
  renderWithStore,
} from "./helpers/render";

const firstOfMonth = startOfMonth(new Date());
const lastOfLastMonth = subDays(firstOfMonth, 1);
const firstOfNextMonth = addMonths(firstOfMonth, 1);

const seedPayment = (
  id: string,
  paidOn: Date,
  amount: number,
  extra: Record<string, unknown> = {}
) =>
  fakeBackend.payments.set(id, {
    $id: id,
    $createdAt: "2026-09-01T00:00:00.000+00:00",
    piano_id: "piano-1",
    creator: testUser.accountId,
    amount,
    paid_on: toStoredDate(paidOn),
    ...extra,
  });

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("what has been received", () => {
  const payment = (amount: number) => ({ amount }) as RentPayment;

  it("is the payments added up, and how many there are", () => {
    expect(totalReceived([payment(4000), payment(2500.5)])).toEqual({
      count: 2,
      total: 6500.5,
    });
    expect(totalReceived([])).toEqual({ count: 0, total: 0 });
  });
});

describe("finding an owner's payments in a period", () => {
  it("includes the first day and leaves out the day the period ends on", async () => {
    seedPayment("first-day", firstOfMonth, 1000);
    seedPayment("last-day", subDays(firstOfNextMonth, 1), 2000);
    seedPayment("before", lastOfLastMonth, 4000);
    seedPayment("after", firstOfNextMonth, 8000);

    const found = await getRentPaymentsBetween(
      testUser.accountId,
      firstOfMonth,
      firstOfNextMonth
    );

    expect(found.map((payment) => payment.$id).sort()).toEqual([
      "first-day",
      "last-day",
    ]);
  });

  it("leaves out other owners' payments", async () => {
    seedPayment("mine", firstOfMonth, 1000);
    seedPayment("theirs", firstOfMonth, 9000, { creator: "account-2" });

    const found = await getRentPaymentsBetween(
      testUser.accountId,
      firstOfMonth,
      firstOfNextMonth
    );

    expect(found.map((payment) => payment.$id)).toEqual(["mine"]);
  });

  it("finds every payment, not just the first page", async () => {
    for (let i = 0; i < 130; i++) seedPayment(`p-${i}`, firstOfMonth, 1);

    const found = await getRentPaymentsBetween(
      testUser.accountId,
      firstOfMonth,
      firstOfNextMonth
    );

    expect(found).toHaveLength(130);
  });
});

describe("received this month on the profile", () => {
  const renderProfile = async (
    items = [makePiano()]
  ) => {
    const store = createTestStore({ user: testUser, items });
    const renderer = renderWithStore(<Profile />, store);
    await flushPromises();
    return { store, renderer };
  };

  it("adds up this month's payments", async () => {
    seedPayment("a", firstOfMonth, 4000);
    seedPayment("b", new Date(), 2500);
    const { renderer } = await renderProfile();

    const texts = allTexts(renderer.root);
    expect(texts).toContain("₹6,500");
    expect(texts).toContain("Received this month");
    expect(texts).toContain("2 payments");
  });

  it("leaves out last month's payments and other owners'", async () => {
    seedPayment("this-month", new Date(), 4000);
    seedPayment("last-month", lastOfLastMonth, 9000);
    seedPayment("someone-else", new Date(), 7000, { creator: "account-2" });
    const { renderer } = await renderProfile();

    const texts = allTexts(renderer.root);
    expect(texts).toContain("₹4,000");
    expect(texts).toContain("1 payment");
    expect(texts).not.toContain("₹13,000");
  });

  it("says none when nothing was received", async () => {
    seedPayment("last-month", lastOfLastMonth, 9000);
    const { renderer } = await renderProfile();

    expect(allTexts(renderer.root)).toContain("₹0");
    expect(allTexts(renderer.root)).toContain("0 payments");
  });

  it("says so when the payments can't be loaded, and still shows the rest", async () => {
    fakeBackend.missingCollections.add("rent_payments");
    const { renderer } = await renderProfile();

    const texts = allTexts(renderer.root);
    expect(texts).toContain("—");
    expect(texts).toContain("Couldn't load payments");
    expect(texts).toContain("Received this month");
    expect(texts).toContain("0 sold this month");
  });

  it("updates when a payment is added or deleted", async () => {
    seedPayment("a", new Date(), 4000);
    const { store, renderer } = await renderProfile();
    expect(allTexts(renderer.root)).toContain("₹4,000");

    seedPayment("b", new Date(), 1000);
    await act(async () => {
      store.dispatch(paymentsChanged() as any);
    });
    await flushPromises();

    expect(allTexts(renderer.root)).toContain("₹5,000");
    expect(allTexts(renderer.root)).toContain("2 payments");
  });

  it("updates when a piano, and with it its payments, is deleted", async () => {
    seedPayment("a", new Date(), 4000);
    const { store, renderer } = await renderProfile([
      makePiano(),
      makePiano({ $id: "piano-2", title: "Kawai K-300" }),
    ]);
    expect(allTexts(renderer.root)).toContain("₹4,000");

    // Deleting the piano deletes its payments
    fakeBackend.payments.clear();
    await act(async () => {
      store.dispatch(removePianoItems(["piano-1"]) as any);
    });
    await flushPromises();

    expect(allTexts(renderer.root)).not.toContain("₹4,000");
    expect(allTexts(renderer.root)).toContain("0 payments");
  });
});
