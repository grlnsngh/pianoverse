import { format, isSameDay, isSameMonth } from "date-fns";
import type { RentPayment, RentPaymentChanges } from "@/lib/appwrite";
import { parseStoredDate } from "@/utils/dates";
import { cleanName } from "@/utils/profile";

/** What the Edit payment sheet shows and the person changes. */
export interface PaymentDraft {
  amount: number;
  paidOn: Date;
  /** Who paid it: the name saved with the payment, or "" */
  name: string;
  note: string;
}

/** The sheet's starting point: the payment as it was recorded. */
export const draftOf = (payment: RentPayment): PaymentDraft => ({
  amount: payment.amount,
  paidOn: parseStoredDate(payment.paid_on) ?? new Date(),
  name: payment.customer_name ?? "",
  note: payment.note ?? "",
});

/**
 * What differs between the payment as it is saved and what the person made of
 * it: only those fields, so a change to the note doesn't touch the name, and
 * nothing at all when nothing changed. Names are compared with their spaces
 * cleaned up, and an empty name or note means it is taken off.
 */
export const changesOf = (payment: RentPayment, draft: PaymentDraft): RentPaymentChanges => {
  const changes: RentPaymentChanges = {};
  if (draft.amount !== payment.amount) changes.amount = draft.amount;

  const was = parseStoredDate(payment.paid_on);
  if (!was || !isSameDay(was, draft.paidOn)) changes.paidOn = draft.paidOn;

  const name = cleanName(draft.name);
  if (name !== cleanName(payment.customer_name ?? "")) changes.customerName = name;

  const note = draft.note.trim();
  if (note !== (payment.note ?? "").trim()) changes.note = note;

  return changes;
};

export const hasChanges = (changes: RentPaymentChanges) => Object.keys(changes).length > 0;

/**
 * A line to show when the new day is in another month than the recorded one,
 * since it moves the payment from one month's income to another's. Null when
 * the month is the same.
 */
export const monthMoveNote = (payment: RentPayment, paidOn: Date): string | null => {
  const was = parseStoredDate(payment.paid_on);
  if (!was || isSameMonth(was, paidOn)) return null;
  return `This moves the payment from ${format(was, "MMMM yyyy")} to ${format(
    paidOn,
    "MMMM yyyy"
  )}, so the income for both months changes.`;
};
