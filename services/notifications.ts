import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";
import { subDays } from "date-fns";
import { parseStoredDate } from "@/utils/dates";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// The Android channel the rental reminders go through
const setUpReminderChannel = async () => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("rental-reminders", {
    name: "Rental Reminders",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF9C01",
    sound: "default",
  });
};

/**
 * Gets reminders ready when the app starts, without asking anyone for
 * anything: if the permission was already given it makes the Android channel
 * and says so. The question itself is asked from the "Get reminders" sheet
 * (requestNotificationPermissions), after the person has seen why.
 */
export const prepareRentalReminders = async () => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return false;
    await setUpReminderChannel();
    return true;
  } catch (error) {
    console.error("❌ Error preparing rental reminders:", error);
    return false;
  }
};

// Ask for the permission to send notifications (the phone's own question)
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn(
        "⚠️ Notification permissions not granted. Notifications will not work."
      );
      return false;
    }

    await setUpReminderChannel();

    return true;
  } catch (error) {
    console.error("❌ Error requesting notification permissions:", error);
    return false;
  }
};

// Reminders go out at 9:00 a week before, the day before and on the due date,
// then the day after and a week after if the rental hasn't been extended (or
// the piano marked as returned or sold)
const REMINDER_HOUR = 9;
const REMINDER_DAYS_BEFORE = [7, 1, 0, -1, -7];

/**
 * The reminder times still ahead for a rental due on `dueDate`. They only
 * depend on the due date, so rescheduling (e.g. on every app start) never
 * pushes a reminder later.
 */
export const getRentalReminderTimes = (dueDate: Date, now = new Date()) =>
  REMINDER_DAYS_BEFORE.map((daysBefore) => {
    const date = subDays(dueDate, daysBefore);
    date.setHours(REMINDER_HOUR, 0, 0, 0);
    return { daysBefore, date };
  }).filter(({ date }) => date > now);

const reminderTitle = (daysBefore: number) =>
  daysBefore < 0 ? "🎹 Piano Rental Overdue" : "🎹 Piano Rental Due Soon!";

const reminderBody = (title: string, daysBefore: number) => {
  const when =
    daysBefore === 0
      ? "ends today"
      : daysBefore === 1
      ? "ends tomorrow"
      : daysBefore === -1
      ? "ended yesterday"
      : daysBefore < 0
      ? `ended ${-daysBefore} days ago`
      : `ends in ${daysBefore} days`;
  return `"${title}" rental ${when}. Please arrange return or extension.`;
};

// Schedule a rental's reminders (none if it is no longer rented or the due
// date has passed). Existing reminders must already be cancelled.
const scheduleRentalReminders = async (pianoItem: any) => {
  const dueDate = parseStoredDate(pianoItem.rental_period_end);
  // A sold piano's rental is over
  if (pianoItem.category !== "rentable" || !dueDate || pianoItem.sold_date)
    return [];

  return Promise.all(
    getRentalReminderTimes(dueDate).map(({ daysBefore, date }) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: reminderTitle(daysBefore),
          body: reminderBody(pianoItem.title, daysBefore),
          data: {
            pianoId: pianoItem.$id,
            type: "rental_due",
            dueDate: pianoItem.rental_period_end,
          },
          sound: "default",
        },
        trigger: {
          date,
          channelId: Platform.OS === "android" ? "rental-reminders" : undefined,
        },
      })
    )
  );
};

// Replace a piano's rental reminders with ones for its current due date
// (none if it is no longer rented or the due date has passed)
export const scheduleRentalDueNotification = async (pianoItem: any) => {
  try {
    if (!pianoItem?.$id) return [];

    // Cancel any existing notifications for this piano first
    await cancelRentalNotification(pianoItem.$id);
    return await scheduleRentalReminders(pianoItem);
  } catch (error) {
    console.error("❌ Error scheduling rental notification:", error);
    return [];
  }
};

// Cancel specific rental notification
export const cancelRentalNotification = async (pianoId: string) => {
  try {
    if (!pianoId) {
      console.warn("No piano ID provided for notification cancellation");
      return;
    }

    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();

    // Find notifications for this piano (could be multiple due to edge cases)
    const notificationsToCancel = scheduledNotifications.filter(
      (notification: Notifications.NotificationRequest) =>
        notification.content.data?.pianoId === pianoId &&
        notification.content.data?.type === "rental_due"
    );

    if (notificationsToCancel.length > 0) {
      const cancelPromises = notificationsToCancel.map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier)
      );

      await Promise.all(cancelPromises);
    }
  } catch (error) {
    console.error("❌ Error cancelling rental notification:", error);
  }
};

const cancelAllRentalNotifications = async () => {
  const scheduledNotifications =
    await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduledNotifications
      .filter(
        (notification) => notification.content.data?.type === "rental_due"
      )
      .map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier)
      )
  );
};

let schedulingQueue: Promise<unknown> = Promise.resolve();

// Replace all rental reminders with ones for these pianos. Reminders for
// pianos that were deleted or are no longer rented are removed too.
export const scheduleAllRentalNotifications = (pianoItems: any[]) => {
  const run = async () => {
    try {
      await cancelAllRentalNotifications();

      const rentals = (Array.isArray(pianoItems) ? pianoItems : []).filter(
        (item) =>
          item?.category === "rentable" &&
          item.rental_period_end &&
          !item.sold_date
      );
      // All rental reminders were just cancelled, so skip the per-piano
      // cancel (one native lookup per piano)
      const results = await Promise.all(
        rentals.map((item) =>
          scheduleRentalReminders(item).catch((error) => {
            console.error(
              `❌ Error scheduling reminders for ${item.title}:`,
              error
            );
            return [];
          })
        )
      );
      const notificationIds = results.flat();

      console.log(
        `✅ Scheduled ${notificationIds.length} reminder(s) for ${rentals.length} rental(s)`
      );
      return notificationIds;
    } catch (error) {
      console.error("❌ Error in bulk notification scheduling:", error);
      return [];
    }
  };

  // Run one at a time so overlapping calls can't leave duplicate reminders
  const result = schedulingQueue.then(run, run);
  schedulingQueue = result;
  return result;
};

// Handle notification response (when user taps on notification)
export const handleNotificationResponse = (
  response: Notifications.NotificationResponse
) => {
  const data = response.notification.request.content.data;

  if (data?.type === "rental_due" && data?.pianoId) {
    router.push(`/detail/${data.pianoId}`);
  }
};
