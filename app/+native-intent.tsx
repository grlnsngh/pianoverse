import { googleReturnPath } from "@/lib/googleReturn";
import { setPendingPianoLink } from "@/lib/pendingPianoLink";
import { isGoogleReturn } from "@/utils/googleSignIn";
import { pianoIdFromLink } from "@/utils/qrScan";

/**
 * Called with every address that opens the app from outside (expo-router asks
 * for this file by name). When Google sends the person back after signing in,
 * the address is `appwrite-callback-<project id>://?userId=...&secret=...`, which
 * the sign-in code reads itself; this keeps the app on the screen that asked
 * for it (Sign in or Create account) instead of going to a screen for that address.
 *
 * A QR label scanned with the phone's own camera opens `pianoverse://detail/<id>`.
 * That address would land on the piano's page with no pianos loaded when nobody
 * is signed in, so it is kept (lib/pendingPianoLink.ts) and the app starts at its
 * first screen: the Pianos tab opens the piano once it has the pianos, which only
 * a signed-in person gets.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (isGoogleReturn(path)) return googleReturnPath();
  const pianoId = pianoIdFromLink(path);
  if (pianoId) {
    setPendingPianoLink(pianoId);
    return "/";
  }
  return path;
}
