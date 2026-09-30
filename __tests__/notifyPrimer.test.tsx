jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { act } from "react-test-renderer";
import * as Notifications from "expo-notifications";
import NotifyPrimerSheet from "@/components/NotifyPrimerSheet";
import { Sheet } from "@/components/ui";
import { markNotifyPrimerSeen, shouldShowNotifyPrimer } from "@/lib/notifyPrimer";
import { addDays } from "date-fns";
import { toStoredDate } from "@/utils/dates";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  createTestStore,
  pressButton,
  renderWithStore,
} from "./helpers/render";

const setStatus = (status: "undetermined" | "granted" | "denied") =>
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ status } as any);

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

beforeEach(async () => {
  jest.clearAllMocks();
  fakeNotifications.reset();
  await AsyncStorage.clear();
  setStatus("undetermined");
  jest
    .mocked(Notifications.requestPermissionsAsync)
    .mockResolvedValue({ status: "granted" } as any);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("whether to explain reminders", () => {
  it("is yes on a phone that hasn't been asked about notifications", async () => {
    expect(await shouldShowNotifyPrimer()).toBe(true);
  });

  it("is no once it has been answered", async () => {
    await markNotifyPrimerSeen();

    expect(await shouldShowNotifyPrimer()).toBe(false);
  });

  it.each(["granted", "denied"] as const)(
    "is no when notifications are already %s, since there is nothing left to decide",
    async (status) => {
      setStatus(status);

      expect(await shouldShowNotifyPrimer()).toBe(false);
    }
  );

  it("is no when the permission can't be read", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.mocked(Notifications.getPermissionsAsync).mockRejectedValue(new Error("boom"));

    expect(await shouldShowNotifyPrimer()).toBe(false);
  });
});

describe("the Get reminders sheet", () => {
  const rental = makePiano({
    $id: "rental-1",
    category: "rentable",
    rental_customer_name: "Asha",
    rental_period_start: toStoredDate(addDays(new Date(), -50)) as any,
    rental_period_end: toStoredDate(addDays(new Date(), 30)) as any,
    rental_price: 4000,
  });

  const open = async (items = [rental]) => {
    const store = createTestStore({ user: testUser, items });
    const renderer = renderWithStore(<NotifyPrimerSheet />, store);
    // It rises a moment after the screen behind it has settled
    await act(async () => {
      await wait(700);
    });
    return { store, renderer };
  };

  const sheet = (renderer: any) => renderer.root.findByType(Sheet);

  it("rises over the first screen, saying why and showing a sample", async () => {
    const { renderer } = await open();

    expect(sheet(renderer).props.visible).toBe(true);
    const texts = allTexts(renderer.root);
    expect(texts).toContain("Get reminders before rentals end");
    expect(texts).toContain("We notify you at 9:00 AM, so you never miss a return or a payment.");
    expect(texts).toContain("Turn on reminders");
    expect(texts).toContain("Not now");
    expect(texts).toContain("Piano Rental Due Soon!");
  });

  it("does not ask the phone anything until Turn on reminders is pressed", async () => {
    await open();

    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("asks the phone when Turn on reminders is pressed, then sets the reminders of the pianos already there", async () => {
    const { renderer } = await open();

    await pressButton(renderer.root, "Turn on reminders");
    await act(async () => {
      await wait(20);
    });

    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(sheet(renderer).props.visible).toBe(false);
    expect(fakeNotifications.rentalReminders("rental-1").length).toBeGreaterThan(0);
  });

  it("schedules nothing when the phone says no", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest
      .mocked(Notifications.requestPermissionsAsync)
      .mockResolvedValue({ status: "denied" } as any);
    const { renderer } = await open();

    await pressButton(renderer.root, "Turn on reminders");
    await act(async () => {
      await wait(20);
    });

    expect(fakeNotifications.rentalReminders()).toEqual([]);
  });

  it("leaves things alone on Not now, and doesn't come back", async () => {
    const { renderer } = await open();

    await pressButton(renderer.root, "Not now");
    await act(async () => {
      await wait(20);
    });

    expect(sheet(renderer).props.visible).toBe(false);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(await shouldShowNotifyPrimer()).toBe(false);
  });

  it("is also answered by closing it, by the dim or the back button", async () => {
    const { renderer } = await open();

    sheet(renderer).props.onClose();
    await act(async () => {
      await wait(20);
    });

    expect(await shouldShowNotifyPrimer()).toBe(false);
  });

  it("doesn't rise for someone who has already answered, or allowed notifications", async () => {
    setStatus("granted");
    const { renderer } = await open();

    expect(sheet(renderer).props.visible).toBe(false);
  });
});
