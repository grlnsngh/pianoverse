import { addDays, format } from "date-fns";
import {
  aboutSection,
  ACTION_LABELS,
  barInfo,
  formatDay,
  initialsOf,
  listActions,
  menuActions,
  metaLine,
  paymentsSummary,
  primaryAction,
  rentalPeriod,
  rentalRows,
  saleRows,
  statusLine,
  titlePrice,
} from "@/utils/pianoDetail";
import { makePiano } from "./helpers/fixtures";

// Tuesday 29 September 2026, the day on the boards
beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 12, 0, 0) });
});
afterEach(() => {
  jest.useRealTimers();
});

const day = (offset: number) => format(addDays(new Date(2026, 8, 29), offset), "yyyy-MM-dd");

const rented = (endsIn: number, overrides: Record<string, unknown> = {}) =>
  makePiano({
    category: "rentable",
    title: "Young Chang U-121",
    make: "Young Chang",
    company_associated: "The Piano Services",
    rental_period_start: day(endsIn - 30) as any,
    rental_period_end: day(endsIn) as any,
    rental_price: 4500,
    ...overrides,
  } as any);
const onSale = makePiano({
  category: "on_sale",
  make: "Kreutzer",
  company_associated: "RS Music Center",
  on_sale_price: 95000,
  on_sale_purchase_from: "Mehta Traders",
  on_sale_import_date: "2026-06-02" as any,
  date_of_purchase: "2026-05-18" as any,
  description: "Mahogany finish. Recently tuned.",
});
const events = makePiano({
  category: "events",
  make: "Steinway",
  company_associated: "Shamshersons",
  event_purchase_price: 780000,
  event_purchase_from: "Bose Pianos",
  event_model_number: "Model D",
  event_b_number: "B-12/34",
});
const warehouse = makePiano({ category: "warehouse", make: "Ronish", warehouse_since_date: "2026-03-05" as any });
const sold = makePiano({
  category: "rentable",
  make: "Zimmermann",
  company_associated: "Shamshersons",
  sold_date: "2026-09-14" as any,
  sold_price: 142000,
  sold_to_name: "Vikram Sethi",
  sold_to_address: "22, Civil Lines, Jalandhar",
});

describe("the line under the title", () => {
  it("names the category, the make and the company", () => {
    expect(metaLine(rented(10))).toBe("Rentable · Young Chang · The Piano Services");
    expect(metaLine(onSale)).toBe("On sale · Kreutzer · RS Music Center");
  });

  it("says 'Was' for a piano that has been sold", () => {
    expect(metaLine(sold)).toBe("Was rentable · Zimmermann · Shamshersons");
  });

  it("leaves out what is missing", () => {
    expect(metaLine(makePiano({ category: "warehouse", make: "", company_associated: null }))).toBe("Warehouse");
    expect(metaLine(makePiano({ category: "events", make: " Yamaha ", company_associated: "" }))).toBe("Events · Yamaha");
  });
});

describe("the status line", () => {
  it("says how long ago a rental ended, in red", () => {
    expect(statusLine(rented(-18))).toEqual({ text: "Rental ended 18 days ago", tone: "late", dot: true });
    expect(statusLine(rented(-280))).toEqual({ text: "Rental ended 9 months ago", tone: "late", dot: true });
  });

  it("says how soon a rental ends, in orange, and on the last day", () => {
    expect(statusLine(rented(3))).toEqual({ text: "Rental ends in 3 days", tone: "soon", dot: true });
    expect(statusLine(rented(0))).toEqual({ text: "Rental ends today", tone: "soon", dot: true });
  });

  it("says how long a rental has left, in grey", () => {
    expect(statusLine(rented(12))).toEqual({ text: "Rental ends in 12 days", tone: "normal", dot: true });
    expect(statusLine(rented(75))).toEqual({ text: "Rental ends in 2 months", tone: "normal", dot: true });
  });

  it("says when a piano was sold, plain and bold, with no dot", () => {
    expect(statusLine(sold)).toEqual({ text: "Sold on 14 Sep 2026", tone: "ink", dot: false });
  });

  it("is empty for a piano that isn't rented or sold, and for a rental with no end date", () => {
    expect(statusLine(onSale)).toBeNull();
    expect(statusLine(warehouse)).toBeNull();
    expect(statusLine(rented(5, { rental_period_end: null }))).toBeNull();
  });

  it("says nothing of a sold piano's old rental", () => {
    const soldRental = rented(-5, { sold_date: "2026-09-20", sold_price: 1000 });

    expect(statusLine(soldRental)?.text).toBe("Sold on 20 Sep 2026");
  });
});

