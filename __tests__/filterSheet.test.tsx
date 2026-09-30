import React from "react";
import { Pressable } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { act, ReactTestRenderer } from "react-test-renderer";
import FilterSheet from "@/components/FilterSheet";
import { DEFAULT_FILTERS, SORT_BY_OPTIONS } from "@/constants/Piano";
import { setPianoFilters } from "@/redux/pianos/actions";
import { makePiano } from "./helpers/fixtures";
import { allTexts, createTestStore, renderWithStore } from "./helpers/render";
import { advance } from "./helpers/ui";

const withSafeArea = (children: React.ReactNode) => (
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 47, left: 0, right: 0, bottom: 34 },
    }}
  >
    {children}
  </SafeAreaProvider>
);

const warehouse = makePiano({ $id: "a", title: "A Warehouse", category: "warehouse" });
const active = makePiano({
  $id: "b",
  title: "B Active",
  category: "rentable",
  rental_period_end: "2099-01-01" as any,
});
const overdue = makePiano({
  $id: "c",
  title: "C Overdue",
  category: "rentable",
  rental_period_end: "2020-01-01" as any,
});
const sold = makePiano({ $id: "d", title: "D Sold", sold_date: "2026-08-01" as any });
const pianos = [warehouse, active, overdue, sold];

let setOpen: (open: boolean) => void = () => {};
const onClose = jest.fn();

const Harness = () => {
  const [open, set] = React.useState(true);
  setOpen = set;
  return (
    <FilterSheet
      visible={open}
      onClose={() => {
        onClose();
        set(false);
      }}
    />
  );
};

const render = (filters = DEFAULT_FILTERS) => {
  const store = createTestStore({ items: pianos });
  act(() => {
    store.dispatch(setPianoFilters(filters));
  });
  const renderer = renderWithStore(withSafeArea(<Harness />), store);
  return { store, renderer };
};

const byLabel = (renderer: ReactTestRenderer, label: string) => {
  const [node] = renderer.root.findAll(
    (candidate) =>
      candidate.props.accessibilityLabel === label &&
      typeof candidate.props.onPress === "function"
  );
  if (!node) throw new Error(`Nothing labelled "${label}"`);
  return node;
};
const press = (renderer: ReactTestRenderer, label: string) =>
  act(() => byLabel(renderer, label).props.onPress());
const has = (renderer: ReactTestRenderer, label: string) =>
  renderer.root.findAll(
    (candidate) =>
      candidate.props.accessibilityLabel === label &&
      typeof candidate.props.onPress === "function"
  ).length > 0;
const isOn = (renderer: ReactTestRenderer, label: string) =>
  byLabel(renderer, label).props.accessibilityState.checked;
const flip = (renderer: ReactTestRenderer, label: string) => press(renderer, label);
const showButton = (renderer: ReactTestRenderer) =>
  renderer.root
    .findAllByType(Pressable)
    .find((node) => /^Show \d+ pianos?$/.test(node.props.accessibilityLabel ?? ""))!;

beforeEach(() => {
  jest.useFakeTimers();
  onClose.mockClear();
});
afterEach(() => {
  jest.useRealTimers();
});

