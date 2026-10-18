import { addMonths, format, startOfToday, subDays } from "date-fns";
import * as dates from "@/utils/dates";
import { groupByPiano } from "@/utils/byPiano";
import { incomeByMonth } from "@/utils/income";
import { morningSummaryPlan } from "@/utils/morningSummary";
import { rentBalance, rentDueEntries } from "@/utils/rentDue";
import { serviceDue, serviceState, entriesFor } from "@/utils/serviceLog";
import { newestFirst } from "@/utils/today";
import type { RentPayment } from "@/lib/appwrite";
import type { ServiceEntry } from "@/utils/serviceLog";
import { makePiano } from "./helpers/fixtures";

// Batch 50 (O2): with 166 pianos and 500 payments, Today took over six seconds
// on the emulator before it answered a tap. Each rental went through every
// payment (and each piano through every service), reading every date each
// time, and the morning summary did that again for each of 7 days. These count
// the dates read, which is what the time went on, rather than timing anything.

const day = (date: Date) => format(date, "yyyy-MM-dd");
const today = startOfToday();
const RENTALS = 50;

const pianos = Array.from({ length: RENTALS }, (_, n) =>
  makePiano({
    $id: `p${n}`,
    title: `Piano ${n}`,
    category: "rentable",
    rental_customer_name: `Customer ${n}`,
    rental_period_start: day(addMonths(today, -10)) as any,
    rental_period_end: day(addMonths(today, 2 + (n % 5))) as any,
    rental_price: 3000,
  })
);
// Ten payments for each rental, one a month, the last month or two missing for some
const payments: RentPayment[] = pianos.flatMap((piano, n) =>
  Array.from({ length: 10 - (n % 3) }, (_, m) => ({
    $id: `pay-${n}-${m}`,
    $createdAt: `2026-01-01T00:00:${String(m).padStart(2, "0")}.000+00:00`,
    piano_id: piano.$id,
    creator: "me",
    amount: 3000,
    paid_on: `${day(addMonths(today, -10 + m))}T00:00:00.000+00:00`,
    customer_name: `Customer ${n}`,
  }))
);
const entries: ServiceEntry[] = pianos.map((piano, n) => ({
  $id: `svc-${n}`,
  $createdAt: "2026-01-01T00:00:00.000+00:00",
  piano_id: piano.$id,
  creator: "me",
  serviced_on: day(subDays(today, 150 + n)),
  kind: "tuning",
}));

const datesRead = (work: () => unknown) => {
  const spy = jest.spyOn(dates, "parseStoredDate");
  work();
  const count = spy.mock.calls.length;
  spy.mockRestore();
  return count;
};

it("groups rows by piano, keeping their order", () => {
  const groups = groupByPiano([
    { piano_id: "a", n: 1 },
    { piano_id: "b", n: 2 },
    { piano_id: "a", n: 3 },
  ]);
  expect([...groups.keys()]).toEqual(["a", "b"]);
  expect(groups.get("a")!.map((row) => row.n)).toEqual([1, 3]);
  expect(groups.get("c")).toBeUndefined();
});

describe("rent due", () => {
  it("gives what each rental owes the same as working it out from all the payments", () => {
    const owing = rentDueEntries(pianos, payments, today);

    expect(owing.length).toBeGreaterThan(0);
    for (const entry of owing) {
      expect(entry.balance).toEqual(rentBalance(entry.piano, payments, today));
    }
  });

  it("reads each payment's date once, not once for every rental", () => {
    const read = datesRead(() => rentDueEntries(pianos, payments, today));

    // Before: every rental read all ~450 payments, over 22,000 dates
    expect(read).toBeLessThan(payments.length + RENTALS * 4);
  });
});

describe("service due", () => {
  it("gives the same tunings as working each piano out from all the entries", () => {
    const due = serviceDue(pianos, entries, today);

    expect(due.length).toBeGreaterThan(0);
    for (const entry of due) {
      expect(entry.state).toEqual(serviceState(entry.piano, entriesFor(entries, entry.piano.$id), today));
    }
  });
});

it("plans the 7 morning summaries without going through every payment for every rental each day", () => {
  const read = datesRead(() => morningSummaryPlan(new Date(), pianos, payments, entries));

  // Before: about 7 × 22,000
  expect(read).toBeLessThan(7 * (payments.length + RENTALS * 6));
});

it("reads each payment's date once for the income months, not once a month", () => {
  const read = datesRead(() => incomeByMonth(payments, pianos, 12));

  expect(read).toBeLessThanOrEqual(payments.length + pianos.length);
});

it("reads each payment's date once to put the newest first", () => {
  const read = datesRead(() => newestFirst(payments));

  expect(read).toBe(payments.length);
  const sorted = newestFirst(payments);
  expect(sorted[0].paid_on >= sorted[sorted.length - 1].paid_on).toBe(true);
});
