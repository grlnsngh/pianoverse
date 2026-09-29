import { DEFAULT_FILTERS, SORT_BY_OPTIONS } from "@/constants/Piano";
import { FiltersType } from "@/redux/pianos/types";

/**
 * How many filters currently narrow the list. Sorting by due date counts too,
 * because it only shows rentals, and so does showing sold pianos (instead of
 * the ones in stock).
 */
export const countActiveFilters = (filters: FiltersType) =>
  [
    filters.category !== "",
    filters.isActiveRentals,
    filters.isOverdue,
    filters.sortBy === SORT_BY_OPTIONS.DUE_DATE,
    filters.isSold,
  ].filter(Boolean).length;

/** Default filters and sort, keeping the chosen layout. */
export const clearFilters = (filters: FiltersType): FiltersType => ({
  ...DEFAULT_FILTERS,
  layoutStatus: filters.layoutStatus,
});
