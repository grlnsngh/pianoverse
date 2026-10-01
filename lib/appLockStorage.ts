import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "appLock:enabled";

/** Whether the person turned the app lock on, on this phone. Unknown counts as off, so a read that fails never locks anyone out. */
export const loadAppLockEnabled = async (): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(KEY)) === "1";
  } catch (error) {
    console.warn("Could not read the app lock setting:", error);
    return false;
  }
};

/** Remembers the setting. Resolves to whether it was saved. */
export const saveAppLockEnabled = async (
  enabled: boolean
): Promise<boolean> => {
  try {
    if (enabled) await AsyncStorage.setItem(KEY, "1");
    else await AsyncStorage.removeItem(KEY);
    return true;
  } catch (error) {
    console.warn("Could not save the app lock setting:", error);
    return false;
  }
};
