import AsyncStorage from "@react-native-async-storage/async-storage";
import { PianoItem } from "@/redux/pianos/types";

/**
 * A copy of each user's piano list on the device, so the list shows at once
 * on start and is still there without a connection. Failures are ignored: the
 * cache only ever saves a wait.
 */

const KEY_PREFIX = "pianos:";
const keyFor = (userAccountId: string) => `${KEY_PREFIX}${userAccountId}`;

export interface CachedPianos {
  savedAt: string;
  pianos: PianoItem[];
}

export const savePianosToCache = async (
  userAccountId: string,
  pianos: PianoItem[]
): Promise<CachedPianos | null> => {
  const cached = { savedAt: new Date().toISOString(), pianos };
  try {
    await AsyncStorage.setItem(keyFor(userAccountId), JSON.stringify(cached));
    return cached;
  } catch (error) {
    console.warn("Could not save the pianos on this device:", error);
    return null;
  }
};

export const loadPianosFromCache = async (
  userAccountId: string
): Promise<CachedPianos | null> => {
  try {
    const stored = await AsyncStorage.getItem(keyFor(userAccountId));
    return stored ? (JSON.parse(stored) as CachedPianos) : null;
  } catch (error) {
    console.warn("Could not read the pianos saved on this device:", error);
    return null;
  }
};

/** Removes every user's saved pianos, e.g. on sign-out. */
export const clearPianoCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(
      keys.filter((key) => key.startsWith(KEY_PREFIX))
    );
  } catch (error) {
    console.warn("Could not clear the pianos saved on this device:", error);
  }
};
