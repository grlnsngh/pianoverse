/**
 * The rules of the app lock, apart from the phone: how long the app can be out
 * of sight before it asks again, and what to say when asking didn't work.
 */

/**
 * How long the app can be away before it locks. Long enough that sending a
 * WhatsApp reminder, taking a photo or answering a call and coming back
 * doesn't ask again.
 */
export const LOCK_AFTER_MS = 60 * 1000;

/** Locks when the app has been out of sight for the whole time, not for less. */
export const shouldLock = (leftAt: number | null, now: number) =>
  leftAt !== null && now - leftAt >= LOCK_AFTER_MS;

/** Why the phone said no. */
export type UnlockFailure = "cancelled" | "lockout" | "unavailable" | "failed";

/** The phone's error code, as one of our reasons. */
export const failureReason = (error: string | undefined): UnlockFailure => {
  const code = (error ?? "").toLowerCase();
  if (code.includes("cancel")) return "cancelled";
  if (code.includes("lockout")) return "lockout";
  if (
    code.includes("not_enrolled") ||
    code.includes("not_available") ||
    code.includes("passcode_not_set")
  ) {
    return "unavailable";
  }
  return "failed";
};

/** What the lock screen says after a try that didn't open it. Nothing for just backing out. */
export const failureMessage = (reason: UnlockFailure) => {
  switch (reason) {
    case "lockout":
      return "Too many tries. Wait a moment, or use your screen lock.";
    case "failed":
      return "Couldn’t check it. Try again.";
    default:
      return "";
  }
};

/** Said when the lock turns itself off because the phone has nothing to check with any more. */
export const LOCK_OFF_MESSAGE =
  "App lock is off: this phone has no fingerprint or screen lock any more.";
