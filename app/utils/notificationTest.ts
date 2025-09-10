import {
  scheduleAllRentalNotifications,
  getScheduledNotifications,
  cancelAllNotifications,
  getNotificationStatus,
  cleanupExpiredNotifications,
} from "../services/notifications";

// Test function to verify notification system
export const testNotificationSystem = async (pianoItems: any[]) => {
  console.log("🔔 Testing Notification System...");

  try {
    // Get initial status
    console.log("📊 Initial notification status:");
    const initialStatus = await getNotificationStatus();
    console.log("Permissions:", initialStatus?.permissions.status);
    console.log("Scheduled count:", initialStatus?.scheduledCount);

    // Clean up expired notifications
    console.log("🧹 Cleaning up expired notifications...");
    const cleanedCount = await cleanupExpiredNotifications();
    console.log(`Cleaned up ${cleanedCount} expired notifications`);

    // Cancel all existing notifications
    await cancelAllNotifications();
    console.log("✅ Cancelled all existing notifications");

    // Schedule notifications for test data
    const scheduledIds = await scheduleAllRentalNotifications(pianoItems);
    console.log(`✅ Scheduled ${scheduledIds.length} notifications`);

    // Get final status
    console.log("📊 Final notification status:");
    const finalStatus = await getNotificationStatus();
    console.log("Scheduled count:", finalStatus?.scheduledCount);

    // Log details of scheduled notifications
    if (finalStatus?.scheduledNotifications) {
      console.log("📅 Scheduled notifications:");
      finalStatus.scheduledNotifications.forEach(
        (notification: any, index: number) => {
          const data = notification.data;
          if (data?.type === "rental_due") {
            const date = new Date(notification.date).toLocaleString();
            console.log(
              `${index + 1}. "${
                notification.title
              }" - Scheduled: ${date} - Piano ID: ${data.pianoId}`
            );
          }
        }
      );
    }

    return {
      success: true,
      initialCount: initialStatus?.scheduledCount || 0,
      cleanedCount,
      scheduledCount: scheduledIds.length,
      finalCount: finalStatus?.scheduledCount || 0,
      permissions: initialStatus?.permissions.status,
    };
  } catch (error) {
    console.error("❌ Notification test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Quick status check
export const checkNotificationStatus = async () => {
  console.log("📊 Checking notification status...");
  const status = await getNotificationStatus();
  console.log("Status:", status);
  return status;
};

// Export for use in development
if (__DEV__) {
  // @ts-ignore
  global.testNotifications = testNotificationSystem;
  // @ts-ignore
  global.checkNotificationStatus = checkNotificationStatus;
}
