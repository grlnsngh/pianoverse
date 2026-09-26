import {
  differenceInCalendarDays,
  differenceInMonths,
  differenceInWeeks,
  differenceInYears,
  format,
  startOfDay,
  startOfToday,
} from "date-fns";

export type StoredDate = string | Date | null | undefined;

export interface Period {
  days: number;
  weeks: number;
  months: number;
  years: number;
}

const NO_PERIOD: Period = { days: 0, weeks: 0, months: 0, years: 0 };

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Returns the calendar day a stored piano date refers to, as a local Date at
 * midnight, or null. Stored dates come in several shapes:
 *  - "2026-09-26" (what the app saves now)
 *  - "2026-09-26T00:00:00.000+00:00" (a day as returned by Appwrite)
 *  - "2026-09-26T09:30:00.000Z" (older versions saved the picked local time)
 *  - "Sat Sep 26 2026" (older versions of the Edit screen)
 */
export const parseStoredDate = (value: StoredDate): Date | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : startOfDay(value);
  }

  const dayOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dayOnly) {
    return new Date(+dayOnly[1], +dayOnly[2] - 1, +dayOnly[3]);
  }

  const dateString = value.match(/^[a-z]{3} ([a-z]{3}) (\d{1,2}) (\d{4})$/i);
  const month = dateString ? MONTHS.indexOf(dateString[1]) : -1;
  if (dateString && month !== -1) {
    return new Date(+dateString[3], month, +dateString[2]);
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  // A day saved without a time comes back as midnight UTC
  const isMidnightUtc =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;
  if (isMidnightUtc) {
    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    );
  }
  return startOfDay(date);
};

/** The calendar day of a picked date, as stored in the database. */
export const toStoredDate = (date: Date) => format(date, "yyyy-MM-dd");

/** The period from one day to another (negative when `to` is earlier). */
export const periodBetween = (from: Date, to: Date): Period => ({
  days: differenceInCalendarDays(to, from),
  weeks: differenceInWeeks(to, from),
  months: differenceInMonths(to, from),
  years: differenceInYears(to, from),
});

/** Time from today until a stored date. */
export const getRemainingPeriod = (end: StoredDate): Period => {
  const endDate = parseStoredDate(end);
  return endDate ? periodBetween(startOfToday(), endDate) : NO_PERIOD;
};

export type RentalState = "active" | "due_today" | "ended";

/** Whether a rental ending on `end` is still running, ends today or has ended. */
export const getRentalState = (end: StoredDate): RentalState | null => {
  const endDate = parseStoredDate(end);
  if (!endDate) return null;
  const daysLeft = differenceInCalendarDays(endDate, startOfToday());
  if (daysLeft > 0) return "active";
  return daysLeft === 0 ? "due_today" : "ended";
};

/** A rental is active up to and including its last day. */
export const isRentalActive = (end: StoredDate) => {
  const state = getRentalState(end);
  return state === "active" || state === "due_today";
};
