import { addMonths, differenceInCalendarDays, format, startOfToday } from "date-fns";
import type { IconName } from "@/components/ui/Icon";
import { PIANO_CATEGORY } from "@/constants/Piano";
import type { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate } from "@/utils/dates";
import { isSold } from "@/utils/pianoStatus";

/**
 * The tuning and service log (P1, canvas page "Tuning and service"): what was
 * done to a piano and when, and when its next tuning is due. Each piano has
 * its own tuning interval; the next tuning is the last one plus that interval.
 * Repairs, cleaning and moves are kept but don't move the due date.
 */

export type ServiceKind = "tuning" | "repair" | "cleaning" | "moving" | "other";

export const SERVICE_KINDS: readonly { kind: ServiceKind; label: string; icon: IconName }[] = [
  { kind: "tuning", label: "Tuning", icon: "tuningFork" },
  { kind: "repair", label: "Repair", icon: "wrench" },
  { kind: "cleaning", label: "Cleaning", icon: "sparkle" },
  { kind: "moving", label: "Moving", icon: "truck" },
  { kind: "other", label: "Other", icon: "more" },
];

export const isServiceKind = (value: unknown): value is ServiceKind =>
  SERVICE_KINDS.some((option) => option.kind === value);

export const kindOf = (kind: string) =>
  SERVICE_KINDS.find((option) => option.kind === kind) ?? SERVICE_KINDS[SERVICE_KINDS.length - 1];

/** One thing done to a piano, as kept in Appwrite's `service_log`. */
export interface ServiceEntry {
  $id: string;
  $createdAt: string;
  piano_id: string;
  /** The owner's account ID */
  creator: string;
  /** The day it was done */
  serviced_on: string;
  kind: string;
  cost?: number | null;
  note?: string | null;
}

/** How often a piano is tuned, in months; 0 is no reminders. */
export const TUNING_INTERVALS = [3, 6, 12, 0] as const;
export type TuningInterval = (typeof TUNING_INTERVALS)[number];

/** Every piano starts at six months until its interval is changed. */
export const DEFAULT_TUNING_MONTHS = 6;

export const TUNING_INTERVAL_OPTIONS: readonly { months: TuningInterval; label: string; sub: string }[] = [
  { months: 3, label: "Every 3 months", sub: "Played a lot, or moved often" },
  { months: 6, label: "Every 6 months", sub: "Most pianos" },
  { months: 12, label: "Every 12 months", sub: "Kept in the warehouse, rarely played" },
  { months: 0, label: "No reminders", sub: "This piano isn’t tuned on a schedule" },
];

/** The piano's tuning interval: its own, or six months when it has none (or one the app doesn't offer). */
export const intervalOf = (piano: Pick<PianoItem, "tuning_interval_months">): TuningInterval => {
  const months = piano.tuning_interval_months;
  return TUNING_INTERVALS.includes(months as TuningInterval) ? (months as TuningInterval) : DEFAULT_TUNING_MONTHS;
};

/** "Every 6 months", or "No reminders". */
export const intervalLabel = (months: TuningInterval) =>
  TUNING_INTERVAL_OPTIONS.find((option) => option.months === months)?.label ?? `Every ${months} months`;

const byNewest = (a: ServiceEntry, b: ServiceEntry) =>
  b.serviced_on.localeCompare(a.serviced_on) || b.$createdAt.localeCompare(a.$createdAt);

/** A piano's entries, the newest first. */
export const entriesFor = (entries: ServiceEntry[], pianoId: string) =>
  entries.filter((entry) => entry.piano_id === pianoId).sort(byNewest);

/** The day of the piano's latest tuning, or null when none is logged. */
export const lastTuning = (pianoEntries: ServiceEntry[]): Date | null => {
  let latest: Date | null = null;
  for (const entry of pianoEntries) {
    if (entry.kind !== "tuning") continue;
    const day = parseStoredDate(entry.serviced_on);
    if (day && (!latest || day > latest)) latest = day;
  }
  return latest;
};

/**
 * When the piano's next tuning is due: its last tuning plus its interval. None
 * for a sold piano, one with no reminders, or one with no tuning logged yet.
 */
export const nextTuning = (piano: PianoItem, pianoEntries: ServiceEntry[]): Date | null => {
  const months = intervalOf(piano);
  if (months === 0 || isSold(piano)) return null;
  const last = lastTuning(pianoEntries);
  return last ? addMonths(last, months) : null;
};

/** How close a tuning is, for Today's list: overdue, or due within this many days. */
export const SERVICE_SOON_DAYS = 7;

export type ServiceTone = "late" | "soon" | "ok";

export interface ServiceState {
  next: Date;
  last: Date;
  /** Days from today to the due day; below zero when overdue */
  days: number;
  tone: ServiceTone;
  months: TuningInterval;
}