describe("the price under the title", () => {
  it("is the asking price of a piano on sale, with Indian digit grouping", () => {
    expect(titlePrice(onSale)).toBe("₹95,000");
    expect(titlePrice({ ...onSale, on_sale_price: 1250000 })).toBe("₹12,50,000");
  });

  it("is missing for everything else, and for a sold piano", () => {
    expect(titlePrice(rented(10))).toBeNull();
    expect(titlePrice(events)).toBeNull();
    expect(titlePrice({ ...onSale, sold_date: "2026-09-01" as any })).toBeNull();
    expect(titlePrice({ ...onSale, on_sale_price: null })).toBeNull();
  });
});

describe("the actions", () => {
  it("leads with Record payment for a rental, Mark as sold for a piano on sale, Edit for events and the warehouse, and Undo sale once sold", () => {
    expect(primaryAction(rented(10))).toBe("recordPayment");
    expect(primaryAction(rented(-10))).toBe("recordPayment");
    expect(primaryAction(onSale)).toBe("markSold");
    expect(primaryAction(events)).toBe("edit");
    expect(primaryAction(warehouse)).toBe("edit");
    expect(primaryAction(sold)).toBe("undoSale");
  });

  it("lists the rest at the bottom of the page, without repeating the one in the bar", () => {
    expect(listActions(rented(10))).toEqual(["extend", "edit", "markSold", "delete"]);
    expect(listActions(onSale)).toEqual(["edit", "delete"]);
    expect(listActions(events)).toEqual(["markSold", "delete"]);
    expect(listActions(warehouse)).toEqual(["markSold", "delete"]);
    expect(listActions(sold)).toEqual(["edit", "delete"]);
  });

  it("gathers all of them for the ⋯ button, the one in the bar first, each once", () => {
    expect(menuActions(rented(10))).toEqual(["recordPayment", "extend", "edit", "markSold", "delete"]);
    expect(menuActions(onSale)).toEqual(["markSold", "edit", "delete"]);
    expect(menuActions(events)).toEqual(["edit", "markSold", "delete"]);
    expect(menuActions(sold)).toEqual(["undoSale", "edit", "delete"]);
  });

  it("puts Delete last, and has a label for every action", () => {
    [rented(10), onSale, events, warehouse, sold].forEach((piano) => {
      const actions = menuActions(piano);
      expect(actions[actions.length - 1]).toBe("delete");
      expect(new Set(actions).size).toBe(actions.length);
    });
    expect(ACTION_LABELS).toEqual({
      recordPayment: "Record payment",
      remind: "Remind customer",
      extend: "Extend rental",
      edit: "Edit piano",
      markSold: "Mark as sold",
      undoSale: "Undo sale",
      delete: "Delete piano",
    });
  });
});

describe("the sticky bar's amount and caption", () => {
  it("shows the rent and 'Rent overdue' for a rental that has ended", () => {
    expect(barInfo(rented(-9))).toEqual({ amount: "₹4,500", caption: "Rent overdue", tone: "late" });
  });

  it("shows the rent and how soon the rental ends, or how long it has left", () => {
    expect(barInfo(rented(3))).toEqual({ amount: "₹4,500", caption: "Ends in 3 days", tone: "soon" });
    expect(barInfo(rented(0))).toEqual({ amount: "₹4,500", caption: "Ends today", tone: "soon" });
    expect(barInfo(rented(40))).toEqual({ amount: "₹4,500", caption: "40 days left", tone: "normal" });
  });

  it("says a rentable piano with no rental is available", () => {
    expect(barInfo(rented(5, { rental_period_end: null, rental_price: null }))).toEqual({
      amount: null,
      caption: "Available",
      tone: "normal",
    });
  });

  it("shows the asking price and 'Listed for sale'", () => {
    expect(barInfo(onSale)).toEqual({ amount: "₹95,000", caption: "Listed for sale", tone: "normal" });
  });

  it("shows what was paid for an events piano, and where a warehouse piano has been since", () => {
    expect(barInfo(events)).toEqual({ amount: "₹7,80,000", caption: "Event stock", tone: "normal" });
    expect(barInfo(warehouse)).toEqual({ amount: null, caption: "Stored since Mar 2026", tone: "normal" });
  });

  it("shows what a sold piano sold for", () => {
    expect(barInfo(sold)).toEqual({ amount: "₹1,42,000", caption: "Sold", tone: "normal" });
    expect(barInfo({ ...sold, sold_price: null })).toEqual({ amount: null, caption: "Sold", tone: "normal" });
  });
});

