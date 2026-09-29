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
import Profile from "@/app/(tabs)/profile";
import { DEFAULT_FILTERS } from "@/constants/Piano";
import { getRentPaymentsBetween, getUserPianoEntries } from "@/lib/appwrite";
import { setPianoFilters } from "@/redux/pianos/actions";
import { PianoItem } from "@/redux/pianos/types";
import { toStoredDate } from "@/utils/dates";
import { countActiveFilters } from "@/utils/filters";
import { isOverdue } from "@/utils/pianoStatus";
import { rentFromActiveRentals, salesInMonth } from "@/utils/stats";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  createTestStore,
  flushPromises,
  pressText,
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
  sold_date: inDays(-1),
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

  it("have a banner on Home that lists just them", async () => {
    jest.mocked(getUserPianoEntries).mockResolvedValue(pianos as any);
    const store = createTestStore({ user: testUser });
    const renderer = renderWithStore(<Home />, store);
    await flushPromises();

    expect(allTexts(renderer.root)).toContain("1 rental is overdue");

    await pressText(renderer.root, "View");

    const { filters, filteredItems } = store.getState().pianos;
    expect(filters.isOverdue).toBe(true);
    expect(countActiveFilters(filters)).toBe(1);
    expect(filteredItems.map((piano) => piano.$id)).toEqual(["overdue"]);
    // No need for the banner while they're shown
    expect(allTexts(renderer.root)).not.toContain("1 rental is overdue");
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
  it("adds up the rent of the pianos rented out now", () => {
    // Active and due today; not overdue or sold
    expect(rentFromActiveRentals(pianos)).toBe(8000);
  });

  it("adds up this month's sales", () => {
    expect(salesInMonth(pianos)).toEqual({ count: 1, total: 90000 });
    expect(salesInMonth(pianos, subMonths(new Date(), 1))).toEqual({
      count: 1,
      total: 50000,
    });
  });

  it("is shown on the profile, with a link to the overdue rentals", async () => {
    const store = createTestStore({ user: testUser, items: pianos });
    const layoutStatus = {
      card: "checked",
      list: "unchecked",
      grid: "unchecked",
    };
    store.dispatch(setPianoFilters({ ...DEFAULT_FILTERS, layoutStatus }));
    jest
      .mocked(getRentPaymentsBetween)
      .mockResolvedValue([{ amount: 3000 }, { amount: 1500 }] as any);
    const renderer = renderWithStore(<Profile />, store);
    await flushPromises();

    const texts = allTexts(renderer.root);
    expect(texts).toContain("₹4,500");
    expect(texts).toContain("Received this month");
    expect(texts).toContain("2 payments");
    // The rent of the rentals out now is still there, as an estimate
    expect(texts).toContain("₹8,000");
    expect(texts).toContain("Rent from 2 active rentals");
    expect(texts).toContain("₹90,000");
    expect(texts).toContain("1 sold this month");

    await pressText(renderer.root, "1 rental is overdue");

    expect(store.getState().navigation.activeTab).toBe("home");
    expect(store.getState().pianos.filters).toEqual({
      ...DEFAULT_FILTERS,
      layoutStatus,
      isOverdue: true,
    });
  });
});

describe("the profile's shortcuts", () => {
  const layoutStatus = {
    card: "unchecked",
    list: "unchecked",
    grid: "checked",
  };

  const renderProfile = () => {
    const store = createTestStore({ user: testUser, items: pianos });
    store.dispatch(
      setPianoFilters({ ...DEFAULT_FILTERS, layoutStatus, isSold: true })
    );
    return { store, renderer: renderWithStore(<Profile />, store) };
  };

  it("filter by category but keep the chosen layout", async () => {
    const { store, renderer } = renderProfile();

    await pressText(renderer.root, "Storage");

    expect(store.getState().navigation.activeTab).toBe("home");
    // Other filters start over, the layout stays
    expect(store.getState().pianos.filters).toEqual({
      ...DEFAULT_FILTERS,
      layoutStatus,
      category: "Warehouse",
    });
  });

  it("show active rentals but keep the chosen layout", async () => {
    const { store, renderer } = renderProfile();

    await pressText(renderer.root, "Active Rentals");

    expect(store.getState().pianos.filters).toEqual({
      ...DEFAULT_FILTERS,
      layoutStatus,
      category: "Rentable",
      isActiveRentals: true,
    });
  });
});
