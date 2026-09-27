import { DEFAULT_FILTERS, SORT_BY_OPTIONS } from "@/app/constants/Piano";
import { FiltersType } from "@/redux/pianos/types";

/**
 * How many filters currently hide pianos from the list. Sorting by due date
 * counts too, because it only shows rentals.
 */
export const countActiveFilters = (filters: FiltersType) =>
  [
    filters.category !== "",
    filters.isActiveRentals,
    filters.sortBy === SORT_BY_OPTIONS.DUE_DATE,
  ].filter(Boolean).length;

/** Default filters and sort, keeping the chosen layout. */
export const clearFilters = (filters: FiltersType): FiltersType => ({
  ...DEFAULT_FILTERS,
  layoutStatus: filters.layoutStatus,
});
