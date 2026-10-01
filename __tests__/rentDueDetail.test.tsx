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
import { Linking, StyleSheet } from "react-native";
import { act, ReactTestRenderer } from "react-test-renderer";
import DetailScreen from "@/app/detail/[id]";
import { colors } from "@/constants/theme";
import { PianoItem } from "@/redux/pianos/types";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  createTestStore,
  flushPromises,
  renderWithStore,
} from "./helpers/render";

/** What a rented piano's page says about the rent that is due. Today is 29 September 2026. */

const rental = (extra: Partial<PianoItem> = {}) =>
  makePiano({
    $id: "piano-1",
    title: "Kawai K-300",
    category: "rentable",
    rental_customer_name: "Asha Mehta",
    rental_customer_mobile: "98765 43210",
    rental_period_start: "2026-08-01" as any,
    rental_period_end: "2026-12-01" as any,
    rental_price: 4000,
    ...extra,
  });

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 12, 0, 0),
    doNotFake: ["setImmediate", "nextTick"],
  });
  jest.clearAllMocks();
  fakeBackend.reset();
  fakeNotifications.reset();
  captureAlerts();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(Linking, "openURL").mockResolvedValue(true);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const seedPayment = (id: string, paidOn: string, amount: number, extra = {}) =>
  fakeBackend.payments.set(id, {
    $id: id,
    $createdAt: `${paidOn}T09:00:00.000+00:00`,
    piano_id: "piano-1",
    creator: testUser.accountId,
    amount,
    paid_on: paidOn,
    customer_name: "Asha Mehta",
    ...extra,
  });

const openDetail = async (piano: PianoItem = rental()) => {
  fakeBackend.documents.set(piano.$id, { ...piano });
  const store = createTestStore({ user: testUser, items: [piano] });
  const renderer = renderWithStore(<DetailScreen />, store);
  await flushPromises();
  return { store, renderer };
};

const has = (renderer: ReactTestRenderer, text: string) =>
  allTexts(renderer.root).includes(text);
const hasDueLine = (renderer: ReactTestRenderer) =>
  allTexts(renderer.root).some((text) => /rent is paid up| due · /i.test(text));
// One entry per control: a button is a few components deep, each passing the
// label and onPress on to the next
const isButton = (label: string) => (node: any) =>
  !!node &&
  node.props.accessibilityLabel === label &&
  typeof node.props.onPress === "function";
const buttons = (renderer: ReactTestRenderer, label: string) =>
  renderer.root.findAll(
    (node) => isButton(label)(node) && !isButton(label)(node.parent)
  );
const sentText = () => {
  const [url] = jest.mocked(Linking.openURL).mock.calls[0] as [string];
  const [, text] = url.match(/\?text=(.*)$/) ?? [];
  return decodeURIComponent(text ?? "");
};

describe("the balance in a rented piano's Rental section", () => {
  it("says how much is due when nothing has been paid for the month", async () => {
    const { renderer } = await openDetail();

    expect(has(renderer, "₹4,000 due · 1 month, since 1 Sep")).toBe(true);
  });

  it("says how much is due after a payment, counting the months up to now", async () => {
    seedPayment("aug", "2026-08-02", 4000);
    const { renderer } = await openDetail();

    expect(has(renderer, "₹4,000 due · 1 month, since 1 Sep")).toBe(true);
  });

  it("says a part payment leaves the rest due", async () => {
    seedPayment("aug", "2026-08-02", 3000);
    const { renderer } = await openDetail();

    expect(has(renderer, "₹5,000 due · 2 months, since 1 Aug")).toBe(true);
  });

  it("says the rent is paid up when it is", async () => {
    seedPayment("aug", "2026-08-02", 4000);
    seedPayment("sep", "2026-09-03", 4000);
    const { renderer } = await openDetail();

    expect(has(renderer, "Rent is paid up")).toBe(true);
    expect(allTexts(renderer.root).some((text) => / due · /.test(text))).toBe(false);
  });

  it("says how much is paid ahead", async () => {
    seedPayment("aug", "2026-08-02", 4000);
    seedPayment("sep", "2026-09-03", 8000);
    const { renderer } = await openDetail();

    expect(has(renderer, "Rent is paid up, ₹4,000 ahead")).toBe(true);
  });

  it("is in red when rent is due, and plain when it isn't", async () => {
    const colourOf = (renderer: ReactTestRenderer, text: string) =>
      StyleSheet.flatten(
        renderer.root.findAll(
          (node: any) => typeof node.type === "string" && node.children?.includes?.(text)
        )[0].props.style
      ).color;

    const due = await openDetail();
    expect(colourOf(due.renderer, "₹4,000 due · 1 month, since 1 Sep")).toBe(colors.late);

    seedPayment("aug", "2026-08-02", 4000);
    seedPayment("sep", "2026-09-03", 4000);
    const paid = await openDetail();
    expect(colourOf(paid.renderer, "Rent is paid up")).toBe(colors.ink2);
  });

  it("is not there when the payments couldn't be loaded, since without them everything looks owed", async () => {
    fakeBackend.missingCollections.add("rent_payments");
    const { renderer } = await openDetail();

    expect(has(renderer, "Couldn't load payments")).toBe(true);
    expect(hasDueLine(renderer)).toBe(false);
  });

  it("is not there for a rental with no rent, no start date or no end date", async () => {
    for (const extra of [
      { rental_price: null },
      { rental_period_start: null },
      { rental_period_end: null },
    ]) {
      const { renderer } = await openDetail(rental(extra as any));
      expect(hasDueLine(renderer)).toBe(false);
    }
  });

  it("is not there for a piano that isn't a rental", async () => {
    const { renderer } = await openDetail(
      makePiano({ $id: "piano-1", category: "warehouse" })
    );

    expect(hasDueLine(renderer)).toBe(false);
  });
});

describe("reminding when rent is due", () => {
  it("shows Send reminder for a rental with months to go, once rent is due", async () => {
    const { renderer } = await openDetail();

    expect(buttons(renderer, "Send reminder")).toHaveLength(1);
  });

  it("doesn't once the rent is paid up", async () => {
    seedPayment("aug", "2026-08-02", 4000);
    seedPayment("sep", "2026-09-03", 4000);
    const { renderer } = await openDetail();

    expect(buttons(renderer, "Send reminder")).toHaveLength(0);
  });

  it("types how much is due into the message, from Send reminder", async () => {
    seedPayment("aug", "2026-08-02", 3000);
    const { renderer } = await openDetail();

    await act(async () => {
      await buttons(renderer, "Send reminder")[0].props.onPress();
    });
    await flushPromises();

    expect(sentText()).toContain(
      "₹5,000 of the rent is due (2 months, since 1 Aug 2026)."
    );
  });

  it("types it into the message from the Remind customer row too", async () => {
    const { renderer } = await openDetail();

    await act(async () => {
      await buttons(renderer, "Remind customer")[0].props.onPress();
    });
    await flushPromises();

    expect(sentText()).toContain(
      "₹4,000 of the rent is due (1 month, since 1 Sep 2026)."
    );
  });

  it("says nothing about rent in the message when the payments haven't loaded", async () => {
    fakeBackend.missingCollections.add("rent_payments");
    const { renderer } = await openDetail();

    await act(async () => {
      await buttons(renderer, "Remind customer")[0].props.onPress();
    });
    await flushPromises();

    expect(sentText()).not.toContain("of the rent is due");
  });
});
