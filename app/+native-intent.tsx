import { googleReturnPath } from "@/lib/googleReturn";
import { isGoogleReturn } from "@/utils/googleSignIn";

/**
 * Called with every address that opens the app from outside (expo-router asks
 * for this file by name). When Google sends the person back after signing in,
 * the address is `appwrite-callback-<project id>://?userId=...&secret=...`, which
 * the sign-in code reads itself; this keeps the app on the screen that asked
 * for it (Sign in or Create account) instead of going to a screen for that address.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return isGoogleReturn(path) ? googleReturnPath() : path;
}
