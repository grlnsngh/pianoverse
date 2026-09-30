import { differenceInCalendarDays, format, isSameMonth, isSameYear, startOfToday } from "date-fns";
import type { RentPayment } from "@/lib/appwrite";
import { PianoItem } from "@/redux/pianos/types";
import { getRemainingPeriod, parseStoredDate } from "@/utils/dates";
import {
  getPianoRentalState,
  isCurrentlyRented,
  isSold,
} from "@/utils/pianoStatus";
import { getRentalStatusAgo, RentalStatus } from "@/utils/rentalStatus";
import { salesInMonth, totalReceived } from "@/utils/stats";

// What the Today tab shows, worked out from the pianos and the rent payments.
// Nothing here loads anything: it only answers "which ones, in what order".

/** A rental counts as needing attention from this many days before it ends. */
export const ATTENTION_DAYS = 7;

/** A piano on rent, with what Today says about it. */
export interface RentalEntry {
  piano: PianoItem;
  /** The customer's name, or null when none was recorded */
  who: string | null;
  /** "Ended 18 days ago", "Ends in 3 days" or "12 days left", with its tone */
  status: RentalStatus;
  /** Calendar days from today to the last day: 0 on the last day, negative once ended */
  daysLeft: number;
}

/** A rental that is out now, with how far through its period it is. */
export interface ShelfEntry extends RentalEntry {
  /** 0 to 1, or null when the rental has no start date to measure from */
  progress: number | null;
}

const customerOf = (piano: PianoItem) =>
  piano.rental_customer_name?.trim() || null;

/** Every piano that is a rental with an end date, running or ended. */
const rentalEntries = (pianos: PianoItem[]): RentalEntry[] =>
  pianos.flatMap((piano) => {
    const state = getPianoRentalState(piano);
    const end = parseStoredDate(piano.rental_period_end);
    if (!state || !end) return [];
    const status = getRentalStatusAgo(
      state,
      getRemainingPeriod(piano.rental_period_end)
    );
    return status
      ? [
          {
            piano,
            who: customerOf(piano),
            status,
            daysLeft: differenceInCalendarDays(end, startOfToday()),
          },
        ]
      : [];
  });

/**
 * The rentals that need the owner: the ones that have ended, the longest ago
 * first, then the ones ending within a week, the soonest first. A sold piano or
 * one that is no longer a rental never appears, whatever dates it still has.
 */
export const needsAttention = (pianos: PianoItem[]): RentalEntry[] =>
  rentalEntries(pianos)
    .filter((entry) => entry.daysLeft <= ATTENTION_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft);

/** How much of the rental period has passed, from 0 to 1. Null without a start date. */
const progressOf = (piano: PianoItem): number | null => {
  const start = parseStoredDate(piano.rental_period_start);
  const end = parseStoredDate(piano.rental_period_end);
  if (!start || !end) return null;
  const total = differenceInCalendarDays(end, start);
  if (total <= 0) return null;
  const done = differenceInCalendarDays(startOfToday(), start);
  return Math.min(1, Math.max(0, done / total));
};

/** The rentals out right now (up to and including their last day), ending soonest first. */
export const rentedOut = (pianos: PianoItem[]): ShelfEntry[] => {
  const out = new Set(pianos.filter(isCurrentlyRented).map((p) => p.$id));
  return rentalEntries(pianos)
    .filter((entry) => out.has(entry.piano.$id))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .map((entry) => ({ ...entry, progress: progressOf(entry.piano) }));
};

/**
 * A piano is out when it is with a customer: a rental that is running, or one
 * that has ended and hasn't come back. (A rentable piano with no rental on it
 * is here, and so is every other category.)
 */
const isOut = (piano: PianoItem) => getPianoRentalState(piano) !== null;

/** The three counts under the money: what is in stock, what is on rent, what sold this month. */
export const stockCounts = (pianos: PianoItem[], month = new Date()) => ({
  // The pianos that are here: not sold, and not out with a customer
  inStock: pianos.filter((piano) => !isSold(piano) && !isOut(piano)).length,
  onRent: pianos.filter(isCurrentlyRented).length,
  soldThisMonth: salesInMonth(pianos, month),
});

/** Payments newest first: by the day they were paid, then by when they were recorded. */
export const newestFirst = (payments: RentPayment[]): RentPayment[] =>
  [...payments].sort(
    (a, b) =>
      (parseStoredDate(b.paid_on)?.getTime() ?? 0) -
        (parseStoredDate(a.paid_on)?.getTime() ?? 0) ||
      b.$createdAt.localeCompare(a.$createdAt)
  );

/** The payments dated in the month of `month`. */
export const paymentsInMonth = (
  payments: RentPayment[],
  month = new Date()
): RentPayment[] =>
  payments.filter((payment) => {
    const paidOn = parseStoredDate(payment.paid_on);
    return paidOn !== null && isSameMonth(paidOn, month);
  });

/** How many payments came in during the month of `month`, and how much. */
export const receivedInMonth = (payments: RentPayment[], month = new Date()) =>
  totalReceived(paymentsInMonth(payments, month));

/** One line of the Recent payments list. */
export interface RecentPayment {
  id: string;
  pianoId: string;
  /** The customer's name saved with the payment, or the piano's title when there is none */
  primary: string;
  /** "Weber W-121 · 25 Sep", or just the date when the title is already the primary line */
  secondary: string;
  amount: number;
}

/** "25 Sep", or "25 Sep 2025" for another year. */
const formatPaidOn = (date: Date, today: Date) =>
  format(date, isSameYear(date, today) ? "d MMM" : "d MMM yyyy");

/**
 * The latest payments, newest first, each with the piano it was for. A payment
 * whose piano isn't in the list (deleted, or not loaded) is left out, since
 * there is nothing to say it was for.
 */
export const recentPayments = (
  payments: RentPayment[],
  pianos: PianoItem[],
  limit = 5,
  today = new Date()
): RecentPayment[] => {
  const byId = new Map(pianos.map((piano) => [piano.$id, piano]));
  const result: RecentPayment[] = [];
  for (const payment of newestFirst(payments)) {
    const piano = byId.get(payment.piano_id);
    const paidOn = parseStoredDate(payment.paid_on);
    if (!piano || !paidOn) continue;
    const date = formatPaidOn(paidOn, today);
    // The name saved with the payment when it was recorded. An older payment
    // has none, and the piano's current customer could be someone else by now,
    // so it shows the piano's title.
    const customer = payment.customer_name?.trim() || null;
    result.push({
      id: payment.$id,
      pianoId: piano.$id,
      primary: customer ?? piano.title,
      secondary: customer ? `${piano.title} · ${date}` : date,
      amount: payment.amount,
    });
    if (result.length === limit) break;
  }
  return result;
};
