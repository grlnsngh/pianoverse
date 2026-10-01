jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn() },
  usePathname: jest.fn(() => "/home"),
}));
jest.mock("@/services/notifications", () => ({
  cancelRentalNotification: jest.fn(() => Promise.resolve()),
}));

import React from "react";
import { Pressable } from "react-native";
import { cancelRentalNotification } from "@/services/notifications";
import useDeletePiano from "@/lib/useDeletePiano";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  createTestStore,
  dialogOf,
  pressDialog,
  pressLabel,
  renderWithStore,
} from "./helpers/render";

const piano = makePiano({ $id: "piano-1", title: "Yamaha U1" });

// Anything that deletes a piano (the swipe rows, a piano's page) does it through this hook
const Deleter = ({ onDeleted }: { onDeleted: () => void }) => {
  const confirmDelete = useDeletePiano();
  return (
    <Pressable
      onPress={() => confirmDelete(piano, onDeleted)}
      accessibilityRole="button"
      accessibilityLabel="Delete piano"
    />
  );
};

const setUp = (onDeleted = jest.fn()) => {
  const store = createTestStore({ user: testUser, items: [piano] });
  const renderer = renderWithStore(<Deleter onDeleted={onDeleted} />, store);
  return { store, renderer, onDeleted };
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
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("asks for confirmation before deleting", async () => {
  const { renderer, onDeleted } = setUp();

  await pressLabel(renderer.root, "Delete piano");

  expect(dialogOf(renderer.root)).toEqual({
    title: "Delete Yamaha U1?",
    message: "This removes the piano, its photos and its payments. This can’t be undone.",
    // The one that destroys something first, the safe one last
    actions: ["Delete", "Cancel"],
  });
  expect(fakeBackend.documents.has("piano-1")).toBe(true);
  expect(onDeleted).not.toHaveBeenCalled();
});

it("deletes the piano once the user confirms", async () => {
  const { store, renderer, onDeleted } = setUp();

  await pressLabel(renderer.root, "Delete piano");
  await pressDialog(renderer.root, "Delete");

  expect(fakeBackend.documents.has("piano-1")).toBe(false);
  expect(fakeBackend.files.has("old-file")).toBe(false);
  expect(store.getState().pianos.items).toEqual([]);
  expect(cancelRentalNotification).toHaveBeenCalledWith("piano-1");
  expect(onDeleted).toHaveBeenCalled();
});

it("keeps the piano when the user cancels", async () => {
  const { store, renderer, onDeleted } = setUp();

  await pressLabel(renderer.root, "Delete piano");
  await pressDialog(renderer.root, "Cancel");

  expect(fakeBackend.documents.has("piano-1")).toBe(true);
  expect(store.getState().pianos.items).toEqual([piano]);
  expect(onDeleted).not.toHaveBeenCalled();
});
