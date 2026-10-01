import * as WebBrowser from "expo-web-browser";
import {
  appwriteConfig,
  createSessionFromToken,
  ensureUserDocument,
  getGoogleLoginUrl,
  signOut,
} from "@/lib/appwrite";
import { fetchGoogleProfile } from "@/lib/googleProfile";
import { setGoogleReturnPath, GoogleReturnPath } from "@/lib/googleReturn";
import { googleRedirectUrl, parseGoogleReturn } from "@/utils/googleSignIn";

export type GoogleSignInResult =
  | { status: "signed_in"; user: any }
  /** The person closed Google's page without finishing: not a failure */
  | { status: "cancelled" };

/**
 * Signs in with Google: opens Google's page in the phone's browser, waits for
 * it to send the person back with a one-time token, turns that into a session,
 * and makes sure the app's own user document exists (a first sign-in with this
 * Google account has none yet), with the person's Google name and photo.
 *
 * @param {GoogleReturnPath} startedFrom - The screen this was started from, which the app stays on when Google sends the person back.
 * @throws {Error} With words for the person if Google or Appwrite couldn't finish.
 */
export async function signInWithGoogle(
  startedFrom: GoogleReturnPath
): Promise<GoogleSignInResult> {
  const redirect = googleRedirectUrl(appwriteConfig.projectId);
  setGoogleReturnPath(startedFrom);

  const result = await WebBrowser.openAuthSessionAsync(
    getGoogleLoginUrl(redirect),
    redirect
  );
  if (result.type !== "success") return { status: "cancelled" };

  const back = parseGoogleReturn(result.url);
  if (!back.ok) throw new Error(back.message);

  await createSessionFromToken(back.userId, back.secret);
  try {
    const profile = await fetchGoogleProfile();
    return { status: "signed_in", user: await ensureUserDocument(profile) };
  } catch (error) {
    // Don't leave a session behind that the app can't use without its document
    await signOut().catch(() => {});
    throw error;
  }
}