/** Where the piano's tuning stands, or null when it has no due date. */
export const serviceState = (
  piano: PianoItem,
  pianoEntries: ServiceEntry[],
  today = startOfToday()
): ServiceState | null => {
  const next = nextTuning(piano, pianoEntries);
  const last = lastTuning(pianoEntries);
  if (!next || !last) return null;
  const days = differenceInCalendarDays(next, today);
  return {
    next,
    last,
    days,
    tone: days < 0 ? "late" : days <= SERVICE_SOON_DAYS ? "soon" : "ok",
    months: intervalOf(piano),
  };
};

const day = (date: Date) => format(date, "d MMM yyyy");
const shortDay = (date: Date) => format(date, "d MMM");

/** "Tuning due in 5 days", "Tuning due today", "Tuning overdue", "Next tuning 4 Oct 2026". */
export const serviceHeadline = (state: ServiceState) => {
  if (state.days < 0) return "Tuning overdue";
  if (state.days === 0) return "Tuning due today";
  if (state.days === 1) return "Tuning due tomorrow";
  if (state.days <= SERVICE_SOON_DAYS) return `Tuning due in ${state.days} days`;
  return `Next tuning ${day(state.next)}`;
};

/** Under the headline: "Due 4 Oct 2026 · last tuned 4 Apr 2026". */
export const serviceDetail = (state: ServiceState) =>
  state.tone === "ok"
    ? `${intervalLabel(state.months)} · last tuned ${day(state.last)}`
    : `${state.days < 0 ? "Was due" : "Due"} ${day(state.next)} · last tuned ${day(state.last)}`;

/** Today's short line: "Tuning overdue · was due 12 Sep", "Tuning due in 5 days · 4 Oct". */
export const serviceDueLine = (state: ServiceState) =>
  state.days < 0
    ? `Tuning overdue · was due ${shortDay(state.next)}`
    : `${serviceHeadline(state)} · ${shortDay(state.next)}`;

export interface ServiceDueEntry {
  piano: PianoItem;
  state: ServiceState;
}

/** Today's "Service due": tunings that are overdue or due within a week, the most overdue first. */
export const serviceDue = (
  pianos: PianoItem[],
  entries: ServiceEntry[],
  today = startOfToday()
): ServiceDueEntry[] =>
  pianos
    .map((piano) => ({ piano, state: serviceState(piano, entriesFor(entries, piano.$id), today) }))
    .filter((item): item is ServiceDueEntry => !!item.state && item.state.tone !== "ok")
    .sort((a, b) => a.state.days - b.state.days);

/** Where a piano is, for Today's list: "Rented to Meera Kapoor" or "In the warehouse". */
export const whereLine = (piano: PianoItem) => {
  const name = piano.rental_customer_name?.trim();
  if (piano.category === PIANO_CATEGORY.RENTABLE && name) return `Rented to ${name}`;
  if (piano.category === PIANO_CATEGORY.WAREHOUSE) return "In the warehouse";
  if (piano.category === PIANO_CATEGORY.EVENTS) return "For events";
  if (piano.category === PIANO_CATEGORY.ON_SALE) return "On sale";
  return "In stock";
};

/** How many entries, and what they cost in all. */
export const serviceSummary = (pianoEntries: ServiceEntry[]) => ({
  count: pianoEntries.length,
  spent: pianoEntries.reduce((sum, entry) => sum + (entry.cost && entry.cost > 0 ? entry.cost : 0), 0),
});

/** The entries by year, the newest year first, for the full list. */
export const byYear = (pianoEntries: ServiceEntry[]) => {
  const years: { year: string; entries: ServiceEntry[] }[] = [];
  for (const entry of [...pianoEntries].sort(byNewest)) {
    const year = entry.serviced_on.slice(0, 4);
    const group = years.find((candidate) => candidate.year === year);
    if (group) group.entries.push(entry);
    else years.push({ year, entries: [entry] });
  }
  return years;
};

/** "4 Apr 2026", or "4 Apr" inside its year's group. */
export const entryDay = (entry: ServiceEntry, withYear = true) => {
  const date = parseStoredDate(entry.serviced_on);
  return date ? (withYear ? day(date) : shortDay(date)) : "";
};

/**
 * The message to the renter about booking the tuning visit, typed into their
 * WhatsApp for the owner to check and send. It ends with the business's name
 * when the letterhead details have one.
 */
export const serviceMessage = (piano: PianoItem, due: Date, business = "", today = startOfToday()) => {
  const name = piano.rental_customer_name?.trim();
  const title = piano.title?.trim() || "your piano";
  const days = differenceInCalendarDays(due, today);
  const when = days < 0 ? `was due for its tuning on ${day(due)}` : days === 0 ? "is due for its tuning today" : `is due for its tuning on ${day(due)}`;
  const sign = business.trim();
  return [
    `Hello${name ? ` ${name}` : ""},`,
    "",
    `Your piano, ${title}, ${when}. When would be a good time for us to visit?`,
    "",
    sign ? `Thank you,\n${sign}` : "Thank you.",
  ].join("\n");
};
