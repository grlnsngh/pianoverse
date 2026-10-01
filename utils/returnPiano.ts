import { PIANO_CATEGORY } from "@/constants/Piano";
import type { PianoFieldsUpdate } from "@/lib/appwrite";
import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate, toStoredDate } from "@/utils/dates";
import { isSold } from "@/utils/pianoStatus";

// Marking a piano as returned: the rental on it is over, so its details come
// off the piano (it goes back into stock) and the rental is kept in its history.

const text = (value: string | null | undefined) => value?.trim() || "";

/** The calendar day of a stored date, as a string, or null. */
const dayOf = (value: PianoItem["rental_period_start"]) => {
  const date = parseStoredDate(value as any);
  return date ? toStoredDate(date) : null;
};

/**
 * Whether the piano has a rental to mark as returned: it is a rental that
 * isn't sold, with a customer, a number, an address, a start or an end date,
 * or a rent on it. A rentable piano with nothing on it is already in stock.
 */
export const hasRentalToReturn = (piano: PianoItem): boolean =>
  piano.category === PIANO_CATEGORY.RENTABLE &&
  !isSold(piano) &&
  (text(piano.rental_customer_name) !== "" ||
    text(piano.rental_customer_mobile) !== "" ||
    text(piano.rental_customer_address) !== "" ||
    dayOf(piano.rental_period_start) !== null ||
    dayOf(piano.rental_period_end) !== null ||
    (typeof piano.rental_price === "number" && piano.rental_price > 0));

/** What takes the rental off a piano: every rental detail empty. */
export const clearedRental = (): PianoFieldsUpdate => ({
  rental_customer_name: null,
  rental_customer_mobile: null,
  rental_customer_address: null,
  rental_period_start: null,
  rental_period_end: null,
  rental_price: null,
});

/** What puts a piano's rental back as it was (Undo), in the way the fields are saved. */
export const restoredRental = (piano: PianoItem): PianoFieldsUpdate => ({
  rental_customer_name: piano.rental_customer_name ?? null,
  rental_customer_mobile: piano.rental_customer_mobile ?? null,
  rental_customer_address: piano.rental_customer_address ?? null,
  rental_period_start: dayOf(piano.rental_period_start) as any,
  rental_period_end: dayOf(piano.rental_period_end) as any,
  rental_price: typeof piano.rental_price === "number" ? piano.rental_price : null,
});
