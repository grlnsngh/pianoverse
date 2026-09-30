jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canDismiss: jest.fn(() => true),
    dismissAll: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  })),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({
    user: require("./helpers/fixtures").testUser,
    setUser: jest.fn(),
    setIsLogged: jest.fn(),
  }),
}));
jest.mock("@/services/notifications", () => ({
  scheduleAllRentalNotifications: jest.fn(() => Promise.resolve([])),
  scheduleRentalDueNotification: jest.fn(() => Promise.resolve([])),
}));

import React from "react";
import { Animated } from "react-native";
import { act } from "react-test-renderer";
import { useLocalSearchParams } from "expo-router";
import Profile from "@/app/(tabs)/profile";
import Review from "@/app/review";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  createTestStore,
  findByImageSource,
  queryAllByText,
  renderWithStore,
} from "./helpers/render";

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("the profile", () => {
  const renderProfile = () =>
    renderWithStore(
      <Profile />,
      createTestStore({ user: testUser, items: [makePiano()] })
    );

  it("shows the profile straight away", () => {
    const renderer = renderProfile();

    const texts = allTexts(renderer.root);
    expect(texts).not.toContain("Loading Profile...");
    expect(texts).toContain("Overview");
    expect(texts).toContain("Sign Out");
  });

  it("fades in once and leaves no animation running", () => {
    const loop = jest.spyOn(Animated, "loop");
    const realParallel = Animated.parallel;
    const entrances: Animated.CompositeAnimation[] = [];
    jest.spyOn(Animated, "parallel").mockImplementation((...args) => {
      const animation = realParallel(...args);
      jest.spyOn(animation, "stop");
      entrances.push(animation);
      return animation;
    });

    const renderer = renderProfile();
    act(() => renderer.unmount());

    expect(loop).not.toHaveBeenCalled();
    expect(entrances).toHaveLength(1);
    expect(entrances[0].stop).toHaveBeenCalled();
  });
});

describe("the review screen", () => {
  const uri = "file:///cache/ImagePicker/piano.jpeg";
  const formData = JSON.stringify({
    category: "warehouse",
    title: "Kawai K-300",
    make: "Other",
    companyAssociated: "Shamshersons",
    dateOfPurchase: new Date(),
    warehouseStoredSinceDate: new Date(),
    photos: [{ uri, fileName: "piano.jpeg", fileSize: 1000 }],
  });

  const renderReview = () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ formData });
    const renderer = renderWithStore(
      <Review />,
      createTestStore({ user: testUser })
    );
    const image = () =>
      findByImageSource(renderer.root, (source) => source.uri === uri);
    return { renderer, image };
  };

  it.each([
    ["rentable", "Rentable", { rentalPrice: 4000 }, "₹4,000"],
    ["events", "Events", { eventPurchasePrice: 150000 }, "₹1,50,000"],
    ["on_sale", "On Sale", { onSalePrice: 250000 }, "₹2,50,000"],
  ])(
    "shows a %s piano's category by name, its description and prices in rupees",
    (category, label, price, shown) => {
      jest.mocked(useLocalSearchParams).mockReturnValue({
        formData: JSON.stringify({
          ...JSON.parse(formData),
          category,
          description: "Black polish, recently tuned",
          rentalStartDate: new Date(),
          rentalEndDate: new Date(),
          onSaleImportDate: new Date(),
          ...price,
        }),
      });

      const renderer = renderWithStore(
        <Review />,
        createTestStore({ user: testUser })
      );

      const texts = allTexts(renderer.root);
      expect(texts).toContain(label);
      expect(texts).not.toContain(category);
      expect(texts).toContain("Black polish, recently tuned");
      expect(texts).toContain(shown);
      expect(texts.join(" ")).not.toContain("$");
    }
  );

  it("centres its step under the step circles", () => {
    const { renderer } = renderReview();

    // The text component carrying the classes, around the drawn text
    const [step] = renderer.root.findAll(
      (node) =>
        typeof node.props.className === "string" &&
        allTexts(node).join("") === "Step 3 of 3"
    );
    expect(step.props.className).toMatch(/\btext-center\b/);
  });

  it("reads the form once, not on every render", () => {
    const parse = jest.spyOn(JSON, "parse");
    const { renderer, image } = renderReview();

    // Each of these re-renders the screen
    act(() => image().props.onLoadStart());
    act(() => image().props.onLoad());
    act(() => image().props.onLoadStart());

    expect(queryAllByText(renderer.root, "Kawai K-300")).toHaveLength(1);
    const formParses = parse.mock.calls.filter(([text]) => text === formData);
    expect(formParses).toHaveLength(1);
  });

  it("stops showing the loading message if the image never loads", () => {
    jest.useFakeTimers();
    const { renderer, image } = renderReview();

    act(() => image().props.onLoadStart());
    expect(allTexts(renderer.root)).toContain("Loading image...");

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(allTexts(renderer.root)).not.toContain("Loading image...");
  });

  it("shows the cover and says how many more photos there are", () => {
    const morePhotos = JSON.stringify({
      ...JSON.parse(formData),
      photos: [
        { uri, fileName: "piano.jpeg", fileSize: 1000 },
        { uri: "file:///cache/ImagePicker/two.jpeg" },
        "https://example.com/three.jpg",
      ],
    });
    jest.mocked(useLocalSearchParams).mockReturnValue({ formData: morePhotos });

    const renderer = renderWithStore(
      <Review />,
      createTestStore({ user: testUser })
    );

    expect(allTexts(renderer.root)).toContain("+ 2 more photos");
    expect(
      findByImageSource(renderer.root, (source) => source.uri === uri)
    ).toBeTruthy();
  });

  it("says nothing about more photos when there is only one", () => {
    const { renderer } = renderReview();

    expect(allTexts(renderer.root).join(" ")).not.toContain("more photo");
  });

  it("explains when the image can't be shown", () => {
    const { renderer, image } = renderReview();

    act(() => image().props.onLoadStart());
    act(() => image().props.onError());

    const texts = allTexts(renderer.root);
    expect(texts).toContain("Failed to load image");
    expect(texts).not.toContain("Loading image...");
  });
});
