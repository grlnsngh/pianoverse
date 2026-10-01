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

// --- The Pianos tab's category tabs, sort link and layout toggle ---

/** The tabs above the list. `all` is no category filter. */
export type CategoryTab = "all" | "rentable" | "events" | "on_sale" | "warehouse";

const CATEGORY_TAB_FILTERS: Record<CategoryTab, string> = {
  all: "",
  rentable: "Rentable",
  events: "Events",
  on_sale: "On Sale",
  warehouse: "Warehouse",
};

/**
 * The tab a category filter corresponds to. The filter holds a label such as
 * "On Sale" (or the value "on_sale"); nothing matching means All.
 */
export const categoryTabOf = (filters: FiltersType): CategoryTab => {
  const normalised = filters.category.replace(/\s+/g, "_").toLowerCase();
  const tab = (Object.keys(CATEGORY_TAB_FILTERS) as CategoryTab[]).find(
    (key) => key !== "all" && key === normalised
  );
  return tab ?? "all";
};

/** The value to store in `filters.category` when a tab is chosen. */
export const categoryFilterOf = (tab: CategoryTab) => CATEGORY_TAB_FILTERS[tab];

/** The layouts of the list. The old "card" layout is a grid now. */
export type ListLayout = "grid" | "list";

export const layoutOf = (filters: FiltersType): ListLayout =>
  filters.layoutStatus.grid === "checked" ||
  filters.layoutStatus.card === "checked"
    ? "grid"
    : "list";

/** The filters with the layout changed. Every other choice stays. */
export const withLayout = (
  filters: FiltersType,
  layout: ListLayout
): FiltersType => ({
  ...filters,
  layoutStatus: {
    grid: layout === "grid" ? "checked" : "unchecked",
    list: layout === "list" ? "checked" : "unchecked",
    card: "unchecked",
  },
});

const SORT_LABELS: Record<string, string> = {
  [SORT_BY_OPTIONS.LATEST_ADDED]: "Latest added",
  [SORT_BY_OPTIONS.DUE_DATE]: "Due date",
  [SORT_BY_OPTIONS.PURCHASE_DATE]: "Purchase date",
  [SORT_BY_OPTIONS.TITLE_ASC]: "Title A to Z",
  [SORT_BY_OPTIONS.TITLE_DES]: "Title Z to A",
};

/** How the sort is named on the link above the list. */
export const sortLabelOf = (sortBy: string) =>
  SORT_LABELS[sortBy] ?? SORT_LABELS[SORT_BY_OPTIONS.LATEST_ADDED];
