import {
  colourById,
  effectiveStyle,
  initialsOf,
  mmToPx,
  type Letterhead,
  type LetterheadColour,
  type LetterheadDesign,
  type PrintedLetterhead,
} from "../letterhead";
import { escapeHtml, PAGE_HEIGHT, PAGE_WIDTH } from "./html";

/**
 * The letterheads printed on the paper forms (canvas page "Letterhead"): the
 * five designs of "Make one", the business's own image, the space left for a
 * printed pad, and none. A page gets the full letterhead on its first page
 * and the small one after that; the rent card, receipts and handover form get
 * the small one too. Everything is drawn in HTML for expo-print, black on
 * white plus the chosen colour; images are put in the document once, as CSS.
 */

/** The images of the letterhead, as data: addresses, when there are any. */
export type LetterheadAssets = { logo: string | null; image: string | null };
export const NO_ASSETS: LetterheadAssets = { logo: null, image: null };

/** How a letterhead sits on the pages of a document. */
export type LetterheadFrame = {
  style: PrintedLetterhead;
  /** Behind and around page 1: absolutely placed (the header, a watermark, a band) */
  firstLayers: string;
  /** The same for every later page */
  restLayers: string;
  /** Where the writing starts on page 1, in px from the top */
  firstTop: number;
  /** At the top of every later page, in the flow (the small letterhead) */
  restStrip: string;
  /** Space above that strip */
  restPad: number;
  /** Where the writing starts on later pages, after the strip */
  restTop: number;
  /** The page's footer line, in px from the bottom */
  footBottom: number;
};

const DISPLAY = "'Playfair Display',Georgia,serif";
const SERIF = "'Lora',Georgia,serif";
const SANS = "'Figtree',-apple-system,'Segoe UI',Roboto,sans-serif";

/** The font families a design needs in the PDF, beyond Figtree. */
export const fontsForDesign = (design: LetterheadDesign): ("playfair400" | "playfair500" | "lora400")[] => {
  if (design.style !== "make") return [];
  const fonts: ("playfair400" | "playfair500" | "lora400")[] = [];
  if (design.template === "monogram") fonts.push("playfair400");
  if (design.template === "classic") fonts.push("playfair500");
  if (design.elegant) fonts.push("lora400");
  return fonts;
};

/** The images as CSS classes, written once in a document however many pages use them. */
export const letterheadCss = (assets: LetterheadAssets): string =>
  ".lh-layer{position:absolute;z-index:-1}" +
  (assets.logo ? `.lh-logo{background:url(${assets.logo}) center/contain no-repeat}` : "") +
  (assets.image ? `.lh-image{background-image:url(${assets.image});background-repeat:no-repeat}` : "");

/** A font size that keeps `text` on one line in `width` px, from `max` down to `min`. */
const fit = (text: string, max: number, width: number, perChar: number, min: number) =>
  Math.max(min, Math.min(max, Math.floor(width / Math.max(1, text.length * perChar))));

/** Lines of text, each kept to one line (cut with … when it can't fit). */
const lines = (items: (string | false | undefined | null)[]) =>
  items
    .filter((item): item is string => !!item)
    .map(
      (item) =>
        `<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(item)}</div>`
    )
    .join("");

const join = (items: (string | false | undefined | null)[], separator = "  ·  ") =>
  items.filter((item): item is string => !!item).join(separator);

const detailFont = (elegant: boolean) => (elegant ? SERIF : SANS);

type TemplateInput = {
  d: Letterhead;
  c: LetterheadColour;
  elegant: boolean;
  assets: LetterheadAssets;
};

type TemplateParts = Omit<LetterheadFrame, "style">;

