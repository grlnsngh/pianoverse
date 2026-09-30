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
// A memoized card, like the real one, that records its renders and props
jest.mock("@/components/PianoCard", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return React.memo((props: any) => {
    const id = props.item.$id;
    mockRenders[id] = (mockRenders[id] ?? 0) + 1;
    mockProps[id] = props;
    return React.createElement(Text, null, props.item.title);
  });
});

import React from "react";
import { act } from "react-test-renderer";
import Home from "@/app/(tabs)/home";
import { DEFAULT_FILTERS } from "@/constants/Piano";
import { getUserPianoEntries } from "@/lib/appwrite";
import { setPianoFilters } from "@/redux/pianos/actions";
import { makePiano, testUser } from "./helpers/fixtures";
import { createTestStore, flushPromises, renderWithStore } from "./helpers/render";

const mockRenders: Record<string, number> = {};
const mockProps: Record<string, any> = {};

const pianos = ["a", "b", "c"].map((id, i) =>
  makePiano({
    $id: id,
    title: `Piano ${id}`,
    $createdAt: new Date(Date.UTC(2026, 0, 20 - i)).toISOString(),
  })
);

const renderHome = async () => {
  jest.mocked(getUserPianoEntries).mockResolvedValue(pianos as any);
  const store = createTestStore({ user: testUser });
  renderWithStore(<Home />, store);
  await flushPromises();
  return store;
};

const resetCounts = () =>
  Object.keys(mockRenders).forEach((id) => (mockRenders[id] = 0));

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("re-renders only the card whose selection changed", async () => {
  await renderHome();
  act(() => mockProps.b.onSelectStart("b"));
  resetCounts();

  act(() => mockProps.a.onToggle("a"));

  expect(mockRenders).toEqual({ a: 1, b: 0, c: 0 });
});

it("re-renders no card when the screen redraws with the same pianos", async () => {
  const store = await renderHome();
  resetCounts();

  // The same filters as a new object: the screen and its list are redrawn
  act(() => {
    store.dispatch(setPianoFilters({ ...DEFAULT_FILTERS }));
  });

  // Same pianos, same props: nothing to draw again
  expect(mockRenders).toEqual({ a: 0, b: 0, c: 0 });
});

it("gives cards the same callbacks on every render", async () => {
  await renderHome();
  const before = { ...mockProps.a };

  act(() => mockProps.b.onSelectStart("b"));
  act(() => mockProps.c.onToggle("c"));

  ["onOpen", "onToggle", "onSelectStart"].forEach((name) =>
    expect(mockProps.a[name]).toBe(before[name])
  );
});

it("opens a piano's page from its card", async () => {
  await renderHome();

  mockProps.a.onOpen("a");

  expect(require("expo-router").router.push).toHaveBeenCalledWith("/detail/a");
});
