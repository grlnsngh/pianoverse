import {
  balanceLine,
  dueLine,
  dueShort,
  rentBalance,
  rentDueEntries,
  rentDueMonths,
} from "@/utils/rentDue";
import { makePiano } from "./helpers/fixtures";

/**
 * How much rent a renter owes: monthly, in advance, on the start date's day of
 * the month, counted from the month of the first payment recorded. Today is
 * 29 September 2026.
 */

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 12, 0, 0) });
});
afterEach(() => {
  jest.useRealTimers();
});

const rental = (extra: Record<string, unknown> = {}) =>
  makePiano({
    $id: "kawai",
    title: "Kawai K-300",
    category: "rentable",
    rental_customer_name: "Asha Mehta",
    rental_period_start: "2026-08-01" as any,
    rental_period_end: "2026-12-01" as any,
    rental_price: 4000,
    ...extra,
  });

const pay = (
  paidOn: string,
  amount: number,
  extra: Record<string, unknown> = {}
) => ({
  $id: `p-${paidOn}-${amount}`,
  $createdAt: `${paidOn}T09:00:00.000+00:00`,
  piano_id: "kawai",
  creator: "account-1",
  amount,
  paid_on: paidOn,
  customer_name: "Asha Mehta",
  ...extra,
});

const at = (year: number, month: number, day: number) =>
  jest.setSystemTime(new Date(year, month - 1, day, 12, 0, 0));

