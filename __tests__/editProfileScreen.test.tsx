const mockContext: { user: any; setUser: jest.Mock; setIsLogged: jest.Mock } = {
  user: null,
  setUser: jest.fn(),
  setIsLogged: jest.fn(),
};

jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);
jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => mockContext,
}));
jest.mock("@/utils/photo", () => ({
  pickProfilePhoto: jest.fn(),
  pickPianoPhoto: jest.fn(),
}));
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
}));

import React from "react";
import { act } from "react-test-renderer";
import { router } from "expo-router";
import EditProfile from "@/app/edit-profile";
import * as profileEdits from "@/lib/profileEdits";
import { pickProfilePhoto } from "@/utils/photo";
import { isRemovedAvatar, isUploadedPhoto } from "@/utils/profile";
import { a11yProblems, describeProblems } from "./helpers/a11y";
import { BUCKET_ID, fakeBackend, PROJECT_ID } from "./helpers/fakeAppwrite";
import {
  allTexts,
  captureToastCalls,
  createTestStore,
  dialogOf,
  flushPromises,
  inputLabelled,
  pressDialog,
  pressLabel,
  renderWithStore,
  typeInto,
} from "./helpers/render";

/** Edit profile: the picture (change, remove) and the name. */

const pick = jest.mocked(pickProfilePhoto);
const INITIALS = `https://cloud.appwrite.io/v1/avatars/initials?name=grlnsngh&project=${PROJECT_ID}`;
const GOOGLE = "https://lh3.googleusercontent.com/a/ACg8ocJxyz123=s192-c";
const fileUrl = (id: string) =>
  `https://cloud.appwrite.io/v1/storage/buckets/${BUCKET_ID}/files/${id}/view?project=${PROJECT_ID}`;
const picked = { uri: "file:///cache/me.jpg", fileName: "me.jpg", fileSize: 20000, width: 300, height: 300 } as any;

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
  mockContext.user = doc;
  return doc;
};
const saved = () => fakeBackend.documents.get("user-doc") as any;

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  pick.mockReset().mockResolvedValue(null);
  jest.spyOn(console, "warn").mockImplementation(() => {});
  signedUp();
});
afterEach(() => {
  jest.restoreAllMocks();
});

const open = async () => {
  const renderer = renderWithStore(<EditProfile />, createTestStore());
  await flushPromises();
  return renderer;
};

const buttonsLabelled = (renderer: any, label: string) =>
  renderer.root.findAll(
    (node: any) => node.props.accessibilityLabel === label && typeof node.props.onPress === "function"
  );
const has = (renderer: any, text: string) => allTexts(renderer.root).includes(text);
const photoNode = (renderer: any, uri: string) =>
  renderer.root.findAll((node: any) => node.props.source?.uri === uri && typeof node.props.onError === "function")[0];
/** Whether the button with this label is greyed out: a disabled one has no press handler, so it is read from its state. */
const disabled = (renderer: any, label: string) => {
  const node = renderer.root.findAll(
    (candidate: any) =>
      candidate.props.accessibilityLabel === label && candidate.props.accessibilityState?.disabled !== undefined
  )[0];
  if (!node) throw new Error(`No button labelled "${label}"`);
  return node.props.accessibilityState.disabled as boolean;
};
const saveDisabled = (renderer: any) => disabled(renderer, "Save");

/** Presses a button without waiting for what it starts to finish, for a save that is meant to stay busy. */
const startPress = async (renderer: any, label: string) => {
  const node = buttonsLabelled(renderer, label).pop();
  if (!node) throw new Error(`No button labelled "${label}"`);
  await act(async () => {
    void node.props.onPress();
  });
};

/** Opens the photo sheet and chooses from it. */
const choosePhoto = async (renderer: any, option: "Take a photo" | "Choose from gallery") => {
  await pressLabel(renderer.root, "Change photo");
  await pressLabel(renderer.root, option);
};

