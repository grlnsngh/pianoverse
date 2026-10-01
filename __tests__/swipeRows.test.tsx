jest.mock("@/lib/appwrite", () => ({
  getUserPianoEntries: jest.fn(),
  deletePianoEntry: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({ user: require("./helpers/fixtures").testUser }),
}));
jest.mock("@/services/notifications", () => ({
  scheduleAllRentalNotifications: jest.fn(() => Promise.resolve([])),
  cancelRentalNotification: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn() },
  usePathname: jest.fn(() => "/home"),
}));

import React from "react";
import { act } from "react-test-renderer";
import { router } from "expo-router";
import Home from "@/app/(tabs)/home";
import PianoRow from "@/components/PianoRow";
import SwipeableRow from "@/components/SwipeableRow";
import { DEFAULT_FILTERS } from "@/constants/Piano";
import { deletePianoEntry, getUserPianoEntries } from "@/lib/appwrite";
import { setPianoFilters } from "@/redux/pianos/actions";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  createTestStore,
  dialogOf,
  flushPromises,
  pressDialog,
  pressLabel,
  renderWithStore,
} from "./helpers/render";

const weber = makePiano({ $id: "weber", title: "Weber W-121", category: "warehouse" });
const estonia = makePiano({ $id: "estonia", title: "Estonia 190 Grand", category: "warehouse" });

const list = { grid: "unchecked", list: "checked", card: "unchecked" } as const;

const renderHome = async (layoutStatus: any = list) => {
  jest.mocked(getUserPianoEntries).mockResolvedValue([weber, estonia] as any);
  const store = createTestStore({ user: testUser });
  const renderer = renderWithStore(<Home />, store);
  await flushPromises();
  act(() => {
    store.dispatch(setPianoFilters({ ...DEFAULT_FILTERS, layoutStatus }) as any);
  });
  return { store, renderer };
};

const labelled = (renderer: any, label: string) =>
  renderer.root.findAll(
    (node: any) =>
      node.props.accessibilityLabel === label && typeof node.props.onPress === "function"
  );

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("a row of the list", () => {
  const item = makePiano({ $id: "weber", title: "Weber W-121" });
  const row = (props: Partial<React.ComponentProps<typeof PianoRow>> = {}) =>
    renderWithStore(
      <PianoRow item={item} onOpen={jest.fn()} {...props} />,
      createTestStore()
    );

  it("has Edit and Delete behind it when it is given what they do", () => {
    const renderer = row({ onEdit: jest.fn(), onDelete: jest.fn() });

    expect(labelled(renderer, "Edit").length).toBeGreaterThan(0);
    expect(labelled(renderer, "Delete").length).toBeGreaterThan(0);
  });

  it("is a plain row without them", () => {
    const renderer = row();

    expect(labelled(renderer, "Edit")).toHaveLength(0);
    expect(labelled(renderer, "Delete")).toHaveLength(0);
  });

  it("doesn't slide while pianos are being chosen", () => {
    const renderer = row({ onEdit: jest.fn(), onDelete: jest.fn(), selecting: true });

    expect(labelled(renderer, "Edit")).toHaveLength(0);
  });

  it("does what the buttons say", async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const renderer = row({ onEdit, onDelete });

    await pressLabel(renderer.root, "Edit");
    await pressLabel(renderer.root, "Delete");

    expect(onEdit).toHaveBeenCalledWith("weber");
    expect(onDelete).toHaveBeenCalledWith(item);
  });

  it("offers Edit and Delete to a screen reader as actions, since it can't swipe", () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const renderer = row({ onEdit, onDelete });
    const [opener] = renderer.root.findAll((node: any) =>
      Array.isArray(node.props.accessibilityActions)
    );

    expect(opener.props.accessibilityActions).toEqual([
      { name: "edit", label: "Edit" },
      { name: "delete", label: "Delete" },
    ]);
    act(() => opener.props.onAccessibilityAction({ nativeEvent: { actionName: "edit" } }));
    act(() => opener.props.onAccessibilityAction({ nativeEvent: { actionName: "delete" } }));
    expect(onEdit).toHaveBeenCalledWith("weber");
    expect(onDelete).toHaveBeenCalledWith(item);
  });

  it("hides its buttons from a screen reader, which has the actions instead", () => {
    const renderer = row({ onEdit: jest.fn(), onDelete: jest.fn() });

    const [edit] = labelled(renderer, "Edit");
    let node = edit.parent;
    while (node && !node.props.accessibilityElementsHidden) node = node.parent;
    expect(node?.props.importantForAccessibility).toBe("no-hide-descendants");
  });
});

describe("the Pianos list", () => {
  it("slides each row for Edit and Delete in the list layout", async () => {
    const { renderer } = await renderHome();

    // One swipeable row for each of the two pianos
    expect(renderer.root.findAllByType(SwipeableRow)).toHaveLength(2);
  });

  it("has no buttons behind the photo cards of the grid", async () => {
    const { renderer } = await renderHome(DEFAULT_FILTERS.layoutStatus);

    expect(labelled(renderer, "Edit")).toHaveLength(0);
  });

  it("opens the Edit screen for the row's piano", async () => {
    const { renderer } = await renderHome();

    await act(async () => {
      labelled(renderer, "Edit")[0].props.onPress();
    });

    expect(router.push).toHaveBeenCalledWith(expect.stringMatching(/^\/edit\/(weber|estonia)$/));
  });

  it("asks before deleting, naming the piano, and deletes it when confirmed", async () => {
    const { renderer, store } = await renderHome();

    await act(async () => {
      labelled(renderer, "Delete")[0].props.onPress();
    });
    const dialog = dialogOf(renderer.root);
    expect(dialog?.title).toMatch(/^Delete (Weber W-121|Estonia 190 Grand)\?$/);
    expect(dialog?.actions).toEqual(["Delete", "Cancel"]);
    expect(deletePianoEntry).not.toHaveBeenCalled();

    await pressDialog(renderer.root, "Delete");

    expect(deletePianoEntry).toHaveBeenCalledTimes(1);
    expect(store.getState().pianos.items).toHaveLength(1);
  });

  it("deletes nothing when cancelled", async () => {
    const { renderer, store } = await renderHome();
    await act(async () => {
      labelled(renderer, "Delete")[0].props.onPress();
    });

    await pressDialog(renderer.root, "Cancel");

    expect(deletePianoEntry).not.toHaveBeenCalled();
    expect(store.getState().pianos.items).toHaveLength(2);
  });
});
