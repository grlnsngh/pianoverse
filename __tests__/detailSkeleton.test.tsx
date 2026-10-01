jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({ id: "piano-1" })),
  usePathname: jest.fn(() => "/detail/piano-1"),
}));
jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);

import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import DetailScreen from "@/app/detail/[id]";
import DetailSkeleton from "@/components/DetailSkeleton";
import { lightColors as colors } from "@/constants/theme";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import { createTestStore } from "./helpers/render";
import { mount } from "./helpers/ui";

const flat = (style: unknown) => StyleSheet.flatten(style as any);

const withInsets = (top: number, bottom: number, children: React.ReactNode) => (
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top, left: 0, right: 0, bottom },
    }}
  >
    {children}
  </SafeAreaProvider>
);

const shapes = (renderer: any) =>
  renderer.root
    .findAll((node: any) => typeof node.type === "string" && node.props.accessibilityElementsHidden === true)
    .map((node: any) => flat(node.props.style))
    // (the Back button's icon is hidden from screen readers too, but has no radius)
    .filter((style: any) => style.borderRadius !== undefined)
    .map((style: any) => [style.width, style.height, style.borderRadius]);

describe("the piano page's skeleton (LoadingDetail board)", () => {
  it("draws the shapes of the photo, the title, the rental, two rows and the bar", async () => {
    const renderer = await mount(withInsets(0, 0, <DetailSkeleton onBack={jest.fn()} />));

    expect(shapes(renderer)).toEqual([
      // Photo, full width
      ["100%", 340, 0],
      // Title, category line, status
      [240, 28, 8],
      [210, 14, 7],
      [170, 15, 7],
      // Rental: title, avatar with two lines, bar, two dates
      [90, 20, 8],
      [48, 48, 24],
      [130, 16, 8],
      [110, 13, 6],
      ["100%", 8, 4],
      [80, 14, 7],
      [80, 14, 7],
      // Two rows
      [60, 16, 8],
      [80, 16, 8],
      [70, 16, 8],
      [150, 16, 8],
      // The bar: amount, caption, button
      [70, 20, 8],
      [90, 13, 6],
      [160, 48, 14],
    ]);
  });

  it("makes the photo taller by the status bar, as the real one is", async () => {
    const renderer = await mount(withInsets(47, 34, <DetailSkeleton onBack={jest.fn()} />));

    expect(shapes(renderer)[0]).toEqual(["100%", 387, 0]);
  });

  it("keeps the Back button real and pressable", async () => {
    const onBack = jest.fn();
    const renderer = await mount(withInsets(0, 0, <DetailSkeleton onBack={onBack} />));
    const back = renderer.root.find(
      (node) => node.props.accessibilityLabel === "Back to pianos" && typeof node.props.onPress === "function"
    );

    back.props.onPress();

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("says it is loading, as one thing, rather than announcing each grey shape", async () => {
    const renderer = await mount(withInsets(0, 0, <DetailSkeleton onBack={jest.fn()} />));
    const loading = renderer.root.find(
      (node) => typeof node.type === "string" && node.props.testID === "detail-skeleton"
    );

    expect(loading.props.accessible).toBe(true);
    expect(loading.props.accessibilityLabel).toBe("Loading piano");
    expect(loading.props.accessibilityState).toEqual({ busy: true });
  });

  it("has the bar as tall as the real one, with a hairline above it", async () => {
    const renderer = await mount(withInsets(47, 34, <DetailSkeleton onBack={jest.fn()} />));
    const bar = renderer.root.find(
      (node) => typeof node.type === "string" && flat(node.props.style)?.height === 84
    );

    expect(flat(bar.props.style)).toMatchObject({ borderTopWidth: 1, borderTopColor: colors.hairline, paddingBottom: 34 });
  });
});

describe("the piano page under the status bar", () => {
  const piano = makePiano({ $id: "piano-1", title: "Yamaha U1", category: "warehouse" });

  it("lets the photo run under it and puts the buttons below it, as the boards' 12 px", async () => {
    fakeBackend.reset();
    const store = createTestStore({ user: testUser, items: [piano] });
    const renderer = await mount(
      withInsets(
        47,
        34,
        <Provider store={store}>
          <DetailScreen />
        </Provider>
      )
    );
    const hero = renderer.root.find((node) => typeof node.type === "string" && node.props.testID === "photo-hero");
    const back = renderer.root.find(
      (node) => node.props.accessibilityLabel === "Back to pianos" && typeof node.props.onPress === "function"
    );

    expect(flat(hero.props.style).height).toBe(340 + 47);
    expect(flat(back.props.style({ pressed: false })).top).toBe(47 + 12);
  });

  it("makes the bar 84 high on a phone with a home indicator", async () => {
    fakeBackend.reset();
    const store = createTestStore({ user: testUser, items: [piano] });
    const renderer = await mount(
      withInsets(
        47,
        34,
        <Provider store={store}>
          <DetailScreen />
        </Provider>
      )
    );
    const bar = renderer.root.find((node) => typeof node.type === "string" && node.props.testID === "sticky-action-bar");

    expect(flat(bar.props.style)).toMatchObject({ height: 84, paddingBottom: 34 });
  });
});
