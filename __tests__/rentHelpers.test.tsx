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
import { Linking, Share } from "react-native";
import { act, ReactTestRenderer } from "react-test-renderer";
import { addDays } from "date-fns";
import DetailScreen from "@/app/detail/[id]";
import { PianoItem } from "@/redux/pianos/types";
import { toStoredDate } from "@/utils/dates";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  captureAlerts,
  captureToastCalls,
  createTestStore,
  flushPromises,
  pressText,
  renderWithStore,
} from "./helpers/render";

/**
 * Rent collection helpers: a reminder to the renter and a receipt for a
 * payment, each opening WhatsApp with the words already typed.
 */

const inDays = (days: number) => toStoredDate(addDays(new Date(), days));

const rental = (endInDays: number, extra: Partial<PianoItem> = {}) =>
  makePiano({
    $id: "piano-1",
    title: "Kawai K-300",
    category: "rentable",
    rental_customer_name: "Asha Mehta",
    rental_customer_mobile: "98765 43210",
    rental_period_start: inDays(-60) as any,
    rental_period_end: inDays(endInDays) as any,
    rental_price: 4000,
    ...extra,
  });

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  fakeNotifications.reset();
  captureAlerts();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  jest
    .spyOn(Share, "share")
    .mockResolvedValue({ action: "sharedAction" } as any);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const openDetail = async (piano: PianoItem) => {
  fakeBackend.documents.set(piano.$id, { ...piano });
  const store = createTestStore({ user: testUser, items: [piano] });
  const renderer = renderWithStore(<DetailScreen />, store);
  await flushPromises();
  return { store, renderer };
};

// One entry per control: a button is a few components deep, each passing the
// label and onPress on to the next
const isButton = (label: string) => (node: any) =>
  !!node &&
  node.props.accessibilityLabel === label &&
  typeof node.props.onPress === "function";

const buttonsLabelled = (renderer: ReactTestRenderer, label: string) =>
  renderer.root.findAll(
    (node) => isButton(label)(node) && !isButton(label)(node.parent)
  );

const press = async (renderer: ReactTestRenderer, label: string) => {
  const [button] = buttonsLabelled(renderer, label);
  if (!button) throw new Error(`No "${label}" button`);
  await act(async () => {
    await button.props.onPress();
  });
  await flushPromises();
};

/** The text that was typed into the WhatsApp chat, and the number it went to. */
const sentOnWhatsApp = () => {
  const [url] = (Linking.openURL as jest.Mock).mock.calls[0] as [string];
  const [, number, text] =
    url.match(/^https:\/\/wa\.me\/(\d+)\?text=(.*)$/) ?? [];
  return { number, text: decodeURIComponent(text ?? "") };
};

const seedPayment = (
  id: string,
  paidOn: string,
  extra: Record<string, unknown> = {}
) =>
  fakeBackend.payments.set(id, {
    $id: id,
    $createdAt: "2026-09-01T00:00:00.000+00:00",
    piano_id: "piano-1",
    creator: testUser.accountId,
    amount: 5000,
    paid_on: paidOn,
    ...extra,
  });

describe("reminding the renter", () => {
  it("opens their WhatsApp chat with the reminder typed, from the Remind customer row", async () => {
    const { renderer } = await openDetail(rental(-12));

    await press(renderer, "Remind customer");

    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    const { number, text } = sentOnWhatsApp();
    expect(number).toBe("919876543210");
    expect(text).toContain("Hello Asha Mehta,");
    expect(text).toContain("Your rental of Kawai K-300 ended on");
    expect(text).toContain("The rent is ₹4,000.");
  });

  it("words a rental that has a long way to go as a note, not a demand", async () => {
    const { renderer } = await openDetail(rental(90));

    await press(renderer, "Remind customer");

    expect(sentOnWhatsApp().text).toContain(
      "This is a note about your rental of Kawai K-300, which runs until"
    );
  });

  it("has a Send reminder button in the Rental section once the rental has ended", async () => {
    const { renderer } = await openDetail(rental(-12));

    await press(renderer, "Send reminder");

    expect(sentOnWhatsApp().text).toContain("ended on");
  });

  it("has it for a rental that ends within the week too", async () => {
    const { renderer } = await openDetail(rental(3));

    expect(buttonsLabelled(renderer, "Send reminder")).toHaveLength(1);
  });

  it("has no button for a rental with weeks to go and its rent paid, only the row", async () => {
    // The rent for the month is in, so nothing is due either
    seedPayment("p", inDays(0), {
      customer_name: "Asha Mehta",
      amount: 4000,
    });
    const { renderer } = await openDetail(rental(30));

    expect(buttonsLabelled(renderer, "Send reminder")).toHaveLength(0);
    expect(buttonsLabelled(renderer, "Remind customer")).toHaveLength(1);
  });

  it("has the button for a rental with weeks to go once its rent is due", async () => {
    const { renderer } = await openDetail(rental(30));

    expect(buttonsLabelled(renderer, "Send reminder")).toHaveLength(1);
  });

  it("offers nothing without a number to message", async () => {
    const { renderer } = await openDetail(
      rental(-12, { rental_customer_mobile: "" })
    );

    expect(buttonsLabelled(renderer, "Send reminder")).toHaveLength(0);
    expect(buttonsLabelled(renderer, "Remind customer")).toHaveLength(0);
  });

  it("offers nothing for a piano that isn't a rental", async () => {
    const { renderer } = await openDetail(
      makePiano({
        $id: "piano-1",
        category: "on_sale",
        rental_customer_mobile: "9876543210",
      })
    );

    expect(buttonsLabelled(renderer, "Remind customer")).toHaveLength(0);
  });

  it("is in the ⋯ menu as well", async () => {
    const { renderer } = await openDetail(rental(-12));

    await press(renderer, "More options");

    const [menu] = renderer.root.findAllByProps({
      testID: "piano-actions-sheet",
    });
    expect(
      menu.findAll((node) => isButton("Remind customer")(node)).length
    ).toBeGreaterThan(0);
  });
});

