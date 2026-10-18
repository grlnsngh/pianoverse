import { RESET_PASSWORD_URL } from "@/constants/links";
import { PianoItem, PianoItemFormStateType } from "@/redux/pianos/types";
import { toStoredDate } from "@/utils/dates";
import { formEventRow, type FormEvent } from "@/utils/formEvents";
import type { Expense, ExpenseCategory } from "@/utils/expenses";
import type { ServiceEntry, ServiceKind } from "@/utils/serviceLog";
import {
  avatarToStore,
  GoogleProfile,
  largerGooglePhoto,
  usernameFor,
} from "@/utils/googleSignIn";
import { markRemoved } from "@/utils/profile";
import {
  Account,
  Client,
  ID,
  TablesDB,
  ExecutionMethod,
  Functions,
  OAuthProvider,
  Query,
  Storage,
} from "react-native-appwrite";
import type { Models } from "react-native-appwrite";
import type { User } from "@/redux/users/types";

export const appwriteConfig = {
  endpoint: "https://cloud.appwrite.io/v1",
  platform: "com.grlnsngh.pianoverse",
  projectId: "66b2693000154e2fa3c8",
  databaseId: "66b26b1300171b9140be",
  userTableId: "66b26b2a00163be2e73a",
  pianoTableId: "66b26b3c002284a5a862",
  rentPaymentsTableId: "rent_payments",
  // Named rental_history in the console; it was made with an ID of its own
  rentalHistoryTableId: "6abdffe40034432a5cde",
  // The paper forms' usage counts (Batch 32)
  formEventsTableId: "form_events",
  // The tuning and service log (Batch 35)
  serviceLogTableId: "service_log",
  // Business expenses, not tied to a piano (Batch 36)
  expensesTableId: "expenses",
  storageId: "66b26b77003445e612b4",
  // The Appwrite Function in functions/delete-account
  deleteAccountFunctionId: "delete-account",
};

// Init your React Native SDK
const client = new Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

const account = new Account(client);
const storage = new Storage(client);
const tablesDB = new TablesDB(client);
const functions = new Functions(client);

/** A row as the SDK hands it back: Appwrite's own fields, and the table's columns `T`. */
type Row<T extends object = Record<string, unknown>> = Models.Row & T;

/**
 * The app's rows API: the five calls it makes on a table of the project's
 * database. Here the SDK's loose typing of a row's columns is settled once,
 * so that the callers get the type of the table they ask for.
 */
const db = {
  list: <T extends object>(tableId: string, queries: string[]) =>
    tablesDB.listRows<Row<T>>({ databaseId: appwriteConfig.databaseId, tableId, queries }),
  create: async <T extends object>(
    tableId: string,
    rowId: string,
    data: object,
    permissions?: string[]
  ) =>
    (await tablesDB.createRow({
      databaseId: appwriteConfig.databaseId,
      tableId,
      rowId,
      data,
      permissions,
    })) as unknown as Row<T>,
  update: async <T extends object>(tableId: string, rowId: string, data: object) =>
    (await tablesDB.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId,
      rowId,
      data,
    })) as unknown as Row<T>,
  remove: (tableId: string, rowId: string) =>
    tablesDB.deleteRow({ databaseId: appwriteConfig.databaseId, tableId, rowId }),
};

/**
 * Where a stored photo is viewed, in the one form the app has always saved
 * (and reads back, e.g. to find the file to delete). The SDK's own address
 * builder adds parameters the saved addresses never had.
 */
export const fileViewUrl = (fileId: string) =>
  `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storageId}/files/${fileId}/view?project=${appwriteConfig.projectId}`;

/** The picture Appwrite draws from a name's letters, as an address. */
const initialsUrl = (name: string) =>
  `${appwriteConfig.endpoint}/avatars/initials?name=${encodeURIComponent(name)}&project=${appwriteConfig.projectId}`;

/**
 * Creates a new user account and user document in the database.
 *
 * @param {string} email - The email address of the new user.
 * @param {string} password - The password for the new user account.
 * @param {string} username - The username for the new user.
 * @returns {Promise<any>} A promise that resolves to the newly created user document.
 * @throws {Error} If there is an error during the user creation process.
 */
