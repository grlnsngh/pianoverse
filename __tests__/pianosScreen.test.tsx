jest.mock("@/lib/appwrite", () => ({
  getUserPianoEntries: jest.fn(),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({ user: require("./helpers/fixtures").testUser }),
}));
jest.mock("@/services/notifications", () => ({
  scheduleAllRentalNotifications: jest.fn(() => Promise.resolve([])),
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn() },
  usePathname: jest.fn(() => "/home"),
}));

import React from "react";
import { FlatList, Pressable } from "react-native";
import { act } from "react-test-renderer";
import { router } from "expo-router";
import Home from "@/app/(tabs)/home";
import { DEFAULT_FILTERS, SORT_BY_OPTIONS } from "@/constants/Piano";
import { getUserPianoEntries } from "@/lib/appwrite";
import { savePianosToCache } from "@/lib/pianoCache";
import { setPianoFilters } from "@/redux/pianos/actions";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  createTestStore,
  flushPromises,
  pressText,
  renderWithStore,
} from "./helpers/render";

type Renderer = ReturnType<typeof renderWithStore>;

const rental = makePiano({
  $id: "weber",
  title: "Weber W-121",
  category: "rentable",
  company_associated: "RS Music Center",
  rental_price: 5000,
  rental_period_end: "2099-01-01" as any,
  $createdAt: "2026-09-04T10:00:00.000+00:00",
});
const events = makePiano({
  $id: "estonia",
  title: "Estonia 190 Grand",
  category: "events",
  company_associated: "Shamshersons",
  event_purchase_price: 780000,
  $createdAt: "2026-09-03T10:00:00.000+00:00",
});
const forSale = makePiano({
  $id: "rameau",
  title: "Rameau Upright",
  category: "on_sale",
  company_associated: "Kirpalsons",
  on_sale_price: 115000,
  $createdAt: "2026-09-02T10:00:00.000+00:00",
});
const stored = makePiano({
  $id: "ronish",
  title: "Ronish R-112",
  category: "warehouse",
  company_associated: "The Piano Services",
  $createdAt: "2026-09-01T10:00:00.000+00:00",
});
const all = [rental, events, forSale, stored];

const renderHome = async (pianos: any[] = all) => {
  jest.mocked(getUserPianoEntries).mockResolvedValue(pianos as any);
  const store = createTestStore({ user: testUser });
  const renderer = renderWithStore(<Home />, store);
  await flushPromises();
  return { store, renderer };
};

const byLabel = (renderer: Renderer, label: string) =>
  renderer.root.findAll(
    (node: any) =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === "function"
  )[0];
const press = (renderer: Renderer, label: string) => {
  const node = byLabel(renderer, label);
  if (!node) throw new Error(`No control labelled "${label}"`);
  act(() => node.props.onPress());
};
const has = (renderer: Renderer, label: string) => !!byLabel(renderer, label);
const tabs = (renderer: Renderer) =>
  renderer.root
    .findAllByType(Pressable)
    .filter((node: any) => node.props.accessibilityRole === "tab");
const selectedTabs = (renderer: Renderer) =>
  tabs(renderer)
    .filter((node: any) => node.props.accessibilityState.selected)
    .map((node: any) => node.props.accessibilityLabel);
