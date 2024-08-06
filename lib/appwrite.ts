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

// Register user
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

// Sign In
export async function signIn(email: string, password: string): Promise<any> {
  try {
    const session = await account.createEmailPasswordSession(email, password);

    return session;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}

// Get Current User
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

// Get all piano entries
export async function getAllPianoEntries() {
  try {
    const items = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.pianoCollectionId,
      [Query.orderDesc("$createdAt")]
    );
    return items.documents;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}

export async function signOut() {
  try {
    const session = await account.deleteSession("current");

    return session;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}

// Upload File
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
// Get File Preview
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

// Create a new piano entry
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
