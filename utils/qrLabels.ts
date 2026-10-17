import qrcode from "qrcode-generator";
import { PianoItem } from "@/redux/pianos/types";
import type { Letterhead } from "@/utils/letterhead";
import { escapeHtml, paperDocument } from "@/utils/paperForms/html";

// QR labels for the pianos (canvas page "QR labels"): a sticker for each piano
// with a code that opens it in the app, and the business to call if the piano
// is found. Everything here draws or measures; lib/paperPdf.ts makes the PDF.

/** The address a label's code holds: only the signed-in owner's own app can open it. */
export const pianoLink = (pianoId: string) => `pianoverse://detail/${pianoId}`;

// --- The code ---

/** White space round a code, in modules (the least a scanner wants is four). */
export const QUIET_ZONE = 4;

/** The code for `text` as rows of modules, `true` where a module is dark. Error correction M (15%), the smallest version that fits. */
export const qrMatrix = (text: string): boolean[][] => {
  const code = qrcode(0, "M");
  code.addData(text);
  code.make();
  const size = code.getModuleCount();
  return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => code.isDark(row, col)));
};

/** The dark modules as one SVG path in module units: a row of dark modules is one rectangle. */
export const qrPath = (matrix: boolean[][]): string => {
  let d = "";
  matrix.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < row.length && row[x]) x += 1;
      d += `M${start} ${y}h${x - start}v1h-${x - start}z`;
    }
  });
  return d;
};

/** An SVG of the code on white, with its quiet zone, as large as its box. Printed as vectors, so it is sharp at any size. */
export const qrSvg = (text: string): string => {
  const matrix = qrMatrix(text);
  const side = matrix.length + QUIET_ZONE * 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-QUIET_ZONE} ${-QUIET_ZONE} ${side} ${side}" ` +
    `shape-rendering="crispEdges" role="img" aria-label="QR code">` +
    `<rect x="${-QUIET_ZONE}" y="${-QUIET_ZONE}" width="${side}" height="${side}" fill="#FFFFFF"/>` +
    `<path d="${qrPath(matrix)}" fill="#000000"/></svg>`
  );
};

// --- The sheets ---

export type LabelSizeId = "large" | "small";

export interface LabelSheet {
  id: LabelSizeId;
  /** "24 · Large", the choice's label */
  label: string;
  /** The label's size in mm */
  width: number;
  height: number;
  columns: number;
  rows: number;
  /** The space between two labels in a row, in mm (none between rows) */
  gap: number;
  /** The code's box in mm, with its quiet zone */
  codeSize: number;
}

/** A4 sticker sheets in the common formats: 24 labels of 63.5 x 33.9 mm, and 65 of 38.1 x 21.2 mm. */
export const LABEL_SHEETS: Record<LabelSizeId, LabelSheet> = {
  large: { id: "large", label: "24 · Large", width: 63.5, height: 33.9, columns: 3, rows: 8, gap: 2.5, codeSize: 26.5 },
  small: { id: "small", label: "65 · Small", width: 38.1, height: 21.2, columns: 5, rows: 13, gap: 2.5, codeSize: 17.5 },
};

export const LABEL_SIZES: readonly LabelSizeId[] = ["large", "small"];

/** The page is A4. */
export const A4_MM = { width: 210, height: 297 };

export const perSheet = (sheet: LabelSheet) => sheet.columns * sheet.rows;

/** How many sheets `labels` labels fill (at least one). */
export const sheetsFor = (labels: number, size: LabelSizeId) => Math.max(1, Math.ceil(labels / perSheet(LABEL_SHEETS[size])));

/** Where the first label's top left corner is, in mm: the labels are centred on the page. */
const origin = (sheet: LabelSheet) => ({
  left: (A4_MM.width - (sheet.columns * sheet.width + (sheet.columns - 1) * sheet.gap)) / 2,
  top: (A4_MM.height - sheet.rows * sheet.height) / 2,
});

