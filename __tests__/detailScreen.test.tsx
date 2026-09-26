jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({ id: "piano-1" })),
  useNavigation: jest.fn(() => ({ setOptions: jest.fn() })),
  usePathname: jest.fn(() => "/detail/piano-1"),
}));
jest.mock("@/app/services/notifications", () => ({
  cancelRentalNotification: jest.fn(() => Promise.resolve()),
}));

import React from "react";
import { ToastAndroid } from "react-native";
import { router } from "expo-router";
import DetailScreen from "@/app/detail/[id]";
import { cancelRentalNotification } from "@/app/services/notifications";
import icons from "@/constants/icons";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  captureAlerts,
  createTestStore,
  findByImageSource,
  press,
  queryAllByText,
  renderWithStore,
} from "./helpers/render";

const piano = makePiano({ $id: "piano-1", title: "Yamaha U1" });
let alerts: ReturnType<typeof captureAlerts>;

const renderDetail = () => {
  const store = createTestStore({ user: testUser, items: [piano] });
  const renderer = renderWithStore(<DetailScreen />, store);
  return { store, renderer };
};

const pressTrash = (renderer: ReturnType<typeof renderDetail>["renderer"]) =>
  press(findByImageSource(renderer.root, (source) => source === icons.trash));

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
  jest.spyOn(ToastAndroid, "show").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("deletes the piano after the user confirms, then goes back", async () => {
  const { store, renderer } = renderDetail();

  await pressTrash(renderer);
  expect(alerts.titles()).toEqual(["Delete Piano"]);
  // Nothing is removed until the user confirms
  expect(fakeBackend.documents.has("piano-1")).toBe(true);

  await alerts.pressButton("Delete");

  expect(fakeBackend.documents.has("piano-1")).toBe(false);
  expect(fakeBackend.files.has("old-file")).toBe(false);
  expect(store.getState().pianos.items).toEqual([]);
  expect(store.getState().pianos.filteredItems).toEqual([]);
  expect(cancelRentalNotification).toHaveBeenCalledWith("piano-1");
  expect(router.back).toHaveBeenCalled();
  // The screen does not flash "Piano not found" while it animates away
  expect(queryAllByText(renderer.root, "Piano not found")).toEqual([]);
});

it("keeps the piano when the user cancels", async () => {
  const { store, renderer } = renderDetail();

  await pressTrash(renderer);
  await alerts.pressButton("Cancel");

  expect(fakeBackend.documents.has("piano-1")).toBe(true);
  expect(store.getState().pianos.items).toEqual([piano]);
  expect(router.back).not.toHaveBeenCalled();
});

it("stays on the screen and reports the error when deleting fails", async () => {
  const { store, renderer } = renderDetail();
  jest.spyOn(console, "error").mockImplementation(() => {});
  fakeBackend.documents.delete("piano-1"); // e.g. already removed on another device

  await pressTrash(renderer);
  await alerts.pressButton("Delete");

  expect(alerts.titles()).toEqual(["Delete Piano", "Error"]);
  expect(store.getState().pianos.items).toEqual([piano]);
  expect(router.back).not.toHaveBeenCalled();
});
