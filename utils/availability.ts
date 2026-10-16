import { addDays, differenceInCalendarDays, format, startOfToday } from "date-fns";
import { PIANO_CATEGORY } from "@/constants/Piano";
import type { RentalHistoryEntry } from "@/lib/appwrite";
import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate, periodBetween } from "@/utils/dates";
import { categoryLabelOf } from "@/utils/pianoDisplay";
import { getPianoRentalState, isSold } from "@/utils/pianoStatus";
import { hadRental } from "@/utils/rentalHistory";
import { formatSpan, StatusTone } from "@/utils/rentalStatus";

// Which pianos are free on a day, and which come back soon (Availability
// screen). The app has no bookings: it knows the rental that is on each piano
// and the ones that were kept, so that is all this is worked out from. A
// rental is out up to and including its last day; the piano is free from the
// day after. Nothing here loads anything.

/** "Ending soon" on the Back soon tab looks this many days ahead. */
export const BACK_SOON_DAYS = 30;

/** An ending rental is orange from this many days before it ends (the same week as Today). */
const SOON_DAYS = 7;

export type AvailabilityFilter = "all" | "rentable" | "events" | "warehouse";

export const AVAILABILITY_FILTERS: readonly { key: AvailabilityFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "rentable", label: "Rentable" },
  { key: "events", label: "Events" },
  { key: "warehouse", label: "Warehouse" },
];

const CATEGORY_OF: Record<Exclude<AvailabilityFilter, "all">, string> = {
  rentable: PIANO_CATEGORY.RENTABLE,
  events: PIANO_CATEGORY.EVENTS,
  warehouse: PIANO_CATEGORY.WAREHOUSE,
};

/** Pianos that can be asked about: not sold, and not on sale (those aren't for hire). */
const inFilter = (piano: PianoItem, filter: AvailabilityFilter) =>
  !isSold(piano) &&
  (filter === "all"
    ? Object.values(CATEGORY_OF).includes(piano.category)
    : piano.category === CATEGORY_OF[filter]);

/** "2 Oct", or "2 Oct 2027" when it isn't in the year of `reference`. */
export const dayText = (date: Date, reference: Date) =>
  format(date, date.getFullYear() === reference.getFullYear() ? "d MMM" : "d MMM yyyy");

/** A time a piano was with a customer: the rental on it now, or one that was kept. */
interface Stay {
  start: Date | null;
  end: Date | null;
  who: string | null;
  /** The rental on the piano now, not a kept one */
  current: boolean;
}

const clean = (value: string | null | undefined) => value?.trim() || null;

/** What a kept rental covers: from its start to the day it ended, or was ended if that was earlier. Null when its start isn't known. */
const keptStay = (entry: RentalHistoryEntry): Stay | null => {
  const start = parseStoredDate(entry.period_start);
  if (!start) return null;
  const agreed = parseStoredDate(entry.period_end);
  const closed = parseStoredDate(entry.closed_on);
  // A rental that was ended or replaced early stopped then; one with no end ends when it was closed
  const end = agreed && closed ? (agreed < closed ? agreed : closed) : (agreed ?? closed);
  if (!end || end < start) return null;
  return { start, end, who: clean(entry.customer_name), current: false };
};

/** The rental on the piano now: a rentable piano that isn't sold and has a customer or a start date. */
const currentStay = (piano: PianoItem): Stay | null =>
  piano.category === PIANO_CATEGORY.RENTABLE && !isSold(piano) && hadRental(piano)
    ? {
        start: parseStoredDate(piano.rental_period_start),
        end: parseStoredDate(piano.rental_period_end),
        who: clean(piano.rental_customer_name),
        current: true,
      }
    : null;

const keptByPiano = (history: readonly RentalHistoryEntry[]) => {
  const byPiano = new Map<string, Stay[]>();
  for (const entry of history) {
    const stay = keptStay(entry);
    if (!stay) continue;
    const list = byPiano.get(entry.piano_id);
    if (list) list.push(stay);
    else byPiano.set(entry.piano_id, [stay]);
  }
  return byPiano;
};

const staysOf = (piano: PianoItem, kept: Map<string, Stay[]>): Stay[] => {
  const current = currentStay(piano);
  return [...(current ? [current] : []), ...(kept.get(piano.$id) ?? [])];
};

type Coverage = "until" | "not-back" | "open";