describe("the rent a rental owes", () => {
  it("is this month's rent when nothing has been recorded yet", () => {
    const balance = rentBalance(rental(), [])!;

    // Due on 1 August and 1 September, but with no payment recorded only the month still running counts
    expect(balance).toEqual({
      owed: 4000,
      paid: 0,
      due: 4000,
      monthsDue: 1,
      since: new Date(2026, 8, 1),
      ahead: 0,
    });
  });

  it("counts from the month of the first payment, and a month paid leaves the next one due", () => {
    const balance = rentBalance(rental(), [pay("2026-08-02", 4000)])!;

    expect(balance).toMatchObject({ owed: 8000, paid: 4000, due: 4000, monthsDue: 1 });
    expect(balance.since).toEqual(new Date(2026, 8, 1));
  });

  it("owes nothing once every month that has fallen due is paid", () => {
    const balance = rentBalance(rental(), [
      pay("2026-08-02", 4000),
      pay("2026-09-03", 4000),
    ])!;

    expect(balance).toMatchObject({ due: 0, monthsDue: 0, since: null, ahead: 0 });
  });

  it("says how much is paid ahead", () => {
    const balance = rentBalance(rental(), [
      pay("2026-08-02", 4000),
      pay("2026-09-03", 4000),
      pay("2026-09-20", 4000),
    ])!;

    expect(balance).toMatchObject({ due: 0, since: null, ahead: 4000 });
  });

  it("rounds a part payment up to whole months, and dates the oldest month not fully paid", () => {
    const balance = rentBalance(rental(), [pay("2026-08-02", 3000)])!;

    expect(balance).toMatchObject({ owed: 8000, paid: 3000, due: 5000, monthsDue: 2 });
    expect(balance.since).toEqual(new Date(2026, 7, 1));
  });

  it("dates the oldest unpaid month after the ones the payments cover", () => {
    const balance = rentBalance(rental({ rental_period_start: "2026-06-01" as any }), [
      pay("2026-06-02", 4000),
      pay("2026-07-02", 5000),
    ])!;

    // June, July, August and September fell due: ₹16,000, of which ₹9,000 is paid
    expect(balance).toMatchObject({ owed: 16000, due: 7000, monthsDue: 2 });
    expect(balance.since).toEqual(new Date(2026, 7, 1));
  });

  it("doesn't call every month unpaid for a rental that began before payments were recorded", () => {
    const old = rental({
      rental_period_start: "2025-01-15" as any,
      rental_period_end: "2027-01-15" as any,
    });

    const none = rentBalance(old, [])!;
    expect(none).toMatchObject({ due: 4000, monthsDue: 1 });
    expect(none.since).toEqual(new Date(2026, 8, 15));

    // Recording began in August: counted from there
    const recorded = rentBalance(old, [pay("2026-08-20", 4000)])!;
    expect(recorded).toMatchObject({ owed: 8000, due: 4000 });
    expect(recorded.since).toEqual(new Date(2026, 8, 15));
  });

  it("owes the months up to the end for a rental that has ended with some paid", () => {
    const ended = rental({
      rental_period_start: "2026-04-15" as any,
      rental_period_end: "2026-07-15" as any,
    });

    const balance = rentBalance(ended, [
      pay("2026-04-16", 4000),
      pay("2026-05-16", 4000),
    ])!;

    // 15 April, 15 May and 15 June fell due; 15 July is the last day, so it isn't charged
    expect(balance).toMatchObject({ owed: 12000, due: 4000, monthsDue: 1 });
    expect(balance.since).toEqual(new Date(2026, 5, 15));
  });

  it("owes nothing for a rental that ended long ago with nothing ever recorded", () => {
    const ended = rental({
      rental_period_start: "2025-03-29" as any,
      rental_period_end: "2025-12-29" as any,
    });

    expect(rentBalance(ended, [])).toBeNull();
  });

  it("owes the last month for a rental that ended just now with nothing recorded", () => {
    const ended = rental({ rental_period_end: "2026-09-19" as any });

    expect(rentBalance(ended, [])).toMatchObject({ due: 4000 });
  });

  it("doesn't charge the month that starts on the last day", () => {
    const short = rental({ rental_period_end: "2026-09-01" as any });

    expect(rentBalance(short, [pay("2026-08-01", 4000)])).toMatchObject({ owed: 4000, due: 0 });
  });

  it("charges a part month at the end as a whole month", () => {
    at(2026, 12, 2);
    const longer = rental({ rental_period_end: "2026-12-04" as any });
    const paid = [
      pay("2026-08-01", 4000),
      pay("2026-09-01", 4000),
      pay("2026-10-01", 4000),
      pay("2026-11-01", 4000),
    ];

    const balance = rentBalance(longer, paid)!;

    expect(balance).toMatchObject({ owed: 20000, due: 4000 });
    expect(balance.since).toEqual(new Date(2026, 11, 1));
  });

  it("falls due on the last day of a short month for a rental that began on the 31st, and on the 31st again", () => {
    at(2026, 3, 1);
    const late = rental({
      rental_period_start: "2026-01-31" as any,
      rental_period_end: "2026-12-31" as any,
    });

    // 31 January and 28 February have fallen due; 31 March hasn't
    const balance = rentBalance(late, [pay("2026-01-31", 4000)])!;
    expect(balance).toMatchObject({ owed: 8000, due: 4000 });
    expect(balance.since).toEqual(new Date(2026, 1, 28));

    at(2026, 3, 31);
    expect(rentBalance(late, [pay("2026-01-31", 4000)])).toMatchObject({ owed: 12000, due: 8000 });
  });

  it("is due on the day itself, and not the day before", () => {
    at(2026, 9, 30);
    expect(rentBalance(rental(), [pay("2026-08-02", 4000), pay("2026-09-02", 4000)])!.due).toBe(0);

    at(2026, 10, 1);
    expect(rentBalance(rental(), [pay("2026-08-02", 4000), pay("2026-09-02", 4000)])!.due).toBe(4000);
  });

  describe("which payments count", () => {
    it("ignore other pianos and other renters", () => {
      const balance = rentBalance(rental(), [
        pay("2026-09-02", 4000, { piano_id: "weber" }),
        pay("2026-09-02", 4000, { customer_name: "Ravi Kumar" }),
      ])!;

      expect(balance).toMatchObject({ paid: 0, due: 4000 });
    });

    it("match the renter by name whatever the capitals and spaces", () => {
      const balance = rentBalance(rental(), [
        pay("2026-09-02", 4000, { customer_name: "  asha   MEHTA " }),
      ])!;

      expect(balance).toMatchObject({ paid: 4000, due: 0 });
    });

    it("include one saved without a name, from before names were saved", () => {
      const balance = rentBalance(rental(), [
        pay("2026-09-02", 4000, { customer_name: null }),
      ])!;

      expect(balance).toMatchObject({ paid: 4000, due: 0 });
    });

    it("leave out one dated before the rental began", () => {
      const balance = rentBalance(rental(), [pay("2026-07-28", 4000)])!;

      expect(balance).toMatchObject({ paid: 0, due: 4000 });
    });

    it("are matched by an empty name when the rental has none", () => {
      const nameless = rental({ rental_customer_name: "" });

      expect(
        rentBalance(nameless, [pay("2026-09-02", 4000, { customer_name: null })])
      ).toMatchObject({ paid: 4000, due: 0 });
      expect(rentBalance(nameless, [pay("2026-09-02", 4000)])).toMatchObject({
        paid: 0,
        due: 4000,
      });
    });
  });

  describe("can't be worked out", () => {
    it.each([
      ["a piano that isn't a rental", { category: "warehouse" }],
      ["a sold piano", { sold_date: "2026-09-10" }],
      ["a rental with no start date", { rental_period_start: null }],
      ["a rental with no end date", { rental_period_end: null }],
      ["a rental with no rent", { rental_price: null }],
      ["a rental with a rent of 0", { rental_price: 0 }],
      ["a rental that hasn't started", { rental_period_start: "2026-10-15" }],
      ["a rental that ends before it starts", { rental_period_end: "2026-07-01" }],
    ])("for %s", (_name, extra) => {
      expect(rentBalance(rental(extra as any), [])).toBeNull();
    });
  });
});