describe("the Details / About this piano section", () => {
  it("is 'About this piano' for a rental or a sold piano, 'Details' for the rest", () => {
    expect(aboutSection(rented(10)).title).toBe("About this piano");
    expect(aboutSection(sold).title).toBe("About this piano");
    expect(aboutSection(onSale).title).toBe("Details");
    expect(aboutSection(events).title).toBe("Details");
    expect(aboutSection(warehouse).title).toBe("Details");
  });

  it("lists make, company and when it was bought, and the description under them", () => {
    const section = aboutSection(
      rented(10, { date_of_purchase: "2023-08-14", description: "Upright, walnut finish." })
    );

    expect(section.rows).toEqual([
      { label: "Make", value: "Young Chang" },
      { label: "Company", value: "The Piano Services" },
      { label: "Purchased", value: "14 Aug 2023" },
    ]);
    expect(section.note).toBe("Upright, walnut finish.");
  });

  it("adds where a piano on sale was bought from and when it was imported", () => {
    expect(aboutSection(onSale).rows).toEqual([
      { label: "Make", value: "Kreutzer" },
      { label: "Company", value: "RS Music Center" },
      { label: "Bought from", value: "Mehta Traders" },
      { label: "Imported", value: "2 Jun 2026" },
      { label: "Purchased", value: "18 May 2026" },
    ]);
    expect(aboutSection(onSale).note).toBe("Mahogany finish. Recently tuned.");
  });

  it("adds an events piano's price, where it was bought, its model number and its B number", () => {
    expect(aboutSection(events).rows).toEqual([
      { label: "Make", value: "Steinway" },
      { label: "Company", value: "Shamshersons" },
      { label: "Purchase price", value: "₹7,80,000", strong: true },
      { label: "Bought from", value: "Bose Pianos" },
      { label: "Model number", value: "Model D" },
      { label: "B number", value: "B-12/34" },
      // Every fixture piano was bought on 15 Jan 2026
      { label: "Purchased", value: "15 Jan 2026" },
    ]);
  });

  it("adds when a warehouse piano went into storage", () => {
    expect(aboutSection(warehouse).rows).toEqual([
      { label: "Make", value: "Ronish" },
      { label: "Company", value: "Shamshersons" },
      { label: "Stored since", value: "5 Mar 2026" },
      { label: "Purchased", value: "15 Jan 2026" },
    ]);
  });

  it("leaves out rows with no value, and has no note without a description", () => {
    const section = aboutSection(makePiano({ category: "events", make: "", company_associated: "", date_of_purchase: null, description: "  " } as any));

    expect(section.rows).toEqual([]);
    expect(section.note).toBeNull();
  });

  it("keeps what is particular to a category after the piano is sold, but not its old rental", () => {
    const soldOnSale = { ...onSale, sold_date: "2026-09-01" as any };

    expect(aboutSection(soldOnSale).rows.map((row) => row.label)).toContain("Bought from");
    expect(aboutSection(sold).rows.map((row) => row.label)).toEqual(["Make", "Company", "Purchased"]);
  });
});

describe("the Sale section", () => {
  it("lists the price in bold, the buyer, the address and the day", () => {
    expect(saleRows(sold)).toEqual([
      { label: "Price", value: "₹1,42,000", strong: true },
      { label: "Buyer", value: "Vikram Sethi" },
      { label: "Address", value: "22, Civil Lines, Jalandhar" },
      { label: "Sold on", value: "14 Sep 2026" },
    ]);
  });

  it("leaves out what wasn't recorded", () => {
    expect(saleRows({ ...sold, sold_price: null, sold_to_address: null })).toEqual([
      { label: "Buyer", value: "Vikram Sethi" },
      { label: "Sold on", value: "14 Sep 2026" },
    ]);
  });
});

