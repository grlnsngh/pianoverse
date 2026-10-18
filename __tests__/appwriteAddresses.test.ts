jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);

import {
  appwriteConfig,
  convertImageUrl,
  createPhotoToken,
  fileViewUrl,
  getFilePreview,
  removedAvatarUrl,
} from "@/lib/appwrite";
import { isRemovedAvatar, isUploadedPhoto } from "@/utils/profile";
import { fileViewUrl as fakeFileViewUrl, fakeBackend } from "./helpers/fakeAppwrite";

/**
 * The addresses the app saves with a piano or a profile, and reads back later
 * (to show a photo, to find the file to delete, to tell a picked picture from
 * the letters). The SDK has changed what its own address builders return and
 * what they add, so the app builds these itself, in the one form it has always
 * saved.
 */

beforeEach(() => {
  fakeBackend.reset();
});

describe("where a stored photo is viewed", () => {
  it("is the bucket's view address with only the project on it", () => {
    expect(fileViewUrl("file-1")).toBe(
      "https://cloud.appwrite.io/v1/storage/buckets/66b26b77003445e612b4/files/file-1/view?project=66b2693000154e2fa3c8"
    );
    expect(fileViewUrl("file-1")).toBe(fakeFileViewUrl("file-1"));
  });

  it("is what getFilePreview gives for an uploaded file, as text", async () => {
    expect(await getFilePreview("file-2")).toBe(fileViewUrl("file-2"));
  });

  it("is left as it is when old photos are converted", () => {
    expect(convertImageUrl(fileViewUrl("file-3"))).toBe(fileViewUrl("file-3"));
  });

  it("is known as a picture in this app's bucket", () => {
    expect(isUploadedPhoto(fileViewUrl("file-4"), appwriteConfig.storageId)).toBe(true);
  });

  it("carries no parameter the saved addresses never had", () => {
    expect(new URL(fileViewUrl("file-5")).searchParams.has("impersonateuserid")).toBe(false);
  });
});

describe("the letters Appwrite draws for a name", () => {
  it("is the initials address, name first and then the project", () => {
    expect(removedAvatarUrl("grlnsngh")).toBe(
      "https://cloud.appwrite.io/v1/avatars/initials?name=grlnsngh&project=66b2693000154e2fa3c8&removed=1"
    );
  });

  it("is marked as removed, which is how a Google sign-in knows to leave it", () => {
    expect(isRemovedAvatar(removedAvatarUrl("grlnsngh"))).toBe(true);
  });

  it("keeps a name with a space or a symbol in one piece", () => {
    const url = new URL(removedAvatarUrl("Asha & Co"));
    expect(url.searchParams.get("name")).toBe("Asha & Co");
    expect(url.searchParams.get("project")).toBe("66b2693000154e2fa3c8");
  });
});

describe("the token photos are loaded with", () => {
  it("is the token text of a 15 minute JWT", async () => {
    expect(await createPhotoToken()).toBe("test-jwt");
  });
});
