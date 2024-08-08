import { PianoItemFormStateType } from "@/redux/pianos/types";
import {
  Account,
  Client,
  ID,
  Avatars,
  Databases,
  Query,
  Storage,
} from "react-native-appwrite";

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
  } catch (error) {
    console.log(error);
    return null;
  }
}

/**
 * Retrieves piano entries created by a specific user.
 *
 * @param {string} userAccountId - The ID of the user whose piano entries are to be retrieved.
 * @returns {Promise<Object[]>} A promise that resolves to an array of documents representing the user's piano entries.
 * @throws {Error} If there is an error retrieving the piano entries.
 */
export async function getUserPianoEntries(userAccountId: string) {
  try {
    const items = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.pianoCollectionId,
      [Query.orderDesc("$createdAt"), Query.equal("creator", userAccountId)]
    );
    return items.documents;
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}

/**
 * Uploads a file to Appwrite storage and returns the file preview URL.
 *
 * @param {Object} pianoData - The data for the piano entry.
 * @param {Object} pianoData.image_url - The image file to be uploaded.
 * @param {string} pianoData.image_url.fileName - The original file name of the image.
 * @param {string} pianoData.image_url.type - The MIME type of the image.
 * @param {number} pianoData.image_url.fileSize - The size of the image file in bytes.
 * @param {string} pianoData.image_url.uri - The URI of the image file.
 * @param {string} pianoData.title - The title of the piano entry.
 * @returns {Promise<string>} The URL of the uploaded file preview.
 * @throws {Error} If there is an error uploading the file.
 */
export async function uploadFile(pianoData) {
  const file = pianoData.image_url;
  if (!file) return;

  try {
    // Extract the file extension from the original file name
    const fileExtension = file.fileName.split(".").pop();
    // Create a new file name using pianoData.title and the extracted file extension
    const newFileName = `${pianoData.title}.${fileExtension}`;

    const asset = {
      name: newFileName,
      type: `${file.type}/${fileExtension}`,
      size: file.fileSize,
      uri: file.uri,
    };

    const uploadedFile = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      asset
    );

    const fileUrl = await getFilePreview(uploadedFile.$id);
    return fileUrl;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}

/**
 * Creates a new piano entry in the database.
 *
 * @param {Object} pianoData - The data for the piano entry.
 * @param {string} pianoData.name - The name of the piano.
 * @param {string} pianoData.type - The type of the piano.
 * @param {string} pianoData.manufacturer - The manufacturer of the piano.
 * @param {string} pianoData.image - The image file of the piano.
 * @returns {Promise<Object>} The response from the database after creating the document.
 * @throws {Error} If there is an error creating the piano entry.
 */
export async function getFilePreview(fileId) {
  let fileUrl;

  try {
    fileUrl = storage.getFilePreview(
      appwriteConfig.storageId,
      fileId,
      2000,
      2000,
      "top",
      100
    );

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
 * @param {Object} pianoData - The data for the piano entry.
 * @param {string} pianoData.name - The name of the piano.
 * @param {string} pianoData.type - The type of the piano.
 * @param {string} pianoData.manufacturer - The manufacturer of the piano.
 * @param {string} pianoData.image - The image file of the piano.
 * @returns {Promise<Object>} The response from the database after creating the document.
 * @throws {Error} If there is an error creating the piano entry.
 */
export async function createPianoEntry(pianoData) {
  try {
    const imageUrl = await uploadFile(pianoData);
    const response = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pianoCollectionId,
      ID.unique(),
      { ...pianoData, image_url: imageUrl }
    );
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating piano entry:", errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Updates an existing piano entry in the database.
 *
 * @param {string} documentId - The ID of the document to update.
 * @param {Partial<PianoItemFormStateType>} pianoData - The data of the piano entry to update.
 * @param {string} [pianoData.image_url] - The URL or local file path of the piano image.
 * @returns {Promise<Object>} The updated document response from the database.
 * @throws {Error} If there is an error updating the piano entry.
 */
export async function updatePianoEntry(
  documentId: string,
  pianoData: Partial<PianoItemFormStateType>
) {
  try {
    let imageUrl = pianoData?.image_url || "";

    // Check if image_url is a local file path
    if (imageUrl.startsWith("file://")) {
      imageUrl = await uploadFile(pianoData);
    }

    const response = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pianoCollectionId,
      documentId,
      { ...pianoData, image_url: imageUrl }
    );

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error updating piano entry:", errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Deletes a piano entry from the database.
 *
 * @param {string} itemId - The ID of the piano entry to delete.
 * @returns {Promise<Object>} The response from the database after deletion.
 * @throws {Error} If there is an error deleting the piano entry.
 */
export async function deletePianoEntry(itemId: string) {
  try {
    const response = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pianoCollectionId,
      itemId
    );
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error deleting piano entry:", errorMessage);
    throw new Error(errorMessage);
  }
}
