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
 *
 * The screens before signing in may be linked to: the website's buttons use
 * `pianoverse://sign-in` and `pianoverse://forget-password`, and an old reset
 * email used `pianoverse://reset-password`. Any other address from outside (a
 * link in a message or on a web page, such as `pianoverse://letterhead-upload`)
 * opens the app at its first screen, not at a screen of the link's choosing
 * (Batch 52, SEC2). The app's own navigation doesn't come through here.
 */
const SIGN_IN_SCREEN = /^(?:pianoverse:\/\/\/?|\/)(?:sign-in|sign-up|forget-password|reset-password)\/?(?:[?#].*)?$/i;

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (isGoogleReturn(path)) return googleReturnPath();
  const pianoId = pianoIdFromLink(path);
  if (pianoId) {
    setPendingPianoLink(pianoId);
    return "/";
  }
  if (SIGN_IN_SCREEN.test(path)) return path;
  return "/";
}