describe("the rental's period", () => {
  it("splits the bar into the days gone and the days left, with the dates and how long is left", () => {
    // 30 days long, 20 days in
    const period = rentalPeriod(rented(10));

    expect(period.bar).toEqual({ done: 20, rest: 10, overdue: false });
    expect(period.start).toBe("9 Sep 2026");
    expect(period.end).toBe("9 Oct 2026");
    expect(period.endCaption).toEqual({ text: "10 days left", tone: "normal" });
  });

  it("splits an ended rental into its whole length and the days over, in red", () => {
    const period = rentalPeriod(rented(-18));

    expect(period.bar).toEqual({ done: 30, rest: 18, overdue: true });
    expect(period.endCaption).toEqual({ text: "Ended · 18 days over", tone: "late" });
  });

  it("counts months once it is long over", () => {
    expect(rentalPeriod(rented(-280)).endCaption).toEqual({ text: "Ended · 9 months over", tone: "late" });
  });

  it("is full on the last day, with the end in orange", () => {
    const period = rentalPeriod(rented(0));

    expect(period.bar).toEqual({ done: 30, rest: 0, overdue: false });
    expect(period.endCaption).toEqual({ text: "Ends today", tone: "soon" });
  });

  it("is empty before it starts", () => {
    const period = rentalPeriod(rented(40, { rental_period_start: day(5) as any }));

    expect(period.bar).toEqual({ done: 0, rest: 35, overdue: false });
  });

  it("has no bar without both dates, or with an end before the start", () => {
    expect(rentalPeriod(rented(10, { rental_period_start: null })).bar).toBeNull();
    expect(rentalPeriod(rented(10, { rental_period_end: null })).bar).toBeNull();
    expect(rentalPeriod(rented(3, { rental_period_start: day(9) as any })).bar).toBeNull();
  });

  it("has no dates or caption for a rental with none", () => {
    const period = rentalPeriod(rented(10, { rental_period_start: null, rental_period_end: null }));

    expect(period).toEqual({ start: null, end: null, bar: null, endCaption: null });
  });
});

describe("the rental's rows", () => {
  it("shows the rent in bold and the address", () => {
    expect(rentalRows(rented(10, { rental_customer_address: "B-42, Sector 21, Chandigarh" }))).toEqual([
      { label: "Rent", value: "₹4,500", strong: true },
      { label: "Address", value: "B-42, Sector 21, Chandigarh" },
    ]);
  });

  it("leaves out what is missing", () => {
    expect(rentalRows(rented(10, { rental_price: null }))).toEqual([]);
  });
});

describe("the customer's initials", () => {
  it.each([
    ["Meera Kapoor", "MK"],
    ["  asha   mehta ", "AM"],
    ["Cher", "C"],
    ["Ravi Kumar Singh", "RK"],
    ["", ""],
    [null, ""],
    [undefined, ""],
  ])("for %p are %p", (name, initials) => {
    expect(initialsOf(name as any)).toBe(initials);
  });
});

describe("the payments' summary", () => {
  it("adds them up and counts them", () => {
    expect(paymentsSummary([{ amount: 4500 }, { amount: 4500 }, { amount: 45000 }])).toBe("₹54,000 received · 3 payments");
  });

  it("says 1 payment in the singular", () => {
    expect(paymentsSummary([{ amount: 5000 }])).toBe("₹5,000 received · 1 payment");
  });
});

describe("formatDay", () => {
  it("writes a stored day the way the boards do, from any stored shape", () => {
    expect(formatDay("2025-12-21")).toBe("21 Dec 2025");
    expect(formatDay("2025-12-21T00:00:00.000+00:00")).toBe("21 Dec 2025");
  });

  it("is null without a date", () => {
    expect(formatDay(null)).toBeNull();
    expect(formatDay(undefined)).toBeNull();
    expect(formatDay("")).toBeNull();
  });
});
