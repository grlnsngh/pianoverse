import {
  colourById,
  effectiveStyle,
  initialsOf,
  mmToPx,
  printedPicture,
  type Letterhead,
  type LetterheadColour,
  type LetterheadDesign,
  type LetterheadTemplate,
  type PicturePlace,
  type PrintedLetterhead,
} from "../letterhead";
import { escapeHtml, PAGE_HEIGHT, PAGE_WIDTH } from "./html";
import { LETTERHEAD_PIANO } from "./letterheadPiano";

/**
 * The letterheads printed on the paper forms (canvas page "Letterhead"): the
 * five designs of "Make one", the business's own image, the space left for a
 * printed pad, and none. A page gets the full letterhead on its first page
 * and the small one after that; the rent card, receipts and handover form get
 * the small one too. Everything is drawn in HTML for expo-print, black on
 * white plus the chosen colour; images are put in the document once, as CSS.
 *
 * A made letterhead can have a picture (Batch 47), like the grand piano at the
 * top right of the owner's TPS letterhead: beside the header at the right or
 * the left, at the size and strength chosen, or faint behind the writing on
 * every page. Its small version goes in the small letterhead and on receipts.
 */

/** The images of the letterhead, as data: addresses, when there are any. */
export type LetterheadAssets = { logo: string | null; image: string | null; picture?: string | null };
export const NO_ASSETS: LetterheadAssets = { logo: null, image: null, picture: null };

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
  (assets.image ? `.lh-image{background-image:url(${assets.image});background-repeat:no-repeat}` : "") +
  (assets.picture ? `.lh-pic{background:url(${assets.picture}) center/contain no-repeat}` : "");

/** The picture's own data: address: the grand piano that comes with the app, or null for the person's own. */
export const builtInPicture = (design: LetterheadDesign): string | null =>
  printedPicture(design)?.source === "piano" ? LETTERHEAD_PIANO.uri : null;

/** A picture to draw: where it goes, how strongly, its shape and how big. */
type Pic = { place: PicturePlace; opacity: number; ratio: number; scale: number };

/** The design's picture, when it has one and its image could be read. */
const pictureOf = (design: LetterheadDesign, assets: LetterheadAssets): Pic | null => {
  const picture = printedPicture(design);
  if (!picture || !assets.picture) return null;
  const size = picture.source === "piano" ? LETTERHEAD_PIANO : picture.image;
  if (!size) return null;
  return {
    place: picture.place,
    opacity: picture.strength / 100,
    ratio: size.width / size.height,
    scale: picture.size / 100,
  };
};

/** The space between a picture and the words beside it. */
const PIC_GAP = 24;

/** How tall each design's picture is on page 1 at 100%, to sit beside its header. */
const PIC_HEIGHT: Record<LetterheadTemplate, number> = { monogram: 136, classic: 140, modern: 104, band: 96, minimal: 76 };

/** A picture's box at most `height` px tall and `maxWidth` wide, keeping its shape. */
const picBox = (pic: Pic, height: number, maxWidth: number) => {
  let h = Math.round(height);
  let w = Math.round(h * pic.ratio);
  if (w > maxWidth) {
    w = Math.round(maxWidth);
    h = Math.round(w / pic.ratio);
  }
  return { w, h };
};

/** The picture beside the header on page 1, scaled by the chosen size. */
const sidePicture = (pic: Pic | null, template: LetterheadTemplate) =>
  pic ? picBox(pic, PIC_HEIGHT[template] * pic.scale, 260 * pic.scale) : null;

/** The picture drawn `w` by `h` px, paler when its strength is under 100%. */
const picDiv = (pic: Pic, w: number, h: number, style = "") =>
  `<div class="lh-pic" style="width:${w}px;height:${h}px;flex-shrink:0${
    pic.opacity < 1 ? `;opacity:${pic.opacity}` : ""
  }${style ? ";" + style : ""}"></div>`;

/**
 * The picture faint behind the writing, in the middle of every page. It is
 * laid over the page and multiplied with it, so it shows through the white
 * tables as evenly as through the paper, and black writing stays black.
 */
