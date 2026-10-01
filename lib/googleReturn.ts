/**
 * Which screen started the Google sign-in, so that when Google sends the
 * person back to the app the app stays there. Without this the phone's link
 * would also be read as a screen of its own and the app would jump to the
 * Welcome screen for a moment (see `app/+native-intent.tsx`).
 */
export type GoogleReturnPath = "/sign-in" | "/sign-up";

let path: GoogleReturnPath = "/sign-in";

export const setGoogleReturnPath = (next: GoogleReturnPath) => {
  path = next;
};

export const googleReturnPath = (): GoogleReturnPath => path;
