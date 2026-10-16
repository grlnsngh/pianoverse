import {
  addMonths,
  format,
  isSameMonth,
  startOfMonth,
  subMonths,
} from "date-fns";
import type { RentPayment } from "@/lib/appwrite";
import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate } from "@/utils/dates";
import { formatRupees } from "@/utils/money";
import { isSold } from "@/utils/pianoStatus";

// The money that came in, month by month: the rent that was received and what
// the pianos sold for. Nothing here loads anything; it adds up what it is given.

/** The months Today's chart shows, and the Income screen's list. */
export const TODAY_MONTHS = 6;
export const INCOME_MONTHS = 12;

export interface MonthIncome {
  /** The first day of the month */
  month: Date;
  /** Rent received in the month, and how many payments it came in */
  rent: number;
  rentCount: number;
  /** What the pianos sold in the month went for, and how many */
  sales: number;
  salesCount: number;
  /** Rent and sales together */
  total: number;
}

/** The days to load payments for to cover `count` months ending with this one: from the first day, up to but not including `to`. */
export const incomeRange = (count: number, today = new Date()) => ({
  from: startOfMonth(subMonths(today, count - 1)),
  to: addMonths(startOfMonth(today), 1),
});

/**
 * The last `count` months, oldest first and ending with the month of `today`:
 * for each, the rent received (from the payments) and the sales (from the
 * pianos that were sold in it). A payment or a sale outside those months is left out.
 */
export const incomeByMonth = (
  payments: Pick<RentPayment, "amount" | "paid_on">[],
  pianos: PianoItem[],
  count: number,
  today = new Date()
): MonthIncome[] =>
  Array.from({ length: count }, (_, index) => {
    const month = startOfMonth(subMonths(today, count - 1 - index));

    const paid = payments.filter((payment) => {
      const paidOn = parseStoredDate(payment.paid_on);
      return paidOn !== null && isSameMonth(paidOn, month);
    });
    const sold = pianos.filter((piano) => {
      const soldOn = isSold(piano) ? parseStoredDate(piano.sold_date) : null;
      return soldOn !== null && isSameMonth(soldOn, month);
    });

    const rent = paid.reduce((sum, payment) => sum + payment.amount, 0);
    const sales = sold.reduce((sum, piano) => sum + (piano.sold_price ?? 0), 0);
    return {
      month,
      rent,
      rentCount: paid.length,
      sales,
      salesCount: sold.length,
      total: rent + sales,
    };
  });

/** Whether nothing came in during any of the months. */
export const noIncome = (months: MonthIncome[]) =>
  months.every(
    (entry) =>
      entry.total === 0 && entry.rentCount === 0 && entry.salesCount === 0
  );

/** What all the months add up to. */
export const totalsOf = (months: MonthIncome[]) =>
  months.reduce(
    (sum, entry) => ({
      rent: sum.rent + entry.rent,
      sales: sum.sales + entry.sales,
      total: sum.total + entry.total,
    }),
    { rent: 0, sales: 0, total: 0 }
  );

/** The height of a bar for `value`, in a chart `height` high whose tallest bar stands for `max`. A month with something in it always shows. */
export const barHeight = (value: number, max: number, height: number) => {
  if (value <= 0 || max <= 0) return 0;
  return Math.max(2, Math.round((value / max) * height));
};

/** "Rent: October so far ₹6,000 · September ₹12,500": the rent of this month so far, next to the whole of the one before. Null before there are two months. */
export const sofarLine = (months: MonthIncome[]): string | null => {
  if (months.length < 2) return null;
  const current = months[months.length - 1];
  const previous = months[months.length - 2];
  return `Rent: ${format(current.month, "MMMM")} so far ${formatRupees(current.rent)} · ${format(
    previous.month,
    "MMMM"
  )} ${formatRupees(previous.rent)}`;
};

const count = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/** The line under a month on the Income screen: "3 payments · 1 piano sold". */
export const monthDetail = (entry: MonthIncome): string => {
  const parts = [
    entry.rentCount > 0 ? count(entry.rentCount, "payment", "payments") : null,
    entry.salesCount > 0
      ? count(entry.salesCount, "piano sold", "pianos sold")
      : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Nothing recorded";
};

// --- Profit (M2): what came in less the costs, on the Income screen ---

export interface MonthProfit extends MonthIncome {
  /** The costs in the month (expenses and services with a cost), and how many */
  costs: number;
  costCount: number;
  /** What came in less the costs; below zero for a month that cost more */
  profit: number;
}

/** Each month with its costs and its profit. A cost outside the months is left out. */
export const withCosts = (
  months: MonthIncome[],
  costs: { day: Date; amount: number }[]
): MonthProfit[] =>
  months.map((entry) => {
    const inMonth = costs.filter((cost) => isSameMonth(cost.day, entry.month));
    const spent = inMonth.reduce((sum, cost) => sum + cost.amount, 0);
    return { ...entry, costs: spent, costCount: inMonth.length, profit: entry.total - spent };
  });

/** What all the months add up to: income, costs and profit. */
export const profitTotals = (months: MonthProfit[]) => {
  const income = months.reduce((sum, entry) => sum + entry.total, 0);
  const costs = months.reduce((sum, entry) => sum + entry.costs, 0);
  return { income, costs, profit: income - costs };
};

/** Whether nothing came in and nothing was spent during any of the months. */
export const nothingRecorded = (months: MonthProfit[]) =>
  noIncome(months) && months.every((entry) => entry.costCount === 0);

/** "₹2,46,300", or "−₹3,500" for a loss. */
export const formatSigned = (amount: number) =>
  amount < 0 ? `−${formatRupees(-amount)}` : formatRupees(amount);

/** The line under a month: "₹18,000 in · ₹3,200 out", with "· 1 piano sold" when one was. */
export const profitDetail = (entry: MonthProfit): string => {
  if (entry.total === 0 && entry.costs === 0 && entry.rentCount === 0 && entry.salesCount === 0) {
    return "Nothing recorded";
  }
  const sold = entry.salesCount > 0 ? ` · ${count(entry.salesCount, "piano sold", "pianos sold")}` : "";
  return `${formatRupees(entry.total)} in · ${formatRupees(entry.costs)} out${sold}`;
};

/** What a screen reader says for the chart with its costs. */
export const profitChartSummary = (months: MonthProfit[]): string =>
  `Rent and costs by month. ${months
    .map((entry) => {
      const sold =
        entry.salesCount > 0
          ? `, ${count(entry.salesCount, "piano", "pianos")} sold for ${formatRupees(entry.sales)}`
          : "";
      return `${format(entry.month, "MMMM yyyy")}: rent ${formatRupees(entry.rent)}${sold}, costs ${formatRupees(entry.costs)}`;
    })
    .join(". ")}.`;

/** What a screen reader says for the chart, since it can't see the bars or the dots. */
export const chartSummary = (months: MonthIncome[]): string =>
  `Rent received by month. ${months
    .map((entry) => {
      const sold =
        entry.salesCount > 0
          ? `, ${count(entry.salesCount, "piano", "pianos")} sold for ${formatRupees(entry.sales)}`
          : "";
      return `${format(entry.month, "MMMM yyyy")}: ${formatRupees(entry.rent)}${sold}`;
    })
    .join(". ")}.`;
