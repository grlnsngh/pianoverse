/**
 * The pieces of "Continue with Google" that need no phone: the address Google
 * sends the person back to, reading what comes back, the username for a new
 * account, and the words for a failure. The calls to Appwrite and the browser
 * are in `lib/googleSignIn.ts`.
 */

/**
 * Where the person lands when Google (through Appwrite) is done: the address
 * every Appwrite app on a phone uses, `appwrite-callback-<project id>://`. It
 * is also a scheme in app.json, so the phone sends it to Pianoverse.
 */
export const googleRedirectUrl = (projectId: string) =>
  `appwrite-callback-${projectId}://`;

/** Whether an address that opened the app is Google's way back, whichever project it is for. */
export const isGoogleReturn = (url: string) =>
  /^appwrite-callback-[^:/?#]+:/i.test(url);

const decode = (value: string) => {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
};

/** The `?a=b&c=d` part of an address, as an object (the first of a repeated name wins). */
const queryOf = (url: string): Record<string, string> => {
  const start = url.indexOf("?");
  if (start === -1) return {};
  const end = url.indexOf("#", start);
  const query = url.slice(start + 1, end === -1 ? undefined : end);
  const found: Record<string, string> = {};
  for (const pair of query.split("&")) {
    if (!pair) continue;
    const equals = pair.indexOf("=");
    const name = decode(equals === -1 ? pair : pair.slice(0, equals));
    if (name in found) continue;
    found[name] = equals === -1 ? "" : decode(pair.slice(equals + 1));
  }
  return found;
};

export type GoogleReturn =
  | { ok: true; userId: string; secret: string }
  | { ok: false; message: string };

/** What Appwrite says when it can't finish: the reason, in the `error` part (as JSON, or plain). */
const reasonOf = (error: string) => {
  try {
    const parsed = JSON.parse(error);
    if (typeof parsed?.message === "string") return parsed.message as string;
  } catch {
    // Not JSON: it is the reason itself
  }
  return error;
};

/**
 * Reads the address Appwrite sent the person back to. After a sign-in it has
 * the account (`userId`) and a one-time `secret` that make a session; after a
 * failure it has an `error` instead.
 */
export const parseGoogleReturn = (url: string): GoogleReturn => {
  const query = queryOf(url);
  if (query.userId && query.secret) {
    return { ok: true, userId: query.userId, secret: query.secret };
  }
  return { ok: false, message: query.error ? reasonOf(query.error) : "" };
};

const MAX_USERNAME = 100;

const squash = (value: string | null | undefined) =>
  (value ?? "").trim().replace(/\s+/g, " ");

/**
 * The username for an account made by signing in with Google: the name on the
 * Google account, else the part of the email before the @, else a plain
 * fallback. At least 3 characters, like a username typed at sign up.
 */
export const usernameFor = (
  name: string | null | undefined,
  email: string | null | undefined
) => {
  const fromName = squash(name);
  if (fromName.length >= 3) return fromName.slice(0, MAX_USERNAME);
  const fromEmail = squash(email).split("@")[0];
  if (fromEmail.length >= 3) return fromEmail.slice(0, MAX_USERNAME);
  return "Pianoverse user";
};

/** What Google says about the person that the app uses: the name and the photo. */
export interface GoogleProfile {
  name: string | null;
  picture: string | null;
}

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

/**
 * Reads Google's answer about the person (`userinfo`). The photo is only taken
 * if it is a secure address, and either part may be missing. Null when there is
 * nothing usable in it.
 */
export const parseGoogleProfile = (data: unknown): GoogleProfile | null => {
  if (!data || typeof data !== "object") return null;
  const { name, picture } = data as Record<string, unknown>;
  const photo = text(picture);
  const profile = {
    name: text(name),
    picture: photo && /^https:\/\//i.test(photo) ? photo : null,
  };
  return profile.name || profile.picture ? profile : null;
};

/** Google's photo addresses end in a size, `=s96-c`; this asks for a bigger one, sharp on a phone's screen. */
export const largerGooglePhoto = (url: string, size = 192) =>
  url.replace(/=s\d+(-c)?$/, `=s${size}-c`);

const isGooglePhoto = (url: string) =>
  /^https:\/\/[a-z0-9-]+\.googleusercontent\.com\//i.test(url);

/** An avatar the app made for itself (the letters Appwrite draws), or none: nobody chose it. */
export const isGeneratedAvatar = (avatar: string | null | undefined) =>
  !avatar || /\/avatars\/initials/i.test(avatar);

/**
 * What to save as the person's avatar after a sign-in with Google, or null to
 * leave it. The Google photo replaces letters the app made up and an older
 * Google photo (so a new one follows), and never a picture from anywhere else.
 */
export const avatarToStore = (
  current: string | null | undefined,
  picture: string | null | undefined
): string | null => {
  if (!picture) return null;
  const photo = largerGooglePhoto(picture);
  if (photo === current) return null;
  return isGeneratedAvatar(current) || isGooglePhoto(current as string) ? photo : null;
};

const CONNECTION =
  /network request failed|failed to fetch|network error|timed out|could not connect/i;

/** Why signing in with Google failed, in words for the red box. */
export const googleFailure = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  if (CONNECTION.test(message)) {
    return "We couldn’t reach Pianoverse. Check your connection and try again.";
  }
  if (/already exists/i.test(message)) {
    return "A Pianoverse account with this email already exists. Sign in with your email and password instead.";
  }
  if (/disabled|unsupported|not enabled|not configured|invalid (client|redirect)/i.test(message)) {
    return "Google sign-in isn’t switched on for Pianoverse yet.";
  }
  if (/denied|cancel/i.test(message)) {
    return "Google sign-in didn’t go through. Please try again.";
  }
  return message || "Google didn’t finish signing you in. Please try again.";
};
