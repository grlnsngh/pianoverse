jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);

import * as WebBrowser from "expo-web-browser";
import { createSessionFromToken, ensureUserDocument, getGoogleLoginUrl } from "@/lib/appwrite";
import { googleReturnPath } from "@/lib/googleReturn";
import { signInWithGoogle } from "@/lib/googleSignIn";
import { redirectSystemPath } from "@/app/+native-intent";
import { appwriteError, fakeAccount, fakeBackend, PROJECT_ID } from "./helpers/fakeAppwrite";

/**
 * Signing in with Google, against a fake Appwrite and a browser that answers
 * as the test says. Nothing here has met the real Google or Appwrite.
 */

const REDIRECT = `appwrite-callback-${PROJECT_ID}://`;
const openAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;

/** What the account is, as Appwrite makes it from a Google sign-in */
const googleAccount = {
  $id: "account-g1",
  name: "Gurleen Singh",
  email: "gurleen@example.com",
};

/** The person signs in with Google and Appwrite sends them back with a token. */
const googleSucceeds = (url = `${REDIRECT}?userId=account-g1&secret=one-time`) => {
  openAuthSession.mockResolvedValueOnce({ type: "success", url });
  fakeAccount.createSession.mockResolvedValue({ $id: "session-1" });
  fakeAccount.get.mockResolvedValue(googleAccount);
};

const userDocuments = () =>
  [...fakeBackend.documents.values()].filter((doc) => "accountId" in doc);

beforeEach(() => {
  jest.clearAllMocks();
  fakeBackend.reset();
  openAuthSession.mockReset().mockResolvedValue({ type: "cancel" });
});

describe("the page Google sign-in opens", () => {
  it("is Appwrite's Google page, which sends the person back to the app on success or failure", () => {
    const url = new URL(getGoogleLoginUrl(REDIRECT));

    expect(url.pathname).toContain("/oauth2/google");
    expect(url.searchParams.get("success")).toBe(REDIRECT);
    expect(url.searchParams.get("failure")).toBe(REDIRECT);
    expect(fakeAccount.createOAuth2Token).toHaveBeenCalledWith("google", REDIRECT, REDIRECT);
  });

  it("can't be made when Appwrite gives no address", () => {
    fakeAccount.createOAuth2Token.mockReturnValueOnce(undefined);

    expect(() => getGoogleLoginUrl(REDIRECT)).toThrow("Couldn’t start Google sign-in.");
  });
});

