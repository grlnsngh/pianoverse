jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);
jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
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
import { act, ReactTestRenderer } from "react-test-renderer";
import { addDays } from "date-fns";
import { router } from "expo-router";
import DetailScreen from "@/app/detail/[id]";
import { PianoItem } from "@/redux/pianos/types";
import { toStoredDate } from "@/utils/dates";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import { a11yProblems, describeProblems } from "./helpers/a11y";
import {
  allTexts,
  createTestStore,
  flushPromises,
  renderWithStore,
} from "./helpers/render";

/** "Previous renters" on a rented piano's page, from the names saved with its payments. */

const inDays = (days: number) => toStoredDate(addDays(new Date(), days));

const rental = makePiano({
  $id: "piano-1",
  title: "Kawai K-300",
  category: "rentable",
  rental_customer_name: "Asha Mehta",
  rental_customer_mobile: "9876543210",
  rental_period_start: inDays(-30) as any,
  rental_period_end: inDays(30) as any,
  rental_price: 4000,
});

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  fakeNotifications.reset();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

const seed = (
  id: string,
  paidOn: string,
  amount: number,
  customer: string | null
) =>
  fakeBackend.payments.set(id, {
    $id: id,
    $createdAt: "2026-09-01T00:00:00.000+00:00",
    piano_id: "piano-1",
    creator: testUser.accountId,
    amount,
    paid_on: paidOn,
    ...(customer ? { customer_name: customer } : {}),
  });

const openDetail = async (piano: PianoItem = rental) => {
  fakeBackend.documents.set(piano.$id, { ...piano });
  const renderer = renderWithStore(
    <DetailScreen />,
    createTestStore({ user: testUser, items: [piano] })
  );
  await flushPromises();
  return renderer;
};

const has = (renderer: ReactTestRenderer, text: string) =>
  allTexts(renderer.root).includes(text);

describe("Previous renters on a piano's page", () => {
  beforeEach(() => {
    seed("a1", "2026-09-02", 4000, "Asha Mehta");
    seed("r1", "2026-05-02", 3500, "Ravi Kumar");
    seed("r2", "2026-03-02", 3500, "ravi  kumar");
    seed("m1", "2025-12-02", 3000, "Meera Kapoor");
    seed("n1", "2026-04-02", 100, null);
  });

  it("lists everyone else who paid rent for it, the one who paid last first, with what they paid", async () => {
    const renderer = await openDetail();
    const texts = allTexts(renderer.root);

    expect(has(renderer, "Previous renters")).toBe(true);
    expect(has(renderer, "2 other people have paid rent for it")).toBe(true);
    expect(texts.indexOf("Ravi Kumar")).toBeLessThan(
      texts.indexOf("Meera Kapoor")
    );
    expect(has(renderer, "2 payments · Mar 2026 to May 2026")).toBe(true);
    expect(has(renderer, "₹7,000")).toBe(true);
    expect(has(renderer, "1 payment · Dec 2025")).toBe(true);
    // Not the person who has it now, and not the payment with no name
    expect(texts.filter((text) => text === "Asha Mehta")).toHaveLength(1);
  });

  it("opens a customer, by the name in the address", async () => {
    const renderer = await openDetail();
    const [row] = renderer.root.findAll(
      (node: any) =>
        typeof node.props.accessibilityLabel === "string" &&
        node.props.accessibilityLabel.startsWith("Ravi Kumar, ") &&
        typeof node.props.onPress === "function"
    );

    await act(async () => row.props.onPress());

    expect(router.push).toHaveBeenCalledWith("/customer/ravi%20kumar");
  });

  it("says 1 person when it is one", async () => {
    // Meera is gone, and only Ravi is left
    fakeBackend.payments.delete("m1");

    const renderer = await openDetail();

    expect(has(renderer, "1 other person has paid rent for it")).toBe(true);
  });

  it("is usable: named and big enough to press", async () => {
    const renderer = await openDetail();

    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });
});

describe("when there is nothing to say", () => {
  it("leaves the section out when only the current renter has paid", async () => {
    seed("a1", "2026-09-02", 4000, "Asha Mehta");

    const renderer = await openDetail();

    expect(has(renderer, "Previous renters")).toBe(false);
  });

  it("leaves it out when no payment has a name", async () => {
    seed("n1", "2026-04-02", 100, null);

    const renderer = await openDetail();

    expect(has(renderer, "Previous renters")).toBe(false);
  });

  it("leaves it out for a piano that isn't a rental", async () => {
    seed("r1", "2026-05-02", 3500, "Ravi Kumar");

    const renderer = await openDetail(
      makePiano({ $id: "piano-1", category: "on_sale" })
    );

    expect(has(renderer, "Previous renters")).toBe(false);
  });

  it("shows everyone who paid on a piano that is sold", async () => {
    seed("a1", "2026-09-02", 4000, "Asha Mehta");
    seed("r1", "2026-05-02", 3500, "Ravi Kumar");

    const renderer = await openDetail({
      ...rental,
      sold_date: inDays(-2) as any,
      sold_price: 150000,
    } as any);

    expect(has(renderer, "2 other people have paid rent for it")).toBe(true);
    expect(has(renderer, "Asha Mehta")).toBe(true);
    expect(has(renderer, "Ravi Kumar")).toBe(true);
  });
});
