jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn() },
  usePathname: jest.fn(() => "/home"),
}));
jest.mock("@/services/notifications", () => ({
  cancelRentalNotification: jest.fn(() => Promise.resolve()),
}));

import React from "react";
import CardItem from "@/components/CardItem";
import ListItem from "@/components/ListItem";
import { cancelRentalNotification } from "@/services/notifications";
import icons from "@/constants/icons";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  captureAlerts,
  createTestStore,
  findByImageSource,
  press,
  pressText,
  renderWithStore,
} from "./helpers/render";

const piano = makePiano({ $id: "piano-1", title: "Yamaha U1" });
let alerts: ReturnType<typeof captureAlerts>;

const renderGridCard = (onDelete = jest.fn()) => {
  const store = createTestStore({ user: testUser, items: [piano] });
  const renderer = renderWithStore(
    <CardItem
      item={piano}
      index={0}
      visibleMenuId={null}
      openMenu={jest.fn()}
      closeMenu={jest.fn()}
      onDelete={onDelete}
      isGridView
    />,
    store
  );
  const pressTrash = () =>
    press(findByImageSource(renderer.root, (source) => source === icons.trash));
  return { store, pressTrash, onDelete };
};

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  fakeBackend.documents.set(piano.$id, { ...piano });
  fakeBackend.files.set("old-file", {
    name: "old.jpg",
    type: "image/jpeg",
    size: 10,
    uri: "file:///old.jpg",
  });
  alerts = captureAlerts();
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("asks for confirmation before deleting from a card", async () => {
  const { pressTrash, onDelete } = renderGridCard();

  await pressTrash();

  expect(alerts.titles()).toEqual(["Delete Piano"]);
  expect(fakeBackend.documents.has("piano-1")).toBe(true);
  expect(onDelete).not.toHaveBeenCalled();
});

it("deletes the piano once the user confirms", async () => {
  const { store, pressTrash, onDelete } = renderGridCard();

  await pressTrash();
  await alerts.pressButton("Delete");

  expect(fakeBackend.documents.has("piano-1")).toBe(false);
  expect(fakeBackend.files.has("old-file")).toBe(false);
  expect(store.getState().pianos.items).toEqual([]);
  expect(cancelRentalNotification).toHaveBeenCalledWith("piano-1");
  expect(onDelete).toHaveBeenCalled();
});

it("keeps the piano when the user cancels", async () => {
  const { store, pressTrash, onDelete } = renderGridCard();

  await pressTrash();
  await alerts.pressButton("Cancel");

  expect(fakeBackend.documents.has("piano-1")).toBe(true);
  expect(store.getState().pianos.items).toEqual([piano]);
  expect(onDelete).not.toHaveBeenCalled();
});

describe.each([
  ["list row", ListItem, piano],
])("delete from the %s menu", (_name, Component: any, itemProp) => {
  const renderWithOpenMenu = () => {
    const store = createTestStore({ user: testUser, items: [piano] });
    const closeMenu = jest.fn();
    const renderer = renderWithStore(
      <Component
        item={itemProp}
        index={0}
        visibleMenuId={piano.$id}
        openMenu={jest.fn()}
        closeMenu={closeMenu}
      />,
      store
    );
    return { store, renderer, closeMenu };
  };

  it("asks for confirmation instead of deleting straight away", async () => {
    const { renderer, closeMenu } = renderWithOpenMenu();

    await pressText(renderer.root, "Delete");

    expect(closeMenu).toHaveBeenCalled();
    expect(alerts.titles()).toEqual(["Delete Piano"]);
    expect(fakeBackend.documents.has("piano-1")).toBe(true);
  });

  it("deletes the piano once the user confirms", async () => {
    const { store, renderer } = renderWithOpenMenu();

    await pressText(renderer.root, "Delete");
    await alerts.pressButton("Delete");

    expect(fakeBackend.documents.has("piano-1")).toBe(false);
    expect(store.getState().pianos.items).toEqual([]);
  });
});
