import { factsFor, morningSummaryPlan, SUMMARY_DAYS, summaryFor, summaryLines } from "@/utils/morningSummary";
import type { ServiceEntry } from "@/utils/serviceLog";
import { makePiano } from "./helpers/fixtures";

/**
 * The 9:00 morning summary (Batch 40): what is said on each morning, and which
 * mornings say anything. Now is 08:00 on 29 September 2026.
 */

const now = new Date(2026, 8, 29, 8, 0, 0);
const day = (month: number, date: number) => new Date(2026, month, date);

const rental = (id: string, customer: string, extra: Record<string, unknown> = {}) =>
  makePiano({
    $id: id,
    title: `Piano ${id}`,
    category: "rentable",
    rental_customer_name: customer,
    rental_customer_mobile: "9876543210",
    rental_period_start: "2026-08-01" as any,
    rental_period_end: "2026-12-01" as any,
    rental_price: 4000,
    ...extra,
  });

const payment = (pianoId: string, paidOn: string, amount: number, customer: string) => ({
  $id: `${pianoId}-${paidOn}`,
  $createdAt: `${paidOn}T09:00:00.000+00:00`,
  piano_id: pianoId,
  creator: "account-1",
  amount,
  paid_on: paidOn,
  customer_name: customer,
});

const tuning = (pianoId: string, servicedOn: string): ServiceEntry => ({
  $id: `t-${pianoId}-${servicedOn}`,
  $createdAt: `${servicedOn}T10:00:00.000+00:00`,
  piano_id: pianoId,
  creator: "account-1",
  serviced_on: servicedOn,
  kind: "tuning",
});

// Paid up for August and September: nothing is owed on 29 September
const paidUp = (id: string, customer: string) => [
  payment(id, "2026-08-02", 4000, customer),
  payment(id, "2026-09-03", 4000, customer),
];