describe("signing in with Google", () => {
  it("opens Google's page and waits for the way back to the app", async () => {
    googleSucceeds();

    await signInWithGoogle("/sign-in");

    expect(openAuthSession).toHaveBeenCalledTimes(1);
    const [url, redirect] = openAuthSession.mock.calls[0];
    expect(url).toContain("/oauth2/google");
    expect(redirect).toBe(REDIRECT);
  });

  it("makes a session from the token Appwrite sent back", async () => {
    googleSucceeds();

    await signInWithGoogle("/sign-in");

    expect(fakeAccount.createSession).toHaveBeenCalledWith("account-g1", "one-time");
  });

  it("makes the user document for a first sign-in, with the Google name and email", async () => {
    googleSucceeds();

    const result = await signInWithGoogle("/sign-in");

    expect(userDocuments()).toHaveLength(1);
    expect(userDocuments()[0]).toMatchObject({
      accountId: "account-g1",
      email: "gurleen@example.com",
      username: "Gurleen Singh",
    });
    expect(String(userDocuments()[0].avatar)).toContain("initials?name=Gurleen%20Singh");
    expect(result).toEqual({ status: "signed_in", user: userDocuments()[0] });
  });

  it("uses the document that is already there for someone who has signed in before", async () => {
    fakeBackend.documents.set("user-doc", {
      $id: "user-doc",
      $createdAt: "2026-09-01T00:00:00.000+00:00",
      accountId: "account-g1",
      email: "gurleen@example.com",
      username: "gurleen",
    });
    googleSucceeds();

    const result = await signInWithGoogle("/sign-in");

    expect(userDocuments()).toHaveLength(1);
    expect(result).toMatchObject({ status: "signed_in", user: { $id: "user-doc", username: "gurleen" } });
    // Finding the document asks who the account is once, and nothing makes a second one
    expect(fakeAccount.get).toHaveBeenCalledTimes(1);
  });

  it("keeps the pianos of an email and password account when Appwrite puts the Google sign-in on that same account", async () => {
    // Appwrite matches the Google email to the existing account, so the account id is the same
    // and the pianos (which belong to that id) are all still there
    fakeBackend.documents.set("old-doc", {
      $id: "old-doc",
      $createdAt: "2026-08-01T00:00:00.000+00:00",
      accountId: "account-g1",
      email: "gurleen@example.com",
      username: "owner",
    });
    googleSucceeds();

    const result = await signInWithGoogle("/sign-up");

    expect(userDocuments()).toHaveLength(1);
    expect(result).toMatchObject({ status: "signed_in", user: { $id: "old-doc" } });
  });

  it("names the account from the email when Google gives no name", async () => {
    googleSucceeds();
    fakeAccount.get.mockResolvedValue({ ...googleAccount, name: "" });

    await signInWithGoogle("/sign-in");

    expect(userDocuments()[0].username).toBe("gurleen");
  });

  it("remembers which screen started it, so the way back stays on that screen", async () => {
    googleSucceeds();
    await signInWithGoogle("/sign-up");
    expect(googleReturnPath()).toBe("/sign-up");
    expect(redirectSystemPath({ path: `${REDIRECT}?userId=a&secret=b`, initial: false })).toBe(
      "/sign-up"
    );

    googleSucceeds();
    await signInWithGoogle("/sign-in");
    expect(redirectSystemPath({ path: `${REDIRECT}?userId=a&secret=b`, initial: false })).toBe(
      "/sign-in"
    );
  });

  it("does nothing when the person closes Google's page", async () => {
    for (const type of ["cancel", "dismiss", "locked"]) {
      openAuthSession.mockResolvedValueOnce({ type });

      await expect(signInWithGoogle("/sign-in")).resolves.toEqual({ status: "cancelled" });
    }

    expect(fakeAccount.createSession).not.toHaveBeenCalled();
    expect(userDocuments()).toHaveLength(0);
  });

  describe("when it doesn't work", () => {
    it("says why when Appwrite sends the person back with a failure", async () => {
      const reason = encodeURIComponent(JSON.stringify({ message: "OAuth provider is disabled" }));
      openAuthSession.mockResolvedValueOnce({ type: "success", url: `${REDIRECT}?error=${reason}` });

      await expect(signInWithGoogle("/sign-in")).rejects.toThrow("OAuth provider is disabled");
      expect(fakeAccount.createSession).not.toHaveBeenCalled();
    });

    it("fails without a reason when the way back has no token", async () => {
      openAuthSession.mockResolvedValueOnce({ type: "success", url: REDIRECT });

      await expect(signInWithGoogle("/sign-in")).rejects.toThrow(/^$/);
      expect(fakeAccount.createSession).not.toHaveBeenCalled();
    });

    it("fails when the token is refused", async () => {
      googleSucceeds();
      fakeAccount.createSession.mockRejectedValue(
        appwriteError("Invalid token passed in the request.", 401, "user_invalid_token")
      );

      await expect(signInWithGoogle("/sign-in")).rejects.toThrow("Invalid token passed in the request.");
      expect(userDocuments()).toHaveLength(0);
    });

    it("ends a session left from before and tries again", async () => {
      googleSucceeds();
      fakeAccount.createSession
        .mockRejectedValueOnce(
          appwriteError("Creation of a session is prohibited when a session is active.", 401, "user_session_already_exists")
        )
        .mockResolvedValueOnce({ $id: "session-2" });

      await expect(signInWithGoogle("/sign-in")).resolves.toMatchObject({ status: "signed_in" });

      expect(fakeAccount.deleteSession).toHaveBeenCalledWith("current");
      expect(fakeAccount.createSession).toHaveBeenCalledTimes(2);
    });

    it("signs out again when the user document can't be made, so no unusable session is left", async () => {
      googleSucceeds();
      fakeBackend.missingCollections.add("66b26b2a00163be2e73a");

      await expect(signInWithGoogle("/sign-in")).rejects.toThrow();

      expect(fakeAccount.deleteSession).toHaveBeenCalledWith("current");
    });

    it("still reports the first problem when signing out fails too", async () => {
      googleSucceeds();
      fakeBackend.missingCollections.add("66b26b2a00163be2e73a");
      fakeBackend.signOutError = new Error("offline");

      await expect(signInWithGoogle("/sign-in")).rejects.toThrow(
        "Collection with the requested ID could not be found."
      );
    });

    it("fails when there is no connection to ask who the account is", async () => {
      googleSucceeds();
      fakeAccount.get.mockRejectedValue(appwriteError("Network request failed"));

      await expect(signInWithGoogle("/sign-in")).rejects.toThrow("Network request failed");
    });
  });
});

describe("a session from a token, on its own", () => {
  it("passes on a reason that isn't a session left from before", async () => {
    fakeAccount.createSession.mockRejectedValue(appwriteError("Rate limit exceeded", 429, "general_rate_limit_exceeded"));

    await expect(createSessionFromToken("u", "s")).rejects.toThrow("Rate limit exceeded");
    expect(fakeAccount.deleteSession).not.toHaveBeenCalled();
  });
});

describe("the user document, on its own", () => {
  it("is made once for an account and found after that", async () => {
    fakeAccount.get.mockResolvedValue(googleAccount);

    const first = await ensureUserDocument();
    const second = await ensureUserDocument();

    expect(second.$id).toBe(first.$id);
    expect(userDocuments()).toHaveLength(1);
  });

  it("is not made for nobody: no account, no document", async () => {
    fakeAccount.get.mockRejectedValue(appwriteError("Unauthorized", 401));

    await expect(ensureUserDocument()).rejects.toThrow("Unauthorized");
    expect(userDocuments()).toHaveLength(0);
  });
});

describe("the way back into the app", () => {
  it("leaves every other address as it is", () => {
    expect(redirectSystemPath({ path: "pianoverse://reset-password?userId=a&secret=b", initial: true })).toBe(
      "pianoverse://reset-password?userId=a&secret=b"
    );
    expect(redirectSystemPath({ path: "/home", initial: false })).toBe("/home");
  });
});
