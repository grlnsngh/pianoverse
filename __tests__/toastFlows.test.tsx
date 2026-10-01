jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ id: "piano-1" })),
  useNavigation: jest.fn(() => ({ setOptions: jest.fn(), addListener: jest.fn(() => jest.fn()) })),
  usePathname: jest.fn(() => "/detail/piano-1"),
}));

import React from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { act, ReactTestRenderer } from "react-test-renderer";
import { addDays, addMonths, format, startOfToday } from "date-fns";
import DetailScreen from "@/app/detail/[id]";
import ToastHost from "@/components/ToastHost";
import { Dialog, Sheet } from "@/components/ui";
import { toStoredDate } from "@/utils/dates";
import { showDialog } from "@/utils/dialog";
import { showToast } from "@/utils/toast";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  captureAlerts,
  captureToastCalls,
  createTestStore,
  flushPromises,
  pressDialog,
  pressLabel,
  renderWithStore,
} from "./helpers/render";
import { textContent } from "./helpers/ui";

const flat = (style: unknown) => StyleSheet.flatten(style as any);
const day = (offset: number) => toStoredDate(addDays(startOfToday(), offset)) as any;
const label = (date: Date) => format(date, "d MMM yyyy");

const END = addDays(startOfToday(), 30);
const rental = makePiano({
  $id: "piano-1",
  title: "Kawai K-300",
  category: "rentable",
  rental_customer_name: "Asha Mehta",
  rental_customer_mobile: "9876543210",
  rental_period_start: day(-30),
  rental_period_end: day(30),
  rental_price: 4000,
});
const soldPiano = makePiano({
  $id: "piano-1",
  title: "Kawai K-300",
  category: "rentable",
  rental_period_start: day(-30),
  rental_period_end: day(30),
  sold_date: day(-2),
  sold_price: 185000,
  sold_to_name: "Ravi Kumar",
});

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  fakeNotifications.reset();
  captureAlerts();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const openDetail = async (piano = rental) => {
  fakeBackend.documents.set(piano.$id, { ...piano });
  const store = createTestStore({ user: testUser, items: [piano] });
  const renderer = renderWithStore(<DetailScreen />, store);
  await flushPromises();
  return { store, renderer };
};

// One entry per control: a pressable is more than one node in the test tree
const isControl = (name: string) => (node: any) =>
  node?.props.accessibilityLabel === name && typeof node.props.onPress === "function";
const press = async (renderer: ReactTestRenderer, name: string) => {
  const [node] = renderer.root.findAll((n) => isControl(name)(n) && !isControl(name)(n.parent));
  if (!node) throw new Error(`Nothing labelled "${name}"`);
  await act(async () => {
    await node.props.onPress();
  });
  await flushPromises();
};
const typeInto = (renderer: ReactTestRenderer, name: string, text: string) =>
  act(() => {
    renderer.root
      .findAll((n) => n.props.accessibilityLabel === name && typeof n.props.onChangeText === "function")[0]
      .props.onChangeText(text);
  });
const seedPayment = (id: string, amount: number, extra: Record<string, unknown> = {}) =>
  fakeBackend.payments.set(id, {
    $id: id,
    $createdAt: "2026-09-01T00:00:00.000+00:00",
    piano_id: "piano-1",
    creator: testUser.accountId,
    amount,
    paid_on: "2026-08-05",
    ...extra,
  });
// Presses and holds a payment and chooses Delete payment, which asks. What the choices sheet
// picked runs once it has left, 300 ms later
const askToDeletePayment = async (renderer: ReactTestRenderer, text: string) => {
  const [row] = renderer.root.findAll(
    (n) => typeof n.props.onLongPress === "function" && (n.props.accessibilityLabel ?? "").includes(text)
  );
  await act(async () => {
    await row.props.onLongPress();
  });
  await flushPromises();
  await pressLabel(renderer.root, "Delete payment");
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
  });
  await flushPromises();
};
const doc = () => fakeBackend.documents.get("piano-1");
const runToastAction = async (toast: { action?: { onPress: () => void } }) => {
  await act(async () => {
    toast.action!.onPress();
  });
  await flushPromises();
};

describe("a toast that says something was saved", () => {
  it("has the check, for a recorded payment, and a button to send its receipt", async () => {
    const toasts = captureToastCalls();
    const { renderer } = await openDetail();

    await press(renderer, "Record payment");
    await press(renderer, "Save payment");

    expect(toasts).toEqual([
      {
        message: "Payment recorded",
        duration: "long",
        variant: "success",
        action: { label: "Send receipt", onPress: expect.any(Function) },
      },
    ]);
  });
});

