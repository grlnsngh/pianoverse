jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);

import * as WebBrowser from "expo-web-browser";
import { getGoogleAccessToken } from "@/lib/appwrite";
import { fetchGoogleProfile } from "@/lib/googleProfile";
import { signInWithGoogle } from "@/lib/googleSignIn";
import { fakeAccount, fakeBackend, PROJECT_ID } from "./helpers/fakeAppwrite";

/**
 * The Google name and photo saved when someone signs in with Google, against a
 * fake Appwrite and a fake Google (`fetch`). Nothing here has met the real ones.
 */

const REDIRECT = `appwrite-callback-${PROJECT_ID}://`;
const PHOTO = "https://lh3.googleusercontent.com/a/ACg8ocJxyz123=s96-c";
const BIG = "https://lh3.googleusercontent.com/a/ACg8ocJxyz123=s192-c";
const USERINFO = "https://www.googleapis.com/oauth2/v3/userinfo";
const INITIALS = "initials?name=";

const openAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;
const fetchMock = jest.fn();

const googleAccount = { $id: "account-g1", name: "Gurleen Singh", email: "gurleen@example.com" };

/** Appwrite has kept Google's token for this person, as it does after a sign-in with Google. */
const googleIdentity = (token = "google-access-token") => ({
  total: 1,
  identities: [
    { $id: "identity-1", provider: "google", providerAccessToken: token },
  ],
});

/** Google answers `userinfo` with this. */
const googleSays = (body: object, ok = true) =>
  fetchMock.mockResolvedValue({ ok, json: () => Promise.resolve(body) });

