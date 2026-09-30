jest.mock("expo-notifications", () =>
  require("./helpers/fakeNotifications").createFakeNotificationsModule()
);
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import {
  prepareRentalReminders,
  requestNotificationPermissions,
} from "@/services/notifications";

const status = (value: "undetermined" | "granted" | "denied") =>
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ status: value } as any);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("getting reminders ready when the app starts", () => {
  it("makes the Android channel when the permission was already given, and never asks", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    status("granted");

    await expect(prepareRentalReminders()).resolves.toBe(true);

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      "rental-reminders",
      expect.objectContaining({ name: "Rental Reminders" })
    );
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it.each(["undetermined", "denied"] as const)(
    "does nothing, and doesn't ask, when notifications are %s",
    async (value) => {
      jest.replaceProperty(Platform, "OS", "android");
      status(value);

      await expect(prepareRentalReminders()).resolves.toBe(false);

      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
      expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    }
  );

  it("has no channel to make on iOS", async () => {
    jest.replaceProperty(Platform, "OS", "ios");
    status("granted");

    await expect(prepareRentalReminders()).resolves.toBe(true);

    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it("says no rather than failing when the permission can't be read", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.mocked(Notifications.getPermissionsAsync).mockRejectedValue(new Error("boom"));

    await expect(prepareRentalReminders()).resolves.toBe(false);
  });
});

describe("asking for the permission", () => {
  it("asks the phone when it hasn't been asked, and makes the channel once it is allowed", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    status("undetermined");
    jest
      .mocked(Notifications.requestPermissionsAsync)
      .mockResolvedValue({ status: "granted" } as any);

    await expect(requestNotificationPermissions()).resolves.toBe(true);

    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalled();
  });

  it("says no when the phone's answer is no", async () => {
    status("undetermined");
    jest
      .mocked(Notifications.requestPermissionsAsync)
      .mockResolvedValue({ status: "denied" } as any);

    await expect(requestNotificationPermissions()).resolves.toBe(false);
  });

  it("doesn't ask again when it is already allowed", async () => {
    status("granted");

    await expect(requestNotificationPermissions()).resolves.toBe(true);

    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});
