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

import { addDays } from "date-fns";
import React from "react";
import { Alert, StyleSheet } from "react-native";
import { act, ReactTestRenderer } from "react-test-renderer";
import { useLocalSearchParams } from "expo-router";
import CustomerScreen from "@/app/customer/[key]";
import DetailScreen from "@/app/detail/[id]";
import { PianoItem } from "@/redux/pianos/types";
import { toStoredDate } from "@/utils/dates";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import { a11yProblems, describeProblems } from "./helpers/a11y";
import {
  allTexts,
  atFontScale,
  captureToastCalls,
  createTestStore,
  dialogOf,
  findButton,
  flushPromises,
  pickDate,
  pressDialog,
  pressLabel,
  renderWithStore,
  typeInto,
} from "./helpers/render";

/**
 * Fixing a wrong entry in a piano's history (Batch 38): a kept rental is
 * pressed and held on the piano's Previous renters and on the customer's
 * Rental history, to edit it or delete it, each with Undo.
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
    reason: "replaced",
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
  (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "piano-1" });
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

const open = async (screen: React.ReactElement, pianos: PianoItem[] = [rental]) => {
  for (const piano of pianos) fakeBackend.documents.set(piano.$id, { ...piano });
  const renderer = renderWithStore(screen, createTestStore({ user: testUser, items: pianos }));
  await flushPromises();
  return renderer;
};

const has = (renderer: ReactTestRenderer, text: string) => allTexts(renderer.root).includes(text);

/** Lets a closing sheet's 300 ms pass, so what it chose opens. */
const sheetCloses = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 350)));

const longPress = async (renderer: ReactTestRenderer, labelStart: string) => {
  const node = renderer.root.find(
    (candidate) =>
      typeof candidate.props.onLongPress === "function" &&
      typeof candidate.props.accessibilityLabel === "string" &&
      candidate.props.accessibilityLabel.startsWith(labelStart)
  );
  await act(async () => node.props.onLongPress());
  await flushPromises();
};

const press = async (renderer: ReactTestRenderer, title: string) => {
  await act(async () => {
    findButton(renderer.root, title).props.onPress();
  });
  await flushPromises();
};

/** Presses and holds the kept rental, and chooses Edit rental. */
const startEditing = async (renderer: ReactTestRenderer, labelStart = "Ravi Kumar") => {
  await longPress(renderer, labelStart);
  await pressLabel(renderer.root, "Edit rental");
  await sheetCloses();
};

