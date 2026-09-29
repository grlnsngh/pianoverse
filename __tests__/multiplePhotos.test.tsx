jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
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
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));
jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  return (props: any) => React.createElement("DateTimePicker", props);
});

import React from "react";
import { Dimensions } from "react-native";
import { act, ReactTestRenderer } from "react-test-renderer";
import * as ImagePicker from "expo-image-picker";
import DetailScreen from "@/app/detail/[id]";
import EditScreen from "@/app/edit/[id]";
import { PianoItem } from "@/redux/pianos/types";
import { MAX_PHOTOS } from "@/utils/photos";
import { fakeBackend, fileViewUrl } from "./helpers/fakeAppwrite";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  createTestStore,
  flushPromises,
  pressText,
  renderWithStore,
} from "./helpers/render";

const fileIds = ["a", "b", "c"];
const urls = fileIds.map(fileViewUrl);

const pianoWithPhotos = (ids: string[]) =>
  makePiano({
    image_url: fileViewUrl(ids[0]),
    image_urls: ids.map(fileViewUrl),
  });

let alerts: ReturnType<typeof captureAlerts>;

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  fakeNotifications.reset();
  alerts = captureAlerts();
  jest
    .spyOn(global, "fetch")
    .mockResolvedValue({ blob: async () => ({ size: 3000 }) } as any);
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const seedFiles = (ids: string[]) =>
  ids.forEach((id) =>
    fakeBackend.files.set(id, {
      name: `${id}.jpg`,
      type: "image/jpeg",
      size: 10,
      uri: `file:///${id}.jpg`,
    })
  );

const renderEdit = (piano: PianoItem) => {
  fakeBackend.documents.set(piano.$id, { ...piano });
  return renderWithStore(
    <EditScreen />,
    createTestStore({ user: testUser, items: [piano] })
  );
};

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

const hasLabel = (renderer: ReactTestRenderer, label: string) =>
  renderer.root.findAll((node) => node.props.accessibilityLabel === label)
    .length > 0;

const save = (renderer: ReactTestRenderer) =>
  pressText(renderer.root, "Save Changes");

const saved = () => fakeBackend.documents.get("piano-1");

