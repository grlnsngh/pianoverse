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
jest.mock("@/services/notifications", () => ({
  scheduleRentalDueNotification: jest.fn(() => Promise.resolve()),
}));

import React from "react";
import { act } from "react-test-renderer";
import * as appwrite from "@/lib/appwrite";
import EditScreen from "@/app/edit/[id]";
import { fakeBackend, fileViewUrl } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  captureAlerts,
  captureToastCalls,
  chooseCategory,
  createTestStore,
  flushPromises,
  pickDate,
  pressText,
  renderWithStore,
  typeInto,
} from "./helpers/render";

/**
 * Keeping a rental that is over: the table, and the Edit screen writing the old
 * rental there before a new one replaces it. Today is 29 September 2026.
 */

const rented = (extra = {}) =>
  makePiano({
    $id: "piano-1",
    title: "Kawai K-300",
    category: "rentable",
    rental_customer_name: "Asha Mehta",
    rental_customer_mobile: "9876543210",
    rental_customer_address: "12 MG Road",
    rental_period_start: "2026-08-01" as any,
    rental_period_end: "2026-11-01" as any,
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
  fakeBackend.files.set("old-file", {
    name: "old.jpg",
    type: "image/jpeg",
    size: 10,
    uri: "file:///old.jpg",
  });
  captureAlerts();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const openEdit = (piano = rented()) => {
  fakeBackend.documents.set(piano.$id, {
    ...piano,
    image_url: fileViewUrl("old-file"),
  });
  const store = createTestStore({ user: testUser, items: [piano] });
  const renderer = renderWithStore(<EditScreen />, store);
  return { renderer, store };
};

const kept = () => [...fakeBackend.history.values()];

describe("the rental_history table", () => {
  const entry = (extra = {}) => ({
    pianoId: "piano-1",
    pianoTitle: "Kawai K-300",
    creator: "account-1",
    customerName: "  Asha Mehta ",
    customerMobile: "9876543210",
    customerAddress: "",
    periodStart: "2026-01-12",
    periodEnd: "2026-04-12",
    price: 4000,
    closedOn: new Date(2026, 8, 29),
    reason: "replaced" as const,
    ...extra,
  });

  it("keeps a rental with the details that were filled in, and nothing for the rest", async () => {
    await appwrite.createRentalHistory(entry());

    expect(kept()).toHaveLength(1);
    expect(kept()[0]).toMatchObject({
      piano_id: "piano-1",
      creator: "account-1",
      piano_title: "Kawai K-300",
      customer_name: "Asha Mehta",
      customer_mobile: "9876543210",
      period_start: "2026-01-12",
      period_end: "2026-04-12",
      price: 4000,
      closed_on: "2026-09-29",
      reason: "replaced",
    });
    expect(kept()[0]).not.toHaveProperty("customer_address");
  });

  it("leaves out dates and a price there are none of", async () => {
    await appwrite.createRentalHistory(
      entry({ periodStart: null, periodEnd: null, price: null })
    );

    expect(kept()[0]).not.toHaveProperty("period_start");
    expect(kept()[0]).not.toHaveProperty("period_end");
    expect(kept()[0]).not.toHaveProperty("price");
  });

  it("lists an owner's kept rentals, not another owner's, and every page of them", async () => {
    for (let i = 0; i < 130; i++) {
      fakeBackend.history.set(`h-${i}`, {
        $id: `h-${i}`,
        $createdAt: "2026-09-01T00:00:00.000+00:00",
        piano_id: "piano-1",
        creator: "account-1",
        closed_on: "2026-05-01",
      });
    }
    fakeBackend.history.set("other", {
      $id: "other",
      $createdAt: "2026-09-01T00:00:00.000+00:00",
      piano_id: "piano-9",
      creator: "account-2",
      closed_on: "2026-05-01",
    });

    expect(await appwrite.getRentalHistory("account-1")).toHaveLength(130);
  });

  it("has none to list when the table doesn't exist yet", async () => {
    fakeBackend.missingCollections.add("rental_history");

    await expect(appwrite.getRentalHistory("account-1")).resolves.toEqual([]);
  });

  it("deletes the kept rentals of one piano", async () => {
    await appwrite.createRentalHistory(entry());
    await appwrite.createRentalHistory(entry({ pianoId: "piano-2" }));

    await appwrite.deleteRentalHistoryForPiano("piano-1");

    expect(kept().map((row) => row.piano_id)).toEqual(["piano-2"]);
  });

  it("goes with a piano that is deleted, and doesn't stop it being deleted when the table isn't there", async () => {
    fakeBackend.documents.set("piano-1", { ...rented() });
    await appwrite.createRentalHistory(entry());
    await appwrite.deletePianoEntry({ $id: "piano-1" });
    expect(kept()).toEqual([]);

    fakeBackend.documents.set("piano-1", { ...rented() });
    fakeBackend.missingCollections.add("rental_history");
    await expect(
      appwrite.deletePianoEntry({ $id: "piano-1" })
    ).resolves.toBeDefined();
    expect(fakeBackend.documents.has("piano-1")).toBe(false);
  });
});

describe("saving a piano on the Edit screen", () => {
  it("keeps the old rental when it is rented to someone else from a new day", async () => {
    const toasts = captureToastCalls();
    const { renderer, store } = openEdit();

    typeInto(renderer.root, "Customer", "Ravi Kumar");
    await pickDate(renderer.root, "Starts", new Date(2026, 9, 5));
    await pickDate(renderer.root, "Ends", new Date(2027, 0, 5));
    await pressText(renderer.root, "Save changes");
    await flushPromises();

    expect(kept()).toHaveLength(1);
    expect(kept()[0]).toMatchObject({
      piano_id: "piano-1",
      customer_name: "Asha Mehta",
      customer_mobile: "9876543210",
      customer_address: "12 MG Road",
      period_start: "2026-08-01",
      period_end: "2026-11-01",
      price: 4000,
      closed_on: "2026-09-29",
      reason: "replaced",
    });
    expect(fakeBackend.documents.get("piano-1")).toMatchObject({
      rental_customer_name: "Ravi Kumar",
    });
    expect(toasts.map((toast) => toast.message)).toEqual([
      "Piano entry updated successfully",
    ]);
    // The screens that show history load it again
    expect(store.getState().payments.changeCount).toBe(1);
  });

  it("keeps it when the rental is ended by changing the piano into another kind", async () => {
    const { renderer } = openEdit();

    await chooseCategory(renderer.root, "warehouse");
    await pressText(renderer.root, "Save changes");
    await flushPromises();

    expect(kept()).toHaveLength(1);
    expect(kept()[0]).toMatchObject({
      customer_name: "Asha Mehta",
      reason: "ended",
    });
  });

  it("keeps nothing when the rental is only extended", async () => {
    const { renderer } = openEdit();

    await pickDate(renderer.root, "Ends", new Date(2027, 1, 1));
    await pressText(renderer.root, "Save changes");
    await flushPromises();

    expect(kept()).toEqual([]);
    expect(fakeBackend.documents.get("piano-1")).toMatchObject({
      rental_period_end: "2027-02-01",
    });
  });

  it("keeps nothing when a name is only corrected", async () => {
    const { renderer, store } = openEdit();

    typeInto(renderer.root, "Customer", "Asha Mehata");
    await pressText(renderer.root, "Save changes");
    await flushPromises();

    expect(kept()).toEqual([]);
    expect(store.getState().payments.changeCount).toBe(0);
  });

  it("keeps nothing for a piano that wasn't a rental", async () => {
    const { renderer } = openEdit(
      makePiano({ $id: "piano-1", category: "warehouse" })
    );

    typeInto(renderer.root, "Title", "Yamaha U1 (restored)");
    await pressText(renderer.root, "Save changes");
    await flushPromises();

    expect(kept()).toEqual([]);
  });

  it("still saves the piano, and says the old rental wasn't kept, when the table isn't there", async () => {
    fakeBackend.missingCollections.add("rental_history");
    const toasts = captureToastCalls();
    const { renderer } = openEdit();

    await chooseCategory(renderer.root, "warehouse");
    await pressText(renderer.root, "Save changes");
    await flushPromises();

    expect(fakeBackend.documents.get("piano-1")).toMatchObject({
      category: "warehouse",
    });
    const last = toasts[toasts.length - 1];
    expect(last.message).toBe(
      "Saved, but the old rental wasn’t kept: rental_history isn’t set up in Appwrite yet."
    );
    expect(last.variant).toBe("error");
    expect(last.action).toBeUndefined();
  });

  it("says it couldn't keep the old rental, with Retry, and Retry keeps it", async () => {
    jest
      .spyOn(appwrite, "createRentalHistory")
      .mockRejectedValueOnce(new Error("Network request failed"));
    const toasts = captureToastCalls();
    const { renderer, store } = openEdit();

    await chooseCategory(renderer.root, "warehouse");
    await pressText(renderer.root, "Save changes");
    await flushPromises();

    const last = toasts[toasts.length - 1];
    expect(last.message).toBe(
      "Saved, but couldn’t keep the old rental in its history."
    );
    expect(last.action?.label).toBe("Retry");
    expect(kept()).toEqual([]);

    // The network is back: the same details are kept
    jest.mocked(appwrite.createRentalHistory).mockRestore();
    await act(async () => last.action?.onPress());
    await flushPromises();

    expect(kept()).toHaveLength(1);
    expect(kept()[0]).toMatchObject({
      customer_name: "Asha Mehta",
      reason: "ended",
    });
    expect(store.getState().payments.changeCount).toBe(1);
  });
});