const monogram = ({ d, c, elegant, assets }: TemplateInput): TemplateParts => {
  const initials = escapeHtml(initialsOf(d.business));
  const name = escapeHtml(d.business.toUpperCase());
  const font = detailFont(elegant);
  const nameRight = assets.logo ? 150 : 0;
  const size = fit(d.business, 34, 698 - nameRight, 0.72, 18);
  const watermark = `<div class="lh-layer" style="right:-14px;bottom:52px;font-family:${DISPLAY};font-size:300px;line-height:1;letter-spacing:-0.02em;color:${c.tint};opacity:0.4">${initials}</div>`;
  const header =
    `<div style="position:absolute;left:48px;right:48px;top:26px;height:196px">` +
    `<div style="position:absolute;left:-4px;top:0;font-family:${DISPLAY};font-size:118px;line-height:1;letter-spacing:0.01em;color:${c.tint}">${initials}</div>` +
    `<div style="position:absolute;left:4px;right:${nameRight}px;top:60px;font-size:${size}px;font-weight:600;line-height:40px;letter-spacing:0.06em;color:#2B2622;white-space:nowrap;overflow:hidden">${name}</div>` +
    (assets.logo ? `<div class="lh-logo" style="position:absolute;right:0;top:4px;width:132px;height:88px"></div>` : "") +
    `<div style="position:absolute;left:4px;right:0;top:116px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px;font-family:${font};font-size:12.5px;line-height:18px;color:#4A443D">` +
    `<div style="min-width:0">${lines([d.tagline, d.address, d.gst && `GST No. ${d.gst}`, d.phone && `Mob.: ${d.phone}`])}</div>` +
    `<div style="flex-shrink:0;text-align:right">${lines([d.pan && `PAN No. ${d.pan}`, d.email && `E-mail: ${d.email}`])}</div>` +
    `</div></div>` +
    `<div style="position:absolute;left:48px;right:48px;top:222px;height:1px;background:${c.tint}"></div>`;
  const overlap = Math.round(initialsOf(d.business).length * 10);
  const strip =
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:24px;height:52px">` +
    `<div style="display:flex;align-items:center;min-width:0"><span style="font-family:${DISPLAY};font-size:42px;line-height:1;color:${c.tint}">${initials}</span>` +
    `<span style="margin-left:-${overlap}px;font-size:15px;font-weight:600;line-height:20px;letter-spacing:0.08em;color:#2B2622;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</span></div>` +
    `<div style="flex-shrink:0;text-align:right;font-family:${font};font-size:11.5px;line-height:16px;color:#4A443D">${lines([d.phone && `Mob. ${d.phone}`, d.email])}</div>` +
    `</div><div style="height:1px;margin-top:8px;background:${c.tint}"></div>`;
  return {
    firstLayers: watermark + header,
    restLayers: watermark,
    firstTop: 240,
    restStrip: strip,
    restPad: 28,
    restTop: 89,
    footBottom: 30,
  };
};

/** The initials in a ring, for Classic when there is no logo. */
const ring = (initials: string, colour: string) =>
  `<div style="width:46px;height:46px;box-sizing:border-box;border:1.5px solid ${colour};border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:${DISPLAY};font-size:${
    initials.length > 2 ? 15 : 18
  }px;font-weight:500;color:${colour}">${escapeHtml(initials)}</div>`;

