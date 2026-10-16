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
  usePathname: jest.fn(() => "/edit/piano-1"),
}));
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));
jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));

import React from "react";
import { act, ReactTestRenderer } from "react-test-renderer";
import DetailScreen from "@/app/detail/[id]";
import EditScreen from "@/app/edit/[id]";
import { PianoItem } from "@/redux/pianos/types";
import { a11yProblems, describeProblems } from "./helpers/a11y";
import { fakeBackend, fileViewUrl } from "./helpers/fakeAppwrite";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  captureToastCalls,
  chooseCategory,
  createTestStore,
  flushPromises,
  inputValue,
  pickDate,
  pressLabel,
  pressText,
  renderWithStore,
  typeInto,
} from "./helpers/render";

/**
 * Security deposits, part 1 (canvas page "Security deposits"): noting a
 * deposit on a rental in Add and Edit, seeing it on the piano's page, and
 * what happens to it when the rental ends. Today is 29 September 2026.
 */

const rental = (extra: Record<string, unknown> = {}) =>
  makePiano({
    $id: "piano-1",
    title: "Kawai K-300",
    category: "rentable",
    creator: testUser.accountId,
    rental_customer_name: "Asha Mehta",
    rental_customer_mobile: "9876543210",
    rental_customer_address: "12 MG Road",
    rental_period_start: "2026-09-01" as any,
    rental_period_end: "2027-02-28" as any,
    rental_price: 4500,
    ...extra,
  });

const withDeposit = (extra: Record<string, unknown> = {}) =>
  rental({ rental_deposit: 9000, deposit_received_on: "2026-09-01" as any, ...extra });

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date(2026, 8, 29, 12, 0, 0),
    doNotFake: ["setImmediate", "nextTick"],
  });
  jest.clearAllMocks();
  fakeBackend.reset();
  fakeNotifications.reset();
  fakeBackend.files.set("old-file", { name: "old.jpg", type: "image/jpeg", size: 10, uri: "file:///old.jpg" });
  captureAlerts();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const saved = () => fakeBackend.documents.get("piano-1") as any;
const kept = () => [...fakeBackend.history.values()] as any[];
const has = (renderer: ReactTestRenderer, text: string) => allTexts(renderer.root).includes(text);
const labelled = (renderer: ReactTestRenderer, label: string) =>
  renderer.root.findAll((node) => node.props.accessibilityLabel === label && typeof node.props.onPress === "function");

const openEdit = (piano: PianoItem = rental()) => {
  fakeBackend.documents.set(piano.$id, { ...piano, image_url: fileViewUrl("old-file") });
  const store = createTestStore({ user: testUser, items: [piano] });
  return { renderer: renderWithStore(<EditScreen />, store), store };
};

const openDetail = async (piano: PianoItem, history: Record<string, unknown>[] = []) => {
  fakeBackend.documents.set(piano.$id, { ...piano });
  history.forEach((entry, i) =>
    fakeBackend.history.set(`h-${i}`, { $id: `h-${i}`, $createdAt: "2026-08-01T00:00:00.000+00:00", ...entry })
  );
  const store = createTestStore({ user: testUser, items: [piano] });
  const renderer = renderWithStore(<DetailScreen />, store);
  await flushPromises();
  return { renderer, store };
};

describe("the Deposit row on the rental form", () => {
  it("is there, empty, with a hint that it is optional and isn't income", async () => {
    const { renderer } = openEdit();

    expect(inputValue(renderer.root, "Deposit")).toBe("");
    expect(
      has(
        renderer,
        "Optional. A deposit is refundable and held until the piano comes back. It is not counted as income. Leave it empty for no deposit."
      )
    ).toBe(true);
    // No day to say when it came until there is a deposit
    expect(labelled(renderer, "Received, 1 Sep 2026")).toEqual([]);
    expect(allTexts(renderer.root)).not.toContain("Received");
  });

  it("is not on the form of another kind of piano", async () => {
    const { renderer } = openEdit(makePiano({ $id: "piano-1", category: "warehouse" }));

    expect(() => inputValue(renderer.root, "Deposit")).toThrow();
  });

  it("offers two months' rent, and fills it in when pressed", async () => {
    const { renderer } = openEdit();
    expect(has(renderer, "2 months’ rent · ₹9,000")).toBe(true);

    await pressLabel(renderer.root, "Use 2 months’ rent as the deposit, ₹9,000");

    expect(inputValue(renderer.root, "Deposit")).toBe("9,000");
    // Once it is that, there is nothing to offer
    expect(has(renderer, "2 months’ rent · ₹9,000")).toBe(false);
  });

  it("offers nothing until there is a rent", async () => {
    const { renderer } = openEdit(rental({ rental_price: null }));

    expect(allTexts(renderer.root).some((text) => text.startsWith("2 months’ rent"))).toBe(false);
  });

  it("follows the rent typed", async () => {
    const { renderer } = openEdit();
    typeInto(renderer.root, "Rent", "5,000");

    expect(has(renderer, "2 months’ rent · ₹10,000")).toBe(true);
  });

  it("asks when it was received once there is a deposit, and says so on the row", async () => {
    const { renderer } = openEdit();
    typeInto(renderer.root, "Deposit", "9000");

    expect(inputValue(renderer.root, "Deposit")).toBe("9,000");
    expect(has(renderer, "Received")).toBe(true);
  });

  it("can't have been received in the future", async () => {
    const { renderer } = openEdit(withDeposit());
    await pressLabel(renderer.root, "Received, 1 Sep 2026");

    const calendar = renderer.root.findAll(
      (node) => (node.props as any).title === "Deposit received on" && (node.props as any).visible === true
    )[0];
    expect(calendar.props.maximumDate.getFullYear()).toBe(2026);
  });

  it("says what a new rental does with a deposit that is held, only when one is", async () => {
    const note =
      "Changing the start date starts a new rental. It starts with no deposit unless you change this one, and the old one is kept in Previous renters, not settled.";
    expect(has(openEdit(withDeposit()).renderer, note)).toBe(true);
    expect(has(openEdit().renderer, note)).toBe(false);
  });
});

