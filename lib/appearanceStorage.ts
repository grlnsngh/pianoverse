import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AppearanceSetting,
  DEFAULT_APPEARANCE,
  isAppearanceSetting,
} from "@/utils/appearance";

const KEY = "appearance:setting";

/** The theme the person picked, on this phone. Unknown or unreadable counts as the default, so a failed read never leaves the app unusable. */
export const loadAppearance = async (): Promise<AppearanceSetting> => {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    return isAppearanceSetting(stored) ? stored : DEFAULT_APPEARANCE;
  } catch (error) {
    console.warn("Could not read the appearance setting:", error);
    return DEFAULT_APPEARANCE;
  }
};

/** Remembers the choice. Resolves to whether it was saved. */
export const saveAppearance = async (
  setting: AppearanceSetting
): Promise<boolean> => {
  try {
    if (setting === DEFAULT_APPEARANCE) await AsyncStorage.removeItem(KEY);
    else await AsyncStorage.setItem(KEY, setting);
    return true;
  } catch (error) {
    console.warn("Could not save the appearance setting:", error);
    return false;
  }
};
