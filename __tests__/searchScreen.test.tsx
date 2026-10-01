jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
}));

import React from "react";
import { StyleSheet, TextInput } from "react-native";
import { act } from "react-test-renderer";
import { router, useLocalSearchParams } from "expo-router";
import Search from "@/app/search/[query]";
import { DEFAULT_FILTERS } from "@/constants/Piano";
import { fonts } from "@/constants/theme";
import { setPianoFilters, setPianoListItems } from "@/redux/pianos/actions";
import { makePiano } from "./helpers/fixtures";
import { allTexts, createTestStore, queryAllByText, renderWithStore } from "./helpers/render";

type Renderer = ReturnType<typeof renderWithStore>;

const LIST = {
  ...DEFAULT_FILTERS,
  layoutStatus: { grid: "unchecked", list: "checked", card: "unchecked" },
};

const yamaha = makePiano({ $id: "yamaha", title: "Yamaha U1", make: "Yamaha" });
const youngChang = makePiano({
  $id: "young-chang",
  title: "Young Chang G-157",
  make: "Young Chang",
  company_associated: "The Piano Services",
});
const kawai = makePiano({ $id: "kawai", title: "Kawai K-300", make: "Kawai" });
const all = [yamaha, youngChang, kawai];
const TITLES = all.map((piano) => piano.title);

const open = (query?: string, items = all) => {
  jest.mocked(useLocalSearchParams).mockReturnValue(query === undefined ? {} : { query });
  const store = createTestStore({ items });
  const renderer = renderWithStore(<Search />, store);
  return { store, renderer };
};

const box = (renderer: Renderer) => renderer.root.findByType(TextInput);
const type = (renderer: Renderer, text: string) =>
  act(() => box(renderer).props.onChangeText(text));
const byLabel = (renderer: Renderer, label: string) =>
  renderer.root.findAll(
    (node: any) =>
      node.props.accessibilityLabel === label && typeof node.props.onPress === "function"
  )[0];
const press = (renderer: Renderer, label: string) => {
  const node = byLabel(renderer, label);
  if (!node) throw new Error(`No control labelled "${label}"`);
  act(() => node.props.onPress());
};
const shownTitles = (renderer: Renderer) =>
  allTexts(renderer.root).filter((text) => TITLES.includes(text));
const has = (renderer: Renderer, text: string) => allTexts(renderer.root).includes(text);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(router.canGoBack).mockReturnValue(true);
});

describe("the field and what it lists", () => {
  it("opens with every piano listed and the keyboard up", () => {
    const { renderer } = open();

    expect(shownTitles(renderer)).toEqual(TITLES);
    expect(has(renderer, "3 pianos")).toBe(true);
    expect(box(renderer).props.autoFocus).toBe(true);
    expect(box(renderer).props.returnKeyType).toBe("search");
  });

  it("starts from the words in the link, without opening the keyboard", () => {
    const { renderer } = open("Yamaha");

    expect(box(renderer).props.value).toBe("Yamaha");
    expect(box(renderer).props.autoFocus).toBe(false);
    expect(shownTitles(renderer)).toEqual(["Yamaha U1"]);
  });

  it("narrows the list as you type, and counts what is left", () => {
    const { renderer } = open();

    type(renderer, "y");
    expect(shownTitles(renderer)).toEqual(["Yamaha U1", "Young Chang G-157"]);
    expect(has(renderer, "2 results")).toBe(true);

    type(renderer, "yam");
    expect(shownTitles(renderer)).toEqual(["Yamaha U1"]);
    expect(has(renderer, "1 result")).toBe(true);
  });

  it("matches the whole term, not just its first letter, whatever the case", () => {
    const { renderer } = open("k-300");

    expect(shownTitles(renderer)).toEqual(["Kawai K-300"]);
  });

  it("ignores spaces around the words, and lists everything for spaces alone", () => {
    const { renderer } = open();

    type(renderer, "  kawai ");
    expect(shownTitles(renderer)).toEqual(["Kawai K-300"]);

    type(renderer, "   ");
    expect(shownTitles(renderer)).toEqual(TITLES);
    expect(has(renderer, "3 pianos")).toBe(true);
  });

  it("looks at the title and make, not the company", () => {
    // Whether it should is an open question (docs/redesign/QUESTIONS.md)
    const { renderer } = open();

    type(renderer, "piano services");

    expect(shownTitles(renderer)).toEqual([]);
  });

  it("says what it searches, under the results", () => {
    const { renderer } = open();

    expect(has(renderer, "Searches title and make, a rental’s customer name or mobile number, and an event’s model or B-number.")).toBe(true);
  });

  it("drops a piano from the results once it is removed from the list", () => {
    const { store, renderer } = open("Yamaha");

    act(() => {
      store.dispatch(setPianoListItems([youngChang, kawai]));
    });

    expect(shownTitles(renderer)).toEqual([]);
  });
});