describe("saving a deposit on the Edit screen", () => {
  it("saves the amount and the day it was received", async () => {
    const { renderer } = openEdit();

    typeInto(renderer.root, "Deposit", "9000");
    await pickDate(renderer.root, "Received", new Date(2026, 8, 3));
    await pressText(renderer.root, "Save changes");
    await flushPromises();

    expect(saved()).toMatchObject({ rental_deposit: 9000, deposit_received_on: "2026-09-03" });
    expect(kept()).toEqual([]);
  });

  it("keeps the deposit when the rental is only extended", async () => {
    const { renderer } = openEdit(withDeposit());

    await pickDate(renderer.root, "Ends", new Date(2027, 5, 1));
    await pressText(renderer.root, "Save changes");
    await flushPromises();

    expect(saved()).toMatchObject({ rental_deposit: 9000, deposit_received_on: "2026-09-01", rental_period_end: "2027-06-01" });
    expect(kept()).toEqual([]);
  });

  it("takes the deposit off when the field is emptied", async () => {
    const { renderer } = openEdit(withDeposit());

    typeInto(renderer.root, "Deposit", "");
    await pressText(renderer.root, "Save changes");
    await flushPromises();

    expect(saved().rental_deposit).toBeNull();
    expect(saved().deposit_received_on).toBeNull();
  });

  it("changes the amount", async () => {
    const { renderer } = openEdit(withDeposit());

    typeInto(renderer.root, "Deposit", "10000");
    await pressText(renderer.root, "Save changes");
    await flushPromises();

    expect(saved()).toMatchObject({ rental_deposit: 10000, deposit_received_on: "2026-09-01" });
  });
});

describe("a rental that ends or is replaced on the Edit screen", () => {
  it("is kept with its deposit, not settled, and the new rental starts without one", async () => {
    const { renderer } = openEdit(withDeposit());

    typeInto(renderer.root, "Customer", "Ravi Kumar");
    await pickDate(renderer.root, "Starts", new Date(2026, 9, 5));
    await pickDate(renderer.root, "Ends", new Date(2027, 0, 5));
    await pressText(renderer.root, "Save changes");
    await flushPromises();

    expect(kept()).toHaveLength(1);
    expect(kept()[0]).toMatchObject({ customer_name: "Asha Mehta", reason: "replaced", deposit: 9000 });
    expect(saved()).toMatchObject({ rental_customer_name: "Ravi Kumar" });
    expect(saved().rental_deposit).toBeNull();
    expect(saved().deposit_received_on).toBeNull();
  });

  it("gives the new rental a deposit when one is typed for it", async () => {
    const { renderer } = openEdit(withDeposit());

    typeInto(renderer.root, "Customer", "Ravi Kumar");
    await pickDate(renderer.root, "Starts", new Date(2026, 9, 5));
    await pickDate(renderer.root, "Ends", new Date(2027, 0, 5));
    typeInto(renderer.root, "Deposit", "12000");
    await pressText(renderer.root, "Save changes");
    await flushPromises();

    expect(kept()[0]).toMatchObject({ customer_name: "Asha Mehta", deposit: 9000 });
    expect(saved()).toMatchObject({ rental_customer_name: "Ravi Kumar", rental_deposit: 12000 });
  });

  it("gives the new rental the deposit when the day it was received is changed to the new day", async () => {
    const { renderer } = openEdit(withDeposit());

    typeInto(renderer.root, "Customer", "Ravi Kumar");
    await pickDate(renderer.root, "Starts", new Date(2026, 9, 5));
    await pickDate(renderer.root, "Ends", new Date(2027, 0, 5));
    await pickDate(renderer.root, "Received", new Date(2026, 9, 5));
    await pressText(renderer.root, "Save changes");
    await flushPromises();

    expect(saved()).toMatchObject({ rental_deposit: 9000, deposit_received_on: "2026-10-05" });
    expect(kept()[0]).toMatchObject({ deposit: 9000 });
  });

  it("is kept with its deposit when the piano is changed into another kind, which has no deposit", async () => {
    const { renderer } = openEdit(withDeposit());

    await chooseCategory(renderer.root, "warehouse");
    await pressText(renderer.root, "Save changes");
    await flushPromises();

    expect(kept()[0]).toMatchObject({ reason: "ended", deposit: 9000 });
    expect(saved().rental_deposit).toBeNull();
    expect(saved().deposit_received_on).toBeNull();
  });

  it("keeps a rental with no deposit as it always was", async () => {
    const { renderer } = openEdit();

    typeInto(renderer.root, "Customer", "Ravi Kumar");
    await pickDate(renderer.root, "Starts", new Date(2026, 9, 5));
    await pickDate(renderer.root, "Ends", new Date(2027, 0, 5));
    await pressText(renderer.root, "Save changes");
    await flushPromises();

    expect(kept()[0]).not.toHaveProperty("deposit");
  });
});