/** The corner of label number `index` (0 first, across then down) on its sheet, in mm. */
export const labelPosition = (sheet: LabelSheet, index: number) => {
  const start = origin(sheet);
  const column = index % sheet.columns;
  const row = Math.floor(index / sheet.columns) % sheet.rows;
  return {
    left: start.left + column * (sheet.width + sheet.gap),
    top: start.top + row * sheet.height,
  };
};

/** How many labels of each piano can be asked for. */
export const MAX_LABELS_EACH = 10;

export const clampLabels = (count: number) => Math.min(MAX_LABELS_EACH, Math.max(1, Math.round(count) || 1));

// --- What a label says ---

export interface LabelContent {
  /** The piano's title: "Samick SU-118" */
  title: string;
  /** "Samick · Kirpalsons": the make, then the company it belongs to */
  line: string;
  /** The business, for "If found, call": empty when it is left off or not set */
  business: string;
  phone: string;
  /** What the code holds */
  link: string;
}

const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();

/** What goes on a piano's label. The business and phone come from the Letterhead details, and only when `withBusiness`. */
export const labelContent = (piano: PianoItem, letterhead: Letterhead, withBusiness: boolean): LabelContent => {
  const make = clean(piano.make);
  return {
    title: clean(piano.title) || "Piano",
    line: [make.toLowerCase() === "other" ? "" : make, clean(piano.company_associated)].filter(Boolean).join(" · "),
    business: withBusiness ? clean(letterhead.business) : "",
    phone: withBusiness ? clean(letterhead.phone) : "",
    link: pianoLink(piano.$id),
  };
};

/** The labels asked for: each piano's, `each` times, one after the other. */
export const labelsFor = (pianos: readonly PianoItem[], letterhead: Letterhead, withBusiness: boolean, each: number): LabelContent[] => {
  const copies = clampLabels(each);
  return pianos.flatMap((piano) => {
    const label = labelContent(piano, letterhead, withBusiness);
    return Array.from({ length: copies }, () => label);
  });
};

/** Whether a label has the "If found, call" part: it needs a phone or a business. */
export const hasContact = (label: LabelContent) => !!(label.phone || label.business);

// --- The page ---

const CSS = `
.page.sheet { padding: 0; }
.lb { position: absolute; display: flex; align-items: center; overflow: hidden; background: #FFFFFF; }
.lb svg { display: block; flex: none; }
.lb .tx { min-width: 0; flex: 1 1 auto; display: flex; flex-direction: column; justify-content: center; }
.lb .t, .lb .m {
  overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;
}
.lb .t { font-weight: 700; letter-spacing: -0.01em; }
.lb .m { color: #5C574F; }
.lb .r { height: 1px; background: #D9D5CC; }
.lb .f { color: #5C574F; white-space: nowrap; overflow: hidden; }
.lb .b { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lb .p { white-space: nowrap; overflow: hidden; font-variant-numeric: tabular-nums; }
.lb.lg { width: 63.5mm; height: 33.9mm; padding: 1.6mm 2.1mm; gap: 2.1mm; }
.lb.lg svg { width: 26.5mm; height: 26.5mm; }
.lb.lg .t { font-size: 13px; line-height: 16px; }
.lb.lg .m { font-size: 11px; line-height: 14px; }
.lb.lg .r { margin: 5px 0 4px; }
.lb.lg .f { font-size: 8.5px; line-height: 11px; }
.lb.lg .b { font-size: 9.5px; line-height: 12px; }
.lb.lg .p { font-size: 10.5px; line-height: 13px; }
.lb.sm { width: 38.1mm; height: 21.2mm; padding: 1mm 1.3mm; gap: 1.3mm; }
.lb.sm svg { width: 17.5mm; height: 17.5mm; }
.lb.sm .tx { gap: 2px; }
.lb.sm .t { font-size: 9px; line-height: 11px; }
.lb.sm .f { font-size: 7.5px; line-height: 10px; }
.lb.sm .p, .lb.sm .b { font-size: 7.5px; line-height: 10px; }
.slot { position: absolute; border: 0.2mm dashed #B5B0A6; }
.sheet-note { position: absolute; left: 8mm; right: 8mm; font-size: 11px; line-height: 14px; color: #3C3831; }
`;