describe("the photos on the Edit screen", () => {
  beforeEach(() => seedFiles(fileIds));

  it("shows every photo of the piano and how many there are", () => {
    const renderer = renderEdit(pianoWithPhotos(fileIds));

    const texts = allTexts(renderer.root);
    expect(texts.join(" ")).toContain("3 of 10 photos");
    expect(texts.join(" ")).toContain("Tap a photo to make it the cover");
    expect(hasLabel(renderer, "Cover photo")).toBe(true);
    expect(hasLabel(renderer, "Make photo 2 the cover")).toBe(true);
    expect(hasLabel(renderer, "Make photo 3 the cover")).toBe(true);
  });

  it("shows the one photo of a piano saved before there were several", async () => {
    const renderer = renderEdit(makePiano({ image_url: urls[0] }));

    expect(allTexts(renderer.root).join(" ")).toContain("1 of 10 photos");

    // Saving keeps it, now as a list of one
    await save(renderer);
    expect(saved()).toMatchObject({ image_url: urls[0], image_urls: [urls[0]] });
  });

  it("takes a photo out and deletes its file when saved", async () => {
    const renderer = renderEdit(pianoWithPhotos(fileIds));

    await pressLabel(renderer, "Remove photo 2");
    expect(allTexts(renderer.root).join(" ")).toContain("2 of 10 photos");
    // Nothing is deleted until the piano is saved
    expect(fakeBackend.files.has("b")).toBe(true);
    await save(renderer);

    expect(alerts.titles()).toEqual([]);
    expect(saved()).toMatchObject({
      image_url: urls[0],
      image_urls: [urls[0], urls[2]],
    });
    expect([...fakeBackend.files.keys()].sort()).toEqual(["a", "c"]);
  });

  it("makes another photo the cover without changing any file", async () => {
    const renderer = renderEdit(pianoWithPhotos(fileIds));

    await pressLabel(renderer, "Make photo 3 the cover");
    await save(renderer);

    expect(saved()).toMatchObject({
      image_url: urls[2],
      image_urls: [urls[2], urls[0], urls[1]],
    });
    expect([...fakeBackend.files.keys()].sort()).toEqual(fileIds);
  });

  it("makes the next photo the cover when the cover is taken out", async () => {
    const renderer = renderEdit(pianoWithPhotos(fileIds));

    await pressLabel(renderer, "Remove photo 1");
    await save(renderer);

    expect(saved()).toMatchObject({
      image_url: urls[1],
      image_urls: [urls[1], urls[2]],
    });
    expect(fakeBackend.files.has("a")).toBe(false);
  });

  it("won't save a piano without any photo", async () => {
    const renderer = renderEdit(pianoWithPhotos(fileIds));

    await pressLabel(renderer, "Remove photo 1");
    await pressLabel(renderer, "Remove photo 1");
    await pressLabel(renderer, "Remove photo 1");
    // Back to the buttons that add the first photo
    expect(allTexts(renderer.root)).toContain("Take Photo");
    await save(renderer);

    expect(alerts.titles()).toEqual(["Missing Details"]);
    expect(alerts.spy.mock.calls[0][1]).toBe("Please add a photo.");
    // Nothing was saved
    expect(saved()?.image_urls).toEqual(urls);
    expect([...fakeBackend.files.keys()].sort()).toEqual(fileIds);
  });

  it("adds a photo chosen from the library after the others", async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///data/cache/ImagePicker/new.jpeg",
          fileName: "new.jpeg",
          fileSize: 3000,
          mimeType: "image/jpeg",
          width: 1200,
          height: 900,
          type: "image",
        },
      ],
    } as any);
    const renderer = renderEdit(pianoWithPhotos(fileIds));

    await pressText(renderer.root, "Choose a file");
    expect(allTexts(renderer.root).join(" ")).toContain("4 of 10 photos");
    await save(renderer);

    const [newFileId] = [...fakeBackend.files.keys()].filter(
      (id) => !fileIds.includes(id)
    );
    expect(saved()).toMatchObject({
      image_url: urls[0],
      image_urls: [...urls, fileViewUrl(newFileId)],
    });
  });

  it("stops offering to add photos at the limit", async () => {
    const ids = Array.from({ length: MAX_PHOTOS - 1 }, (_, i) => `p${i}`);
    seedFiles(ids);
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///data/cache/ImagePicker/last.jpeg",
          fileName: "last.jpeg",
          fileSize: 3000,
          width: 1200,
          height: 900,
          type: "image",
        },
      ],
    } as any);
    const renderer = renderEdit(pianoWithPhotos(ids));
    expect(allTexts(renderer.root)).toContain("Choose a file");

    await pressText(renderer.root, "Choose a file");

    expect(allTexts(renderer.root).join(" ")).toContain("10 of 10 photos");
    expect(allTexts(renderer.root)).not.toContain("Choose a file");
    expect(allTexts(renderer.root)).not.toContain("Take Photo");
  });
});

describe("the photos on the Detail screen", () => {
  const renderDetail = (piano: PianoItem) =>
    renderWithStore(
      <DetailScreen />,
      createTestStore({ user: testUser, items: [piano] })
    );

  const counter = (renderer: ReactTestRenderer) =>
    allTexts(renderer.root).find((text) => /^\d+ \/ \d+$/.test(text));

  const shownPhotos = (renderer: ReactTestRenderer) =>
    renderer.root
      .findAll((node) => urls.includes(node.props.source?.uri))
      .map((node) => node.props.source.uri);

  it("can be swiped through, with a counter", () => {
    const renderer = renderDetail(pianoWithPhotos(fileIds));

    expect(counter(renderer)).toBe("1 / 3");
    expect(new Set(shownPhotos(renderer))).toEqual(new Set(urls));

    const [scroll] = renderer.root.findAll(
      (node) => typeof node.props.onMomentumScrollEnd === "function"
    );
    const width = Dimensions.get("window").width - 32;
    act(() =>
      scroll.props.onMomentumScrollEnd({
        nativeEvent: { contentOffset: { x: width * 2 } },
      })
    );

    expect(counter(renderer)).toBe("3 / 3");
  });

  it("shows a piano with one photo as before, without a counter", () => {
    const renderer = renderDetail(makePiano({ image_url: urls[0] }));

    expect(counter(renderer)).toBeUndefined();
    expect(new Set(shownPhotos(renderer))).toEqual(new Set([urls[0]]));
  });
});