describe("marking what matched", () => {
  const bold = (renderer: Renderer, text: string) =>
    renderer.root
      .findAll((node: any) => node.type === "Text" && node.children.join("") === text)
      .map((node: any) => StyleSheet.flatten(node.props.style)?.fontFamily);

  it("makes the letters that matched bold in the title", () => {
    const { renderer } = open();

    type(renderer, "yam");

    expect(bold(renderer, "Yam")).toEqual([fonts.bold]);
    expect(has(renderer, "Yamaha U1")).toBe(true);
  });

  it("makes them bold in the company line too, without changing its words", () => {
    const { renderer } = open();

    type(renderer, "chang");

    expect(bold(renderer, "Chang")).toEqual([fonts.bold]);
    expect(has(renderer, "The Piano Services")).toBe(true);
  });

  it("marks nothing before anything is typed: the title has no pieces inside it", () => {
    const { renderer } = open();

    const [title] = queryAllByText(renderer.root, "Yamaha U1");
    expect(title.findAll((node: any) => node.type === "Text" && node !== title)).toEqual([]);
  });
});

describe("clearing and leaving", () => {
  it("shows the clear button only while something is typed, and empties the field", () => {
    const { renderer } = open();
    expect(byLabel(renderer, "Clear search")).toBeUndefined();

    type(renderer, "kawai");
    expect(byLabel(renderer, "Clear search")).toBeDefined();

    press(renderer, "Clear search");

    expect(box(renderer).props.value).toBe("");
    expect(shownTitles(renderer)).toEqual(TITLES);
    expect(byLabel(renderer, "Clear search")).toBeUndefined();
  });

  it("goes back to the Pianos tab on Cancel", () => {
    const { renderer } = open();

    press(renderer, "Cancel");

    expect(router.back).toHaveBeenCalled();
  });

  it("goes to the Pianos tab on Cancel when opened from a link, with nothing to go back to", () => {
    jest.mocked(router.canGoBack).mockReturnValue(false);
    const { renderer } = open("kawai");

    press(renderer, "Cancel");

    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/home");
  });
});

describe("when nothing matches", () => {
  it("says so, with the words that were typed, and offers to clear them", () => {
    const { renderer } = open();

    type(renderer, "steinway");

    expect(has(renderer, "No pianos match “steinway”")).toBe(true);
    expect(has(renderer, "Check the spelling, or try a make or a customer’s name.")).toBe(true);
    expect(shownTitles(renderer)).toEqual([]);
    // No count and no hint under an empty list
    expect(allTexts(renderer.root).some((text) => /^\d+ results?$/.test(text))).toBe(false);
    expect(allTexts(renderer.root).some((text) => text.startsWith("Searches title"))).toBe(false);
  });

  it("brings every piano back on Clear search", () => {
    const { renderer } = open();
    type(renderer, "steinway");

    press(renderer, "Clear search");

    expect(box(renderer).props.value).toBe("");
    expect(shownTitles(renderer)).toEqual(TITLES);
  });

  it("says there are no pianos yet, rather than nothing matching, when there are none", () => {
    const { renderer } = open(undefined, []);

    expect(has(renderer, "No pianos yet")).toBe(true);
    expect(byLabel(renderer, "Clear search")).toBeUndefined();
  });
});

describe("the results", () => {
  const cardLabel = (title: string) => (node: any) =>
    typeof node.props.accessibilityLabel === "string" &&
    node.props.accessibilityLabel.startsWith(`${title},`) &&
    typeof node.props.onPress === "function";

  it("opens a piano's page when it is pressed", () => {
    const { renderer } = open();

    act(() => renderer.root.findAll(cardLabel("Kawai K-300"))[0].props.onPress());

    expect(router.push).toHaveBeenCalledWith("/detail/kawai");
  });

  it("can't be long-pressed into choosing pianos: that is for the Pianos tab", () => {
    const { renderer } = open();

    expect(renderer.root.findAll(cardLabel("Kawai K-300"))[0].props.onLongPress).toBeUndefined();
  });

  const cards = (renderer: Renderer) =>
    renderer.root.findAll(
      (node: any) => typeof node.type === "string" && node.props.testID === "category-icon"
    );

  it("uses the Pianos tab's photo grid, by default", () => {
    const { renderer } = open();

    expect(cards(renderer)).toHaveLength(3);
  });

  it("uses its compact list when the Pianos tab is on the list", () => {
    const { store, renderer } = open();

    act(() => {
      store.dispatch(setPianoFilters(LIST));
    });

    expect(cards(renderer)).toHaveLength(0);
    expect(has(renderer, "Warehouse · The Piano Services")).toBe(true);
    expect(shownTitles(renderer)).toEqual(TITLES);
  });
});
