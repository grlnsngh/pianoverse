jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn() },
  usePathname: jest.fn(() => "/home"),
}));
jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule(),
);

import React from "react";
import { act } from "react-test-renderer";
import BulkOperationsBar from "@/components/BulkOperationsBar";
import SelectionHeader from "@/components/SelectionHeader";
import {
  selectAllItems,
  setBulkSelectionMode,
  setFilteredPianoListItems,
  toggleItemSelection,
} from "@/redux/pianos/actions";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  createTestStore,
  pressText,
  renderWithStore,
} from "./helpers/render";

const pianos = ["a", "b", "c"].map((id) =>
  makePiano({ $id: id, title: `Piano ${id}` }),
);

const setUp = (selected: string[]) => {
  const store = createTestStore({ user: testUser, items: pianos });
  act(() => {
    store.dispatch(setFilteredPianoListItems(pianos) as any);
    store.dispatch(setBulkSelectionMode(true) as any);
    if (selected.length) store.dispatch(selectAllItems(selected) as any);
  });
  return store;
};

const selectedIds = (store: ReturnType<typeof setUp>) =>
  store.getState().pianos.selectedItems;

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
});

describe("the bar at the top while choosing pianos", () => {
  it("says how many are chosen", () => {
    const store = setUp(["a", "b"]);
    const renderer = renderWithStore(<SelectionHeader />, store);
    expect(allTexts(renderer.root)).toContain("2 selected");

    act(() => {
      store.dispatch(toggleItemSelection("c") as any);
    });
    expect(allTexts(renderer.root)).toContain("3 selected");
  });

  it("Cancel clears the choice and leaves selection mode", async () => {
    const store = setUp(["a"]);
    const renderer = renderWithStore(<SelectionHeader />, store);

    await pressText(renderer.root, "Cancel");

    expect(selectedIds(store)).toEqual([]);
    expect(store.getState().pianos.isBulkSelectionMode).toBe(false);
  });

  it("Select all chooses every piano in the list, then reads Deselect all", async () => {
    const store = setUp(["a"]);
    const renderer = renderWithStore(<SelectionHeader />, store);
    expect(allTexts(renderer.root)).toContain("Select all");

    await pressText(renderer.root, "Select all");
    expect(selectedIds(store)).toEqual(["a", "b", "c"]);
    expect(allTexts(renderer.root)).toContain("Deselect all");

    await pressText(renderer.root, "Deselect all");
    expect(selectedIds(store)).toEqual([]);
    expect(store.getState().pianos.isBulkSelectionMode).toBe(true);
    expect(allTexts(renderer.root)).toContain("Select all");
  });

  it("only chooses the pianos the list is showing", async () => {
    const store = setUp([]);
    act(() => {
      store.dispatch(setFilteredPianoListItems([pianos[0], pianos[2]]) as any);
    });
    const renderer = renderWithStore(<SelectionHeader />, store);

    await pressText(renderer.root, "Select all");

    expect(selectedIds(store)).toEqual(["a", "c"]);
  });
});

describe("the red Delete bar at the bottom", () => {
  const labelled = (
    renderer: ReturnType<typeof renderWithStore>,
    label: string,
  ) =>
    renderer.root.findAll(
      (node) =>
        node.props.accessibilityLabel === label &&
        typeof node.props.onPress === "function",
    );

  it("isn't there outside selection mode", () => {
    const store = createTestStore({ user: testUser, items: pianos });
    const renderer = renderWithStore(
      <BulkOperationsBar onRefresh={jest.fn()} />,
      store,
    );

    // Only the safe-area wrapper the test helper adds
    expect(allTexts(renderer.root)).toEqual([]);
  });

  it("counts what will be deleted, in the singular for one", () => {
    const one = renderWithStore(
      <BulkOperationsBar onRefresh={jest.fn()} />,
      setUp(["a"]),
    );
    expect(allTexts(one.root)).toContain("Delete 1 piano");

    const two = renderWithStore(
      <BulkOperationsBar onRefresh={jest.fn()} />,
      setUp(["a", "b"]),
    );
    expect(allTexts(two.root)).toContain("Delete 2 pianos");
  });

  it("asks first, names how many, and deletes nothing on Cancel", async () => {
    const store = setUp(["a", "b"]);
    pianos.forEach((item) => fakeBackend.documents.set(item.$id, { ...item }));
    const renderer = renderWithStore(
      <BulkOperationsBar onRefresh={jest.fn()} />,
      store,
    );
    expect(allTexts(renderer.root)).not.toContain("Delete 2 pianos?");

    await act(async () => {
      labelled(renderer, "Delete 2 pianos")[0].props.onPress();
    });

    expect(allTexts(renderer.root)).toContain("Delete 2 pianos?");
    expect(allTexts(renderer.root)).toContain(
      "Their photos and payments are removed too. This can’t be undone.",
    );

    await pressText(renderer.root, "Cancel");

    expect(fakeBackend.documents.size).toBe(3);
    expect(store.getState().pianos.items).toHaveLength(3);
    expect(selectedIds(store)).toEqual(["a", "b"]);
    expect(store.getState().pianos.isBulkSelectionMode).toBe(true);
  });

  it("says 'Its' rather than 'Their' when it is one piano", async () => {
    const renderer = renderWithStore(
      <BulkOperationsBar onRefresh={jest.fn()} />,
      setUp(["a"]),
    );

    await act(async () => {
      labelled(renderer, "Delete 1 piano")[0].props.onPress();
    });

    expect(allTexts(renderer.root)).toContain("Delete 1 piano?");
    expect(allTexts(renderer.root)).toContain(
      "Its photos and payments are removed too. This can’t be undone.",
    );
  });
});
