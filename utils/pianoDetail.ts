import { differenceInCalendarDays, format, startOfToday } from "date-fns";
import type { RentPayment } from "@/lib/appwrite";
import { PIANO_CATEGORY } from "@/constants/Piano";
import { PianoItem } from "@/redux/pianos/types";
import { getRemainingPeriod, parseStoredDate, StoredDate } from "@/utils/dates";
import { formatRupees } from "@/utils/money";
import { getPianoDisplay } from "@/utils/pianoDisplay";
import { getPianoRentalState, isSold } from "@/utils/pianoStatus";
import { canRemind } from "@/utils/reminders";
import { getRentalStatusAgo, StatusTone } from "@/utils/rentalStatus";

// What a piano's page says, worked out from the piano: which sections it has,
// what is in them, and which action leads. Nothing here draws or loads anything.

/** "21 Dec 2025", or null when there is no date. */
export const formatDay = (value: StoredDate): string | null => {
  const date = parseStoredDate(value);
  return date ? format(date, "d MMM yyyy") : null;
};

const clean = (value: string | null | undefined) => value?.trim() || "";

const isRentable = (piano: PianoItem) => piano.category === PIANO_CATEGORY.RENTABLE;

/** The line under the title: "Rentable · Young Chang · The Piano Services", or "Was rentable · …" once sold. */
export const metaLine = (piano: PianoItem): string => {
  const label = getPianoDisplay(piano).categoryLabel;
  const category = isSold(piano) ? `Was ${label.toLowerCase()}` : label;
  return [category, clean(piano.make), clean(piano.company_associated)]
    .filter(Boolean)
    .join(" · ");
};

/** How the status line and the bar colour a piece of text. `ink` is plain and bold. */
export type DetailTone = StatusTone | "ink";

export interface DetailStatus {
  text: string;
  tone: DetailTone;
  /** A rental gets a coloured dot in front of its line */
  dot: boolean;
}

/** The rental's line as a sentence: "Rental ended 9 months ago", "Rental ends in 3 days". */
const rentalSentence = (text: string) => {
  if (text.startsWith("Ended ")) return `Rental ended ${text.slice("Ended ".length)}`;
  if (text === "Ends today") return "Rental ends today";
  if (text.startsWith("Ends in ")) return `Rental ${text[0].toLowerCase()}${text.slice(1)}`;
  return `Rental ends in ${text.replace(/ left$/, "")}`;
};

/** The one-line status under the title: a rental's, or when it was sold. Null for the rest. */
export const statusLine = (piano: PianoItem): DetailStatus | null => {
  if (isSold(piano)) {
    const on = formatDay(piano.sold_date);
    return { text: on ? `Sold on ${on}` : "Sold", tone: "ink", dot: false };
  }
  const status = getRentalStatusAgo(
    getPianoRentalState(piano),
    getRemainingPeriod(piano.rental_period_end)
  );
  return status ? { text: rentalSentence(status.text), tone: status.tone, dot: true } : null;
};

/** The big price under the title of a piano on sale. Nothing else has one there. */
export const titlePrice = (piano: PianoItem): string | null =>
  piano.category === PIANO_CATEGORY.ON_SALE && !isSold(piano) && piano.on_sale_price
    ? formatRupees(piano.on_sale_price)
    : null;

// --- Actions ---

export type ActionKey =
  | "recordPayment"
  | "remind"
  | "extend"
  | "edit"
  | "markSold"
  | "undoSale"
  | "delete";

export const ACTION_LABELS: Record<ActionKey, string> = {
  recordPayment: "Record payment",
  remind: "Remind customer",
  extend: "Extend rental",
  edit: "Edit piano",
  markSold: "Mark as sold",
  undoSale: "Undo sale",
  delete: "Delete piano",
};

/** The action in the sticky bar: the one thing to do next, by state. */
export const primaryAction = (piano: PianoItem): ActionKey => {
  if (isSold(piano)) return "undoSale";
  if (isRentable(piano)) return "recordPayment";
  if (piano.category === PIANO_CATEGORY.ON_SALE) return "markSold";
  return "edit";
};

/** The rows at the bottom of the page. The action in the bar isn't repeated there. */
export const listActions = (piano: PianoItem): ActionKey[] => {
  if (isSold(piano)) return ["edit", "delete"];
  if (isRentable(piano)) {
    // A reminder needs a number to message
    return [
      ...(canRemind(piano) ? (["remind"] as const) : []),
      "extend",
      "edit",
      "markSold",
      "delete",
    ];
  }
  if (piano.category === PIANO_CATEGORY.ON_SALE) return ["edit", "delete"];
  return ["markSold", "delete"];
};

/** Everything the page can do, for the ⋯ button: the action in the bar, then the rows. */
export const menuActions = (piano: PianoItem): ActionKey[] => [
  primaryAction(piano),
  ...listActions(piano),
];

// --- The sticky bar ---

export interface BarInfo {
  /** "₹4,500", or null when there is no amount to show */
  amount: string | null;
  caption: string | null;
  tone: DetailTone;
}

const positive = (value: number | null | undefined) => (value && value > 0 ? value : null);

