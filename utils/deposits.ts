import type { PianoEntryInput } from "@/lib/appwrite";
import { PIANO_CATEGORY } from "@/constants/Piano";
import { PianoItem } from "@/redux/pianos/types";
import { dayText } from "@/utils/availability";
import { parseStoredDate, toStoredDate } from "@/utils/dates";
import { formatRupees } from "@/utils/money";
import { isSold } from "@/utils/pianoStatus";
import { hadRental } from "@/utils/rentalHistory";

// Security deposits (canvas page "Security deposits"). A deposit is part of the
// rental, like its rent: two fields on the piano (`rental_deposit`, and the day
// it was received), kept in the piano's history when the rental ends. It is
// refundable, so it is never income and never touches a payment: it is held,
// shown on its own, and added up on its own.

/** The deposit on a piano as a number of rupees, 0 when there is none. */
export const depositAmount = (piano: Pick<PianoItem, "rental_deposit">): number =>
  typeof piano.rental_deposit === "number" && piano.rental_deposit > 0 ? piano.rental_deposit : 0;

/** "2 months' rent": the usual deposit, offered to fill in. */
export const DEPOSIT_MONTHS = 2;

export const suggestedDeposit = (rent: number): number => (rent > 0 ? rent * DEPOSIT_MONTHS : 0);

/** A deposit held for a rental that is on a piano now. */
export interface HeldDeposit {
  piano: PianoItem;
  amount: number;
  /** The day it was received */
  since: Date | null;
  /** The customer, when known */
  who: string | null;
}

/**
 * The deposit held on a piano: it is a rental that isn't sold, with a customer
 * or a start date, and a deposit on it. Null for anything else, whatever
 * fields are left on it.
 */
export const heldDeposit = (piano: PianoItem): HeldDeposit | null => {
  const amount = depositAmount(piano);
  if (amount <= 0) return null;
  if (piano.category !== PIANO_CATEGORY.RENTABLE || isSold(piano) || !hadRental(piano)) return null;
  return {
    piano,
    amount,
    since: parseStoredDate(piano.deposit_received_on),
    who: piano.rental_customer_name?.trim() || null,
  };
};

export interface DepositsHeld {
  total: number;
  /** The one held longest first; those with no date last */
  entries: HeldDeposit[];
}

/** Every deposit held on the pianos, and what they come to. */
export const depositsHeld = (pianos: readonly PianoItem[]): DepositsHeld => {
  const entries = pianos
    .map(heldDeposit)
    .filter((held): held is HeldDeposit => held !== null)
    .sort(
      (a, b) =>
        (a.since?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.since?.getTime() ?? Number.MAX_SAFE_INTEGER) ||
        a.piano.title.localeCompare(b.piano.title)
    );
  return { total: entries.reduce((sum, held) => sum + held.amount, 0), entries };
};

/** "since 1 Sep" for a deposit received then, or nothing when no day is known. */
export const sinceText = (since: Date | null, today: Date = new Date()): string =>
  since ? `since ${dayText(since, today)}` : "";

/** "3 rentals", for the Deposits held row. */
export const rentalsText = (count: number) => `${count} ${count === 1 ? "rental" : "rentals"}`;

/** The line under a rented piano's Rental rows: "Deposit held since 1 Sep". Null with no deposit. */
export const depositHeldLine = (piano: PianoItem, today: Date = new Date()): string | null => {
  const held = heldDeposit(piano);
  if (!held) return null;
  return held.since ? `Deposit held ${sinceText(held.since, today)}` : "Deposit held";
};

/** What the Deposits held row says it is: "3 rentals · refundable, not income". */
export const heldSummary = (held: DepositsHeld) => `${rentalsText(held.entries.length)} · refundable, not income`;

/** The amount, as the rows write it: "₹9,000". */
export const depositText = (amount: number) => formatRupees(amount);

/**
 * Whether saving this Edit starts a new rental on the piano, carrying the old
 * rental's deposit along untouched: the rental is replaced or ended and the
 * deposit and the day it was received are as they were. The old deposit
 * belongs to the rental that is over (it is kept in its history as not
 * settled), so the new rental starts with none, unless the deposit was changed
 * in this edit.
 */
export const dropsOldDeposit = (
  before: PianoItem,
  after: PianoEntryInput,
  startsNewRental: boolean
): boolean => {
  if (!startsNewRental || depositAmount(before) <= 0) return false;
  const received = parseStoredDate(before.deposit_received_on);
  return (
    after.rental_deposit === depositAmount(before) &&
    (received ? toStoredDate(received) : null) === (after.deposit_received_on ?? null)
  );
};
