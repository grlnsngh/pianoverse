import { PianoItem, PianoItemFormStateType } from "@/redux/pianos/types";
import {
  Account,
  Client,
  ID,
  Avatars,
  Databases,
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
    const session = await account.createEmailPasswordSession(email, password);

    return session;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}

/**
 * Retrieves the current user's account and user document from the database.
 *
 * @returns {Promise<Object|null>} A promise that resolves to the current user's document, or null if an error occurs.
 * @throws {Error} If there is an error retrieving the current user's account or document.
 */
export async function getCurrentUser() {
  try {
    const currentAccount = await account.get();
    if (!currentAccount) throw Error;

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", currentAccount.$id)]
    );

    if (!currentUser) throw Error;

    return currentUser.documents[0];
  } catch {
    // Nobody is signed in (or the session has expired)
    return null;
  }
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
 * Prepares a piano document for the app: converts its image URL to one
 * without transformations.
 */
export const toPianoItem = (document: Models.Document): PianoItem =>
  ({
    ...document,
    image_url: document.image_url
      ? convertImageUrl(document.image_url)
      : document.image_url,
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
 * Piano data as sent by the forms. `image_url` is either the stored image URL
 * or a newly picked image (an image picker asset or a file:// URI).
 */
export type PianoEntryInput = Omit<
  Partial<PianoItemFormStateType>,
  "image_url" | "users"
> & {
  image_url?: string | LocalImageAsset | null;
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
  image: PianoEntryInput["image_url"]
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
 * @param {PianoEntryInput} pianoData - The data object containing file and user information.
 * @param {LocalImageAsset | string} pianoData.image_url - The picked image (asset or file:// URI) to be uploaded.
 * @param {string} pianoData.users - The user ID.
 * @param {string} pianoData.title - The title of the item.
 * @returns {Promise<URL | void>} - The URL of the uploaded file or void if there is no image to upload.
 * @throws {Error} - Throws an error if the upload fails.
 */
export async function uploadFile(pianoData: PianoEntryInput) {
  const file = toLocalImage(pianoData.image_url);
  if (!file) return;

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
    const userId = sanitizeFileName(String(pianoData.users ?? ""));
    const itemTitle = sanitizeFileName(pianoData.title ?? "");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-"); // Optional: Add timestamp for uniqueness

    // Create a new file name using pianoData.title and the extracted file extension
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
 * Creates a new piano entry in the database.
 *
 * @param {PianoEntryInput} pianoData - The data for the piano entry.
 * @returns {Promise<Object>} The response from the database after creating the document.
 * @throws {Error} If there is an error creating the piano entry.
 */
export async function createPianoEntry(pianoData: PianoEntryInput) {
  try {
    const imageUrl = await uploadFile(pianoData);
    const response = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pianoCollectionId,
      ID.unique(),
      { ...pianoData, image_url: imageUrl || "" }
    );
    return response;
  } catch (error) {
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
 * @param {string | LocalImageAsset} [pianoData.image_url] - The stored image URL, or a newly picked image to upload.
 * @param {string} [previousImageUrl] - The piano's current image; deleted once a new image has been saved.
 * @returns {Promise<Object>} The updated document response from the database.
 * @throws {Error} If there is an error updating the piano entry.
 */
export async function updatePianoEntry(
  documentId: string,
  pianoData: PianoEntryInput,
  previousImageUrl?: string | null
) {
  let uploadedImageUrl: string | undefined;

  try {
    let imageUrl =
      typeof pianoData.image_url === "string" ? pianoData.image_url : "";

    // Upload a newly picked image
    if (toLocalImage(pianoData.image_url)) {
      const uploadedUrl = await uploadFile(pianoData);
      if (uploadedUrl) {
        uploadedImageUrl = String(uploadedUrl);
        imageUrl = uploadedImageUrl;
      }
    }
    const response = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pianoCollectionId,
      documentId,
      { ...pianoData, image_url: imageUrl }
    );

    // The piano now points at the new image, so the old file is unused
    if (uploadedImageUrl && previousImageUrl) {
      await deleteFileByUrl(previousImageUrl).catch((error) =>
        console.warn("Could not delete the replaced image:", error)
      );
    }

    return response;
  } catch (error) {
    // Don't leave the new upload behind if the piano could not be saved
    if (uploadedImageUrl) {
      await deleteFileByUrl(uploadedImageUrl).catch(() => {});
    }
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

    // Then its image; a missing image must not keep the piano from being deleted
    if (item.image_url) {
      await deleteFileByUrl(item.image_url).catch((error) =>
        console.warn("Could not delete the piano's image:", error)
      );
    }

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error deleting piano entry:", errorMessage);
    throw new Error(errorMessage);
  }
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