describe("the screen", () => {
  it("says what it is, with the name in a field and the letter in the circle", async () => {
    const renderer = await open();

    expect(has(renderer, "Edit profile")).toBe(true);
    expect(inputLabelled(renderer.root, "Name").props.value).toBe("grlnsngh");
    expect(has(renderer, "G")).toBe(true);
    expect(has(renderer, "This is the name Pianoverse shows on Account. Your Google account isn’t changed.")).toBe(true);
  });

  it("goes back from the back button", async () => {
    const renderer = await open();

    await pressLabel(renderer.root, "Back");

    expect(router.back).toHaveBeenCalled();
  });

  it("has no Remove button when there is no picture to remove", async () => {
    const renderer = await open();

    expect(buttonsLabelled(renderer, "Change photo")).not.toHaveLength(0);
    expect(buttonsLabelled(renderer, "Remove photo")).toHaveLength(0);
  });

  it("draws the picture, with a Remove button, when there is one", async () => {
    signedUp({ avatar: GOOGLE });
    const renderer = await open();

    expect(photoNode(renderer, GOOGLE)).toBeDefined();
    expect(has(renderer, "G")).toBe(false);
    expect(buttonsLabelled(renderer, "Remove photo")).not.toHaveLength(0);
  });

  it("hides the picture from a screen reader and has the letter back when it can't be loaded", async () => {
    signedUp({ avatar: GOOGLE });
    const renderer = await open();
    expect(photoNode(renderer, GOOGLE).props.accessibilityElementsHidden).toBe(true);

    await act(async () => {
      photoNode(renderer, GOOGLE).props.onError();
    });

    expect(photoNode(renderer, GOOGLE)).toBeUndefined();
    expect(has(renderer, "G")).toBe(true);
  });

  it("has names, roles and big enough targets", async () => {
    signedUp({ avatar: GOOGLE });
    const renderer = await open();

    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });
});

describe("the name", () => {
  it("can't be saved until it is changed", async () => {
    const renderer = await open();
    expect(saveDisabled(renderer)).toBe(true);

    typeInto(renderer.root, "Name", "Gurleen Singh");
    expect(saveDisabled(renderer)).toBe(false);

    typeInto(renderer.root, "Name", "  grlnsngh  ");
    expect(saveDisabled(renderer)).toBe(true);
  });

  it("is saved, the person told, and the screen left", async () => {
    const toasts = captureToastCalls();
    const renderer = await open();

    typeInto(renderer.root, "Name", "  Gurleen   Singh ");
    await pressLabel(renderer.root, "Save");

    expect(saved().username).toBe("Gurleen Singh");
    expect(mockContext.setUser).toHaveBeenCalledWith(expect.objectContaining({ username: "Gurleen Singh" }));
    expect(toasts.map((toast) => [toast.message, toast.variant])).toEqual([["Name updated", "success"]]);
    expect(router.back).toHaveBeenCalled();
  });

  it("says what is wrong when it is left, not while it is being typed", async () => {
    const renderer = await open();

    typeInto(renderer.root, "Name", "");
    expect(has(renderer, "Enter your name.")).toBe(false);
    await act(async () => {
      inputLabelled(renderer.root, "Name").props.onBlur({});
    });
    expect(has(renderer, "Enter your name.")).toBe(true);

    typeInto(renderer.root, "Name", "Al");
    expect(has(renderer, "Enter your name.")).toBe(false);
    await act(async () => {
      inputLabelled(renderer.root, "Name").props.onBlur({});
    });
    expect(has(renderer, "Name must be at least 3 characters.")).toBe(true);
  });

  it("is not saved when it is too short, and the message shows", async () => {
    const renderer = await open();
    typeInto(renderer.root, "Name", "Al");

    await act(async () => {
      await inputLabelled(renderer.root, "Name").props.onSubmitEditing();
    });

    expect(saved().username).toBe("grlnsngh");
    expect(has(renderer, "Name must be at least 3 characters.")).toBe(true);
    expect(router.back).not.toHaveBeenCalled();
  });

  it("is saved from the keyboard's Done too", async () => {
    const renderer = await open();
    typeInto(renderer.root, "Name", "Gurleen Singh");

    await act(async () => {
      await inputLabelled(renderer.root, "Name").props.onSubmitEditing();
    });
    await flushPromises();

    expect(saved().username).toBe("Gurleen Singh");
  });

  it("stays, with the old name and a message, when it can't be saved", async () => {
    const toasts = captureToastCalls();
    const renderer = await open();
    typeInto(renderer.root, "Name", "Gurleen Singh");
    fakeBackend.failNextDocumentUpdate = true;

    await pressLabel(renderer.root, "Save");

    expect(saved().username).toBe("grlnsngh");
    expect(mockContext.setUser).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(toasts.map((toast) => [toast.message, toast.variant])).toEqual([
      ["Couldn’t save your name. Check your connection and try again.", "error"],
    ]);
    // The name is still in the field, to try again
    expect(inputLabelled(renderer.root, "Name").props.value).toBe("Gurleen Singh");
  });
});