const classic = ({ d, c, elegant, assets }: TemplateInput): TemplateParts => {
  const font = detailFont(elegant);
  const name = escapeHtml(d.business);
  const size = fit(d.business, 30, 698, 0.52, 18);
  const contacts = join([d.phone && `Mob. ${d.phone}`, d.email, d.gst && `GST No. ${d.gst}`, d.pan && `PAN ${d.pan}`]);
  const header =
    `<div style="position:absolute;left:48px;right:48px;top:30px;display:flex;flex-direction:column;align-items:center;text-align:center">` +
    (assets.logo ? `<div class="lh-logo" style="width:72px;height:46px"></div>` : ring(initialsOf(d.business), c.accent)) +
    `<div style="max-width:100%;margin-top:8px;font-family:${DISPLAY};font-size:${size}px;font-weight:500;line-height:36px;letter-spacing:0.01em;white-space:nowrap;overflow:hidden">${name}</div>` +
    (d.tagline
      ? `<div style="max-width:100%;margin-top:2px;font-size:10.5px;font-weight:600;line-height:16px;letter-spacing:0.18em;text-transform:uppercase;color:${c.accent};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(
          d.tagline
        )}</div>`
      : "") +
    `<div style="max-width:100%;margin-top:8px;font-family:${font};font-size:12px;line-height:18px;color:#4A443D">${lines([d.address, contacts])}</div>` +
    `<div style="align-self:stretch;margin-top:10px;height:2px;background:${c.accent}"></div>` +
    `<div style="align-self:stretch;margin-top:3px;height:1px;background:${c.accent}"></div>` +
    `</div>`;
  const strip =
    `<div style="text-align:center">` +
    `<div style="font-family:${DISPLAY};font-size:20px;font-weight:500;line-height:26px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>` +
    `<div style="font-family:${font};font-size:11.5px;line-height:16px;color:#4A443D">${lines([join([d.phone && `Mob. ${d.phone}`, d.email])])}</div>` +
    `<div style="height:2px;margin-top:8px;background:${c.accent}"></div><div style="height:1px;margin-top:2px;background:${c.accent}"></div>` +
    `</div>`;
  return {
    firstLayers: header,
    restLayers: "",
    firstTop: 236,
    restStrip: strip,
    restPad: 28,
    restTop: 85,
    footBottom: 30,
  };
};

/** A rounded tile holding the logo, or the initials, for Modern. */
const tile = (size: number, radius: number, c: LetterheadColour, initials: string, logo: boolean) =>
  logo
    ? `<div style="width:${size}px;height:${size}px;flex-shrink:0;box-sizing:border-box;padding:${Math.round(
        size / 10
      )}px;border-radius:${radius}px;background:${c.pale}"><div class="lh-logo" style="width:100%;height:100%"></div></div>`
    : `<div style="width:${size}px;height:${size}px;flex-shrink:0;border-radius:${radius}px;background:${c.pale};display:flex;align-items:center;justify-content:center;font-size:${Math.round(
        size * (initials.length > 2 ? 0.28 : 0.34)
      )}px;font-weight:700;letter-spacing:0.02em;color:${c.accent}">${escapeHtml(initials)}</div>`;

const labelled = (label: string, value: string, c: LetterheadColour) =>
  value
    ? `<div style="white-space:nowrap"><span style="font-family:${SANS};font-weight:600;color:${c.accent}">${label}</span>  ${escapeHtml(
        value
      )}</div>`
    : "";

const modern = ({ d, c, elegant, assets }: TemplateInput): TemplateParts => {
  const font = detailFont(elegant);
  const initials = initialsOf(d.business);
  const size = fit(d.business, 27, 380, 0.56, 18);
  const header =
    `<div style="position:absolute;left:0;right:0;top:0;height:10px;background:${c.accent}"></div>` +
    `<div style="position:absolute;left:48px;right:48px;top:40px;display:flex;justify-content:space-between;align-items:flex-start;gap:24px">` +
    `<div style="display:flex;gap:16px;align-items:flex-start;min-width:0">${tile(68, 14, c, initials, !!assets.logo)}` +
    `<div style="min-width:0"><div style="font-size:${size}px;font-weight:700;line-height:32px;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(
      d.business
    )}</div>` +
    `<div style="margin-top:2px;font-size:12.5px;line-height:18px;color:#5C574F">${lines([d.tagline])}</div>` +
    `<div style="font-family:${font};font-size:12px;line-height:18px;color:#5C574F">${lines([d.address])}</div></div></div>` +
    `<div style="flex-shrink:0;text-align:right;font-family:${font};font-size:11.5px;line-height:17px;color:#3C3831">` +
    labelled("Mob", d.phone, c) +
    labelled("Email", d.email, c) +
    labelled("GST", d.gst, c) +
    labelled("PAN", d.pan, c) +
    `</div></div>` +
    `<div style="position:absolute;left:48px;right:48px;top:132px;height:1px;background:#D9D5CC"></div>`;
  const strip =
    `<div style="margin:-28px -48px 0;height:6px;background:${c.accent}"></div>` +
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:14px">` +
    `<div style="display:flex;align-items:center;gap:12px;min-width:0">${tile(38, 9, c, initials, !!assets.logo)}` +
    `<div style="font-size:18px;font-weight:700;line-height:24px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(
      d.business
    )}</div></div>` +
    `<div style="flex-shrink:0;text-align:right;font-family:${font};font-size:11.5px;line-height:16px;color:#3C3831">${labelled(
      "Mob",
      d.phone,
      c
    )}${labelled("Email", d.email, c)}</div>` +
    `</div><div style="height:1px;margin-top:10px;background:#D9D5CC"></div>`;
  return {
    firstLayers: header,
    restLayers: "",
    firstTop: 152,
    restStrip: strip,
    restPad: 28,
    restTop: 69,
    footBottom: 30,
  };
};

