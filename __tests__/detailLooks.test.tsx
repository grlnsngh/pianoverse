jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({ id: "piano-1" })),
  useNavigation: jest.fn(() => ({ setOptions: jest.fn() })),
  usePathname: jest.fn(() => "/detail/piano-1"),
}));

import React from "react";
import { addDays } from "date-fns";
import DetailScreen from "@/app/detail/[id]";
import { PianoItem } from "@/redux/pianos/types";
import { toStoredDate } from "@/utils/dates";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  createTestStore,
  flushPromises,
  renderWithStore,
} from "./helpers/render";

const inDays = (days: number) => toStoredDate(addDays(new Date(), days)) as any;

const renderDetail = async (piano: PianoItem) => {
  fakeBackend.documents.set(piano.$id, { ...piano });
  const renderer = renderWithStore(
    <DetailScreen />,
    createTestStore({ user: testUser, items: [piano] })
  );
  await flushPromises();
  return renderer;
};

beforeEach(() => {
  fakeBackend.reset();
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const rental = {
  category: "rentable",
  rental_period_start: inDays(-30),
  rental_period_end: inDays(60),
};

describe("prices on a piano's page", () => {
  it.each([
    ["rentable", { ...rental, rental_price: 125000 }],
    ["events", { category: "events", event_purchase_price: 1250000 }],
    ["on_sale", { category: "on_sale", on_sale_price: 1250000 }],
  ])("use Indian digit grouping for a %s piano", async (_category, details) => {
    const renderer = await renderDetail(makePiano(details as any));

    const texts = allTexts(renderer.root).join(" ");
    expect(texts).toMatch(/₹(1,25,000|12,50,000)/);
    expect(texts).not.toMatch(/₹(125,000|1,250,000)/);
  });
});

