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

const counter = (renderer: ReactTestRenderer) =>
  allTexts(renderer.root).filter((text) => /^\d+ \/ \d+$/.test(text));

/** The photo shown by the viewer, which fills the screen. */
const viewerPhoto = (renderer: ReactTestRenderer) => {
  const shown = renderer.root
    .findAll(
      (node) =>
        urls.includes(node.props.source?.uri) &&
        node.props.resizeMode === "contain"
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
    // The gallery behind it has its own counter, the viewer's says 2 / 3
    expect(counter(renderer)).toContain("2 / 3");
  });

  it("goes to the next and the previous photo", async () => {
    const renderer = renderDetail(threePhotos());
    await press(renderer, "Open photo 1");
    expect(has(renderer, "Previous photo")).toBe(false);

    await press(renderer, "Next photo");
    expect(viewerPhoto(renderer)).toEqual([urls[1]]);
    expect(counter(renderer)).toContain("2 / 3");

    await press(renderer, "Next photo");
    expect(viewerPhoto(renderer)).toEqual([urls[2]]);
    // Nothing after the last photo
    expect(has(renderer, "Next photo")).toBe(false);

    await press(renderer, "Previous photo");
    expect(viewerPhoto(renderer)).toEqual([urls[1]]);
  });

  it("closes, and opens on the tapped photo again next time", async () => {
    const renderer = renderDetail(threePhotos());
    await press(renderer, "Open photo 1");
    await press(renderer, "Next photo");

    await press(renderer, "Close photo viewer");
    expect(has(renderer, "Close photo viewer")).toBe(false);

    await press(renderer, "Open photo 3");
    expect(viewerPhoto(renderer)).toEqual([urls[2]]);
  });

  it("shows a piano with one photo without arrows or a counter", async () => {
    const renderer = renderDetail(makePiano({ image_url: urls[0] }));

    await press(renderer, "Open photo 1");

    expect(has(renderer, "Close photo viewer")).toBe(true);
    expect(viewerPhoto(renderer)).toEqual([urls[0]]);
    expect(has(renderer, "Next photo")).toBe(false);
    expect(has(renderer, "Previous photo")).toBe(false);
    expect(counter(renderer)).toEqual([]);

    await press(renderer, "Close photo viewer");
    expect(has(renderer, "Close photo viewer")).toBe(false);
  });
});