describe("changing the picture", () => {
  it("offers the camera and the gallery", async () => {
    const renderer = await open();

    await pressLabel(renderer.root, "Change photo");

    expect(buttonsLabelled(renderer, "Take a photo")).not.toHaveLength(0);
    expect(buttonsLabelled(renderer, "Choose from gallery")).not.toHaveLength(0);
  });

  it("uploads and saves the picture from the gallery, and says so", async () => {
    const toasts = captureToastCalls();
    pick.mockResolvedValue(picked);
    const renderer = await open();

    await choosePhoto(renderer, "Choose from gallery");

    expect(pick).toHaveBeenCalledWith("library", expect.any(Function));
    expect(isUploadedPhoto(saved().avatar, BUCKET_ID)).toBe(true);
    expect(mockContext.setUser).toHaveBeenCalledWith(expect.objectContaining({ avatar: saved().avatar }));
    expect(toasts.map((toast) => [toast.message, toast.variant])).toEqual([["Photo updated", "success"]]);
    // Stays on the screen
    expect(router.back).not.toHaveBeenCalled();
  });

  it("uses the camera when asked", async () => {
    pick.mockResolvedValue(picked);
    const renderer = await open();

    await choosePhoto(renderer, "Take a photo");

    expect(pick).toHaveBeenCalledWith("camera", expect.any(Function));
  });

  it("does nothing when the person closes the camera or the gallery without choosing", async () => {
    const toasts = captureToastCalls();
    pick.mockResolvedValue(null);
    const renderer = await open();

    await choosePhoto(renderer, "Choose from gallery");

    expect(saved().avatar).toBe(INITIALS);
    expect(mockContext.setUser).not.toHaveBeenCalled();
    expect(toasts).toEqual([]);
    expect(fakeBackend.files.size).toBe(0);
  });

  it("says it is saving, and greys the rest out, while the picture goes up, then is ready again", async () => {
    pick.mockResolvedValue(picked);
    let finish: (doc: any) => void = () => {};
    jest
      .spyOn(profileEdits, "changeProfilePhoto")
      .mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const renderer = await open();
    expect(disabled(renderer, "Change photo")).toBe(false);

    await pressLabel(renderer.root, "Change photo");
    await startPress(renderer, "Choose from gallery");

    expect(renderer.root.findAll((node: any) => node.props.accessibilityLabel === "Saving your photo")).not.toHaveLength(0);
    expect(disabled(renderer, "Change photo")).toBe(true);
    expect(disabled(renderer, "Save")).toBe(true);
    expect(inputLabelled(renderer.root, "Name").props.editable).toBe(false);

    await act(async () => {
      finish({ ...saved(), avatar: GOOGLE });
    });
    await flushPromises();

    expect(renderer.root.findAll((node: any) => node.props.accessibilityLabel === "Saving your photo")).toHaveLength(0);
    expect(disabled(renderer, "Change photo")).toBe(false);
    expect(inputLabelled(renderer.root, "Name").props.editable).toBe(true);
  });

  it("deletes the picture it replaces", async () => {
    fakeBackend.files.set("old1", { name: "old.jpg", type: "image/jpeg", size: 10, uri: "file:///old.jpg" });
    signedUp({ avatar: fileUrl("old1") });
    pick.mockResolvedValue(picked);
    const renderer = await open();

    await choosePhoto(renderer, "Choose from gallery");

    expect([...fakeBackend.files.keys()]).not.toContain("old1");
    expect(fakeBackend.files.size).toBe(1);
  });

  it("says so, and changes nothing, when it can't be saved", async () => {
    const toasts = captureToastCalls();
    pick.mockResolvedValue(picked);
    fakeBackend.failNextDocumentUpdate = true;
    const renderer = await open();

    await choosePhoto(renderer, "Choose from gallery");

    expect(saved().avatar).toBe(INITIALS);
    expect(fakeBackend.files.size).toBe(0);
    expect(mockContext.setUser).not.toHaveBeenCalled();
    expect(toasts.map((toast) => [toast.message, toast.variant])).toEqual([
      ["Couldn’t save your photo. Check your connection and try again.", "error"],
    ]);
    // Ready to try again
    expect(disabled(renderer, "Change photo")).toBe(false);
  });

  it("says so when the phone's photos can't be opened", async () => {
    const toasts = captureToastCalls();
    pick.mockRejectedValue(new Error("no permission"));
    const renderer = await open();

    await choosePhoto(renderer, "Choose from gallery");

    expect(toasts.map((toast) => [toast.message, toast.variant])).toEqual([
      ["Couldn’t open your photos. Please try again.", "error"],
    ]);
  });

  it("explains how to allow the camera when it was refused, and offers the gallery", async () => {
    pick.mockImplementationOnce(async (_source: any, onDenied?: () => void) => {
      onDenied?.();
      return null;
    });
    const renderer = await open();

    await choosePhoto(renderer, "Take a photo");

    expect(has(renderer, "Camera access is off")).toBe(true);
    expect(has(renderer, "Allow camera access in Settings to take a profile photo. You can also choose one from your gallery.")).toBe(true);

    pick.mockResolvedValue(picked);
    await pressLabel(renderer.root, "Choose from gallery");

    expect(pick).toHaveBeenLastCalledWith("library", expect.any(Function));
    expect(isUploadedPhoto(saved().avatar, BUCKET_ID)).toBe(true);
  });
});