describe("a kept rental on a piano's page", () => {
  it("is pressed and held for a menu with Edit rental and Delete rental, and says so", async () => {
    keep("h1");
    const renderer = await open(<DetailScreen />);

    expect(has(renderer, "Previous renters")).toBe(true);
    expect(has(renderer, "Press and hold a kept rental to edit or delete it.")).toBe(true);
    await longPress(renderer, "Ravi Kumar");

    expect(has(renderer, "Ravi Kumar, 1 Feb 2026 to 31 May 2026")).toBe(true);
    expect(has(renderer, "Edit rental")).toBe(true);
    expect(has(renderer, "Delete rental")).toBe(true);
  });

  it("still opens the customer when it is tapped", async () => {
    keep("h1");
    const { router } = require("expo-router");
    const renderer = await open(<DetailScreen />);

    await pressLabel(renderer.root, "Ravi Kumar, 1 Feb 2026 to 31 May 2026 · ₹3,500 rent");

    expect(router.push).toHaveBeenCalledWith("/customer/ravi%20kumar");
  });

  it("opens Edit rental with what was kept, and saves only what was changed, with Undo", async () => {
    const toasts = captureToastCalls();
    keep("h1");
    const renderer = await open(<DetailScreen />);

    await startEditing(renderer);
    expect(has(renderer, "Edit rental")).toBe(true);
    expect(has(renderer, "Kawai K-300")).toBe(true);
    typeInto(renderer.root, "Customer", "Ravi Kumar Singh");
    typeInto(renderer.root, "Rent", "4,000");
    await press(renderer, "Save changes");

    expect(fakeBackend.history.get("h1")).toMatchObject({
      customer_name: "Ravi Kumar Singh",
      price: 4000,
      customer_mobile: "9811020513",
      period_start: "2026-02-01",
      period_end: "2026-05-31",
      closed_on: "2026-06-01",
      reason: "replaced",
    });
    expect(toasts).toEqual([expect.objectContaining({ message: "Rental updated", variant: "success" })]);
    expect(has(renderer, "Ravi Kumar Singh")).toBe(true);
    expect(has(renderer, "₹4,000 rent")).toBe(false);
    expect(allTexts(renderer.root).some((text) => text.includes("₹4,000 rent"))).toBe(true);

    await act(async () => toasts[0].action!.onPress());
    await flushPromises();
    expect(fakeBackend.history.get("h1")).toMatchObject({ customer_name: "Ravi Kumar", price: 3500 });
    expect(has(renderer, "Ravi Kumar")).toBe(true);
  });

  it("fixes a wrong date by choosing another, and Save changes waits until something differs", async () => {
    keep("h1");
    const renderer = await open(<DetailScreen />);

    await startEditing(renderer);
    const save = findButton(renderer.root, "Save changes");
    expect(save.props.disabled || save.props.accessibilityState?.disabled).toBeTruthy();
    await pickDate(renderer.root, "Ends", new Date(2026, 4, 15));
    await press(renderer, "Save changes");

    expect(fakeBackend.history.get("h1")).toMatchObject({ period_end: "2026-05-15", period_start: "2026-02-01" });
    expect(has(renderer, "1 Feb 2026 to 15 May 2026 · ₹3,500 rent")).toBe(true);
  });

  it("takes a detail off when it is emptied", async () => {
    keep("h1");
    const renderer = await open(<DetailScreen />);

    await startEditing(renderer);
    typeInto(renderer.root, "Mobile", "");
    typeInto(renderer.root, "Address", "");
    typeInto(renderer.root, "Rent", "");
    await press(renderer, "Save changes");

    const row = fakeBackend.history.get("h1")!;
    expect([row.customer_mobile, row.customer_address, row.price]).toEqual([null, null, null]);
    expect(row.customer_name).toBe("Ravi Kumar");
  });

  it("asks for a real number, and for an end that isn't before the start, and saves nothing until then", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    keep("h1");
    const renderer = await open(<DetailScreen />);

    await startEditing(renderer);
    typeInto(renderer.root, "Mobile", "98765");
    await press(renderer, "Save changes");
    expect(alert).toHaveBeenLastCalledWith("Check the rental details", "Please enter a 10-digit mobile number, or leave it empty.");

    typeInto(renderer.root, "Mobile", "9811020513");
    await pickDate(renderer.root, "Starts", new Date(2026, 5, 15));
    await press(renderer, "Save changes");
    expect(alert).toHaveBeenLastCalledWith("Check the rental details", "The end date can’t be before the start date.");
    expect(fakeBackend.history.get("h1")).toMatchObject({ period_start: "2026-02-01", period_end: "2026-05-31" });
  });

  it("keeps the sheet open when saving fails, so Save changes can be pressed again", async () => {
    const toasts = captureToastCalls();
    keep("h1");
    const renderer = await open(<DetailScreen />);

    await startEditing(renderer);
    typeInto(renderer.root, "Rent", "4000");
    fakeBackend.failNextDocumentUpdate = true;
    await press(renderer, "Save changes");

    expect(toasts).toEqual([expect.objectContaining({ message: "Couldn’t save. Check your connection.", variant: "error" })]);
    expect(fakeBackend.history.get("h1")).toMatchObject({ price: 3500 });
    const sheet = renderer.root.findAll((node) => node.props.title === "Edit rental" && "visible" in node.props).pop()!;
    expect(sheet.props.visible).toBe(true);

    await press(renderer, "Save changes");
    expect(fakeBackend.history.get("h1")).toMatchObject({ price: 4000 });
  });

  it("deletes a kept rental after asking, and Undo keeps it again as it was", async () => {
    const toasts = captureToastCalls();
    keep("h1");
    const renderer = await open(<DetailScreen />);

    await longPress(renderer, "Ravi Kumar");
    await pressLabel(renderer.root, "Delete rental");
    await sheetCloses();
    const dialog = dialogOf(renderer.root);
    expect(dialog?.title).toBe("Delete this rental?");
    expect(dialog?.message).toContain("Ravi Kumar, 1 Feb 2026 to 31 May 2026");
    expect(dialog?.message).toContain("Kawai K-300");
    await pressDialog(renderer.root, "Delete");
    await flushPromises();

    expect(fakeBackend.history.size).toBe(0);
    expect(has(renderer, "Previous renters")).toBe(false);
    const deleted = toasts.find((toast) => toast.message === "Rental deleted")!;
    await act(async () => deleted.action!.onPress());
    await flushPromises();

    expect([...fakeBackend.history.values()]).toEqual([
      expect.objectContaining({
        piano_id: "piano-1",
        creator: testUser.accountId,
        customer_name: "Ravi Kumar",
        customer_mobile: "9811020513",
        customer_address: "12 MG Road",
        period_start: "2026-02-01",
        period_end: "2026-05-31",
        price: 3500,
        closed_on: "2026-06-01",
        reason: "replaced",
      }),
    ]);
    expect(toasts.map((toast) => toast.message)).toContain("Rental restored");
    expect(has(renderer, "Previous renters")).toBe(true);
  });

  it("changes nothing when the deletion is cancelled", async () => {
    keep("h1");
    const renderer = await open(<DetailScreen />);

    await longPress(renderer, "Ravi Kumar");
    await pressLabel(renderer.root, "Delete rental");
    await sheetCloses();
    await pressDialog(renderer.root, "Cancel");

    expect(fakeBackend.history.size).toBe(1);
  });

  it("is offered to a screen reader as actions on the row", async () => {
    keep("h1");
    const renderer = await open(<DetailScreen />);
    const row = renderer.root.find(
      (node) => typeof node.props.onLongPress === "function" && String(node.props.accessibilityLabel).startsWith("Ravi Kumar")
    );

    expect(row.props.accessibilityActions).toEqual([
      { name: "edit", label: "Edit rental" },
      { name: "delete", label: "Delete rental" },
    ]);
    await act(async () => row.props.onAccessibilityAction({ nativeEvent: { actionName: "edit" } }));
    expect(has(renderer, "Edit rental")).toBe(true);
    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });

  it("can be fixed even when it has no name, and a rental with no name opens nobody", async () => {
    const { router } = require("expo-router");
    keep("h2", { customer_name: null, customer_mobile: null, customer_address: null });
    const renderer = await open(<DetailScreen />);

    await longPress(renderer, "Someone");
    await pressLabel(renderer.root, "Edit rental");
    await sheetCloses();
    typeInto(renderer.root, "Customer", "Meera Kapoor");
    await press(renderer, "Save changes");

    expect(fakeBackend.history.get("h2")).toMatchObject({ customer_name: "Meera Kapoor" });
    expect(router.push).not.toHaveBeenCalled();
  });

  it("has nothing to hold for someone known only from the piano's payments", async () => {
    fakeBackend.payments.set("r1", {
      $id: "r1",
      $createdAt: "2026-09-01T00:00:00.000+00:00",
      piano_id: "piano-1",
      creator: testUser.accountId,
      amount: 3500,
      paid_on: "2026-05-02",
      customer_name: "Meera Kapoor",
    });
    const renderer = await open(<DetailScreen />);

    expect(has(renderer, "Previous renters")).toBe(true);
    expect(has(renderer, "Press and hold a kept rental to edit or delete it.")).toBe(false);
    expect(
      renderer.root.findAll(
        (node) => typeof node.props.onLongPress === "function" && String(node.props.accessibilityLabel).startsWith("Meera Kapoor")
      )
    ).toHaveLength(0);
  });
});