const band = ({ d, c, elegant, assets }: TemplateInput): TemplateParts => {
  const font = detailFont(elegant);
  const initials = initialsOf(d.business);
  const size = fit(d.business, 30, 560, 0.6, 18);
  const mark = assets.logo
    ? `<div style="width:76px;height:76px;flex-shrink:0;box-sizing:border-box;padding:12px;border-radius:50%;background:#FFFFFF"><div class="lh-logo" style="width:100%;height:100%"></div></div>`
    : `<div style="width:76px;height:76px;flex-shrink:0;border-radius:50%;background:#FFFFFF;display:flex;align-items:center;justify-content:center;font-size:${
        initials.length > 2 ? 22 : 26
      }px;font-weight:700;color:${c.accent}">${escapeHtml(initials)}</div>`;
  const top =
    `<div style="position:absolute;left:0;right:0;top:0;height:128px;box-sizing:border-box;padding:0 48px;background:${c.accent};display:flex;align-items:center;justify-content:space-between;gap:24px">` +
    `<div style="min-width:0"><div style="font-size:${size}px;font-weight:700;line-height:36px;letter-spacing:0.03em;color:#FFFFFF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(
      d.business
    )}</div>` +
    (d.tagline
      ? `<div style="margin-top:4px;font-size:13px;line-height:18px;color:#FFFFFF;opacity:0.88;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(
          d.tagline
        )}</div>`
      : "") +
    `</div>${mark}</div>`;
  const bottomLines = [join([d.address, d.phone && `Mob. ${d.phone}`]), join([d.email, d.gst && `GST No. ${d.gst}`, d.pan && `PAN ${d.pan}`])];
  const bottom = bottomLines.some(Boolean)
    ? `<div class="lh-layer" style="left:0;right:0;bottom:0;height:50px;box-sizing:border-box;padding:0 48px;background:${c.pale};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-family:${font};font-size:11.5px;line-height:16px;color:#2B2622">${lines(
        bottomLines
      )}</div>`
    : "";
  const strip =
    `<div style="margin:-28px -48px 0;height:52px;box-sizing:border-box;padding:0 48px;background:${c.accent};display:flex;align-items:center;justify-content:space-between;gap:24px">` +
    `<div style="min-width:0;font-size:17px;font-weight:700;line-height:22px;letter-spacing:0.03em;color:#FFFFFF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(
      d.business
    )}</div>` +
    `<div style="flex-shrink:0;text-align:right;font-size:11.5px;line-height:16px;color:#FFFFFF">${lines([d.phone, d.email])}</div>` +
    `</div>`;
  return {
    firstLayers: top + bottom,
    restLayers: bottom,
    firstTop: 152,
    restStrip: strip,
    restPad: 28,
    restTop: 52,
    footBottom: bottom ? 64 : 30,
  };
};

