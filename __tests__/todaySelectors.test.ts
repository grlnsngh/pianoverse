import { addDays, format, subDays } from "date-fns";
import { getRentalStatusAgo } from "@/utils/rentalStatus";
import {
  needsAttention,
  newestFirst,
  paymentsInMonth,
  receivedInMonth,
  recentPayments,
  rentedOut,
  stockCounts,
} from "@/utils/today";
import { makePiano } from "./helpers/fixtures";

// Tuesday 29 September 2026, the day on the boards
const NOW = new Date(2026, 8, 29, 12, 0, 0);
beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});
afterEach(() => {
  jest.useRealTimers();
});

const day = (offset: number) => format(addDays(new Date(2026, 8, 29), offset), "yyyy-MM-dd");

const rental = (id: string, endsIn: number, overrides: Record<string, unknown> = {}) =>
  makePiano({
    $id: id,
    title: `Piano ${id}`,
    category: "rentable",
    rental_period_end: day(endsIn) as any,
    ...overrides,
  } as any);

const ids = (entries: { piano: { $id: string } }[]) => entries.map((entry) => entry.piano.$id);

describe("the wording for a rental that has ended", () => {
  it("says how long ago, in days and then in months, as the Overdue status counts", () => {
    const days = (n: number) => ({ days: -n, weeks: 0, months: 0, years: 0 });

    expect(getRentalStatusAgo("ended", days(18))).toEqual({ text: "Ended 18 days ago", tone: "late" });
    expect(getRentalStatusAgo("ended", days(1))).toEqual({ text: "Ended 1 day ago", tone: "late" });
    expect(getRentalStatusAgo("ended", { days: -280, weeks: 40, months: -9, years: 0 })).toEqual({
      text: "Ended 9 months ago",
      tone: "late",
    });
  });

  it("leaves the running rentals as they are", () => {
    expect(getRentalStatusAgo("active", { days: 3, weeks: 0, months: 0, years: 0 })).toEqual({
      text: "Ends in 3 days",
      tone: "soon",
    });
    expect(getRentalStatusAgo("due_today", { days: 0, weeks: 0, months: 0, years: 0 })).toEqual({
      text: "Ends today",
      tone: "soon",
    });
    expect(getRentalStatusAgo(null, { days: 0, weeks: 0, months: 0, years: 0 })).toBeNull();
  });
});

describe("needsAttention", () => {
  it("puts the longest overdue first, then what ends soonest", () => {
    const list = [
      rental("in-3", 3),
      rental("late-18", -18),
      rental("today", 0),
      rental("late-270", -270),
      rental("in-7", 7),
      rental("in-1", 1),
    ];

    expect(ids(needsAttention(list))).toEqual(["late-270", "late-18", "today", "in-1", "in-3", "in-7"]);
  });

  it("leaves out rentals with more than a week to go", () => {
    expect(ids(needsAttention([rental("in-8", 8), rental("in-30", 30), rental("in-7", 7)]))).toEqual(["in-7"]);
  });

  it("leaves out sold pianos, pianos that aren't rentals any more, and rentals with no end date", () => {
    const list = [
      rental("sold", -5, { sold_date: "2026-09-01" }),
      rental("now-on-sale", -5, { category: "on_sale" }),
      rental("no-end", 0, { rental_period_end: null }),
      rental("real", -5),
    ];

    expect(ids(needsAttention(list))).toEqual(["real"]);
  });

  it("says who has it and how long, in the board's words", () => {
    const [entry] = needsAttention([
      rental("a", -18, { rental_customer_name: "  Karan Malhotra " }),
    ]);

    expect(entry.who).toBe("Karan Malhotra");
    expect(entry.status).toEqual({ text: "Ended 18 days ago", tone: "late" });
    expect(entry.daysLeft).toBe(-18);
  });

  it("has no customer when none was recorded", () => {
    const [entry] = needsAttention([
      rental("a", -2, { rental_customer_name: "   " }),
    ]);

    expect(entry.who).toBeNull();
  });

  it("is empty for no pianos, and for nothing that needs anyone", () => {
    expect(needsAttention([])).toEqual([]);
    expect(needsAttention([rental("far", 40)])).toEqual([]);
  });
});

describe("rentedOut", () => {
  it("lists the rentals out now, through their last day, ending soonest first", () => {
    const list = [
      rental("far", 60),
      rental("late", -3),
      rental("today", 0),
      rental("soon", 3),
      rental("stock", 10, { category: "warehouse" }),
    ];

    expect(ids(rentedOut(list))).toEqual(["today", "soon", "far"]);
  });

  it("measures how far through its period each rental is", () => {
    // 10 days long, 4 days in
    const [entry] = rentedOut([
      rental("a", 6, { rental_period_start: day(-4) as any }),
    ]);

    expect(entry.progress).toBeCloseTo(0.4);
  });

  it("is full on the last day and never past it", () => {
    const [entry] = rentedOut([
      rental("a", 0, { rental_period_start: day(-30) as any }),
    ]);

    expect(entry.progress).toBe(1);
  });

  it("is empty before the start", () => {
    const [entry] = rentedOut([
      rental("a", 20, { rental_period_start: day(5) as any }),
    ]);

    expect(entry.progress).toBe(0);
  });

  it("has no progress without a start date, or with an end before the start", () => {
    const [none, backwards] = rentedOut([
      rental("none", 5),
      rental("backwards", 6, { rental_period_start: day(9) as any }),
    ]);

    expect(none.progress).toBeNull();
    expect(backwards.progress).toBeNull();
  });

  it("uses the same words as the Pianos tab for a rental that is still running", () => {
    const [soon, later] = rentedOut([rental("soon", 3), rental("later", 12)]);

    expect(soon.status).toEqual({ text: "Ends in 3 days", tone: "soon" });
    expect(later.status).toEqual({ text: "12 days left", tone: "normal" });
  });
});

