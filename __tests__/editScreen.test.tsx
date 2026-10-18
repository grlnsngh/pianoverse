jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-router", () => ({
  usePreventRemove: (...args: unknown[]) =>
    require("./helpers/preventRemove").fakePreventRemove.hook(...args),
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
import { act } from "react-test-renderer";
import * as ImagePicker from "expo-image-picker";
import { router, useNavigation } from "expo-router";
import EditScreen from "@/app/edit/[id]";
import { fakeBackend, fileViewUrl } from "./helpers/fakeAppwrite";
import { fakePreventRemove } from "./helpers/preventRemove";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  addPhotoFrom,
  captureAlerts,
  chooseCategory,
  createTestStore,
  dialogOf,
  pressDialog,
  pressText,
  renderWithStore,
  typeInto,
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

  await pressText(renderer.root, "Save changes");

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

  await pressText(renderer.root, "Save changes");

  expect(alerts.titles()).toEqual([]);
  expect(fakeBackend.documents.get("piano-1")).toMatchObject({
    on_sale_purchase_from: "Kolkata Imports",
    on_sale_price: 250000,
    // The stored day, not "today"
    on_sale_import_date: "2026-03-10",
  });
});

it("uploads a newly picked photo when the piano is saved, keeping the saved one as the cover", async () => {
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

  await addPhotoFrom(renderer.root, "library");
  await pressText(renderer.root, "Save changes");

  expect(alerts.titles()).toEqual([]);
  const uploaded = [...fakeBackend.files.entries()].filter(([id]) => id !== "old-file");
  expect(uploaded).toHaveLength(1);
  const [newFileId, file] = uploaded[0];
  expect(file).toMatchObject({
    uri: "file:///data/cache/ImagePicker/new-photo.jpeg",
    size: 3000,
    type: "image/jpeg",
  });
  // The new photo comes after the saved one, which stays the cover
  expect(fakeBackend.documents.get("piano-1")).toMatchObject({
    image_url: fileViewUrl("old-file"),
    image_urls: [fileViewUrl("old-file"), fileViewUrl(newFileId)],
  });
  expect(fakeBackend.files.has("old-file")).toBe(true);
  // Back to where the edit started, not a new copy of Home
  expect(router.back).toHaveBeenCalled();
  expect(router.push).not.toHaveBeenCalled();
});

it("saves the rest of the piano without touching the image when none was picked", async () => {
  const renderer = renderEditScreenFor(makePiano({ title: "Yamaha U1" }));

  await pressText(renderer.root, "Save changes");

  expect(alerts.titles()).toEqual([]);
  expect(fakeBackend.documents.get("piano-1")?.image_url).toBe(fileViewUrl("old-file"));
  expect([...fakeBackend.files.keys()]).toEqual(["old-file"]);
});

it("clears the customer's details when a rental is changed into another kind of piano", async () => {
  const renderer = renderEditScreenFor(
    makePiano({
      category: "rentable",
      rental_customer_name: "Asha Mehta",
      rental_customer_address: "12 MG Road",
      rental_customer_mobile: "9876543210",
      rental_period_start: "2026-09-01" as any,
      rental_period_end: "2026-12-01" as any,
      rental_price: 4000,
    })
  );

  await chooseCategory(renderer.root, "warehouse");
  await pressText(renderer.root, "Save changes");

  expect(alerts.titles()).toEqual([]);
  expect(fakeBackend.documents.get("piano-1")).toMatchObject({
    category: "warehouse",
    rental_customer_name: null,
    rental_customer_address: null,
    rental_customer_mobile: null,
  });
});

describe("leaving the Edit screen", () => {
  const navigation = {
    setOptions: jest.fn(),
    dispatch: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  };

  // Leaving as the back button does: the screen's guard (usePreventRemove)
  // either lets it go or runs its callback, which has `repeat` to carry on
  const tryToLeave = () => {
    let leaving!: ReturnType<typeof fakePreventRemove.tryToLeave>;
    act(() => {
      leaving = fakePreventRemove.tryToLeave();
    });
    return leaving;
  };

  const typeTitle = (renderer: any, text: string) =>
    typeInto(renderer.root, "Title", text);

  beforeEach(() => {
    fakePreventRemove.reset();
    jest.mocked(useNavigation).mockReturnValue(navigation as any);
  });

  it("asks before throwing away changes that weren't saved", async () => {
    const renderer = renderEditScreenFor(makePiano({ title: "Yamaha U1" }));
    typeTitle(renderer, "Yamaha U3");

    const leaving = tryToLeave();

    expect(leaving.blocked).toBe(true);
    expect(leaving.repeat).not.toHaveBeenCalled();
    expect(dialogOf(renderer.root)).toEqual({
      title: "Discard changes?",
      message: "You have unsaved changes to this piano.",
      // The one that throws work away first, the safe one last
      actions: ["Discard", "Keep editing"],
    });
    await pressDialog(renderer.root, "Discard");
    // It carries on leaving, and the guard is off so it isn't asked again
    expect(leaving.repeat).toHaveBeenCalledTimes(1);
    expect(fakePreventRemove.guarding()).toBe(false);
    expect(fakeBackend.documents.get("piano-1")?.title).toBe("Yamaha U1");
  });

  it("stays when the user keeps editing", async () => {
    const renderer = renderEditScreenFor(makePiano({ title: "Yamaha U1" }));
    typeTitle(renderer, "Yamaha U3");

    const leaving = tryToLeave();
    await pressDialog(renderer.root, "Keep editing");

    expect(leaving.repeat).not.toHaveBeenCalled();
    expect(fakePreventRemove.guarding()).toBe(true);
  });

  it("leaves without asking when nothing was changed", () => {
    renderEditScreenFor(makePiano({ title: "Yamaha U1" }));

    expect(tryToLeave().blocked).toBe(false);
    expect(alerts.titles()).toEqual([]);
  });

  it("leaves without asking once the changes are saved", async () => {
    const renderer = renderEditScreenFor(makePiano({ title: "Yamaha U1" }));
    typeTitle(renderer, "Yamaha U3");

    await pressText(renderer.root, "Save changes");
    expect(router.back).toHaveBeenCalled();
    // Saving lifts the guard at once, before the screen has drawn again
    expect(fakePreventRemove.disablePrevention).toHaveBeenCalled();
    expect(tryToLeave().blocked).toBe(false);
    expect(alerts.titles()).toEqual([]);
  });
});
