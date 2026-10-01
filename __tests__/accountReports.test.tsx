jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);
jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  })),
  usePathname: jest.fn(() => "/"),
}));
jest.mock("@/context/GlobalProvider", () => {
  const context = {
    user: require("./helpers/fixtures").testUser,
    setUser: jest.fn(),
    setIsLogged: jest.fn(),
  };
  return { useGlobalContext: () => context };
});

import React from "react";
import { act } from "react-test-renderer";
import { router } from "expo-router";
import Profile from "@/app/(tabs)/profile";
import { testUser } from "./helpers/fixtures";
import {
  allTexts,
  createTestStore,
  flushPromises,
  renderWithStore,
} from "./helpers/render";

/** The Reports group on the Account tab: the way to the Income and Customers screens. */

beforeEach(() => {
  jest.clearAllMocks();
});

const openAccount = async () => {
  const renderer = renderWithStore(
    <Profile />,
    createTestStore({ user: testUser })
  );
  await flushPromises();
  return renderer;
};

const row = (renderer: any, startsWith: string) =>
  renderer.root.findAll(
    (node: any) =>
      typeof node.props.accessibilityLabel === "string" &&
      node.props.accessibilityLabel.startsWith(startsWith) &&
      typeof node.props.onPress === "function"
  )[0];

describe("the Reports group on Account", () => {
  it("comes before Your data, with Income and Customers", async () => {
    const renderer = await openAccount();
    const texts = allTexts(renderer.root);

    expect(texts).toContain("Reports");
    expect(texts).toContain("Income");
    expect(texts).toContain("Customers");
    expect(texts).toContain("Rent and sales, month by month");
    expect(texts).toContain("Who has rented your pianos, and what they paid");
    expect(texts.indexOf("Reports")).toBeLessThan(texts.indexOf("Your data"));
  });

  it("opens the Income screen", async () => {
    const renderer = await openAccount();

    await act(async () => row(renderer, "Income.").props.onPress());

    expect(router.push).toHaveBeenCalledWith("/income");
  });

  it("opens the Customers screen", async () => {
    const renderer = await openAccount();

    await act(async () => row(renderer, "Customers.").props.onPress());

    expect(router.push).toHaveBeenCalledWith("/customers");
  });
});
