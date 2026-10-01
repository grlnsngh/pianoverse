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
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  })),
  usePathname: jest.fn(() => "/detail/piano-1"),
}));

import React from "react";
import { act, ReactTestRenderer } from "react-test-renderer";
import DetailScreen from "@/app/detail/[id]";
import { PianoItem } from "@/redux/pianos/types";
import { fileViewUrl } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  createTestStore,
  flushPromises,
  renderWithStore,
} from "./helpers/render";

const urls = ["a", "b", "c"].map(fileViewUrl);

const renderDetail = (piano: PianoItem) =>
  renderWithStore(
    <DetailScreen />,
    createTestStore({ user: testUser, items: [piano] })
  );

const threePhotos = () => makePiano({ image_url: urls[0], image_urls: urls });

const press = async (renderer: ReactTestRenderer, label: string) => {
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

const has = (renderer: ReactTestRenderer, label: string) =>
  renderer.root.findAll((node) => node.props.accessibilityLabel === label)
    .length > 0;

// The hero's count is "2 / 3"; the viewer's is "2 of 3"
const counter = (renderer: ReactTestRenderer) =>
  allTexts(renderer.root).filter((text) => /^\d+ \/ \d+$/.test(text));
const viewerCounter = (renderer: ReactTestRenderer) =>
  allTexts(renderer.root).filter((text) => /^\d+ of \d+$/.test(text));

/** The photo shown by the viewer, which fills the screen. */
const viewerPhoto = (renderer: ReactTestRenderer) => {
  const shown = renderer.root
    .findAll(
      (node) =>
        urls.includes(node.props.source?.uri) &&
        node.props.contentFit === "contain"
    )
    .map((node) => node.props.source.uri);
  return [...new Set(shown)];
};

describe("the full-screen photo viewer", () => {
  it("is closed until a photo is tapped", () => {
    const renderer = renderDetail(threePhotos());

    expect(has(renderer, "Close photo viewer")).toBe(false);
    expect(has(renderer, "Open photo 1")).toBe(true);
    expect(has(renderer, "Open photo 2")).toBe(true);
    expect(has(renderer, "Open photo 3")).toBe(true);
  });

  it("opens on the photo that was tapped", async () => {
    const renderer = renderDetail(threePhotos());

    await press(renderer, "Open photo 2");

    expect(has(renderer, "Close photo viewer")).toBe(true);
    expect(viewerPhoto(renderer)).toEqual([urls[1]]);
    // The hero behind it has its own count, "1 / 3"; the viewer's says 2 of 3
    expect(viewerCounter(renderer)).toEqual(["2 of 3"]);
    expect(counter(renderer)).toEqual(["1 / 3"]);
  });

  it("goes to any photo from the strip of small photos, marking the one that is showing", async () => {
    const renderer = renderDetail(threePhotos());
    await press(renderer, "Open photo 1");
    const selected = () =>
      renderer.root
        .findAll(
          (node) =>
            /^Photo \d$/.test(node.props.accessibilityLabel ?? "") &&
            typeof node.props.onPress === "function"
        )
        .filter((node) => node.props.accessibilityState?.selected)
        .map((node) => node.props.accessibilityLabel)
        // (a pressable shows up more than once in the tree)
        .filter((label, at, all) => all.indexOf(label) === at);
    expect(selected()).toEqual(["Photo 1"]);

    await press(renderer, "Photo 3");
    expect(viewerPhoto(renderer)).toEqual([urls[2]]);
    expect(viewerCounter(renderer)).toEqual(["3 of 3"]);
    expect(selected()).toEqual(["Photo 3"]);

    await press(renderer, "Photo 2");
    expect(viewerPhoto(renderer)).toEqual([urls[1]]);
    expect(selected()).toEqual(["Photo 2"]);
  });

  it("closes, and opens on the tapped photo again next time", async () => {
    const renderer = renderDetail(threePhotos());
    await press(renderer, "Open photo 1");
    await press(renderer, "Photo 2");

    await press(renderer, "Close photo viewer");
    expect(has(renderer, "Close photo viewer")).toBe(false);

    await press(renderer, "Open photo 3");
    expect(viewerPhoto(renderer)).toEqual([urls[2]]);
  });

  it("shows a piano with one photo without a strip or a counter", async () => {
    const renderer = renderDetail(makePiano({ image_url: urls[0] }));

    await press(renderer, "Open photo 1");

    expect(has(renderer, "Close photo viewer")).toBe(true);
    expect(viewerPhoto(renderer)).toEqual([urls[0]]);
    expect(has(renderer, "Photo 1")).toBe(false);
    expect(counter(renderer)).toEqual([]);
    expect(viewerCounter(renderer)).toEqual([]);

    await press(renderer, "Close photo viewer");
    expect(has(renderer, "Close photo viewer")).toBe(false);
  });
});

describe("a photo that can't load (the Retry tile)", () => {
  // One entry per tile: a pressable is more than one node in the test tree
  const isTile = (node: any) =>
    node?.props.accessibilityLabel === "Photo didn't load. Retry" &&
    typeof node.props.onPress === "function";
  const retryTiles = (renderer: ReactTestRenderer) =>
    renderer.root.findAll((node) => isTile(node) && !isTile(node.parent));
  const failing = (renderer: ReactTestRenderer, uri: string) =>
    renderer.root
      .findAll((node) => node.props.source?.uri === uri && typeof node.props.onError === "function")
      .filter((node) => node.props.contentFit === "cover");

  it("shows a Retry tile at the top of the page, not the piano drawing", () => {
    const renderer = renderDetail(makePiano({ image_url: urls[0] }));
    expect(retryTiles(renderer)).toHaveLength(0);

    act(() => failing(renderer, urls[0])[0].props.onError());

    expect(retryTiles(renderer)).toHaveLength(1);
    // The photo can't be opened while it isn't there
    expect(allTexts(renderer.root)).toContain("Retry");
  });

  it("asks for the photo again when Retry is pressed", () => {
    const renderer = renderDetail(makePiano({ image_url: urls[0] }));
    act(() => failing(renderer, urls[0])[0].props.onError());

    act(() => retryTiles(renderer)[0].props.onPress());

    expect(retryTiles(renderer)).toHaveLength(0);
    expect(failing(renderer, urls[0]).length).toBeGreaterThan(0);
  });

  it("shows a Retry button in the viewer too", async () => {
    const renderer = renderDetail(threePhotos());
    await press(renderer, "Open photo 1");
    const inViewer = () =>
      renderer.root.findAll(
        (node) =>
          node.props.source?.uri === urls[0] &&
          node.props.contentFit === "contain" &&
          typeof node.props.onError === "function"
      );

    act(() => inViewer()[0].props.onError());
    const tiles = retryTiles(renderer);
    expect(tiles.length).toBeGreaterThan(0);
    expect(inViewer()).toHaveLength(0);

    act(() => tiles[tiles.length - 1].props.onPress());
    expect(inViewer().length).toBeGreaterThan(0);
  });
});
