import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";
import { subDays } from "date-fns";
import { setActiveTab } from "@/redux/navigation/actions";
import store from "@/redux/store";
import { parseStoredDate } from "@/utils/dates";
import type { PlannedSummary } from "@/utils/morningSummary";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// The Android channels: the rental reminders, and the morning summary, which
// has its own so it can be switched off in the phone's settings on its own
const SUMMARY_CHANNEL = "morning-summary";
const setUpReminderChannel = async () => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("rental-reminders", {
    name: "Rental Reminders",
    // eslint-disable-next-line import/namespace -- the plugin can't follow expo-notifications' re-exports
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF9C01",
    sound: "default",
  });
  await Notifications.setNotificationChannelAsync(SUMMARY_CHANNEL, {
    name: "Morning summary",
    // eslint-disable-next-line import/namespace -- the plugin can't follow expo-notifications' re-exports
    importance: Notifications.AndroidImportance.DEFAULT,
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

// Android lets an app have at most 500 alarms waiting, and every scheduled
// notification is one. With many pianos the reminders alone could pass that
// (five for each rental), and whatever was set after them, such as the morning
// summary, would silently fail. So each kind keeps only its soonest, together
// well under the limit (300 + 150 + 7 summaries); the later ones are set as they
// come closer, since the app puts the reminders in place every time it opens.
export const MAX_RENTAL_REMINDERS = 300;
export const MAX_TUNING_REMINDERS = 150;

/** A notification to have in place: what it says, when, and on which Android channel. */
interface Planned {
  content: Notifications.NotificationContentInput;
  date: Date;
  channelId?: string;
}

/** A short fingerprint of a text (FNV-1a), for identifiers. */
const fingerprint = (text: string) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
};

/** The identifier of a planned notification: the same words at the same time always get the same one. */
export const plannedId = (type: string, plan: Planned) =>
  `${type}-${plan.date.getTime().toString(36)}-${fingerprint(JSON.stringify(plan.content) + (plan.channelId ?? ""))}`;

const schedulePlanned = (type: string, plan: Planned) =>
  Notifications.scheduleNotificationAsync({
    identifier: plannedId(type, plan),
    content: plan.content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: plan.date,
      channelId: plan.channelId,
    },
  });

/** The soonest first, at most `max`. */
const soonest = (plans: Planned[], max: number) =>
  [...plans].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, max);

/**
 * Makes the scheduled notifications of one kind exactly these, touching only
 * what differs: one already scheduled with the same identifier (the same words
 * at the same time) stays, the others of that kind are cancelled, and the
 * missing ones are added. Opening the app with nothing changed then costs one
 * look at what is scheduled, instead of cancelling and setting every reminder
 * again (hundreds, with many pianos). One that fails to be set doesn't stop the
 * others. Resolves with the identifiers of what is in place.
 */
const syncScheduled = async (type: string, plans: Planned[]): Promise<string[]> => {
  const wanted = new Map(plans.map((plan) => [plannedId(type, plan), plan]));
  const scheduled = (await Notifications.getAllScheduledNotificationsAsync()).filter(
    (notification) => notification.content.data?.type === type
  );
  const present = new Set(scheduled.map((notification) => notification.identifier));
  await Promise.allSettled(
    scheduled
      .filter((notification) => !wanted.has(notification.identifier))
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier))
  );
  const missing = [...wanted].filter(([id]) => !present.has(id));
  const added = await Promise.allSettled(missing.map(([, plan]) => schedulePlanned(type, plan)));
  const failed = new Set<string>();
  added.forEach((result, index) => {
    if (result.status === "fulfilled") return;
    failed.add(missing[index][0]);
    console.error(`❌ A ${type} notification couldn't be set:`, result.reason);
  });
  return [...wanted.keys()].filter((id) => !failed.has(id));
};

/** A rental's reminders still ahead (none for a piano that isn't rented out or is sold). */
const rentalPlans = (pianoItem: any): Planned[] => {
  const dueDate = parseStoredDate(pianoItem?.rental_period_end);
  if (pianoItem?.category !== "rentable" || !dueDate || pianoItem.sold_date) return [];
  return getRentalReminderTimes(dueDate).map(({ daysBefore, date }) => ({
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
    date,
    channelId: Platform.OS === "android" ? "rental-reminders" : undefined,
  }));
};

