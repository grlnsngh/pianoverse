jest.mock("@/lib/appwrite", () => ({
  getUserPianoEntries: jest.fn(),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({ user: require("./helpers/fixtures").testUser }),
}));
jest.mock("@/services/notifications", () => ({
  scheduleAllRentalNotifications: jest.fn(() => Promise.resolve([])),
  cancelRentalNotification: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn(), back: jest.fn() },
  usePathname: jest.fn(() => "/home"),
}));

import React from "react";
import { TextInput } from "react-native";
import { act } from "react-test-renderer";
import { router, usePathname } from "expo-router";
import Home from "@/app/(tabs)/home";
import SearchInput from "@/components/SearchInput";
import { DEFAULT_FILTERS } from "@/constants/Piano";
import { getUserPianoEntries } from "@/lib/appwrite";
import { setPianoFilters } from "@/redux/pianos/actions";
import { searchPianoItems } from "@/utils/ObjectManipulation";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  createTestStore,
  flushPromises,
  pressText,
  renderWithStore,
} from "./helpers/render";

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.mocked(usePathname).mockReturnValue("/home");
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("what search matches", () => {
  const rental = makePiano({
    $id: "rental",
    title: "Upright 1",
    make: "Kawai",
    category: "rentable",
    rental_customer_name: "Asha Mehta",
    rental_customer_mobile: "9876543210",
  });
  const event = makePiano({
    $id: "event",
    title: "Grand 2",
    make: "Steinway",
    category: "events",
    event_model_number: "Model D",
    event_b_number: "B-12/34",
  });
  const pianos = [rental, event];
  const search = (term: string) =>
    searchPianoItems(pianos, term).map((piano) => piano.$id);

  it.each([
    ["title", "grand", ["event"]],
    ["make", "kawai", ["rental"]],
    ["customer name", "mehta", ["rental"]],
    ["customer mobile", "98765", ["rental"]],
    ["model number", "model d", ["event"]],
    ["B-number", "b-12/34", ["event"]],
  ])("finds pianos by %s", (_field, term, expected) => {
    expect(search(term)).toEqual(expected);
  });

  it("ignores details left over from another category", () => {
    // Once a rental and an event piano, now both on sale
    const onSale = makePiano({
      $id: "on-sale",
      title: "Upright 3",
      make: "Yamaha",
      category: "on_sale",
      rental_customer_name: "Ravi Kumar",
      rental_customer_mobile: "9123456789",
      event_model_number: "Model X",
      event_b_number: "B-99",
    });
    const find = (term: string) =>
      searchPianoItems([onSale], term).map((piano) => piano.$id);

    expect(find("ravi")).toEqual([]);
    expect(find("91234")).toEqual([]);
    expect(find("model x")).toEqual([]);
    expect(find("b-99")).toEqual([]);
    expect(find("yamaha")).toEqual(["on-sale"]);
  });

  it("ignores surrounding spaces and finds nothing for an unknown term", () => {
    expect(search("  steinway  ")).toEqual(["event"]);
    expect(search("bösendorfer")).toEqual([]);
  });
});

describe("the search box", () => {
  const renderSearchInput = () => {
    const renderer = renderWithStore(<SearchInput />, createTestStore());
    const input = renderer.root.findByType(TextInput);
    return {
      type: (text: string) => act(() => input.props.onChangeText(text)),
      submit: () => act(() => input.props.onSubmitEditing()),
      input,
    };
  };

  it("searches when Enter is pressed on the keyboard", () => {
    const { input, type, submit } = renderSearchInput();
    expect(input.props.returnKeyType).toBe("search");

    type("  B-12/34 #2 ");
    submit();

    // The router encodes the query, so "/" and "#" can't break the route
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/search/[query]",
      params: { query: "B-12/34 #2" },
    });
  });

  it("updates the results in place when already searching", () => {
    jest.mocked(usePathname).mockReturnValue("/search/yamaha");
    const { type, submit } = renderSearchInput();

    type("kawai ");
    submit();

    expect(router.setParams).toHaveBeenCalledWith({ query: "kawai" });
    expect(router.push).not.toHaveBeenCalled();
  });

  it("asks for a search term instead of searching for spaces", () => {
    const alerts = captureAlerts();
    const { type, submit } = renderSearchInput();

    type("   ");
    submit();

    expect(alerts.titles()).toEqual(["Missing Query"]);
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("when the Home list is empty", () => {
  const renderHome = async (pianos = [makePiano()]) => {
    jest.mocked(getUserPianoEntries).mockResolvedValue(pianos as any);
    const store = createTestStore({ user: testUser });
    const renderer = renderWithStore(<Home />, store);
    await flushPromises();
    return { store, renderer };
  };

  it("says the filters hid everything and offers to clear them", async () => {
    const { store, renderer } = await renderHome();
    const layoutStatus = {
      card: "checked",
      list: "unchecked",
      grid: "unchecked",
    };
    act(() => {
      store.dispatch(
        setPianoFilters({
          ...DEFAULT_FILTERS,
          category: "events",
          layoutStatus,
        })
      );
    });
    await flushPromises();

    const texts = allTexts(renderer.root);
    expect(texts).toContain("No pianos match your filters");
    expect(texts).not.toContain("No pianos yet");

    await pressText(renderer.root, "Clear filters");

    expect(store.getState().pianos.filters).toEqual({
      ...DEFAULT_FILTERS,
      layoutStatus,
    });
    expect(store.getState().pianos.filteredItems).toHaveLength(1);
  });

  it("offers to add the first piano when there are none", async () => {
    const { renderer } = await renderHome([]);

    expect(allTexts(renderer.root)).toContain("No pianos yet");

    await pressText(renderer.root, "Add your first piano");

    // Adding a piano is a screen of its own now, not a tab
    expect(router.push).toHaveBeenCalledWith("/create");
  });

  it("shows grey placeholders, not 'No pianos yet', while the pianos load, but only after 200 ms", async () => {
    jest
      .mocked(getUserPianoEntries)
      .mockReturnValue(new Promise(() => {}) as any);
    const renderer = renderWithStore(
      <Home />,
      createTestStore({ user: testUser })
    );
    await flushPromises();
    const skeletons = () =>
      renderer.root.findAll(
        (node: any) => node.props.testID === "pianos-skeleton"
      ).length;

    // A quick load never flashes a placeholder
    expect(skeletons()).toBe(0);
    expect(allTexts(renderer.root)).not.toContain("No pianos yet");

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 260));
    });

    expect(skeletons()).toBeGreaterThan(0);
    expect(allTexts(renderer.root)).not.toContain("No pianos yet");
  });

  it("offers to try again when the pianos couldn't load", async () => {
    const alerts = captureAlerts();
    jest
      .mocked(getUserPianoEntries)
      .mockRejectedValueOnce(new Error("Network request failed"))
      .mockResolvedValueOnce([makePiano()] as any);
    const store = createTestStore({ user: testUser });
    const renderer = renderWithStore(<Home />, store);
    await flushPromises();

    expect(alerts.titles()).toEqual(["Error"]);
    const texts = allTexts(renderer.root);
    expect(texts).toContain("Couldn’t load your pianos");
    expect(texts).not.toContain("No pianos yet");

    await pressText(renderer.root, "Try again");

    expect(store.getState().pianos.items).toHaveLength(1);
  });
});