/**
 * Whether a stay has the piano out on `day`: `until` (up to its last day),
 * `not-back` (the rental on the piano has ended and the piano isn't marked as
 * returned, so it is still with the customer) or `open` (a rental with no end
 * date, which has no day it ends). Null when the piano is free of it that day.
 */
const coverage = (stay: Stay, day: Date, today: Date): Coverage | null => {
  if (stay.start && day < stay.start) return null;
  if (!stay.end) return stay.current ? "open" : null;
  if (day <= stay.end) return "until";
  return stay.current && stay.end < today ? "not-back" : null;
};

export interface AvailabilityEntry {
  piano: PianoItem;
  out: boolean;
  /** Who has it, when it is out and that is known */
  who: string | null;
  /** The line under the title: who has it, or what kind of piano it is */
  sub: string;
  /** What to say beside it: "Until 20 Nov", "Ended 9 Oct, not back", "Free since 2 Oct", "Free until 1 Dec" */
  line: { text: string; tone: StatusTone } | null;
  /** The first day it is free, when it is out and its last day is known */
  freeFrom: Date | null;
}

const typeLine = (piano: PianoItem) =>
  [categoryLabelOf(piano.category), clean(piano.company_associated)].filter(Boolean).join(" · ");

const entryOn = (piano: PianoItem, stays: Stay[], day: Date, today: Date): AvailabilityEntry => {
  let best: { stay: Stay; kind: Coverage } | null = null;
  for (const stay of stays) {
    const kind = coverage(stay, day, today);
    if (!kind) continue;
    // The rental on the piano comes first; of the kept ones, the one that ends last
    if (!best || stay.current || (!best.stay.current && stay.end! > best.stay.end!)) best = { stay, kind };
  }

  if (best) {
    const { stay, kind } = best;
    const sub = stay.who ?? typeLine(piano);
    if (kind === "open") {
      return { piano, out: true, who: stay.who, sub, line: { text: "No end date", tone: "normal" }, freeFrom: null };
    }
    if (kind === "not-back") {
      const text = `Ended ${dayText(stay.end!, day)}, not back`;
      return { piano, out: true, who: stay.who, sub, line: { text, tone: "late" }, freeFrom: null };
    }
    return {
      piano,
      out: true,
      who: stay.who,
      sub,
      line: { text: `Until ${dayText(stay.end!, day)}`, tone: "normal" },
      freeFrom: addDays(stay.end!, 1),
    };
  }

  // Free: promised from a later day (a rental that starts after this day), or since the last one ended
  let upcoming: Date | null = null;
  let lastEnd: Date | null = null;
  for (const stay of stays) {
    if (stay.start && stay.start > day) {
      if (!upcoming || stay.start < upcoming) upcoming = stay.start;
    } else if (stay.end && stay.end < day) {
      if (!lastEnd || stay.end > lastEnd) lastEnd = stay.end;
    }
  }
  let line: AvailabilityEntry["line"] = null;
  if (upcoming) {
    line = { text: `Free until ${dayText(addDays(upcoming, -1), day)}`, tone: "soon" };
  } else if (lastEnd) {
    const from = addDays(lastEnd, 1);
    line = { text: `Free ${from > today ? "from" : "since"} ${dayText(from, day)}`, tone: "normal" };
  }
  return { piano, out: false, who: null, sub: typeLine(piano), line, freeFrom: null };
};

/** Late (not back) first, then the soonest to come back, then the ones with no end date. */
const outOrder = (a: AvailabilityEntry, b: AvailabilityEntry) => {
  const rank = (entry: AvailabilityEntry) =>
    entry.line?.tone === "late" ? 0 : entry.freeFrom ? 1 : 2;
  return (
    rank(a) - rank(b) ||
    (a.freeFrom?.getTime() ?? 0) - (b.freeFrom?.getTime() ?? 0) ||
    a.piano.title.localeCompare(b.piano.title)
  );
};

export interface DayAvailability {
  free: AvailabilityEntry[];
  out: AvailabilityEntry[];
  /** The out piano that is free first (for "Nothing free on …"), when any has an end date */
  firstBack: AvailabilityEntry | null;
}

/**
 * Which of the pianos are free on `day` and which are out, for the pianos in
 * `filter`. Free pianos come A to Z; out ones with the latest first, then the
 * soonest back.
 */
