import { categoryOptions, PIANO_CATEGORY } from "@/constants/Piano";
import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate } from "./dates";

/**
 * Formats a date to a more readable format including the day of the week.
 *
 * @param {Date | string | undefined | null} dateInput - The date input to format.
 * @returns {string} - The formatted date string, or "N/A" if the input is undefined or null.
 */
export const formatDate = (
  dateInput: Date | string | undefined | null
): string => {
  const date = parseStoredDate(dateInput);
  if (!date) return "N/A";

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Searches an array of PianoItems based on a search input.
 * @param items - The array of PianoItems to search.
 * @param searchInput - Matched against the title, make, a rental's customer
 *   name and mobile, and an event piano's model number and B-number (not
 *   details left from when a piano was in another category).
 * @returns An array of PianoItems that match the search input.
 */
export const searchPianoItems = (
  items: PianoItem[],
  searchInput: string
): PianoItem[] => {
  const term = searchInput.trim().toLowerCase();
  if (term === "") {
    return items;
  }
  return items.filter((item) =>
    [
      item.title,
      item.make,
      ...(item.category === PIANO_CATEGORY.RENTABLE
        ? [item.rental_customer_name, item.rental_customer_mobile]
        : []),
      ...(item.category === PIANO_CATEGORY.EVENTS
        ? [item.event_model_number, item.event_b_number]
        : []),
    ].some(
      (field) => field != null && String(field).toLowerCase().includes(term)
    )
  );
};

/**
 * Retrieves the label for a given category value.
 *
 * @param {string} categoryValue - The value of the category to find the label for.
 * @returns {string} The label corresponding to the category value, or "Unknown Category" if not found.
 */
export const getCategoryLabel = (categoryValue: string | undefined): string => {
  const category = categoryOptions.find(
    (option) => option.value === categoryValue
  );
  return category ? category.label : "Unknown Category";
};
