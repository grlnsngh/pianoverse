jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);
jest.mock("@/lib/appwrite", () => ({
  getUserPianoEntries: jest.fn(),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({ user: require("./helpers/fixtures").testUser }),
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn() },
  usePathname: jest.fn(() => "/home"),
}));
jest.mock("@/components/ListItem", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ item }: any) => React.createElement(Text, null, `row:${item.title}`);
});

import path from "path";
import { transformSync } from "@babel/core";
import React from "react";
import { act } from "react-test-renderer";
import * as Notifications from "expo-notifications";
import Home from "@/app/(tabs)/home";
import { DEFAULT_FILTERS, SORT_BY_OPTIONS } from "@/constants/Piano";
import { scheduleAllRentalNotifications } from "@/services/notifications";
import { getUserPianoEntries } from "@/lib/appwrite";
import { setPianoFilters } from "@/redux/pianos/actions";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano } from "./helpers/fixtures";
import {
  allTexts,
  createTestStore,
  flushPromises,
  renderWithStore,
} from "./helpers/render";

let log: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  fakeNotifications.reset();
  log = jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const pianos = [
  makePiano({
    $id: "a",
    title: "A",
    category: "rentable",
    $createdAt: "2026-03-01T10:00:00.000+00:00",
    date_of_purchase: "2025-06-01" as any,
    rental_period_end: "2026-12-20" as any,
  }),
  makePiano({
    $id: "b",
    title: "B",
    category: "rentable",
    $createdAt: "2026-05-01T10:00:00.000+00:00",
    // Older formats still sort correctly
    date_of_purchase: "Mon Jan 05 2026" as any,
    rental_period_end: "2026-11-02T00:00:00.000+00:00" as any,
  }),
  makePiano({
    $id: "c",
    title: "C",
    category: "rentable",
    $createdAt: "2026-04-01T10:00:00.000+00:00",
    date_of_purchase: "2025-11-20T09:30:00.000Z" as any,
    rental_period_end: "2026-11-15" as any,
  }),
];

const renderHome = async () => {
  jest.mocked(getUserPianoEntries).mockResolvedValue(pianos as any);
  const store = createTestStore();
  const renderer = renderWithStore(<Home />, store);
  await flushPromises();
  return { store, renderer };
};

const rows = (renderer: any) =>
  allTexts(renderer.root).filter((text: string) => text.startsWith("row:"));

describe("filtering and sorting the Home list", () => {
  it("doesn't log on every filter change", async () => {
    const { store } = await renderHome();
    log.mockClear();

    act(() => {
      store.dispatch(setPianoFilters({ ...DEFAULT_FILTERS, category: "Rentable" }));
    });
    act(() => {
      store.dispatch(
        setPianoFilters({ ...DEFAULT_FILTERS, sortBy: SORT_BY_OPTIONS.TITLE_ASC })
      );
    });

    expect(log).not.toHaveBeenCalled();
  });

  it.each([
    [SORT_BY_OPTIONS.LATEST_ADDED, ["row:B", "row:C", "row:A"]],
    [SORT_BY_OPTIONS.PURCHASE_DATE, ["row:B", "row:C", "row:A"]],
    [SORT_BY_OPTIONS.DUE_DATE, ["row:B", "row:C", "row:A"]],
    [SORT_BY_OPTIONS.TITLE_DES, ["row:C", "row:B", "row:A"]],
  ])("still sorts by %s", async (sortBy, expected) => {
    const { store, renderer } = await renderHome();

    act(() => {
      store.dispatch(setPianoFilters({ ...DEFAULT_FILTERS, sortBy }));
    });

    expect(rows(renderer)).toEqual(expected);
  });
});

describe("rescheduling rental reminders", () => {
  const rentals = Array.from({ length: 20 }, (_, i) =>
    makePiano({
      $id: `rental-${i}`,
      title: `Rental ${i}`,
      category: "rentable",
      rental_period_end: "2099-01-15" as any,
    })
  );

  it("looks up the scheduled notifications once, not once per piano", async () => {
    await scheduleAllRentalNotifications(rentals);

    expect(Notifications.getAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(fakeNotifications.rentalReminders()).toHaveLength(100);
  });

  it("logs a single summary instead of a line per piano", async () => {
    await scheduleAllRentalNotifications(rentals);

    expect(log).toHaveBeenCalledTimes(1);
  });
});

describe("release builds", () => {
  const compile = (envName: string) =>
    transformSync(
      `export const run = () => {
        console.log("debug");
        console.info("info");
        console.warn("warning");
        console.error("failure");
      };`,
      {
        filename: path.join(__dirname, "..", "app", "example.ts"),
        cwd: path.join(__dirname, ".."),
        envName,
        caller: { name: "metro", bundler: "metro", platform: "ios" } as any,
      }
    )!.code!;

  it("strip debug logging but keep warnings and errors", () => {
    const code = compile("production");

    expect(code).not.toContain("console.log");
    expect(code).not.toContain("console.info");
    expect(code).toContain("console.warn");
    expect(code).toContain("console.error");
  });

  it("keep all logging in development", () => {
    expect(compile("development")).toContain("console.log");
  });
});