/** The amount and the line under it, on the left of the sticky bar. */
export const barInfo = (piano: PianoItem): BarInfo => {
  if (isSold(piano)) {
    const price = positive(piano.sold_price);
    return { amount: price ? formatRupees(price) : null, caption: "Sold", tone: "normal" };
  }

  if (isRentable(piano)) {
    const price = positive(piano.rental_price);
    const state = getPianoRentalState(piano);
    const status = getRentalStatusAgo(state, getRemainingPeriod(piano.rental_period_end));
    const amount = price ? formatRupees(price) : null;
    if (!status) return { amount, caption: "Available", tone: "normal" };
    if (state === "ended") return { amount, caption: "Rent overdue", tone: "late" };
    return { amount, caption: status.text, tone: status.tone };
  }

  const display = getPianoDisplay(piano);
  if (piano.category === PIANO_CATEGORY.ON_SALE) {
    return { amount: display.price, caption: "Listed for sale", tone: "normal" };
  }
  return { amount: display.price, caption: display.status.text, tone: "normal" };
};

// --- Sections ---

export interface DetailRow {
  label: string;
  value: string;
  /** Bold, for an amount */
  strong?: boolean;
}

export interface DetailSection {
  title: string;
  rows: DetailRow[];
  /** The description, under the rows */
  note: string | null;
}

/** A row, or nothing when the value is missing. */
const row = (label: string, value: string | null | undefined, strong = false): DetailRow[] =>
  value ? [{ label, value, ...(strong ? { strong } : {}) }] : [];

/**
 * "About this piano" for a rental or a sold piano, "Details" for the rest:
 * make, company, what is particular to its category, when it was bought, and
 * the description.
 */
export const aboutSection = (piano: PianoItem): DetailSection => {
  const rows: DetailRow[] = [
    ...row("Make", clean(piano.make)),
    ...row("Company", clean(piano.company_associated)),
  ];

  switch (piano.category) {
    case PIANO_CATEGORY.EVENTS:
      rows.push(
        ...row(
          "Purchase price",
          piano.event_purchase_price != null ? formatRupees(piano.event_purchase_price) : null,
          true
        ),
        ...row("Bought from", clean(piano.event_purchase_from)),
        ...row("Model number", clean(piano.event_model_number)),
        ...row("B number", clean(piano.event_b_number))
      );
      break;
    case PIANO_CATEGORY.ON_SALE:
      rows.push(
        ...row("Bought from", clean(piano.on_sale_purchase_from)),
        ...row("Imported", formatDay(piano.on_sale_import_date))
      );
      break;
    case PIANO_CATEGORY.WAREHOUSE:
      rows.push(...row("Stored since", formatDay(piano.warehouse_since_date)));
      break;
  }
  rows.push(...row("Purchased", formatDay(piano.date_of_purchase)));

  const aboutTitle = isRentable(piano) || isSold(piano);
  return {
    title: aboutTitle ? "About this piano" : "Details",
    rows,
    note: clean(piano.description) || null,
  };
};

/** The Sale section of a sold piano: price, buyer, address and the day. */
export const saleRows = (piano: PianoItem): DetailRow[] => [
  ...row("Price", positive(piano.sold_price) ? formatRupees(piano.sold_price!) : null, true),
  ...row("Buyer", clean(piano.sold_to_name)),
  ...row("Address", clean(piano.sold_to_address)),
  ...row("Sold on", formatDay(piano.sold_date)),
];

// --- The rental ---

/** "MK" for "Meera Kapoor": the first letters of the first two words. */
export const initialsOf = (name: string | null | undefined): string =>
  clean(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

export interface RentalPeriod {
  start: string | null;
  end: string | null;
  /**
   * How the bar is split: `done` days in ink, then `rest` days grey, or, once
   * the rental has ended, its whole length in ink and the days over in red.
   * Null when a date is missing.
   */
  bar: { done: number; rest: number; overdue: boolean } | null;
  /** Under the end date: "Ended · 9 months over", "Ends in 3 days" or "12 days left" */
  endCaption: { text: string; tone: StatusTone } | null;
}

/** The dates, the bar and the caption of the Rental section. */
export const rentalPeriod = (piano: PianoItem): RentalPeriod => {
  const start = parseStoredDate(piano.rental_period_start);
  const end = parseStoredDate(piano.rental_period_end);
  const state = getPianoRentalState(piano);
  const status = getRentalStatusAgo(state, getRemainingPeriod(piano.rental_period_end));

  let bar: RentalPeriod["bar"] = null;
  if (start && end) {
    const total = differenceInCalendarDays(end, start);
    const today = startOfToday();
    if (total > 0) {
      if (state === "ended") {
        bar = { done: total, rest: differenceInCalendarDays(today, end), overdue: true };
      } else {
        const done = Math.min(total, Math.max(0, differenceInCalendarDays(today, start)));
        bar = { done, rest: total - done, overdue: false };
      }
    }
  }

  let endCaption: RentalPeriod["endCaption"] = null;
  if (status) {
    const over = status.text.match(/^Ended (.*) ago$/);
    endCaption = over
      ? { text: `Ended · ${over[1]} over`, tone: "late" }
      : { text: status.text, tone: status.tone };
  }

  return { start: formatDay(start), end: formatDay(end), bar, endCaption };
};

/** The rows under the rental's bar: what it costs, and where the piano is. */
export const rentalRows = (piano: PianoItem): DetailRow[] => [
  ...row("Rent", positive(piano.rental_price) ? formatRupees(piano.rental_price!) : null, true),
  ...row("Address", clean(piano.rental_customer_address)),
];

// --- Payments ---

/** How many payments show before "Show all". */
export const PAYMENTS_SHOWN = 3;

/** "₹54,000 received · 12 payments" */
export const paymentsSummary = (payments: Pick<RentPayment, "amount">[]): string => {
  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const count = payments.length;
  return `${formatRupees(total)} received · ${count} ${count === 1 ? "payment" : "payments"}`;
};
