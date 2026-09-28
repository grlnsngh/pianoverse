import { categoryOptions } from "@/app/constants/Piano";
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
 * @param searchInput - Matched against the title, make, customer name and
 *   mobile, model number and B-number.
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
      item.rental_customer_name,
      item.rental_customer_mobile,
      item.event_model_number,
      item.event_b_number,
    ].some(
      (field) => field != null && String(field).toLowerCase().includes(term)
    )
  );
};

/**
 * Formats a date string into a localized date and time string.
 * @param dateString - The date string to format.
 * @returns The formatted date and time string.
 */
export const formatDateString = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-US", {
    weekday: "short", // "Mon"
    year: "numeric", // "2023"
    month: "short", // "Oct"
    day: "numeric", // "2"
    hour: "numeric", // "10"
    minute: "numeric", // "30"
    second: "numeric", // "15"
    hour12: true, // "AM/PM"
  });
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
