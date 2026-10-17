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

/** "TPS" from "The Piano Services": the first letter of the first three words, for a letterhead with no logo. */
export const initialsOf = (business: string): string =>
  business
    .split(/\s+/)
    .map((word) => word.match(/[\p{L}\p{N}]/u)?.[0] ?? "")
    .filter(Boolean)
    .slice(0, 3)
    .join("")
    .toUpperCase();

/**
 * How the letterhead looks (canvas page "Letterhead"): what is at the top of
 * the paper forms, beside the business details above. Kept on this phone.
 */
export type LetterheadStyle =
  /** Just the document */
  | "none"
  /** Top and bottom left empty, for a pre-printed letterhead pad */
  | "printed"
  /** One of the designs, with the business's logo or initials, details and colour */
  | "make"
  /** The business's own letterhead image */
  | "upload";

export type LetterheadTemplate = "monogram" | "classic" | "modern" | "band" | "minimal";

export const LETTERHEAD_STYLES: readonly LetterheadStyle[] = ["none", "printed", "make", "upload"];

export const LETTERHEAD_TEMPLATES: readonly { id: LetterheadTemplate; name: string }[] = [
  { id: "monogram", name: "Monogram" },
  { id: "classic", name: "Classic" },
  { id: "modern", name: "Modern" },
  { id: "band", name: "Band" },
  { id: "minimal", name: "Minimal" },
];

/** A colour for a design: the strong one for headings and bands, and two paler ones. */
export type LetterheadColour = {
  id: string;
  name: string;
  accent: string;
  /** The big initials and fine lines of Monogram */
  tint: string;
  /** Behind a logo tile, under a footer band */
  pale: string;
};

export const LETTERHEAD_COLOURS: readonly LetterheadColour[] = [
  { id: "copper", name: "Copper", accent: "#9A4A24", tint: "#F2CDB6", pale: "#F6E1D3" },
  { id: "navy", name: "Navy", accent: "#1F3A5F", tint: "#C9D6E6", pale: "#DCE4EE" },
  { id: "teal", name: "Teal", accent: "#1E5E5B", tint: "#C3DEDA", pale: "#DCEBE8" },
  { id: "forest", name: "Forest", accent: "#2F5D3A", tint: "#CDE0CF", pale: "#DDEADF" },
  { id: "maroon", name: "Maroon", accent: "#7A2331", tint: "#EDC7CC", pale: "#F1DADD" },
  { id: "plum", name: "Plum", accent: "#5B3A6E", tint: "#DCCBE6", pale: "#E6DCEE" },
  { id: "gold", name: "Gold", accent: "#8A6A1F", tint: "#EBDDB4", pale: "#F2E9CF" },
  { id: "ink", name: "Ink", accent: "#1A1814", tint: "#DAD6CE", pale: "#EFEDE8" },
];

export const colourById = (id: string): LetterheadColour =>
  LETTERHEAD_COLOURS.find((colour) => colour.id === id) ?? LETTERHEAD_COLOURS[0];

/** An image kept on the phone for the letterhead: its file in the letterhead folder and its size in pixels. */
export type LetterheadImage = { file: string; width: number; height: number };

/** What the letterhead's picture is: the grand piano that comes with the app, the person's own, or none. */
export type PictureSource = "piano" | "own" | "none";

/** Where the picture goes: beside the letterhead at the right or the left, or faint behind the writing. */
export type PicturePlace = "right" | "left" | "behind";

export const PICTURE_PLACES: readonly PicturePlace[] = ["right", "left", "behind"];

/**
 * The picture of a made letterhead (like the grand piano at the top right of
 * the owner's TPS letterhead): on page 1 of the agreements at its full size,
 * small on the other forms.
 */
export type LetterheadPicture = {
  source: PictureSource;
  /** The person's own picture, kept on the phone (for "own") */
  image: LetterheadImage | null;
  place: PicturePlace;
  /** How big, in per cent of the design's own size for it */
  size: number;
  /** How strongly it prints, in per cent: 100 is as it is, less is paler */
  strength: number;
};

export type LetterheadDesign = {
  style: LetterheadStyle;
  template: LetterheadTemplate;
  colour: string;
  /** Details in a serif (Lora) rather than the app's own sans serif */
  elegant: boolean;
  logo: LetterheadImage | null;
  picture: LetterheadPicture;
  upload: {
    image: LetterheadImage | null;
    /** A whole A4 page (header, footer, watermark) or just the top strip */
    kind: "page" | "strip";
    /** Where the text may start and must stop, in millimetres from the top and bottom edge */
    top: number;
    bottom: number;
    /** How strongly it prints, in per cent */
    strength: number;
  };
  printed: { top: number; bottom: number };
};

/** What each choice of space allows, in millimetres. */
export const SPACE_LIMITS = {
  printed: { top: [0, 90], bottom: [0, 60] },
  upload: { top: [10, 90], bottom: [10, 60] },
} as const;

/**
 * What a picture's size and strength may be, in per cent. At 130% every
 * design's agreement still fits on two pages (Monogram's goes on to a third
 * from about 140%).
 */
export const PICTURE_LIMITS = { size: [60, 130], strength: [10, 100] } as const;

/** How strongly a picture behind the writing prints at first: faint, so the words stay easy to read. */
export const BEHIND_STRENGTH = 15;