describe("what needs the owner on a morning", () => {
  it("is nothing when rent is paid up, nothing ends and no tuning is due", () => {
    const pianos = [rental("a", "Asha Mehta")];

    expect(factsFor(day(8, 29), pianos, paidUp("a", "Asha Mehta"), [])).toEqual({
      rent: { count: 0, amount: 0, who: null },
      ended: 0,
      endsToday: 0,
      tuningsOverdue: 0,
      tuningsToday: 0,
    });
    expect(summaryFor(day(8, 29), pianos, paidUp("a", "Asha Mehta"), [])).toBeNull();
  });

  it("counts rent that is due, and says who when it is one rental", () => {
    // Began 1 June: four months have fallen due, one is paid
    const pianos = [rental("a", "Asha Mehta", { rental_period_start: "2026-06-01", rental_price: 6000 })];
    const payments = [payment("a", "2026-06-02", 6000, "Asha Mehta")];

    const facts = factsFor(day(8, 29), pianos, payments, []);

    expect(facts.rent).toEqual({ count: 1, amount: 18000, who: "Asha Mehta" });
    expect(summaryLines(facts)).toEqual(["₹18,000 to collect from Asha Mehta"]);
  });

  it("adds up the rent of several rentals, and says how many", () => {
    const pianos = [
      rental("a", "Asha Mehta", { rental_period_start: "2026-06-01", rental_price: 6000 }),
      rental("b", "Ravi Kumar", { rental_period_start: "2026-09-01", rental_price: 2000 }),
    ];
    const payments = [payment("a", "2026-06-02", 6000, "Asha Mehta")];

    expect(summaryLines(factsFor(day(8, 29), pianos, payments, []))).toEqual(["₹20,000 to collect from 2 rentals"]);
  });

  it("says '1 rental' when the one that owes has no name", () => {
    const pianos = [rental("a", "", { rental_period_start: "2026-09-01" })];

    expect(summaryLines(factsFor(day(8, 29), pianos, [], []))).toEqual(["₹4,000 to collect from 1 rental"]);
  });

  it("counts the rentals that have ended and the ones that end that day", () => {
    const pianos = [
      rental("a", "Asha Mehta", { rental_period_end: "2026-09-20" }),
      rental("b", "Ravi Kumar", { rental_period_end: "2026-09-10" }),
      rental("c", "Meera Kapoor", { rental_period_end: "2026-09-29" }),
      // Ends tomorrow: it has its own reminder, so it isn't in this morning's summary
      rental("d", "Karan Malhotra", { rental_period_end: "2026-09-30" }),
    ];
    const payments = [...paidUp("a", "Asha Mehta"), ...paidUp("b", "Ravi Kumar"), ...paidUp("c", "Meera Kapoor"), ...paidUp("d", "Karan Malhotra")];

    const facts = factsFor(day(8, 29), pianos, payments, []);

    expect([facts.ended, facts.endsToday]).toEqual([2, 1]);
    expect(summaryLines(facts)).toEqual(["Rentals: 2 ended, 1 ends today"]);
  });

  it("uses the singular and plural where they belong", () => {
    expect(
      summaryLines({ rent: { count: 0, amount: 0, who: null }, ended: 1, endsToday: 2, tuningsOverdue: 0, tuningsToday: 0 })
    ).toEqual(["Rentals: 1 ended, 2 end today"]);
    expect(
      summaryLines({ rent: { count: 0, amount: 0, who: null }, ended: 0, endsToday: 1, tuningsOverdue: 0, tuningsToday: 0 })
    ).toEqual(["Rentals: 1 ends today"]);
  });

  it("counts the tunings that are overdue and the ones due that day, not the ones due later this week", () => {
    const pianos = [
      rental("a", "Asha Mehta"),
      rental("b", "Ravi Kumar"),
      rental("c", "Meera Kapoor"),
      rental("d", "Karan Malhotra"),
    ];
    const payments = [...paidUp("a", "Asha Mehta"), ...paidUp("b", "Ravi Kumar"), ...paidUp("c", "Meera Kapoor"), ...paidUp("d", "Karan Malhotra")];
    const entries = [
      // Six months ago on 29 March: due today
      tuning("a", "2026-03-29"),
      // Due 12 September: overdue
      tuning("b", "2026-03-12"),
      // Due 4 October: later this week, so not said
      tuning("c", "2026-04-04"),
      // Due in the autumn: not due
      tuning("d", "2026-08-01"),
    ];

    const facts = factsFor(day(8, 29), pianos, payments, entries);

    expect([facts.tuningsOverdue, facts.tuningsToday]).toEqual([1, 1]);
    expect(summaryLines(facts)).toEqual(["2 tunings: 1 overdue, 1 due today"]);
    expect(summaryLines({ ...facts, tuningsOverdue: 0, tuningsToday: 1 })).toEqual(["1 tuning: 1 due today"]);
  });

  it("puts rent first, then the rentals, then the tunings, and leaves out what is nothing", () => {
    const pianos = [
      rental("a", "Asha Mehta", { rental_period_start: "2026-09-01", rental_period_end: "2026-09-29" }),
      rental("b", "Ravi Kumar"),
    ];
    const payments = paidUp("b", "Ravi Kumar");
    const entries = [tuning("b", "2026-03-10")];

    const summary = summaryFor(day(8, 29), pianos, payments, entries)!;

    expect(summary.title).toBe("🎹 Good morning");
    expect(summary.body.split("\n")).toEqual([
      "₹4,000 to collect from Asha Mehta",
      "Rentals: 1 ends today",
      "1 tuning: 1 overdue",
    ]);
  });

  it("never counts a sold piano, or one that is no longer a rental", () => {
    const pianos = [
      rental("a", "Asha Mehta", { rental_period_start: "2026-06-01", sold_date: "2026-09-01" }),
      makePiano({
        $id: "b",
        category: "warehouse",
        rental_customer_name: "Ravi Kumar",
        rental_period_start: "2026-06-01" as any,
        rental_period_end: "2026-09-10" as any,
        rental_price: 4000,
      }),
    ];

    expect(summaryFor(day(8, 29), pianos, [], [tuning("a", "2026-01-01")])).toBeNull();
  });

  it("leaves out what depends on what isn't known yet, instead of guessing", () => {
    const pianos = [rental("a", "Asha Mehta", { rental_period_start: "2026-09-01", rental_period_end: "2026-09-10" })];

    expect(summaryLines(factsFor(day(8, 29), pianos, null, null))).toEqual(["Rentals: 1 ended"]);
    expect(factsFor(day(8, 29), pianos, null, null).rent.count).toBe(0);
    // With the payments unknown but the service log read, the tuning is still said
    expect(summaryLines(factsFor(day(8, 29), [rental("b", "Meera")], null, [tuning("b", "2026-03-10")]))).toEqual([
      "1 tuning: 1 overdue",
    ]);
  });
});

