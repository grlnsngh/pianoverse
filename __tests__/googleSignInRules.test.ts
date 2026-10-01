import {
  googleFailure,
  googleRedirectUrl,
  isGoogleReturn,
  parseGoogleReturn,
  usernameFor,
} from "@/utils/googleSignIn";

/** The parts of "Continue with Google" that need no phone. */

describe("the address Google sends the person back to", () => {
  it("is the one every Appwrite app on a phone uses, for the project", () => {
    expect(googleRedirectUrl("66b2693000154e2fa3c8")).toBe(
      "appwrite-callback-66b2693000154e2fa3c8://"
    );
  });

  it("is told from every other address that opens the app", () => {
    expect(isGoogleReturn("appwrite-callback-66b2693000154e2fa3c8://?userId=a&secret=b")).toBe(true);
    expect(isGoogleReturn("appwrite-callback-abc://localhost/auth?x=1")).toBe(true);
    expect(isGoogleReturn("APPWRITE-CALLBACK-abc://")).toBe(true);
    expect(isGoogleReturn("pianoverse://reset-password?userId=a&secret=b")).toBe(false);
    expect(isGoogleReturn("https://example.com/appwrite-callback-abc://")).toBe(false);
    expect(isGoogleReturn("/home")).toBe(false);
    expect(isGoogleReturn("")).toBe(false);
  });
});

describe("reading what Appwrite sends back", () => {
  it("takes the account and the one-time secret", () => {
    expect(
      parseGoogleReturn("appwrite-callback-abc://?userId=user-1&secret=s3cret")
    ).toEqual({ ok: true, userId: "user-1", secret: "s3cret" });
  });

  it("reads them wherever they are in the address, with a host or path in front", () => {
    for (const url of [
      "appwrite-callback-abc:///?secret=s&userId=u",
      "appwrite-callback-abc://localhost/?userId=u&secret=s",
      "appwrite-callback-abc://oauth/success?userId=u&secret=s",
      "appwrite-callback-abc://?userId=u&secret=s#",
      "appwrite-callback-abc://?userId=u&secret=s&extra=1&other",
    ]) {
      expect(parseGoogleReturn(url)).toEqual({ ok: true, userId: "u", secret: "s" });
    }
  });

  it("decodes what was encoded", () => {
    expect(
      parseGoogleReturn("appwrite-callback-abc://?userId=a%2Bb&secret=x%20y%3D")
    ).toEqual({ ok: true, userId: "a+b", secret: "x y=" });
  });

  it("keeps a secret that can't be decoded as it is, rather than failing", () => {
    expect(parseGoogleReturn("appwrite-callback-abc://?userId=u&secret=100%")).toEqual({
      ok: true,
      userId: "u",
      secret: "100%",
    });
  });

  it("uses the first of a name that is repeated", () => {
    expect(
      parseGoogleReturn("appwrite-callback-abc://?userId=first&userId=second&secret=s")
    ).toEqual({ ok: true, userId: "first", secret: "s" });
  });

  it("gives the reason Appwrite sent when it couldn't sign the person in, from JSON", () => {
    const reason = encodeURIComponent(
      JSON.stringify({ message: "OAuth provider is disabled", code: 412 })
    );

    expect(parseGoogleReturn(`appwrite-callback-abc://?error=${reason}`)).toEqual({
      ok: false,
      message: "OAuth provider is disabled",
    });
  });

  it("gives a reason that isn't JSON as it is", () => {
    expect(parseGoogleReturn("appwrite-callback-abc://?error=access_denied")).toEqual({
      ok: false,
      message: "access_denied",
    });
  });

  it("fails with no reason when there is neither a secret nor an error, or half of one", () => {
    for (const url of [
      "appwrite-callback-abc://",
      "appwrite-callback-abc://?",
      "appwrite-callback-abc://?userId=u",
      "appwrite-callback-abc://?secret=s",
      "appwrite-callback-abc://?userId=&secret=",
    ]) {
      expect(parseGoogleReturn(url)).toEqual({ ok: false, message: "" });
    }
  });

  it("prefers the secret when an error comes with it", () => {
    expect(parseGoogleReturn("appwrite-callback-abc://?userId=u&secret=s&error=x")).toEqual({
      ok: true,
      userId: "u",
      secret: "s",
    });
  });
});

describe("the username for a new account", () => {
  it("is the name on the Google account", () => {
    expect(usernameFor("  Gurleen   Singh ", "g@example.com")).toBe("Gurleen Singh");
  });

  it("is the start of the email when there is no usable name", () => {
    expect(usernameFor("", "grlnsngh@gmail.com")).toBe("grlnsngh");
    expect(usernameFor(null, "grlnsngh@gmail.com")).toBe("grlnsngh");
    expect(usernameFor("Al", "grlnsngh@gmail.com")).toBe("grlnsngh");
  });

  it("falls back to a plain name when neither is long enough, with at least 3 characters", () => {
    expect(usernameFor("", "")).toBe("Pianoverse user");
    expect(usernameFor(undefined, undefined)).toBe("Pianoverse user");
    expect(usernameFor("Al", "ab@x.com")).toBe("Pianoverse user");
  });

  it("is cut at 100 characters", () => {
    expect(usernameFor("x".repeat(300), "")).toHaveLength(100);
  });
});

describe("the words for a failure", () => {
  const say = (message: string) => googleFailure(new Error(message));

  it("says when Pianoverse can't be reached", () => {
    expect(say("Network request failed")).toBe(
      "We couldn’t reach Pianoverse. Check your connection and try again."
    );
  });

  it("says when the email already has an account", () => {
    expect(say("A user with the same id, email, or phone already exists in this project.")).toBe(
      "A Pianoverse account with this email already exists. Sign in with your email and password instead."
    );
  });

  it("says when Google isn't switched on in Appwrite", () => {
    for (const message of [
      "OAuth provider is disabled",
      "The requested OAuth provider is unsupported",
      "Invalid redirect",
    ]) {
      expect(say(message)).toBe("Google sign-in isn’t switched on for Pianoverse yet.");
    }
  });

  it("says when the person said no", () => {
    expect(say("access_denied")).toBe("Google sign-in didn’t go through. Please try again.");
  });

  it("passes on any other reason, and has words when there is none", () => {
    expect(say("Something odd")).toBe("Something odd");
    expect(say("")).toBe("Google didn’t finish signing you in. Please try again.");
    expect(googleFailure("not an error")).toBe(
      "Google didn’t finish signing you in. Please try again."
    );
  });
});
