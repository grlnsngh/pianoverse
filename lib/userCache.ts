import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@/redux/users/types";

/**
 * The signed-in user saved on the device, so the app can open without a
 * connection (with the pianos saved by pianoCache). Failures are ignored: the
 * worst case is being asked to sign in.
 */

const KEY = "signedInUser";

export const saveSignedInUser = async (user: User) => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(user));
  } catch (error) {
    console.warn("Could not remember the signed-in user:", error);
  }
};

export const loadSignedInUser = async (): Promise<User | null> => {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn("Could not read the signed-in user:", error);
    return null;
  }
};

/** Forgets the user, e.g. on sign-out. */
export const clearSignedInUser = async () => {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (error) {
    console.warn("Could not forget the signed-in user:", error);
  }
};
