/**
 * The business details printed at the top of the paper forms. They are typed
 * once on a form's screen and kept on this phone (lib/letterheadStorage.ts);
 * nothing here is sent anywhere. A detail left empty prints as a line to write
 * on by hand.
 */
export type Letterhead = {
  business: string;
  phone: string;
  /** What the business does, under its name on the agreements */
  tagline: string;
  address: string;
  email: string;
  /** GST number */
  gst: string;
  pan: string;
};

export type LetterheadKey = keyof Letterhead;

export const LETTERHEAD_KEYS: readonly LetterheadKey[] = [
  "business",
  "phone",
  "tagline",
  "address",
  "email",
  "gst",
  "pan",
];

/** How long each detail may be, so a pasted paragraph can't push a form off its page. */
export const LETTERHEAD_LIMITS: Record<LetterheadKey, number> = {
  business: 60,
  phone: 40,
  tagline: 90,
  address: 120,
  email: 60,
  gst: 20,
  pan: 12,
};

export const EMPTY_LETTERHEAD: Letterhead = {
  business: "",
  phone: "",
  tagline: "",
  address: "",
  email: "",
  gst: "",
  pan: "",
};

/** One detail as it is printed: spaces tidied (one space, none at the ends) and cut to its limit. */
export const cleanDetail = (key: LetterheadKey, value: unknown): string =>
  typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, LETTERHEAD_LIMITS[key])
    : "";

/**
 * A letterhead from whatever was stored: every detail present, cleaned, and
 * anything else ignored, so an old or damaged saved value never breaks a form.
 */
export const cleanLetterhead = (input: unknown): Letterhead => {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const result = { ...EMPTY_LETTERHEAD };
  for (const key of LETTERHEAD_KEYS) result[key] = cleanDetail(key, source[key]);
  return result;
};

export const isEmptyLetterhead = (letterhead: Letterhead): boolean =>
  LETTERHEAD_KEYS.every((key) => letterhead[key] === "");