describe("the Filters sheet", () => {
  it("shows nothing until it is opened", () => {
    const store = createTestStore({ items: pianos });
    const renderer = renderWithStore(
      withSafeArea(<FilterSheet visible={false} onClose={() => {}} />),
      store
    );

    expect(allTexts(renderer.root)).toEqual([]);
  });

  it("has a title, a Reset button, the sort and the three switches with their hints", () => {
    const { renderer } = render();

    expect(allTexts(renderer.root)).toEqual(
      expect.arrayContaining([
        "Filters",
        "Reset",
        "Sort by",
        "Latest added",
        "Show",
        "Active rentals",
        "Rentals that have not ended",
        "Overdue only",
        "Ended and not renewed",
        "Sold pianos",
        "Show only pianos that were sold",
      ])
    );
  });

  it("has no category or layout choices: the tabs and the toggle do that", () => {
    const { renderer } = render();
    const texts = allTexts(renderer.root);

    for (const gone of ["Category", "Layout", "Rentable", "Events", "Warehouse"]) {
      expect(texts).not.toContain(gone);
    }
  });

  it("starts from the filters in use", () => {
    const { renderer } = render({ ...DEFAULT_FILTERS, isOverdue: true, sortBy: SORT_BY_OPTIONS.TITLE_ASC });

    expect(isOn(renderer, "Overdue only")).toBe(true);
    expect(isOn(renderer, "Active rentals")).toBe(false);
    expect(allTexts(renderer.root)).toContain("Title A to Z");
  });

  it("says how many pianos the choices would show, and follows them", () => {
    const { renderer } = render();
    // Everything not sold: the warehouse piano and the two rentals
    expect(showButton(renderer).props.accessibilityLabel).toBe("Show 3 pianos");

    flip(renderer, "Overdue only");
    expect(showButton(renderer).props.accessibilityLabel).toBe("Show 1 piano");

    flip(renderer, "Overdue only");
    flip(renderer, "Sold pianos");
    expect(showButton(renderer).props.accessibilityLabel).toBe("Show 1 piano");

    flip(renderer, "Active rentals");
    flip(renderer, "Sold pianos");
    expect(showButton(renderer).props.accessibilityLabel).toBe("Show 1 piano");
  });

  it("counts the category the tabs have chosen", () => {
    const { renderer } = render({ ...DEFAULT_FILTERS, category: "Warehouse" });

    expect(showButton(renderer).props.accessibilityLabel).toBe("Show 1 piano");
  });

  it("can say it would show none", () => {
    const { renderer } = render({ ...DEFAULT_FILTERS, category: "events" });

    expect(showButton(renderer).props.accessibilityLabel).toBe("Show 0 pianos");
  });

  it("has a 52 px orange button as its one action", () => {
    const { renderer } = render();
    const style = showButton(renderer).props.style({ pressed: false });

    expect(style).toEqual(
      expect.arrayContaining([expect.objectContaining({ height: 52, backgroundColor: "#FF9C01" })])
    );
  });
});

describe("applying and closing", () => {
  it("applies the choices with Show, and closes", () => {
    const { store, renderer } = render();

    flip(renderer, "Sold pianos");
    act(() => showButton(renderer).props.onPress());

    expect(store.getState().pianos.filters).toEqual({ ...DEFAULT_FILTERS, isSold: true });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the layout and the category when it applies", () => {
    const list = { grid: "unchecked", list: "checked", card: "unchecked" };
    const { store, renderer } = render({ ...DEFAULT_FILTERS, category: "Events", layoutStatus: list });

    flip(renderer, "Overdue only");
    act(() => showButton(renderer).props.onPress());

    expect(store.getState().pianos.filters).toEqual({
      ...DEFAULT_FILTERS,
      category: "Events",
      layoutStatus: list,
      isOverdue: true,
    });
  });

  it("drops the choices when it is closed by tapping outside", () => {
    const { store, renderer } = render();

    flip(renderer, "Sold pianos");
    press(renderer, "Close");

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(store.getState().pianos.filters).toEqual(DEFAULT_FILTERS);
  });

  it("starts again from the filters in use when it is opened again", () => {
    const { renderer } = render();
    flip(renderer, "Sold pianos");
    press(renderer, "Close");
    advance(400);

    act(() => setOpen(true));

    expect(isOn(renderer, "Sold pianos")).toBe(false);
  });

  it("follows the filters if they change while it is open", () => {
    const { store, renderer } = render();

    act(() => {
      store.dispatch(setPianoFilters({ ...DEFAULT_FILTERS, isOverdue: true }));
    });

    expect(isOn(renderer, "Overdue only")).toBe(true);
  });
});

describe("Reset", () => {
  it("clears the choices without closing or applying, keeping the layout", () => {
    const list = { grid: "unchecked", list: "checked", card: "unchecked" };
    const filters = {
      ...DEFAULT_FILTERS,
      category: "Rentable",
      isOverdue: true,
      sortBy: SORT_BY_OPTIONS.TITLE_DES,
      layoutStatus: list,
    };
    const { store, renderer } = render(filters);

    press(renderer, "Reset");

    expect(isOn(renderer, "Overdue only")).toBe(false);
    expect(allTexts(renderer.root)).toContain("Latest added");
    expect(showButton(renderer).props.accessibilityLabel).toBe("Show 3 pianos");
    expect(onClose).not.toHaveBeenCalled();
    expect(store.getState().pianos.filters).toEqual(filters);

    act(() => showButton(renderer).props.onPress());
    expect(store.getState().pianos.filters).toEqual({ ...DEFAULT_FILTERS, layoutStatus: list });
  });
});

