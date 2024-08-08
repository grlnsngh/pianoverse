import { categoryOptions } from "@/app/constants/Piano";
import { PianoItem } from "@/redux/pianos/types";

/**
 * Finds and returns the label for a given category value.
 *
 * @param {string | undefined} category - The category value to find the label for.
 * @returns {string} - The label of the category, or "Unknown Category" if not found.
 */
export const printCategoryLabel = (category: string | undefined): string => {
  const option = categoryOptions.find((option) => option.value === category);
  if (option) {
    return option.label;
  } else {
    return "Unknown Category";
  }
};

/**
 * Formats a date to a more readable format including the day of the week.
 *
 * @param {Date | string | undefined | null} dateInput - The date input to format.
 * @returns {string} - The formatted date string, or "N/A" if the input is undefined or null.
 */
export const formatDate = (
  dateInput: Date | string | undefined | null
): string => {
  if (!dateInput) return "N/A";

  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;

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
 * @param searchInput - The search input to match against the PianoItem titles.
 * @returns An array of PianoItems that match the search input.
 */
export const searchPianoItems = (
  items: PianoItem[],
  searchInput: string
): PianoItem[] => {
  const trimmedInput = searchInput.trim();
  if (trimmedInput === "") {
    return items;
  }
  return items.filter((item) =>
    item.title.toLowerCase().includes(trimmedInput.toLowerCase())
  );
};
