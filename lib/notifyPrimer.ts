import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

const SEEN_KEY = "notifyPrimer:seen";

/**
 * Whether to show the "Get reminders before rentals end" sheet: only on a
 * phone that hasn't been asked about notifications yet, and only once.
 * Anyone who has already allowed or refused them has nothing left to decide.
 * Fails quietly: a question that can't be checked isn't asked.
 */
export const shouldShowNotifyPrimer = async (): Promise<boolean> => {
  try {
    if (await AsyncStorage.getItem(SEEN_KEY)) return false;
    const { status } = await Notifications.getPermissionsAsync();
    return status === "undetermined";
  } catch (error) {
    console.warn("Could not check whether to explain reminders:", error);
    return false;
  }
};

/** The sheet was answered (Turn on reminders or Not now), so it isn't shown again. */
export const markNotifyPrimerSeen = async () => {
  try {
    await AsyncStorage.setItem(SEEN_KEY, "1");
  } catch (error) {
    console.warn("Could not remember that reminders were explained:", error);
  }
};
