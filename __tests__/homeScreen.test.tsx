jest.mock("@/lib/appwrite", () => ({
  getUserPianoEntries: jest.fn(),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({ user: require("./helpers/fixtures").testUser }),
}));
jest.mock("@/services/notifications", () => ({
  scheduleAllRentalNotifications: jest.fn(() => Promise.resolve([])),
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn() },
  usePathname: jest.fn(() => "/home"),
}));
// Render list rows as plain titles; the real cards are covered elsewhere.
jest.mock("@/components/PianoRow", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ item }: any) => React.createElement(Text, null, `row:${item.title}`);
});
jest.mock("@/components/PianoCard", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ item }: any) => React.createElement(Text, null, `row:${item.title}`);
});

import React from "react";
import { FlatList } from "react-native";
import { act } from "react-test-renderer";
import Home from "@/app/(tabs)/home";
import { DEFAULT_FILTERS } from "@/constants/Piano";
import { scheduleAllRentalNotifications } from "@/services/notifications";
import { getUserPianoEntries } from "@/lib/appwrite";
import { setPianoFilters, setPianoListItems } from "@/redux/pianos/actions";
import { makePiano } from "./helpers/fixtures";
import {
  allTexts,
  createTestStore,
  flushPromises,
  renderWithStore,
} from "./helpers/render";

const yamaha = makePiano({ $id: "yamaha", title: "Yamaha U1", category: "warehouse" });
const kawai = makePiano({
  $id: "kawai",
  title: "Kawai K-300",
  category: "rentable",
  $createdAt: "2026-09-02T10:00:00.000+00:00",
});

const rows = (renderer: ReturnType<typeof renderWithStore>) =>
  allTexts(renderer.root).filter((text) => text.startsWith("row:"));

const renderHome = async () => {
  const store = createTestStore();
  const renderer = renderWithStore(<Home />, store);
  await flushPromises();
  return { store, renderer };
};

const pullToRefresh = async (renderer: ReturnType<typeof renderWithStore>) => {
  const list = renderer.root.findByType(FlatList);
  await act(async () => {
    list.props.refreshControl.props.onRefresh();
  });
  await flushPromises();
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("shows the user's pianos once they are loaded", async () => {
  jest.mocked(getUserPianoEntries).mockResolvedValue([kawai, yamaha] as any);

  const { renderer } = await renderHome();

  expect(rows(renderer)).toEqual(["row:Kawai K-300", "row:Yamaha U1"]);
});

it("schedules rental reminders for the loaded pianos", async () => {
  jest.mocked(getUserPianoEntries).mockResolvedValue([kawai, yamaha] as any);

  await renderHome();

  expect(scheduleAllRentalNotifications).toHaveBeenCalledTimes(1);
  expect(scheduleAllRentalNotifications).toHaveBeenCalledWith([kawai, yamaha]);
});

it("empties the list when the last piano is gone after a refresh", async () => {
  jest
    .mocked(getUserPianoEntries)
    .mockResolvedValueOnce([yamaha] as any)
    .mockResolvedValueOnce([] as any);
  const { store, renderer } = await renderHome();
  expect(rows(renderer)).toEqual(["row:Yamaha U1"]);

  await pullToRefresh(renderer);

  expect(rows(renderer)).toEqual([]);
  expect(store.getState().pianos.items).toEqual([]);
});

it("updates immediately when a piano is removed from the stored list", async () => {
  jest.mocked(getUserPianoEntries).mockResolvedValue([kawai, yamaha] as any);
  const { store, renderer } = await renderHome();

  act(() => {
    store.dispatch(setPianoListItems([kawai]));
  });

  expect(rows(renderer)).toEqual(["row:Kawai K-300"]);
});

it("still applies the category filter", async () => {
  jest.mocked(getUserPianoEntries).mockResolvedValue([kawai, yamaha] as any);
  const { store, renderer } = await renderHome();

  act(() => {
    store.dispatch(setPianoFilters({ ...DEFAULT_FILTERS, category: "Rentable" }));
  });

  expect(rows(renderer)).toEqual(["row:Kawai K-300"]);
});

it("has the orange + button at the top right, which opens the Add screen", async () => {
  jest.mocked(getUserPianoEntries).mockResolvedValue([kawai] as any);
  const { renderer } = await renderHome();
  const add = renderer.root.find(
    (node) =>
      node.props.accessibilityLabel === "Add piano" &&
      typeof node.props.onPress === "function"
  );

  act(() => add.props.onPress());

  expect(require("expo-router").router.push).toHaveBeenCalledWith("/create");
});
