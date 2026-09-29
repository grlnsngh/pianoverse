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
import { ReactTestRenderer } from "react-test-renderer";
import DetailScreen from "@/app/detail/[id]";
import { CATEGORY_COLORS } from "@/constants/colors";
import icons from "@/constants/icons";
import { PianoItem } from "@/redux/pianos/types";
import { toStoredDate } from "@/utils/dates";
import { getCategoryColor, getCategoryIcon } from "@/utils/rentalStatus";
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

describe("category colours and icons", () => {
  const categories = [
    ["rentable", "RENTABLE"],
    ["events", "EVENTS"],
    ["on_sale", "ON_SALE"],
    ["warehouse", "WAREHOUSE"],
  ] as const;

  it.each(categories)("are the same for %s pianos everywhere", (category, key) => {
    expect(getCategoryColor(category)).toBe(CATEGORY_COLORS[key]);
  });

  const badgeColour = (renderer: ReactTestRenderer) => {
    const [badge] = renderer.root.findAll(
      (node) => node.props.testID === "category-badge"
    );
    return [badge?.props.style].flat().find((style) => style?.backgroundColor)
      ?.backgroundColor;
  };

  it.each(categories)(
    "colour the page's %s badge like the lists do",
    async (category) => {
      const renderer = await renderDetail(
        makePiano({ category, ...(category === "rentable" ? rental : {}) } as any)
      );

      expect(badgeColour(renderer)).toBe(getCategoryColor(category));
    }
  );

  it.each([["events"], ["on_sale"], ["warehouse"]])(
    "give the %s section the lists' icon and colour",
    async (category) => {
      const renderer = await renderDetail(makePiano({ category } as any));

      const icon = renderer.root.findAll(
        (node) =>
          node.props.source === getCategoryIcon(category) &&
          node.props.tintColor === getCategoryColor(category)
      );
      expect(icon.length).toBeGreaterThan(0);
    }
  );

  it("doesn't use the rentals' icon for the sale section", async () => {
    const renderer = await renderDetail(makePiano({ category: "on_sale" }));

    expect(
      renderer.root.findAll((node) => node.props.source === icons.card).length
    ).toBeGreaterThan(0);
    // The sale section used the card icon, which the lists use for rentals
    expect(
      renderer.root.findAll(
        (node) =>
          node.props.source === icons.card &&
          node.props.tintColor === "#10B981"
      ).length
    ).toBe(0);
  });
});
