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
import { PaperProvider } from "react-native-paper";
import * as Reanimated from "react-native-reanimated";
import { act } from "react-test-renderer";
import Home from "@/app/(tabs)/home";
import CardItem from "@/components/CardItem";
import { getUserPianoEntries } from "@/lib/appwrite";
import { SET_FILTERED_PIANO_LIST_ITEMS } from "@/redux/pianos/types";
import { getEntranceDelay } from "@/utils/animation";
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

describe("entrance animation", () => {
  it("staggers only the first screenful of rows", () => {
    expect([0, 1, 7].map(getEntranceDelay)).toEqual([0, 100, 700]);
    expect([8, 20, 80].map(getEntranceDelay)).toEqual([0, 0, 0]);
  });

  it("shows a row far down the list without waiting", () => {
    const withDelay = jest.spyOn(Reanimated, "withDelay");

    renderWithStore(
      <CardItem
        item={pianos[0]}
        index={80}
        visibleMenuId={null}
        openMenu={jest.fn()}
        closeMenu={jest.fn()}
      />,
      createTestStore({ user: testUser, items: pianos })
    );

    expect(withDelay).toHaveBeenCalled();
    withDelay.mock.calls.forEach(([delay]) => expect(delay).toBe(0));
  });

  it("doesn't replay on every grid card when a menu opens", () => {
    const withDelay = jest.spyOn(Reanimated, "withDelay");
    let openMenu!: (id: string) => void;
    // Like the Home and search grids: one card per piano, and only the card
    // whose menu is open sees the change
    const SearchGrid = () => {
      const [visibleMenuId, setVisibleMenuId] = React.useState<string | null>(
        null
      );
      openMenu = setVisibleMenuId;
      return (
        <>
          {pianos.slice(0, 2).map((piano, index) => (
            <CardItem
              key={piano.$id}
              item={piano}
              index={index}
              visibleMenuId={visibleMenuId === piano.$id ? visibleMenuId : null}
              openMenu={setVisibleMenuId}
              closeMenu={() => setVisibleMenuId(null)}
              isGridView
            />
          ))}
        </>
      );
    };
    renderWithStore(
      <SearchGrid />,
      createTestStore({ user: testUser, items: pianos })
    );
    const entrances = withDelay.mock.calls.length;
    expect(entrances).toBeGreaterThan(0);

    act(() => openMenu("piano-0"));

    expect(withDelay).toHaveBeenCalledTimes(entrances);
  });
});

describe("the Home list", () => {
  const renderHome = async () => {
    jest.mocked(getUserPianoEntries).mockResolvedValue(pianos as any);
    const store = createTestStore({ user: testUser });
    const renderer = renderWithStore(<Home />, store);
    await flushPromises();
    return { store, renderer };
  };

  it("doesn't give every row its own PaperProvider", async () => {
    const { renderer } = await renderHome();

    expect(renderer.root.findByType(FlatList).props.data).toHaveLength(20);
    // Just the one the app (here: the test helper) provides at the root
    expect(renderer.root.findAllByType(PaperProvider)).toHaveLength(1);
  });

  it("filters once per load", async () => {
    const { store, renderer } = await renderHome();
    const dispatch = jest.spyOn(store, "dispatch");

    await act(async () => {
      await renderer.root.findByType(FlatList).props.refreshControl.props.onRefresh();
    });
    await flushPromises();

    const filterRuns = dispatch.mock.calls.filter(
      ([action]: any) => action.type === SET_FILTERED_PIANO_LIST_ITEMS
    );
    expect(filterRuns).toHaveLength(1);
  });
});
