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
import { act, ReactTestRenderer } from "react-test-renderer";
import * as ImagePicker from "expo-image-picker";
import Create from "@/app/(tabs)/create";
import EditScreen from "@/app/edit/[id]";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  captureAlerts,
  createTestStore,
  flushPromises,
  pressText,
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

const pressLabel = async (renderer: ReactTestRenderer, label: string) => {
  const [node] = renderer.root.findAll(
    (candidate) =>
      candidate.props.accessibilityLabel === label &&
      typeof candidate.props.onPress === "function"
  );
  if (!node) throw new Error(`Nothing labelled "${label}"`);
  await act(async () => {
    await node.props.onPress();
  });
  await flushPromises();
};

describe("taking a photo on the Create screen", () => {
  const renderCreate = () =>
    renderWithStore(<Create />, createTestStore({ user: testUser }));

  it("uses the camera, cropped like library photos", async () => {
    const renderer = renderCreate();

    await pressText(renderer.root, "Take Photo");

    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsEditing: true, aspect: [4, 3] })
    );
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    expect(shows(renderer, cameraPhoto.uri)).toBe(true);
  });

  it("explains when camera access is refused", async () => {
    jest
      .mocked(ImagePicker.requestCameraPermissionsAsync)
      .mockResolvedValue({ granted: false } as any);
    const renderer = renderCreate();

    await pressText(renderer.root, "Take Photo");

    expect(alerts.titles()).toEqual(["Camera Access Needed"]);
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    expect(shows(renderer, cameraPhoto.uri)).toBe(false);
  });

  it("keeps the form as it was when the camera is closed", async () => {
    jest
      .mocked(ImagePicker.launchCameraAsync)
      .mockResolvedValue({ canceled: true, assets: null } as any);
    const renderer = renderCreate();

    await pressText(renderer.root, "Take Photo");

    expect(alerts.titles()).toEqual([]);
    expect(shows(renderer, cameraPhoto.uri)).toBe(false);
  });

  it("rejects a tiny crop", async () => {
    jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({
      canceled: false,
      assets: [{ ...cameraPhoto, width: 30, height: 20 }],
    } as any);
    const renderer = renderCreate();

    await pressText(renderer.root, "Take Photo");

    expect(alerts.titles()).toEqual(["Image Too Small"]);
    expect(shows(renderer, cameraPhoto.uri)).toBe(false);
  });

  it("can retake a photo that was already chosen", async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [{ ...cameraPhoto, uri: "file:///cache/ImagePicker/old.jpg" }],
    } as any);
    const renderer = renderCreate();
    await pressText(renderer.root, "Choose a file");
    expect(shows(renderer, "file:///cache/ImagePicker/old.jpg")).toBe(true);

    await pressLabel(renderer, "Take a new photo");

    expect(shows(renderer, cameraPhoto.uri)).toBe(true);
  });
});

describe("taking a photo on the Edit screen", () => {
  it("replaces the piano's photo with one from the camera", async () => {
    const piano = makePiano();
    fakeBackend.documents.set(piano.$id, { ...piano });
    const renderer = renderWithStore(
      <EditScreen />,
      createTestStore({ user: testUser, items: [piano] })
    );

    await pressLabel(renderer, "Take a new photo");

    expect(ImagePicker.launchCameraAsync).toHaveBeenCalledTimes(1);
    expect(shows(renderer, cameraPhoto.uri)).toBe(true);
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
