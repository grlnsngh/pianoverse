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
  usePathname: jest.fn(() => "/"),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({ user: require("./helpers/fixtures").testUser }),
}));
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));

import React from "react";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import Create from "@/app/create";
import EditScreen from "@/app/edit/[id]";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  chooseCategory,
  createTestStore,
  fillBasics,
  inputValue,
  pickDate,
  pressText,
  renderWithStore,
  typeInto,
} from "./helpers/render";

const pickedPhoto = {
  canceled: false,
  assets: [
    {
      uri: "file:///cache/ImagePicker/piano.jpeg",
      fileName: "piano.jpeg",
      fileSize: 1000,
      width: 800,
      height: 600,
      type: "image",
    },
  ],
} as any;

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Create screen", () => {
  const renderCreate = () =>
    renderWithStore(<Create />, createTestStore({ user: testUser }));

  const mockPhoto = () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue(pickedPhoto);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ blob: async () => ({ size: 1000 }) } as any);
  };

  it("says what's missing instead of offering a button that does nothing", async () => {
    const alerts = captureAlerts();
    const renderer = renderCreate();

    await pressText(renderer.root, "Continue");

    expect(alerts.titles()).toEqual(["Missing Details"]);
    expect(alerts.spy.mock.calls[0][1]).toBe("Please add a photo.");
    expect(allTexts(renderer.root)).toContain("Step 1 of 3");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("starts on the first of three steps", () => {
    const renderer = renderCreate();

    const texts = allTexts(renderer.root);
    expect(texts).toContain("New piano");
    expect(texts).toContain("Step 1 of 3");
    expect(texts).toContain("About the piano");
    expect(texts).toContain("You can change anything later.");
  });

  it("goes on to how the piano will be used once the basics are filled in", async () => {
    mockPhoto();
    const renderer = renderCreate();

    await fillBasics(renderer.root);
    await pressText(renderer.root, "Continue");

    const texts = allTexts(renderer.root);
    expect(texts).toContain("Step 2 of 3");
    expect(texts).toContain("How will it be used?");
    // The Rentable fields are the ones showing first
    expect(inputValue(renderer.root, "Customer")).toBe("");
  });

  it("goes back to the first step with what was typed still there", async () => {
    mockPhoto();
    const renderer = renderCreate();
    await fillBasics(renderer.root);
    await pressText(renderer.root, "Continue");

    await pressText(renderer.root, "Back");

    expect(allTexts(renderer.root)).toContain("Step 1 of 3");
    expect(inputValue(renderer.root, "Title")).toBe("Kawai K-300");
  });

  it("sets the On Sale import date from its own calendar", async () => {
    mockPhoto();
    const renderer = renderCreate();
    await fillBasics(renderer.root);
    await pressText(renderer.root, "Continue");
    await chooseCategory(renderer.root, "on_sale");
    const importDate = new Date(2025, 11, 24);

    await pickDate(renderer.root, "Import date", importDate);

    expect(allTexts(renderer.root)).toContain("24 Dec 2025");
  });

  it("lets price fields be cleared and take decimals", async () => {
    mockPhoto();
    const renderer = renderCreate();
    await fillBasics(renderer.root);
    await pressText(renderer.root, "Continue");
    await chooseCategory(renderer.root, "on_sale");
    const price = () => inputValue(renderer.root, "Sale price");

    expect(price()).toBe("");
    typeInto(renderer.root, "Sale price", "12.");
    expect(price()).toBe("12.");
    typeInto(renderer.root, "Sale price", "12.5");
    expect(price()).toBe("12.5");
    typeInto(renderer.root, "Sale price", "");
    expect(price()).toBe("");
    typeInto(renderer.root, "Sale price", "12a");
    expect(price()).toBe("");
  });

  it("shows amounts grouped the Indian way as they are typed", async () => {
    mockPhoto();
    const renderer = renderCreate();
    await fillBasics(renderer.root);
    await pressText(renderer.root, "Continue");
    await chooseCategory(renderer.root, "on_sale");

    typeInto(renderer.root, "Sale price", "250000");

    expect(inputValue(renderer.root, "Sale price")).toBe("2,50,000");
  });

  it("sends the chosen import date and decimal price on to review", async () => {
    mockPhoto();
    const renderer = renderCreate();

    await fillBasics(renderer.root);
    await pressText(renderer.root, "Continue");
    await chooseCategory(renderer.root, "on_sale");
    typeInto(renderer.root, "Bought from", "Kolkata Imports");
    const importDate = new Date(2025, 11, 24);
    await pickDate(renderer.root, "Import date", importDate);
    typeInto(renderer.root, "Sale price", "250000.5");
    await pressText(renderer.root, "Continue");

    expect(router.push).toHaveBeenCalledTimes(1);
    const { pathname, params } = jest.mocked(router.push).mock.calls[0][0] as any;
    expect(pathname).toBe("/review");
    const form = JSON.parse(params.formData);
    expect(form.onSalePrice).toBe(250000.5);
    expect(new Date(form.onSaleImportDate).toDateString()).toBe(
      importDate.toDateString()
    );
  });
});

describe("Edit screen", () => {
  const onSalePiano = makePiano({
    category: "on_sale",
    on_sale_purchase_from: "Kolkata Imports",
    on_sale_price: 250000,
    on_sale_import_date: "2026-03-10T00:00:00.000+00:00" as any,
  });

  const renderEdit = () => {
    fakeBackend.documents.set(onSalePiano.$id, { ...onSalePiano });
    return renderWithStore(
      <EditScreen />,
      createTestStore({ user: testUser, items: [onSalePiano] })
    );
  };

  it("saves a changed import date", async () => {
    const alerts = captureAlerts();
    const renderer = renderEdit();
    const importDate = new Date(2025, 11, 24);

    await pickDate(renderer.root, "Import date", importDate);
    await pressText(renderer.root, "Save changes");

    expect(alerts.titles()).toEqual([]);
    expect(fakeBackend.documents.get("piano-1")?.on_sale_import_date).toBe(
      "2025-12-24"
    );
  });

  it("saves a decimal price", async () => {
    const alerts = captureAlerts();
    const renderer = renderEdit();

    typeInto(renderer.root, "Sale price", "1250.5");
    await pressText(renderer.root, "Save changes");

    expect(alerts.titles()).toEqual([]);
    expect(fakeBackend.documents.get("piano-1")?.on_sale_price).toBe(1250.5);
  });
});