export async function createUser(
  email: string,
  password: string,
  username: string
): Promise<any> {
  try {
    const newAccount = await account.create({
      userId: ID.unique(),
      email,
      password,
      name: username,
    });

    if (!newAccount) throw Error;

    const avatarUrl = initialsUrl(username);

    await signIn(email, password);

    const newUser = await db.create(
      appwriteConfig.userTableId,
      ID.unique(),
      {
        accountId: newAccount.$id,
        email: email,
        username: username,
        avatar: avatarUrl,
      }
    );

    return newUser;
  } catch (error) {
    // Ensure the error is a string
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}

/**
 * Signs in a user using their email and password.
 *
 * @param {string} email - The email address of the user.
 * @param {string} password - The password of the user.
 * @returns {Promise<any>} A promise that resolves to the session object if the sign-in is successful.
 * @throws {Error} If there is an error during the sign-in process.
 */
export async function signIn(email: string, password: string): Promise<any> {
  try {
    return await account.createEmailPasswordSession({ email, password });
  } catch (error) {
    // A session left from before (e.g. the app opened without a connection
    // and asked to sign in) blocks a new one, so end it and try again
    if ((error as { type?: string })?.type === "user_session_already_exists") {
      await account.deleteSession({ sessionId: "current" }).catch(() => {});
      return account.createEmailPasswordSession({ email, password });
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}

/**
 * The Google page to open to sign in. Appwrite sends the person back to
 * `redirect` (on success or failure) with a one-time token, which
 * `createSessionFromToken` turns into a session. The token way works in a phone
 * app, where the cookie way of createOAuth2Session doesn't.
 *
 * @param {string} redirect - The address that opens this app again.
 * @returns {string} The address of the Google login page.
 */
export function getGoogleLoginUrl(redirect: string): string {
  const url = account.createOAuth2Token({
    provider: OAuthProvider.Google,
    success: redirect,
    failure: redirect,
  });
  if (!url) throw new Error("Couldn’t start Google sign-in.");
  return url.toString();
}

/**
 * Signs in with the token Appwrite sent back after Google signed the person in.
 *
 * @param {string} userId - The account Google's sign-in belongs to.
 * @param {string} secret - The one-time token.
 * @returns {Promise<any>} A promise that resolves to the session.
 * @throws {Error} If the token is wrong or has been used.
 */
export async function createSessionFromToken(
  userId: string,
  secret: string
): Promise<any> {
  try {
    return await account.createSession({ userId, secret });
  } catch (error) {
    // A session left from before blocks a new one, so end it and try again
    if ((error as { type?: string })?.type === "user_session_already_exists") {
      await account.deleteSession({ sessionId: "current" }).catch(() => {});
      return account.createSession({ userId, secret });
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}

/**
 * The access token Google gave Appwrite when the person signed in with Google,
 * which Google's own `userinfo` answers to for a minute or so. Null when this
 * account has no Google sign-in. It is used once, right after signing in, and
 * is never kept.
 */
export async function getGoogleAccessToken(): Promise<string | null> {
  const { identities } = await account.listIdentities();
  const google = identities.find((identity) => identity.provider === "google");
  return google?.providerAccessToken || null;
}

/**
 * Returns the signed-in person's user document, making one when there is none.
 * Signing in with Google makes the Appwrite account but not this document,
 * which the app looks for everywhere; email sign up makes both.
 *
 * `profile` is what Google says about the person. A new document gets their
 * Google name and photo (their initials when there is no photo). One that is
 * there already keeps its name, and takes the Google photo only in place of
 * letters the app made up or an older Google photo.
 *
 * @param {GoogleProfile | null} profile - The Google name and photo, if they could be read.
 * @returns {Promise<any>} A promise that resolves to the user document.
 * @throws {Error} If Appwrite can't be reached or the document can't be made.
 */
export async function ensureUserDocument(
  profile: GoogleProfile | null = null
): Promise<any> {
  const existing = await getCurrentUser();
  if (existing) {
    const photo = avatarToStore(existing.avatar, profile?.picture);
    if (!photo) return existing;
    try {
      return await db.update(
        appwriteConfig.userTableId,
        existing.$id,
        { avatar: photo }
      );
    } catch (error) {
      // The photo is a nicety: signing in doesn't depend on it
      console.warn("Could not save the Google photo:", error);
      return existing;
    }
  }

  const current = await account.get();
  const username = usernameFor(profile?.name ?? current.name, current.email);
  const create = (avatar: unknown) =>
    db.create(
      appwriteConfig.userTableId,
      ID.unique(),
      { accountId: current.$id, email: current.email, username, avatar }
    );

  if (!profile?.picture) return create(initialsUrl(username));
  try {
    return await create(largerGooglePhoto(profile.picture));
  } catch (error) {
    // Say the photo address doesn't fit the column, or anything else about it:
    // the person still gets an account, with their initials
    console.warn("Could not save the Google photo, using initials:", error);
    return create(initialsUrl(username));
  }
}

/**
 * The avatar that says the person chose to have no picture: the letters
 * Appwrite draws for `username`, marked as removed (see `utils/profile.ts`).
 */
export function removedAvatarUrl(username: string): string {
  return markRemoved(initialsUrl(username));
}

/**
 * Changes the name, the picture or the UPI ID saved on the person's user
 * document. An empty UPI ID is saved as null: it takes the ID off.
 *
 * @param {string} userDocumentId - The user document's ID.
 * @param {{ username?: string; avatar?: string; upi_id?: string | null }} fields - What to change.
 * @returns {Promise<any>} A promise that resolves to the updated user document.
 * @throws {Error} If Appwrite can't be reached or refuses the change.
 */
export async function updateUserProfile(
  userDocumentId: string,
  fields: { username?: string; avatar?: string; upi_id?: string | null }
): Promise<any> {
  return db.update(
    appwriteConfig.userTableId,
    userDocumentId,
    fields
  );
}

/**
 * Retrieves the current user's account and user document from the database.
 *
 * @returns {Promise<Object|null>} A promise that resolves to the current user's document, or null if nobody is signed in.
 * @throws {Error} If Appwrite can't be reached (e.g. there is no connection), since who is signed in is then unknown.
 */
export async function getCurrentUser() {
  let currentAccount: Models.User<Models.Preferences>;
  try {
    currentAccount = await account.get();
  } catch (error) {
    // Nobody is signed in (or the session has expired)
    if ((error as { code?: number })?.code === 401) return null;
    throw error;
  }

  const { rows } = await db.list<User>(appwriteConfig.userTableId, [
    Query.equal("accountId", currentAccount.$id),
  ]);
  return rows[0] ?? null;
}

/**
 * Converts an old transformed image URL to a new URL without transformations.
 *
 * @param {string} oldUrl - The old URL with transformation parameters.
 * @returns {string | null} - The new URL without transformations or null if conversion fails.
 */
export function convertImageUrl(oldUrl: string): string | null {
  if (!oldUrl || typeof oldUrl !== "string") return null;

  // If it's already a view URL (no transformation parameters), return as is
  if (oldUrl.includes("/view?")) {
    return oldUrl;
  }

  // Extract file ID from the old URL
  const fileIdMatch = oldUrl.match(/files\/([^/]+)\//);
  if (!fileIdMatch) return null;

  const fileId = fileIdMatch[1];

  // Generate new URL without transformations
  const newUrl = `https://cloud.appwrite.io/v1/storage/buckets/${appwriteConfig.storageId}/files/${fileId}/view?project=${appwriteConfig.projectId}`;

  return newUrl;
}

/**
 * Prepares a piano document for the app: converts the URLs of its photos to
 * ones without transformations.
 */
export const toPianoItem = (row: Models.Row & Record<string, any>): PianoItem =>
  ({
    ...row,
    image_url: row.image_url
      ? convertImageUrl(row.image_url)
      : row.image_url,
    ...(Array.isArray(row.image_urls) && {
      image_urls: row.image_urls
        .map(convertImageUrl)
        .filter((url: string | null): url is string => !!url),
    }),
  }) as unknown as PianoItem;

// Appwrite returns 25 documents per request unless a limit is given, so piano
// lists are fetched page by page.
const PIANO_PAGE_SIZE = 100;
const MAX_PIANO_PAGES = 100;

/**
 * Retrieves all piano entries created by a specific user and converts image URLs.
 *
 * @param {string} userAccountId - The ID of the user whose piano entries are to be retrieved.
 * @returns {Promise<Object[]>} A promise that resolves to an array of documents with converted image URLs.
 * @throws {Error} If there is an error retrieving the piano entries.
 */
export async function getUserPianoEntries(userAccountId: string) {
  try {
    const rows: Row[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < MAX_PIANO_PAGES; page++) {
      const queries = [
        Query.orderDesc("$createdAt"),
        Query.equal("creator", userAccountId),
        Query.limit(PIANO_PAGE_SIZE),
      ];
      if (cursor) queries.push(Query.cursorAfter(cursor));

      const { rows: pageRows } = await db.list(appwriteConfig.pianoTableId, queries);
      rows.push(...pageRows);

      if (pageRows.length < PIANO_PAGE_SIZE) break;
      cursor = pageRows[pageRows.length - 1].$id;
    }

    return rows.map(toPianoItem);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}

/**
 * Signs out the current user by deleting their session.
 *
 * @returns {Promise<Object>} The response from the server after deleting the session.
 * @throws {Error} If there is an error during the sign-out process.
 */
export async function signOut() {
  try {
    const session = await account.deleteSession({ sessionId: "current" });

    return session;
  } catch (error) {
    // The session already expired, so there is nothing left to sign out of
    if ((error as { code?: number })?.code === 401) return null;
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}

const DELETE_FAILED = "Your account couldn't be deleted. Check your connection and try again.";

/**
 * Deletes the signed-in person's account and everything saved with it: their
 * pianos and photos, rent payments, kept rentals and profile. An app can't
 * delete an Appwrite account itself, so the delete-account Appwrite Function
 * (functions/delete-account) does it, and waits until it is done.
 *
 * @throws {Error} With a message to show the person, when anything was left;
 *   asking again finishes the job.
 */
export async function deleteAccount(): Promise<void> {
  let execution: Models.Execution;
  try {
    execution = await functions.createExecution({
      functionId: appwriteConfig.deleteAccountFunctionId,
      body: JSON.stringify({ confirm: "DELETE" }),
      async: false,
      xpath: "/",
      method: ExecutionMethod.POST,
    });
  } catch (error) {
    console.warn("Could not run delete-account:", error);
    throw new Error(DELETE_FAILED);
  }

  let reply: { ok?: boolean; message?: string } = {};
  try {
    reply = JSON.parse(execution.responseBody || "{}");
  } catch {
    // Not the function's own answer, e.g. Appwrite's when it timed out
  }
  if (execution.status !== "completed" || execution.responseStatusCode !== 200 || !reply.ok) {
    console.warn("delete-account did not finish:", execution.status, execution.responseStatusCode);
    throw new Error(reply.message || DELETE_FAILED);
  }
}

/** An image picked on the device that still has to be uploaded. */
export interface LocalImageAsset {
  uri: string;
  fileName?: string | null;
  fileSize?: number;
  mimeType?: string;
}

/**
 * A photo of a piano: the URL of one that is already stored, or a newly picked
 * one (an image picker asset or a file:// URI) that still has to be uploaded.
 */
export type PianoPhoto = string | LocalImageAsset;

/**
 * Piano data as sent by the forms. `photos` are all the piano's photos in the
 * order they are shown; the first is the cover.
 */
export type PianoEntryInput = Omit<
  Partial<PianoItemFormStateType>,
  "image_url" | "image_urls" | "users"
> & {
  photos?: PianoPhoto[];
  // The owner's user document ID
  users?: string;
};

const IMAGE_MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

const getFileExtension = (value?: string | null) =>
  value?.split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i)?.[1];

/** Returns the picked image to upload, or null if `image` is already stored. */
const toLocalImage = (
  image: PianoPhoto | null | undefined
): LocalImageAsset | null => {
  if (!image) return null;
  if (typeof image === "string") {
    return image.startsWith("file://") ? { uri: image } : null;
  }
  return image;
};

const getLocalFileSize = async (uri: string) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob.size;
};

/**
 * A token that stands for the signed-in person for 15 minutes. An image view
 * can't carry the session the SDK keeps, so a photo in the storage is asked for
 * with this instead (lib/photoAuth.ts).
 */
export async function createPhotoToken(): Promise<string> {
  const { jwt } = await account.createJWT();
  return jwt;
}

/**
 * Uploads a picked image to the storage.
 *
 * @param {LocalImageAsset} file - The picked image (asset or file:// URI) to be uploaded.
 * @param {{ users?: string; title?: string }} owner - The user ID and the title of the piano, used to name the file.
 * @returns {Promise<URL>} - The URL of the uploaded file.
 * @throws {Error} - Throws an error if the upload fails.
 */
export async function uploadFile(
  file: LocalImageAsset,
  owner: { users?: string; title?: string }
) {
  try {
    // Extract the file extension from the original file name
    const fileExtension =
      getFileExtension(file.fileName) ?? getFileExtension(file.uri) ?? "jpg";
    // The uploaded file may have been re-encoded as JPEG by compression, so
    // its content type follows the file itself rather than the original name.
    const mimeType =
      IMAGE_MIME_TYPES[
        (getFileExtension(file.uri) ?? fileExtension).toLowerCase()
      ] ?? "image/jpeg";
    const sanitizeFileName = (input: string) => {
      return input.replace(/[^a-zA-Z0-9-_]/g, "_");
    };
    const userId = sanitizeFileName(String(owner.users ?? ""));
    const itemTitle = sanitizeFileName(owner.title ?? "");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-"); // Optional: Add timestamp for uniqueness

    // Create a new file name using the piano title and the extracted file extension
    const newFileName = `userId_${userId}_itemTitle_${itemTitle}_${timestamp}.${fileExtension}`;

    const asset = {
      name: newFileName,
      type: mimeType,
      // The SDK silently skips the upload when the size is missing
      size: file.fileSize ?? (await getLocalFileSize(file.uri)),
      uri: file.uri,
    };

    const uploadedFile = await storage.createFile({
      bucketId: appwriteConfig.storageId,
      fileId: ID.unique(),
      file: asset,
    });
    if (!uploadedFile?.$id) throw new Error("Image upload failed.");

    const fileUrl = await getFilePreview(uploadedFile.$id);
    return fileUrl;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}

/**
 * The URL for viewing an uploaded file in the storage bucket.
 *
 * @param {string} fileId - The ID of the uploaded file.
 * @returns {Promise<URL>} The file's view URL.
 * @throws {Error} If no URL could be made for the file.
 */
export async function getFilePreview(fileId: string) {
  try {
    const fileUrl = fileViewUrl(fileId);

    if (!fileUrl) throw Error;

    return fileUrl;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}

/**
 * Deletes the files behind the given photo URLs. A file that can't be deleted
 * (e.g. it is already gone) is only logged, so this never throws.
 */
const deletePhotoFiles = async (urls: string[]) => {
  await Promise.all(
    urls.map((url) =>
      deleteFileByUrl(url).catch((error) =>
        console.warn("Could not delete a photo:", error)
      )
    )
  );
};

/**
 * Told how far the uploads are: how many of the new photos have finished, and
 * how many there are. Called with 0 before the first starts.
 */
export type UploadProgress = (finished: number, total: number) => void;

/**
 * Uploads the newly picked photos and returns the URL of every photo in the
 * order given, plus the URLs of the files that were just uploaded. If an
 * upload fails, the ones already uploaded are deleted again.
 */
const uploadPhotos = async (
  photos: PianoPhoto[],
  owner: { users?: string; title?: string },
  onProgress?: UploadProgress
) => {
  const urls: string[] = [];
  const uploaded: string[] = [];
  const total = photos.filter((photo) => toLocalImage(photo)).length;

  try {
    onProgress?.(0, total);
    for (const photo of photos) {
      const local = toLocalImage(photo);
      if (!local) {
        urls.push(photo as string);
        continue;
      }
      const url = String(await uploadFile(local, owner));
      uploaded.push(url);
      urls.push(url);
      onProgress?.(uploaded.length, total);
    }
  } catch (error) {
    await deletePhotoFiles(uploaded);
    throw error;
  }

  return { urls, uploaded };
};

/**
 * Creates a new piano entry in the database.
 *
 * @param {PianoEntryInput} pianoData - The data for the piano entry.
 * @param {PianoPhoto[]} [pianoData.photos] - The piano's photos, the first being the cover. Newly picked ones are uploaded.
 * @param {UploadProgress} [onProgress] - Told after each photo is uploaded.
 * @returns {Promise<Object>} The response from the database after creating the document.
 * @throws {Error} If there is an error creating the piano entry.
 */
export async function createPianoEntry(
  pianoData: PianoEntryInput,
  onProgress?: UploadProgress
) {
  let uploaded: string[] = [];

  try {
    const { photos = [], ...fields } = pianoData;
    const result = await uploadPhotos(photos, pianoData, onProgress);
    uploaded = result.uploaded;

    const response = await db.create(
      appwriteConfig.pianoTableId,
      ID.unique(),
      { ...fields, image_url: result.urls[0] ?? "", image_urls: result.urls }
    );
    return response;
  } catch (error) {
    // Don't leave the uploads behind if the piano could not be saved
    await deletePhotoFiles(uploaded);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating piano entry:", errorMessage);
    throw new Error(errorMessage);
  }
}

/** Piano fields that can be changed on their own (everything but the image). */
export type PianoFieldsUpdate = Omit<
  Partial<PianoItemFormStateType>,
  "image_url"
>;

/**
 * Changes only the given fields of a piano, e.g. to record a sale or extend a
 * rental. Unlike updatePianoEntry it never touches the image.
 */
export async function updatePianoFields(
  documentId: string,
  fields: PianoFieldsUpdate
): Promise<PianoItem> {
  const response = await db.update(
    appwriteConfig.pianoTableId,
    documentId,
    fields
  );
  return toPianoItem(response);
}

/**
 * Updates an existing piano entry in the database.
 *
 * @param {string} documentId - The ID of the document to update.
 * @param {PianoEntryInput} pianoData - The data of the piano entry to update.
 * @param {PianoPhoto[]} [pianoData.photos] - All the piano's photos, the first being the cover: stored URLs to keep and newly picked images to upload.
 * @param {string[]} [previousPhotoUrls] - The URLs of the piano's current photos; the files of those no longer in `photos` are deleted once the piano has been saved.
 * @returns {Promise<Object>} The updated document response from the database.
 * @throws {Error} If there is an error updating the piano entry.
 */
export async function updatePianoEntry(
  documentId: string,
  pianoData: PianoEntryInput,
  previousPhotoUrls: string[] = []
) {
  let uploaded: string[] = [];

  try {
    const { photos = [], ...fields } = pianoData;
    const result = await uploadPhotos(photos, pianoData);
    uploaded = result.uploaded;

    const response = await db.update(
      appwriteConfig.pianoTableId,
      documentId,
      { ...fields, image_url: result.urls[0] ?? "", image_urls: result.urls }
    );

    // The piano no longer uses the photos that were taken out or replaced
    const kept = new Set(result.urls);
    await deletePhotoFiles(previousPhotoUrls.filter((url) => !kept.has(url)));

    return response;
  } catch (error) {
    // Don't leave the new uploads behind if the piano could not be saved
    await deletePhotoFiles(uploaded);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error updating piano entry:", errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Extracts the file ID from the given URL.
 *
 * @param {string} url - The URL of the file.
 * @returns {string | null} - The extracted file ID or null if not found.
 *
 * @example
 * // Example URL
 * const url = "https://cloud.appwrite.io/v1/storage/buckets/66b26b77003445e612b4/files/66b55a6900354f2ced05/preview?width=2000&height=2000&gravity=top&quality=100&project=66b2693000154e2fa3c8";
 * const fileId = extractFileIdFromUrl(url);
 * console.log(fileId); // Output: "66b55a6900354f2ced05"
 */
const extractFileIdFromUrl = (url: string): string | null => {
  const match = url.match(/files\/([^/]+)\//);
  return match ? match[1] : null;
};

/**
 * Deletes a file from the storage.
 *
 * @param {string} url - The URL of the file to be deleted.
 * @returns {Promise<void>} - Resolves when the file is successfully deleted.
 * @throws {Error} - Throws an error if the deletion fails.
 */
export async function deleteFileByUrl(url: string): Promise<void> {
  const fileId = extractFileIdFromUrl(url);
  if (!fileId) {
    throw new Error("Invalid file URL. Unable to extract file ID.");
  }

  try {
    await storage.deleteFile({ bucketId: appwriteConfig.storageId, fileId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete file: ${errorMessage}`);
  }
}

/**
 * Deletes multiple piano entries from the database and their associated files from storage.
 *
 * @param {object[]} items - Array of piano entry objects to be deleted.
 * @returns {Promise<{ deletedIds: string[]; failedIds: string[] }>} - Which pianos were deleted and which could not be.
 */
export async function deleteMultiplePianoEntries(
  items: any[]
): Promise<{ deletedIds: string[]; failedIds: string[] }> {
  const results = await Promise.all(
    items.map(async (item) => {
      try {
        await deletePianoEntry(item);
        return { id: item.$id as string, deleted: true };
      } catch {
        return { id: item.$id as string, deleted: false };
      }
    })
  );

  return {
    deletedIds: results
      .filter((result) => result.deleted)
      .map((result) => result.id),
    failedIds: results
      .filter((result) => !result.deleted)
      .map((result) => result.id),
  };
}

/**
 * Deletes a piano entry from the database and its associated file from the storage.
 *
 * @param {object} item - The piano entry object to be deleted.
 * @param {string} item.$id - The ID of the piano entry.
 * @param {string} [item.image_url] - The URL of the associated image file (optional).
 * @returns {Promise<void>} - Resolves when the piano entry and its associated file are successfully deleted.
 * @throws {Error} - Throws an error if the deletion fails.
 * @see {@link deleteFileByUrl}
 */
export async function deletePianoEntry(item: any) {
  try {
    // Delete the piano entry from the database
    const response = await db.remove(
      appwriteConfig.pianoTableId,
      item.$id
    );

    // Then its photos; a missing one must not keep the piano from being deleted
    const photoUrls = new Set<string>(
      [item.image_url, ...(item.image_urls ?? [])].filter(Boolean)
    );
    await deletePhotoFiles([...photoUrls]);

    // And its rent payments, which mean nothing without the piano
    await deleteRentPaymentsForPiano(item.$id).catch((error) =>
      console.warn("Could not delete the piano's rent payments:", error)
    );
    // And the rentals it had before, for the same reason
    await deleteRentalHistoryForPiano(item.$id).catch((error) => {
      if (!isMissingTable(error)) {
        console.warn("Could not delete the piano's rental history:", error);
      }
    });
    // And its tuning and service log
    await deleteServiceLogForPiano(item.$id).catch((error) => {
      if (!isMissingTable(error)) {
        console.warn("Could not delete the piano's service log:", error);
      }
    });

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error deleting piano entry:", errorMessage);
    throw new Error(errorMessage);
  }
}

/** A rent payment received for a rented piano. */
export interface RentPayment {
  $id: string;
  $createdAt: string;
  piano_id: string;
  // The owner's account ID
  creator: string;
  amount: number;
  // A calendar day, e.g. "2026-09-05"
  paid_on: string;
  note?: string | null;
  // Who had the piano when the payment was recorded. Payments recorded before
  // this was saved don't have it.
  customer_name?: string | null;
}

export interface NewRentPayment {
  pianoId: string;
  creator: string;
  amount: number;
  paidOn: Date;
  note?: string;
  /** The renter's name, saved with the payment so it stays right after a re-rent */
  customerName?: string;
}

const PAYMENT_PAGE_SIZE = 100;
const MAX_PAYMENT_PAGES = 50;

/**
 * Records a rent payment received for a piano.
 *
 * @param {NewRentPayment} payment - The piano, its owner's account ID, the amount and the day it was paid.
 * @returns {Promise<RentPayment>} The saved payment.
 */
export async function createRentPayment(
  payment: NewRentPayment
): Promise<RentPayment> {
  const data = {
    piano_id: payment.pianoId,
    creator: payment.creator,
    amount: payment.amount,
    paid_on: toStoredDate(payment.paidOn),
    ...(payment.note ? { note: payment.note } : {}),
  };
  const create = (fields: Record<string, unknown>) =>
    db.create<RentPayment>(appwriteConfig.rentPaymentsTableId, ID.unique(), fields);

  const customerName = payment.customerName?.trim();
  if (!customerName) return await create(data);

  try {
    return await create({ ...data, customer_name: customerName });
  } catch (error) {
    // The table may not have the customer_name column yet: the payment is
    // still worth saving, so record it without the name rather than failing
    if (!/unknown (attribute|column)|invalid (document|row) structure/i.test(String((error as Error)?.message))) {
      throw error;
    }
    console.warn("rent_payments has no customer_name column yet; saved without it");
    return await create(data);
  }
}

/** Every rent payment matching the queries, fetched page by page. */
const listRentPayments = async (queries: string[]): Promise<RentPayment[]> => {
  const payments: RentPayment[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAYMENT_PAGES; page++) {
    const pageQueries = [...queries, Query.limit(PAYMENT_PAGE_SIZE)];
    if (cursor) pageQueries.push(Query.cursorAfter(cursor));

    const { rows } = await db.list<RentPayment>(appwriteConfig.rentPaymentsTableId, pageQueries);
    payments.push(...rows);

    if (rows.length < PAYMENT_PAGE_SIZE) break;
    cursor = rows[rows.length - 1].$id;
  }

  return payments;
};

/**
 * Retrieves every rent payment of a piano, page by page, newest first.
 *
 * @param {string} pianoId - The ID of the piano.
 * @returns {Promise<RentPayment[]>} The payments, most recently paid first.
 */
export async function getRentPayments(pianoId: string): Promise<RentPayment[]> {
  return listRentPayments([
    Query.equal("piano_id", pianoId),
    Query.orderDesc("paid_on"),
  ]);
}

/** A calendar day as the start of that day, the way paid_on is stored. */
const startOfStoredDay = (day: Date) => `${toStoredDate(day)}T00:00:00.000+00:00`;

/**
 * Retrieves every rent payment an owner recorded, for all their pianos, that
 * was paid from `from` up to but not including `to`.
 *
 * @param {string} creator - The owner's account ID.
 * @param {Date} from - The first day of the period.
 * @param {Date} to - The day the period ends on (not part of it).
 * @returns {Promise<RentPayment[]>} The payments paid in the period.
 */
export async function getRentPaymentsBetween(
  creator: string,
  from: Date,
  to: Date
): Promise<RentPayment[]> {
  return listRentPayments([
    Query.equal("creator", creator),
    Query.greaterThanEqual("paid_on", startOfStoredDay(from)),
    Query.lessThan("paid_on", startOfStoredDay(to)),
  ]);
}

/**
 * What can be changed on a recorded payment. Only what is given is saved. An
 * empty `note` or `customerName` takes the note or the name off the payment.
 */
export interface RentPaymentChanges {
  amount?: number;
  paidOn?: Date;
  note?: string;
  /** Who had paid it: the name saved with the payment */
  customerName?: string;
}

/**
 * Changes a rent payment that was recorded, for example a wrong amount, a
 * wrong day or a misspelled name. Only the fields in `changes` are sent, so a
 * table that has no `customer_name` column yet is only a problem when the name
 * itself is changed.
 *
 * @param {string} paymentId - The payment's ID.
 * @param {RentPaymentChanges} changes - What to change.
 * @returns {Promise<RentPayment>} The payment as it is now.
 * @throws {Error} If Appwrite can't be reached or refuses the change.
 */
export async function updateRentPayment(
  paymentId: string,
  changes: RentPaymentChanges
): Promise<RentPayment> {
  const data: Record<string, unknown> = {};
  if (changes.amount !== undefined) data.amount = changes.amount;
  if (changes.paidOn !== undefined) data.paid_on = toStoredDate(changes.paidOn);
  if (changes.note !== undefined) data.note = changes.note.trim() || null;
  if (changes.customerName !== undefined) {
    data.customer_name = changes.customerName.trim() || null;
  }

  return db.update<RentPayment>(appwriteConfig.rentPaymentsTableId, paymentId, data);
}

/** Deletes one rent payment. */
export async function deleteRentPayment(paymentId: string) {
  return db.remove(
    appwriteConfig.rentPaymentsTableId,
    paymentId
  );
}

/** Deletes every rent payment of a piano, e.g. because the piano is deleted. */
export async function deleteRentPaymentsForPiano(pianoId: string) {
  const payments = await getRentPayments(pianoId);
  await Promise.all(payments.map((payment) => deleteRentPayment(payment.$id)));
}

/** A rental that is over, kept so the piano's history and a customer's page can show it. */
export interface RentalHistoryEntry {
  $id: string;
  $createdAt: string;
  piano_id: string;
  // The owner's account ID
  creator: string;
  // What the piano was called then, in case it is renamed
  piano_title?: string | null;
  customer_name?: string | null;
  customer_mobile?: string | null;
  customer_address?: string | null;
  // Calendar days, as the piano stores them
  period_start?: string | null;
  period_end?: string | null;
  price?: number | null;
  // The deposit that was held for it when it ended; none when there was none
  deposit?: number | null;
  // How much of it was given back: none (null) while it isn't settled, 0 when none was
  deposit_refunded?: number | null;
  // Why part was kept: "unpaid rent", "damage", "unpaid rent and damage"
  deposit_note?: string | null;
  // The day the rental was replaced or ended
  closed_on: string;
  // "replaced" (a new renter or a new period) or "ended" (no longer rented out)
  reason?: string | null;
}

export interface NewRentalHistory {
  pianoId: string;
  pianoTitle?: string | null;
  creator: string;
  customerName?: string | null;
  customerMobile?: string | null;
  customerAddress?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  price?: number | null;
  /** The deposit that was held for the rental when it ended, when there was one */
  deposit?: number | null;
  /** How much of it was given back: left out while it isn't settled (0 is settled, with nothing given back) */
  depositRefunded?: number | null;
  /** Why part was kept ("unpaid rent", "damage"), when part was */
  depositNote?: string | null;
  closedOn: Date;
  /** Replaced by another rental, ended by taking the customer off, or the piano came back */
  reason: "replaced" | "ended" | "returned";
}

/**
 * Whether Appwrite said the table doesn't exist: the owner hasn't created
 * rental_history yet. The app works without it, it just can't keep a history.
 */
export const isMissingTable = (error: unknown) =>
  /(collection|table) with the requested id.*could not be found|(collection|table)_not_found/i.test(
    String((error as { message?: string; type?: string })?.message ?? "") +
      String((error as { type?: string })?.type ?? "")
  );

/** Keeps a rental that is over. Only the details that were filled in are saved. */
export async function createRentalHistory(
  entry: NewRentalHistory
): Promise<RentalHistoryEntry> {
  const clean = (value?: string | null) => value?.trim() || undefined;
  const data = {
    piano_id: entry.pianoId,
    creator: entry.creator,
    closed_on: toStoredDate(entry.closedOn),
    reason: entry.reason,
    ...(clean(entry.pianoTitle) ? { piano_title: clean(entry.pianoTitle) } : {}),
    ...(clean(entry.customerName) ? { customer_name: clean(entry.customerName) } : {}),
    ...(clean(entry.customerMobile) ? { customer_mobile: clean(entry.customerMobile) } : {}),
    ...(clean(entry.customerAddress) ? { customer_address: clean(entry.customerAddress) } : {}),
    ...(entry.periodStart ? { period_start: entry.periodStart } : {}),
    ...(entry.periodEnd ? { period_end: entry.periodEnd } : {}),
    ...(typeof entry.price === "number" ? { price: entry.price } : {}),
    ...(typeof entry.deposit === "number" && entry.deposit > 0
      ? {
          deposit: entry.deposit,
          ...(typeof entry.depositRefunded === "number" ? { deposit_refunded: entry.depositRefunded } : {}),
          ...(clean(entry.depositNote) ? { deposit_note: clean(entry.depositNote) } : {}),
        }
      : {}),
  };
  return db.create<RentalHistoryEntry>(appwriteConfig.rentalHistoryTableId, ID.unique(), data);
}

/**
 * Every past rental an owner has kept, for all their pianos, page by page. An
 * owner who hasn't created the table yet has none.
 */
export async function getRentalHistory(creator: string): Promise<RentalHistoryEntry[]> {
  const entries: RentalHistoryEntry[] = [];
  let cursor: string | undefined;
  try {
    for (let page = 0; page < MAX_PAYMENT_PAGES; page++) {
      const queries = [Query.equal("creator", creator), Query.limit(PAYMENT_PAGE_SIZE)];
      if (cursor) queries.push(Query.cursorAfter(cursor));
      const { rows } = await db.list<RentalHistoryEntry>(appwriteConfig.rentalHistoryTableId, queries);
      entries.push(...rows);
      if (rows.length < PAYMENT_PAGE_SIZE) break;
      cursor = rows[rows.length - 1].$id;
    }
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return entries;
}

/**
 * Only the details of a kept rental that were changed (Edit rental). An empty
 * name, number or address, or no date or rent, takes that detail off the rental.
 */
export interface RentalHistoryChanges {
  customerName?: string | null;
  customerMobile?: string | null;
  customerAddress?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  price?: number | null;
  /** The deposit that was held; none (null) takes it off, and what was refunded with it */
  deposit?: number | null;
  /** How much was given back: null is "not settled", 0 is "none given back" */
  depositRefunded?: number | null;
  depositNote?: string | null;
}

const historyRow = (changes: RentalHistoryChanges) => {
  const text = (value: string | null) => value?.trim() || null;
  const data: Record<string, unknown> = {};
  if (changes.customerName !== undefined) data.customer_name = text(changes.customerName);
  if (changes.customerMobile !== undefined) data.customer_mobile = text(changes.customerMobile);
  if (changes.customerAddress !== undefined) data.customer_address = text(changes.customerAddress);
  if (changes.periodStart !== undefined) {
    data.period_start = changes.periodStart ? toStoredDate(changes.periodStart) : null;
  }
  if (changes.periodEnd !== undefined) {
    data.period_end = changes.periodEnd ? toStoredDate(changes.periodEnd) : null;
  }
  if (changes.price !== undefined) {
    data.price = changes.price && changes.price > 0 ? changes.price : null;
  }
  if (changes.deposit !== undefined) {
    data.deposit = changes.deposit && changes.deposit > 0 ? changes.deposit : null;
  }
  if (changes.depositRefunded !== undefined) data.deposit_refunded = changes.depositRefunded;
  if (changes.depositNote !== undefined) data.deposit_note = text(changes.depositNote);
  return data;
};

/** Changes a kept rental: only the details in `changes` are sent. */
export async function updateRentalHistoryEntry(
  entryId: string,
  changes: RentalHistoryChanges
): Promise<RentalHistoryEntry> {
  return db.update<RentalHistoryEntry>(appwriteConfig.rentalHistoryTableId, entryId, historyRow(changes));
}

/** Deletes one kept rental, e.g. because marking the piano as returned was undone. */
export async function deleteRentalHistoryEntry(entryId: string) {
  return db.remove(
    appwriteConfig.rentalHistoryTableId,
    entryId
  );
}

/** Deletes every kept rental of a piano, e.g. because the piano is deleted. */
export async function deleteRentalHistoryForPiano(pianoId: string) {
  const { rows } = await db.list(appwriteConfig.rentalHistoryTableId, [
    Query.equal("piano_id", pianoId),
    Query.limit(PAYMENT_PAGE_SIZE),
  ]);
  await Promise.all(rows.map((row) => db.remove(appwriteConfig.rentalHistoryTableId, row.$id)));
}

/** A tuning, repair, cleaning, move or other service to keep (utils/serviceLog.ts). */
export interface NewServiceEntry {
  pianoId: string;
  creator: string;
  servicedOn: Date;
  kind: ServiceKind;
  cost?: number | null;
  note?: string | null;
}

/** Only the fields of an entry that changed. */
export interface ServiceEntryChanges {
  servicedOn?: Date;
  kind?: ServiceKind;
  cost?: number | null;
  note?: string | null;
}

const serviceRow = (changes: ServiceEntryChanges) => {
  const data: Record<string, unknown> = {};
  if (changes.servicedOn !== undefined) data.serviced_on = toStoredDate(changes.servicedOn);
  if (changes.kind !== undefined) data.kind = changes.kind;
  if (changes.cost !== undefined) data.cost = changes.cost && changes.cost > 0 ? changes.cost : null;
  if (changes.note !== undefined) data.note = changes.note?.trim() || null;
  return data;
};

/** Keeps one service of a piano. */
export async function createServiceEntry(entry: NewServiceEntry): Promise<ServiceEntry> {
  const { pianoId, creator, ...changes } = entry;
  const fields = serviceRow(changes);
  // Nothing empty is sent for a new entry
  const data = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null));
  return db.create<ServiceEntry>(appwriteConfig.serviceLogTableId, ID.unique(), {
    piano_id: pianoId,
    creator,
    ...data,
  });
}

/** Changes an entry: only the fields in `changes` are sent. */
export async function updateServiceEntry(entryId: string, changes: ServiceEntryChanges): Promise<ServiceEntry> {
  return db.update<ServiceEntry>(appwriteConfig.serviceLogTableId, entryId, serviceRow(changes));
}

export async function deleteServiceEntry(entryId: string) {
  return db.remove(appwriteConfig.serviceLogTableId, entryId);
}

/** Every service the owner has kept, for all their pianos, page by page; none when the table isn't there. */
export async function getServiceLog(creator: string): Promise<ServiceEntry[]> {
  const entries: ServiceEntry[] = [];
  let cursor: string | undefined;
  try {
    for (let page = 0; page < MAX_PAYMENT_PAGES; page++) {
      const queries = [Query.equal("creator", creator), Query.limit(PAYMENT_PAGE_SIZE)];
      if (cursor) queries.push(Query.cursorAfter(cursor));
      const { rows } = await db.list<ServiceEntry>(appwriteConfig.serviceLogTableId, queries);
      entries.push(...rows);
      if (rows.length < PAYMENT_PAGE_SIZE) break;
      cursor = rows[rows.length - 1].$id;
    }
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return entries;
}

/** Deletes every service kept for a piano, e.g. because the piano is deleted. */
export async function deleteServiceLogForPiano(pianoId: string) {
  const { rows } = await db.list(appwriteConfig.serviceLogTableId, [
    Query.equal("piano_id", pianoId),
    Query.limit(PAYMENT_PAGE_SIZE),
  ]);
  await Promise.all(rows.map((row) => db.remove(appwriteConfig.serviceLogTableId, row.$id)));
}

/** A business expense to keep (utils/expenses.ts). */
export interface NewExpense {
  creator: string;
  spentOn: Date;
  amount: number;
  category: ExpenseCategory;
  note?: string | null;
}

/** Only the fields of an expense that changed. */
export interface ExpenseChanges {
  spentOn?: Date;
  amount?: number;
  category?: ExpenseCategory;
  note?: string | null;
}

const expenseRow = (changes: ExpenseChanges) => {
  const data: Record<string, unknown> = {};
  if (changes.spentOn !== undefined) data.spent_on = toStoredDate(changes.spentOn);
  if (changes.amount !== undefined) data.amount = changes.amount;
  if (changes.category !== undefined) data.category = changes.category;
  if (changes.note !== undefined) data.note = changes.note?.trim() || null;
  return data;
};

/** Keeps one business expense. */
export async function createExpense(expense: NewExpense): Promise<Expense> {
  const { creator, ...changes } = expense;
  const fields = expenseRow(changes);
  // Nothing empty is sent for a new expense
  const data = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null));
  return db.create<Expense>(appwriteConfig.expensesTableId, ID.unique(), { creator, ...data });
}

/** Changes an expense: only the fields in `changes` are sent. */
export async function updateExpense(expenseId: string, changes: ExpenseChanges): Promise<Expense> {
  return db.update<Expense>(appwriteConfig.expensesTableId, expenseId, expenseRow(changes));
}

export async function deleteExpense(expenseId: string) {
  return db.remove(appwriteConfig.expensesTableId, expenseId);
}

/** Every business expense the owner has kept, page by page; none when the table isn't there. */
export async function getExpenses(creator: string): Promise<Expense[]> {
  const expenses: Expense[] = [];
  let cursor: string | undefined;
  try {
    for (let page = 0; page < MAX_PAYMENT_PAGES; page++) {
      const queries = [Query.equal("creator", creator), Query.limit(PAYMENT_PAGE_SIZE)];
      if (cursor) queries.push(Query.cursorAfter(cursor));
      const { rows } = await db.list<Expense>(appwriteConfig.expensesTableId, queries);
      expenses.push(...rows);
      if (rows.length < PAYMENT_PAGE_SIZE) break;
      cursor = rows[rows.length - 1].$id;
    }
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return expenses;
}

/**
 * Sends one usage count of a paper form (utils/formEvents.ts). Its ID was
 * made when it happened, so a count sent again after a lost answer is refused
 * as already there (409) instead of counted twice. Nobody can read it back
 * from the app: only the owner, in the Appwrite console.
 */
export async function createFormEvent(event: FormEvent) {
  return db.create(
    appwriteConfig.formEventsTableId,
    event.id,
    formEventRow(event),
    []
  );
}

/**
 * Sends a password recovery email to the user.
 *
 * @param {string} email - The email address of the user requesting password reset.
 * @returns {Promise<any>} A promise that resolves to the recovery response.
 * @throws {Error} If there is an error during the password recovery process.
 */
export async function sendPasswordRecovery(email: string): Promise<any> {
  try {
    // For FREE plan: Use a simple web URL that redirects to your app
    // Appwrite will send the default email with this URL
    const recovery = await account.createRecovery({ email, url: RESET_PASSWORD_URL });

    return recovery;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}

/**
 * Updates a user's password using recovery tokens.
 *
 * @param {string} userId - The user ID from the recovery link.
 * @param {string} secret - The secret token from the recovery link.
 * @param {string} password - The new password.
 * @returns {Promise<any>} A promise that resolves to the recovery response.
 * @throws {Error} If there is an error during the password update process.
 */
export async function updatePassword(
  userId: string,
  secret: string,
  password: string
): Promise<any> {
  try {
    const recovery = await account.updateRecovery({ userId, secret, password });

    return recovery;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}