describe("Undo", () => {
  it("is on the toast after a payment is deleted, and puts the payment back as it was", async () => {
    seedPayment("p", 5000, { note: "UPI", customer_name: "Asha Mehta" });
    const toasts = captureToastCalls();
    const { store, renderer } = await openDetail();
    await askToDeletePayment(renderer, "₹5,000");
    await pressDialog(renderer.root, "Delete");
    expect(fakeBackend.payments.size).toBe(0);
    expect(toasts[0]).toMatchObject({ message: "Payment deleted", variant: "success", duration: "long", action: { label: "Undo" } });
    const changes = store.getState().payments.changeCount;

    await runToastAction(toasts[0]);

    expect([...fakeBackend.payments.values()]).toEqual([
      expect.objectContaining({ piano_id: "piano-1", amount: 5000, paid_on: "2026-08-05", note: "UPI", customer_name: "Asha Mehta" }),
    ]);
    expect(toasts[1]).toMatchObject({ message: "Payment restored", variant: "success" });
    expect(store.getState().payments.changeCount).toBe(changes + 1);
    expect(allTexts(renderer.root)).toContain("₹5,000 received · 1 payment");
  });

  it("is on the toast after a piano is marked as sold, and takes the sale back", async () => {
    const toasts = captureToastCalls();
    const { renderer } = await openDetail();
    await press(renderer, "Mark as sold");
    typeInto(renderer, "Buyer", "Ravi Kumar");
    typeInto(renderer, "Sale price", "185000");
    await press(renderer, "Confirm sale");
    expect(toasts[0]).toMatchObject({ message: "Marked Kawai K-300 as sold", variant: "success", duration: "long", action: { label: "Undo" } });
    expect(doc()?.sold_price).toBe(185000);

    await runToastAction(toasts[0]);

    expect(doc()).toMatchObject({ sold_date: null, sold_price: null, sold_to_name: null, sold_to_address: null });
    expect(toasts[1]).toMatchObject({ message: "Kawai K-300 is back in stock", variant: "success" });
    // Taking something back isn't something to take back in turn
    expect(toasts[1].action).toBeUndefined();
    // Still rented, so its reminders are back
    expect(fakeNotifications.rentalReminders("piano-1").length).toBeGreaterThan(0);
  });

  it("is on the toast after a rental is extended, and moves the end date back", async () => {
    const toasts = captureToastCalls();
    const { renderer } = await openDetail();
    await press(renderer, "Extend rental");
    // It opens on 3 months
    await press(renderer, `Extend to ${label(addMonths(END, 3))}`);
    expect(doc()?.rental_period_end).toBe(toStoredDate(addMonths(END, 3)));
    expect(toasts[0]).toMatchObject({
      message: `Rental extended to ${label(addMonths(END, 3))}`,
      variant: "success",
      duration: "long",
      action: { label: "Undo" },
    });

    await runToastAction(toasts[0]);

    expect(doc()?.rental_period_end).toBe(toStoredDate(END));
    expect(toasts[1]).toMatchObject({ message: `Rental back to ${label(END)}`, variant: "success" });
  });
});

describe("a toast that says something couldn't be saved", () => {
  it("has an alert and a Retry when a payment can't be deleted, and Retry deletes it", async () => {
    seedPayment("p", 5000);
    const toasts = captureToastCalls();
    const { renderer } = await openDetail();
    fakeBackend.missingCollections.add("rent_payments");
    await askToDeletePayment(renderer, "₹5,000");
    await pressDialog(renderer.root, "Delete");

    expect(toasts[0]).toMatchObject({
      message: "Couldn’t delete. Check your connection.",
      variant: "error",
      duration: "long",
      action: { label: "Retry" },
    });

    fakeBackend.missingCollections.clear();
    await runToastAction(toasts[0]);

    expect(fakeBackend.payments.size).toBe(0);
    expect(toasts[1]).toMatchObject({ message: "Payment deleted", variant: "success" });
  });

  it("has Retry when undoing a sale fails, since no sheet is open to press again, and Retry undoes it", async () => {
    const toasts = captureToastCalls();
    const { renderer } = await openDetail(soldPiano);
    await press(renderer, "Undo sale");
    fakeBackend.failNextDocumentUpdate = true;
    await pressDialog(renderer.root, "Undo sale");

    expect(toasts[0]).toMatchObject({
      message: "Couldn’t save. Check your connection.",
      variant: "error",
      duration: "long",
      action: { label: "Retry" },
    });
    expect(doc()?.sold_price).toBe(185000);

    await runToastAction(toasts[0]);

    expect(doc()).toMatchObject({ sold_date: null, sold_price: null });
    expect(toasts[1]).toMatchObject({ message: "Kawai K-300 is back in stock", variant: "success" });
  });

  it("has no Retry when a sheet can't save, because the sheet is still open to press its button again", async () => {
    const toasts = captureToastCalls();
    const { renderer } = await openDetail();
    await press(renderer, "Extend rental");
    fakeBackend.failNextDocumentUpdate = true;
    await press(renderer, `Extend to ${label(addMonths(END, 3))}`);

    expect(toasts).toEqual([
      { message: "Couldn’t save. Check your connection.", duration: "long", variant: "error", action: undefined },
    ]);
    // Still open, so the same button works the second time
    await press(renderer, `Extend to ${label(addMonths(END, 3))}`);
    expect(doc()?.rental_period_end).toBe(toStoredDate(addMonths(END, 3)));
  });

  it("doesn't use a system alert for any of these", async () => {
    const alerts = captureAlerts();
    const { renderer } = await openDetail();
    await press(renderer, "Extend rental");
    fakeBackend.failNextDocumentUpdate = true;
    await press(renderer, `Extend to ${label(addMonths(END, 3))}`);

    expect(alerts.titles()).toEqual([]);
  });
});

