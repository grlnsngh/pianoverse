import { usernameError } from "@/utils/authForms";

/**
 * The person's own profile: their name and picture. The picture is the
 * `avatar` address saved on their user document, and says which of these it is:
 *  - the letters Appwrite draws (made up by the app: nobody chose them),
 *  - the same letters marked as removed (the person chose to have no picture),
 *  - a Google photo (follows their Google account),
 *  - a picture they uploaded to the app's storage.
 */

/** The longest name the app takes, as at sign in with Google. */
export const MAX_NAME = 100;

/** A name as it is saved: no spaces at the ends or doubled up. */
export const cleanName = (name: string) => name.trim().replace(/\s+/g, " ");

/** What is wrong with a name, in words for under the field, or "". */
export const nameError = (name: string) => {
  const clean = cleanName(name);
  if (!clean) return "Enter your name.";
  if (clean.length > MAX_NAME) return `Name must be ${MAX_NAME} characters or fewer.`;
  return usernameError(clean).replace("Choose a username.", "Enter your name.").replace(
    "Username must",
    "Name must"
  );
};

const REMOVED = /[?&]removed=1(&|$)/;

/**
 * The letters Appwrite draws, marked so that the person's choice to have no
 * picture is kept: a Google sign-in later doesn't put their Google photo back.
 * It is still a valid address, so the column that holds it accepts it.
 */
export const markRemoved = (initialsUrl: string) =>
  `${initialsUrl}${initialsUrl.includes("?") ? "&" : "?"}removed=1`;

/** Whether this is the letters marked as removed by the person. */
export const isRemovedAvatar = (avatar: string | null | undefined) =>
  !!avatar && /\/avatars\/initials/i.test(avatar) && REMOVED.test(avatar);

/** Whether the address is a file in this app's storage bucket: a picture the person uploaded. */
export const isUploadedPhoto = (avatar: string | null | undefined, bucketId: string) =>
  !!avatar && avatar.includes(`/storage/buckets/${bucketId}/files/`);
