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
// A memoized row, like the real ones, that records its renders and props
jest.mock("@/components/ListItem", () => {
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
import { getUserPianoEntries } from "@/lib/appwrite";
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
  renderWithStore(<Home />, createTestStore({ user: testUser }));
  await flushPromises();
};

const resetCounts = () =>
  Object.keys(mockRenders).forEach((id) => (mockRenders[id] = 0));

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("re-renders only the row whose selection changed", async () => {
  await renderHome();
  act(() => mockProps.b.onEnterBulkSelection("b"));
  resetCounts();

  act(() => mockProps.a.onToggleSelection("a"));

  expect(mockRenders).toEqual({ a: 1, b: 0, c: 0 });
});

it("re-renders only the row whose menu opens", async () => {
  await renderHome();
  resetCounts();

  act(() => mockProps.c.openMenu("c"));

  expect(mockRenders).toEqual({ a: 0, b: 0, c: 1 });
});

it("gives rows the same callbacks on every render", async () => {
  await renderHome();
  const before = { ...mockProps.a };

  act(() => mockProps.b.openMenu("b"));
  act(() => mockProps.b.onEnterBulkSelection("b"));

  ["openMenu", "closeMenu", "onDelete", "onToggleSelection", "onEnterBulkSelection"].forEach(
    (name) => expect(mockProps.a[name]).toBe(before[name])
  );
});
