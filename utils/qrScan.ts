// Reading a QR label (canvas page "QR labels"): what a scanned code is, and
// what a link that opens the app from outside is. A label holds
// `pianoverse://detail/<the piano's ID>`; anything else is not one of ours.

/** What every label's address starts with: the app's own scheme, and the piano's page. */
export const PIANO_LINK_PREFIX = "pianoverse://detail/";

/** An Appwrite row ID: letters, digits, period, hyphen and underscore, at most 36, not starting with a symbol. */
const PIANO_ID = "[A-Za-z0-9][A-Za-z0-9._-]{0,35}";

const LABEL = new RegExp(`^${PIANO_LINK_PREFIX.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}(${PIANO_ID})/?(?:[?#].*)?$`, "i");

/** The piano a scanned code names, or null when the code is not one of our labels. */
export const pianoIdFromLabel = (data: string | null | undefined): string | null => {
  const match = (data ?? "").trim().match(LABEL);
  return match ? match[1] : null;
};

// The same link as the phone hands it to the app: with its scheme, or already as a path
const LINK = new RegExp(`^(?:pianoverse://|/)detail/(${PIANO_ID})/?(?:[?#].*)?$`, "i");

/** The piano a link that opens the app names (`pianoverse://detail/<id>`, or `/detail/<id>`), or null for any other address. */
export const pianoIdFromLink = (path: string | null | undefined): string | null => {
  const match = (path ?? "").trim().match(LINK);
  return match ? match[1] : null;
};