describe("toasts above sheets and dialogs (they are modals, which draw over the app)", () => {
  const withSafeArea = (children: React.ReactNode) => (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      {children}
    </SafeAreaProvider>
  );
  const toastsIn = (node: any) =>
    node
      .findAll((n: any) => (n.type as unknown) === "Text" && ["Payment recorded", "Couldn’t save."].includes(textContent(n)))
      .map(textContent);

  beforeEach(() => {
    jest.useFakeTimers();
  });

  it("shows inside a sheet, which is where the person is looking", () => {
    const renderer = renderWithStore(
      withSafeArea(
        <>
          <ToastHost />
          <Sheet visible onClose={jest.fn()} title="Record payment">
            <Text>Body</Text>
          </Sheet>
        </>
      ),
      createTestStore()
    );

    act(() => showToast("Payment recorded", { variant: "success" }));

    expect(toastsIn(renderer.root.findByType(Sheet))).toEqual(["Payment recorded"]);
  });

  it("sits above the sheet, not over its button", () => {
    const renderer = renderWithStore(
      withSafeArea(
        <Sheet visible onClose={jest.fn()} title="Record payment">
          <Text>Body</Text>
        </Sheet>
      ),
      createTestStore()
    );
    const panel = renderer.root.findAll(
      (n: any) => n.props.accessibilityViewIsModal === true && typeof n.props.onLayout === "function"
    )[0];
    act(() => panel.props.onLayout({ nativeEvent: { layout: { height: 400 } } }));

    act(() => showToast("Couldn’t save.", { variant: "error" }));

    const [toast] = renderer.root
      .findByType(Sheet)
      .findAll((n: any) => n.props.accessibilityLiveRegion === "polite" && typeof n.type === "string");
    // The sheet is 400 high, and the toast clears it by 12
    expect(flat(toast.props.style).bottom).toBe(412);
  });

  it("shows inside a dialog too", () => {
    const renderer = renderWithStore(
      withSafeArea(
        <>
          <ToastHost />
          <Dialog visible title="Delete Yamaha U1?" actions={[{ label: "Cancel", onPress: jest.fn() }]} />
        </>
      ),
      createTestStore()
    );

    act(() => showToast("Payment recorded", { variant: "success" }));

    expect(toastsIn(renderer.root.findByType(Dialog))).toEqual(["Payment recorded"]);
  });

  it("shows above the dialog that DialogHost draws", () => {
    const renderer = renderWithStore(withSafeArea(<ToastHost />), createTestStore());

    act(() => showDialog({ title: "Delete?", actions: [{ label: "Cancel", onPress: jest.fn() }] }));
    act(() => showToast("Couldn’t save.", { variant: "error" }));

    expect(toastsIn(renderer.root.findByType(Dialog))).toEqual(["Couldn’t save."]);
  });

  it("lets touches through a plain toast in a sheet, but not through one with a button", () => {
    const renderer = renderWithStore(
      withSafeArea(
        <Sheet visible onClose={jest.fn()} title="Record payment">
          <Text>Body</Text>
        </Sheet>
      ),
      createTestStore()
    );
    const live = () =>
      renderer.root
        .findByType(Sheet)
        .findAll((n: any) => n.props.accessibilityLiveRegion === "polite" && typeof n.type === "string")[0];

    act(() => showToast("Payment recorded", { variant: "success" }));
    expect(live().props.pointerEvents).toBe("none");

    act(() => showToast("Payment deleted", { action: { label: "Undo", onPress: jest.fn() } }));
    expect(live().props.pointerEvents).toBe("box-none");
  });
});
