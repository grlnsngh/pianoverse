jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({ id: "piano-1" })),
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  })),
  usePathname: jest.fn(() => "/"),
}));
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => ({
    user: require("./helpers/fixtures").testUser,
    setUser: jest.fn(),
    setIsLogged: jest.fn(),
  }),
}));

import React from "react";
import { addDays, format } from "date-fns";
import Profile from "@/app/(tabs)/profile";
import DetailScreen from "@/app/detail/[id]";
import EditScreen from "@/app/edit/[id]";
import { PianoItem } from "@/redux/pianos/types";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  createTestStore,
  flushPromises,
  pressText,
  renderWithStore,
} from "./helpers/render";
import { storedDaysInTimeZone } from "./helpers/runInTimeZone";

const day = (offset: number) => format(addDays(new Date(), offset), "yyyy-MM-dd");

const rental = (end: string, overrides: Partial<PianoItem> = {}) =>
  makePiano({
    category: "rentable",
    rental_customer_name: "Asha",
    rental_customer_address: "Delhi",
    rental_customer_mobile: "9999999999",
    rental_price: 5000,
    rental_period_start: "2026-01-01" as any,
    rental_period_end: end as any,
    ...overrides,
  });

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("runs in India time, like the app's users", () => {
  // 09:30 UTC is 15:00 in India
  expect(new Date("2026-09-26T09:30:00.000Z").getHours()).toBe(15);
});

describe("reading stored dates", () => {
  const stored = [
    "2026-09-26", // saved by this version
    "2026-09-26T00:00:00.000+00:00", // a day as returned by Appwrite
    "Sat Sep 26 2026", // older Edit screen
  ];

  it.each(["Asia/Kolkata", "America/Los_Angeles", "UTC", "Pacific/Auckland"])(
    "gives the same calendar day in %s",
    (timeZone) => {
      expect(storedDaysInTimeZone(timeZone, stored)).toEqual([
        "2026-09-26",
        "2026-09-26",
        "2026-09-26",
      ]);
    }
  );

  it("reads full timestamps saved by older versions as the day picked locally", () => {
    // Picked on 26 Sep at 15:00 and at 03:00 India time
    expect(
      storedDaysInTimeZone("Asia/Kolkata", [
        "2026-09-26T09:30:00.000Z",
        "2026-09-25T21:30:00.000Z",
      ])
    ).toEqual(["2026-09-26", "2026-09-26"]);
  });
});

describe("Edit screen dates", () => {
  it("saves the same days when nothing was changed", async () => {
    const alerts = captureAlerts();
    // Created at 15:00 India time by an older version, which stored the full time
    const piano = rental("2026-10-26T09:30:00.000Z", {
      rental_period_start: "2026-09-26T09:30:00.000Z" as any,
      date_of_purchase: "2026-01-15T00:00:00.000+00:00" as any,
    });
    fakeBackend.documents.set(piano.$id, { ...piano });
    const renderer = renderWithStore(
      <EditScreen />,
      createTestStore({ user: testUser, items: [piano] })
    );

    await pressText(renderer.root, "Save changes");

    expect(alerts.titles()).toEqual([]);
    expect(fakeBackend.documents.get("piano-1")).toMatchObject({
      rental_period_start: "2026-09-26",
      rental_period_end: "2026-10-26",
      date_of_purchase: "2026-01-15",
    });
  });
});

describe("Detail screen dates", () => {
  it("shows the day that was picked, not the UTC day", () => {
    // Picked 26 Sep at 03:00 India time, which is still 25 Sep in UTC
    const piano = rental("2026-10-26", {
      rental_period_start: "2026-09-25T21:30:00.000Z" as any,
    });
    const renderer = renderWithStore(
      <DetailScreen />,
      createTestStore({ user: testUser, items: [piano] })
    );

    expect(allTexts(renderer.root)).toContain("26 Sep 2026");
    expect(allTexts(renderer.root)).not.toContain("25 Sep 2026");
  });
});

describe("rental status", () => {
  it("the detail screen warns about a rental that ends today", () => {
    const renderer = renderWithStore(
      <DetailScreen />,
      createTestStore({ user: testUser, items: [rental(day(0))] })
    );

    expect(allTexts(renderer.root)).toEqual(
      expect.arrayContaining(["Rental ends today", "Ends today"])
    );
  });

  it("the detail screen warns about a rental that has ended", () => {
    const renderer = renderWithStore(
      <DetailScreen />,
      createTestStore({ user: testUser, items: [rental(day(-3))] })
    );

    expect(allTexts(renderer.root)).toEqual(
      expect.arrayContaining(["Rental ended 3 days ago", "Ended · 3 days over", "Rent overdue"])
    );
  });

  it("the detail screen still shows the time left on an active rental", () => {
    const renderer = renderWithStore(
      <DetailScreen />,
      createTestStore({ user: testUser, items: [rental(day(20))] })
    );

    expect(allTexts(renderer.root)).toEqual(
      expect.arrayContaining(["Rental ends in 20 days", "20 days left"])
    );
  });
});

it("the account tab counts a rental ending today as on rent", async () => {
  const pianos = [
    rental(day(0), { $id: "due-today" }),
    rental(day(10), { $id: "active" }),
    rental(day(-1), { $id: "ended" }),
  ];
  const renderer = renderWithStore(
    <Profile />,
    createTestStore({ user: testUser, items: pianos })
  );
  await flushPromises();

  const texts = allTexts(renderer.root);
  expect(texts[texts.indexOf("On rent") - 1]).toBe("2");
});
