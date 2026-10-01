import {
  addMonths,
  differenceInCalendarMonths,
  format,
  startOfToday,
} from "date-fns";
import type { RentPayment } from "@/lib/appwrite";
import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate } from "@/utils/dates";
import { formatRupees } from "@/utils/money";
import { getPianoRentalState } from "@/utils/pianoStatus";

// How much rent a renter still owes: worked out from what is already recorded
// (the rental's start, end and rent, and the payments for that piano), so
// nothing new is stored. The rules are the owner's defaults and are all here:
//  - rent is monthly, paid in advance, on the start date's day of every month;
//  - a month that starts on or after the last day of the rental isn't charged;
//  - a payment counts when it is for that piano, from that renter (or has no
//    name, from before names were saved), and is dated on or after the start;
//  - counting begins with the month of the first payment recorded for the
//    rental, because before that the app can't tell what was paid (a rental
//    that began before payments were recorded would otherwise owe every month).
//    With no payment recorded yet it is only this month's rent, and only while
//    that month is still running: a rental that ended with nothing recorded
//    owes nothing here.

const clean = (value: string | null | undefined) =>
  (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/** What a rental owes, from the rent that has fallen due and the payments made. */
export interface RentBalance {
  /** Rent that has fallen due and is counted, in rupees */
  owed: number;
  /** What was paid for it, in rupees */
  paid: number;
  /** What is unpaid: never negative */
  due: number;
  /** How many months of rent that is, rounded up */
  monthsDue: number;
  /** The day the oldest unpaid rent fell due, or null when nothing is due */
  since: Date | null;
  /** Rent paid beyond what has fallen due, or 0 */
  ahead: number;
}

/** The days rent falls due: the start date, then each month on the same day, up to today and before the last day. */
const dueDates = (start: Date, end: Date, today: Date): Date[] => {
  const days: Date[] = [];
  // Counted from the start each time, so a 31st clamps to a short month and comes back
  for (let n = 0; ; n++) {
    const day = addMonths(start, n);
    if (day > today || day >= end) return days;
    days.push(day);
  }
};

/**
 * What the piano's renter owes as of `today`, or null when it can't be worked
 * out: the piano isn't rented (or is sold), or the rental has no start date,
 * end date or rent, or no rent has fallen due yet.
 */
export const rentBalance = (
  piano: PianoItem,
  payments: Pick<RentPayment, "piano_id" | "amount" | "paid_on" | "customer_name">[],
  today = startOfToday()
): RentBalance | null => {
  if (!getPianoRentalState(piano)) return null;
  const start = parseStoredDate(piano.rental_period_start);
  const end = parseStoredDate(piano.rental_period_end);
  const price = piano.rental_price;
  if (!start || !end || !price || price <= 0) return null;

  const days = dueDates(start, end, today);
  if (days.length === 0) return null;

  const renter = clean(piano.rental_customer_name);
  const mine = payments.flatMap((payment) => {
    const paidOn = parseStoredDate(payment.paid_on);
    const who = clean(payment.customer_name);
    return payment.piano_id === piano.$id &&
      paidOn &&
      paidOn >= start &&
      (who === "" || who === renter)
      ? [{ paidOn, amount: payment.amount }]
      : [];
  });

  // The month the first payment was for: the last due day on or before it
  let first = days.length - 1;
  if (mine.length > 0) {
    const firstPaid = new Date(Math.min(...mine.map((p) => p.paidOn.getTime())));
    first = days.reduce((found, day, index) => (day <= firstPaid ? index : found), 0);
  } else if (today >= addMonths(start, days.length)) {
    // Nothing recorded, and the last month to pay for is over: it may well have
    // been paid outside the app, so it isn't called unpaid
    return null;
  }
  const counted = days.slice(first);

  const owed = counted.length * price;
  const paid = mine.reduce((sum, payment) => sum + payment.amount, 0);
  const due = Math.max(0, owed - paid);
  return {
    owed,
    paid,
    due,
    monthsDue: Math.ceil(due / price),
    // Payments cover the earliest months first
    since: due > 0 ? counted[Math.min(counted.length - 1, Math.floor(paid / price))] : null,
    ahead: Math.max(0, paid - owed),
  };
};

/** A rental that owes rent, with what it owes. */
export interface RentDueEntry {
  piano: PianoItem;
  /** The customer's name, or null when none was recorded */
  who: string | null;
  balance: RentBalance;
}

/**
 * The rentals that owe rent, the most owed first (then by the oldest unpaid
 * month, then by title, so the order is the same every time).
 */
export const rentDueEntries = (
  pianos: PianoItem[],
  payments: RentPayment[],
  today = startOfToday()
): RentDueEntry[] =>
  pianos
    .flatMap((piano) => {
      const balance = rentBalance(piano, payments, today);
      return balance && balance.due > 0
        ? [{ piano, who: piano.rental_customer_name?.trim() || null, balance }]
        : [];
    })
    .sort(
      (a, b) =>
        b.balance.due - a.balance.due ||
        (a.balance.since?.getTime() ?? 0) - (b.balance.since?.getTime() ?? 0) ||
        a.piano.title.localeCompare(b.piano.title)
    );

/**
 * How many months back (counting this one) payments have to be loaded for every
 * rental that is out to have all of its payments: back to the month the oldest
 * of them started. 0 when there is nothing to look back for.
 */
export const rentDueMonths = (pianos: PianoItem[], today = startOfToday()): number => {
  let months = 0;
  for (const piano of pianos) {
    if (!getPianoRentalState(piano) || !piano.rental_price) continue;
    const start = parseStoredDate(piano.rental_period_start);
    if (start) months = Math.max(months, differenceInCalendarMonths(today, start) + 1);
  }
  return months;
};

// --- The words ---

/** "1 month" or "3 months". */
const monthsText = (count: number) => `${count} ${count === 1 ? "month" : "months"}`;

/** "1 Aug", or "1 Aug 2025" for another year. */
const sinceText = (day: Date, today: Date) =>
  format(day, day.getFullYear() === today.getFullYear() ? "d MMM" : "d MMM yyyy");

/** "₹8,000 due · 2 months": the line for a row with little room, where "since" would be cut off. */
export const dueShort = (balance: RentBalance) =>
  `${formatRupees(balance.due)} due · ${monthsText(balance.monthsDue)}`;

/** "₹8,000 due · 2 months, since 1 Aug": the whole line, for the piano's page and for screen readers. */
export const dueLine = (balance: RentBalance, today = startOfToday()) =>
  `${dueShort(balance)}${
    balance.since ? `, since ${sinceText(balance.since, today)}` : ""
  }`;

/** What the piano's page says about the balance: what is due, that it is paid up, or what is paid ahead. */
export const balanceLine = (balance: RentBalance, today = startOfToday()) =>
  balance.due > 0
    ? dueLine(balance, today)
    : balance.ahead > 0
      ? `Rent is paid up, ${formatRupees(balance.ahead)} ahead`
      : "Rent is paid up";
