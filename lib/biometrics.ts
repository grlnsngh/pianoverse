import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { failureReason, UnlockFailure } from "@/utils/appLock";

/**
 * Whether this phone can check the person: a fingerprint or face is set up,
 * or at least a PIN, pattern or password (the phone's screen lock is the
 * fallback when a finger isn't read). Never on the web, and never when the
 * phone can't say.
 */
export const isLockAvailable = async (): Promise<boolean> => {
  if (Platform.OS === "web") return false;
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch (error) {
    console.warn("Could not check the phone's screen lock:", error);
    return false;
  }
};

export type UnlockResult = { ok: true } | { ok: false; reason: UnlockFailure };

/** Asks the phone to check the person, with its own fingerprint, face or screen lock prompt. */
export const authenticate = async (
  promptMessage: string
): Promise<UnlockResult> => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Cancel",
    });
    if (result.success) return { ok: true };
    return { ok: false, reason: failureReason(result.error) };
  } catch (error) {
    console.warn("Could not ask the phone to check:", error);
    return { ok: false, reason: "failed" };
  }
};
