import { icons } from "@/constants";
import { PIANO_CATEGORY } from "@/app/constants/Piano";
import { SECONDARY_COLOR } from "@/constants/colors";
import { Period, RentalState } from "@/utils/dates";

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
