import type { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate } from "@/utils/dates";
import { isSold } from "@/utils/pianoStatus";
import type { ServiceEntry } from "@/utils/serviceLog";

/**
 * One piano's money (M3 and M7, canvas page "Expenses and profit"): what it
 * brought in (its rent and its sale), what it cost (what it was bought for and
 * its services), and the difference. Business expenses aren't split between
 * pianos, and what a piano was bought for never counts in a month's profit.
 */

/**
 * What the piano was bought for, or null when it isn't known. Once Bought for
 * has been saved it is what counts, 0 meaning not known; before that, a piano
 * for events still has the Purchase price it was added with.
 */
export const purchasePriceOf = (piano: Pick<PianoItem, "purchase_price" | "event_purchase_price">): number | null => {
  if (piano.purchase_price != null) return piano.purchase_price > 0 ? piano.purchase_price : null;
  return piano.event_purchase_price && piano.event_purchase_price > 0 ? piano.event_purchase_price : null;
};

export interface PianoMoney {
  /** The rent received, and how many payments it came in */
  rent: number;
  rentCount: number;
  /** What it sold for; 0 while it isn't sold */
  sale: number;
  /** Rent and the sale together */
  earned: number;
  /** What it was bought for, or null when not known */
  bought: number | null;
  /** What its services cost, and how many services it has had */
  service: number;
  serviceCount: number;
  /** What it was bought for and its services together */
  costs: number;
  /** What it brought in less what it cost; null until what it was bought for is known */
  profit: number | null;
  /** The day it was bought */
  since: Date | null;
}

/** A piano's money, from its payments and its services. */
export const pianoMoney = (
  piano: PianoItem,
  payments: { amount: number }[],
  entries: ServiceEntry[]
): PianoMoney => {
  const rent = payments.reduce((sum, payment) => sum + (payment.amount > 0 ? payment.amount : 0), 0);
  const sale = isSold(piano) && piano.sold_price && piano.sold_price > 0 ? piano.sold_price : 0;
  const bought = purchasePriceOf(piano);
  const service = entries.reduce((sum, entry) => sum + (entry.cost && entry.cost > 0 ? entry.cost : 0), 0);
  const costs = (bought ?? 0) + service;
  return {
    rent,
    rentCount: payments.length,
    sale,
    earned: rent + sale,
    bought,
    service,
    serviceCount: entries.length,
    costs,
    profit: bought === null ? null : rent + sale - costs,
    since: parseStoredDate(piano.date_of_purchase),
  };
};

/** The profit on the piano if it sells for `price`, as Mark as sold shows it; null until what it was bought for is known. */
export const profitIfSold = (money: PianoMoney, price: number) =>
  money.bought === null ? null : money.rent + Math.max(0, price) - money.bought - money.service;
