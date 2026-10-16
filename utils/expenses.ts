import { format, isSameMonth, startOfMonth } from "date-fns";
import type { IconName } from "@/components/ui/Icon";
import type { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate } from "@/utils/dates";
import { kindOf, type ServiceEntry } from "@/utils/serviceLog";

/**
 * Expenses (M2, canvas page "Expenses and profit"): what the business spends.
 * A cost for one piano is a service with a cost in that piano's log; anything
 * else, not tied to a piano, is an expense kept here in one of five kinds.
 * Both are costs, and a month's profit is what came in less its costs.
 */

export type ExpenseCategory = "shop" | "staff" | "transport" | "advertising" | "other";

export const EXPENSE_CATEGORIES: readonly { category: ExpenseCategory; label: string; icon: IconName }[] = [
  { category: "shop", label: "Shop and storage", icon: "shop" },
  { category: "staff", label: "Staff", icon: "tabAccount" },
  { category: "transport", label: "Transport", icon: "truck" },
  { category: "advertising", label: "Advertising", icon: "megaphone" },
  { category: "other", label: "Other", icon: "more" },
];

export const isExpenseCategory = (value: unknown): value is ExpenseCategory =>
  EXPENSE_CATEGORIES.some((option) => option.category === value);

/** The kind of an expense, or Other for one the app doesn't know. */
export const categoryOf = (category: string) =>
  EXPENSE_CATEGORIES.find((option) => option.category === category) ??
  EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];

/** A business cost, as kept in Appwrite's `expenses`. */
export interface Expense {
  $id: string;
  $createdAt: string;
  /** The owner's account ID */
  creator: string;
  /** The day it was spent */
  spent_on: string;
  amount: number;
  category: string;
  note?: string | null;
}

const byNewest = (a: Expense, b: Expense) =>
  b.spent_on.localeCompare(a.spent_on) || b.$createdAt.localeCompare(a.$createdAt);

/** The expenses, the newest first. */
export const newestFirst = (expenses: Expense[]) => [...expenses].sort(byNewest);

/** One cost: a business expense, or a service of a piano that cost something. */
export type Cost =
  | { type: "expense"; id: string; day: Date; amount: number; expense: Expense }
  | { type: "service"; id: string; day: Date; amount: number; entry: ServiceEntry; piano: PianoItem | null };

/**
 * Every cost, the newest first: the expenses, and the services with a cost
 * (whatever the piano is now, even sold: the money was spent).
 */
export const allCosts = (expenses: Expense[], entries: ServiceEntry[], pianos: PianoItem[]): Cost[] => {
  const costs: Cost[] = [];
  for (const expense of expenses) {
    const day = parseStoredDate(expense.spent_on);
    if (day && expense.amount > 0) costs.push({ type: "expense", id: expense.$id, day, amount: expense.amount, expense });
  }
  for (const entry of entries) {
    const day = parseStoredDate(entry.serviced_on);
    if (day && entry.cost && entry.cost > 0) {
      costs.push({
        type: "service",
        id: entry.$id,
        day,
        amount: entry.cost,
        entry,
        piano: pianos.find((piano) => piano.$id === entry.piano_id) ?? null,
      });
    }
  }
  const created = (cost: Cost) => (cost.type === "expense" ? cost.expense.$createdAt : cost.entry.$createdAt);
  return costs.sort((a, b) => b.day.getTime() - a.day.getTime() || created(b).localeCompare(created(a)));
};

/** The costs from `from` up to but not including `to`. */
export const costsBetween = (costs: Cost[], from: Date, to: Date) =>
  costs.filter((cost) => cost.day >= from && cost.day < to);

/** What the costs add up to. */
export const costTotal = (costs: Pick<Cost, "amount">[]) => costs.reduce((sum, cost) => sum + cost.amount, 0);

/** The services' costs, as one line of the Expenses screen. */
export const PIANO_SERVICE = { key: "service", label: "Piano service", icon: "tuningFork" as IconName };

export interface KindTotal {
  key: string;
  label: string;
  icon: IconName;
  amount: number;
}

/** What each kind cost, the biggest first: piano service and the five kinds of expense, each even when nothing. */
export const costsByKind = (costs: Cost[]): KindTotal[] => {
  const totals: KindTotal[] = [
    { ...PIANO_SERVICE, amount: 0 },
    ...EXPENSE_CATEGORIES.map((option) => ({ key: option.category, label: option.label, icon: option.icon, amount: 0 })),
  ];
  for (const cost of costs) {
    const key = cost.type === "service" ? PIANO_SERVICE.key : categoryOf(cost.expense.category).category;
    const total = totals.find((candidate) => candidate.key === key);
    if (total) total.amount += cost.amount;
  }
  // A stable sort, so kinds that cost the same keep this order
  return totals.sort((a, b) => b.amount - a.amount);
};

export interface MonthCosts {
  /** The first day of the month */
  month: Date;
  /** "October 2026" */
  label: string;
  total: number;
  costs: Cost[];
}

/** The costs month by month, the newest month first. */
export const costsByMonth = (costs: Cost[]): MonthCosts[] => {
  const months: MonthCosts[] = [];
  for (const cost of [...costs].sort((a, b) => b.day.getTime() - a.day.getTime())) {
    const month = months.find((candidate) => isSameMonth(candidate.month, cost.day));
    if (month) {
      month.costs.push(cost);
      month.total += cost.amount;
    } else {
      const first = startOfMonth(cost.day);
      months.push({ month: first, label: format(first, "MMMM yyyy"), total: cost.amount, costs: [cost] });
    }
  }
  return months;
};

/** A cost's title: the expense's note (or its kind), or "Tuning · Young Chang U-121". */
export const costTitle = (cost: Cost) => {
  if (cost.type === "expense") return cost.expense.note?.trim() || categoryOf(cost.expense.category).label;
  return `${kindOf(cost.entry.kind).label} · ${cost.piano?.title?.trim() || "A piano"}`;
};

/** Under the title: "4 Oct · Shop and storage", "4 Oct · Piano service" (the year too when asked). */
export const costLine = (cost: Cost, withYear = false) => {
  const day = format(cost.day, withYear ? "d MMM yyyy" : "d MMM");
  return `${day} · ${cost.type === "expense" ? categoryOf(cost.expense.category).label : PIANO_SERVICE.label}`;
};

/** A cost's icon: its kind of expense, or its kind of service. */
export const costIcon = (cost: Cost): IconName =>
  cost.type === "expense" ? categoryOf(cost.expense.category).icon : kindOf(cost.entry.kind).icon;

/** "4 Oct 2026": the day an expense was spent. */
export const expenseDay = (expense: Expense) => {
  const date = parseStoredDate(expense.spent_on);
  return date ? format(date, "d MMM yyyy") : "";
};
