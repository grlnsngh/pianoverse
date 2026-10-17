jest.mock("expo-notifications", () => require("./helpers/fakeNotifications").createFakeNotificationsModule());
jest.mock("react-native-appwrite", () => require("./helpers/fakeAppwrite").createFakeAppwriteModule());
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

import { addDays } from "date-fns";
import React from "react";
import { Alert } from "react-native";
import { act, ReactTestRenderer } from "react-test-renderer";
import DetailScreen from "@/app/detail/[id]";
import { PianoItem } from "@/redux/pianos/types";
import { toStoredDate } from "@/utils/dates";
import { a11yProblems, describeProblems } from "./helpers/a11y";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  atFontScale,
  captureToastCalls,
  createTestStore,
  findButton,
  flushPromises,
  inputValue,
  pressLabel,
  renderWithStore,
  typeInto,
} from "./helpers/render";

/**
 * Settling a deposit after a rental has ended (canvas page "Security
 * deposits"): the line under a past renter says how it ended, and Edit rental
 * settles one that wasn't, or corrects one that was, each with Undo.
 */

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

const keep = (id: string, extra: Record<string, unknown> = {}) =>
  fakeBackend.history.set(id, {
    $id: id,
    $createdAt: "2026-09-01T00:00:00.000+00:00",
    piano_id: "piano-1",
    creator: testUser.accountId,
    closed_on: "2026-06-01",
    reason: "returned",
    customer_name: "Ravi Kumar",
    customer_mobile: "9811020513",
    customer_address: "12 MG Road",
    period_start: "2026-02-01",
    period_end: "2026-05-31",
    price: 3500,
    ...extra,
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

const open = async (pianos: PianoItem[] = [rental]) => {
  for (const piano of pianos) fakeBackend.documents.set(piano.$id, { ...piano });
  const renderer = renderWithStore(<DetailScreen />, createTestStore({ user: testUser, items: pianos }));
  await flushPromises();
  return renderer;
};

const has = (renderer: ReactTestRenderer, text: string) => allTexts(renderer.root).includes(text);
const sheetCloses = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 350)));
const press = async (renderer: ReactTestRenderer, title: string) => {
  await act(async () => {
    findButton(renderer.root, title).props.onPress();
  });
  await flushPromises();
};
const startEditing = async (renderer: ReactTestRenderer) => {
  const node = renderer.root.find(
    (candidate) =>
      typeof candidate.props.onLongPress === "function" &&
      typeof candidate.props.accessibilityLabel === "string" &&
      candidate.props.accessibilityLabel.startsWith("Ravi Kumar")
  );
  await act(async () => node.props.onLongPress());
  await flushPromises();
  await pressLabel(renderer.root, "Edit rental");
  await sheetCloses();
};

describe("the line under a past renter", () => {
  it.each([
    ["is not settled until it says how it ended, in orange", {}, "Deposit ₹9,000 · not settled"],
    ["says it was refunded in full", { deposit_refunded: 9000 }, "Deposit ₹9,000 · refunded in full"],
    [
      "says what was refunded and what was kept, and for what",
      { deposit_refunded: 4500, deposit_note: "unpaid rent" },
      "Deposit ₹9,000 · refunded ₹4,500, kept ₹4,500 for unpaid rent",
    ],
    ["says what was kept without a reason", { deposit_refunded: 7000 }, "Deposit ₹9,000 · refunded ₹7,000, kept ₹2,000"],
    ["says when nothing was refunded", { deposit_refunded: 0 }, "Deposit ₹9,000 · none refunded"],
    [
      "says when nothing was refunded and why",
      { deposit_refunded: 0, deposit_note: "unpaid rent and damage" },
      "Deposit ₹9,000 · none refunded, kept for unpaid rent and damage",
    ],
  ])("%s", async (_name, extra, line) => {
    keep("h1", { deposit: 9000, ...extra });
    const renderer = await open();

    expect(has(renderer, line)).toBe(true);
  });

  it("is in the row's name for a screen reader, and the row is usable", async () => {
    keep("h1", { deposit: 9000, deposit_refunded: 9000 });
    const renderer = await open();

    expect(
      renderer.root.findAll(
        (node) =>
          typeof node.props.accessibilityLabel === "string" &&
          node.props.accessibilityLabel.includes("Deposit ₹9,000 · refunded in full")
      ).length
    ).toBeGreaterThan(0);
    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });

  it("has no line for a rental that held no deposit", async () => {
    keep("h1");
    const renderer = await open();

    expect(allTexts(renderer.root).some((text) => text.startsWith("Deposit ₹"))).toBe(false);
  });
});

