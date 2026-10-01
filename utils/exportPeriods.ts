import { addMonths, format, startOfMonth } from "date-fns";

/** A stretch of time to export payments for. `to` is the first day after it. */
export interface ExportPeriod {
  key: "this-month" | "last-month" | "this-financial-year" | "last-financial-year" | "all";
  label: string;
  /** What it covers, in words under the label */
  detail: string;
  from: Date;
  /** The day the period ends on, which is not part of it */
  to: Date;
  /** For the end of the file's name: "2026-10", "fy-2026-27" */
  slug: string;
}

/** Before the app existed, so "everything" starts here. */
export const ALL_PAYMENTS_FROM = new Date(2000, 0, 1);

/** The financial year (1 April to 31 March, as in India) that starts in `startYear`. */
const financialYear = (startYear: number) => ({
  from: new Date(startYear, 3, 1),
  to: new Date(startYear + 1, 3, 1),
  detail: `Apr ${startYear} – Mar ${startYear + 1}`,
  slug: `fy-${startYear}-${String(startYear + 1).slice(-2)}`,
});

/**
 * The stretches the person can choose to export payments for: this month and
 * last month, this financial year and last (1 April to 31 March), and
 * everything recorded.
 */
export const exportPeriods = (today = new Date()): ExportPeriod[] => {
  const thisMonth = startOfMonth(today);
  const lastMonth = addMonths(thisMonth, -1);
  // April to December belong to the year that started this April, January to March to the one before
  const startYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const thisYear = financialYear(startYear);
  const lastYear = financialYear(startYear - 1);

  return [
    {
      key: "this-month",
      label: "This month",
      detail: format(thisMonth, "MMMM yyyy"),
      from: thisMonth,
      to: addMonths(thisMonth, 1),
      slug: format(thisMonth, "yyyy-MM"),
    },
    {
      key: "last-month",
      label: "Last month",
      detail: format(lastMonth, "MMMM yyyy"),
      from: lastMonth,
      to: thisMonth,
      slug: format(lastMonth, "yyyy-MM"),
    },
    { key: "this-financial-year", label: "This financial year", ...thisYear },
    { key: "last-financial-year", label: "Last financial year", ...lastYear },
    {
      key: "all",
      label: "All payments",
      detail: "Everything you have recorded",
      from: ALL_PAYMENTS_FROM,
      to: addMonths(thisMonth, 1),
      slug: "all",
    },
  ];
};
