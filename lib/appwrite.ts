import { PianoItem, PianoItemFormStateType } from "@/redux/pianos/types";
import { toStoredDate } from "@/utils/dates";
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
  Avatars,
  Databases,
  OAuthProvider,
  Query,
  Storage,
} from "react-native-appwrite";
import type { Models } from "react-native-appwrite";

export const appwriteConfig = {
  endpoint: "https://cloud.appwrite.io/v1",
  platform: "com.grlnsngh.pianoverse",
  projectId: "66b2693000154e2fa3c8",
  databaseId: "66b26b1300171b9140be",
  userCollectionId: "66b26b2a00163be2e73a",
  pianoCollectionId: "66b26b3c002284a5a862",
  rentPaymentsCollectionId: "rent_payments",
  rentalHistoryCollectionId: "rental_history",
  storageId: "66b26b77003445e612b4",
};

// Init your React Native SDK
const client = new Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

const account = new Account(client);
const storage = new Storage(client);
const avatars = new Avatars(client);
const databases = new Databases(client);

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
    const newAccount = await account.create(
      ID.unique(),
      email,
      password,
      username
    );

    if (!newAccount) throw Error;

    const avatarUrl = avatars.getInitials(username);

    await signIn(email, password);

    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
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
    return await account.createEmailPasswordSession(email, password);
  } catch (error) {
    // A session left from before (e.g. the app opened without a connection
    // and asked to sign in) blocks a new one, so end it and try again
    if ((error as { type?: string })?.type === "user_session_already_exists") {
      await account.deleteSession("current").catch(() => {});
      return account.createEmailPasswordSession(email, password);
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
  const url = account.createOAuth2Token(OAuthProvider.Google, redirect, redirect);
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
    return await account.createSession(userId, secret);
  } catch (error) {
    // A session left from before blocks a new one, so end it and try again
    if ((error as { type?: string })?.type === "user_session_already_exists") {
      await account.deleteSession("current").catch(() => {});
      return account.createSession(userId, secret);
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
      return await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
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
    databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      { accountId: current.$id, email: current.email, username, avatar }
    );

  if (!profile?.picture) return create(avatars.getInitials(username));
  try {
    return await create(largerGooglePhoto(profile.picture));
  } catch (error) {
    // Say the photo address doesn't fit the column, or anything else about it:
    // the person still gets an account, with their initials
    console.warn("Could not save the Google photo, using initials:", error);
    return create(avatars.getInitials(username));
  }
}

/**
 * The avatar that says the person chose to have no picture: the letters
 * Appwrite draws for `username`, marked as removed (see `utils/profile.ts`).
 */
export function removedAvatarUrl(username: string): string {
  return markRemoved(String(avatars.getInitials(username)));
}

/**
 * Changes the name or the picture saved on the person's user document.
 *
 * @param {string} userDocumentId - The user document's ID.
 * @param {{ username?: string; avatar?: string }} fields - What to change.
 * @returns {Promise<any>} A promise that resolves to the updated user document.
 * @throws {Error} If Appwrite can't be reached or refuses the change.
 */
export async function updateUserProfile(
  userDocumentId: string,
  fields: { username?: string; avatar?: string }
): Promise<any> {
  return databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.userCollectionId,
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

  const { documents } = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.userCollectionId,
    [Query.equal("accountId", currentAccount.$id)]
  );
  return documents[0] ?? null;
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
export const toPianoItem = (document: Models.Document): PianoItem =>
  ({
    ...document,
    image_url: document.image_url
      ? convertImageUrl(document.image_url)
      : document.image_url,
    ...(Array.isArray(document.image_urls) && {
      image_urls: document.image_urls
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
    const documents: Models.Document[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < MAX_PIANO_PAGES; page++) {
      const queries = [
        Query.orderDesc("$createdAt"),
        Query.equal("creator", userAccountId),
        Query.limit(PIANO_PAGE_SIZE),
      ];
      if (cursor) queries.push(Query.cursorAfter(cursor));

      const { documents: pageDocuments } = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.pianoCollectionId,
        queries
      );
      documents.push(...pageDocuments);

      if (pageDocuments.length < PIANO_PAGE_SIZE) break;
      cursor = pageDocuments[pageDocuments.length - 1].$id;
    }

    return documents.map(toPianoItem);
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
    const session = await account.deleteSession("current");

    return session;
  } catch (error) {
    // The session already expired, so there is nothing left to sign out of
    if ((error as { code?: number })?.code === 401) return null;
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
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

    const uploadedFile = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      asset
    );
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
  let fileUrl;

  try {
    fileUrl = storage.getFileView(appwriteConfig.storageId, fileId);

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

    const response = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pianoCollectionId,
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
  const response = await databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.pianoCollectionId,
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

    const response = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pianoCollectionId,
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
    await storage.deleteFile(appwriteConfig.storageId, fileId);
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
    const response = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pianoCollectionId,
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
    databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.rentPaymentsCollectionId,
      ID.unique(),
      fields
    );

  const customerName = payment.customerName?.trim();
  if (!customerName) return (await create(data)) as unknown as RentPayment;

  try {
    return (await create({ ...data, customer_name: customerName })) as unknown as RentPayment;
  } catch (error) {
    // The table may not have the customer_name column yet: the payment is
    // still worth saving, so record it without the name rather than failing
    if (!/unknown attribute|invalid document structure/i.test(String((error as Error)?.message))) {
      throw error;
    }
    console.warn("rent_payments has no customer_name column yet; saved without it");
    return (await create(data)) as unknown as RentPayment;
  }
}

/** Every rent payment matching the queries, fetched page by page. */
const listRentPayments = async (queries: string[]): Promise<RentPayment[]> => {
  const payments: RentPayment[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAYMENT_PAGES; page++) {
    const pageQueries = [...queries, Query.limit(PAYMENT_PAGE_SIZE)];
    if (cursor) pageQueries.push(Query.cursorAfter(cursor));

    const { documents } = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.rentPaymentsCollectionId,
      pageQueries
    );
    payments.push(...(documents as unknown as RentPayment[]));

    if (documents.length < PAYMENT_PAGE_SIZE) break;
    cursor = documents[documents.length - 1].$id;
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

/** Deletes one rent payment. */
export async function deleteRentPayment(paymentId: string) {
  return databases.deleteDocument(
    appwriteConfig.databaseId,
    appwriteConfig.rentPaymentsCollectionId,
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
  closedOn: Date;
  reason: "replaced" | "ended";
}

/**
 * Whether Appwrite said the table doesn't exist: the owner hasn't created
 * rental_history yet. The app works without it, it just can't keep a history.
 */
export const isMissingTable = (error: unknown) =>
  /collection with the requested id could not be found|collection_not_found/i.test(
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
  };
  return (await databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.rentalHistoryCollectionId,
    ID.unique(),
    data
  )) as unknown as RentalHistoryEntry;
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
      const { documents } = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.rentalHistoryCollectionId,
        queries
      );
      entries.push(...(documents as unknown as RentalHistoryEntry[]));
      if (documents.length < PAYMENT_PAGE_SIZE) break;
      cursor = documents[documents.length - 1].$id;
    }
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return entries;
}

/** Deletes every kept rental of a piano, e.g. because the piano is deleted. */
export async function deleteRentalHistoryForPiano(pianoId: string) {
  const { documents } = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.rentalHistoryCollectionId,
    [Query.equal("piano_id", pianoId), Query.limit(PAYMENT_PAGE_SIZE)]
  );
  await Promise.all(
    documents.map((document) =>
      databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.rentalHistoryCollectionId,
        document.$id
      )
    )
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
    const resetUrl =
      "https://grlnsngh.github.io/pianoverse/reset-password.html";

    const recovery = await account.createRecovery(email, resetUrl);

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
    const recovery = await account.updateRecovery(userId, secret, password);

    return recovery;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}