describe("Edit rental, for a deposit", () => {
  it("shows the deposit of the rental, and says it is not settled", async () => {
    keep("h1", { deposit: 9000 });
    const renderer = await open();

    await startEditing(renderer);

    expect(has(renderer, "Deposit")).toBe(true);
    expect(inputValue(renderer.root, "Deposit")).toBe("9,000");
    expect(inputValue(renderer.root, "Refunded")).toBe("");
    expect(allTexts(renderer.root)).not.toContain("Kept");
    expect(has(renderer, "Kept is the deposit less what you refunded. Saying what was refunded settles the deposit.")).toBe(true);
  });

  it("settles it by saying what was refunded, and shows what was kept", async () => {
    const toasts = captureToastCalls();
    keep("h1", { deposit: 9000 });
    const renderer = await open();

    await startEditing(renderer);
    typeInto(renderer.root, "Refunded", "7000");
    expect(inputValue(renderer.root, "Refunded")).toBe("7,000");
    expect(has(renderer, "Kept")).toBe(true);
    expect(has(renderer, "₹2,000")).toBe(true);
    await press(renderer, "Save changes");

    expect(fakeBackend.history.get("h1")).toMatchObject({ deposit: 9000, deposit_refunded: 7000 });
    expect(toasts[0]).toMatchObject({ message: "Rental updated", variant: "success" });
    expect(has(renderer, "Deposit ₹9,000 · refunded ₹7,000, kept ₹2,000")).toBe(true);

    // Undo puts it back as it was: not settled
    await act(async () => toasts[0].action!.onPress());
    await flushPromises();
    expect(fakeBackend.history.get("h1")!.deposit_refunded).toBeNull();
    expect(has(renderer, "Deposit ₹9,000 · not settled")).toBe(true);
  });

  it("settles it with nothing refunded when 0 is typed, which isn't the same as empty", async () => {
    keep("h1", { deposit: 9000 });
    const renderer = await open();

    await startEditing(renderer);
    typeInto(renderer.root, "Refunded", "0");
    await press(renderer, "Save changes");

    expect(fakeBackend.history.get("h1")).toMatchObject({ deposit: 9000, deposit_refunded: 0 });
    expect(has(renderer, "Deposit ₹9,000 · none refunded")).toBe(true);
  });

  it("makes it not settled again when the refund is emptied, forgetting why part was kept", async () => {
    keep("h1", { deposit: 9000, deposit_refunded: 4500, deposit_note: "unpaid rent" });
    const renderer = await open();

    await startEditing(renderer);
    expect(inputValue(renderer.root, "Refunded")).toBe("4,500");
    typeInto(renderer.root, "Refunded", "");
    await press(renderer, "Save changes");

    const row = fakeBackend.history.get("h1")!;
    expect(row.deposit_refunded).toBeNull();
    expect(row.deposit_note).toBeNull();
    expect(has(renderer, "Deposit ₹9,000 · not settled")).toBe(true);
  });

  it("changes the amount that was held", async () => {
    keep("h1", { deposit: 9000, deposit_refunded: 9000 });
    const renderer = await open();

    await startEditing(renderer);
    typeInto(renderer.root, "Deposit", "10000");
    await press(renderer, "Save changes");

    expect(fakeBackend.history.get("h1")).toMatchObject({ deposit: 10000, deposit_refunded: 9000 });
    expect(has(renderer, "Deposit ₹10,000 · refunded ₹9,000, kept ₹1,000")).toBe(true);
  });

  it("takes the deposit off when it is emptied, with what was refunded and why", async () => {
    keep("h1", { deposit: 9000, deposit_refunded: 4500, deposit_note: "unpaid rent" });
    const renderer = await open();

    await startEditing(renderer);
    typeInto(renderer.root, "Deposit", "");
    expect(allTexts(renderer.root)).not.toContain("Refunded");
    await press(renderer, "Save changes");

    const row = fakeBackend.history.get("h1")!;
    expect([row.deposit, row.deposit_refunded, row.deposit_note]).toEqual([null, null, null]);
    expect(allTexts(renderer.root).some((text) => text.startsWith("Deposit ₹"))).toBe(false);
  });

  it("adds a deposit to a rental that had none", async () => {
    keep("h1");
    const renderer = await open();

    await startEditing(renderer);
    expect(allTexts(renderer.root)).not.toContain("Refunded");
    typeInto(renderer.root, "Deposit", "6000");
    await press(renderer, "Save changes");

    expect(fakeBackend.history.get("h1")).toMatchObject({ deposit: 6000 });
    expect(has(renderer, "Deposit ₹6,000 · not settled")).toBe(true);
  });

  it("can't refund more than the deposit, and saves nothing until it is right", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    keep("h1", { deposit: 9000 });
    const renderer = await open();

    await startEditing(renderer);
    typeInto(renderer.root, "Refunded", "12000");
    await press(renderer, "Save changes");

    expect(alert).toHaveBeenLastCalledWith("Check the rental details", "The refund can’t be more than the deposit.");
    expect(fakeBackend.history.get("h1")!.deposit_refunded).toBeUndefined();
  });

  it("only sends what was changed", async () => {
    keep("h1", { deposit: 9000, deposit_note: "damage" });
    const renderer = await open();

    await startEditing(renderer);
    typeInto(renderer.root, "Refunded", "8000");
    await press(renderer, "Save changes");

    expect(fakeBackend.history.get("h1")).toMatchObject({
      price: 3500,
      deposit: 9000,
      deposit_refunded: 8000,
      deposit_note: "damage",
    });
  });

  it("is usable: named, a role, big enough", async () => {
    keep("h1", { deposit: 9000 });
    const renderer = await open();
    await startEditing(renderer);

    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });
});

describe("Edit rental at 150% text", () => {
  atFontScale(1.5);

  it("keeps the deposit rows and their labels whole", async () => {
    keep("h1", { deposit: 9000, deposit_refunded: 4500 });
    const renderer = await open();
    await startEditing(renderer);

    expect(has(renderer, "Refunded")).toBe(true);
    expect(has(renderer, "Kept")).toBe(true);
    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });
});