describe("the piano's page", () => {
  it("has the deposit among the rental's rows and says it is held, since when, and isn't income", async () => {
    const { renderer } = await openDetail(withDeposit());

    expect(has(renderer, "Deposit")).toBe(true);
    expect(has(renderer, "₹9,000")).toBe(true);
    expect(has(renderer, "Deposit held since 1 Sep")).toBe(true);
    expect(has(renderer, "Refundable. Not part of your income.")).toBe(true);
  });

  it("says only that it is held when the day it was received isn't known", async () => {
    const { renderer } = await openDetail(rental({ rental_deposit: 9000 }));

    expect(has(renderer, "Deposit held")).toBe(true);
  });

  it("says nothing about a deposit when there is none", async () => {
    const { renderer } = await openDetail(rental());

    expect(has(renderer, "Deposit")).toBe(false);
    expect(allTexts(renderer.root).some((text) => text.startsWith("Deposit held"))).toBe(false);
  });

  it("doesn't count it among the payments or what was received", async () => {
    const { renderer } = await openDetail(withDeposit());

    expect(allTexts(renderer.root).some((text) => text.includes("received"))).toBe(false);
    expect(has(renderer, "₹9,000 received · 1 payment")).toBe(false);
  });

  it("shows a past rental's deposit, not settled, in Previous renters", async () => {
    const { renderer } = await openDetail(rental(), [
      {
        $createdAt: "2026-08-01T00:00:00.000+00:00",
        piano_id: "piano-1",
        creator: testUser.accountId,
        customer_name: "Ravi Kumar",
        period_start: "2025-09-01",
        period_end: "2025-12-01",
        price: 3500,
        deposit: 7000,
        closed_on: "2025-12-02",
        reason: "returned",
      },
      {
        $createdAt: "2026-08-01T00:00:00.000+00:00",
        piano_id: "piano-1",
        creator: testUser.accountId,
        customer_name: "Anita Rao",
        period_start: "2025-01-01",
        period_end: "2025-03-01",
        price: 3500,
        closed_on: "2025-03-02",
        reason: "returned",
      },
    ]);

    expect(has(renderer, "Deposit ₹7,000 · not settled")).toBe(true);
    // Only the rental that held one
    expect(allTexts(renderer.root).filter((text) => text.includes("not settled"))).toHaveLength(1);
    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });
});

describe("marking a piano as returned while a deposit is held", () => {
  const confirm = async (renderer: ReactTestRenderer) => {
    await pressText(renderer.root, "Mark as returned");
    await flushPromises();
    const pressable = labelled(renderer, "Mark as returned").pop()!;
    await act(async () => {
      await pressable.props.onPress();
    });
    await flushPromises();
  };

  it("keeps the deposit in the history, not settled, and takes it off the piano", async () => {
    const { renderer } = await openDetail(withDeposit());

    await confirm(renderer);

    expect(kept()).toHaveLength(1);
    expect(kept()[0]).toMatchObject({ customer_name: "Asha Mehta", reason: "returned", deposit: 9000 });
    expect(saved().rental_deposit).toBeNull();
    expect(saved().deposit_received_on).toBeNull();
    expect(saved().rental_customer_name).toBeNull();
  });

  it("takes the deposit back to the piano with Undo, and the kept rental away", async () => {
    const toasts = captureToastCalls();
    const { renderer } = await openDetail(withDeposit());
    await confirm(renderer);
    expect(kept()).toHaveLength(1);

    const undo = toasts.find((toast) => toast.action?.label === "Undo")!;
    await act(async () => {
      await undo.action!.onPress();
    });
    await flushPromises();

    expect(saved()).toMatchObject({
      rental_customer_name: "Asha Mehta",
      rental_deposit: 9000,
      deposit_received_on: "2026-09-01",
    });
    expect(kept()).toEqual([]);
  });

  it("keeps a return with no deposit as it was", async () => {
    const { renderer } = await openDetail(rental());

    await confirm(renderer);

    expect(kept()[0]).not.toHaveProperty("deposit");
  });
});
