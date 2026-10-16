import { addDays, endOfMonth, getDay, startOfMonth } from "date-fns";

/**
 * The weeks of a month for a calendar that starts on Monday: rows of seven,
 * with null for the blank cells before the 1st and after the last day, so the
 * last row is always full. `month` can be any day in it.
 */
export const monthRows = (month: Date): (Date | null)[][] => {
  const first = startOfMonth(month);
  const leading = (getDay(first) + 6) % 7;
  const daysInMonth = endOfMonth(first).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
};