describe("the receipt of a payment", () => {
  it("is offered on the toast after recording one, and goes to the renter on WhatsApp", async () => {
    const toasts = captureToastCalls();
    const { renderer } = await openDetail(rental(30));

    await press(renderer, "Record payment");
    await press(renderer, "Save payment");

    const [toast] = toasts;
    expect(toast.message).toBe("Payment recorded");
    expect(toast.action?.label).toBe("Send receipt");
    expect(Linking.openURL).not.toHaveBeenCalled();

    await act(async () => toast.action?.onPress());
    await flushPromises();

    const { number, text } = sentOnWhatsApp();
    expect(number).toBe("919876543210");
    expect(text).toContain("Payment receipt");
    expect(text).toContain("Received ₹4,000 from Asha Mehta on");
    expect(text).toContain("For the rent of Kawai K-300.");
  });

  it("is sent by tapping a payment in the list", async () => {
    seedPayment("p", "2026-08-05", {
      customer_name: "Asha Mehta",
      note: "UPI",
    });
    const { renderer } = await openDetail(rental(30));

    await press(renderer, "5 Aug 2026, UPI, ₹5,000");

    const { number, text } = sentOnWhatsApp();
    expect(number).toBe("919876543210");
    expect(text).toContain("Received ₹5,000 from Asha Mehta on 5 Aug 2026.");
    expect(text).toContain("Note: UPI");
  });

  it("is shared instead, never sent to the new renter, when someone earlier paid", async () => {
    seedPayment("p", "2026-08-05", { customer_name: "Ravi Kumar" });
    const { renderer } = await openDetail(rental(30));

    await press(renderer, "5 Aug 2026, ₹5,000");

    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(Share.share).toHaveBeenCalledTimes(1);
    const [content] = (Share.share as jest.Mock).mock.calls[0];
    expect(content.title).toBe("Payment receipt");
    expect(content.message).toContain(
      "Received ₹5,000 from Ravi Kumar on 5 Aug 2026."
    );
  });

  it("is shared when there is no number to send it to", async () => {
    seedPayment("p", "2026-08-05", { customer_name: "Asha Mehta" });
    const { renderer } = await openDetail(
      rental(30, { rental_customer_mobile: "" })
    );

    await press(renderer, "5 Aug 2026, ₹5,000");

    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(Share.share).toHaveBeenCalledTimes(1);
  });

  it("still deletes a payment by pressing and holding it", async () => {
    seedPayment("p", "2026-08-05", { customer_name: "Asha Mehta" });
    const { renderer } = await openDetail(rental(30));

    const [row] = renderer.root.findAll(
      (node) =>
        typeof node.props.onLongPress === "function" &&
        (node.props.accessibilityLabel ?? "").includes("5 Aug 2026")
    );
    await act(async () => row.props.onLongPress());
    await flushPromises();

    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(Share.share).not.toHaveBeenCalled();
    await pressText(renderer.root, "Delete");
    await flushPromises();
    expect(fakeBackend.payments.size).toBe(0);
  });

  it("tells the person when WhatsApp can't be opened", async () => {
    (Linking.openURL as jest.Mock).mockRejectedValue(new Error("no app"));
    const alerts = captureAlerts();
    const { renderer } = await openDetail(rental(-12));

    await press(renderer, "Remind customer");

    expect(alerts.titles()).toEqual(["Couldn't open WhatsApp"]);
  });
});
