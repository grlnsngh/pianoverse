jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn() },
  usePathname: jest.fn(() => "/home"),
}));
jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);

import React from "react";
import { ReactTestRenderer } from "react-test-renderer";
import BulkOperationsBar from "@/components/BulkOperationsBar";
import CardItem from "@/components/CardItem";
import ListItem from "@/components/ListItem";
import { icons } from "@/constants";
import {
  selectAllItems,
  setBulkSelectionMode,
  setFilteredPianoListItems,
} from "@/redux/pianos/actions";
import { makePiano, testUser } from "./helpers/fixtures";
import { createTestStore, renderWithStore } from "./helpers/render";

const piano = makePiano();

const hasIcon = (renderer: ReactTestRenderer, name: string) =>
  renderer.root.findAll((node) => node.props.name === name).length > 0;

const showsImage = (renderer: ReactTestRenderer, source: unknown) =>
  renderer.root.findAll((node) => node.props.source === source).length > 0;

const row = (Component: any, extra: object, isSelected: boolean) =>
  renderWithStore(
    <Component
      item={piano}
      index={0}
      visibleMenuId={null}
      openMenu={jest.fn()}
      closeMenu={jest.fn()}
      isBulkSelectionMode
      isSelected={isSelected}
      {...extra}
    />,
    createTestStore({ user: testUser, items: [piano] })
  );

describe.each([
  ["list row", ListItem, {}],
  ["card", CardItem, {}],
  ["grid card", CardItem, { isGridView: true }],
])("a selected %s", (_name, Component, extra) => {
  it("is ticked, not crossed out", () => {
    const renderer = row(Component, extra, true);

    expect(hasIcon(renderer, "checkmark")).toBe(true);
    expect(showsImage(renderer, icons.close)).toBe(false);
  });

  it("has an empty box when it isn't selected", () => {
    const renderer = row(Component, extra, false);

    expect(hasIcon(renderer, "checkmark")).toBe(false);
  });
});

it("the selection bar's Select All button shows a double tick, not the grid icon", () => {
  const store = createTestStore({ user: testUser, items: [piano] });
  store.dispatch(setFilteredPianoListItems([piano, makePiano({ $id: "b" })]) as any);
  store.dispatch(setBulkSelectionMode(true) as any);
  store.dispatch(selectAllItems([]) as any);
  const renderer = renderWithStore(<BulkOperationsBar onRefresh={jest.fn()} />, store);

  const [selectAll] = renderer.root.findAll(
    (node) =>
      node.props.accessibilityLabel === "Select all pianos" &&
      typeof node.props.onPress === "function"
  );
  const inside = (name: string) =>
    selectAll.findAll((node) => node.props.name === name).length > 0;
  expect(inside("checkmark-done")).toBe(true);
  expect(
    selectAll.findAll((node) => node.props.source === icons.grid).length
  ).toBe(0);
});
