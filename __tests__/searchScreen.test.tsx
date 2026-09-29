jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ query: "Yamaha" })),
  useNavigation: jest.fn(() => ({ setOptions: jest.fn() })),
  usePathname: jest.fn(() => "/search/Yamaha"),
}));
// Render results as plain titles; the real cards are covered elsewhere.
jest.mock("@/components/ListItem", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ item }: any) => React.createElement(Text, null, item.title);
});
jest.mock("@/components/CardItem", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ item }: any) => React.createElement(Text, null, item.title);
});

import React from "react";
import { act } from "react-test-renderer";
import { useLocalSearchParams } from "expo-router";
import Search from "@/app/search/[query]";
import { setPianoListItems } from "@/redux/pianos/actions";
import { makePiano } from "./helpers/fixtures";
import { allTexts, createTestStore, renderWithStore } from "./helpers/render";

const yamaha = makePiano({ $id: "yamaha", title: "Yamaha U1" });
const youngChang = makePiano({ $id: "young-chang", title: "Young Chang G-157" });
const kawai = makePiano({ $id: "kawai", title: "Kawai K-300" });

it("matches the whole search term, not just its first letter", () => {
  const store = createTestStore({ items: [yamaha, youngChang, kawai] });

  const renderer = renderWithStore(<Search />, store);

  expect(allTexts(renderer.root)).toEqual(["Yamaha U1"]);
});

it("matches search terms case-insensitively", () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ query: "k-300" });
  const store = createTestStore({ items: [yamaha, youngChang, kawai] });

  const renderer = renderWithStore(<Search />, store);

  expect(allTexts(renderer.root)).toEqual(["Kawai K-300"]);
});

it("drops a piano from the results once it is removed from the list", () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ query: "Yamaha" });
  const store = createTestStore({ items: [yamaha, youngChang, kawai] });
  const renderer = renderWithStore(<Search />, store);

  act(() => {
    store.dispatch(setPianoListItems([youngChang, kawai]));
  });

  expect(allTexts(renderer.root)).not.toContain("Yamaha U1");
});
