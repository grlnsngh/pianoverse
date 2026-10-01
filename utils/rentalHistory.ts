import type { NewRentalHistory } from "@/lib/appwrite";
import { PIANO_CATEGORY } from "@/constants/Piano";
import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate, toStoredDate } from "@/utils/dates";
import { customerKey } from "@/utils/customers";

// When a piano's rental is over, the details on the piano are about to be
// written over by the next one. These rules say when that is, and what to keep.

/** The calendar day of a stored date, as a string to compare, or null. */
const dayOf = (value: PianoItem["rental_period_start"]) => {
  const date = parseStoredDate(value as any);
  return date ? toStoredDate(date) : null;
};

/** Whether a piano had a rental on it: it is a rental, with a customer or a start date. */
const hadRental = (piano: PianoItem) =>
  piano.category === PIANO_CATEGORY.RENTABLE &&
  (customerKey(piano.rental_customer_name) !== "" ||
    dayOf(piano.rental_period_start) !== null);

/** What is kept of the rental that was on `piano`. */
const entryOf = (
  piano: PianoItem,
  closedOn: Date,
  reason: NewRentalHistory["reason"],
  periodEnd: string | null
): NewRentalHistory => ({
  pianoId: piano.$id,
  pianoTitle: piano.title,
  creator: piano.creator,
  customerName: piano.rental_customer_name,
  customerMobile: piano.rental_customer_mobile,
  customerAddress: piano.rental_customer_address,
  periodStart: dayOf(piano.rental_period_start),
  periodEnd,
  price: typeof piano.rental_price === "number" ? piano.rental_price : null,
  closedOn,
  reason,
});

/**
 * The rental to keep when a piano is saved, or null when nothing was over. The
 * rental that was on `before` is over when, in `after`:
 *  - the piano is no longer a rental, or the customer was taken off it (**ended**);
 *  - the rental has a new start date: a new rental began (**replaced**);
 *  - there was no start date and the customer is someone else (**replaced**).
 * Anything else is the same rental changing: it was extended or shortened, its
 * price, number or address changed, or a name was corrected. Those are not kept.
 */
export const rentalToArchive = (
  before: PianoItem,
  after: PianoItem,
  today = new Date()
): NewRentalHistory | null => {
  if (!hadRental(before)) return null;

  const stillRental = after.category === PIANO_CATEGORY.RENTABLE;
  const nameBefore = customerKey(before.rental_customer_name);
  const nameAfter = customerKey(after.rental_customer_name);
  const startBefore = dayOf(before.rental_period_start);
  const startAfter = dayOf(after.rental_period_start);

  const ended = !stillRental || (nameBefore !== "" && nameAfter === "");
  const newPeriod =
    stillRental && !!startBefore && !!startAfter && startBefore !== startAfter;
  const newRenter = stillRental && !startBefore && nameBefore !== nameAfter;
  if (!ended && !newPeriod && !newRenter) return null;

  return entryOf(before, today, ended ? "ended" : "replaced", dayOf(before.rental_period_end));
};

/**
 * The rental to keep when a piano is marked as returned, or null when it had
 * none. It ends on the day the piano came back when that is before the end that
 * was agreed (it came back early); a piano that came back on or after the agreed
 * end keeps that end, and one with no agreed end ends the day it came back.
 */
export const rentalReturned = (piano: PianoItem, returnedOn: Date): NewRentalHistory | null => {
  if (!hadRental(piano)) return null;
  const agreed = dayOf(piano.rental_period_end);
  const back = toStoredDate(returnedOn);
  return entryOf(piano, returnedOn, "returned", agreed && agreed <= back ? agreed : back);
};