describe("the mornings that are planned", () => {
  const owing = rental("a", "Asha Mehta", { rental_period_start: "2026-06-01", rental_price: 6000 });
  const paid = [payment("a", "2026-06-02", 6000, "Asha Mehta")];

  it("is nothing at all when no morning has anything to say", () => {
    // Rent falls due on the 15th, so none does in the next week, and it is paid up
    const quiet = rental("q", "Asha Mehta", { rental_period_start: "2026-08-15" });
    const paidQuiet = [payment("q", "2026-08-16", 4000, "Asha Mehta"), payment("q", "2026-09-16", 4000, "Asha Mehta")];

    expect(morningSummaryPlan(now, [quiet], paidQuiet, [])).toEqual([]);
    expect(morningSummaryPlan(now, [], [], [])).toEqual([]);
  });

  it("is only the mornings from the day rent falls due on: the 1st brings the next month's", () => {
    const monthly = rental("a", "Asha Mehta");
    const paidTo = paidUp("a", "Asha Mehta");

    const plan = morningSummaryPlan(now, [monthly], paidTo, []);

    expect(plan.map((summary) => [summary.date.getMonth(), summary.date.getDate()])).toEqual([
      [9, 1],
      [9, 2],
      [9, 3],
      [9, 4],
      [9, 5],
    ]);
  });

  it("is each of the next seven mornings that has something, at 9:00, with its own words", () => {
    const plan = morningSummaryPlan(now, [owing], paid, []);

    expect(SUMMARY_DAYS).toBe(7);
    expect(plan).toHaveLength(7);
    expect(plan.map((summary) => summary.date)).toEqual([
      new Date(2026, 8, 29, 9, 0, 0),
      new Date(2026, 8, 30, 9, 0, 0),
      new Date(2026, 9, 1, 9, 0, 0),
      new Date(2026, 9, 2, 9, 0, 0),
      new Date(2026, 9, 3, 9, 0, 0),
      new Date(2026, 9, 4, 9, 0, 0),
      new Date(2026, 9, 5, 9, 0, 0),
    ]);
    expect(new Set(plan.map((summary) => summary.title))).toEqual(new Set(["🎹 Good morning"]));
    expect(plan[0].body).toBe("₹18,000 to collect from Asha Mehta");
  });

  it("starts with tomorrow once today's 9:00 has passed", () => {
    const plan = morningSummaryPlan(new Date(2026, 8, 29, 9, 0, 0), [owing], paid, []);

    expect(plan).toHaveLength(6);
    expect(plan[0].date).toEqual(new Date(2026, 8, 30, 9, 0, 0));
    expect(morningSummaryPlan(new Date(2026, 8, 29, 9, 30, 0), [owing], paid, [])[0].date).toEqual(new Date(2026, 8, 30, 9, 0, 0));
    // Just before 9:00 it is still today
    expect(morningSummaryPlan(new Date(2026, 8, 29, 8, 59, 59), [owing], paid, [])[0].date).toEqual(new Date(2026, 8, 29, 9, 0, 0));
  });

  it("says what is true on each morning: rent that falls due tomorrow is in tomorrow's summary, not today's", () => {
    // Began 1 September, paid for September: October's rent falls due on 1 October
    const pianos = [rental("a", "Asha Mehta", { rental_period_start: "2026-09-01" })];
    const payments = [payment("a", "2026-09-02", 4000, "Asha Mehta")];

    const plan = morningSummaryPlan(new Date(2026, 8, 29, 8, 0, 0), pianos, payments, []);

    expect(plan.map((summary) => [summary.date.getMonth() + 1, summary.date.getDate(), summary.body])).toEqual([
      [10, 1, "₹4,000 to collect from Asha Mehta"],
      [10, 2, "₹4,000 to collect from Asha Mehta"],
      [10, 3, "₹4,000 to collect from Asha Mehta"],
      [10, 4, "₹4,000 to collect from Asha Mehta"],
      [10, 5, "₹4,000 to collect from Asha Mehta"],
    ]);
  });

  it("says a rental ends on the morning it does, and has ended after that, leaving out the mornings before", () => {
    const pianos = [rental("a", "Asha Mehta", { rental_period_end: "2026-10-01" })];

    const plan = morningSummaryPlan(now, pianos, paidUp("a", "Asha Mehta").concat([payment("a", "2026-10-01", 4000, "Asha Mehta")]), []);

    expect(plan.map((summary) => summary.body)).toEqual([
      "Rentals: 1 ends today",
      "Rentals: 1 ended",
      "Rentals: 1 ended",
      "Rentals: 1 ended",
      "Rentals: 1 ended",
    ]);
    expect(plan[0].date).toEqual(new Date(2026, 9, 1, 9, 0, 0));
  });

  it("can be asked for fewer mornings", () => {
    expect(morningSummaryPlan(now, [owing], paid, [], 2)).toHaveLength(2);
    expect(morningSummaryPlan(now, [owing], paid, [], 0)).toEqual([]);
  });
});