const minimal = ({ d, c, elegant, assets }: TemplateInput): TemplateParts => {
  const font = detailFont(elegant);
  const size = fit(d.business, 24, 380, 0.56, 16);
  const header =
    `<div style="position:absolute;left:48px;right:48px;top:42px">` +
    `<div style="display:flex;justify-content:space-between;align-items:center;gap:24px">` +
    `<div style="display:flex;align-items:center;gap:12px;min-width:0">` +
    (assets.logo ? `<div class="lh-logo" style="width:60px;height:30px;flex-shrink:0;background-position:left center"></div>` : "") +
    `<div style="font-size:${size}px;font-weight:700;line-height:30px;letter-spacing:-0.01em;color:${c.accent};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(
      d.business
    )}</div></div>` +
    `<div style="flex-shrink:0;font-family:${font};font-size:12px;line-height:18px;color:#3C3831;text-align:right">${lines([join([d.phone, d.email])])}</div>` +
    `</div>` +
    `<div style="display:flex;justify-content:space-between;gap:24px;margin-top:2px;font-family:${font};font-size:12px;line-height:18px;color:#5C574F">` +
    `<div style="min-width:0">${lines([d.address || d.tagline])}</div>` +
    `<div style="flex-shrink:0;text-align:right">${lines([join([d.gst && `GST ${d.gst}`, d.pan && `PAN ${d.pan}`])])}</div>` +
    `</div>` +
    `<div style="margin-top:12px;height:1px;background:${c.accent}"></div>` +
    `</div>`;
  const strip =
    `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:24px">` +
    `<div style="min-width:0;font-size:17px;font-weight:700;line-height:22px;color:${c.accent};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(
      d.business
    )}</div>` +
    `<div style="flex-shrink:0;font-family:${font};font-size:11.5px;line-height:16px;color:#3C3831">${escapeHtml(join([d.phone, d.email]))}</div>` +
    `</div><div style="height:1px;margin-top:10px;background:${c.accent}"></div>`;
  return {
    firstLayers: header,
    restLayers: "",
    firstTop: 134,
    restStrip: strip,
    restPad: 28,
    restTop: 61,
    footBottom: 30,
  };
};

const TEMPLATES = { monogram, classic, modern, band, minimal } as const;

/** The uploaded image across the page: the whole page, or the strip at its natural height. */
const uploadLayer = (design: LetterheadDesign) => {
  const image = design.upload.image!;
  if (design.upload.kind === "page") {
    return `<div class="lh-layer lh-image" style="left:0;top:0;width:${PAGE_WIDTH}px;height:${PAGE_HEIGHT}px;background-size:100% 100%"></div>`;
  }
  const height = Math.round((PAGE_WIDTH * image.height) / image.width);
  return `<div class="lh-layer lh-image" style="left:0;top:0;width:${PAGE_WIDTH}px;height:${height}px;background-size:100% auto"></div>`;
};

/** Where a document's letterhead goes, page by page. */
export const letterheadFrame = (
  design: LetterheadDesign,
  details: Letterhead,
  assets: LetterheadAssets
): LetterheadFrame => {
  const style = effectiveStyle(design, details);
  if (style === "make") {
    const parts = TEMPLATES[design.template]({
      d: details,
      c: colourById(design.colour),
      elegant: design.elegant,
      assets,
    });
    return { style, ...parts };
  }
  if (style === "upload" && assets.image) {
    const layer = uploadLayer(design);
    const top = mmToPx(design.upload.top);
    const bottom = design.upload.kind === "page" ? mmToPx(design.upload.bottom) + 4 : 30;
    return {
      style,
      firstLayers: layer,
      restLayers: layer,
      firstTop: top,
      restStrip: "",
      restPad: top,
      restTop: top,
      footBottom: bottom,
    };
  }
  if (style === "printed") {
    const top = Math.max(40, mmToPx(design.printed.top));
    const bottom = Math.max(30, mmToPx(design.printed.bottom) + 4);
    return {
      style,
      firstLayers: "",
      restLayers: "",
      firstTop: top,
      restStrip: "",
      restPad: top,
      restTop: top,
      footBottom: bottom,
    };
  }
  return {
    style: style === "upload" ? "none" : style,
    firstLayers: "",
    restLayers: "",
    firstTop: 52,
    restStrip: "",
    restPad: 52,
    restTop: 52,
    footBottom: 30,
  };
};

