/**
 * What the sign in, sign up and reset screens check before asking Appwrite,
 * and how a failure from Appwrite is put. Each check returns the message to
 * show under the field, or "" when the field is fine.
 */

// A keyboard often adds a space after a suggested address
export const emailError = (email: string) => {
  const value = email.trim();
  if (!value) return "Enter your email address.";
  if (!/^\S+@\S+\.\S+$/.test(value)) return "Enter a valid email address.";
  return "";
};

/** Signing in only checks the password isn't empty or too short to be one. */
export const signInPasswordError = (password: string) => {
  if (!password) return "Enter your password.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  return "";
};

/** Appwrite rejects passwords shorter than 8 characters. */
export const newPasswordError = (password: string, empty = "Create a password.") => {
  if (!password) return empty;
  if (password.length < 8) return "Password must be at least 8 characters.";
  return "";
};

export const usernameError = (username: string) => {
  if (!username) return "Choose a username.";
  if (username.length < 3) return "Username must be at least 3 characters.";
  return "";
};

export const confirmPasswordError = (password: string, confirmation: string) => {
  if (!confirmation) return "Confirm your password.";
  if (password !== confirmation) return "Passwords do not match.";
  return "";
};

const CONNECTION =
  /network request failed|failed to fetch|network error|timed out|could not connect/i;
const CONNECTION_MESSAGE = "We couldn’t reach Pianoverse. Check your connection and try again.";
const FALLBACK = "Something went wrong. Please try again.";

const messageOf = (error: unknown) => (error instanceof Error ? error.message : "");

/** Why signing in failed, in words for the red box above the fields. */
export const signInFailure = (error: unknown) => {
  const message = messageOf(error);
  if (/invalid credentials|invalid (email|password)/i.test(message)) {
    return "We couldn’t sign you in. Check your email and password and try again.";
  }
  if (CONNECTION.test(message)) return CONNECTION_MESSAGE;
  return message || FALLBACK;
};

/** Why creating the account failed. */
export const signUpFailure = (error: unknown) => {
  const message = messageOf(error);
  if (/already exists/i.test(message)) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (CONNECTION.test(message)) return CONNECTION_MESSAGE;
  return message || FALLBACK;
};

/** Why sending the reset link, or choosing the new password, failed. */
export const resetFailure = (error: unknown) => {
  const message = messageOf(error);
  if (CONNECTION.test(message)) return CONNECTION_MESSAGE;
  return message || FALLBACK;
};
