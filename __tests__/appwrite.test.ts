jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);

import { getUserPianoEntries, updatePianoEntry } from "@/lib/appwrite";
import { fakeBackend, fileViewUrl } from "./helpers/fakeAppwrite";

const seedPianos = (count: number, creator: string, prefix: string) => {
  for (let i = 0; i < count; i++) {
    const id = `${prefix}-${String(i).padStart(4, "0")}`;
    fakeBackend.documents.set(id, {
      $id: id,
      $createdAt: new Date(Date.UTC(2026, 0, 1) + i * 60_000).toISOString(),
      creator,
      title: `Piano ${i}`,
      category: "warehouse",
      image_url: "",
    });
  }
};

beforeEach(() => {
  fakeBackend.reset();
});

describe("getUserPianoEntries", () => {
  it("returns every piano the user owns, not only the first 25", async () => {
    seedPianos(130, "account-1", "mine");
    seedPianos(7, "account-2", "theirs");

    const pianos = await getUserPianoEntries("account-1");

    expect(pianos).toHaveLength(130);
    expect(new Set(pianos.map((piano) => piano.$id)).size).toBe(130);
    expect(pianos.every((piano: any) => piano.creator === "account-1")).toBe(true);
    // Still newest first
    expect(pianos[0].$id).toBe("mine-0129");
    expect(pianos[129].$id).toBe("mine-0000");
  });

  it("returns an exact page boundary without an extra empty page error", async () => {
    seedPianos(100, "account-1", "mine");

    const pianos = await getUserPianoEntries("account-1");

    expect(pianos).toHaveLength(100);
  });

  it("returns an empty list for a user without pianos", async () => {
    seedPianos(3, "account-2", "theirs");

    await expect(getUserPianoEntries("account-1")).resolves.toEqual([]);
  });
});

describe("updatePianoEntry", () => {
  const oldImageUrl = fileViewUrl("old-file");
  const pickedImage = {
    uri: "file:///data/cache/ImageManipulator/compressed.jpg",
    fileName: "IMG_0042.HEIC",
    fileSize: 2048,
    mimeType: "image/heic",
    width: 800,
    height: 600,
    type: "image" as const,
  };

  beforeEach(() => {
    fakeBackend.files.set("old-file", {
      name: "old.jpg",
      type: "image/jpeg",
      size: 10,
      uri: "file:///old.jpg",
    });
    fakeBackend.documents.set("piano-1", {
      $id: "piano-1",
      $createdAt: "2026-09-01T10:00:00.000+00:00",
      creator: "account-1",
      title: "Old title",
      image_url: oldImageUrl,
    });
  });

  const newFiles = () =>
    [...fakeBackend.files.entries()].filter(([id]) => id !== "old-file");

  it("uploads a newly picked image, saves its URL and removes the replaced file", async () => {
    await updatePianoEntry(
      "piano-1",
      { title: "New title", users: "user-doc-1" as any, image_url: pickedImage },
      oldImageUrl
    );

    const [[newFileId, uploaded]] = newFiles();
    // Named after the original file as before, but the compressed file's
    // content is JPEG
    expect(uploaded).toMatchObject({
      uri: pickedImage.uri,
      size: 2048,
      type: "image/jpeg",
    });
    expect(uploaded.name).toMatch(/^userId_user-doc-1_itemTitle_New_title_.*\.HEIC$/);
    expect(fakeBackend.documents.get("piano-1")).toMatchObject({
      title: "New title",
      image_url: fileViewUrl(newFileId),
    });
    expect(fakeBackend.files.has("old-file")).toBe(false);
  });

  it("uploads an image passed as a plain file:// URI, reading its size from disk", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ blob: async () => ({ size: 4096 }) } as any);

    await updatePianoEntry(
      "piano-1",
      {
        title: "Grand",
        users: "user-doc-1" as any,
        image_url: "file:///data/cache/ImagePicker/photo.png",
      },
      oldImageUrl
    );

    expect(fetchMock).toHaveBeenCalledWith("file:///data/cache/ImagePicker/photo.png");
    const [[newFileId, uploaded]] = newFiles();
    expect(uploaded).toMatchObject({ size: 4096, type: "image/png" });
    expect(uploaded.name).toMatch(/\.png$/);
    expect(fakeBackend.documents.get("piano-1")?.image_url).toBe(
      fileViewUrl(newFileId)
    );
    fetchMock.mockRestore();
  });

  it("keeps the current image when no new image was picked", async () => {
    await updatePianoEntry(
      "piano-1",
      { title: "Renamed", image_url: oldImageUrl },
      oldImageUrl
    );

    expect(fakeBackend.documents.get("piano-1")).toMatchObject({
      title: "Renamed",
      image_url: oldImageUrl,
    });
    expect([...fakeBackend.files.keys()]).toEqual(["old-file"]);
  });

  it("removes the new upload again and keeps the old image when saving fails", async () => {
    fakeBackend.failNextDocumentUpdate = true;
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      updatePianoEntry(
        "piano-1",
        { title: "New title", users: "user-doc-1" as any, image_url: pickedImage },
        oldImageUrl
      )
    ).rejects.toThrow("Network request failed");

    expect([...fakeBackend.files.keys()]).toEqual(["old-file"]);
    expect(fakeBackend.documents.get("piano-1")?.image_url).toBe(oldImageUrl);
  });
});
