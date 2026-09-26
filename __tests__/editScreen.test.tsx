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
  usePathname: jest.fn(() => "/edit/piano-1"),
}));
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));
jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));

import React from "react";
import { ToastAndroid } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import EditScreen from "@/app/edit/[id]";
import { addHoursToDate } from "@/utils/ObjectManipulation";
import { fakeBackend, fileViewUrl } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  captureAlerts,
  createTestStore,
  findByImageSource,
  press,
  pressText,
  renderWithStore,
} from "./helpers/render";

const renderEditScreenFor = (piano: ReturnType<typeof makePiano>) => {
  fakeBackend.documents.set(piano.$id, { ...piano });
  const store = createTestStore({ user: testUser, items: [piano] });
  return renderWithStore(<EditScreen />, store);
};

let alerts: ReturnType<typeof captureAlerts>;

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
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

it("keeps the event details of an Events piano when it is saved", async () => {
  const piano = makePiano({
    category: "events",
    event_purchase_price: 150000,
    event_purchase_from: "Delhi Music House",
    event_model_number: "U1",
    event_b_number: "B-778",
  });
  const renderer = renderEditScreenFor(piano);

  await pressText(renderer.root, "Save Changes");

  expect(alerts.titles()).toEqual([]);
  expect(fakeBackend.documents.get("piano-1")).toMatchObject({
    event_purchase_price: 150000,
    event_purchase_from: "Delhi Music House",
    event_model_number: "U1",
    event_b_number: "B-778",
  });
});

it("keeps the sale details of an On Sale piano when it is saved", async () => {
  const importDate = "2026-03-10T00:00:00.000+00:00";
  const piano = makePiano({
    category: "on_sale",
    on_sale_purchase_from: "Kolkata Imports",
    on_sale_price: 250000,
    on_sale_import_date: importDate as any,
  });
  const renderer = renderEditScreenFor(piano);

  await pressText(renderer.root, "Save Changes");

  expect(alerts.titles()).toEqual([]);
  expect(fakeBackend.documents.get("piano-1")).toMatchObject({
    on_sale_purchase_from: "Kolkata Imports",
    on_sale_price: 250000,
    // Same date handling as every other date on this screen, not "today"
    on_sale_import_date: addHoursToDate(importDate).toDateString(),
  });
});

it("uploads a newly picked image when the piano is saved", async () => {
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: "file:///data/cache/ImagePicker/new-photo.jpeg",
        fileName: "new-photo.jpeg",
        fileSize: 3000,
        mimeType: "image/jpeg",
        width: 1200,
        height: 900,
        type: "image",
      },
    ],
  } as any);
  // The screen measures the picked file before deciding whether to compress it
  jest
    .spyOn(global, "fetch")
    .mockResolvedValue({ blob: async () => ({ size: 3000 }) } as any);
  const renderer = renderEditScreenFor(makePiano());

  await press(
    findByImageSource(renderer.root, (source) => source.uri === fileViewUrl("old-file"))
  );
  await pressText(renderer.root, "Save Changes");

  expect(alerts.titles()).toEqual([]);
  const uploaded = [...fakeBackend.files.entries()].filter(([id]) => id !== "old-file");
  expect(uploaded).toHaveLength(1);
  const [newFileId, file] = uploaded[0];
  expect(file).toMatchObject({
    uri: "file:///data/cache/ImagePicker/new-photo.jpeg",
    size: 3000,
    type: "image/jpeg",
  });
  expect(fakeBackend.documents.get("piano-1")?.image_url).toBe(fileViewUrl(newFileId));
  // The replaced image is no longer referenced, so it is cleaned up
  expect(fakeBackend.files.has("old-file")).toBe(false);
  expect(router.push).toHaveBeenCalledWith("/home");
});

it("saves the rest of the piano without touching the image when none was picked", async () => {
  const renderer = renderEditScreenFor(makePiano({ title: "Yamaha U1" }));

  await pressText(renderer.root, "Save Changes");

  expect(alerts.titles()).toEqual([]);
  expect(fakeBackend.documents.get("piano-1")?.image_url).toBe(fileViewUrl("old-file"));
  expect([...fakeBackend.files.keys()]).toEqual(["old-file"]);
});