const userDocuments = () =>
  [...fakeBackend.documents.values()].filter((doc) => "accountId" in doc);

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  jest.spyOn(console, "warn").mockImplementation(() => {});
  openAuthSession.mockReset().mockResolvedValue({
    type: "success",
    url: `${REDIRECT}?userId=account-g1&secret=one-time`,
  });
  fakeAccount.createSession.mockResolvedValue({ $id: "session-1" });
  fakeAccount.get.mockResolvedValue(googleAccount);
  fakeAccount.listIdentities.mockResolvedValue(googleIdentity());
  googleSays({ name: "Gurleen Kaur Singh", picture: PHOTO, email: "gurleen@example.com" });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("asking Google who the person is", () => {
  it("uses the token Appwrite kept, once, and asks Google and nobody else", async () => {
    const profile = await fetchGoogleProfile();

    expect(profile).toEqual({ name: "Gurleen Kaur Singh", picture: PHOTO });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(USERINFO);
    expect(options.headers).toEqual({ Authorization: "Bearer google-access-token" });
  });

  it("finds the Google sign-in among the person's others", async () => {
    fakeAccount.listIdentities.mockResolvedValue({
      total: 2,
      identities: [
        { $id: "i0", provider: "github", providerAccessToken: "not-this-one" },
        { $id: "i1", provider: "google", providerAccessToken: "this-one" },
      ],
    });

    expect(await getGoogleAccessToken()).toBe("this-one");
  });

  it("has nothing when the account has no Google sign-in, and doesn't ask Google", async () => {
    fakeAccount.listIdentities.mockResolvedValue({ total: 0, identities: [] });

    expect(await fetchGoogleProfile()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("has nothing when Appwrite kept no token", async () => {
    fakeAccount.listIdentities.mockResolvedValue(googleIdentity(""));

    expect(await fetchGoogleProfile()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("has nothing, and no error, when Google refuses", async () => {
    googleSays({ error: "invalid_token" }, false);

    await expect(fetchGoogleProfile()).resolves.toBeNull();
  });

  it("has nothing, and no error, when Google can't be reached", async () => {
    fetchMock.mockRejectedValue(new Error("Network request failed"));

    await expect(fetchGoogleProfile()).resolves.toBeNull();
  });

  it("has nothing, and no error, when Appwrite can't list the sign-ins", async () => {
    fakeAccount.listIdentities.mockRejectedValue(new Error("Network request failed"));

    await expect(fetchGoogleProfile()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("has nothing when the answer is nonsense", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.reject(new Error("bad json")) });

    await expect(fetchGoogleProfile()).resolves.toBeNull();
  });

  it("stops waiting for a slow Google after a few seconds", async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation(
      (_url: string, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          signal = options.signal;
          options.signal.addEventListener("abort", () => reject(new Error("aborted")));
        })
    );

    const pending = fetchGoogleProfile();
    await jest.advanceTimersByTimeAsync(3900);
    expect(signal?.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(200);

    await expect(pending).resolves.toBeNull();
    expect(signal?.aborted).toBe(true);
  });
});

describe("signing in with Google for the first time", () => {
  it("makes the account with the Google name and photo", async () => {
    await signInWithGoogle("/sign-in");

    expect(userDocuments()).toHaveLength(1);
    expect(userDocuments()[0]).toMatchObject({
      accountId: "account-g1",
      email: "gurleen@example.com",
      username: "Gurleen Kaur Singh",
      avatar: BIG,
    });
  });

  it("returns the document with the photo, which is what the app then shows", async () => {
    const result = await signInWithGoogle("/sign-in");

    expect(result).toMatchObject({ status: "signed_in", user: { avatar: BIG, username: "Gurleen Kaur Singh" } });
  });

  it("uses the name on the Appwrite account when Google gave only a photo", async () => {
    googleSays({ picture: PHOTO });

    await signInWithGoogle("/sign-in");

    expect(userDocuments()[0]).toMatchObject({ username: "Gurleen Singh", avatar: BIG });
  });

  it("uses the initials when Google gave no photo", async () => {
    googleSays({ name: "Gurleen Kaur Singh" });

    await signInWithGoogle("/sign-in");

    expect(userDocuments()[0].username).toBe("Gurleen Kaur Singh");
    expect(String(userDocuments()[0].avatar)).toContain(INITIALS);
  });

  it("is still signed in, with initials and the account's name, when Google couldn't be asked", async () => {
    fetchMock.mockRejectedValue(new Error("Network request failed"));

    const result = await signInWithGoogle("/sign-in");

    expect(result).toMatchObject({ status: "signed_in" });
    expect(userDocuments()[0].username).toBe("Gurleen Singh");
    expect(String(userDocuments()[0].avatar)).toContain(INITIALS);
  });

  it("makes the account with initials when the photo's address won't fit, instead of failing", async () => {
    const original = fakeBackend.documents.set.bind(fakeBackend.documents);
    // The first document with a photo is refused, as a too small column would
    let refused = false;
    jest.spyOn(fakeBackend.documents, "set").mockImplementation((id: string, doc: any) => {
      if (!refused && doc.avatar === BIG) {
        refused = true;
        throw new Error("Invalid document structure: Attribute \"avatar\" has invalid type");
      }
      return original(id, doc);
    });

    const result = await signInWithGoogle("/sign-in");

    expect(refused).toBe(true);
    expect(result).toMatchObject({ status: "signed_in" });
    expect(userDocuments()).toHaveLength(1);
    expect(String(userDocuments()[0].avatar)).toContain(INITIALS);
    expect(userDocuments()[0].username).toBe("Gurleen Kaur Singh");
  });
});

describe("signing in with Google when the app already knows the person", () => {
  const existing = (extra: Record<string, unknown> = {}) =>
    fakeBackend.documents.set("user-doc", {
      $id: "user-doc",
      $createdAt: "2026-08-01T00:00:00.000+00:00",
      accountId: "account-g1",
      email: "gurleen@example.com",
      username: "grlnsngh",
      avatar: `https://cloud.appwrite.io/v1/avatars/initials?name=grlnsngh&project=${PROJECT_ID}`,
      ...extra,
    });

  it("keeps the name they signed up with and takes the Google photo in place of the letters", async () => {
    existing();

    const result = await signInWithGoogle("/sign-in");

    expect(userDocuments()).toHaveLength(1);
    expect(userDocuments()[0]).toMatchObject({ username: "grlnsngh", avatar: BIG });
    expect(result).toMatchObject({ user: { $id: "user-doc", username: "grlnsngh", avatar: BIG } });
  });

  it("follows a new Google photo", async () => {
    existing({ avatar: "https://lh3.googleusercontent.com/a/OLD=s192-c" });

    await signInWithGoogle("/sign-in");

    expect(userDocuments()[0].avatar).toBe(BIG);
  });

  it("changes nothing when the same photo is already there", async () => {
    existing({ avatar: BIG });
    const update = jest.spyOn(fakeBackend.documents, "set");

    await signInWithGoogle("/sign-in");

    expect(update).not.toHaveBeenCalled();
    expect(userDocuments()[0].avatar).toBe(BIG);
  });

  it("never replaces a picture from somewhere else", async () => {
    existing({ avatar: "https://example.com/me.jpg" });

    await signInWithGoogle("/sign-in");

    expect(userDocuments()[0].avatar).toBe("https://example.com/me.jpg");
  });

  it("is still signed in when the photo can't be saved", async () => {
    existing();
    jest.spyOn(fakeBackend.documents, "set").mockImplementation(() => {
      throw new Error("Network request failed");
    });

    const result = await signInWithGoogle("/sign-in");

    expect(result).toMatchObject({ status: "signed_in", user: { $id: "user-doc", username: "grlnsngh" } });
    expect(fakeAccount.deleteSession).not.toHaveBeenCalled();
  });

  it("is still signed in, with nothing changed, when Google gave no photo", async () => {
    existing();
    googleSays({ name: "Someone Else" });

    const result = await signInWithGoogle("/sign-in");

    expect(result).toMatchObject({ status: "signed_in", user: { username: "grlnsngh" } });
    expect(String(userDocuments()[0].avatar)).toContain(INITIALS);
  });
});
