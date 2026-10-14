jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
jest.mock("@/lib/appwrite", () => ({
  getUserPianoEntries: jest.fn(),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({ user: require("./helpers/fixtures").testUser }),
}));
jest.mock("@/services/notifications", () => ({
  scheduleAllRentalNotifications: jest.fn(() => Promise.resolve([])),
  cancelRentalNotification: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn() },
  usePathname: jest.fn(() => "/home"),
}));

import React from "react";
import { FlatList } from "react-native";
import { act } from "react-test-renderer";
import Home from "@/app/(tabs)/home";
import { getUserPianoEntries } from "@/lib/appwrite";
import { SET_FILTERED_PIANO_LIST_ITEMS } from "@/redux/pianos/types";
import { makePiano, testUser } from "./helpers/fixtures";
import { createTestStore, flushPromises, renderWithStore } from "./helpers/render";

const pianos = Array.from({ length: 20 }, (_, i) =>
  makePiano({
    $id: `piano-${i}`,
    title: `Piano ${i}`,
    $createdAt: new Date(Date.UTC(2026, 0, 20 - i)).toISOString(),
  })
);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("the Home list", () => {
  const renderHome = async () => {
    jest.mocked(getUserPianoEntries).mockResolvedValue(pianos as any);
    const store = createTestStore({ user: testUser });
    const renderer = renderWithStore(<Home />, store);
    await flushPromises();
    return { store, renderer };
  };

  it("lists every piano", async () => {
    const { renderer } = await renderHome();

    expect(renderer.root.findByType(FlatList).props.data).toHaveLength(20);
  });

  it("filters once per load", async () => {
    const { store, renderer } = await renderHome();
    const dispatch = jest.spyOn(store, "dispatch");
    // The reload answers after the list has shown it is loading, as over a
    // network (an answer at once would let React run both as one update)
    let answer!: (entries: unknown) => void;
    jest
      .mocked(getUserPianoEntries)
      .mockImplementationOnce(() => new Promise<any>((resolve) => (answer = resolve)));

    let refreshed!: Promise<void>;
    await act(async () => {
      refreshed = renderer.root.findByType(FlatList).props.refreshControl.props.onRefresh();
    });
    await act(async () => {
      answer(pianos);
      await refreshed;
    });
    await flushPromises();

    const filterRuns = dispatch.mock.calls.filter(
      ([action]: any) => action.type === SET_FILTERED_PIANO_LIST_ITEMS
    );
    expect(filterRuns).toHaveLength(1);
  });
});