// Schedule a rental's reminders, each with its own identifier (so the next full
// rescheduling knows them). Existing reminders must already be cancelled.
const scheduleRentalReminders = (pianoItem: any) =>
  Promise.all(rentalPlans(pianoItem).map((plan) => schedulePlanned("rental_due", plan)));

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

let schedulingQueue: Promise<unknown> = Promise.resolve();

// Replace all rental reminders with ones for these pianos. Reminders for
// pianos that were deleted or are no longer rented are removed too.
export const scheduleAllRentalNotifications = (pianoItems: any[]) => {
  const run = async () => {
    try {
      const rentals = (Array.isArray(pianoItems) ? pianoItems : []).filter(
        (item) =>
          item?.category === "rentable" &&
          item.rental_period_end &&
          !item.sold_date
      );
      // One look at what is scheduled for all of them, and only what changed is touched
      const notificationIds = await syncScheduled(
        "rental_due",
        soonest(rentals.flatMap(rentalPlans), MAX_RENTAL_REMINDERS)
      );

      console.log(
        `✅ ${notificationIds.length} reminder(s) in place for ${rentals.length} rental(s)`
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

/** A piano's next tuning, for its 9:00 reminder on the day. */
export interface TuningReminder {
  pianoId: string;
  title: string;
  /** Who has it, for a rented piano */
  who?: string | null;
  due: Date;
}

/** 9:00 on the day a tuning is due, or null once that has passed. */
export const getServiceReminderTime = (due: Date, now = new Date()) => {
  const date = new Date(due);
  date.setHours(REMINDER_HOUR, 0, 0, 0);
  return date > now ? date : null;
};

let serviceQueue: Promise<unknown> = Promise.resolve();

/**
 * Replaces every tuning reminder with one at 9:00 on each of these due days
 * (utils/serviceLog.ts works them out). An empty list removes them all, as at
 * sign out.
 */
export const scheduleAllServiceNotifications = (reminders: TuningReminder[]) => {
  const run = async () => {
    try {
      const plans = reminders.flatMap(({ pianoId, title, who, due }): Planned[] => {
        const date = getServiceReminderTime(due);
        if (!date) return [];
        return [
          {
            content: {
              title: "Tuning due today",
              body: who ? `${title}, rented to ${who}.` : `${title}.`,
              data: { pianoId, type: "service_due" },
              sound: "default",
            },
            date,
            channelId: Platform.OS === "android" ? "rental-reminders" : undefined,
          },
        ];
      });
      return await syncScheduled("service_due", soonest(plans, MAX_TUNING_REMINDERS));
    } catch (error) {
      console.error("❌ Error scheduling tuning reminders:", error);
      return [];
    }
  };
  // One at a time, so overlapping calls can't leave duplicates
  const result = serviceQueue.then(run, run);
  serviceQueue = result;
  return result;
};

let summaryQueue: Promise<unknown> = Promise.resolve();

/**
 * Replaces every morning summary with these (utils/morningSummary.ts works out
 * which mornings have something to say, and what). An empty list removes them
 * all, as when the summary is switched off or at sign out.
 */
export const scheduleMorningSummaries = (summaries: PlannedSummary[]) => {
  const run = async () => {
    try {
      const now = new Date();
      return await syncScheduled(
        "morning_summary",
        summaries
          .filter(({ date }) => date > now)
          .map(({ date, title, body }) => ({
            content: { title, body, data: { type: "morning_summary" }, sound: "default" },
            date,
            channelId: Platform.OS === "android" ? SUMMARY_CHANNEL : undefined,
          }))
      );
    } catch (error) {
      console.error("❌ Error scheduling the morning summary:", error);
      return [];
    }
  };
  // One at a time, so overlapping calls can't leave duplicates
  const result = summaryQueue.then(run, run);
  summaryQueue = result;
  return result;
};

// Handle notification response (when user taps on notification)
export const handleNotificationResponse = (
  response: Notifications.NotificationResponse
) => {
  const data = response.notification.request.content.data;

  // The morning summary is about the day: show Today, from wherever the app is
  if (data?.type === "morning_summary") {
    store.dispatch(setActiveTab("today") as any);
    router.navigate("/home");
    return;
  }

  if ((data?.type === "rental_due" || data?.type === "service_due") && data?.pianoId) {
    router.push(`/detail/${data.pianoId}`);
  }
};