describe("the rentals that owe rent", () => {
  const second = rental({
    $id: "weber",
    title: "Weber W-121",
    rental_customer_name: "Karan Malhotra",
    rental_price: 6000,
  });

  it("are listed with the most owed first, then the oldest, then by title", () => {
    const small = rental({ $id: "a", title: "A piano", rental_price: 1000 });
    const sameLater = rental({
      $id: "b",
      title: "B piano",
      rental_price: 1000,
      rental_period_start: "2026-08-15" as any,
    });
    const sameTitleOrder = rental({ $id: "c", title: "Aardvark", rental_price: 1000 });

    const entries = rentDueEntries([small, sameLater, rental(), second, sameTitleOrder], []);

    expect(entries.map((entry) => entry.piano.title)).toEqual([
      "Weber W-121",
      "Kawai K-300",
      "A piano",
      "Aardvark",
      "B piano",
    ]);
  });

  it("leave out the ones that are paid up and the ones that can't be worked out", () => {
    const entries = rentDueEntries(
      [
        rental(),
        second,
        makePiano({ $id: "store", category: "warehouse" }),
        rental({ $id: "noprice", rental_price: null }),
      ],
      [pay("2026-09-02", 6000, { piano_id: "weber", customer_name: "Karan Malhotra" })]
    );

    expect(entries.map((entry) => entry.piano.$id)).toEqual(["kawai"]);
  });

  it("carry the customer's name, or null", () => {
    const [named, nameless] = rentDueEntries(
      [rental(), rental({ $id: "x", title: "Zed", rental_customer_name: "  " })],
      []
    );

    expect(named.who).toBe("Asha Mehta");
    expect(nameless.who).toBeNull();
  });
});

describe("how far back payments are needed", () => {
  it("is back to the month the oldest rental out began, counting this one", () => {
    expect(rentDueMonths([rental()], new Date(2026, 8, 29))).toBe(2);
    expect(
      rentDueMonths(
        [rental(), rental({ $id: "old", rental_period_start: "2025-03-29" as any })],
        new Date(2026, 8, 29)
      )
    ).toBe(19);
  });

  it("is 0 when there is nothing to look back for", () => {
    expect(
      rentDueMonths(
        [
          makePiano({ category: "warehouse" }),
          rental({ $id: "s", sold_date: "2026-09-01" }),
          rental({ $id: "p", rental_price: null }),
          rental({ $id: "d", rental_period_start: null }),
        ],
        new Date(2026, 8, 29)
      )
    ).toBe(0);
    expect(rentDueMonths([])).toBe(0);
  });
});

describe("the words", () => {
  const today = new Date(2026, 8, 29);

  it("say what is due, for how many months, and since when", () => {
    const june = rental({ rental_period_start: "2026-06-01" as any });
    expect(dueLine(rentBalance(june, [pay("2026-06-02", 4000)], today)!, today)).toBe(
      "₹12,000 due · 3 months, since 1 Jul"
    );
    expect(dueLine(rentBalance(rental(), [], today)!, today)).toBe(
      "₹4,000 due · 1 month, since 1 Sep"
    );
  });

  it("have a short line without the day, for a row with little room", () => {
    const june = rental({ rental_period_start: "2026-06-01" as any });

    expect(dueShort(rentBalance(june, [pay("2026-06-02", 4000)], today)!)).toBe(
      "₹12,000 due · 3 months"
    );
    expect(dueShort(rentBalance(rental(), [], today)!)).toBe("₹4,000 due · 1 month");
  });

  it("add the year for a day in another year", () => {
    const old = rental({
      rental_period_start: "2025-11-01" as any,
      rental_period_end: "2027-11-01" as any,
    });

    expect(dueLine(rentBalance(old, [pay("2025-11-02", 4000)], today)!, today)).toBe(
      "₹40,000 due · 10 months, since 1 Dec 2025"
    );
  });

  it("say Rent is paid up, or how much is paid ahead, when nothing is due", () => {
    const paid = [pay("2026-08-02", 4000), pay("2026-09-03", 4000)];

    expect(balanceLine(rentBalance(rental(), paid, today)!, today)).toBe("Rent is paid up");
    expect(
      balanceLine(rentBalance(rental(), [...paid, pay("2026-09-20", 4500)], today)!, today)
    ).toBe("Rent is paid up, ₹4,500 ahead");
    expect(balanceLine(rentBalance(rental(), [], today)!, today)).toBe(
      "₹4,000 due · 1 month, since 1 Sep"
    );
  });
});