export const availabilityOn = (
  pianos: readonly PianoItem[],
  history: readonly RentalHistoryEntry[],
  day: Date,
  filter: AvailabilityFilter = "rentable",
  today: Date = startOfToday()
): DayAvailability => {
  const kept = keptByPiano(history);
  const entries = pianos
    .filter((piano) => inFilter(piano, filter))
    .map((piano) => entryOn(piano, staysOf(piano, kept), day, today));
  const free = entries
    .filter((entry) => !entry.out)
    .sort((a, b) => a.piano.title.localeCompare(b.piano.title));
  const out = entries.filter((entry) => entry.out).sort(outOrder);
  const firstBack = out.find((entry) => entry.freeFrom) ?? null;
  return { free, out, firstBack };
};

/**
 * The days of the month of `month` on which a rental ends (the calendar's
 * orange dots), as day numbers, for the pianos in `filter`.
 */
export const endDaysInMonth = (
  pianos: readonly PianoItem[],
  history: readonly RentalHistoryEntry[],
  month: Date,
  filter: AvailabilityFilter = "rentable"
): Set<number> => {
  const kept = keptByPiano(history);
  const days = new Set<number>();
  for (const piano of pianos) {
    if (!inFilter(piano, filter)) continue;
    for (const stay of staysOf(piano, kept)) {
      const end = stay.end;
      if (end && end.getFullYear() === month.getFullYear() && end.getMonth() === month.getMonth()) {
        days.add(end.getDate());
      }
    }
  }
  return days;
};

// --- Back soon ---

export interface BackSoonEntry {
  piano: PianoItem;
  who: string | null;
  /** Under the title: "Meera Kapoor · 7 days ago", or "Karan Malhotra · free from 20 Oct" */
  sub: string;
  /** "Ended 9 Oct" (late), or "Ends 19 Oct" ("Ends today"), orange in the last week */
  line: { text: string; tone: StatusTone };
}

export interface BackSoon {
  /** Rentals that have ended on pianos that aren't marked as returned: the longest ago first */
  notBack: BackSoonEntry[];
  /** Rentals that end in the next 30 days, today included: the soonest first */
  ending: BackSoonEntry[];
}

/** The rentals that have ended and are not back, and the ones ending in the next 30 days. A rental with no end date is in neither. */
export const backSoon = (pianos: readonly PianoItem[], today: Date = startOfToday()): BackSoon => {
  const notBack: (BackSoonEntry & { end: Date })[] = [];
  const ending: (BackSoonEntry & { end: Date })[] = [];
  for (const piano of pianos) {
    const state = getPianoRentalState(piano);
    const end = parseStoredDate(piano.rental_period_end);
    if (!state || !end) continue;
    const who = clean(piano.rental_customer_name);
    const daysLeft = differenceInCalendarDays(end, today);
    if (state === "ended") {
      const ago = `${formatSpan(periodBetween(end, today))} ago`;
      notBack.push({
        piano,
        end,
        who,
        sub: [who, ago].filter(Boolean).join(" · "),
        line: { text: `Ended ${dayText(end, today)}`, tone: "late" },
      });
    } else if (daysLeft <= BACK_SOON_DAYS) {
      ending.push({
        piano,
        end,
        who,
        sub: [who, `free from ${dayText(addDays(end, 1), today)}`].filter(Boolean).join(" · "),
        line: {
          text: daysLeft === 0 ? "Ends today" : `Ends ${dayText(end, today)}`,
          tone: daysLeft <= SOON_DAYS ? "soon" : "normal",
        },
      });
    }
  }
  const byEnd = (a: { end: Date; piano: PianoItem }, b: { end: Date; piano: PianoItem }) =>
    a.end.getTime() - b.end.getTime() || a.piano.title.localeCompare(b.piano.title);
  return { notBack: notBack.sort(byEnd), ending: ending.sort(byEnd) };
};

/**
 * The first day a rented piano is free: the day after its rental ends. Null
 * when it isn't rented out now, or the rental has no end date or has ended
 * (it isn't back yet, so no day can be given).
 */
export const freeFromDay = (piano: PianoItem): Date | null => {
  const state = getPianoRentalState(piano);
  const end = parseStoredDate(piano.rental_period_end);
  return (state === "active" || state === "due_today") && end ? addDays(end, 1) : null;
};