/** The uploaded image's own letterhead, shrunk to `height` px, for a form or a receipt. */
const imageThumb = (design: LetterheadDesign, height: number) => {
  const image = design.upload.image!;
  const headerHeight =
    design.upload.kind === "page"
      ? mmToPx(design.upload.top)
      : Math.round((PAGE_WIDTH * image.height) / image.width);
  const scale = height / Math.max(1, headerHeight);
  const width = Math.min(PAGE_WIDTH - 96, Math.round(PAGE_WIDTH * scale));
  const backgroundHeight = design.upload.kind === "page" ? Math.round(PAGE_HEIGHT * scale) : height;
  return `<div class="lh-image" style="width:${width}px;height:${height}px;background-size:${Math.round(
    PAGE_WIDTH * scale
  )}px ${backgroundHeight}px;background-position:0 0"></div>`;
};

/**
 * The small letterhead at the top of a form (rent card, handover), in the
 * flow, or null when the form keeps its own header with lines for the
 * business and phone.
 */
export const formStrip = (
  design: LetterheadDesign,
  details: Letterhead,
  assets: LetterheadAssets
): { html: string; pad: number } | null => {
  const style = effectiveStyle(design, details);
  if (style === "make") {
    const frame = letterheadFrame(design, details, assets);
    return { html: frame.restStrip, pad: frame.restPad };
  }
  if (style === "upload" && assets.image) {
    return {
      html: `${imageThumb(design, 56)}<div style="height:1px;margin-top:8px;background:#D9D5CC"></div>`,
      pad: 28,
    };
  }
  return null;
};

/**
 * The small letterhead across the top of a receipt's customer side, or null
 * when the receipt keeps its "From ___ Phone ___" line.
 */
export const receiptMark = (
  design: LetterheadDesign,
  details: Letterhead,
  assets: LetterheadAssets
): string | null => {
  const style = effectiveStyle(design, details);
  if (style === "upload" && assets.image) {
    return `<div style="height:30px;flex-shrink:0;display:flex;align-items:center;padding-bottom:3px;border-bottom:1px solid #D9D5CC">${imageThumb(
      design,
      26
    )}</div>`;
  }
  if (style !== "make") return null;
  const c = colourById(design.colour);
  const initials = initialsOf(details.business);
  const serifInitials = design.template === "monogram" || design.template === "classic";
  const mark = assets.logo
    ? `<div class="lh-logo" style="width:44px;height:24px;flex-shrink:0;background-position:left center"></div>`
    : serifInitials
      ? `<span style="font-family:${DISPLAY};font-size:26px;line-height:1;color:${design.template === "monogram" ? c.tint : c.accent}">${escapeHtml(initials)}</span>`
      : `<span style="font-size:15px;font-weight:700;line-height:20px;color:${c.accent}">${escapeHtml(initials)}</span>`;
  return (
    `<div style="height:30px;flex-shrink:0;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:3px;border-bottom:1px solid ${c.tint}">` +
    `<div style="display:flex;align-items:center;gap:8px;min-width:0">${mark}<span style="font-size:11.5px;font-weight:600;line-height:16px;letter-spacing:0.06em;color:#2B2622;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(
      details.business.toUpperCase()
    )}</span></div>` +
    (details.phone
      ? `<div style="flex-shrink:0;font-family:${detailFont(design.elegant)};font-size:11px;line-height:14px;color:#4A443D">Mob. ${escapeHtml(details.phone)}</div>`
      : "") +
    `</div>`
  );
};