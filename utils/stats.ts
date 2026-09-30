import type { RentPayment } from "@/lib/appwrite";
import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate } from "@/utils/dates";
import { isSold } from "@/utils/pianoStatus";
import { isSameMonth } from "date-fns";

/** How many pianos were sold in the month of `month`, and for how much. */
export const salesInMonth = (pianos: PianoItem[], month = new Date()) => {
  const sold = pianos.filter((piano) => {
    const soldOn = isSold(piano) ? parseStoredDate(piano.sold_date) : null;
    return soldOn !== null && isSameMonth(soldOn, month);
  });
  return {
    count: sold.length,
    total: sold.reduce((total, piano) => total + (piano.sold_price ?? 0), 0),
  };
};

/** How many rent payments there are, and how much they add up to. */
export const totalReceived = (payments: Pick<RentPayment, "amount">[]) => ({
  count: payments.length,
  total: payments.reduce((total, payment) => total + payment.amount, 0),
});
