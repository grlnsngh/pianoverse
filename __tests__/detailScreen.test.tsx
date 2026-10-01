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
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  })),
  usePathname: jest.fn(() => "/detail/piano-1"),
}));
jest.mock("@/services/notifications", () => ({
  cancelRentalNotification: jest.fn(() => Promise.resolve()),
}));

import React from "react";
import { router } from "expo-router";
import DetailScreen from "@/app/detail/[id]";
import { cancelRentalNotification } from "@/services/notifications";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  captureAlerts,
  captureToastCalls,
  createTestStore,
  dialogOf,
  press,
  pressDialog,
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

// "Delete piano", the red row at the bottom of the page
const pressDelete = (renderer: ReturnType<typeof renderDetail>["renderer"]) => {
  const [row] = renderer.root.findAll(
    (node) =>
      node.props.accessibilityLabel === "Delete piano" &&
      typeof node.props.onPress === "function"
  );
  return press(row);
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

it("deletes the piano after the user confirms, then goes back", async () => {
  const { store, renderer } = renderDetail();

  await pressDelete(renderer);
  expect(dialogOf(renderer.root)?.title).toBe("Delete Yamaha U1?");
  // Nothing is removed until the user confirms
  expect(fakeBackend.documents.has("piano-1")).toBe(true);

  await pressDialog(renderer.root, "Delete");

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

  await pressDelete(renderer);
  await pressDialog(renderer.root, "Cancel");

  expect(fakeBackend.documents.has("piano-1")).toBe(true);
  expect(store.getState().pianos.items).toEqual([piano]);
  expect(router.back).not.toHaveBeenCalled();
});

it("stays on the screen and reports the error when deleting fails", async () => {
  const { store, renderer } = renderDetail();
  jest.spyOn(console, "error").mockImplementation(() => {});
  fakeBackend.documents.delete("piano-1"); // e.g. already removed on another device

  const toasts = captureToastCalls();

  await pressDelete(renderer);
  await pressDialog(renderer.root, "Delete");

  // Says so with an error toast and offers to try again, as on the Feedback board
  expect(alerts.titles()).toEqual([]);
  expect(toasts).toEqual([
    {
      message: "Couldn’t delete Yamaha U1. Check your connection.",
      duration: "long",
      variant: "error",
      action: { label: "Retry", onPress: expect.any(Function) },
    },
  ]);
  expect(store.getState().pianos.items).toEqual([piano]);
  expect(router.back).not.toHaveBeenCalled();
});
