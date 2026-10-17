import { formatRupees } from "@/utils/money";

// What the line under a kept rental says about its deposit (Previous renters,
// and a customer's rental history). Kept apart from the rest of the deposit
// rules so the customers' code can use it without importing them.

/** How a deposit is settled: what goes back and what is kept, and why. */
export interface Settlement {
  held: number;
  refund: number;
  kept: number;
  /** Of what is kept, the part for unpaid rent (it is also recorded as a rent payment, "From deposit") */
  forRent: number;
  /** Of what is kept, the part for damage (stored with the rental, not counted as income) */
  forDamage: number;
  /** "unpaid rent", "damage" or "unpaid rent and damage"; null when nothing is said about it */
  note: string | null;
}

const cents = (amount: number) => Math.round(amount * 100) / 100;

/** What the line under a kept rental says about its deposit, and whether it is settled. */
export interface SettlementLine {
  text: string;
  settled: boolean;
}

/**
 * "Deposit ₹9,000 · not settled", "· refunded in full", "· refunded ₹4,500,
 * kept ₹4,500 for unpaid rent" or "· none refunded, kept for damage".
 */
export const settlementLine = (
  deposit: number,
  refunded: number | null | undefined,
  note: string | null | undefined
): SettlementLine => {
  const head = `Deposit ${formatRupees(deposit)}`;
  if (typeof refunded !== "number") return { text: `${head} · not settled`, settled: false };
  if (refunded >= deposit) return { text: `${head} · refunded in full`, settled: true };
  const why = note?.trim() ? ` for ${note.trim()}` : "";
  if (refunded <= 0) {
    return { text: `${head} · none refunded${note?.trim() ? `, kept${why}` : ""}`, settled: true };
  }
  return { text: `${head} · refunded ${formatRupees(refunded)}, kept ${formatRupees(cents(deposit - refunded))}${why}`, settled: true };
};
