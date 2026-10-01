jest.mock("@/lib/appwrite", () => ({
  getUserPianoEntries: jest.fn(),
  getRentPaymentsBetween: jest.fn(() => Promise.resolve([])),
  signOut: jest.fn(),
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
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn(), back: jest.fn() },
  usePathname: jest.fn(() => "/home"),
}));

import React from "react";
import { addDays, subMonths } from "date-fns";
import Home from "@/app/(tabs)/home";
import { getUserPianoEntries } from "@/lib/appwrite";
import { PianoItem } from "@/redux/pianos/types";
import { toStoredDate } from "@/utils/dates";
import { isOverdue } from "@/utils/pianoStatus";
import { salesInMonth } from "@/utils/stats";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  createTestStore,
  flushPromises,
  renderWithStore,
} from "./helpers/render";

const inDays = (days: number) => toStoredDate(addDays(new Date(), days)) as any;

const rental = (
  id: string,
  endInDays: number,
  extra: Partial<PianoItem> = {}
) =>
  makePiano({
    $id: id,
    title: `Rental ${id}`,
    category: "rentable",
    rental_period_start: inDays(endInDays - 60),
    rental_period_end: inDays(endInDays),
    rental_price: 4000,
    ...extra,
  });

const active = rental("active", 20, { rental_price: 5000 });
const dueToday = rental("due-today", 0, { rental_price: 3000 });
const overdue = rental("overdue", -3, { rental_price: 7000 });
const soldRental = rental("sold", -3, {
  // Today, so it is always this month, even on the 1st
  sold_date: inDays(0),
  sold_price: 90000,
});
const soldLastMonth = makePiano({
  $id: "sold-earlier",
  sold_date: toStoredDate(subMonths(new Date(), 1)) as any,
  sold_price: 50000,
});
const warehouse = makePiano({ $id: "warehouse" });
const pianos = [
  active,
  dueToday,
  overdue,
  soldRental,
  soldLastMonth,
  warehouse,
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("overdue rentals", () => {
  it("are rentals past their end date that haven't been sold", () => {
    expect(pianos.filter(isOverdue).map((piano) => piano.$id)).toEqual([
      "overdue",
    ]);
  });

  it("have no banner on the Pianos tab: Today's Needs attention says so", async () => {
    jest.mocked(getUserPianoEntries).mockResolvedValue(pianos as any);
    const store = createTestStore({ user: testUser });
    const renderer = renderWithStore(<Home />, store);
    await flushPromises();

    // (A card still has its own "Overdue · 3 days" badge; it is the strip that went)
    expect(allTexts(renderer.root).join(" ")).not.toMatch(/rentals? (is|are) overdue/);
    expect(allTexts(renderer.root)).not.toContain("View");
    // The list still shows every piano that isn't sold
    expect(store.getState().pianos.filteredItems.map((piano) => piano.$id)).toContain("overdue");
  });

  it("have no banner when there are none", async () => {
    jest
      .mocked(getUserPianoEntries)
      .mockResolvedValue([active, warehouse] as any);
    const renderer = renderWithStore(
      <Home />,
      createTestStore({ user: testUser })
    );
    await flushPromises();

    expect(allTexts(renderer.root).join(" ")).not.toMatch(/overdue/);
  });
});

describe("income", () => {
  it("adds up this month's sales", () => {
    expect(salesInMonth(pianos)).toEqual({ count: 1, total: 90000 });
    expect(salesInMonth(pianos, subMonths(new Date(), 1))).toEqual({
      count: 1,
      total: 50000,
    });
  });

});
