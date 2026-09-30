import { icons } from "@/constants";
import { PIANO_CATEGORY } from "@/constants/Piano";
import { CATEGORY_COLORS, SECONDARY_COLOR } from "@/constants/colors";
import { colors } from "@/constants/theme";
import { PianoItem } from "@/redux/pianos/types";
import { getRemainingPeriod, Period, RentalState } from "@/utils/dates";
import { getPianoRentalState } from "@/utils/pianoStatus";

// Shared by the list, card, grid and detail views, so they all describe a
// rental the same way

const ENDING_SOON_DAYS = 7;

export const RENTAL_STATUS_COLORS = {
  endingSoon: "#ef4444",
  active: "#10b981",
  ended: "#6b7280",
};

const pluralize = (value: number, unit: string) =>
  `${value} ${unit}${value === 1 ? "" : "s"}`;

/**
 * A period in its largest whole unit: "2 years", "3 months", "1 week",
 * "5 days". Negative periods (in the past) are described by their length.
 */
export const formatPeriod = (period: Period) => {
  const { years, months, weeks, days } = {
    years: Math.abs(period.years),
    months: Math.abs(period.months),
    weeks: Math.abs(period.weeks),
    days: Math.abs(period.days),
  };
  if (years > 0) return pluralize(years, "year");
  if (months > 0) return pluralize(months, "month");
  if (weeks > 0) return pluralize(weeks, "week");
  return pluralize(days, "day");
};

/** The same, abbreviated for small badges: "2y", "3mo", "1w", "5d". */
const formatPeriodShort = (period: Period) => {
  if (period.years > 0) return `${period.years}y`;
  if (period.months > 0) return `${period.months}mo`;
  if (period.weeks > 0) return `${period.weeks}w`;
  return `${period.days}d`;
};

/** A rental with a week or less to go, highlighted so it isn't missed. */
export const isEndingSoon = (remaining: Period) =>
  remaining.days <= ENDING_SOON_DAYS;

/** The colour of a rental's status badge (the accent colour when not rented). */
export const getRentalStatusColor = (
  state: RentalState | null,
  remaining: Period
) => {
  if (!state) return SECONDARY_COLOR;
  if (state === "due_today") return RENTAL_STATUS_COLORS.endingSoon;
  if (state === "active") {
    return isEndingSoon(remaining)
      ? RENTAL_STATUS_COLORS.endingSoon
      : RENTAL_STATUS_COLORS.active;
  }
  return RENTAL_STATUS_COLORS.ended;
};

/**
 * The text of a rental's status badge, e.g. "3 weeks remaining", "Due today"
 * or "Expired 2 days ago" ("3w left" and "Expired" when `compact`). Null when
 * the piano isn't rented.
 */
export const getRentalStatusText = (
  state: RentalState | null,
  remaining: Period,
  { compact = false } = {}
) => {
  if (!state) return null;
  if (state === "due_today") return "Due today";
  if (state === "active") {
    return compact
      ? `${formatPeriodShort(remaining)} left`
      : `${formatPeriod(remaining)} remaining`;
  }
  return compact ? "Expired" : `Expired ${formatPeriod(remaining)} ago`;
};

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
 * (normal). Null when the piano isn't a rental. Takes the same `state` and
 * `remaining` as getRentalStatusText.
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

/** The icon shown for a piano's category. */
export const getCategoryIcon = (category: string) => {
  switch (category) {
    case PIANO_CATEGORY.EVENTS:
      return icons.play;
    case PIANO_CATEGORY.ON_SALE:
      return icons.bookmark;
    case PIANO_CATEGORY.WAREHOUSE:
      return icons.home;
    default:
      return icons.card;
  }
};

/** The colour a piano's category is shown in, the same on every screen. */
export const getCategoryColor = (category: string) => {
  switch (category) {
    case PIANO_CATEGORY.RENTABLE:
      return CATEGORY_COLORS.RENTABLE;
    case PIANO_CATEGORY.EVENTS:
      return CATEGORY_COLORS.EVENTS;
    case PIANO_CATEGORY.ON_SALE:
      return CATEGORY_COLORS.ON_SALE;
    case PIANO_CATEGORY.WAREHOUSE:
      return CATEGORY_COLORS.WAREHOUSE;
    default:
      return SECONDARY_COLOR;
  }
};
