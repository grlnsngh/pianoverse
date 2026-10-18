/**
 * Photos live in Appwrite's storage, and each belongs to the person who
 * uploaded it (Batch 51, SEC1). An image request says who is asking, so the app
 * sends a short-lived token with it: but only to Appwrite's own storage address.
 * A photo from anywhere else (a Google profile picture) never gets the token.
 */

/** Whether `uri` is a file in Appwrite's storage, the one place the token may go. */
export const isStorageUrl = (uri: string | null | undefined, endpoint: string): boolean =>
  typeof uri === "string" && uri.startsWith(`${endpoint}/storage/`);

/** The headers that tell Appwrite whose photo is being asked for. */
export const photoHeaders = (jwt: string, projectId: string): Record<string, string> => ({
  "X-Appwrite-Project": projectId,
  "X-Appwrite-JWT": jwt,
});

/** Appwrite's token (a JWT) is good for 15 minutes. */
export const TOKEN_LIFETIME_MS = 15 * 60 * 1000;
/** A new one is made after 10, so a photo that is slow to load still has 5 minutes in hand. */
export const TOKEN_FRESH_MS = 10 * 60 * 1000;
