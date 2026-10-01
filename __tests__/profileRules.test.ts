import { avatarToStore, isGeneratedAvatar } from "@/utils/googleSignIn";
import {
  cleanName,
  isRemovedAvatar,
  isUploadedPhoto,
  markRemoved,
  MAX_NAME,
  nameError,
} from "@/utils/profile";
import { profilePhoto } from "@/utils/account";

/** The person's own name and picture: what a name may be, and what the avatar address says about the picture. */

const INITIALS = "https://cloud.appwrite.io/v1/avatars/initials?name=grlnsngh&project=66b2693000154e2fa3c8";
const GOOGLE = "https://lh3.googleusercontent.com/a/ACg8ocJxyz123=s96-c";
const GOOGLE_BIG = "https://lh3.googleusercontent.com/a/ACg8ocJxyz123=s192-c";
const UPLOADED =
  "https://cloud.appwrite.io/v1/storage/buckets/66b26b77003445e612b4/files/66c1abc/view?project=66b2693000154e2fa3c8";
const BUCKET = "66b26b77003445e612b4";

describe("a name", () => {
  it("is cleaned of spaces at the ends and doubled up", () => {
    expect(cleanName("  Gurleen   Singh ")).toBe("Gurleen Singh");
    expect(cleanName("\tAl\n")).toBe("Al");
    expect(cleanName("   ")).toBe("");
  });

  it("is fine when it is 3 to 100 characters, after cleaning", () => {
    expect(nameError("Gurleen")).toBe("");
    expect(nameError("  Gurleen   Singh ")).toBe("");
    expect(nameError("abc")).toBe("");
    expect(nameError("x".repeat(MAX_NAME))).toBe("");
  });

  it("must be entered, in words about a name, not a username", () => {
    expect(nameError("")).toBe("Enter your name.");
    expect(nameError("    ")).toBe("Enter your name.");
  });

  it("must be at least 3 characters, like at sign up", () => {
    expect(nameError("Al")).toBe("Name must be at least 3 characters.");
    expect(nameError("  Al  ")).toBe("Name must be at least 3 characters.");
  });

  it("must be at most 100 characters", () => {
    expect(nameError("x".repeat(MAX_NAME + 1))).toBe("Name must be 100 characters or fewer.");
    // Spaces that would be cleaned away don't count
    expect(nameError(`${"x".repeat(MAX_NAME)}      `)).toBe("");
  });
});

describe("the letters marked as removed", () => {
  it("are the letters Appwrite draws with a mark on the address, still a valid address", () => {
    const removed = markRemoved(INITIALS);

    expect(removed).toBe(`${INITIALS}&removed=1`);
    expect(() => new URL(removed)).not.toThrow();
    expect(markRemoved("https://example.com/avatars/initials")).toBe(
      "https://example.com/avatars/initials?removed=1"
    );
  });

  it("are told from the letters that were made up", () => {
    expect(isRemovedAvatar(markRemoved(INITIALS))).toBe(true);
    expect(isRemovedAvatar(`${INITIALS}&removed=1&x=2`)).toBe(true);
    expect(isRemovedAvatar(INITIALS)).toBe(false);
    expect(isRemovedAvatar("")).toBe(false);
    expect(isRemovedAvatar(null)).toBe(false);
    expect(isRemovedAvatar(undefined)).toBe(false);
  });

  it("need the letters: a mark on another address means nothing", () => {
    expect(isRemovedAvatar("https://example.com/me.jpg?removed=1")).toBe(false);
    expect(isRemovedAvatar(`${INITIALS}&notremoved=1`)).toBe(false);
    expect(isRemovedAvatar(`${INITIALS}&removed=10`)).toBe(false);
  });

  it("show the initial, like any letters", () => {
    expect(profilePhoto(markRemoved(INITIALS))).toBeNull();
  });

  it("are the person's choice: nothing made up, so nothing replaces them", () => {
    expect(isGeneratedAvatar(INITIALS)).toBe(true);
    expect(isGeneratedAvatar(markRemoved(INITIALS))).toBe(false);
  });

  it("don't let a Google sign-in put the Google photo back", () => {
    expect(avatarToStore(INITIALS, GOOGLE)).toBe(GOOGLE_BIG);
    expect(avatarToStore(markRemoved(INITIALS), GOOGLE)).toBeNull();
  });
});

describe("a picture the person uploaded", () => {
  it("is a file in this app's storage bucket", () => {
    expect(isUploadedPhoto(UPLOADED, BUCKET)).toBe(true);
  });

  it("is not a Google photo, the letters, nothing, or a file in another bucket", () => {
    expect(isUploadedPhoto(GOOGLE_BIG, BUCKET)).toBe(false);
    expect(isUploadedPhoto(INITIALS, BUCKET)).toBe(false);
    expect(isUploadedPhoto("", BUCKET)).toBe(false);
    expect(isUploadedPhoto(null, BUCKET)).toBe(false);
    expect(isUploadedPhoto(UPLOADED, "someotherbucket")).toBe(false);
  });

  it("is drawn in the profile, and never replaced by a Google photo", () => {
    expect(profilePhoto(UPLOADED)).toBe(UPLOADED);
    expect(avatarToStore(UPLOADED, GOOGLE)).toBeNull();
  });
});
