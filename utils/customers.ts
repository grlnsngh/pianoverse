import { addDays, format } from "date-fns";
import type { RentalHistoryEntry, RentPayment } from "@/lib/appwrite";
import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate } from "@/utils/dates";
import { formatRupees } from "@/utils/money";
import { getPianoRentalState } from "@/utils/pianoStatus";

// Who has rented what, worked out from what is already recorded: the name saved
// with each rent payment (Q15), and the customer on a piano that is rented out
// now. Nothing here loads anything. A customer is a name: the same name in other
// capitals or with extra spaces is the same person, and two people with one name
// can't be told apart.

/** A name as a key: trimmed, one space between words, no capitals. Empty for no name. */
export const customerKey = (name: string | null | undefined) =>
  (name ?? "").trim().replace(/\s+/g, " ").toLowerCase();

const nameOf = (name: string | null | undefined) =>
  (name ?? "").trim().replace(/\s+/g, " ");

/** One piano a customer paid rent for, or has now. */
export interface CustomerPiano {
  pianoId: string;
  title: string;
  paymentsCount: number;
  total: number;
  /** The last day they paid for it, "yyyy-MM-dd", or null if they haven't yet */
  lastPaidOn: string | null;
  /** Whether they have it now (a rental that is running, or has ended and not been taken back) */
  renting: boolean;
}

export interface Customer {
  key: string;
  /** As it was written the last time */
  name: string;
  pianos: CustomerPiano[];
  paymentsCount: number;
  total: number;
  lastPaidOn: Date | null;
  /** The mobile number on a piano they have now, if there is one */
  mobile: string | null;
  renting: boolean;
  /** Their past rentals that were kept, the one that ended last first */
  rentals: RentalHistoryEntry[];
}

const dayOf = (value: string) => parseStoredDate(value);

/** Payments newest first: by the day paid, then by when it was recorded. */
const newestFirst = (payments: RentPayment[]) =>
  [...payments].sort(
    (a, b) =>
      (dayOf(b.paid_on)?.getTime() ?? 0) - (dayOf(a.paid_on)?.getTime() ?? 0) ||
      b.$createdAt.localeCompare(a.$createdAt)
  );

/**
 * Every customer: each name saved with a payment, and the name of whoever has a
 * piano rented out now. Customers who have a piano now come first, then the
 * rest by the day they last paid. A person who only appears in a kept rental
 * is a customer too. `unnamed` counts the payments recorded before names were
 * saved, which can't be put with anyone.
 */
export const buildCustomers = (
  payments: RentPayment[],
  pianos: PianoItem[],
  history: RentalHistoryEntry[] = []
): { customers: Customer[]; unnamed: number } => {
  const titleOf = new Map(
    pianos.map((piano) => [piano.$id, piano.title || "Untitled piano"])
  );
  const byKey = new Map<string, Customer>();
  let unnamed = 0;

  const customerFor = (key: string, name: string) => {
    let customer = byKey.get(key);
    if (!customer) {
      customer = {
        key,
        name,
        pianos: [],
        paymentsCount: 0,
        total: 0,
        lastPaidOn: null,
        mobile: null,
        renting: false,
        rentals: [],
      };
      byKey.set(key, customer);
    }
    return customer;
  };

  const pianoFor = (
    customer: Customer,
    pianoId: string,
    fallbackTitle?: string | null
  ) => {
    let entry = customer.pianos.find(
      (candidate) => candidate.pianoId === pianoId
    );
    if (!entry) {
      entry = {
        pianoId,
        title: titleOf.get(pianoId) ?? (fallbackTitle?.trim() || "A piano"),
        paymentsCount: 0,
        total: 0,
        lastPaidOn: null,
        renting: false,
      };
      customer.pianos.push(entry);
    }
    return entry;
  };

  // Newest first, so the first payment of a name is the spelling to show
  for (const payment of newestFirst(payments)) {
    const key = customerKey(payment.customer_name);
    if (!key) {
      unnamed += 1;
      continue;
    }
    const customer = customerFor(key, nameOf(payment.customer_name));
    const entry = pianoFor(customer, payment.piano_id);
    customer.paymentsCount += 1;
    customer.total += payment.amount;
    entry.paymentsCount += 1;
    entry.total += payment.amount;
    const paidOn = dayOf(payment.paid_on);
    if (paidOn && (!customer.lastPaidOn || paidOn > customer.lastPaidOn))
      customer.lastPaidOn = paidOn;
    if (!entry.lastPaidOn || payment.paid_on > entry.lastPaidOn)
      entry.lastPaidOn = payment.paid_on;
  }

  for (const piano of pianos) {
    const key = customerKey(piano.rental_customer_name);
    if (!key || getPianoRentalState(piano) === null) continue;
    const customer = customerFor(key, nameOf(piano.rental_customer_name));
    pianoFor(customer, piano.$id).renting = true;
    customer.renting = true;
    const mobile = piano.rental_customer_mobile?.trim();
    if (mobile && !customer.mobile) customer.mobile = mobile;
  }

  for (const entry of history) {
    const key = customerKey(entry.customer_name);
    if (!key) continue;
    const customer = customerFor(key, nameOf(entry.customer_name));
    customer.rentals.push(entry);
    pianoFor(customer, entry.piano_id, entry.piano_title);
  }
  for (const customer of byKey.values()) {
    customer.rentals.sort((a, b) => b.closed_on.localeCompare(a.closed_on));
  }

  const customers = [...byKey.values()].sort(
    (a, b) =>
      Number(b.renting) - Number(a.renting) ||
      (b.lastPaidOn?.getTime() ?? 0) - (a.lastPaidOn?.getTime() ?? 0) ||
      a.name.localeCompare(b.name)
  );
  for (const customer of customers) {
    // The pianos they have now first, then the one they paid for most recently
    customer.pianos.sort(
      (a, b) =>
        Number(b.renting) - Number(a.renting) ||
        (b.lastPaidOn ?? "").localeCompare(a.lastPaidOn ?? "") ||
        a.title.localeCompare(b.title)
    );
  }
  return { customers, unnamed };
};

