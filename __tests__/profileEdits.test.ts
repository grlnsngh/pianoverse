jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);

import { ensureUserDocument } from "@/lib/appwrite";
import { changeProfilePhoto, removeProfilePhoto, renameProfile } from "@/lib/profileEdits";
import { isRemovedAvatar, isUploadedPhoto } from "@/utils/profile";
import { appwriteError, BUCKET_ID, fakeAccount, fakeBackend, PROJECT_ID } from "./helpers/fakeAppwrite";

/**
 * Changing the profile picture and the name, against a fake Appwrite: what is
 * uploaded, saved and deleted, and that a failure leaves nothing half done.
 */

const INITIALS = `https://cloud.appwrite.io/v1/avatars/initials?name=grlnsngh&project=${PROJECT_ID}`;
const GOOGLE = "https://lh3.googleusercontent.com/a/ACg8ocJxyz123=s192-c";
const fileUrl = (id: string) =>
  `https://cloud.appwrite.io/v1/storage/buckets/${BUCKET_ID}/files/${id}/view?project=${PROJECT_ID}`;

const asset = { uri: "file:///cache/me.jpg", fileName: "me.jpg", fileSize: 20000, mimeType: "image/jpeg" };

const signedUp = (extra: Record<string, unknown> = {}) => {
  const doc = {
    $id: "user-doc",
    $createdAt: "2026-08-01T00:00:00.000+00:00",
    accountId: "account-1",
    email: "grlnsngh@gmail.com",
    username: "grlnsngh",
    avatar: INITIALS,
    ...extra,
  };
  fakeBackend.documents.set("user-doc", doc);
  return doc as any;
};
const saved = () => fakeBackend.documents.get("user-doc") as any;
const storedFile = (id: string) =>
  fakeBackend.files.set(id, { name: `${id}.jpg`, type: "image/jpeg", size: 10, uri: "file:///x.jpg" });
const fileIds = () => [...fakeBackend.files.keys()];

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe("changing the profile picture", () => {
  it("uploads the picture and saves its address as the avatar", async () => {
    const user = signedUp();

    const updated = await changeProfilePhoto(user, asset);

    expect(fileIds()).toHaveLength(1);
    expect(isUploadedPhoto(saved().avatar, BUCKET_ID)).toBe(true);
    expect(saved().avatar).toContain(`/files/${fileIds()[0]}/`);
    expect(updated.avatar).toBe(saved().avatar);
  });

  it("names the upload for the person, so it can be told from a piano's photos", async () => {
    await changeProfilePhoto(signedUp(), asset);

    expect(fakeBackend.files.get(fileIds()[0])?.name).toContain("userId_account-1_itemTitle_profile_");
  });

  it("changes nothing else on the account", async () => {
    await changeProfilePhoto(signedUp(), asset);

    expect(saved()).toMatchObject({ username: "grlnsngh", email: "grlnsngh@gmail.com", accountId: "account-1" });
  });

  it("deletes the picture it replaces, when it was uploaded", async () => {
    storedFile("old1");
    const user = signedUp({ avatar: fileUrl("old1") });

    await changeProfilePhoto(user, asset);

    expect(fileIds()).toHaveLength(1);
    expect(fileIds()).not.toContain("old1");
  });

  it("leaves a Google photo or letters alone, which aren't files of ours", async () => {
    storedFile("piano-photo");
    for (const avatar of [GOOGLE, INITIALS]) {
      signedUp({ avatar });

      await changeProfilePhoto(signedUp({ avatar }), asset);
    }

    expect(fileIds()).toContain("piano-photo");
  });

  it("never deletes a file in this app's storage because of an address from somewhere else", async () => {
    // Same file id, but in another bucket: not the person's picture
    storedFile("shared");
    const elsewhere = `https://cloud.appwrite.io/v1/storage/buckets/some-other-bucket/files/shared/view?project=${PROJECT_ID}`;

    await changeProfilePhoto(signedUp({ avatar: elsewhere }), asset);
    await removeProfilePhoto(signedUp({ avatar: elsewhere }));

    expect(fileIds()).toContain("shared");
  });

  it("still succeeds when the old picture can't be deleted", async () => {
    storedFile("old1");
    const user = signedUp({ avatar: fileUrl("old1") });
    jest.spyOn(fakeBackend.files, "delete").mockReturnValue(false);

    const updated = await changeProfilePhoto(user, asset);

    expect(isUploadedPhoto(updated.avatar, BUCKET_ID)).toBe(true);
  });

  it("takes the upload back when the address can't be saved, and keeps what the person had", async () => {
    storedFile("old1");
    const user = signedUp({ avatar: fileUrl("old1") });
    fakeBackend.failNextDocumentUpdate = true;

    await expect(changeProfilePhoto(user, asset)).rejects.toThrow("Network request failed");

    expect(fileIds()).toEqual(["old1"]);
    expect(saved().avatar).toBe(fileUrl("old1"));
  });

  it("changes nothing when the upload fails", async () => {
    const user = signedUp({ avatar: GOOGLE });

    // The SDK gives nothing back for a file without a size
    await expect(changeProfilePhoto(user, { ...asset, fileSize: "?" as any })).rejects.toThrow();

    expect(fileIds()).toEqual([]);
    expect(saved().avatar).toBe(GOOGLE);
  });
});