describe("the switches", () => {
  it("are switches that say what they do and whether they are on", () => {
    const { renderer } = render({ ...DEFAULT_FILTERS, isSold: true });

    for (const label of ["Active rentals", "Overdue only", "Sold pianos"]) {
      expect(byLabel(renderer, label).props.accessibilityRole).toBe("switch");
    }
    expect(isOn(renderer, "Sold pianos")).toBe(true);
    expect(isOn(renderer, "Active rentals")).toBe(false);
  });

  it("choose Rentable when Active rentals is turned on, and turn Overdue off", () => {
    const { store, renderer } = render({ ...DEFAULT_FILTERS, isOverdue: true });

    flip(renderer, "Active rentals");
    expect(isOn(renderer, "Active rentals")).toBe(true);
    expect(isOn(renderer, "Overdue only")).toBe(false);
    act(() => showButton(renderer).props.onPress());

    expect(store.getState().pianos.filters).toMatchObject({
      category: "Rentable",
      isActiveRentals: true,
      isOverdue: false,
    });
  });

  it("leave the category alone when Active rentals is turned off again", () => {
    const { store, renderer } = render({ ...DEFAULT_FILTERS, category: "Rentable", isActiveRentals: true });

    flip(renderer, "Active rentals");
    act(() => showButton(renderer).props.onPress());

    expect(store.getState().pianos.filters).toEqual({ ...DEFAULT_FILTERS, category: "Rentable" });
  });

  it("turn Active rentals off when Overdue only is turned on", () => {
    const { renderer } = render({ ...DEFAULT_FILTERS, category: "Rentable", isActiveRentals: true });

    flip(renderer, "Overdue only");

    expect(isOn(renderer, "Overdue only")).toBe(true);
    expect(isOn(renderer, "Active rentals")).toBe(false);
  });
});

describe("Sort by", () => {
  // Each Pressable is two nodes with the same props, so keep one of each
  const optionLabels = (renderer: ReactTestRenderer) => [
    ...new Set(
      renderer.root
        .findAll(
          (node) =>
            node.props.accessibilityRole === "radio" &&
            typeof node.props.onPress === "function"
        )
        .map((node) => node.props.accessibilityLabel)
    ),
  ];

  it("opens a list of the five sorts, with the one in use chosen", () => {
    const { renderer } = render();
    expect(optionLabels(renderer)).toEqual([]);

    press(renderer, "Sort by, Latest added");

    expect(optionLabels(renderer)).toEqual([
      "Latest added",
      "Due date",
      "Purchase date",
      "Title A to Z",
      "Title Z to A",
    ]);
    expect(byLabel(renderer, "Latest added").props.accessibilityState.selected).toBe(true);
    expect(byLabel(renderer, "Due date").props.accessibilityState.selected).toBe(false);
  });

  it("changes the sort, closes the list and shows the new name", () => {
    const { store, renderer } = render();
    press(renderer, "Sort by, Latest added");

    press(renderer, "Title A to Z");
    advance(400);

    expect(optionLabels(renderer)).toEqual([]);
    expect(has(renderer, "Sort by, Title A to Z")).toBe(true);
    // Nothing is applied until Show
    expect(store.getState().pianos.filters.sortBy).toBe(SORT_BY_OPTIONS.LATEST_ADDED);
    act(() => showButton(renderer).props.onPress());
    expect(store.getState().pianos.filters.sortBy).toBe(SORT_BY_OPTIONS.TITLE_ASC);
  });

  it("chooses Rentable when sorting by due date, which only shows rentals", () => {
    const { store, renderer } = render();
    press(renderer, "Sort by, Latest added");

    press(renderer, "Due date");
    act(() => showButton(renderer).props.onPress());

    expect(store.getState().pianos.filters).toMatchObject({
      sortBy: SORT_BY_OPTIONS.DUE_DATE,
      category: "Rentable",
    });
  });

  it("leaves the category alone for the other sorts", () => {
    const { store, renderer } = render({ ...DEFAULT_FILTERS, category: "Events" });
    press(renderer, "Sort by, Latest added");

    press(renderer, "Purchase date");
    act(() => showButton(renderer).props.onPress());

    expect(store.getState().pianos.filters.category).toBe("Events");
  });

  it("can be left with Cancel, changing nothing", () => {
    const { renderer } = render();
    press(renderer, "Sort by, Latest added");

    // The list's own Cancel is the second one (the Filters sheet has Reset)
    const cancels = renderer.root.findAll(
      (node) => node.props.accessibilityLabel === "Cancel" && typeof node.props.onPress === "function"
    );
    act(() => cancels[0].props.onPress());
    advance(400);

    expect(optionLabels(renderer)).toEqual([]);
    expect(has(renderer, "Sort by, Latest added")).toBe(true);
  });
});
