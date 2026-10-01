import type { RentPayment } from "@/lib/appwrite";
import { PianoItem } from "@/redux/pianos/types";
import type { Customer } from "@/utils/customers";
import { toCSVText } from "@/utils/csvExport";
import { parseStoredDate, toStoredDate } from "@/utils/dates";

// The payments and customers as CSV, for a spreadsheet or an accountant. Unlike
// the piano list these are plain: amounts are bare numbers (no ₹ or commas) so a
// spreadsheet can add them up, and days are yyyy-MM-dd so they sort and parse.

/**
 * A spreadsheet reads a field that starts with = or @ (or a + or - that isn't
 * the start of a number, like a phone number's "+91") as a formula, which
 * could be made to do things. A text field like that gets a ' in front, so it
 * is shown as the text it is.
 */
export const asText = (value: string | null | undefined) => {
  const text = value?.trim() ?? "";
  return /^(=|@|[+-](?![\d\s.]))/.test(text) ? `'${text}` : text;
};

const day = (value: string | null | undefined) => {
  const parsed = parseStoredDate(value);
  return parsed ? toStoredDate(parsed) : "";
};

export const PAYMENT_HEADERS = ["Date paid", "Customer", "Piano", "Amount", "Note", "Recorded on"];

/**
 * The payments as CSV, the oldest first (the order of a ledger): the day it
 * was paid, who paid, for which piano, how much, the note, and the day it was
 * recorded in the app. The customer is the name saved with the payment, blank
 * for one recorded before names were saved.
 */
export const convertPaymentsToCSV = (payments: RentPayment[], pianos: PianoItem[]): string => {
  const titleOf = new Map(pianos.map((piano) => [piano.$id, piano.title]));
  const ordered = [...payments].sort(
    (a, b) =>
      day(a.paid_on).localeCompare(day(b.paid_on)) || a.$createdAt.localeCompare(b.$createdAt)
  );

  return toCSVText(
    PAYMENT_HEADERS,
    ordered.map((payment) => [
      day(payment.paid_on),
      asText(payment.customer_name),
      asText(titleOf.get(payment.piano_id)),
      payment.amount,
      asText(payment.note),
      day(payment.$createdAt),
    ])
  );
};

export const CUSTOMER_HEADERS = [
  "Customer",
  "Mobile",
  "Renting now",
  "Pianos",
  "Payments",
  "Total paid",
  "Last payment",
  "Earlier rentals",
];

/**
 * The customers as CSV, in the order the Customers screen shows them: who
 * rented, their number, whether they have a piano now, the pianos they paid for
 * or have (separated by "; "), how many payments and how much in all, the day
 * they last paid, and how many earlier rentals were kept.
 */
export const convertCustomersToCSV = (customers: Customer[]): string =>
  toCSVText(
    CUSTOMER_HEADERS,
    customers.map((customer) => [
      asText(customer.name),
      asText(customer.mobile),
      customer.renting ? "Yes" : "No",
      asText(customer.pianos.map((piano) => piano.title).join("; ")),
      customer.paymentsCount,
      customer.total,
      customer.lastPaidOn ? toStoredDate(customer.lastPaidOn) : "",
      customer.rentals.length,
    ])
  );