describe("removing the profile picture", () => {
  it("saves the letters marked as removed", async () => {
    const updated = await removeProfilePhoto(signedUp({ avatar: GOOGLE }));

    expect(isRemovedAvatar(saved().avatar)).toBe(true);
    expect(saved().avatar).toContain("/avatars/initials?name=grlnsngh");
    expect(updated.avatar).toBe(saved().avatar);
  });

  it("deletes an uploaded picture from storage", async () => {
    storedFile("mine");
    await removeProfilePhoto(signedUp({ avatar: fileUrl("mine") }));

    expect(fileIds()).toEqual([]);
  });

  it("leaves other files in storage alone", async () => {
    storedFile("piano-photo");
    await removeProfilePhoto(signedUp({ avatar: GOOGLE }));

    expect(fileIds()).toEqual(["piano-photo"]);
  });

  it("changes nothing, and keeps the file, when it can't be saved", async () => {
    storedFile("mine");
    const user = signedUp({ avatar: fileUrl("mine") });
    fakeBackend.failNextDocumentUpdate = true;

    await expect(removeProfilePhoto(user)).rejects.toThrow("Network request failed");

    expect(saved().avatar).toBe(fileUrl("mine"));
    expect(fileIds()).toEqual(["mine"]);
  });

  it("is still removed when the file can't be deleted", async () => {
    storedFile("mine");
    const user = signedUp({ avatar: fileUrl("mine") });
    jest.spyOn(fakeBackend.files, "delete").mockReturnValue(false);

    await removeProfilePhoto(user);

    expect(isRemovedAvatar(saved().avatar)).toBe(true);
  });

  it("is not undone by signing in with Google again", async () => {
    await removeProfilePhoto(signedUp({ avatar: GOOGLE }));
    const removed = saved().avatar;
    fakeAccount.get.mockResolvedValue({ $id: "account-1", name: "G", email: "grlnsngh@gmail.com" });

    const result = await ensureUserDocument({ name: "Gurleen", picture: "https://lh3.googleusercontent.com/a/NEW=s96-c" });

    expect(saved().avatar).toBe(removed);
    expect(result.avatar).toBe(removed);
  });
});

describe("a picture chosen here is not undone by Google either", () => {
  it("keeps an uploaded picture when signing in with Google", async () => {
    await changeProfilePhoto(signedUp(), asset);
    const mine = saved().avatar;
    fakeAccount.get.mockResolvedValue({ $id: "account-1", name: "G", email: "grlnsngh@gmail.com" });

    await ensureUserDocument({ name: "Gurleen", picture: "https://lh3.googleusercontent.com/a/NEW=s96-c" });

    expect(saved().avatar).toBe(mine);
  });
});

describe("changing the name", () => {
  it("saves the cleaned name and nothing else", async () => {
    const updated = await renameProfile(signedUp({ avatar: GOOGLE }), "  Gurleen   Singh ");

    expect(saved()).toMatchObject({ username: "Gurleen Singh", avatar: GOOGLE, email: "grlnsngh@gmail.com" });
    expect(updated.username).toBe("Gurleen Singh");
  });

  it("changes nothing when it can't be saved", async () => {
    const user = signedUp();
    fakeBackend.failNextDocumentUpdate = true;

    await expect(renameProfile(user, "Gurleen Singh")).rejects.toThrow("Network request failed");

    expect(saved().username).toBe("grlnsngh");
  });

  it("is not a change to the Google account", async () => {
    await renameProfile(signedUp(), "Gurleen Singh");

    expect(fakeAccount.createSession).not.toHaveBeenCalled();
    expect(appwriteError).toBeDefined();
  });
});