/** A customer who rented a piano before, for the piano's page. */
export interface PastRenter {
  key: string;
  name: string;
  paymentsCount: number;
  total: number;
  firstPaidOn: Date | null;
  lastPaidOn: Date | null;
}

/**
 * The people who paid rent for this piano other than whoever has it now (all of
 * them, once it is sold or no longer rented out), the one who paid most
 * recently first. Payments with no name can't be said to be anyone's.
 */
export const pastRenters = (
  payments: RentPayment[],
  piano: PianoItem
): PastRenter[] => {
  const current =
    getPianoRentalState(piano) !== null
      ? customerKey(piano.rental_customer_name)
      : "";
  const byKey = new Map<string, PastRenter>();

  for (const payment of newestFirst(payments)) {
    if (payment.piano_id !== piano.$id) continue;
    const key = customerKey(payment.customer_name);
    if (!key || key === current) continue;
    const paidOn = dayOf(payment.paid_on);
    let renter = byKey.get(key);
    if (!renter) {
      renter = {
        key,
        name: nameOf(payment.customer_name),
        paymentsCount: 0,
        total: 0,
        firstPaidOn: paidOn,
        lastPaidOn: paidOn,
      };
      byKey.set(key, renter);
    }
    renter.paymentsCount += 1;
    renter.total += payment.amount;
    if (paidOn && (!renter.firstPaidOn || paidOn < renter.firstPaidOn))
      renter.firstPaidOn = paidOn;
    if (paidOn && (!renter.lastPaidOn || paidOn > renter.lastPaidOn))
      renter.lastPaidOn = paidOn;
  }

  return [...byKey.values()].sort(
    (a, b) =>
      (b.lastPaidOn?.getTime() ?? 0) - (a.lastPaidOn?.getTime() ?? 0) ||
      a.name.localeCompare(b.name)
  );
};

const count = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/** "3 payments" */
export const paymentsText = (n: number) => count(n, "payment", "payments");

/** "Mar 2026", or "Mar 2026 to Jun 2026", or "" when there are no dates. */
export const periodText = (first: Date | null, last: Date | null) => {
  if (!first || !last) return "";
  const from = format(first, "MMM yyyy");
  const to = format(last, "MMM yyyy");
  return from === to ? from : `${from} to ${to}`;
};

