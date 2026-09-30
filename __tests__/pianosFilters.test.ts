import { DEFAULT_FILTERS, SORT_BY_OPTIONS } from "@/constants/Piano";
import {
  categoryFilterOf,
  categoryTabOf,
  CategoryTab,
  clearFilters,
  layoutOf,
  sortLabelOf,
  withLayout,
} from "@/utils/filters";

const withCategory = (category: string) => ({ ...DEFAULT_FILTERS, category });
const layout = (grid: string, list: string, card: string) => ({
  ...DEFAULT_FILTERS,
  layoutStatus: { grid, list, card },
});

describe("the category tabs", () => {
  it("show All when no category is chosen", () => {
    expect(categoryTabOf(withCategory(""))).toBe("all");
  });

  it.each([
    ["Rentable", "rentable"],
    ["rentable", "rentable"],
    ["Events", "events"],
    ["events", "events"],
    ["On Sale", "on_sale"],
    ["on_sale", "on_sale"],
    ["Warehouse", "warehouse"],
    ["warehouse", "warehouse"],
  ])("show the tab for the category %j", (category, tab) => {
    expect(categoryTabOf(withCategory(category))).toBe(tab);
  });

  it("show All for a category nothing matches", () => {
    expect(categoryTabOf(withCategory("Pianola"))).toBe("all");
  });

  it("store the same labels the filter panel does", () => {
    expect(categoryFilterOf("all")).toBe("");
    expect(categoryFilterOf("rentable")).toBe("Rentable");
    expect(categoryFilterOf("events")).toBe("Events");
    expect(categoryFilterOf("on_sale")).toBe("On Sale");
    expect(categoryFilterOf("warehouse")).toBe("Warehouse");
  });

  it("come back to the same tab after being stored", () => {
    for (const tab of ["all", "rentable", "events", "on_sale", "warehouse"] as CategoryTab[]) {
      expect(categoryTabOf(withCategory(categoryFilterOf(tab)))).toBe(tab);
    }
  });
});

describe("the layout", () => {
  it("opens as the photo grid", () => {
    expect(layoutOf(DEFAULT_FILTERS)).toBe("grid");
  });

  it("is a grid or a list as chosen", () => {
    expect(layoutOf(layout("checked", "unchecked", "unchecked"))).toBe("grid");
    expect(layoutOf(layout("unchecked", "checked", "unchecked"))).toBe("list");
  });

  it("treats the old card layout as the grid", () => {
    expect(layoutOf(layout("unchecked", "unchecked", "checked"))).toBe("grid");
  });

  it("is a list when nothing at all is chosen", () => {
    expect(layoutOf(layout("unchecked", "unchecked", "unchecked"))).toBe("list");
  });

  it("changes without touching any other filter, and never leaves card chosen", () => {
    const busy = {
      ...layout("unchecked", "unchecked", "checked"),
      category: "Events",
      sortBy: SORT_BY_OPTIONS.TITLE_ASC,
      isOverdue: true,
    };

    expect(withLayout(busy, "list")).toEqual({
      ...busy,
      layoutStatus: { grid: "unchecked", list: "checked", card: "unchecked" },
    });
    expect(withLayout(busy, "grid").layoutStatus).toEqual({
      grid: "checked",
      list: "unchecked",
      card: "unchecked",
    });
  });

  it("stays what it was when the filters are cleared", () => {
    const list = withLayout(DEFAULT_FILTERS, "list");

    expect(clearFilters({ ...list, category: "Events", isOverdue: true })).toEqual(list);
  });
});

describe("the sort link", () => {
  it.each([
    [SORT_BY_OPTIONS.LATEST_ADDED, "Latest added"],
    [SORT_BY_OPTIONS.DUE_DATE, "Due date"],
    [SORT_BY_OPTIONS.PURCHASE_DATE, "Purchase date"],
    [SORT_BY_OPTIONS.TITLE_ASC, "Title A to Z"],
    [SORT_BY_OPTIONS.TITLE_DES, "Title Z to A"],
  ])("names %j as %j", (sortBy, label) => {
    expect(sortLabelOf(sortBy)).toBe(label);
  });

  it("falls back to the default sort's name for one it doesn't know", () => {
    expect(sortLabelOf("Colour")).toBe("Latest added");
    expect(sortLabelOf("")).toBe("Latest added");
  });
});
