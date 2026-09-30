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
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));
jest.mock("@react-native-picker/picker", () => {
  const React = require("react");
  const Picker = (props: any) =>
    React.createElement("Picker", props, props.children);
  Picker.Item = (props: any) => React.createElement("PickerItem", props);
  return { Picker };
});

import fs from "fs";
import path from "path";
import React from "react";
import { Linking } from "react-native";
import { ReactTestRenderer } from "react-test-renderer";
import * as ImagePicker from "expo-image-picker";
import Create from "@/app/create";
import EditScreen from "@/app/edit/[id]";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  addPhotoFrom,
  allTexts,
  captureAlerts,
  createTestStore,
  pressLabel,
  renderWithStore,
} from "./helpers/render";

const cameraPhoto = {
  uri: "file:///cache/Camera/piano.jpg",
  fileName: "piano.jpg",
  width: 1200,
  height: 900,
  type: "image",
};

let alerts: ReturnType<typeof captureAlerts>;

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  alerts = captureAlerts();
  jest
    .mocked(ImagePicker.requestCameraPermissionsAsync)
    .mockResolvedValue({ granted: true } as any);
  jest
    .mocked(ImagePicker.launchCameraAsync)
    .mockResolvedValue({ canceled: false, assets: [cameraPhoto] } as any);
  jest
    .spyOn(global, "fetch")
    .mockResolvedValue({ blob: async () => ({ size: 1000 }) } as any);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const shows = (renderer: ReactTestRenderer, uri: string) =>
  renderer.root.findAll((node) => node.props.source?.uri === uri).length > 0;

describe("taking a photo on the Create screen", () => {
  const renderCreate = () =>
    renderWithStore(<Create />, createTestStore({ user: testUser }));

  it("uses the camera, cropped like library photos", async () => {
    const renderer = renderCreate();

    await addPhotoFrom(renderer.root, "camera");

    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsEditing: true, aspect: [4, 3] })
    );
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    expect(shows(renderer, cameraPhoto.uri)).toBe(true);
  });

  describe("when camera access is refused", () => {
    const refuse = async () => {
      jest
        .mocked(ImagePicker.requestCameraPermissionsAsync)
        .mockResolvedValue({ granted: false } as any);
      const renderer = renderCreate();
      await addPhotoFrom(renderer.root, "camera");
      return renderer;
    };

    it("explains how to allow it, in a sheet rather than a system alert", async () => {
      const renderer = await refuse();

      const texts = allTexts(renderer.root);
      expect(texts).toContain("Camera access is off");
      expect(texts).toContain(
        "Allow camera access in Settings to take photos of your pianos. You can also choose photos from your gallery."
      );
      expect(alerts.titles()).toEqual([]);
      expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
      expect(shows(renderer, cameraPhoto.uri)).toBe(false);
    });

    it("opens the phone's settings", async () => {
      const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue();
      const renderer = await refuse();

      await pressLabel(renderer.root, "Open Settings");

      expect(openSettings).toHaveBeenCalledTimes(1);
    });

    it("offers the gallery instead", async () => {
      jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
        canceled: false,
        assets: [{ ...cameraPhoto, uri: "file:///cache/ImagePicker/gallery.jpg" }],
      } as any);
      const renderer = await refuse();

      await pressLabel(renderer.root, "Choose from gallery");

      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
      expect(shows(renderer, "file:///cache/ImagePicker/gallery.jpg")).toBe(true);
    });
  });

  it("keeps the form as it was when the camera is closed", async () => {
    jest
      .mocked(ImagePicker.launchCameraAsync)
      .mockResolvedValue({ canceled: true, assets: null } as any);
    const renderer = renderCreate();

    await addPhotoFrom(renderer.root, "camera");

    expect(alerts.titles()).toEqual([]);
    expect(shows(renderer, cameraPhoto.uri)).toBe(false);
  });

  it("rejects a tiny crop", async () => {
    jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({
      canceled: false,
      assets: [{ ...cameraPhoto, width: 30, height: 20 }],
    } as any);
    const renderer = renderCreate();

    await addPhotoFrom(renderer.root, "camera");

    expect(alerts.titles()).toEqual(["Image Too Small"]);
    expect(shows(renderer, cameraPhoto.uri)).toBe(false);
  });

  it("adds a camera photo after one that was already chosen", async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [{ ...cameraPhoto, uri: "file:///cache/ImagePicker/old.jpg" }],
    } as any);
    const renderer = renderCreate();
    await addPhotoFrom(renderer.root, "library");
    expect(shows(renderer, "file:///cache/ImagePicker/old.jpg")).toBe(true);

    await addPhotoFrom(renderer.root, "camera");

    expect(shows(renderer, cameraPhoto.uri)).toBe(true);
    // The first photo is still there, and still the cover
    expect(shows(renderer, "file:///cache/ImagePicker/old.jpg")).toBe(true);
  });
});

describe("taking a photo on the Edit screen", () => {
  it("adds a photo from the camera to the piano's photos", async () => {
    const piano = makePiano();
    fakeBackend.documents.set(piano.$id, { ...piano });
    const renderer = renderWithStore(
      <EditScreen />,
      createTestStore({ user: testUser, items: [piano] })
    );

    await addPhotoFrom(renderer.root, "camera");

    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledTimes(1);
    expect(shows(renderer, cameraPhoto.uri)).toBe(true);
    expect(shows(renderer, piano.image_url)).toBe(true);
  });
});

it("tells iOS and Android why the app wants the camera", () => {
  const { expo } = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "app.json"), "utf8")
  );
  const [, options] = expo.plugins.find(
    (plugin: any) => Array.isArray(plugin) && plugin[0] === "expo-image-picker"
  );

  expect(options.cameraPermission).toMatch(/camera/);
});
