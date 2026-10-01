import { format } from "date-fns";
import {
  barHeight,
  chartSummary,
  incomeByMonth,
  incomeRange,
  monthDetail,
  noIncome,
  sofarLine,
  totalsOf,
} from "@/utils/income";
import { makePiano } from "./helpers/fixtures";

/**
 * The money that came in, month by month. Today is fixed at 29 September 2026,
 * so "this month" and "last month" don't depend on the day the tests are run.
 */

const today = new Date(2026, 8, 29);
const pay = (paidOn: string, amount: number) => ({ paid_on: paidOn, amount });
const soldPiano = (soldOn: string, price: number | undefined, extra = {}) =>
  makePiano({
    $id: `sold-${soldOn}-${price}`,
    category: "on_sale",
    sold_date: soldOn as any,
    sold_price: price,
    ...extra,
  });

describe("the months", () => {
  it("are the last ones, oldest first, ending with this month", () => {
    const months = incomeByMonth([], [], 6, today);

    expect(months.map((entry) => format(entry.month, "MMM yyyy"))).toEqual([
      "Apr 2026",
      "May 2026",
      "Jun 2026",
      "Jul 2026",
      "Aug 2026",
      "Sep 2026",
    ]);
    // Each is the first day of its month
    expect(months.every((entry) => entry.month.getDate() === 1)).toBe(true);
  });

  it("go back over a year end", () => {
    const months = incomeByMonth([], [], 4, new Date(2026, 1, 10));

    expect(months.map((entry) => format(entry.month, "MMM yyyy"))).toEqual([
      "Nov 2025",
      "Dec 2025",
      "Jan 2026",
      "Feb 2026",
    ]);
  });

  it("are the days to load payments for: from the first of the oldest, up to the end of this one", () => {
    const { from, to } = incomeRange(6, today);

    expect(from).toEqual(new Date(2026, 3, 1));
    expect(to).toEqual(new Date(2026, 9, 1));
    expect(incomeRange(1, today).from).toEqual(new Date(2026, 8, 1));
  });
});

describe("the income of a month", () => {
  it("adds up the rent that was received in it, and counts the payments", () => {
    const months = incomeByMonth(
      [
        pay("2026-09-02", 6200),
        pay("2026-09-25", 5000),
        pay("2026-08-28", 3000),
      ],
      [],
      2,
      today
    );

    expect(months[1]).toMatchObject({
      rent: 11200,
      rentCount: 2,
      sales: 0,
      salesCount: 0,
      total: 11200,
    });
    expect(months[0]).toMatchObject({ rent: 3000, rentCount: 1, total: 3000 });
  });

  it("adds up what pianos sold for in it, and counts them", () => {
    const months = incomeByMonth(
      [],
      [
        soldPiano("2026-09-10", 142000),
        soldPiano("2026-09-20", 8000),
        soldPiano("2026-08-05", 50000),
      ],
      2,
      today
    );

    expect(months[1]).toMatchObject({
      rent: 0,
      sales: 150000,
      salesCount: 2,
      total: 150000,
    });
    expect(months[0]).toMatchObject({ sales: 50000, salesCount: 1 });
  });

  it("is rent and sales together", () => {
    const [only] = incomeByMonth(
      [pay("2026-09-02", 6200)],
      [soldPiano("2026-09-10", 142000)],
      1,
      today
    );

    expect(only.total).toBe(148200);
  });

  it("leaves out what isn't in the months: earlier, later, or the same month of another year", () => {
    const months = incomeByMonth(
      [pay("2026-03-31", 100), pay("2026-10-01", 200), pay("2025-09-15", 300)],
      [soldPiano("2025-09-15", 5000), soldPiano("2026-10-02", 6000)],
      6,
      today
    );

    expect(noIncome(months)).toBe(true);
  });

  it("counts a sale with no price as a sale for nothing", () => {
    const [only] = incomeByMonth(
      [],
      [soldPiano("2026-09-10", undefined)],
      1,
      today
    );

    expect(only).toMatchObject({ salesCount: 1, sales: 0, total: 0 });
  });

  it("counts a piano as sold only when it is sold, whatever else it has on it", () => {
    const stillHere = makePiano({
      $id: "here",
      category: "on_sale",
      sold_price: 9000,
    });

    const [only] = incomeByMonth([], [stillHere], 1, today);

    expect(only.salesCount).toBe(0);
  });

  it("counts a payment on the first and the last day of the month in that month", () => {
    const months = incomeByMonth(
      [pay("2026-09-01", 1), pay("2026-08-31", 10), pay("2026-09-30", 100)],
      [],
      2,
      today
    );

    expect(months[0].rent).toBe(10);
    expect(months[1].rent).toBe(101);
  });
});

describe("the totals", () => {
  const months = incomeByMonth(
    [pay("2026-09-02", 6200), pay("2026-08-28", 3000)],
    [soldPiano("2026-09-10", 142000)],
    3,
    today
  );

  it("add the months up, rent and sales apart and together", () => {
    expect(totalsOf(months)).toEqual({
      rent: 9200,
      sales: 142000,
      total: 151200,
    });
  });

  it("know when nothing came in", () => {
    expect(noIncome(months)).toBe(false);
    expect(noIncome(incomeByMonth([], [], 3, today))).toBe(true);
    expect(totalsOf([])).toEqual({ rent: 0, sales: 0, total: 0 });
  });
});

describe("the bars", () => {
  it("are as tall as their share of the tallest month", () => {
    expect(barHeight(50, 100, 96)).toBe(48);
    expect(barHeight(100, 100, 96)).toBe(96);
  });

  it("show a month with something in it, however little", () => {
    expect(barHeight(1, 1_000_000, 96)).toBe(2);
  });

  it("are nothing for an empty month, or when nothing came in at all", () => {
    expect(barHeight(0, 100, 96)).toBe(0);
    expect(barHeight(5, 0, 96)).toBe(0);
  });
});

describe("the words", () => {
  const months = incomeByMonth(
    [pay("2026-09-02", 6200), pay("2026-09-25", 5000), pay("2026-08-28", 3000)],
    [soldPiano("2026-09-10", 142000)],
    3,
    today
  );

  it("put this month so far next to the whole of last month", () => {
    expect(sofarLine(months)).toBe(
      "Rent: September so far ₹11,200 · August ₹3,000"
    );
  });

  it("have no line before there are two months", () => {
    expect(sofarLine(months.slice(-1))).toBeNull();
  });

  it("describe a month by its payments and sales, with the singular", () => {
    expect(monthDetail(months[2])).toBe("2 payments · 1 piano sold");
    expect(monthDetail(months[1])).toBe("1 payment");
    expect(monthDetail(months[0])).toBe("Nothing recorded");
    expect(monthDetail({ ...months[2], rentCount: 0, salesCount: 2 })).toBe(
      "2 pianos sold"
    );
  });

  it("read the whole chart out for a screen reader", () => {
    expect(chartSummary(months)).toBe(
      "Rent received by month. July 2026: ₹0. August 2026: ₹3,000. September 2026: ₹11,200, 1 piano sold for ₹1,42,000."
    );
  });
});
