import { profilePhoto } from "@/utils/account";
import {
  avatarToStore,
  isGeneratedAvatar,
  largerGooglePhoto,
  parseGoogleProfile,
} from "@/utils/googleSignIn";

/** The Google name and photo: reading Google's answer, choosing what to save, and what the profile draws. */

const PHOTO = "https://lh3.googleusercontent.com/a/ACg8ocJxyz123=s96-c";
const BIG = "https://lh3.googleusercontent.com/a/ACg8ocJxyz123=s192-c";
const INITIALS = "https://cloud.appwrite.io/v1/avatars/initials?name=grlnsngh&project=66b2693000154e2fa3c8";

describe("reading Google's answer about the person", () => {
  it("takes the name and the photo", () => {
    expect(
      parseGoogleProfile({ sub: "1", name: "Gurleen Singh", picture: PHOTO, email: "g@example.com" })
    ).toEqual({ name: "Gurleen Singh", picture: PHOTO });
  });

  it("trims the name", () => {
    expect(parseGoogleProfile({ name: "  Gurleen  ", picture: PHOTO })?.name).toBe("Gurleen");
  });

  it("is happy with only one of them", () => {
    expect(parseGoogleProfile({ name: "Gurleen" })).toEqual({ name: "Gurleen", picture: null });
    expect(parseGoogleProfile({ picture: PHOTO })).toEqual({ name: null, picture: PHOTO });
  });

  it("leaves out a photo that isn't at a secure address", () => {
    expect(parseGoogleProfile({ name: "G", picture: "http://example.com/a.jpg" })).toEqual({
      name: "G",
      picture: null,
    });
    expect(parseGoogleProfile({ picture: "javascript:alert(1)" })).toBeNull();
  });

  it("is null when there is nothing usable, or it isn't an answer at all", () => {
    for (const data of [null, undefined, "text", 5, [], {}, { name: "", picture: " " }, { name: 7, picture: {} }]) {
      expect(parseGoogleProfile(data)).toBeNull();
    }
  });
});

describe("the photo's size", () => {
  it("asks for a bigger one when the address ends in a size", () => {
    expect(largerGooglePhoto(PHOTO)).toBe(BIG);
    expect(largerGooglePhoto("https://lh3.googleusercontent.com/a/x=s64")).toBe(
      "https://lh3.googleusercontent.com/a/x=s192-c"
    );
    expect(largerGooglePhoto(PHOTO, 256)).toBe("https://lh3.googleusercontent.com/a/ACg8ocJxyz123=s256-c");
  });

  it("leaves any other address as it is", () => {
    expect(largerGooglePhoto("https://lh3.googleusercontent.com/a/x")).toBe(
      "https://lh3.googleusercontent.com/a/x"
    );
    expect(largerGooglePhoto("https://example.com/me.jpg?s=96")).toBe("https://example.com/me.jpg?s=96");
  });
});

describe("an avatar nobody chose", () => {
  it("is none, or the letters Appwrite draws", () => {
    expect(isGeneratedAvatar("")).toBe(true);
    expect(isGeneratedAvatar(null)).toBe(true);
    expect(isGeneratedAvatar(undefined)).toBe(true);
    expect(isGeneratedAvatar(INITIALS)).toBe(true);
    expect(isGeneratedAvatar(BIG)).toBe(false);
    expect(isGeneratedAvatar("https://example.com/me.jpg")).toBe(false);
  });
});

describe("what to save as the avatar after signing in with Google", () => {
  it("is the Google photo, bigger, in place of the letters Appwrite drew", () => {
    expect(avatarToStore(INITIALS, PHOTO)).toBe(BIG);
    expect(avatarToStore("", PHOTO)).toBe(BIG);
    expect(avatarToStore(null, PHOTO)).toBe(BIG);
  });

  it("is a new Google photo in place of an older one", () => {
    const older = "https://lh3.googleusercontent.com/a/OLD=s192-c";

    expect(avatarToStore(older, PHOTO)).toBe(BIG);
  });

  it("is nothing when the same photo is already saved", () => {
    expect(avatarToStore(BIG, PHOTO)).toBeNull();
  });

  it("never replaces a picture from anywhere else", () => {
    expect(avatarToStore("https://example.com/me.jpg", PHOTO)).toBeNull();
    expect(avatarToStore("https://evilgoogleusercontent.com/me.jpg", PHOTO)).toBeNull();
  });

  it("is nothing when Google gave no photo", () => {
    expect(avatarToStore(INITIALS, null)).toBeNull();
    expect(avatarToStore(INITIALS, undefined)).toBeNull();
    expect(avatarToStore(INITIALS, "")).toBeNull();
  });
});

describe("the photo the profile draws", () => {
  it("is the avatar when it is a picture at a secure address", () => {
    expect(profilePhoto(BIG)).toBe(BIG);
    expect(profilePhoto("https://example.com/me.jpg")).toBe("https://example.com/me.jpg");
  });

  it("is nothing for the letters Appwrite draws, which the orange circle's initial does better", () => {
    expect(profilePhoto(INITIALS)).toBeNull();
  });

  it("is nothing for no avatar, or one that isn't secure", () => {
    expect(profilePhoto("")).toBeNull();
    expect(profilePhoto(null)).toBeNull();
    expect(profilePhoto(undefined)).toBeNull();
    expect(profilePhoto("http://example.com/me.jpg")).toBeNull();
    expect(profilePhoto("file:///data/me.jpg")).toBeNull();
  });
});
