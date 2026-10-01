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
    expect(has(renderer, "2 earlier rentals")).toBe(true);
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

    expect(has(renderer, "1 earlier rental")).toBe(true);
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

    expect(has(renderer, "2 earlier rentals")).toBe(true);
    expect(has(renderer, "Asha Mehta")).toBe(true);
    expect(has(renderer, "Ravi Kumar")).toBe(true);
  });
});

describe("Previous renters with the rentals that were kept", () => {
  const keep = (id: string, extra: Record<string, unknown>) =>
    fakeBackend.history.set(id, {
      $id: id,
      $createdAt: "2026-09-01T00:00:00.000+00:00",
      piano_id: "piano-1",
      creator: testUser.accountId,
      closed_on: "2026-06-01",
      ...extra,
    });

  it("shows a kept rental with its dates, its rent and what that person paid in it", async () => {
    keep("h1", {
      customer_name: "Ravi Kumar",
      period_start: "2026-02-01",
      period_end: "2026-05-31",
      price: 3500,
    });
    seed("r1", "2026-05-02", 3500, "Ravi Kumar");
    seed("r2", "2026-03-02", 3500, "Ravi Kumar");

    const renderer = await openDetail();

    expect(has(renderer, "1 earlier rental")).toBe(true);
    expect(has(renderer, "Ravi Kumar")).toBe(true);
    expect(
      has(renderer, "1 Feb 2026 to 31 May 2026 · ₹3,500 rent · 2 payments")
    ).toBe(true);
    expect(has(renderer, "₹7,000")).toBe(true);
  });

  it("shows a kept rental that has no payment without an amount", async () => {
    keep("h1", {
      customer_name: "Meera Kapoor",
      period_start: "2025-10-01",
      period_end: "2025-12-31",
      price: 3000,
    });

    const renderer = await openDetail();

    expect(has(renderer, "1 Oct 2025 to 31 Dec 2025 · ₹3,000 rent")).toBe(true);
    // The row says what the rental was, and no amount paid after it
    const labels = renderer.root
      .findAll((node: any) => typeof node.props.accessibilityLabel === "string")
      .map((node: any) => node.props.accessibilityLabel as string);
    expect(labels).toContain(
      "Meera Kapoor, 1 Oct 2025 to 31 Dec 2025 · ₹3,000 rent"
    );
  });

  it("lists the kept rentals, the one that ended last first, then the people known only from payments", async () => {
    keep("old", {
      customer_name: "Meera Kapoor",
      period_start: "2025-10-01",
      period_end: "2025-12-31",
      closed_on: "2026-01-02",
    });
    keep("new", {
      customer_name: "Ravi Kumar",
      period_start: "2026-02-01",
      period_end: "2026-05-31",
      closed_on: "2026-06-01",
    });
    seed("n1", "2024-04-02", 800, "Priya Nair");

    const renderer = await openDetail();
    const texts = allTexts(renderer.root);

    expect(has(renderer, "3 earlier rentals")).toBe(true);
    expect(texts.indexOf("Ravi Kumar")).toBeLessThan(
      texts.indexOf("Meera Kapoor")
    );
    expect(texts.indexOf("Meera Kapoor")).toBeLessThan(
      texts.indexOf("Priya Nair")
    );
    expect(has(renderer, "1 payment · Apr 2024")).toBe(true);
  });

  it("counts a payment in the rental it belongs to once, and shows a late stray one apart", async () => {
    keep("h1", {
      customer_name: "Ravi Kumar",
      period_start: "2026-02-01",
      period_end: "2026-05-31",
      closed_on: "2026-06-01",
    });
    seed("in", "2026-04-02", 3500, "Ravi Kumar");
    seed("late", "2026-06-20", 3500, "ravi kumar");
    seed("stray", "2026-10-02", 100, "Ravi Kumar");

    const renderer = await openDetail();

    // The kept rental takes the two inside it and a month after it closed
    expect(has(renderer, "1 Feb 2026 to 31 May 2026 · 2 payments")).toBe(true);
    expect(has(renderer, "₹7,000")).toBe(true);
    // The one long after it is known only from the payments
    expect(has(renderer, "2 earlier rentals")).toBe(true);
    expect(has(renderer, "1 payment · Oct 2026")).toBe(true);
  });

  it("leaves out the rentals of other pianos", async () => {
    keep("h1", {
      customer_name: "Ravi Kumar",
      period_start: "2026-02-01",
      period_end: "2026-05-31",
      piano_id: "piano-9",
    });

    const renderer = await openDetail();

    expect(has(renderer, "Previous renters")).toBe(false);
  });

  it("opens the customer of a kept rental, and not of one with no name", async () => {
    keep("h1", {
      customer_name: "Ravi Kumar",
      period_start: "2026-02-01",
      period_end: "2026-05-31",
    });
    keep("h2", {
      period_start: "2025-02-01",
      period_end: "2025-05-31",
      closed_on: "2025-06-01",
    });

    const renderer = await openDetail();
    const opens = (node: any) =>
      !!node &&
      node.props.accessibilityHint === "Opens this customer" &&
      typeof node.props.onPress === "function";
    const buttons = renderer.root.findAll(
      (node: any) => opens(node) && !opens(node.parent)
    );

    expect(buttons).toHaveLength(1);
    await act(async () => buttons[0].props.onPress());
    expect(router.push).toHaveBeenCalledWith("/customer/ravi%20kumar");
    expect(has(renderer, "Someone")).toBe(true);
  });

  it("still shows the people from the payments when the table isn't there yet", async () => {
    fakeBackend.missingCollections.add("rental_history");
    seed("r1", "2026-05-02", 3500, "Ravi Kumar");

    const renderer = await openDetail();

    expect(has(renderer, "1 earlier rental")).toBe(true);
    expect(has(renderer, "Ravi Kumar")).toBe(true);
  });

  it("asks for nothing for a piano that isn't a rental", async () => {
    await openDetail(makePiano({ $id: "piano-1", category: "on_sale" }));

    expect(fakeBackend.listCalls).toEqual([]);
  });
});
