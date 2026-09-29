jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);

import {
  createPianoEntry,
  deletePianoEntry,
  getUserPianoEntries,
  toPianoItem,
  updatePianoEntry,
} from "@/lib/appwrite";
import {
  BUCKET_ID,
  fakeBackend,
  fileViewUrl,
  PROJECT_ID,
} from "./helpers/fakeAppwrite";

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

const storedFile = (name: string) => ({
  name,
  type: "image/jpeg",
  size: 10,
  uri: `file:///${name}`,
});

const pickedImage = {
  uri: "file:///data/cache/ImageManipulator/compressed.jpg",
  fileName: "IMG_0042.HEIC",
  fileSize: 2048,
  mimeType: "image/heic",
  width: 800,
  height: 600,
  type: "image" as const,
};

const secondPickedImage = {
  uri: "file:///data/cache/ImageManipulator/second.jpg",
  fileName: "IMG_0043.jpg",
  fileSize: 4096,
  mimeType: "image/jpeg",
  width: 800,
  height: 600,
  type: "image" as const,
};

/** The files uploaded during a test, not the ones it started with. */
const uploadedFiles = () =>
  [...fakeBackend.files.entries()].filter(
    ([id]) => id !== "old-file" && id !== "second-file"
  );

/** The view URL of the file uploaded from `uri`. */
const urlUploadedFrom = (uri: string) => {
  const upload = uploadedFiles().find(([, file]) => file.uri === uri);
  if (!upload) throw new Error(`Nothing was uploaded from ${uri}`);
  return fileViewUrl(upload[0]);
};

describe("updatePianoEntry", () => {
  const oldUrl = fileViewUrl("old-file");
  const secondUrl = fileViewUrl("second-file");

  beforeEach(() => {
    fakeBackend.files.set("old-file", storedFile("old.jpg"));
    fakeBackend.files.set("second-file", storedFile("second.jpg"));
    fakeBackend.documents.set("piano-1", {
      $id: "piano-1",
      $createdAt: "2026-09-01T10:00:00.000+00:00",
      creator: "account-1",
      title: "Old title",
      image_url: oldUrl,
    });
  });

  it("uploads a newly picked photo, saves its URL and removes the replaced file", async () => {
    await updatePianoEntry(
      "piano-1",
      { title: "New title", users: "user-doc-1" as any, photos: [pickedImage] },
      [oldUrl]
    );

    const [[newFileId, uploaded]] = uploadedFiles();
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
      image_urls: [fileViewUrl(newFileId)],
    });
    expect(fakeBackend.files.has("old-file")).toBe(false);
  });

  it("uploads a photo passed as a plain file:// URI, reading its size from disk", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ blob: async () => ({ size: 4096 }) } as any);

    await updatePianoEntry(
      "piano-1",
      {
        title: "Grand",
        users: "user-doc-1" as any,
        photos: ["file:///data/cache/ImagePicker/photo.png"],
      },
      [oldUrl]
    );

    expect(fetchMock).toHaveBeenCalledWith("file:///data/cache/ImagePicker/photo.png");
    const [[newFileId, uploaded]] = uploadedFiles();
    expect(uploaded).toMatchObject({ size: 4096, type: "image/png" });
    expect(uploaded.name).toMatch(/\.png$/);
    expect(fakeBackend.documents.get("piano-1")?.image_url).toBe(
      fileViewUrl(newFileId)
    );
    fetchMock.mockRestore();
  });

  it("keeps the current photo when none was added", async () => {
    await updatePianoEntry("piano-1", { title: "Renamed", photos: [oldUrl] }, [
      oldUrl,
    ]);

    expect(fakeBackend.documents.get("piano-1")).toMatchObject({
      title: "Renamed",
      image_url: oldUrl,
      image_urls: [oldUrl],
    });
    expect([...fakeBackend.files.keys()].sort()).toEqual([
      "old-file",
      "second-file",
    ]);
  });

  it("adds a photo after the saved ones, which stay the cover", async () => {
    await updatePianoEntry(
      "piano-1",
      {
        title: "Old title",
        users: "user-doc-1" as any,
        photos: [oldUrl, pickedImage],
      },
      [oldUrl]
    );

    expect(fakeBackend.documents.get("piano-1")).toMatchObject({
      image_url: oldUrl,
      image_urls: [oldUrl, urlUploadedFrom(pickedImage.uri)],
    });
    expect(fakeBackend.files.has("old-file")).toBe(true);
  });

  it("uploads several new photos and saves them in the order given", async () => {
    await updatePianoEntry(
      "piano-1",
      {
        title: "Old title",
        users: "user-doc-1" as any,
        photos: [pickedImage, oldUrl, secondPickedImage],
      },
      [oldUrl]
    );

    expect(uploadedFiles()).toHaveLength(2);
    expect(fakeBackend.documents.get("piano-1")).toMatchObject({
      image_url: urlUploadedFrom(pickedImage.uri),
      image_urls: [
        urlUploadedFrom(pickedImage.uri),
        oldUrl,
        urlUploadedFrom(secondPickedImage.uri),
      ],
    });
  });

  it("puts the photo chosen as the cover first without touching any file", async () => {
    await updatePianoEntry(
      "piano-1",
      { title: "Old title", photos: [secondUrl, oldUrl] },
      [oldUrl, secondUrl]
    );

    expect(fakeBackend.documents.get("piano-1")).toMatchObject({
      image_url: secondUrl,
      image_urls: [secondUrl, oldUrl],
    });
    expect(fakeBackend.files.has("old-file")).toBe(true);
    expect(fakeBackend.files.has("second-file")).toBe(true);
  });

  it("deletes the files of photos that were taken out", async () => {
    await updatePianoEntry("piano-1", { title: "Old title", photos: [oldUrl] }, [
      oldUrl,
      secondUrl,
    ]);

    expect(fakeBackend.documents.get("piano-1")?.image_urls).toEqual([oldUrl]);
    expect(fakeBackend.files.has("second-file")).toBe(false);
    expect(fakeBackend.files.has("old-file")).toBe(true);
  });

  it("makes the next photo the cover when the cover is taken out", async () => {
    await updatePianoEntry(
      "piano-1",
      { title: "Old title", photos: [secondUrl] },
      [oldUrl, secondUrl]
    );

    expect(fakeBackend.documents.get("piano-1")).toMatchObject({
      image_url: secondUrl,
      image_urls: [secondUrl],
    });
    expect(fakeBackend.files.has("old-file")).toBe(false);
  });

  it("removes the new uploads again and keeps every old photo when saving fails", async () => {
    fakeBackend.failNextDocumentUpdate = true;
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      updatePianoEntry(
        "piano-1",
        {
          title: "New title",
          users: "user-doc-1" as any,
          photos: [pickedImage, secondPickedImage],
        },
        [oldUrl, secondUrl]
      )
    ).rejects.toThrow("Network request failed");

    expect([...fakeBackend.files.keys()].sort()).toEqual([
      "old-file",
      "second-file",
    ]);
    expect(fakeBackend.documents.get("piano-1")?.image_url).toBe(oldUrl);
  });

  it("undoes the uploads and changes nothing when one photo can't be uploaded", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    // The fake, like the real SDK, uploads nothing without a usable size
    const broken = { uri: "file:///broken.jpg", fileSize: NaN };

    await expect(
      updatePianoEntry(
        "piano-1",
        {
          title: "New title",
          users: "user-doc-1" as any,
          photos: [pickedImage, broken],
        },
        [oldUrl]
      )
    ).rejects.toThrow("Image upload failed.");

    expect([...fakeBackend.files.keys()].sort()).toEqual([
      "old-file",
      "second-file",
    ]);
    expect(fakeBackend.documents.get("piano-1")).toMatchObject({
      title: "Old title",
      image_url: oldUrl,
    });
  });
});

