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

// Request notification permissions
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    console.log(`📱 Current notification permission status: ${existingStatus}`);

    if (existingStatus !== "granted") {
      console.log("🔄 Requesting notification permissions...");
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log(`📱 New notification permission status: ${finalStatus}`);
    }

    if (finalStatus !== "granted") {
      console.warn(
        "⚠️ Notification permissions not granted. Notifications will not work."
      );
      return false;
    }

    // Set up Android notification channel
    if (Platform.OS === "android") {
      console.log("🔧 Setting up Android notification channel...");
      await Notifications.setNotificationChannelAsync("rental-reminders", {
        name: "Rental Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF9C01",
        sound: "default",
      });
      console.log("✅ Android notification channel configured");
    }

    console.log("✅ Notification permissions granted and configured");
    return true;
  } catch (error) {
    console.error("❌ Error requesting notification permissions:", error);
    return false;
  }
};

// Reminders go out at 9:00 a week before, the day before and on the due date
const REMINDER_HOUR = 9;
const REMINDER_DAYS_BEFORE = [7, 1, 0];

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

const reminderBody = (title: string, daysBefore: number) => {
  const when =
    daysBefore === 0
      ? "ends today"
      : daysBefore === 1
      ? "ends tomorrow"
      : `ends in ${daysBefore} days`;
  return `"${title}" rental ${when}. Please arrange return or extension.`;
};

// Schedule a rental's reminders (none if it is no longer rented or the due
// date has passed). Existing reminders must already be cancelled.
const scheduleRentalReminders = async (pianoItem: any) => {
  const dueDate = parseStoredDate(pianoItem.rental_period_end);
  if (pianoItem.category !== "rentable" || !dueDate) return [];

  return Promise.all(
    getRentalReminderTimes(dueDate).map(({ daysBefore, date }) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: "🎹 Piano Rental Due Soon!",
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
          channelId:
            Platform.OS === "android" ? "rental-reminders" : undefined,
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
        (item) => item?.category === "rentable" && item.rental_period_end
      );
      // All rental reminders were just cancelled, so skip the per-piano
      // cancel (one native lookup per piano)
      const results = await Promise.all(
        rentals.map((item) =>
          scheduleRentalReminders(item).catch((error) => {
            console.error(`❌ Error scheduling reminders for ${item.title}:`, error);
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

// Get all scheduled notifications
export const getScheduledNotifications = async () => {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error("Error getting scheduled notifications:", error);
    return [];
  }
};

// Clean up expired notifications
export const cleanupExpiredNotifications = async () => {
  try {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();
    const now = new Date();

    const expiredNotifications = scheduledNotifications.filter(
      (notification: Notifications.NotificationRequest) => {
        const trigger = notification.trigger as any;
        if (trigger && trigger.date) {
          const notificationDate = new Date(trigger.date);
          return notificationDate <= now;
        }
        return false;
      }
    );

    if (expiredNotifications.length > 0) {
      console.log(
        `🧹 Cleaning up ${expiredNotifications.length} expired notifications`
      );

      const cancelPromises = expiredNotifications.map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier)
      );

      await Promise.all(cancelPromises);
      console.log("✅ Expired notifications cleaned up");
    }

    return expiredNotifications.length;
  } catch (error) {
    console.error("❌ Error cleaning up expired notifications:", error);
    return 0;
  }
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

// Cancel all scheduled notifications
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("🗑️ Cancelled all scheduled notifications");
  } catch (error) {
    console.error("❌ Error cancelling all notifications:", error);
  }
};

// Get notification status for debugging
export const getNotificationStatus = async () => {
  try {
    const permissions = await Notifications.getPermissionsAsync();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    return {
      permissions,
      scheduledCount: scheduled.length,
      scheduledNotifications: scheduled.map((n) => ({
        id: n.identifier,
        title: n.content.title,
        date: (n.trigger as any)?.date,
        data: n.content.data,
      })),
    };
  } catch (error) {
    console.error("❌ Error getting notification status:", error);
    return null;
  }
};

// Test function to show a sample notification immediately
export const showTestNotification = async () => {
  try {
    console.log("🔔 Creating test notification...");

    // Schedule notification for 30 seconds from now
    const testDate = new Date(Date.now() + 30 * 1000); // 30 seconds from now

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🎹 Test Notification - Pianoverse",
        body: "This is a test notification to verify the notification system is working! Your rental reminder system is ready.",
        data: {
          type: "test_notification",
          test: true,
        },
        sound: "default",
      },
      trigger: {
        date: testDate,
        channelId: Platform.OS === "android" ? "rental-reminders" : undefined,
      },
    });

    console.log(`✅ Test notification scheduled! ID: ${notificationId}`);
    console.log(
      `⏰ Notification will appear at: ${testDate.toLocaleTimeString()}`
    );
    console.log("📱 Check your device in 30 seconds to see the notification!");

    return {
      success: true,
      notificationId,
      scheduledTime: testDate.toISOString(),
    };
  } catch (error) {
    console.error("❌ Error creating test notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Test function to show notification immediately (no delay)
export const showImmediateTestNotification = async () => {
  try {
    console.log("🚀 Creating immediate test notification...");

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🎹 Immediate Test - Pianoverse",
        body: "This notification appeared immediately! Your notification system is working perfectly.",
        data: {
          type: "immediate_test",
          test: true,
        },
        sound: "default",
      },
      trigger: null, // null trigger = show immediately
    });

    console.log(`✅ Immediate test notification sent! ID: ${notificationId}`);
    console.log(
      "📱 Check your device now - the notification should appear immediately!"
    );

    return {
      success: true,
      notificationId,
    };
  } catch (error) {
    console.error("❌ Error creating immediate test notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
