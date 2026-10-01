import { DEFAULT_FILTERS, SORT_BY_OPTIONS } from "@/constants/Piano";
import { applyPianoFilters } from "@/utils/filterPianos";
import { countActiveFilters } from "@/utils/filters";
import { makePiano } from "./helpers/fixtures";

// "Today" for the rentals below
beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 12, 0, 0) });
});
afterEach(() => {
  jest.useRealTimers();
});

const piano = (id: string, overrides: Record<string, unknown> = {}) =>
  makePiano({ $id: id, title: id, ...overrides } as any);

const ids = (pianos: { $id: string }[]) => pianos.map((p) => p.$id);
const filters = (overrides: Record<string, unknown> = {}) => ({
  ...DEFAULT_FILTERS,
  ...overrides,
});

describe("which pianos are shown", () => {
  const stock = piano("stock");
  const sold = piano("sold", { sold_date: "2026-09-01" });

  it("leaves sold pianos out unless the Sold filter is on", () => {
    expect(ids(applyPianoFilters([stock, sold], filters()))).toEqual(["stock"]);
  });

  it("shows only the sold pianos with the Sold filter", () => {
    expect(ids(applyPianoFilters([stock, sold], filters({ isSold: true })))).toEqual(["sold"]);
  });

  it("shows nothing for nothing", () => {
    expect(applyPianoFilters([], filters())).toEqual([]);
  });

  it("gives back a new list and leaves the one it was given alone", () => {
    const input = [piano("b", { $createdAt: "2026-01-01T00:00:00Z" }), piano("a", { $createdAt: "2026-02-01T00:00:00Z" })];
    const before = [...input];

    const output = applyPianoFilters(input, filters());

    expect(output).not.toBe(input);
    expect(input).toEqual(before);
  });
});

describe("sorting", () => {
  it("puts the latest added first", () => {
    const list = [
      piano("old", { $createdAt: "2026-01-01T10:00:00.000+00:00" }),
      piano("new", { $createdAt: "2026-05-01T10:00:00.000+00:00" }),
      piano("mid", { $createdAt: "2026-03-01T10:00:00.000+00:00" }),
    ];

    expect(ids(applyPianoFilters(list, filters()))).toEqual(["new", "mid", "old"]);
  });

  it("puts the latest purchase first, whatever shape the date was saved in", () => {
    const list = [
      piano("a", { date_of_purchase: "2026-01-05" }),
      piano("b", { date_of_purchase: "Mon Mar 09 2026" }),
      piano("c", { date_of_purchase: "2025-11-20T09:30:00.000Z" }),
      piano("d", { date_of_purchase: undefined }),
    ];

    expect(
      ids(applyPianoFilters(list, filters({ sortBy: SORT_BY_OPTIONS.PURCHASE_DATE })))
    ).toEqual(["b", "a", "c", "d"]);
  });

  it("sorts titles A to Z and Z to A, with leading numbers in numeric order first", () => {
    const list = ["10 Yamaha", "Bosendorfer", "2 Kawai", "Weber"].map((title) =>
      piano(title, { title })
    );

    expect(
      ids(applyPianoFilters(list, filters({ sortBy: SORT_BY_OPTIONS.TITLE_ASC })))
    ).toEqual(["2 Kawai", "10 Yamaha", "Bosendorfer", "Weber"]);
    expect(
      ids(applyPianoFilters(list, filters({ sortBy: SORT_BY_OPTIONS.TITLE_DES })))
    ).toEqual(["Weber", "Bosendorfer", "10 Yamaha", "2 Kawai"]);
  });

  it("orders numbered titles by what follows the number when the numbers match", () => {
    const list = ["5 Weber", "5 Kawai"].map((title) => piano(title, { title }));

    expect(
      ids(applyPianoFilters(list, filters({ sortBy: SORT_BY_OPTIONS.TITLE_ASC })))
    ).toEqual(["5 Kawai", "5 Weber"]);
  });

  it("puts rentals that end soonest first when sorting by due date, and shows only rentals", () => {
    const list = [
      piano("later", { category: "rentable", rental_period_end: "2026-12-01" }),
      piano("soon", { category: "rentable", rental_period_end: "2026-10-05" }),
      piano("no-dates", { category: "rentable" }),
      piano("store", { category: "warehouse" }),
    ];

    expect(
      ids(applyPianoFilters(list, filters({ sortBy: SORT_BY_OPTIONS.DUE_DATE })))
    ).toEqual(["soon", "later"]);
  });

  it("keeps every rental when none has an end date, sorting by due date", () => {
    const list = [
      piano("a", { category: "rentable" }),
      piano("b", { category: "rentable" }),
      piano("store", { category: "warehouse" }),
    ];

    expect(
      ids(applyPianoFilters(list, filters({ sortBy: SORT_BY_OPTIONS.DUE_DATE })))
    ).toEqual(["a", "b"]);
  });

  it("warns about a sort it doesn't know and leaves the order", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const list = [piano("x"), piano("y")];

    expect(ids(applyPianoFilters(list, filters({ sortBy: "Colour" })))).toEqual(["x", "y"]);
    expect(warn).toHaveBeenCalledWith("Unknown sort option:", "Colour");
    warn.mockRestore();
  });
});

