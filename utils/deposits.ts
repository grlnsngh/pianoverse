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

// --- The refund, when the piano comes back ---

/** What the person has decided so far in the Mark as returned sheet. */
export interface RefundInput {
  /** The deposit held */
  held: number;
  /** The rent the renter still owes */
  rentOwed: number;
  /** Whether to keep what is owed out of the deposit */
  keepRent: boolean;
  /** Charges for damage, kept out of the deposit */
  damage: number;
  /** A refund the person typed, when they agreed something else; null to follow the sums */
  refund: number | null;
}

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

/**
 * What the deposit comes to when the piano comes back, by the owner's own
 * clause: the deposit less any unpaid rent and any charges for damage. The
 * refund is that, unless the person typed another one (never more than was
 * held); what is not refunded is kept. The rent kept is never more than what
 * was kept, so an agreed refund bigger than the sums records less as rent.
 */
export const settleDeposit = (input: RefundInput): Settlement => {
  const held = Math.max(0, input.held);
  const rentKept = input.keepRent ? Math.min(Math.max(0, input.rentOwed), held) : 0;
  const damageKept = Math.min(Math.max(0, input.damage), held - rentKept);
  const suggested = held - rentKept - damageKept;
  const refund = input.refund === null ? suggested : Math.min(held, Math.max(0, input.refund));
  const kept = held - refund;
  const forRent = Math.min(rentKept, kept);
  const forDamage = Math.min(damageKept, kept - forRent);
  const reasons = [forRent > 0 ? "unpaid rent" : "", forDamage > 0 ? "damage" : ""].filter(Boolean);
  return {
    held: cents(held),
    refund: cents(refund),
    kept: cents(kept),
    forRent: cents(forRent),
    forDamage: cents(forDamage),
    note: reasons.length > 0 ? reasons.join(" and ") : null,
  };
};

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