const behindLayer = (pic: Pic) => {
  const { w, h } = picBox(pic, Math.min(860, (520 * pic.scale) / pic.ratio), Math.min(698, 520 * pic.scale));
  return `<div class="lh-pic" style="position:absolute;z-index:1;pointer-events:none;mix-blend-mode:multiply;left:${Math.round(
    (PAGE_WIDTH - w) / 2
  )}px;top:${Math.round((PAGE_HEIGHT - h) / 2)}px;width:${w}px;height:${h}px;opacity:${pic.opacity}"></div>`;
};

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
  /** The picture beside the header, if it goes there */
  pic: Pic | null;
  /** Monogram's initials behind the page (not when the picture is behind it) */
  watermark: boolean;
};

type TemplateParts = Omit<LetterheadFrame, "style">;

const monogram = ({ d, c, elegant, assets, pic, watermark }: TemplateInput): TemplateParts => {
  const initials = escapeHtml(initialsOf(d.business));
  const name = escapeHtml(d.business.toUpperCase());
  const font = detailFont(elegant);
  // The picture beside the header, like the grand piano at the top right of TPS 2
  const box = sidePicture(pic, "monogram");
  const reserve = box ? box.w + PIC_GAP : 0;
  const left = 48 + (pic?.place === "left" ? reserve : 0);
  const right = 48 + (pic?.place === "right" ? reserve : 0);
  const nameRight = assets.logo ? 150 : 0;
  const size = fit(d.business, 34, 698 - reserve - nameRight, 0.72, 18);
  // The details in two columns: what the business is and how to reach it on the
  // left; its GST, PAN and e-mail on the right, under the picture when it is there
  const leftLines = [d.tagline, d.address, d.phone && `Mob.: ${d.phone}`];
  const rightLines = [d.gst && `GST No. ${d.gst}`, d.pan && `PAN No. ${d.pan}`, d.email && `E-mail: ${d.email}`];
  const height = (items: (string | false)[]) => items.filter(Boolean).length * 18;
  const under = pic?.place === "left" ? height(leftLines) : height(rightLines);
  const rowBottom = Math.max(214, box ? 26 + box.h + 8 + under : 0);
  const rowHeight = Math.max(height(leftLines), height(rightLines));
  const lineTop = rowBottom + 8;
  const mark = watermark
    ? `<div class="lh-layer" style="right:-14px;bottom:52px;font-family:${DISPLAY};font-size:300px;line-height:1;letter-spacing:-0.02em;color:${c.tint};opacity:0.4">${initials}</div>`
    : "";
  const header =
    `<div style="position:absolute;left:${left}px;right:${right}px;top:26px;height:196px">` +
    `<div style="position:absolute;left:-4px;top:0;font-family:${DISPLAY};font-size:118px;line-height:1;letter-spacing:0.01em;color:${c.tint}">${initials}</div>` +
    `<div style="position:absolute;left:4px;right:${nameRight}px;top:60px;font-size:${size}px;font-weight:600;line-height:40px;letter-spacing:0.06em;color:#2B2622;white-space:nowrap;overflow:hidden">${name}</div>` +
    (assets.logo ? `<div class="lh-logo" style="position:absolute;right:0;top:4px;width:132px;height:88px"></div>` : "") +
    `</div>` +
    `<div style="position:absolute;left:52px;right:48px;top:${rowBottom - rowHeight}px;height:${rowHeight}px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px;font-family:${font};font-size:12.5px;line-height:18px;color:#4A443D">` +
    `<div style="min-width:0">${lines(leftLines)}</div>` +
    `<div style="flex-shrink:0;text-align:right">${lines(rightLines)}</div>` +
    `</div>` +
    (box && pic ? picDiv(pic, box.w, box.h, `position:absolute;${pic.place}:48px;top:26px`) : "") +
    `<div style="position:absolute;left:48px;right:48px;top:${lineTop}px;height:1px;background:${c.tint}"></div>`;
  const overlap = Math.round(initialsOf(d.business).length * 10);
  const small = pic ? picBox(pic, 52, 120) : null;
  const smallPic = small && pic ? picDiv(pic, small.w, small.h) : "";
  const strip =
    `<div style="display:flex;align-items:center;gap:24px;height:52px">` +
    (pic?.place === "left" ? smallPic : "") +
    `<div style="flex:1;display:flex;align-items:center;min-width:0"><span style="font-family:${DISPLAY};font-size:42px;line-height:1;color:${c.tint}">${initials}</span>` +
    `<span style="margin-left:-${overlap}px;font-size:15px;font-weight:600;line-height:20px;letter-spacing:0.08em;color:#2B2622;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</span></div>` +
    `<div style="flex-shrink:0;text-align:right;font-family:${font};font-size:11.5px;line-height:16px;color:#4A443D">${lines([d.phone && `Mob. ${d.phone}`, d.email])}</div>` +
    (pic?.place === "right" ? smallPic : "") +
    `</div><div style="height:1px;margin-top:8px;background:${c.tint}"></div>`;
  return {
    firstLayers: mark + header,
    restLayers: mark,
    firstTop: lineTop + 18,
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

const classic = ({ d, c, elegant, assets, pic }: TemplateInput): TemplateParts => {
  const font = detailFont(elegant);
  const name = escapeHtml(d.business);
  // The picture at one side; the words stay in the middle, between equal spaces
  const box = sidePicture(pic, "classic");
  const reserve = box ? box.w + PIC_GAP : 0;
  const size = fit(d.business, 30, 698 - reserve * 2, 0.52, 18);
  const contactLines = box
    ? // Narrower beside a picture: the contacts on two lines rather than cut off
      [d.address, join([d.phone && `Mob. ${d.phone}`, d.email]), join([d.gst && `GST No. ${d.gst}`, d.pan && `PAN ${d.pan}`])]
    : [d.address, join([d.phone && `Mob. ${d.phone}`, d.email, d.gst && `GST No. ${d.gst}`, d.pan && `PAN ${d.pan}`])];
  // The double rule runs the full width, under the picture too
  const ruleSide = reserve ? `margin-left:-${reserve}px;margin-right:-${reserve}px;` : "";
  // Beside a picture the tagline may take two lines rather than be cut off
  const taglineLines = d.tagline ? (box ? Math.min(2, Math.ceil((d.tagline.length * 8.4) / (698 - reserve * 2))) : 1) : 0;
  const natural = 46 + 8 + 36 + (taglineLines ? 2 + 16 * taglineLines : 0) + 8 + 18 * contactLines.filter(Boolean).length + 16;
  const header =
    `<div style="position:absolute;left:${48 + reserve}px;right:${48 + reserve}px;top:30px;display:flex;flex-direction:column;align-items:center;text-align:center${
      box ? `;min-height:${box.h + 16}px` : ""
    }">` +
    (assets.logo ? `<div class="lh-logo" style="width:72px;height:46px"></div>` : ring(initialsOf(d.business), c.accent)) +
    `<div style="max-width:100%;margin-top:8px;font-family:${DISPLAY};font-size:${size}px;font-weight:500;line-height:36px;letter-spacing:0.01em;white-space:nowrap;overflow:hidden">${name}</div>` +
    (d.tagline
      ? `<div style="max-width:100%;margin-top:2px;font-size:10.5px;font-weight:600;line-height:16px;letter-spacing:0.18em;text-transform:uppercase;color:${c.accent};${
          taglineLines > 1
            ? "display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden"
            : "white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
        }">${escapeHtml(d.tagline)}</div>`
      : "") +
    `<div style="max-width:100%;margin-top:8px;font-family:${font};font-size:12px;line-height:18px;color:#4A443D">${lines(contactLines)}</div>` +
    (box ? `<div style="flex-grow:1"></div>` : "") +
    `<div style="align-self:stretch;${ruleSide}margin-top:10px;height:2px;background:${c.accent}"></div>` +
    `<div style="align-self:stretch;${ruleSide}margin-top:3px;height:1px;background:${c.accent}"></div>` +
    `</div>` +
    (box && pic ? picDiv(pic, box.w, box.h, `position:absolute;${pic.place}:48px;top:30px`) : "");
  const small = pic ? picBox(pic, 44, 110) : null;
  const smallReserve = small ? small.w + 16 : 0;
  const smallRule = smallReserve ? `margin-left:-${smallReserve}px;margin-right:-${smallReserve}px;` : "";
  const strip =
    `<div style="position:relative;text-align:center${smallReserve ? `;padding:0 ${smallReserve}px` : ""}">` +
    (small && pic ? picDiv(pic, small.w, small.h, `position:absolute;${pic.place}:0;top:0`) : "") +
    `<div style="font-family:${DISPLAY};font-size:20px;font-weight:500;line-height:26px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>` +
    `<div style="font-family:${font};font-size:11.5px;line-height:16px;color:#4A443D">${lines([join([d.phone && `Mob. ${d.phone}`, d.email])])}</div>` +
    `<div style="height:2px;${smallRule}margin-top:8px;background:${c.accent}"></div><div style="height:1px;${smallRule}margin-top:2px;background:${c.accent}"></div>` +
    `</div>`;
  return {
    firstLayers: header,
    restLayers: "",
    firstTop: Math.max(236, box ? 30 + Math.max(natural, box.h + 16) + 38 : 0),
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

const modern = ({ d, c, elegant, assets, pic }: TemplateInput): TemplateParts => {
  const font = detailFont(elegant);
  const initials = initialsOf(d.business);
  const box = sidePicture(pic, "modern");
  const reserve = box ? box.w + PIC_GAP : 0;
  const size = fit(d.business, 27, Math.max(200, 380 - reserve), 0.56, 18);
  const side = box && pic ? picDiv(pic, box.w, box.h) : "";
  const lineTop = Math.max(132, box ? 40 + box.h + 12 : 0);
  const header =
    `<div style="position:absolute;left:0;right:0;top:0;height:10px;background:${c.accent}"></div>` +
    `<div style="position:absolute;left:48px;right:48px;top:40px;display:flex;align-items:flex-start;gap:24px">` +
    (pic?.place === "left" ? side : "") +
    `<div style="flex:1;display:flex;gap:16px;align-items:flex-start;min-width:0">${tile(68, 14, c, initials, !!assets.logo)}` +
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
    `</div>` +
    (pic?.place === "right" ? side : "") +
    `</div>` +
    `<div style="position:absolute;left:48px;right:48px;top:${lineTop}px;height:1px;background:#D9D5CC"></div>`;
  const small = pic ? picBox(pic, 38, 110) : null;
  const smallPic = small && pic ? picDiv(pic, small.w, small.h) : "";
  const strip =
    `<div style="margin:-28px -48px 0;height:6px;background:${c.accent}"></div>` +
    `<div style="display:flex;align-items:center;gap:24px;margin-top:14px">` +
    (pic?.place === "left" ? smallPic : "") +
    `<div style="flex:1;display:flex;align-items:center;gap:12px;min-width:0">${tile(38, 9, c, initials, !!assets.logo)}` +
    `<div style="font-size:18px;font-weight:700;line-height:24px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(
      d.business
    )}</div></div>` +
    `<div style="flex-shrink:0;text-align:right;font-family:${font};font-size:11.5px;line-height:16px;color:#3C3831">${labelled(
      "Mob",
      d.phone,
      c
    )}${labelled("Email", d.email, c)}</div>` +
    (pic?.place === "right" ? smallPic : "") +
    `</div><div style="height:1px;margin-top:10px;background:#D9D5CC"></div>`;
  return {
    firstLayers: header,
    restLayers: "",
    firstTop: lineTop + 20,
    restStrip: strip,
    restPad: 28,
    restTop: 69,
    footBottom: 30,
  };
};

/** The picture on a white card, so a photo sits cleanly on the coloured band. */
const card = (pic: Pic, w: number, h: number, padding: number, radius: number) =>
  `<div style="flex-shrink:0;padding:${padding}px;border-radius:${radius}px;background:#FFFFFF">${picDiv(pic, w, h, "display:block")}</div>`;

const band = ({ d, c, elegant, assets, pic }: TemplateInput): TemplateParts => {
  const font = detailFont(elegant);
  const initials = initialsOf(d.business);
  const box = sidePicture(pic, "band");
  const reserve = box ? box.w + 16 + PIC_GAP : 0;
  const size = fit(d.business, 30, Math.max(240, 560 - reserve), 0.6, 18);
  const side = box && pic ? card(pic, box.w, box.h, 8, 10) : "";
  // The band grows to hold a big picture
  const bandHeight = Math.max(128, box ? box.h + 16 + 24 : 0);
  const mark = assets.logo
    ? `<div style="width:76px;height:76px;flex-shrink:0;box-sizing:border-box;padding:12px;border-radius:50%;background:#FFFFFF"><div class="lh-logo" style="width:100%;height:100%"></div></div>`
    : `<div style="width:76px;height:76px;flex-shrink:0;border-radius:50%;background:#FFFFFF;display:flex;align-items:center;justify-content:center;font-size:${
        initials.length > 2 ? 22 : 26
      }px;font-weight:700;color:${c.accent}">${escapeHtml(initials)}</div>`;
  const top =
    `<div style="position:absolute;left:0;right:0;top:0;height:${bandHeight}px;box-sizing:border-box;padding:0 48px;background:${c.accent};display:flex;align-items:center;gap:24px">` +
    (pic?.place === "left" ? side : "") +
    `<div style="flex:1;min-width:0"><div style="font-size:${size}px;font-weight:700;line-height:36px;letter-spacing:0.03em;color:#FFFFFF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(
      d.business
    )}</div>` +
    (d.tagline
      ? `<div style="margin-top:4px;font-size:13px;line-height:18px;color:#FFFFFF;opacity:0.88;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(
          d.tagline
        )}</div>`
      : "") +
    `</div>${mark}` +
    (pic?.place === "right" ? side : "") +
    `</div>`;
  const bottomLines = [join([d.address, d.phone && `Mob. ${d.phone}`]), join([d.email, d.gst && `GST No. ${d.gst}`, d.pan && `PAN ${d.pan}`])];
  const bottom = bottomLines.some(Boolean)
    ? `<div class="lh-layer" style="left:0;right:0;bottom:0;height:50px;box-sizing:border-box;padding:0 48px;background:${c.pale};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-family:${font};font-size:11.5px;line-height:16px;color:#2B2622">${lines(
        bottomLines
      )}</div>`
    : "";
  const small = pic ? picBox(pic, 36, 100) : null;
  const smallPic = small && pic ? card(pic, small.w, small.h, 4, 6) : "";
  const strip =
    `<div style="margin:-28px -48px 0;height:52px;box-sizing:border-box;padding:0 48px;background:${c.accent};display:flex;align-items:center;gap:24px">` +
    (pic?.place === "left" ? smallPic : "") +
    `<div style="flex:1;min-width:0;font-size:17px;font-weight:700;line-height:22px;letter-spacing:0.03em;color:#FFFFFF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(
      d.business
    )}</div>` +
    `<div style="flex-shrink:0;text-align:right;font-size:11.5px;line-height:16px;color:#FFFFFF">${lines([d.phone, d.email])}</div>` +
    (pic?.place === "right" ? smallPic : "") +
    `</div>`;
  return {
    firstLayers: top + bottom,
    restLayers: bottom,
    firstTop: bandHeight + 24,
    restStrip: strip,
    restPad: 28,
    restTop: 52,
    footBottom: bottom ? 64 : 30,
  };
};

const minimal = ({ d, c, elegant, assets, pic }: TemplateInput): TemplateParts => {
  const font = detailFont(elegant);
  const box = sidePicture(pic, "minimal");
  const reserve = box ? box.w + PIC_GAP : 0;
  const size = fit(d.business, 24, Math.max(200, 380 - reserve), 0.56, 16);
  // The rule runs the full width, under the picture too
  const ruleSide = pic && reserve ? `margin-${pic.place}:-${reserve}px;` : "";
  const header =
    `<div style="position:absolute;left:${48 + (pic?.place === "left" ? reserve : 0)}px;right:${
      48 + (pic?.place === "right" ? reserve : 0)
    }px;top:42px${box ? `;display:flex;flex-direction:column;min-height:${box.h + 13}px` : ""}">` +
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
    (box ? `<div style="flex-grow:1"></div>` : "") +
    `<div style="${ruleSide}margin-top:12px;height:1px;background:${c.accent}"></div>` +
    `</div>` +
    (box && pic ? picDiv(pic, box.w, box.h, `position:absolute;${pic.place}:48px;top:42px`) : "");
  const small = pic ? picBox(pic, 34, 100) : null;
  const smallPic = small && pic ? picDiv(pic, small.w, small.h) : "";
  const strip =
    `<div style="display:flex;align-items:${pic ? "center" : "baseline"};gap:24px">` +
    (pic?.place === "left" ? smallPic : "") +
    `<div style="flex:1;min-width:0;font-size:17px;font-weight:700;line-height:22px;color:${c.accent};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(
      d.business
    )}</div>` +
    `<div style="flex-shrink:0;font-family:${font};font-size:11.5px;line-height:16px;color:#3C3831">${escapeHtml(join([d.phone, d.email]))}</div>` +
    (pic?.place === "right" ? smallPic : "") +
    `</div><div style="height:1px;margin-top:10px;background:${c.accent}"></div>`;
  return {
    firstLayers: header,
    restLayers: "",
    firstTop: Math.max(134, box ? 42 + box.h + 13 + 29 : 0),
    restStrip: strip,
    // A picture makes the small letterhead taller
    restPad: 28,
    restTop: small ? 28 + Math.max(22, small.h) + 11 : 61,
    footBottom: 30,
  };
};

const TEMPLATES = { monogram, classic, modern, band, minimal } as const;

/** How strongly the uploaded image prints, as CSS. */
const uploadOpacity = (design: LetterheadDesign) =>
  design.upload.strength < 100 ? `;opacity:${design.upload.strength / 100}` : "";

/**
 * The uploaded image across the page, as wide as the page and never stretched
 * out of shape: a whole A4 page fills it, a picture that isn't A4 keeps its
 * own shape from the top; the strip at its natural height.
 */
const uploadLayer = (design: LetterheadDesign) => {
  const image = design.upload.image!;
  const height =
    design.upload.kind === "page"
      ? PAGE_HEIGHT
      : Math.round((PAGE_WIDTH * image.height) / image.width);
  return `<div class="lh-layer lh-image" style="left:0;top:0;width:${PAGE_WIDTH}px;height:${height}px;background-size:100% auto;background-position:top center${uploadOpacity(
    design
  )}"></div>`;
};

/** Where a document's letterhead goes, page by page. */
export const letterheadFrame = (
  design: LetterheadDesign,
  details: Letterhead,
  assets: LetterheadAssets
): LetterheadFrame => {
  const style = effectiveStyle(design, details);
  if (style === "make") {
    const pic = pictureOf(design, assets);
    const behind = pic?.place === "behind" ? behindLayer(pic) : "";
    const parts = TEMPLATES[design.template]({
      d: details,
      c: colourById(design.colour),
      elegant: design.elegant,
      assets,
      pic: pic && !behind ? pic : null,
      watermark: !behind,
    });
    return {
      style,
      ...parts,
      firstLayers: behind + parts.firstLayers,
      restLayers: behind + parts.restLayers,
    };
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
  const naturalHeight = Math.round((PAGE_WIDTH * image.height) / image.width);
  const headerHeight = design.upload.kind === "page" ? mmToPx(design.upload.top) : naturalHeight;
  const scale = height / Math.max(1, headerHeight);
  const width = Math.min(PAGE_WIDTH - 96, Math.round(PAGE_WIDTH * scale));
  return `<div class="lh-image" style="width:${width}px;height:${height}px;background-size:${Math.round(
    PAGE_WIDTH * scale
  )}px ${Math.round(naturalHeight * scale)}px;background-position:0 0${uploadOpacity(design)}"></div>`;
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
    // A picture behind the writing goes behind the form too
    const pic = pictureOf(design, assets);
    const behind = pic?.place === "behind" ? behindLayer(pic) : "";
    return { html: behind + frame.restStrip, pad: frame.restPad };
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
  // The picture, small, at its side of the receipt (none when it is behind the writing)
  const pic = pictureOf(design, assets);
  const side = pic && pic.place !== "behind" ? pic : null;
  const small = side ? picBox(side, 26, 70) : null;
  const smallPic = small && side ? picDiv(side, small.w, small.h) : "";
  const serifInitials = design.template === "monogram" || design.template === "classic";
  const mark = assets.logo
    ? `<div class="lh-logo" style="width:44px;height:24px;flex-shrink:0;background-position:left center"></div>`
    : serifInitials
      ? `<span style="font-family:${DISPLAY};font-size:26px;line-height:1;color:${design.template === "monogram" ? c.tint : c.accent}">${escapeHtml(initials)}</span>`
      : `<span style="font-size:15px;font-weight:700;line-height:20px;color:${c.accent}">${escapeHtml(initials)}</span>`;
  return (
    `<div style="height:30px;flex-shrink:0;box-sizing:border-box;display:flex;align-items:center;gap:12px;padding-bottom:3px;border-bottom:1px solid ${c.tint}">` +
    (side?.place === "left" ? smallPic : "") +
    `<div style="flex:1;display:flex;align-items:center;gap:8px;min-width:0">${mark}<span style="font-size:11.5px;font-weight:600;line-height:16px;letter-spacing:0.06em;color:#2B2622;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(
      details.business.toUpperCase()
    )}</span></div>` +
    (details.phone
      ? `<div style="flex-shrink:0;font-family:${detailFont(design.elegant)};font-size:11px;line-height:14px;color:#4A443D">Mob. ${escapeHtml(details.phone)}</div>`
      : "") +
    (side?.place === "right" ? smallPic : "") +
    `</div>`
  );
};