describe("a kept rental on a customer's page", () => {
  const openCustomer = async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ key: "ravi kumar" });
    return open(<CustomerScreen />);
  };

  it("is pressed and held in the Rental history, to edit it", async () => {
    const toasts = captureToastCalls();
    keep("h1");
    const renderer = await openCustomer();

    expect(has(renderer, "Rental history")).toBe(true);
    expect(has(renderer, "Press and hold a rental to edit or delete it.")).toBe(true);
    await longPress(renderer, "Kawai K-300, 1 Feb 2026 to 31 May 2026");
    await pressLabel(renderer.root, "Edit rental");
    await sheetCloses();
    await pickDate(renderer.root, "Starts", new Date(2026, 0, 20));
    await press(renderer, "Save changes");

    expect(fakeBackend.history.get("h1")).toMatchObject({ period_start: "2026-01-20" });
    expect(toasts.map((toast) => toast.message)).toContain("Rental updated");
    expect(has(renderer, "20 Jan 2026 to 31 May 2026 · ₹3,500 rent")).toBe(true);
  });

  it("is deleted after asking, and the customer goes when nothing else is left of them", async () => {
    keep("h1");
    const renderer = await openCustomer();

    await longPress(renderer, "Kawai K-300");
    await pressLabel(renderer.root, "Delete rental");
    await sheetCloses();
    expect(dialogOf(renderer.root)?.message).toContain("history of Kawai K-300");
    await pressDialog(renderer.root, "Delete");
    await flushPromises();

    expect(fakeBackend.history.size).toBe(0);
    expect(has(renderer, "Customer not found")).toBe(true);
  });
});

describe("with a big Font size", () => {
  atFontScale(1.5);

  it("lets the rows of the press-and-hold menu grow with their words", async () => {
    keep("h1");
    const renderer = await open(<DetailScreen />);

    await longPress(renderer, "Ravi Kumar");
    const edit = renderer.root.find(
      (node) => node.props.accessibilityLabel === "Edit rental" && typeof node.props.onPress === "function"
    );
    const style = StyleSheet.flatten(edit.props.style({ pressed: false }));
    expect(style.height).toBeUndefined();
    expect(style.minHeight).toBe(52);
  });
});
