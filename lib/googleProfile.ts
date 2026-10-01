import { getGoogleAccessToken } from "@/lib/appwrite";
import { GoogleProfile, parseGoogleProfile } from "@/utils/googleSignIn";

const USERINFO = "https://www.googleapis.com/oauth2/v3/userinfo";
/** A slow answer isn't worth keeping the person waiting for a photo. */
const TIMEOUT_MS = 4000;

/**
 * Reads the person's Google name and photo, right after they signed in with
 * Google: Appwrite keeps the access token Google gave it, and the app uses it
 * once to ask Google's `userinfo` (it asks for no more than the basic sign-in
 * already allowed: name, email and photo). Nothing here may stop a sign-in, so
 * any problem gives null and the person is signed in without a photo.
 */
export async function fetchGoogleProfile(): Promise<GoogleProfile | null> {
  try {
    const token = await getGoogleAccessToken();
    if (!token) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(USERINFO, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (!response.ok) return null;
      return parseGoogleProfile(await response.json());
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    console.warn("Could not read the Google profile:", error);
    return null;
  }
}
