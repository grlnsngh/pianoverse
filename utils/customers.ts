import { format } from "date-fns";
import type { RentPayment } from "@/lib/appwrite";
import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate } from "@/utils/dates";
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
 * rest by the day they last paid. `unnamed` counts the payments recorded before
 * names were saved, which can't be put with anyone.
 */
export const buildCustomers = (
  payments: RentPayment[],
  pianos: PianoItem[]
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
      };
      byKey.set(key, customer);
    }
    return customer;
  };

  const pianoFor = (customer: Customer, pianoId: string) => {
    let entry = customer.pianos.find(
      (candidate) => candidate.pianoId === pianoId
    );
    if (!entry) {
      entry = {
        pianoId,
        title: titleOf.get(pianoId) ?? "A piano",
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
