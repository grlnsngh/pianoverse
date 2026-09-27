import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate } from "@/utils/dates";
import { isCurrentlyRented, isSold } from "@/utils/pianoStatus";
import { isSameMonth } from "date-fns";

/** The rent prices of the pianos rented out right now, added up. */
export const rentFromActiveRentals = (pianos: PianoItem[]) =>
  pianos
    .filter(isCurrentlyRented)
    .reduce((total, piano) => total + (piano.rental_price ?? 0), 0);

/** How many pianos were sold in the month of `month`, and for how much. */
export const salesInMonth = (pianos: PianoItem[], month = new Date()) => {
  const sold = pianos.filter((piano) => {
    const soldOn = isSold(piano) ? parseStoredDate(piano.sold_date) : null;
    return soldOn !== null && isSameMonth(soldOn, month);
  });
  return {
    count: sold.length,
    // Sale prices are stored as text
    total: sold.reduce(
      (total, piano) => total + (Number(piano.sold_price) || 0),
      0
    ),
  };
};