/** The grand piano at the top right, as on the owner's TPS letterhead. */
export const DEFAULT_PICTURE: LetterheadPicture = {
  source: "piano",
  image: null,
  place: "right",
  size: 100,
  strength: 100,
};

export const DEFAULT_DESIGN: LetterheadDesign = {
  style: "make",
  template: "monogram",
  colour: "copper",
  elegant: true,
  logo: null,
  picture: DEFAULT_PICTURE,
  upload: { image: null, kind: "page", top: 54, bottom: 18, strength: 100 },
  printed: { top: 45, bottom: 15 },
};

const clampMm = (value: unknown, [min, max]: readonly [number, number], fallback: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;

/** A stored image, if it names a plain file in the letterhead folder and has a size. */
const cleanImage = (input: unknown): LetterheadImage | null => {
  if (!input || typeof input !== "object") return null;
  const { file, width, height } = input as Record<string, unknown>;
  if (typeof file !== "string" || !/^[\w.-]{1,80}$/.test(file) || file.startsWith(".")) return null;
  if (typeof width !== "number" || typeof height !== "number" || width < 1 || height < 1) return null;
  return { file, width: Math.round(width), height: Math.round(height) };
};

/** A picture from whatever was stored; a design saved before pictures existed gets the grand piano. */
const cleanPicture = (input: unknown): LetterheadPicture => {
  if (!input || typeof input !== "object") return DEFAULT_PICTURE;
  const { source, image, place, size, strength } = input as Record<string, any>;
  return {
    source: ["piano", "own", "none"].includes(source) ? source : DEFAULT_PICTURE.source,
    image: cleanImage(image),
    place: PICTURE_PLACES.includes(place) ? place : DEFAULT_PICTURE.place,
    size: clampMm(size, PICTURE_LIMITS.size, DEFAULT_PICTURE.size),
    strength: clampMm(strength, PICTURE_LIMITS.strength, DEFAULT_PICTURE.strength),
  };
};

/** A design from whatever was stored: every part present and allowed, anything else the default. */
export const cleanDesign = (input: unknown): LetterheadDesign => {
  const source = input && typeof input === "object" ? (input as Record<string, any>) : {};
  const upload = source.upload && typeof source.upload === "object" ? source.upload : {};
  const printed = source.printed && typeof source.printed === "object" ? source.printed : {};
  return {
    style: LETTERHEAD_STYLES.includes(source.style) ? source.style : DEFAULT_DESIGN.style,
    template: LETTERHEAD_TEMPLATES.some((template) => template.id === source.template)
      ? source.template
      : DEFAULT_DESIGN.template,
    colour: LETTERHEAD_COLOURS.some((colour) => colour.id === source.colour)
      ? source.colour
      : DEFAULT_DESIGN.colour,
    elegant: typeof source.elegant === "boolean" ? source.elegant : DEFAULT_DESIGN.elegant,
    logo: cleanImage(source.logo),
    picture: cleanPicture(source.picture),
    upload: {
      image: cleanImage(upload.image),
      kind: upload.kind === "strip" ? "strip" : "page",
      top: clampMm(upload.top, SPACE_LIMITS.upload.top, DEFAULT_DESIGN.upload.top),
      bottom: clampMm(upload.bottom, SPACE_LIMITS.upload.bottom, DEFAULT_DESIGN.upload.bottom),
      strength: clampMm(upload.strength, PICTURE_LIMITS.strength, DEFAULT_DESIGN.upload.strength),
    },
    printed: {
      top: clampMm(printed.top, SPACE_LIMITS.printed.top, DEFAULT_DESIGN.printed.top),
      bottom: clampMm(printed.bottom, SPACE_LIMITS.printed.bottom, DEFAULT_DESIGN.printed.bottom),
    },
  };
};

/**
 * What is really printed: a design that can't be drawn yet falls back.
 * "make" with no business name prints lines to write the details on;
 * "upload" with no image prints nothing at the top.
 */
export type PrintedLetterhead = "none" | "printed" | "make" | "upload" | "lines";

export const effectiveStyle = (design: LetterheadDesign, details: Letterhead): PrintedLetterhead => {
  if (design.style === "make") return details.business ? "make" : "lines";
  if (design.style === "upload") return design.upload.image ? "upload" : "none";
  return design.style;
};

/**
 * The picture a design really prints, or null: only a made letterhead has
 * one, and the person's own picture only once it has been chosen.
 */
export const printedPicture = (design: LetterheadDesign): LetterheadPicture | null => {
  if (design.style !== "make") return null;
  const { picture } = design;
  if (picture.source === "none" || (picture.source === "own" && !picture.image)) return null;
  return picture;
};

/** Millimetres as CSS pixels at 96 to the inch. */
export const mmToPx = (mm: number): number => Math.round((mm * 96) / 25.4);

/** One line about the letterhead, for the rows that open it: "Monogram · The Piano Services". */
export const designSummary = (design: LetterheadDesign, details: Letterhead): string => {
  switch (design.style) {
    case "none":
      return "No letterhead · just the document";
    case "printed":
      return `Printed letterhead paper · ${design.printed.top} mm left empty at the top`;
    case "upload":
      return design.upload.image ? "My own letterhead image" : "My own letterhead image · none chosen yet";
    default: {
      const name = LETTERHEAD_TEMPLATES.find((template) => template.id === design.template)?.name;
      return details.business ? `${name} · ${details.business}` : `${name} · add your business name`;
    }
  }
};