describe("createPianoEntry", () => {
  it("uploads every photo and saves the first as the cover", async () => {
    const created = await createPianoEntry({
      title: "Grand",
      users: "user-doc-1" as any,
      creator: "account-1",
      photos: [pickedImage, secondPickedImage],
    });

    expect(uploadedFiles()).toHaveLength(2);
    const saved = fakeBackend.documents.get(created.$id);
    expect(saved).toMatchObject({
      title: "Grand",
      image_url: urlUploadedFrom(pickedImage.uri),
      image_urls: [
        urlUploadedFrom(pickedImage.uri),
        urlUploadedFrom(secondPickedImage.uri),
      ],
    });
    // The photos to upload are not a column
    expect(saved).not.toHaveProperty("photos");
  });

  it("removes the uploads again when the piano can't be saved", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    fakeBackend.missingCollections.add("66b26b3c002284a5a862");

    await expect(
      createPianoEntry({
        title: "Grand",
        users: "user-doc-1" as any,
        photos: [pickedImage, secondPickedImage],
      })
    ).rejects.toThrow();

    expect(fakeBackend.files.size).toBe(0);
  });
});

describe("deletePianoEntry", () => {
  it("deletes the files of every photo", async () => {
    fakeBackend.files.set("a", storedFile("a.jpg"));
    fakeBackend.files.set("b", storedFile("b.jpg"));
    fakeBackend.files.set("other", storedFile("other.jpg"));
    fakeBackend.documents.set("piano-1", { $id: "piano-1", $createdAt: "" });

    await deletePianoEntry({
      $id: "piano-1",
      image_url: fileViewUrl("a"),
      image_urls: [fileViewUrl("a"), fileViewUrl("b")],
    });

    expect(fakeBackend.documents.has("piano-1")).toBe(false);
    expect([...fakeBackend.files.keys()]).toEqual(["other"]);
  });

  it("still deletes the piano when one of its photos is already gone", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    fakeBackend.files.set("b", storedFile("b.jpg"));
    fakeBackend.documents.set("piano-1", { $id: "piano-1", $createdAt: "" });

    await deletePianoEntry({
      $id: "piano-1",
      image_url: fileViewUrl("gone"),
      image_urls: [fileViewUrl("gone"), fileViewUrl("b")],
    });

    expect(fakeBackend.documents.has("piano-1")).toBe(false);
    expect(fakeBackend.files.has("b")).toBe(false);
  });
});

describe("toPianoItem", () => {
  const previewUrl = (fileId: string) =>
    `https://cloud.appwrite.io/v1/storage/buckets/${BUCKET_ID}/files/${fileId}/preview?width=2000&height=2000&project=${PROJECT_ID}`;

  it("turns the URLs of every photo into plain view URLs", () => {
    const piano = toPianoItem({
      $id: "piano-1",
      image_url: previewUrl("f1"),
      image_urls: [previewUrl("f1"), previewUrl("f2")],
    } as any);

    expect(piano.image_url).toBe(fileViewUrl("f1"));
    expect(piano.image_urls).toEqual([fileViewUrl("f1"), fileViewUrl("f2")]);
  });

  it("leaves a piano without a photo list as it is", () => {
    const piano = toPianoItem({
      $id: "piano-1",
      image_url: previewUrl("f1"),
    } as any);

    expect(piano.image_urls).toBeUndefined();
  });
});
