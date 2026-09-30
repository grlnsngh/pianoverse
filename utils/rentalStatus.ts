import { colors } from "@/constants/theme";
import { PianoItem } from "@/redux/pianos/types";
import { getRemainingPeriod, Period, RentalState } from "@/utils/dates";
import { getPianoRentalState } from "@/utils/pianoStatus";

// Shared by the list, card, grid and detail views, so they all describe a
// rental the same way

const ENDING_SOON_DAYS = 7;

const pluralize = (value: number, unit: string) =>
  `${value} ${unit}${value === 1 ? "" : "s"}`;

/** A rental with a week or less to go, highlighted so it isn't missed. */
export const isEndingSoon = (remaining: Period) =>
  remaining.days <= ENDING_SOON_DAYS;

// --- The redesign's status line (SPEC section 2) ---

/**
 * How urgent a rental's status is: `late` (overdue, red), `soon` (ends within a
 * week, orange) or `normal` (secondary grey).
 */
export type StatusTone = "late" | "soon" | "normal";

export interface RentalStatus {
  text: string;
  tone: StatusTone;
}

/** The text colour for each tone. `late` and `soon` also get a badge on the photo. */
export const STATUS_TONE_COLORS: Record<StatusTone, string> = {
  late: colors.late,
  soon: colors.brandText,
  normal: colors.ink2,
};

/** From this many days on, a span is given in months, as in "Overdue · 9 months". */
const DAYS_BEFORE_MONTHS = 60;

/** "18 days", or "2 months" from 60 days on. Past spans count by their length. */
const formatSpan = (period: Period) => {
  const days = Math.abs(period.days);
  if (days < DAYS_BEFORE_MONTHS) return pluralize(days, "day");
  return pluralize(Math.max(1, Math.abs(period.months)), "month");
};

/**
 * The status line and its tone for a rental: "Overdue · 18 days" (late),
 * "Ends in 3 days" or "Ends today" (soon), "12 days left" or "2 months left"
 * (normal). Null when the piano isn't a rental.
 */
export const getRentalStatus = (
  state: RentalState | null,
  remaining: Period
): RentalStatus | null => {
  if (!state) return null;
  if (state === "ended") {
    return { text: `Overdue · ${formatSpan(remaining)}`, tone: "late" };
  }
  if (state === "due_today") return { text: "Ends today", tone: "soon" };
  if (isEndingSoon(remaining)) {
    return {
      text: `Ends in ${pluralize(remaining.days, "day")}`,
      tone: "soon",
    };
  }
  return { text: `${formatSpan(remaining)} left`, tone: "normal" };
};

/**
 * The same as getRentalStatus, except that a rental that has ended reads
 * "Ended 18 days ago" (the Today board's wording, for a list where every row
 * needs attention anyway) instead of "Overdue · 18 days". The count is the
 * same, so the two never disagree.
 */
export const getRentalStatusAgo = (
  state: RentalState | null,
  remaining: Period
): RentalStatus | null =>
  state === "ended"
    ? { text: `Ended ${formatSpan(remaining)} ago`, tone: "late" }
    : getRentalStatus(state, remaining);

/**
 * The status line of a piano: a running rental, or null for a piano that isn't
 * rented (events, on sale, warehouse, sold, or a rental with no end date).
 */
export const getPianoRentalStatus = (
  piano: Pick<PianoItem, "category" | "rental_period_end" | "sold_date">
): RentalStatus | null =>
  getRentalStatus(
    getPianoRentalState(piano),
    getRemainingPeriod(piano.rental_period_end)
  );

