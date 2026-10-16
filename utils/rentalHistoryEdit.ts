import { differenceInCalendarDays, isSameDay } from "date-fns";
import type { RentalHistoryChanges, RentalHistoryEntry } from "@/lib/appwrite";
import { rangeText } from "@/utils/customers";
import { parseStoredDate } from "@/utils/dates";
import { cleanName } from "@/utils/profile";
import { toNationalMobile } from "@/utils/validation";

/**
 * Fixing a kept rental (a wrong entry in a piano's history): what the Edit
 * rental sheet shows and the person changes, what differs, and what can't be
 * saved as entered. The day it was kept and why are not changed.
 */

/** What the Edit rental sheet holds while a kept rental is being changed. */
export interface RentalDraft {
  name: string;
  mobile: string;
  address: string;
  /** None when the rental was kept without a start or an end */
  start: Date | null;
  end: Date | null;
  /** The rent that was asked; 0 when none was kept */
  price: number;
}

const dayOf = (value: string | null | undefined) => (value ? parseStoredDate(value) : null);

/** The sheet's starting point: the rental as it was kept. */
export const draftOf = (entry: RentalHistoryEntry): RentalDraft => ({
  name: entry.customer_name ?? "",
  mobile: entry.customer_mobile ?? "",
  address: entry.customer_address ?? "",
  start: dayOf(entry.period_start),
  end: dayOf(entry.period_end),
  price: typeof entry.price === "number" ? entry.price : 0,
});

const sameDay = (a: Date | null, b: Date | null) => (a && b ? isSameDay(a, b) : a === b);

/**
 * What differs between the rental as it is kept and what the person made of
 * it: only those details, and nothing at all when nothing changed. Names are
 * compared with their spaces cleaned up, and an empty one means it is taken off.
 */
export const changesOf = (entry: RentalHistoryEntry, draft: RentalDraft): RentalHistoryChanges => {
  const was = draftOf(entry);
  const changes: RentalHistoryChanges = {};
  const name = cleanName(draft.name);
  if (name !== cleanName(was.name)) changes.customerName = name;
  if (draft.mobile.trim() !== was.mobile.trim()) changes.customerMobile = draft.mobile.trim();
  if (draft.address.trim() !== was.address.trim()) changes.customerAddress = draft.address.trim();
  if (!sameDay(draft.start, was.start)) changes.periodStart = draft.start;
  if (!sameDay(draft.end, was.end)) changes.periodEnd = draft.end;
  if (draft.price !== was.price) changes.price = draft.price > 0 ? draft.price : null;
  return changes;
};

export const hasChanges = (changes: RentalHistoryChanges) => Object.keys(changes).length > 0;

/**
 * Why the rental can't be saved as entered, or null when it can. The number is
 * optional, but a number that is there must be one (10 digits, or with its own
 * country code), and a rental can't end before it started (on the same day is
 * fine: a piano can come back the day it left).
 */
export const draftProblem = (draft: RentalDraft): string | null => {
  const mobile = draft.mobile.trim();
  if (mobile && !toNationalMobile(mobile) && !mobile.startsWith("+")) {
    return "Please enter a 10-digit mobile number, or leave it empty.";
  }
  if (draft.start && draft.end && differenceInCalendarDays(draft.end, draft.start) < 0) {
    return "The end date can’t be before the start date.";
  }
  return null;
};

/** What a kept rental is called in a menu or a question: "Anita Rao, 29 Sep 2026 to 29 Mar 2027". */
export const rentalLabel = (entry: RentalHistoryEntry): string => {
  const name = cleanName(entry.customer_name ?? "") || "Someone";
  const range = rangeText(dayOf(entry.period_start), dayOf(entry.period_end) ?? dayOf(entry.closed_on));
  return range ? `${name}, ${range}` : name;
};