const mm = (value: number) => `${Math.round(value * 1000) / 1000}mm`;

/** A title as HTML, where a word with a hyphen ("U-121") is kept in one piece rather than split across two lines. */
const titleHtml = (title: string) =>
  title
    .split(" ")
    .map((word) => (word.includes("-") ? `<span style="white-space:nowrap">${escapeHtml(word)}</span>` : escapeHtml(word)))
    .join(" ");

/** One label's HTML at its own place on the page (`index` counts across and then down). */
const labelHtml = (label: LabelContent, sheet: LabelSheet, index: number): string => {
  const { left, top } = labelPosition(sheet, index);
  const small = sheet.id === "small";
  const contact = hasContact(label);
  // The small label has room for one line: the phone, or the business when there is no phone
  const smallLine = label.phone || label.business;
  const contactHtml = !contact
    ? ""
    : small
      ? `<div class="f">If found, call</div><div class="p">${escapeHtml(smallLine)}</div>`
      : `<div class="r"></div><div class="f">If found, call</div>${
          label.business ? `<div class="b">${escapeHtml(label.business)}</div>` : ""
        }${label.phone ? `<div class="p">${escapeHtml(label.phone)}</div>` : ""}`;
  return (
    `<div class="lb ${small ? "sm" : "lg"}" style="left:${mm(left)};top:${mm(top)}">${qrSvg(label.link)}` +
    `<div class="tx"><div class="t">${titleHtml(label.title)}</div>` +
    `${!small && label.line ? `<div class="m">${escapeHtml(label.line)}</div>` : ""}${contactHtml}</div></div>`
  );
};

/** The sheets of labels, one page of the PDF per sheet. */
export const labelSheetPages = (labels: readonly LabelContent[], size: LabelSizeId): string[] => {
  const sheet = LABEL_SHEETS[size];
  const each = perSheet(sheet);
  const pages: string[] = [];
  for (let start = 0; start < labels.length; start += each) {
    const slice = labels.slice(start, start + each);
    pages.push(`<section class="page sheet">${slice.map((label, i) => labelHtml(label, sheet, i)).join("")}</section>`);
  }
  return pages.length > 0 ? pages : [`<section class="page sheet"></section>`];
};

/** The whole document for the labels. `fontCss` is the @font-face rules (Figtree), when they could be read. */
export const labelsDocument = (labels: readonly LabelContent[], size: LabelSizeId, fontCss = ""): string =>
  paperDocument("Piano labels", labelSheetPages(labels, size), fontCss + CSS);

/**
 * A test sheet: every place a label goes drawn as a dashed box, the first with a label in it, and what to do at the top. Printed on
 * plain paper at full size and held against a sticker sheet in the light, it shows whether the printer lines up.
 */
export const testSheetDocument = (size: LabelSizeId, sample: LabelContent, fontCss = ""): string => {
  const sheet = LABEL_SHEETS[size];
  const count = perSheet(sheet);
  const start = origin(sheet);
  const slots = Array.from({ length: count }, (_, index) => {
    const { left, top } = labelPosition(sheet, index);
    return `<div class="slot" style="left:${mm(left)};top:${mm(top)};width:${mm(sheet.width)};height:${mm(sheet.height)}"></div>`;
  }).join("");
  const note =
    `<div class="sheet-note" style="top:${mm(Math.max(2, start.top / 2 - 4))}"><b>Test sheet</b> · ${count} labels of ${sheet.width} × ${sheet.height} mm. ` +
    `Print it on plain paper at full size (100%, not “fit to page”), then hold it against a sticker sheet in the light: every box should sit on a label.</div>`;
  // The sample goes first, so the dashed boxes are drawn over it
  const page = `<section class="page sheet">${note}${labelHtml(sample, sheet, 0)}${slots}</section>`;
  return paperDocument("Label test sheet", [page], fontCss + CSS);
};

export const LABELS_FILE = "Piano labels.pdf";
export const LABEL_TEST_FILE = "Label test sheet.pdf";
