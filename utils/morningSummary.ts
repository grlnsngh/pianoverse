import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import type { RentPayment } from "@/lib/appwrite";
import type { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate } from "@/utils/dates";
import { formatRupees } from "@/utils/money";
import { getPianoRentalState } from "@/utils/pianoStatus";
import { rentDueEntries } from "@/utils/rentDue";
import { serviceDue, type ServiceEntry } from "@/utils/serviceLog";

/**
 * The 9:00 morning summary (D1): one notification a morning that says what
 * needs the owner that day, and none on a morning with nothing to say. It
 * counts only what needs doing that day: rent that is due, rentals that have
 * ended or end today, and tunings that are overdue or due today. What is only
 * coming up already has its own reminders (a week before, the day before) and
 * is on Today.
 *
 * A scheduled notification has its words fixed when it is scheduled, so the
 * next few mornings are worked out together (each as of its own day) and put
 * in place again after every change and every time the app opens: they are as
 * fresh as the last time the app was used.
 */

/** The hour the summary arrives. */
export const SUMMARY_HOUR = 9;

/** How many mornings ahead are planned: more would be guesses about what changes in between. */
export const SUMMARY_DAYS = 7;

/** What needs the owner on one morning. Anything that is 0, or unknown, isn't said. */
export interface MorningFacts {
  /** Rentals that owe rent: how many, how much, and who when it is one */
  rent: { count: number; amount: number; who: string | null };
  /** Rentals that have ended (still out) and rentals that end that day */
  ended: number;
  endsToday: number;
  /** Tunings that are overdue and tunings due that day */
  tuningsOverdue: number;
  tuningsToday: number;
}

export interface PlannedSummary {
  /** 9:00 on the day */
  date: Date;
  title: string;
  body: string;
}

const NOTHING: MorningFacts = {
  rent: { count: 0, amount: 0, who: null },
  ended: 0,
  endsToday: 0,
  tuningsOverdue: 0,
  tuningsToday: 0,
};

/**
 * What needs the owner on `day`. `payments` and `entries` are null when they
 * aren't known (not loaded): then what depends on them is left out rather than
 * guessed. A sold piano and one that is no longer a rental are never counted.
 */
export const factsFor = (
  day: Date,
  pianos: PianoItem[],
  payments: RentPayment[] | null,
  entries: ServiceEntry[] | null
): MorningFacts => {
  const facts: MorningFacts = { ...NOTHING, rent: { ...NOTHING.rent } };

  if (payments) {
    const owing = rentDueEntries(pianos, payments, day);
    facts.rent = {
      count: owing.length,
      amount: owing.reduce((sum, entry) => sum + entry.balance.due, 0),
      who: owing.length === 1 ? owing[0].who : null,
    };
  }

  for (const piano of pianos) {
    if (getPianoRentalState(piano) === null) continue;
    const end = parseStoredDate(piano.rental_period_end);
    if (!end) continue;
    const left = differenceInCalendarDays(end, day);
    if (left < 0) facts.ended += 1;
    else if (left === 0) facts.endsToday += 1;
  }

  if (entries) {
    for (const { state } of serviceDue(pianos, entries, day)) {
      if (state.days < 0) facts.tuningsOverdue += 1;
      else if (state.days === 0) facts.tuningsToday += 1;
    }
  }
  return facts;
};

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The lines of the summary: rent first, then the rentals, then the tunings. Empty when there is nothing to say. */
export const summaryLines = (facts: MorningFacts): string[] => {
  const lines: string[] = [];

  if (facts.rent.count > 0) {
    const from =
      facts.rent.count === 1
        ? facts.rent.who ?? "1 rental"
        : `${facts.rent.count} rentals`;
    lines.push(`${formatRupees(facts.rent.amount)} to collect from ${from}`);
  }

  const rentals = [
    facts.ended > 0 ? `${facts.ended} ended` : "",
    facts.endsToday > 0 ? `${facts.endsToday} ${facts.endsToday === 1 ? "ends" : "end"} today` : "",
  ].filter(Boolean);
  if (rentals.length > 0) lines.push(`Rentals: ${rentals.join(", ")}`);

  const tunings = [
    facts.tuningsOverdue > 0 ? `${facts.tuningsOverdue} overdue` : "",
    facts.tuningsToday > 0 ? `${facts.tuningsToday} due today` : "",
  ].filter(Boolean);
  if (tunings.length > 0) lines.push(`${count(facts.tuningsOverdue + facts.tuningsToday, "tuning", "tunings")}: ${tunings.join(", ")}`);

  return lines;
};

/** The notification for one morning, or null when there is nothing to say. */
export const summaryFor = (
  day: Date,
  pianos: PianoItem[],
  payments: RentPayment[] | null,
  entries: ServiceEntry[] | null
): { title: string; body: string } | null => {
  const lines = summaryLines(factsFor(day, pianos, payments, entries));
  return lines.length > 0 ? { title: "🎹 Good morning", body: lines.join("\n") } : null;
};

/** 9:00 on a day. */
const atNine = (day: Date) => {
  const date = new Date(day);
  date.setHours(SUMMARY_HOUR, 0, 0, 0);
  return date;
};

/**
 * The summaries to schedule: for each of the next `days` mornings whose 9:00 is
 * still ahead, what is to be said as of that day, leaving out the mornings with
 * nothing to say.
 */
export const morningSummaryPlan = (
  now: Date,
  pianos: PianoItem[],
  payments: RentPayment[] | null,
  entries: ServiceEntry[] | null,
  days = SUMMARY_DAYS
): PlannedSummary[] => {
  const plan: PlannedSummary[] = [];
  for (let n = 0; n < days; n++) {
    const day = startOfDay(addDays(now, n));
    const date = atNine(day);
    if (date <= now) continue;
    const summary = summaryFor(day, pianos, payments, entries);
    if (summary) plan.push({ date, ...summary });
  }
  return plan;
};
