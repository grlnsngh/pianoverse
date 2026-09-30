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
  useNavigation: jest.fn(() => ({
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  })),
  usePathname: jest.fn(() => "/detail/piano-1"),
}));

import React from "react";
import { addDays } from "date-fns";
import DetailScreen from "@/app/detail/[id]";
import { CATEGORY_COLORS } from "@/constants/colors";
import { PianoItem } from "@/redux/pianos/types";
import { toStoredDate } from "@/utils/dates";
import { getCategoryColor } from "@/utils/rentalStatus";
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

describe("category colours", () => {
  const categories = [
    ["rentable", "RENTABLE"],
    ["events", "EVENTS"],
    ["on_sale", "ON_SALE"],
    ["warehouse", "WAREHOUSE"],
  ] as const;

  it.each(categories)("are the same for %s pianos everywhere", (category, key) => {
    expect(getCategoryColor(category)).toBe(CATEGORY_COLORS[key]);
  });
});

describe("the category on a piano's page", () => {
  const words = [
    ["rentable", "Rentable"],
    ["events", "Events"],
    ["on_sale", "On sale"],
    ["warehouse", "Warehouse"],
  ] as const;

  it.each(words)(
    "is said in words in the line under the title for a %s piano, not shown as a coloured badge",
    async (category, label) => {
      const renderer = await renderDetail(
        makePiano({
          category,
          make: "Kawai",
          company_associated: "Shamshersons",
          ...(category === "rentable" ? rental : {}),
        } as any)
      );

      expect(allTexts(renderer.root)).toContain(`${label} · Kawai · Shamshersons`);
      expect(
        renderer.root.findAll((node) => node.props.testID === "category-badge")
      ).toHaveLength(0);
    }
  );

  it("says 'Was' for a piano that was sold", async () => {
    const renderer = await renderDetail(
      makePiano({
        category: "on_sale",
        make: "Kawai",
        company_associated: "Shamshersons",
        sold_date: inDays(-3),
        sold_price: 90000,
      } as any)
    );

    expect(allTexts(renderer.root)).toContain("Was on sale · Kawai · Shamshersons");
  });
});
