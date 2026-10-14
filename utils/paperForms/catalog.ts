/**
 * The paper forms (Paper forms boards): what each one is called, what it says
 * about itself on its screen, and how many copies are asked for. The ids are
 * also the names the usage counts will use, so they never change once
 * released.
 */
export type PaperFormId =
  | "rent_card"
  | "receipts"
  | "piano_register"
  | "rental_register"
  | "handover";

/** Which little page drawing the form gets in the list */
export type FormThumbnailKind = "table" | "receipt" | "lines";

export type PaperForm = {
  id: PaperFormId;
  /** "Rent card": the screen's title and the PDF's name */
  title: string;
  /** One line in the list of forms */
  summary: string;
  /** What is on it, under the preview */
  contents: string;
  /** How the paper is used, after "A4 · " under the preview */
  pageNote: string;
  /** What one copy is called on its screen, such as "Cards" */
  countLabel: string;
  /** Under that, such as "One page each" */
  countHint: string;
  thumbnail: FormThumbnailKind;
  /** How many pages one copy is */
  pagesPerCopy: number;
  defaultCount: number;
};

/** The most copies of a form in one PDF */
export const MAX_COPIES = 20;

export const PAPER_FORMS: readonly PaperForm[] = [
  {
    id: "rent_card",
    title: "Rent card",
    summary: "One per rental, 12 months of payments",
    contents: "Customer, piano, rent, and 12 months of payments",
    pageNote: "1 page per card",
    countLabel: "Cards",
    countHint: "One page each",
    thumbnail: "table",
    pagesPerCopy: 1,
    defaultCount: 1,
  },
  {
    id: "receipts",
    title: "Rent receipts",
    summary: "Three to a page, each with an office copy",
    contents: "Three receipts a page, each with an office copy to keep",
    pageNote: "3 receipts a page",
    countLabel: "Pages",
    countHint: "Three receipts each",
    thumbnail: "receipt",
    pagesPerCopy: 1,
    defaultCount: 1,
  },
  {
    id: "piano_register",
    title: "Piano register",
    summary: "Every piano you own, 22 to a page",
    contents: "Every piano you own, one line each, 22 to a page",
    pageNote: "22 pianos a page",
    countLabel: "Pages",
    countHint: "22 pianos each",
    thumbnail: "table",
    pagesPerCopy: 1,
    defaultCount: 1,
  },
  {
    id: "rental_register",
    title: "Rental register",
    summary: "Every rental, 20 to a page",
    contents: "Every rental in the order they start, 20 to a page",
    pageNote: "20 rentals a page",
    countLabel: "Pages",
    countHint: "20 rentals each",
    thumbnail: "table",
    pagesPerCopy: 1,
    defaultCount: 1,
  },
  {
    id: "handover",
    title: "Handover and return",
    summary: "Condition check, signed by both sides",
    contents: "A condition check when the piano leaves and when it comes back",
    pageNote: "1 page per copy",
    countLabel: "Copies",
    countHint: "One page each",
    thumbnail: "lines",
    pagesPerCopy: 1,
    defaultCount: 1,
  },
];

export const isPaperFormId = (value: unknown): value is PaperFormId =>
  PAPER_FORMS.some((form) => form.id === value);

export const paperFormById = (id: unknown): PaperForm | undefined =>
  PAPER_FORMS.find((form) => form.id === id);

/** A copy count the forms accept: a whole number from 1 to MAX_COPIES. */
export const clampCount = (count: number): number =>
  Number.isFinite(count) ? Math.min(MAX_COPIES, Math.max(1, Math.round(count))) : 1;

/** "Rent card.pdf" */
export const pdfFileName = (form: PaperForm): string => `${form.title}.pdf`;

/** "1 page" or "4 pages". */
export const pagesText = (pages: number): string => `${pages} ${pages === 1 ? "page" : "pages"}`;

/** "1 page" or "4 pages" for this many copies. */
export const pageCountText = (form: PaperForm, count: number): string =>
  pagesText(clampCount(count) * form.pagesPerCopy);

/** Every form once, in one PDF: what the full kit is called and how long it is. */
export const FULL_KIT = {
  /** Its name in the app and its PDF's name */
  title: "Paper forms kit",
  fileName: "Paper forms kit.pdf",
  pages: PAPER_FORMS.reduce((sum, form) => sum + form.pagesPerCopy, 0),
} as const;