describe("removing the picture", () => {
  it("asks first, and does nothing when it is cancelled", async () => {
    signedUp({ avatar: GOOGLE });
    const renderer = await open();

    await pressLabel(renderer.root, "Remove photo");
    expect(dialogOf(renderer.root)).toMatchObject({
      title: "Remove your photo?",
      message: "Your letter will show instead. You can add a photo again whenever you like.",
    });
    await pressDialog(renderer.root, "Cancel");

    expect(saved().avatar).toBe(GOOGLE);
    expect(mockContext.setUser).not.toHaveBeenCalled();
  });

  it("brings the letter back, kept so that Google doesn't put the photo back, and says so", async () => {
    const toasts = captureToastCalls();
    signedUp({ avatar: GOOGLE });
    const renderer = await open();

    await pressLabel(renderer.root, "Remove photo");
    await pressDialog(renderer.root, "Remove");
    await flushPromises();

    expect(isRemovedAvatar(saved().avatar)).toBe(true);
    expect(mockContext.setUser).toHaveBeenCalledWith(expect.objectContaining({ avatar: saved().avatar }));
    expect(toasts.map((toast) => [toast.message, toast.variant])).toEqual([["Photo removed", "success"]]);
  });

  it("deletes an uploaded picture from storage", async () => {
    fakeBackend.files.set("mine", { name: "mine.jpg", type: "image/jpeg", size: 10, uri: "file:///mine.jpg" });
    signedUp({ avatar: fileUrl("mine") });
    const renderer = await open();

    await pressLabel(renderer.root, "Remove photo");
    await pressDialog(renderer.root, "Remove");
    await flushPromises();

    expect(fakeBackend.files.size).toBe(0);
  });

  it("says so, and changes nothing, when it can't be saved", async () => {
    const toasts = captureToastCalls();
    signedUp({ avatar: GOOGLE });
    fakeBackend.failNextDocumentUpdate = true;
    const renderer = await open();

    await pressLabel(renderer.root, "Remove photo");
    await pressDialog(renderer.root, "Remove");
    await flushPromises();

    expect(saved().avatar).toBe(GOOGLE);
    expect(toasts.map((toast) => [toast.message, toast.variant])).toEqual([
      ["Couldn’t remove your photo. Check your connection and try again.", "error"],
    ]);
  });
});
