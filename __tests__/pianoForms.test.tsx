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
jest.mock("@react-native-picker/picker", () => {
  const React = require("react");
  const Picker = (props: any) => React.createElement("Picker", props, props.children);
  Picker.Item = (props: any) => React.createElement("PickerItem", props);
  return { Picker };
});
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  return (props: any) => React.createElement("DateTimePicker", props);
});

import React from "react";
import { act, ReactTestRenderer } from "react-test-renderer";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import Create from "@/app/(tabs)/create";
import EditScreen from "@/app/edit/[id]";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  chooseDate as chooseDateIn,
  createTestStore,
  pressText,
  renderWithStore,
} from "./helpers/render";

const hostNodes = (renderer: ReactTestRenderer, type: string) =>
  renderer.root.findAll((node) => (node.type as unknown) === type);

const field = (renderer: ReactTestRenderer, title: string) => {
  const [node] = renderer.root.findAll(
    (candidate) =>
      candidate.props.title === title &&
      typeof candidate.props.handleChangeText === "function"
  );
  if (!node) throw new Error(`No field titled "${title}"`);
  return node;
};

const typeInto = (renderer: ReactTestRenderer, title: string, text: string) =>
  act(() => {
    field(renderer, title).props.handleChangeText(text);
  });

const chooseDate = (renderer: ReactTestRenderer, title: string, date: Date) =>
  chooseDateIn(renderer.root, title, date);

const chooseCategory = (renderer: ReactTestRenderer, category: string) =>
  act(() => {
    hostNodes(renderer, "Picker")[0].props.onValueChange(category);
  });

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

  it("says what's missing instead of offering a button that does nothing", async () => {
    const alerts = captureAlerts();
    const renderer = renderCreate();

    const [button] = renderer.root.findAll(
      (node) =>
        node.props.title === "Review & Publish" &&
        typeof node.props.handlePress === "function"
    );
    expect(button.props.disabled).toBeFalsy();
    await pressText(renderer.root, "Review & Publish");

    expect(alerts.titles()).toEqual(["Missing Details"]);
    expect(alerts.spy.mock.calls[0][1]).toBe("Please add a photo.");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("centres the step it is on under the step circles", () => {
    const renderer = renderCreate();

    // The text component carrying the classes, around the drawn text
    const [step] = renderer.root.findAll(
      (node) =>
        typeof node.props.className === "string" &&
        allTexts(node).join("") === "Step 1 of 3"
    );
    expect(step.props.className).toMatch(/\btext-center\b/);
  });

  it("sets the On Sale import date from its own date picker", () => {
    const renderer = renderCreate();
    chooseCategory(renderer, "on_sale");
    const importDate = new Date(2025, 11, 24);

    chooseDate(renderer, "Import Date", importDate);

    expect(allTexts(renderer.root)).toContain(importDate.toDateString());
    expect(hostNodes(renderer, "DateTimePicker")).toHaveLength(0);
  });

  it("lets price fields be cleared and take decimals", () => {
    const renderer = renderCreate();
    chooseCategory(renderer, "on_sale");
    const price = () => field(renderer, "Price").props.value;

    expect(price()).toBe("");
    typeInto(renderer, "Price", "12.");
    expect(price()).toBe("12.");
    typeInto(renderer, "Price", "12.5");
    expect(price()).toBe("12.5");
    typeInto(renderer, "Price", "");
    expect(price()).toBe("");
    typeInto(renderer, "Price", "12a");
    expect(price()).toBe("");
  });

  it("sends the chosen import date and decimal price on to review", async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
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
    } as any);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ blob: async () => ({ size: 1000 }) } as any);
    const renderer = renderCreate();

    chooseCategory(renderer, "on_sale");
    await pressText(renderer.root, "Choose a file");
    typeInto(renderer, "Title", "Kawai K-300");
    typeInto(renderer, "Description", "Black polish");
    act(() => {
      renderer.root
        .findAll((node) => typeof node.props.onChange === "function" && node.props.data)[0]
        .props.onChange({ label: "Other", value: "Other" });
    });
    act(() => {
      renderer.root
        .findAll((node) => node.props.buttons && node.props.onValueChange)[0]
        .props.onValueChange("Shamshersons");
    });
    typeInto(renderer, "Purchase From", "Kolkata Imports");
    const importDate = new Date(2025, 11, 24);
    chooseDate(renderer, "Import Date", importDate);
    typeInto(renderer, "Price", "250000.5");
    await pressText(renderer.root, "Review & Publish");

    expect(router.push).toHaveBeenCalledTimes(1);
    const { params } = jest.mocked(router.push).mock.calls[0][0] as any;
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

    chooseDate(renderer, "Import Date", importDate);
    await pressText(renderer.root, "Save Changes");

    expect(alerts.titles()).toEqual([]);
    expect(fakeBackend.documents.get("piano-1")?.on_sale_import_date).toBe(
      "2025-12-24"
    );
  });

  it("saves a decimal price", async () => {
    const alerts = captureAlerts();
    const renderer = renderEdit();

    typeInto(renderer, "Price", "1250.5");
    await pressText(renderer.root, "Save Changes");

    expect(alerts.titles()).toEqual([]);
    expect(fakeBackend.documents.get("piano-1")?.on_sale_price).toBe(1250.5);
  });
});
