import { SORT_BY_OPTIONS } from "@/constants/Piano";
import { FiltersType, PianoItem } from "@/redux/pianos/types";
import { isRentalActive, parseStoredDate } from "@/utils/dates";
import { isOverdue, isSold } from "@/utils/pianoStatus";

// Sorts by a key worked out once per piano, instead of parsing dates again
// on every comparison
const sortByKey = (
  items: PianoItem[],
  getKey: (item: PianoItem) => number,
  order: "asc" | "desc"
) => {
  const keys = new Map(items.map((item) => [item, getKey(item)]));
  const direction = order === "asc" ? 1 : -1;
  return [...items].sort((a, b) => direction * (keys.get(a)! - keys.get(b)!));
};

// Improved sorting function that handles numbers more intuitively
const smartSortTitles = (
  items: PianoItem[],
  ascending: boolean = true
): PianoItem[] => {
  return [...items].sort((a, b) => {
    const titleA = a.title || "";
    const titleB = b.title || "";

    // Extract leading numbers
    const numMatchA = titleA.match(/^(\d+)/);
    const numMatchB = titleB.match(/^(\d+)/);

    const numA = numMatchA ? parseFloat(numMatchA[1]) : null;
    const numB = numMatchB ? parseFloat(numMatchB[1]) : null;

    // If both have leading numbers, sort numerically
    if (numA !== null && numB !== null) {
      const numCompare = numA - numB;
      if (numCompare !== 0) return ascending ? numCompare : -numCompare;

      // If numbers are equal, compare the rest of the string
      const restA = titleA.replace(/^(\d+)/, "");
      const restB = titleB.replace(/^(\d+)/, "");
      return ascending ? restA.localeCompare(restB) : restB.localeCompare(restA);
    }

    // If only one has leading number, numbers come first
    if (numA !== null && numB === null) return ascending ? -1 : 1;
    if (numA === null && numB !== null) return ascending ? 1 : -1;

    // Both are text, use localeCompare
    return ascending ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
  });
};

/**
 * The pianos the Pianos tab shows for a set of filters: sold pianos only with
 * the Sold filter, sorted as chosen, then narrowed by category, active
 * rentals and overdue rentals. This is what the list has always done; it lives
 * here so the Filters sheet can count what a choice would show before it is
 * applied.
 */
export const applyPianoFilters = (
  pianos: PianoItem[],
  filters: FiltersType
): PianoItem[] => {
  // Sold pianos are no longer stock, so they only show with the Sold filter
  let filteredItems: PianoItem[] = pianos.filter(
    (item) => isSold(item) === filters.isSold
  );

  // Apply sorting first
  if (filters.sortBy) {
    switch (filters.sortBy) {
      case SORT_BY_OPTIONS.TITLE_ASC:
        filteredItems = smartSortTitles(filteredItems, true);
        break;
      case SORT_BY_OPTIONS.TITLE_DES:
        filteredItems = smartSortTitles(filteredItems, false);
        break;
      case SORT_BY_OPTIONS.LATEST_ADDED:
        filteredItems = sortByKey(
          filteredItems,
          (item) => new Date(item.$createdAt).getTime(),
          "desc"
        );
        break;
      case SORT_BY_OPTIONS.PURCHASE_DATE:
        filteredItems = sortByKey(
          filteredItems,
          (item) => parseStoredDate(item.date_of_purchase)?.getTime() ?? 0,
          "desc"
        );
        break;
      case SORT_BY_OPTIONS.DUE_DATE: {
        // Filter to only rentable items with rental_period_end, then sort by due date
        const rentableItemsWithDueDate = filteredItems.filter(
          (item) => item.category === "rentable" && item.rental_period_end
        );

        if (rentableItemsWithDueDate.length > 0) {
          // Replace the filtered items with sorted rentable items,
          // earliest due date first
          filteredItems = sortByKey(
            rentableItemsWithDueDate,
            (item) => parseStoredDate(item.rental_period_end)?.getTime() ?? 0,
            "asc"
          );
        } else {
          // If no rentable items with due dates, keep original items
          filteredItems = filteredItems.filter(
            (item) => item.category === "rentable"
          );
        }
        break;
      }
      default:
        console.warn("Unknown sort option:", filters.sortBy);
        break;
    }
  }

  // Apply category filter
  if (filters.category) {
    const formattedFilter = filters.category.replace(/\s+/g, "_").toLowerCase();

    filteredItems = filteredItems.filter(
      (item) => item.category.toLowerCase() === formattedFilter
    );
  }

  // Apply active rentals filter
  if (filters.isActiveRentals) {
    filteredItems = filteredItems.filter(
      (item) =>
        item.category === "rentable" && isRentalActive(item.rental_period_end)
    );
  }

  // Rentals that have ended but haven't been extended or returned
  if (filters.isOverdue) {
    filteredItems = filteredItems.filter(isOverdue);
  }

  return filteredItems;
};
