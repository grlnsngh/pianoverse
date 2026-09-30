import {
  confirmPasswordError,
  emailError,
  newPasswordError,
  resetFailure,
  signInFailure,
  signInPasswordError,
  signUpFailure,
  usernameError,
} from "@/utils/authForms";

describe("what the auth screens check", () => {
  it("asks for an email that looks like one, ignoring spaces around it", () => {
    expect(emailError("")).toBe("Enter your email address.");
    expect(emailError("   ")).toBe("Enter your email address.");
    expect(emailError("grlnsngh@gmail")).toBe("Enter a valid email address.");
    expect(emailError("not an email@x.com")).toBe("Enter a valid email address.");
    expect(emailError("  tester@example.com ")).toBe("");
  });

  it("asks for a password to sign in with, at least 6 characters", () => {
    expect(signInPasswordError("")).toBe("Enter your password.");
    expect(signInPasswordError("12345")).toBe("Password must be at least 6 characters.");
    expect(signInPasswordError("123456")).toBe("");
  });

  it("asks for at least 8 characters in a new password, which is what Appwrite needs", () => {
    expect(newPasswordError("")).toBe("Create a password.");
    expect(newPasswordError("", "Enter a new password.")).toBe("Enter a new password.");
    expect(newPasswordError("1234567")).toBe("Password must be at least 8 characters.");
    expect(newPasswordError("12345678")).toBe("");
  });

  it("asks for a username of at least 3 characters", () => {
    expect(usernameError("")).toBe("Choose a username.");
    expect(usernameError("ab")).toBe("Username must be at least 3 characters.");
    expect(usernameError("abc")).toBe("");
  });

  it("asks for the new password to be typed twice the same", () => {
    expect(confirmPasswordError("12345678", "")).toBe("Confirm your password.");
    expect(confirmPasswordError("12345678", "12345679")).toBe("Passwords do not match.");
    expect(confirmPasswordError("12345678", "12345678")).toBe("");
  });
});

describe("why signing in failed", () => {
  it("says to check the email and password when Appwrite says the credentials are wrong", () => {
    expect(
      signInFailure(new Error("Invalid credentials. Please check the email and password."))
    ).toBe("We couldn’t sign you in. Check your email and password and try again.");
  });

  it("says the connection is the problem when there is none", () => {
    expect(signInFailure(new Error("Network request failed"))).toBe(
      "We couldn’t reach Pianoverse. Check your connection and try again."
    );
  });

  it("passes on anything else Appwrite says, and has a fallback", () => {
    expect(signInFailure(new Error("Too many requests"))).toBe("Too many requests");
    expect(signInFailure("boom")).toBe("Something went wrong. Please try again.");
  });
});

describe("why creating an account or a new password failed", () => {
  it("says an account with the email exists", () => {
    expect(
      signUpFailure(new Error("A user with the same id, email, or phone already exists in this project."))
    ).toBe("An account with this email already exists. Try signing in instead.");
  });

  it("names the connection for both, and passes on the rest", () => {
    expect(signUpFailure(new Error("Failed to fetch"))).toMatch(/reach Pianoverse/);
    expect(resetFailure(new Error("Network request failed"))).toMatch(/reach Pianoverse/);
    expect(resetFailure(new Error("Invalid token passed in the request."))).toBe(
      "Invalid token passed in the request."
    );
    expect(resetFailure(undefined)).toBe("Something went wrong. Please try again.");
  });
});
