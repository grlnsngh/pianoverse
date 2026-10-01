import { differenceInCalendarDays, format, startOfToday } from "date-fns";
import type { RentPayment } from "@/lib/appwrite";
import { PIANO_CATEGORY } from "@/constants/Piano";
import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate, StoredDate } from "@/utils/dates";
import { formatRupees } from "@/utils/money";
import { isSold } from "@/utils/pianoStatus";
import { ATTENTION_DAYS } from "@/utils/today";

// The messages the owner sends a renter: a reminder about the rental, and a
// receipt for a payment. They open in WhatsApp (or the share sheet) as plain
// text the owner can still change before sending. The words are all here, in
// English, so that another language is a change to this one file.

const clean = (value: string | null | undefined) => value?.trim() || "";

const dayOf = (value: StoredDate) => {
  const date = parseStoredDate(value);
  return date ? format(date, "d MMM yyyy") : null;
};

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

/** A rental that can be reminded: not sold, and with a number to message. */
export const canRemind = (piano: PianoItem) =>
  piano.category === PIANO_CATEGORY.RENTABLE &&
  !isSold(piano) &&
  !!clean(piano.rental_customer_mobile);

/** Worth sending now: the rental has ended or ends within the week Today watches. */
export const needsReminder = (piano: PianoItem, today = startOfToday()) => {
  if (!canRemind(piano)) return false;
  const end = parseStoredDate(piano.rental_period_end);
  return !!end && differenceInCalendarDays(end, today) <= ATTENTION_DAYS;
};

/**
 * The reminder for a rental, worded for where it is: ended, ending today,
 * ending soon, or still running.
 */
export const buildReminderMessage = (
  piano: PianoItem,
  today = startOfToday()
) => {
  const name = clean(piano.rental_customer_name);
  const title = clean(piano.title) || "the piano";
  const rent =
    piano.rental_price && piano.rental_price > 0
      ? `The rent is ${formatRupees(piano.rental_price)}.`
      : "";
  const end = parseStoredDate(piano.rental_period_end);
  const endDay = dayOf(piano.rental_period_end);
  const left = end ? differenceInCalendarDays(end, today) : null;

  const sentences: string[] = [];
  if (end && left !== null && left < 0) {
    sentences.push(`Your rental of ${title} ended on ${endDay}.`);
    if (rent) sentences.push(rent);
    sentences.push(
      "Please arrange the payment, or let us know if you would like to extend the rental."
    );
  } else if (left === 0) {
    sentences.push(`Your rental of ${title} ends today.`);
    if (rent) sentences.push(rent);
    sentences.push("Please let us know if you would like to extend it.");
  } else if (left !== null && left <= ATTENTION_DAYS) {
    sentences.push(
      `Your rental of ${title} ends on ${endDay} (in ${plural(left, "day")}).`
    );
    if (rent) sentences.push(rent);
    sentences.push("Please let us know if you would like to extend it.");
  } else {
    sentences.push(
      endDay
        ? `This is a note about your rental of ${title}, which runs until ${endDay}.`
        : `This is a note about your rental of ${title}.`
    );
    if (rent) sentences.push(rent);
  }

  return [
    `Hello${name ? ` ${name}` : ""},`,
    "",
    sentences.join(" "),
    "",
    "Thank you.",
  ].join("\n");
};

/** The receipt for one payment of a rented piano. */
export const buildReceiptMessage = (payment: RentPayment, piano: PianoItem) => {
  const name = clean(payment.customer_name);
  const paidOn = dayOf(payment.paid_on);
  const note = clean(payment.note);
  const title = clean(piano.title) || "the piano";

  const lines = [
    "Payment receipt",
    "",
    `Received ${formatRupees(payment.amount)}${name ? ` from ${name}` : ""}${
      paidOn ? ` on ${paidOn}` : ""
    }.`,
    `For the rent of ${title}.`,
  ];
  if (note) lines.push(`Note: ${note}`);
  lines.push("", "Thank you.");
  return lines.join("\n");
};

/**
 * The number a receipt can go straight to: the piano's renter, when the payment
 * was made by them. A payment from an earlier renter must not be sent to the
 * current one, so it gets null and is shared the usual way instead.
 */
export const receiptNumber = (payment: RentPayment, piano: PianoItem) => {
  const mobile = clean(piano.rental_customer_mobile);
  if (!mobile) return null;
  const paidBy = clean(payment.customer_name).toLowerCase();
  const renter = clean(piano.rental_customer_name).toLowerCase();
  return paidBy === renter ? mobile : null;
};