/** "12 Jan 2026 to 12 Apr 2026", "From 12 Jan 2026" or "Until 12 Apr 2026"; empty when there are no dates. */
export const rangeText = (start: Date | null, end: Date | null) => {
  const from = start ? format(start, "d MMM yyyy") : "";
  const to = end ? format(end, "d MMM yyyy") : "";
  if (from && to) return `${from} to ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return "";
};

/** The line under a past rental: its dates and rent, and what was paid; or just the payments for someone known only from them. */
export const pastRentalDetail = (rental: PastRental): string => {
  if (!rental.fromHistory) {
    return [paymentsText(rental.paymentsCount), periodText(rental.firstPaidOn, rental.lastPaidOn)]
      .filter(Boolean)
      .join(" · ");
  }
  return [
    rangeText(rental.startOn, rental.endOn),
    rental.price !== null ? `${formatRupees(rental.price)} rent` : "",
    rental.paymentsCount > 0 ? paymentsText(rental.paymentsCount) : "",
  ]
    .filter(Boolean)
    .join(" · ");
};

/** The line under a customer in the list: "Kawai K-300 · 3 payments", or the pianos when there are several. */
export const customerLine = (customer: Customer): string => {
  const pianos = customer.pianos.map((entry) => entry.title);
  const shown =
    pianos.length > 2
      ? `${pianos.slice(0, 2).join(", ")} and ${pianos.length - 2} more`
      : pianos.join(" and ");
  const paid =
    customer.paymentsCount > 0
      ? paymentsText(customer.paymentsCount)
      : "No payments yet";
  return [shown, paid].filter(Boolean).join(" · ");
};

/** One customer's payments, newest first. */
export const paymentsOfCustomer = (
  payments: RentPayment[],
  key: string
): RentPayment[] =>
  newestFirst(payments).filter(
    (payment) => customerKey(payment.customer_name) === key
  );

/** A rental that is over, for a piano's page: a kept rental, or someone who only appears in its payments. */
export interface PastRental {
  /** The kept rental's ID, or "payments-" and the customer's key */
  id: string;
  key: string;
  name: string;
  /** Whether it is a kept rental, with its own dates; otherwise it is known only from payments */
  fromHistory: boolean;
  startOn: Date | null;
  endOn: Date | null;
  /** The rent that was asked, per payment, when it ended */
  price: number | null;
  paymentsCount: number;
  total: number;
  firstPaidOn: Date | null;
  lastPaidOn: Date | null;
}

/** How long after a rental closed a payment for it is still counted as its payment. */
const LATE_PAYMENT_DAYS = 31;

/**
 * The rentals a piano has had, other than the one it has now: the ones that
 * were kept, the one that ended last first, then the people who paid rent for
 * it but have no kept rental (the history only starts when it is switched on).
 * A kept rental shows the payments made by that person from its start to a
 * month after it closed. A payment belongs to one rental only.
 */
export const pastRentals = (
  payments: RentPayment[],
  history: RentalHistoryEntry[],
  piano: PianoItem
): PastRental[] => {
  const rows = history
    .filter((entry) => entry.piano_id === piano.$id)
    .sort(
      (a, b) =>
        (dayOf(a.period_start ?? a.closed_on)?.getTime() ?? 0) -
        (dayOf(b.period_start ?? b.closed_on)?.getTime() ?? 0)
    );
  const mine = newestFirst(payments).filter(
    (payment) =>
      payment.piano_id === piano.$id &&
      customerKey(payment.customer_name) !== ""
  );
  const claimed = new Set<string>();

  const kept = rows.map((entry): PastRental => {
    const key = customerKey(entry.customer_name);
    const start = entry.period_start ? dayOf(entry.period_start) : null;
    const closed = dayOf(entry.closed_on);
    const until = closed ? addDays(closed, LATE_PAYMENT_DAYS) : null;
    const theirs = key
      ? mine.filter((payment) => {
          if (
            claimed.has(payment.$id) ||
            customerKey(payment.customer_name) !== key
          )
            return false;
          const paidOn = dayOf(payment.paid_on);
          if (!paidOn) return false;
          return (!start || paidOn >= start) && (!until || paidOn <= until);
        })
      : [];
    theirs.forEach((payment) => claimed.add(payment.$id));
    const days = theirs.map((payment) => dayOf(payment.paid_on) as Date);
    return {
      id: entry.$id,
      key,
      name: nameOf(entry.customer_name) || "Someone",
      fromHistory: true,
      startOn: start,
      endOn: entry.period_end ? dayOf(entry.period_end) : closed,
      price: typeof entry.price === "number" ? entry.price : null,
      paymentsCount: theirs.length,
      total: theirs.reduce((sum, payment) => sum + payment.amount, 0),
      firstPaidOn: days.length
        ? new Date(Math.min(...days.map((day) => day.getTime())))
        : null,
      lastPaidOn: days.length
        ? new Date(Math.max(...days.map((day) => day.getTime())))
        : null,
    };
  });
  kept.reverse();

  const paymentsOnly = pastRenters(
    mine.filter((payment) => !claimed.has(payment.$id)),
    piano
  ).map((renter): PastRental => ({
    id: `payments-${renter.key}`,
    key: renter.key,
    name: renter.name,
    fromHistory: false,
    startOn: null,
    endOn: null,
    price: null,
    paymentsCount: renter.paymentsCount,
    total: renter.total,
    firstPaidOn: renter.firstPaidOn,
    lastPaidOn: renter.lastPaidOn,
  }));

  return [...kept, ...paymentsOnly];
};
