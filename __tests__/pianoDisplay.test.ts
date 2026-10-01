import { getPianoDisplay } from "@/utils/pianoDisplay";
import { makePiano } from "./helpers/fixtures";

// Every date below is counted from this day (in the app's users' time zone)
beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 12, 0, 0) });
});
afterEach(() => {
  jest.useRealTimers();
});

const rental = (overrides: Record<string, unknown> = {}) =>
  getPianoDisplay(
    makePiano({
      category: "rentable",
      rental_price: 4500,
      rental_period_end: "2026-10-11" as any,
      ...overrides,
    })
  );

describe("category", () => {
  it.each([
    ["rentable", "Rentable", "categoryRentable"],
    ["events", "Events", "categoryEvents"],
    ["on_sale", "On sale", "categoryOnSale"],
    ["warehouse", "Warehouse", "categoryWarehouse"],
  ])("names %s as %s, with its icon", (category, label, icon) => {
    const display = getPianoDisplay(makePiano({ category }));

    expect(display.categoryLabel).toBe(label);
    expect(display.categoryIcon).toBe(icon);
  });

  it("copes with a category it doesn't know", () => {
    const display = getPianoDisplay(makePiano({ category: "mystery" }));

    expect(display).toMatchObject({
      categoryLabel: "Unknown category",
      categoryIcon: "categoryAll",
      price: null,
      badge: null,
    });
  });
});

describe("a rental", () => {
  it("shows the rent, in Indian grouping, and the time left in grey after it", () => {
    const display = rental({ rental_price: 142000 });

    expect(display.price).toBe("₹1,42,000");
    expect(display.status).toEqual({ text: "12 days left", tone: "normal" });
    expect(display.badge).toBeNull();
    expect(display.cardRest).toBe(" · 12 days left");
  });

  it("has a red badge, and no grey text after the price, when it is overdue", () => {
    const display = rental({ rental_period_end: "2026-09-11" });

    expect(display.status).toEqual({ text: "Overdue · 18 days", tone: "late" });
    expect(display.badge).toEqual({ text: "Overdue · 18 days", tone: "late" });
    expect(display.cardRest).toBe("");
  });

  it("has an orange badge when it ends within a week", () => {
    const display = rental({ rental_period_end: "2026-10-02" });

    expect(display.status.tone).toBe("soon");
    expect(display.badge).toEqual({ text: "Ends in 3 days", tone: "soon" });
    expect(display.cardRest).toBe("");
  });

  it("counts months from 60 days", () => {
    expect(rental({ rental_period_end: "2025-12-29" }).badge?.text).toBe("Overdue · 9 months");
    expect(rental({ rental_period_end: "2026-11-30" }).status.text).toBe("2 months left");
  });

  it("drops the separator when there is no rent to put it after", () => {
    const display = rental({ rental_price: null });

    expect(display.price).toBeNull();
    expect(display.cardRest).toBe("12 days left");
  });

  it("is available when it has no rental dates", () => {
    const display = rental({ rental_period_end: undefined });

    expect(display.status).toEqual({ text: "Available", tone: "normal" });
    expect(display.badge).toBeNull();
    expect(display.cardRest).toBe(" · Available");
  });

  it("reads the date shapes Appwrite returns", () => {
    const display = rental({ rental_period_end: "2026-10-11T00:00:00.000+00:00" });

    expect(display.status.text).toBe("12 days left");
  });
});

describe("events, on sale and warehouse", () => {
  it("shows an events piano's purchase price and says it is event stock", () => {
    const display = getPianoDisplay(
      makePiano({ category: "events", event_purchase_price: 780000 })
    );

    expect(display.price).toBe("₹7,80,000");
    expect(display.status).toEqual({ text: "Event stock", tone: "normal" });
    expect(display.badge).toBeNull();
    expect(display.cardRest).toBe("");
  });

  it("shows an on-sale piano's price and says it is listed", () => {
    const display = getPianoDisplay(makePiano({ category: "on_sale", on_sale_price: 115000 }));

    expect(display.price).toBe("₹1,15,000");
    expect(display.status).toEqual({ text: "Listed for sale", tone: "normal" });
  });

  it("has no price for a warehouse piano, and says since when it has been stored", () => {
    const display = getPianoDisplay(
      makePiano({ category: "warehouse", warehouse_since_date: "2026-03-14" as any })
    );

    expect(display.price).toBeNull();
    expect(display.status.text).toBe("Stored since Mar 2026");
    // The card says it in place of a price
    expect(display.cardRest).toBe("Stored since Mar 2026");
  });

  it("still says something when the warehouse date is missing", () => {
    const display = getPianoDisplay(makePiano({ category: "warehouse", warehouse_since_date: null }));

    expect(display.status.text).toBe("In the warehouse");
  });

  it("shows no price for an amount of nothing", () => {
    for (const price of [0, null, undefined]) {
      expect(
        getPianoDisplay(makePiano({ category: "events", event_purchase_price: price })).price
      ).toBeNull();
    }
  });

  it("ignores rental dates left over from when it was a rental", () => {
    const display = getPianoDisplay(
      makePiano({ category: "events", rental_period_end: "2026-09-01" as any })
    );

    expect(display.badge).toBeNull();
    expect(display.status.text).toBe("Event stock");
  });
});

describe("a sold piano", () => {
  it("shows what it sold for, the sale date and Sold after the price", () => {
    const display = getPianoDisplay(
      makePiano({ category: "on_sale", sold_date: "2026-09-12" as any, sold_price: 95000 })
    );

    expect(display.price).toBe("₹95,000");
    expect(display.status).toEqual({ text: "Sold 12 Sep 2026", tone: "normal" });
    expect(display.cardRest).toBe(" · Sold");
    expect(display.badge).toBeNull();
  });

  it("says just Sold when nothing else is known", () => {
    const display = getPianoDisplay(
      makePiano({ category: "on_sale", sold_date: "2026-09-12" as any, sold_price: null })
    );

    expect(display.price).toBeNull();
    expect(display.cardRest).toBe("Sold");
  });

  it("gets no overdue badge, even if it was a rental that had ended", () => {
    const display = getPianoDisplay(
      makePiano({
        category: "rentable",
        rental_period_end: "2026-09-01" as any,
        sold_date: "2026-09-12" as any,
      })
    );

    expect(display.badge).toBeNull();
    expect(display.status.tone).toBe("normal");
  });
});
