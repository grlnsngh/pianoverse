jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);
jest.mock("expo-router", () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));

import * as Notifications from "expo-notifications";
import { addDays, format } from "date-fns";
import {
  MAX_RENTAL_REMINDERS,
  MAX_TUNING_REMINDERS,
  scheduleAllRentalNotifications,
  scheduleAllServiceNotifications,
  scheduleMorningSummaries,
  scheduleRentalDueNotification,
} from "@/services/notifications";
import { fakeNotifications } from "./helpers/fakeNotifications";
import { makePiano } from "./helpers/fixtures";

// Batch 50 (O2): with many pianos, opening the app used to cancel and set every
// reminder again, and five reminders a rental could pass Android's 500 alarms

const day = (offset: number) => format(addDays(new Date(), offset), "yyyy-MM-dd");
const rental = (n: number, endsIn: number) =>
  makePiano({ $id: `rental-${n}`, title: `Rental ${n}`, category: "rentable", rental_period_end: day(endsIn) as any });
const schedule = Notifications.scheduleNotificationAsync as jest.Mock;
const cancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;

beforeEach(() => {
  fakeNotifications.reset();
  jest.clearAllMocks();
});

describe("putting the reminders in place again", () => {
  const rentals = Array.from({ length: 10 }, (_, n) => rental(n, 30 + n));

  it("leaves the reminders alone when nothing changed, as on most app starts", async () => {
    await scheduleAllRentalNotifications(rentals);
    expect(fakeNotifications.rentalReminders()).toHaveLength(50);
    const before = fakeNotifications.rentalReminders().map((n) => n.identifier);
    jest.clearAllMocks();

    await scheduleAllRentalNotifications(rentals);

    expect(schedule).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
    expect(fakeNotifications.rentalReminders().map((n) => n.identifier)).toEqual(before);
  });

  it("changes only the rental whose end date moved", async () => {
    await scheduleAllRentalNotifications(rentals);
    jest.clearAllMocks();

    const extended = [...rentals.slice(0, 9), rental(9, 90)];
    await scheduleAllRentalNotifications(extended);

    // Its five old reminders go and five new ones come; the other 45 stay
    expect(cancel).toHaveBeenCalledTimes(5);
    expect(schedule).toHaveBeenCalledTimes(5);
    const forIt = fakeNotifications.rentalReminders("rental-9");
    expect(forIt).toHaveLength(5);
    expect(forIt.every((n) => n.content.data.dueDate === day(90))).toBe(true);
    expect(fakeNotifications.rentalReminders()).toHaveLength(50);
  });

  it("changes a reminder whose words changed, like a piano renamed", async () => {
    await scheduleAllRentalNotifications(rentals);
    const renamed = [{ ...rentals[0], title: "Renamed" }, ...rentals.slice(1)];

    await scheduleAllRentalNotifications(renamed);

    const bodies = fakeNotifications.rentalReminders("rental-0").map((n) => n.content.body);
    expect(bodies).toHaveLength(5);
    expect(bodies.every((body) => body.includes("Renamed"))).toBe(true);
  });

  it("removes the reminders of a rental that ended or a piano deleted, and all of them on sign out", async () => {
    await scheduleAllRentalNotifications(rentals);

    await scheduleAllRentalNotifications(rentals.slice(1));
    expect(fakeNotifications.rentalReminders("rental-0")).toHaveLength(0);
    expect(fakeNotifications.rentalReminders()).toHaveLength(45);

    await scheduleAllRentalNotifications([]);
    expect(fakeNotifications.rentalReminders()).toHaveLength(0);
  });

  it("replaces reminders set by the earlier version (other identifiers) once", async () => {
    fakeNotifications.scheduled.push({
      identifier: "old-random-id",
      content: { data: { type: "rental_due", pianoId: "rental-0" } },
      trigger: {},
    });

    await scheduleAllRentalNotifications(rentals);

    expect(fakeNotifications.scheduled.some((n) => n.identifier === "old-random-id")).toBe(false);
    expect(fakeNotifications.rentalReminders()).toHaveLength(50);
  });

  it("knows a piano's reminders set after an edit, so the next full pass leaves them", async () => {
    await scheduleAllRentalNotifications(rentals);
    const moved = rental(3, 60);
    await scheduleRentalDueNotification(moved);
    jest.clearAllMocks();

    await scheduleAllRentalNotifications([...rentals.slice(0, 3), moved, ...rentals.slice(4)]);

    expect(schedule).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it("leaves the other kinds alone", async () => {
    await scheduleMorningSummaries([{ date: addDays(new Date(), 1), title: "Good morning", body: "1 rental ended" }]);
    await scheduleAllServiceNotifications([{ pianoId: "p", title: "Tuned", due: addDays(new Date(), 5) }]);

    await scheduleAllRentalNotifications([]);

    expect(fakeNotifications.morningSummaries()).toHaveLength(1);
    expect(fakeNotifications.scheduled.filter((n) => n.content.data?.type === "service_due")).toHaveLength(1);
  });

  it("sets the rest when one can't be set", async () => {
    schedule.mockImplementationOnce(async () => {
      throw new Error("Maximum limit of concurrent alarms 500 reached");
    });
    jest.spyOn(console, "error").mockImplementation(() => {});

    const ids = await scheduleAllRentalNotifications(rentals);

    expect(fakeNotifications.rentalReminders()).toHaveLength(49);
    expect(ids).toHaveLength(49);
  });
});

describe("staying under Android's 500 alarms", () => {
  it("keeps the soonest rental reminders when there are more than fit", async () => {
    // 100 rentals ending far ahead: 500 reminders wanted
    const many = Array.from({ length: 100 }, (_, n) => rental(n, 20 + n));

    await scheduleAllRentalNotifications(many);

    expect(fakeNotifications.rentalReminders()).toHaveLength(MAX_RENTAL_REMINDERS);
    // The sooner rentals have all five; the furthest none yet (they come as it gets closer)
    expect(fakeNotifications.rentalReminders("rental-0")).toHaveLength(5);
    expect(fakeNotifications.rentalReminders("rental-99")).toHaveLength(0);
  });

  it("keeps the soonest tuning reminders", async () => {
    const reminders = Array.from({ length: 200 }, (_, n) => ({ pianoId: `p${n}`, title: `Piano ${n}`, due: addDays(new Date(), 2 + n) }));

    await scheduleAllServiceNotifications(reminders);

    const set = fakeNotifications.scheduled.filter((n) => n.content.data?.type === "service_due");
    expect(set).toHaveLength(MAX_TUNING_REMINDERS);
    expect(set.some((n) => n.content.data.pianoId === "p0")).toBe(true);
    expect(set.some((n) => n.content.data.pianoId === "p199")).toBe(false);
  });

  it("leaves room for the morning summaries within the limit", () => {
    expect(MAX_RENTAL_REMINDERS + MAX_TUNING_REMINDERS + 7).toBeLessThan(500);
  });
});
