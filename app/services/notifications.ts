import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { differenceInDays, subDays } from "date-fns";

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

// Schedule notification for rental due date (1 week before)
export const scheduleRentalDueNotification = async (pianoItem: any) => {
  try {
    // Validate input
    if (
      !pianoItem ||
      !pianoItem.rental_period_end ||
      pianoItem.category !== "rentable"
    ) {
      console.log(
        `Skipping notification for piano ${
          pianoItem?.title || "unknown"
        }: invalid data`
      );
      return null;
    }

    const dueDate = new Date(pianoItem.rental_period_end);
    const now = new Date();

    // Validate due date
    if (isNaN(dueDate.getTime())) {
      console.error(
        `Invalid due date for piano ${pianoItem.title}: ${pianoItem.rental_period_end}`
      );
      return null;
    }

    // Check if due date is in the past
    if (dueDate <= now) {
      console.log(
        `Skipping notification for piano ${pianoItem.title}: due date is in the past`
      );
      return null;
    }

    const notificationDate = subDays(dueDate, 7); // 1 week before

    // If notification date is in the past, schedule for tomorrow instead
    const finalNotificationDate =
      notificationDate <= now
        ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
        : notificationDate;

    // Calculate days remaining for notification message
    const daysRemaining = Math.max(1, differenceInDays(dueDate, now));

    // Cancel any existing notification for this piano first
    await cancelRentalNotification(pianoItem.$id);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🎹 Piano Rental Due Soon!",
        body: `"${pianoItem.title}" rental expires in ${daysRemaining} days. Please arrange return or extension.`,
        data: {
          pianoId: pianoItem.$id,
          type: "rental_due",
          dueDate: pianoItem.rental_period_end,
        },
        sound: "default",
      },
      trigger: {
        date: finalNotificationDate,
        channelId: Platform.OS === "android" ? "rental-reminders" : undefined,
      },
    });

    console.log(
      `✅ Scheduled notification for piano "${pianoItem.title}" - ID: ${notificationId}`
    );
    return notificationId;
  } catch (error) {
    console.error("❌ Error scheduling rental notification:", error);
    return null;
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
      console.log(
        `🗑️ Cancelled ${notificationsToCancel.length} notification(s) for piano ID: ${pianoId}`
      );
    } else {
      console.log(
        `ℹ️ No notifications found to cancel for piano ID: ${pianoId}`
      );
    }
  } catch (error) {
    console.error("❌ Error cancelling rental notification:", error);
  }
};

// Schedule notifications for all active rentals
export const scheduleAllRentalNotifications = async (pianoItems: any[]) => {
  try {
    if (!Array.isArray(pianoItems) || pianoItems.length === 0) {
      console.log("ℹ️ No piano items to schedule notifications for");
      return [];
    }

    console.log(
      `🔄 Processing ${pianoItems.length} piano items for notifications`
    );

    // Clean up expired notifications first
    const cleanedCount = await cleanupExpiredNotifications();

    // Filter active rentals with valid due dates
    const activeRentals = pianoItems.filter((item) => {
      if (!item || item.category !== "rentable") return false;
      if (!item.rental_period_end) return false;

      const dueDate = new Date(item.rental_period_end);
      const now = new Date();

      // Only include rentals with future due dates
      return !isNaN(dueDate.getTime()) && dueDate > now;
    });

    console.log(
      `📅 Found ${activeRentals.length} active rentals with future due dates`
    );

    if (activeRentals.length === 0) {
      console.log("ℹ️ No active rentals to schedule notifications for");
      return [];
    }

    // Cancel all existing notifications first to prevent duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("🗑️ Cancelled all existing notifications");

    // Schedule new notifications with error handling for each item
    const notificationPromises = activeRentals.map(async (item) => {
      try {
        return await scheduleRentalDueNotification(item);
      } catch (error) {
        console.error(
          `Failed to schedule notification for piano ${item.title}:`,
          error
        );
        return null;
      }
    });

    const results = await Promise.all(notificationPromises);
    const successfulSchedules = results.filter(
      (id: string | null) => id !== null
    );

    console.log(
      `✅ Successfully scheduled ${successfulSchedules.length} out of ${activeRentals.length} rental notifications`
    );

    // Log summary only if there were failures
    if (successfulSchedules.length < activeRentals.length) {
      const failedCount = activeRentals.length - successfulSchedules.length;
      console.warn(`⚠️ Failed to schedule ${failedCount} notifications`);
    }

    return successfulSchedules;
  } catch (error) {
    console.error("❌ Error in bulk notification scheduling:", error);
    return [];
  }
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
    // Navigate to the piano detail page
    // This would typically use your navigation system
    console.log(
      `User tapped rental due notification for piano: ${data.pianoId}`
    );
    // You could dispatch an action to navigate to the piano detail
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
