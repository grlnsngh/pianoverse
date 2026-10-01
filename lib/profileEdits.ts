import {
  appwriteConfig,
  deleteFileByUrl,
  LocalImageAsset,
  removedAvatarUrl,
  updateUserProfile,
  uploadFile,
} from "@/lib/appwrite";
import { cleanName, isUploadedPhoto } from "@/utils/profile";

/** The part of the signed-in user these changes need. */
export interface ProfileUser {
  $id: string;
  accountId: string;
  username: string;
  avatar?: string | null;
}

/**
 * Deletes the picture the person uploaded before, now that it is replaced or
 * removed. A Google photo or any other address isn't ours to delete, and a
 * file that can't be deleted is only left in storage: the change has been made.
 */
const forgetOldUpload = async (avatar: string | null | undefined) => {
  if (!isUploadedPhoto(avatar, appwriteConfig.storageId)) return;
  try {
    await deleteFileByUrl(avatar as string);
  } catch (error) {
    console.warn("Could not delete the old profile picture:", error);
  }
};

/**
 * Uploads a picture the person took or chose and makes it their profile
 * picture. If it can't be saved on their account the upload is taken back, so
 * no file is left behind.
 *
 * @returns {Promise<any>} The updated user document.
 * @throws {Error} If the upload or the change fails; nothing has changed then.
 */
export async function changeProfilePhoto(
  user: ProfileUser,
  asset: LocalImageAsset
): Promise<any> {
  const url = String(await uploadFile(asset, { users: user.accountId, title: "profile" }));

  let updated;
  try {
    updated = await updateUserProfile(user.$id, { avatar: url });
  } catch (error) {
    await deleteFileByUrl(url).catch(() => {});
    throw error;
  }

  await forgetOldUpload(user.avatar);
  return updated;
}

/**
 * Takes the profile picture away: the letter shows again, and a Google
 * sign-in doesn't bring the Google photo back (the avatar is marked as removed).
 *
 * @returns {Promise<any>} The updated user document.
 * @throws {Error} If the change fails; nothing has changed then.
 */
export async function removeProfilePhoto(user: ProfileUser): Promise<any> {
  const updated = await updateUserProfile(user.$id, {
    avatar: removedAvatarUrl(user.username),
  });
  await forgetOldUpload(user.avatar);
  return updated;
}

/**
 * Saves a new name. It is the app's name for the person: their Google account
 * is not changed.
 *
 * @returns {Promise<any>} The updated user document.
 * @throws {Error} If the change fails; nothing has changed then.
 */
export async function renameProfile(user: ProfileUser, name: string): Promise<any> {
  return updateUserProfile(user.$id, { username: cleanName(name) });
}