describe("narrowing", () => {
  const list = [
    piano("rent-active", { category: "rentable", rental_period_end: "2026-12-01" }),
    piano("rent-today", { category: "rentable", rental_period_end: "2026-09-29" }),
    piano("rent-overdue", { category: "rentable", rental_period_end: "2026-08-01" }),
    piano("event", { category: "events" }),
    piano("sale", { category: "on_sale" }),
    piano("store", { category: "warehouse" }),
  ];
  const ofFilters = (overrides: Record<string, unknown>) =>
    ids(applyPianoFilters(list, filters({ sortBy: SORT_BY_OPTIONS.TITLE_ASC, ...overrides })));

  it("keeps a category, written as a label or as the stored value", () => {
    expect(ofFilters({ category: "Events" })).toEqual(["event"]);
    expect(ofFilters({ category: "events" })).toEqual(["event"]);
    expect(ofFilters({ category: "On Sale" })).toEqual(["sale"]);
    expect(ofFilters({ category: "on_sale" })).toEqual(["sale"]);
    expect(ofFilters({ category: "Warehouse" })).toEqual(["store"]);
  });

  it("keeps the rentals that have not ended, through their last day", () => {
    expect(ofFilters({ isActiveRentals: true })).toEqual(["rent-active", "rent-today"]);
  });

  it("keeps the rentals that have ended", () => {
    expect(ofFilters({ isOverdue: true })).toEqual(["rent-overdue"]);
  });

  it("combines a category with the other filters", () => {
    expect(ofFilters({ category: "Rentable", isOverdue: true })).toEqual(["rent-overdue"]);
    expect(ofFilters({ category: "Events", isOverdue: true })).toEqual([]);
  });
});

describe("how many filters are on", () => {
  it("counts a category, a due-date sort, active rentals, overdue and sold", () => {
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0);
    expect(countActiveFilters(filters({ category: "rentable" }))).toBe(1);
    expect(
      countActiveFilters(
        filters({ category: "rentable", sortBy: SORT_BY_OPTIONS.DUE_DATE, isActiveRentals: true })
      )
    ).toBe(3);
    expect(countActiveFilters(filters({ isOverdue: true }))).toBe(1);
    expect(countActiveFilters(filters({ isSold: true }))).toBe(1);
  });

  it("doesn't count sorting alone, since it hides nothing", () => {
    expect(countActiveFilters(filters({ sortBy: SORT_BY_OPTIONS.TITLE_ASC }))).toBe(0);
    expect(countActiveFilters(filters({ sortBy: SORT_BY_OPTIONS.PURCHASE_DATE }))).toBe(0);
  });
});