describe("stockCounts", () => {
  const list = [
    rental("out-a", 10),
    rental("out-b", 0),
    rental("late", -4),
    makePiano({ $id: "store", category: "warehouse" }),
    makePiano({ $id: "sale", category: "on_sale" }),
    makePiano({ $id: "sold-now", category: "on_sale", sold_date: "2026-09-10" as any, sold_price: 142000 }),
    makePiano({ $id: "sold-then", category: "on_sale", sold_date: "2026-08-10" as any, sold_price: 50000 }),
  ];

  it("counts the pianos that are here as in stock: not sold, and not out with a customer", () => {
    // The warehouse piano and the one on sale. The two running rentals and the
    // one that ended and hasn't come back are with customers.
    expect(stockCounts(list).inStock).toBe(2);
  });

  it("counts a rentable piano with no rental on it as in stock, since it is here", () => {
    const available = rental("available", 5, { rental_period_end: null, rental_period_start: null });

    expect(stockCounts([available]).inStock).toBe(1);
    expect(stockCounts([available]).onRent).toBe(0);
  });

  it("keeps in stock and on rent apart: a rental that is out is only ever on rent", () => {
    const counts = stockCounts([rental("out", 10), makePiano({ $id: "here" })]);

    expect(counts).toMatchObject({ inStock: 1, onRent: 1 });
  });

  it("counts the rentals that haven't ended as on rent", () => {
    expect(stockCounts(list).onRent).toBe(2);
  });

  it("adds up the pianos sold this month", () => {
    expect(stockCounts(list).soldThisMonth).toEqual({ count: 1, total: 142000 });
  });

  it("is all zeros for no pianos", () => {
    expect(stockCounts([])).toEqual({ inStock: 0, onRent: 0, soldThisMonth: { count: 0, total: 0 } });
  });
});

describe("payments", () => {
  const payment = (id: string, piano: string, paidOn: string, amount: number, createdAt = "2026-09-01T10:00:00.000+00:00") => ({
    $id: id,
    $createdAt: createdAt,
    piano_id: piano,
    creator: "user",
    amount,
    paid_on: paidOn,
  });
  const payments = [
    payment("p1", "weber", "2026-09-14", 4000),
    payment("p2", "weber", "2026-09-25T00:00:00.000+00:00", 5000),
    payment("p3", "samick", "2026-08-28", 3800),
    payment("p4", "samick", "2026-09-21", 3800, "2026-09-21T09:00:00.000+00:00"),
    payment("p5", "samick", "2026-09-21", 100, "2026-09-21T15:00:00.000+00:00"),
  ];

  it("keeps the payments of this month, in either date shape", () => {
    expect(paymentsInMonth(payments).map((p) => p.$id)).toEqual(["p1", "p2", "p4", "p5"]);
    expect(paymentsInMonth(payments, subDays(NOW, 40)).map((p) => p.$id)).toEqual(["p3"]);
  });

  it("adds up this month", () => {
    expect(receivedInMonth(payments)).toEqual({ count: 4, total: 4000 + 5000 + 3800 + 100 });
    expect(receivedInMonth([])).toEqual({ count: 0, total: 0 });
  });

  it("puts the newest payment first, and the one recorded last first on the same day", () => {
    expect(newestFirst(payments).map((p) => p.$id)).toEqual(["p2", "p5", "p4", "p1", "p3"]);
  });

  it("doesn't change the list it is given", () => {
    const copy = [...payments];
    newestFirst(payments);
    expect(payments).toEqual(copy);
  });

  describe("recentPayments", () => {
    const weber = makePiano({
      $id: "weber",
      title: "Weber W-121",
      category: "rentable",
      rental_customer_name: "Karan Malhotra",
    });
    const samick = makePiano({ $id: "samick", title: "Samick SU-118", category: "rentable" });

    it("names the customer, then the piano and the day", () => {
      const [first] = recentPayments(payments, [weber, samick]);

      expect(first).toEqual({
        id: "p2",
        pianoId: "weber",
        primary: "Karan Malhotra",
        secondary: "Weber W-121 · 25 Sep",
        amount: 5000,
      });
    });

    it("falls back to the piano's title when there is no customer name", () => {
      const rows = recentPayments(payments, [weber, samick]);
      const samickRow = rows.find((row) => row.id === "p5")!;

      expect(samickRow.primary).toBe("Samick SU-118");
      expect(samickRow.secondary).toBe("21 Sep");
    });

    it("stops at the limit, newest first", () => {
      expect(recentPayments(payments, [weber, samick], 3).map((row) => row.id)).toEqual(["p2", "p5", "p4"]);
    });

    it("gives 5 by default", () => {
      const many = Array.from({ length: 9 }, (_, i) => payment(`m${i}`, "weber", `2026-09-${String(i + 1).padStart(2, "0")}`, 100));

      expect(recentPayments(many, [weber])).toHaveLength(5);
    });

    it("leaves out a payment whose piano is gone", () => {
      const rows = recentPayments(payments, [weber]);

      expect(rows.map((row) => row.id)).toEqual(["p2", "p1"]);
    });

    it("writes the year for a payment from another year", () => {
      const rows = recentPayments([payment("old", "weber", "2025-12-21", 100)], [weber]);

      expect(rows[0].secondary).toBe("Weber W-121 · 21 Dec 2025");
    });

    it("is empty for no payments", () => {
      expect(recentPayments([], [weber])).toEqual([]);
    });
  });
});