const titles = (renderer: Renderer) => {
  const wanted = all.map((piano) => piano.title);
  return allTexts(renderer.root).filter((text) => wanted.includes(text));
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe("the header", () => {
  it("has the search pill, the round filter button and the orange +", async () => {
    const { renderer } = await renderHome();

    expect(has(renderer, "Search pianos")).toBe(true);
    expect(has(renderer, "Filters")).toBe(true);
    expect(has(renderer, "Add piano")).toBe(true);
  });

  it("opens the search screen from the pill", async () => {
    const { renderer } = await renderHome();

    press(renderer, "Search pianos");

    expect(router.push).toHaveBeenCalledWith("/search");
  });

  it("opens the Add screen from the +", async () => {
    const { renderer } = await renderHome();

    press(renderer, "Add piano");

    expect(router.push).toHaveBeenCalledWith("/create");
  });

  it("opens the filter panel from the round button, and from the sort link", async () => {
    const { renderer } = await renderHome();
    expect(allTexts(renderer.root)).not.toContain("Reset");

    press(renderer, "Filters");
    expect(allTexts(renderer.root)).toEqual(
      expect.arrayContaining(["Reset", "Sort by", "Show 4 pianos"])
    );
  });

  it("opens the same panel from the sort link", async () => {
    const { renderer } = await renderHome();

    press(renderer, "Sort by Latest added");

    expect(allTexts(renderer.root)).toEqual(
      expect.arrayContaining(["Reset", "Sort by", "Show 4 pianos"])
    );
  });

  it("says how many filters are on, on the filter button", async () => {
    const { store, renderer } = await renderHome();
    expect(has(renderer, "Filters")).toBe(true);

    act(() => {
      store.dispatch(setPianoFilters({ ...DEFAULT_FILTERS, isOverdue: true }));
    });

    expect(has(renderer, "Filters, 1 active")).toBe(true);

    act(() => {
      store.dispatch(
        setPianoFilters({
          ...DEFAULT_FILTERS,
          category: "rentable",
          sortBy: SORT_BY_OPTIONS.DUE_DATE,
          isActiveRentals: true,
        })
      );
    });
    expect(has(renderer, "Filters, 3 active")).toBe(true);

    // Sorting alone doesn't hide anything
    act(() => {
      store.dispatch(
        setPianoFilters({ ...DEFAULT_FILTERS, sortBy: SORT_BY_OPTIONS.TITLE_ASC })
      );
    });
    expect(has(renderer, "Filters")).toBe(true);
  });
});

describe("the category tabs", () => {
  it("are All, Rentable, Events, On sale and Warehouse, with All chosen", async () => {
    const { renderer } = await renderHome();

    expect(tabs(renderer).map((node: any) => node.props.accessibilityLabel)).toEqual([
      "All",
      "Rentable",
      "Events",
      "On sale",
      "Warehouse",
    ]);
    expect(selectedTabs(renderer)).toEqual(["All"]);
    expect(titles(renderer)).toHaveLength(4);
  });

  it("show only that category when one is pressed", async () => {
    const { store, renderer } = await renderHome();

    press(renderer, "Events");

    expect(store.getState().pianos.filters.category).toBe("Events");
    expect(selectedTabs(renderer)).toEqual(["Events"]);
    expect(titles(renderer)).toEqual(["Estonia 190 Grand"]);
  });

  it("store On sale the way the filter panel does", async () => {
    const { store, renderer } = await renderHome();

    press(renderer, "On sale");

    expect(store.getState().pianos.filters.category).toBe("On Sale");
    expect(titles(renderer)).toEqual(["Rameau Upright"]);
  });

  it("go back to every piano with All", async () => {
    const { store, renderer } = await renderHome();
    press(renderer, "Warehouse");
    expect(titles(renderer)).toEqual(["Ronish R-112"]);

    press(renderer, "All");

    expect(store.getState().pianos.filters.category).toBe("");
    expect(titles(renderer)).toHaveLength(4);
  });

  it("follow a category chosen in the filter panel", async () => {
    const { store, renderer } = await renderHome();

    act(() => {
      store.dispatch(setPianoFilters({ ...DEFAULT_FILTERS, category: "rentable" }));
    });

    expect(selectedTabs(renderer)).toEqual(["Rentable"]);
  });

  it("keep the layout and the other filters when a category is chosen", async () => {
    const { store, renderer } = await renderHome();
    act(() => {
      store.dispatch(
        setPianoFilters({ ...DEFAULT_FILTERS, sortBy: SORT_BY_OPTIONS.TITLE_ASC, isOverdue: false })
      );
    });

    press(renderer, "Events");

    expect(store.getState().pianos.filters).toMatchObject({
      category: "Events",
      sortBy: SORT_BY_OPTIONS.TITLE_ASC,
    });
    expect(store.getState().pianos.filters.layoutStatus).toEqual(DEFAULT_FILTERS.layoutStatus);
  });

  it("leave only Rentable open while sorting by due date, as the filter panel did", async () => {
    const { store, renderer } = await renderHome();

    act(() => {
      store.dispatch(setPianoFilters({ ...DEFAULT_FILTERS, sortBy: SORT_BY_OPTIONS.DUE_DATE }));
    });

    const state = Object.fromEntries(
      tabs(renderer).map((node: any) => [
        node.props.accessibilityLabel,
        node.props.accessibilityState.disabled,
      ])
    );
    expect(state).toEqual({
      All: true,
      Rentable: false,
      Events: true,
      "On sale": true,
      Warehouse: true,
    });
  });
});

describe("the category tabs while only rentals can be shown", () => {
  it("leave only Rentable open while showing only active rentals", async () => {
    const { store, renderer } = await renderHome();

    act(() => {
      store.dispatch(
        setPianoFilters({ ...DEFAULT_FILTERS, category: "Rentable", isActiveRentals: true })
      );
    });

    const disabled = tabs(renderer)
      .filter((node: any) => node.props.accessibilityState.disabled)
      .map((node: any) => node.props.accessibilityLabel);
    expect(disabled).toEqual(["All", "Events", "On sale", "Warehouse"]);
  });

  it("open every tab again when overdue is chosen instead", async () => {
    const { store, renderer } = await renderHome();

    act(() => {
      store.dispatch(setPianoFilters({ ...DEFAULT_FILTERS, isOverdue: true }));
    });

    expect(
      tabs(renderer).filter((node: any) => node.props.accessibilityState.disabled)
    ).toHaveLength(0);
  });
});

describe("the count, the sort link and the layout", () => {
  it("counts the pianos shown", async () => {
    const { renderer } = await renderHome();
    expect(allTexts(renderer.root)).toContain("4 pianos");

    press(renderer, "Rentable");
    expect(allTexts(renderer.root)).toContain("1 piano");
  });

  it("says No pianos when the filters hide them all", async () => {
    const { store, renderer } = await renderHome([rental]);

    act(() => {
      store.dispatch(setPianoFilters({ ...DEFAULT_FILTERS, category: "events" }));
    });

    expect(allTexts(renderer.root)).toContain("No pianos");
  });

  it("names the sort on the link, and follows it", async () => {
    const { store, renderer } = await renderHome();
    expect(allTexts(renderer.root)).toContain("Latest added");

    act(() => {
      store.dispatch(setPianoFilters({ ...DEFAULT_FILTERS, sortBy: SORT_BY_OPTIONS.TITLE_ASC }));
    });

    expect(allTexts(renderer.root)).toContain("Title A to Z");
  });

  it("opens as the photo grid, with a button to show it as a list", async () => {
    const { store, renderer } = await renderHome();
    const list = renderer.root.findByType(FlatList);

    expect(list.props.numColumns).toBe(2);
    expect(has(renderer, "Show as list")).toBe(true);
    expect(store.getState().pianos.filters.layoutStatus.grid).toBe("checked");
  });

  it("switches between the grid and the list, keeping every other filter", async () => {
    const { store, renderer } = await renderHome();
    press(renderer, "Events");

    press(renderer, "Show as list");
    expect(renderer.root.findByType(FlatList).props.numColumns).toBe(1);
    expect(has(renderer, "Show as grid")).toBe(true);
    expect(store.getState().pianos.filters).toMatchObject({
      category: "Events",
      layoutStatus: { grid: "unchecked", list: "checked", card: "unchecked" },
    });
    expect(titles(renderer)).toEqual(["Estonia 190 Grand"]);

    press(renderer, "Show as grid");
    expect(renderer.root.findByType(FlatList).props.numColumns).toBe(2);
  });

  it("shows the old card layout as the grid", async () => {
    const { store, renderer } = await renderHome();

    act(() => {
      store.dispatch(
        setPianoFilters({
          ...DEFAULT_FILTERS,
          layoutStatus: { grid: "unchecked", list: "unchecked", card: "checked" },
        })
      );
    });

    expect(renderer.root.findByType(FlatList).props.numColumns).toBe(2);
    expect(has(renderer, "Show as list")).toBe(true);
  });

  it("draws a photo card per piano in the grid and a row per piano in the list", async () => {
    const { renderer } = await renderHome();
    const cards = () =>
      renderer.root.findAll(
        (node: any) =>
          typeof node.type === "string" && node.props.testID === "category-icon"
      );

    expect(cards()).toHaveLength(4);
    expect(allTexts(renderer.root)).toContain("₹7,80,000");

    press(renderer, "Show as list");
    // Rows say the category in words, cards say it with an icon
    expect(cards()).toHaveLength(0);
    expect(allTexts(renderer.root)).toContain("Events · Shamshersons");
  });
});

describe("opening and choosing pianos", () => {
  const cardFor = (renderer: Renderer, title: string) =>
    renderer.root.findAll(
      (node: any) =>
        typeof node.props.accessibilityLabel === "string" &&
        node.props.accessibilityLabel.startsWith(`${title},`) &&
        typeof node.props.onPress === "function"
    )[0];

  it("opens a piano's page when its card is pressed", async () => {
    const { renderer } = await renderHome();

    act(() => cardFor(renderer, "Estonia 190 Grand").props.onPress());

    expect(router.push).toHaveBeenCalledWith("/detail/estonia");
  });

  it("starts choosing pianos on a long press, with that piano chosen", async () => {
    const { store, renderer } = await renderHome();

    act(() => cardFor(renderer, "Rameau Upright").props.onLongPress());

    expect(store.getState().pianos.isBulkSelectionMode).toBe(true);
    expect(store.getState().pianos.selectedItems).toEqual(["rameau"]);
    // Every card now shows a circle to choose it with
    expect(
      renderer.root.findAll(
        (node: any) =>
          typeof node.type === "string" && node.props.testID === "selection-mark"
      )
    ).toHaveLength(4);
  });

  it("chooses and unchooses with a press while choosing, instead of opening", async () => {
    const { store, renderer } = await renderHome();
    act(() => cardFor(renderer, "Rameau Upright").props.onLongPress());

    act(() => cardFor(renderer, "Estonia 190 Grand").props.onPress());
    expect(store.getState().pianos.selectedItems.sort()).toEqual(["estonia", "rameau"]);
    expect(router.push).not.toHaveBeenCalled();

    act(() => cardFor(renderer, "Rameau Upright").props.onPress());
    expect(store.getState().pianos.selectedItems).toEqual(["estonia"]);
  });
});

describe("what the screen says when there is nothing to show", () => {
  it("offers to add the first piano when there are none, with no tabs or filters", async () => {
    const { renderer } = await renderHome([]);

    expect(allTexts(renderer.root)).toEqual(
      expect.arrayContaining([
        "No pianos yet",
        "Add your first piano to start tracking rentals, payments and sales.",
        "Add your first piano",
      ])
    );
    expect(tabs(renderer)).toHaveLength(0);
    expect(has(renderer, "Filters")).toBe(false);
    // The search pill and the + are still there
    expect(has(renderer, "Search pianos")).toBe(true);
    expect(has(renderer, "Add piano")).toBe(true);
    expect(allTexts(renderer.root).some((text) => /pianos?$/.test(text) && /^\d/.test(text))).toBe(false);
  });

  it("opens the Add screen from that button", async () => {
    const { renderer } = await renderHome([]);

    await pressText(renderer.root, "Add your first piano");

    expect(router.push).toHaveBeenCalledWith("/create");
  });

  it("says it couldn't load, with no tabs, and tries again", async () => {
    captureAlerts();
    jest
      .mocked(getUserPianoEntries)
      .mockRejectedValueOnce(new Error("Network request failed"))
      .mockResolvedValueOnce([rental] as any);
    const store = createTestStore({ user: testUser });
    const renderer = renderWithStore(<Home />, store);
    await flushPromises();

    expect(allTexts(renderer.root)).toEqual(
      expect.arrayContaining(["Couldn’t load your pianos", "Check your connection and try again.", "Try again"])
    );
    expect(tabs(renderer)).toHaveLength(0);

    await pressText(renderer.root, "Try again");

    expect(store.getState().pianos.items).toHaveLength(1);
    expect(tabs(renderer)).toHaveLength(5);
  });

  it("keeps the tabs and the count when the filters hide everything, and offers to clear them", async () => {
    const { store, renderer } = await renderHome([rental]);

    press(renderer, "Events");

    expect(allTexts(renderer.root)).toEqual(
      expect.arrayContaining(["No pianos match your filters", "Clear filters", "No pianos"])
    );
    expect(tabs(renderer)).toHaveLength(5);

    await pressText(renderer.root, "Clear filters");

    expect(store.getState().pianos.filters.category).toBe("");
    expect(titles(renderer)).toEqual(["Weber W-121"]);
  });

  it("says nothing is in stock when every piano is sold", async () => {
    const sold = makePiano({ $id: "s", title: "Sold one", sold_date: "2026-09-01" as any });
    const { renderer } = await renderHome([sold]);

    expect(allTexts(renderer.root)).toEqual(
      expect.arrayContaining(["No pianos in stock", "Add a piano"])
    );
    await pressText(renderer.root, "Add a piano");
    expect(router.push).toHaveBeenCalledWith("/create");
  });
});

describe("the strips above the list", () => {
  it("says the list is a saved copy when offline, and how old it is", async () => {
    captureAlerts();
    await savePianosToCache(testUser.accountId, [rental]);
    jest.mocked(getUserPianoEntries).mockRejectedValue(new Error("Network request failed"));
    const store = createTestStore({ user: testUser });
    const renderer = renderWithStore(<Home />, store);
    await flushPromises();

    const text = allTexts(renderer.root).join(" ");
    expect(text).toMatch(/Offline\. Showing pianos saved on \d+ \w+, \d+:\d+ [ap]m\./);
    expect(titles(renderer)).toEqual(["Weber W-121"]);
  });

  it("has no offline strip when the pianos loaded", async () => {
    const { renderer } = await renderHome();

    expect(allTexts(renderer.root).join(" ")).not.toMatch(/Offline/);
  });

  it("points out overdue rentals, and shows them from the strip", async () => {
    const late = makePiano({
      $id: "late",
      title: "Late one",
      category: "rentable",
      rental_period_end: "2020-01-01" as any,
    });
    const { store, renderer } = await renderHome([late, stored]);
    expect(allTexts(renderer.root)).toEqual(expect.arrayContaining(["1 rental is overdue", "View"]));

    await pressText(renderer.root, "1 rental is overdue");

    expect(store.getState().pianos.filters.isOverdue).toBe(true);
    // The strip goes once the list is showing them
    expect(allTexts(renderer.root)).not.toContain("1 rental is overdue");
  });
});

describe("the page", () => {
  it("still pulls down to refresh", async () => {
    const { renderer } = await renderHome();

    expect(renderer.root.findByType(FlatList).props.refreshControl).toBeTruthy();
  });

  it("no longer has the welcome line or the old logo", async () => {
    const { renderer } = await renderHome();

    expect(allTexts(renderer.root)).not.toContain("Welcome Back");
    expect(allTexts(renderer.root)).not.toContain(testUser.username);
  });

  it("has no menu on each card: Edit and Delete are on the piano's own page", async () => {
    const { renderer } = await renderHome();

    expect(has(renderer, "Edit")).toBe(false);
    expect(allTexts(renderer.root)).not.toContain("Delete");
  });
});
