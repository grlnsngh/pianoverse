import { colourById, DEFAULT_DESIGN, type Letterhead, type LetterheadDesign } from "../letterhead";
import { HOTEL_TERMS, PRIVATE_TERMS } from "./agreementTerms";
import { AGREEMENTS, clampCount, type AgreementKind } from "./catalog";
import { lineCount, textWidth } from "./figtreeWidths";
import { checkBox, escapeHtml, framedPage, PAGE_HEIGHT, paperDocument, repeatPages } from "./html";
import {
  letterheadCss,
  letterheadFrame,
  NO_ASSETS,
  type LetterheadAssets,
  type LetterheadFrame,
} from "./letterheads";

/**
 * The two rental agreements (boards AgreementHotel1 and 2, AgreementPrivate1
 * and 2, and the Letterhead page). The letterhead is the business's own (see
 * letterheads.ts): the full one on page 1, the small one after. Everything
 * about the client, the piano and the money is written by hand. The terms
 * come from agreementTerms.ts.
 *
 * The pages fill themselves: each part of the agreement has a known height,
 * a paragraph of terms is measured by its length, and a part that doesn't
 * fit goes to the next page. So a tall letterhead or longer terms make a
 * third page rather than cutting anything off.
 */

/** Old terms may still say where page 2 starts; the pages are filled by themselves now. */
const PAGE_BREAK = /^\s*---\s*page \d+\s*---\s*$/gim;

/** Terms are 14 px Figtree across the page's 698 px, a few px kept back so a line is never thought to fit when it doesn't. */
const TERMS_SIZE = 14;
const TERMS_WIDTH = 694;
const LINE_HEIGHT = 21;
/** The footer line and the space kept above it */
const FOOT_SPACE = 16 + 10;

/** A line to write on, inside a sentence. */
const blank = (width = 120) => `<span class="ag-blank" style="width:${width}px"></span>`;

/** The business name inside a sentence, or a line to write it on. */
const businessInline = (letterhead: Letterhead) =>
  letterhead.business ? escapeHtml(letterhead.business) : blank(160);

/** One paragraph of terms from its plain text (see agreementTerms.ts). */
const termParagraph = (text: string, letterhead: Letterhead) =>
  escapeHtml(text.replace(/\s*\n\s*/g, " ").trim())
    .replace(/^\*\*(.+?)\*\*/, "<b>$1</b>")
    .replace(/\{business\}/g, businessInline(letterhead))
    .replace(/\{blank(?: (\d+))?\}/g, (_, width?: string) => blank(width ? Number(width) : undefined));

/** The paragraphs of the terms, as plain text. */
const termTexts = (terms: string) =>
  terms
    .replace(PAGE_BREAK, "")
    .split(/\n\s*\n/)
    .map((text) => text.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

/** The terms as HTML paragraphs, in order. */
export const termParagraphs = (terms: string, letterhead: Letterhead): string[] =>
  termTexts(terms).map((text) => termParagraph(text, letterhead));

/** A write-in line inside a paragraph, while it is being measured. */
const BLANK_MARK = /\u0000(\d+)\u0000/g;

/**
 * Letters set side by side come out a little narrower than their widths
 * added up, because the font tucks some pairs closer (kerning): about 1 to 2%
 * in these terms, measured in Chromium.
 */
const KERNING = 0.985;

/** The width of one unbreakable word of a paragraph, write-in lines included. */
const wordWidth = (word: string, bold: boolean) => {
  let width = 0;
  const text = word.replace(BLANK_MARK, (_, px: string) => {
    width += Number(px);
    return "";
  });
  return width + textWidth(text, TERMS_SIZE, bold) * KERNING;
};

/**
 * How many lines a paragraph of terms takes on paper: its bold title and its
 * words (the business name and write-in lines among them) wrapped across the
 * page the way the browser wraps them.
 */
export const paragraphLines = (text: string, letterhead: Letterhead): number => {
  const plain = text
    .replace(/\{business\}/g, letterhead.business || "\u0000160\u0000")
    .replace(/\{blank(?: (\d+))?\}/g, (_, width?: string) => `\u0000${width ?? 120}\u0000`);
  const title = plain.match(/^\*\*(.+?)\*\*/);
  const rest = title ? plain.slice(title[0].length) : plain;
  const words = [
    ...(title ? title[1].split(/\s+/).filter(Boolean).map((word) => wordWidth(word, true)) : []),
    ...rest.split(/\s+/).filter(Boolean).map((word) => wordWidth(word, false)),
  ];
  return lineCount(words, TERMS_WIDTH, textWidth(" ", TERMS_SIZE));
};

/** The height a paragraph of terms takes, with the space above it. */
export const paragraphHeight = (text: string, letterhead: Letterhead, first: boolean): number =>
  (first ? 4 : 8) + paragraphLines(text, letterhead) * LINE_HEIGHT;

const AG_CSS =
  "<style>" +
  ".ag-b{display:flow-root}" +
  ".ag-head{display:flex;justify-content:space-between;gap:24px;padding-bottom:12px;border-bottom:2px solid #1A1814}" +
  ".ag-name{font-size:26px;font-weight:700;line-height:32px;letter-spacing:-0.01em}" +
  ".ag-small{font-size:12px;line-height:17px;color:#3C3831}" +
  ".ag-ids{flex-shrink:0;text-align:right;font-size:12px;line-height:17px;color:#5C574F}" +
  ".ag-ids b{font-weight:600;color:#1A1814}" +
  ".ag-ids .ag-blank{height:12px}" +
  ".ag-title{text-align:center;font-size:20px;font-weight:700;line-height:26px;letter-spacing:0.04em}" +
  ".ag-h{margin-top:18px;font-size:15px;font-weight:700;line-height:20px}" +
  ".ag-ln{display:flex;align-items:flex-end;gap:8px;height:28px}" +
  ".ag-ln.tall{height:30px}" +
  ".ag-l{font-size:13px;line-height:18px;color:#5C574F;white-space:nowrap}" +
  ".ag-r{flex:1 1 auto;min-width:0;height:1px;margin-bottom:4px;background:#8A857C}" +
  ".ag-r.fixed{flex:none}" +
  ".ag-p{margin-top:8px;font-size:14px;line-height:21px}" +
  ".ag-p.first{margin-top:4px}" +
  ".ag-blank{display:inline-block;height:14px;border-bottom:1px solid #8A857C;vertical-align:baseline}" +
  ".ag-tbl{width:100%;margin-top:6px;border-collapse:collapse;border:1px solid #8A857C;font-size:13px;line-height:18px;background:#FFFFFF}" +
  ".ag-tbl th{height:30px;padding:0 10px;background:#EFEDE8;border-bottom:1px solid #8A857C;text-align:left;font-weight:700}" +
  ".ag-tbl td{height:30px;padding:0 10px;border-bottom:1px solid #9B968C}" +
  ".ag-tbl .amt{width:180px;text-align:right;border-left:1px solid #8A857C;white-space:nowrap}" +
  ".ag-tbl .amt .ag-blank{width:110px;margin-left:6px}" +
  ".ag-tbl td .ag-blank.pct{width:36px}" +
  ".ag-tbl tr.total td{background:#F6F5F2;font-weight:700;border-bottom-color:#8A857C}" +
  ".ag-strip{padding-bottom:8px;border-bottom:1px solid #8A857C;font-size:12px;line-height:16px;color:#5C574F}" +
  ".ag-sigs{display:flex;gap:48px;margin-top:22px}" +
  ".ag-sigs>div{flex:1}" +
  ".ag-sigs .who{font-size:13px;font-weight:700;line-height:18px}" +
  ".ag-stamps{display:flex;gap:48px;margin-top:18px}" +
  ".ag-stamps>div{flex:1;height:90px}" +
  ".ag-stamp{box-sizing:border-box;border:1px dashed #767676;border-radius:6px;padding-top:8px;text-align:center;font-size:12px;line-height:16px;color:#767676;background:rgba(255,255,255,0.7)}" +
  ".ag-remark{height:28px;border-bottom:1px solid #8A857C}" +
  "</style>";

/** "Name ______" in the agreement's size; `width` fixes the line's length. */
const line = (label: string, width?: number, tall = false) =>
  `<div class="ag-ln${tall ? " tall" : ""}">${label ? `<span class="ag-l">${escapeHtml(label)}</span>` : ""}<span class="ag-r${
    width ? ` fixed" style="width:${width}px` : ""
  }"></span></div>`;

/** Two labelled lines on one row, the second `width` long. */
const lineAndLine = (first: string, second: string, width: number) =>
  `<div class="ag-ln"><span class="ag-l">${escapeHtml(first)}</span><span class="ag-r"></span><span class="ag-l">${escapeHtml(
    second
  )}</span><span class="ag-r fixed" style="width:${width}px"></span></div>`;

/** A detail of the letterhead on the right: printed when given, a line to write on when not. */
const idDetail = (label: string, value: string) =>
  `${escapeHtml(label)} ${value ? `<b>${escapeHtml(value)}</b>` : blank(120)}`;

/** Lines to write the business's details on, when no letterhead is made yet (no business name). */
const detailsBlock = (letterhead: Letterhead) =>
  `<div class="ag-head"><div style="flex:1;min-width:0">` +
  `<div style="width:340px">${line("Business")}</div>` +
  (letterhead.tagline ? `<div class="ag-small">${escapeHtml(letterhead.tagline)}</div>` : "") +
  (letterhead.address
    ? `<div class="ag-small">${escapeHtml(letterhead.address)}</div>`
    : `<div style="width:340px">${line("Address")}</div>`) +
  `</div><div class="ag-ids">${[
    idDetail("GST No.", letterhead.gst),
    idDetail("PAN", letterhead.pan),
    idDetail("Phone", letterhead.phone),
    idDetail("Email", letterhead.email),
  ].join("<br>")}</div></div>`;

/** An amount to write in, after a ₹. */
const amount = `₹${blank(110)}`;

/** A part of the agreement and the height it takes on paper. */
type Block = { html: string; height: number; paragraph?: boolean; keepWithNext?: boolean };

/** Heights of the fixed parts, measured from the printed page. */
export const BLOCK_HEIGHTS = {
  details: 82,
  titleAndParties: 170,
  piano: 150,
  period: 66,
  chargesHotel: 196,
  chargesPrivate: 226,
  heading: 38,
  acknowledgment: 116,
  signaturesHotel: 160,
  signaturesPrivate: 130,
  stamps: 108,
  remarks: 126,
} as const;

const heading = (text: string, accent: string) =>
  `<div class="ag-h" style="color:${accent}">${escapeHtml(text)}</div>`;

const blocksOf = (kind: AgreementKind, letterhead: Letterhead, accent: string, withDetails: boolean): Block[] => {
  const hotel = kind === "hotel";
  const party = AGREEMENTS[kind].party;
  const business = letterhead.business ? escapeHtml(letterhead.business) : "";
  const terms = termTexts(hotel ? HOTEL_TERMS : PRIVATE_TERMS);
  const blocks: Block[] = [];
  if (withDetails) blocks.push({ html: detailsBlock(letterhead), height: BLOCK_HEIGHTS.details });
  blocks.push({
    html:
      `<div class="ag-title" style="margin-top:${withDetails ? 18 : 0}px">PIANO RENTAL AGREEMENT</div>` +
      `<div style="display:flex;justify-content:space-between;gap:40px;margin-top:14px">` +
      `<div style="flex-grow:1"><div style="font-size:13px;font-weight:700;line-height:18px">${hotel ? "Hotel" : "Renter"}</div>` +
      line("Name") +
      line(hotel ? "Address" : "Address where the piano will be kept") +
      line("") +
      (hotel ? line("GSTIN") : lineAndLine("Mobile", "ID seen (type)", 120)) +
      `</div><div style="width:220px;flex-shrink:0;padding-top:18px">${line("Agreement date")}</div></div>`,
    height: BLOCK_HEIGHTS.titleAndParties + (withDetails ? 18 : 0),
  });
  blocks.push({
    html:
      heading("1. Piano details", accent) +
      `<div style="display:flex;align-items:center;gap:16px;height:28px;font-size:13px;line-height:18px"><span class="ag-l">Instrument</span>${checkBox(
        "Upright piano"
      )}${checkBox("Grand piano")}</div>` +
      lineAndLine("Make and model", "Serial number", 200) +
      line("Comes with (bench, cover)") +
      line("Condition at delivery"),
    height: BLOCK_HEIGHTS.piano,
  });
  blocks.push({
    html:
      heading("2. Rental period", accent) +
      `<p class="ag-p first" style="line-height:24px">The rental period shall be ${blank(48)} months, starting on ${blank(
        130
      )} and ending on ${blank(130)}.</p>`,
    height: BLOCK_HEIGHTS.period,
  });
  blocks.push({
    html:
      heading(`3. ${hotel ? "Monthly rental charges" : "Rent and deposit"}`, accent) +
      `<table class="ag-tbl"><thead><tr><th>Description</th><th class="amt">Amount</th></tr></thead><tbody>` +
      `<tr><td>Monthly rental</td><td class="amt">${amount}</td></tr>` +
      `<tr><td>GST @ <span class="ag-blank pct"></span> %${hotel ? "" : ", if charged"}</td><td class="amt">${amount}</td></tr>` +
      `<tr><td>Total monthly rental</td><td class="amt">${amount}</td></tr>` +
      `<tr class="total"><td>Total for <span class="ag-blank pct"></span> months${hotel ? ", including GST" : ""}</td><td class="amt">${amount}</td></tr>` +
      (hotel
        ? ""
        : `<tr><td style="border-bottom:0">Security deposit, refundable on return</td><td class="amt" style="border-bottom:0">${amount}</td></tr>`) +
      `</tbody></table>`,
    height: hotel ? BLOCK_HEIGHTS.chargesHotel : BLOCK_HEIGHTS.chargesPrivate,
  });
  blocks.push({ html: heading("4. Terms and conditions", accent), height: BLOCK_HEIGHTS.heading, keepWithNext: true });
  terms.forEach((text, index) => {
    blocks.push({
      html: `<p class="ag-p${index === 0 ? " first" : ""}">${termParagraph(text, letterhead)}</p>`,
      height: paragraphHeight(text, letterhead, index === 0),
      paragraph: true,
    });
  });
  blocks.push({
    html:
      `<div class="ag-h" style="margin-top:20px;color:${accent}">5. Delivery acknowledgment</div>` +
      `<p class="ag-p first">The ${party} acknowledges receipt of the piano in satisfactory condition and agrees to the terms stated in this agreement.</p>` +
      `<div style="width:340px">${line("Received on", undefined, true)}</div>`,
    height: BLOCK_HEIGHTS.acknowledgment,
  });
  blocks.push({
    html:
      `<div class="ag-sigs"><div><div class="who">For ${business || "the business"}</div>${["Signature", "Name", "Date"]
        .map((label) => line(label, undefined, true))
        .join("")}</div>` +
      `<div><div class="who">${hotel ? "For the hotel" : "Renter"}</div>${(hotel
        ? ["Signature", "Name", "Designation", "Date"]
        : ["Signature", "Name", "Date"]
      )
        .map((label) => line(label, undefined, true))
        .join("")}</div></div>`,
    height: hotel ? BLOCK_HEIGHTS.signaturesHotel : BLOCK_HEIGHTS.signaturesPrivate,
  });
  blocks.push({
    html: `<div class="ag-stamps"><div class="ag-stamp">Business stamp</div>${
      hotel ? `<div class="ag-stamp">Hotel stamp</div>` : "<div></div>"
    }</div>`,
    height: BLOCK_HEIGHTS.stamps,
  });
  blocks.push({
    html:
      `<div class="ag-h" style="margin-top:22px;color:${accent}">Delivery remarks</div>` +
      `<div class="ag-remark"></div><div class="ag-remark"></div><div class="ag-remark"></div>`,
    height: BLOCK_HEIGHTS.remarks,
  });
  return blocks;
};

/**
 * The parts shared out over pages: page 1 has `first` px for them, every
 * later page `rest`. A heading stays with what follows it, and terms that go
 * on to a new page are headed "(continued)".
 */
export const paginate = (blocks: Block[], first: number, rest: number, continued: Block): Block[][] => {
  const pages: Block[][] = [[]];
  let used = 0;
  let room = first;
  blocks.forEach((block, index) => {
    const next = blocks[index + 1];
    const need = block.height + (block.keepWithNext && next ? next.height : 0);
    if (pages[pages.length - 1].length > 0 && used + need > room) {
      pages.push([]);
      used = 0;
      room = rest;
      if (block.paragraph) {
        pages[pages.length - 1].push(continued);
        used += continued.height;
      }
    }
    pages[pages.length - 1].push(block);
    used += block.height;
  });
  return pages;
};

/**
 * The headings' colour: the design's own on Monogram, Modern and Band, as the
 * boards draw them, and ink on Classic, Minimal and everything else.
 */
export const headingColour = (frame: LetterheadFrame, design: LetterheadDesign): string =>
  frame.style === "make" && ["monogram", "modern", "band"].includes(design.template)
    ? colourById(design.colour).accent
    : "#1A1814";

/**
 * The pages of one agreement, with the letterhead: as many as the parts need,
 * usually two.
 */
export const agreementPages = (
  kind: AgreementKind,
  letterhead: Letterhead,
  design: LetterheadDesign = DEFAULT_DESIGN,
  assets: LetterheadAssets = NO_ASSETS
): string[] => {
  const agreement = AGREEMENTS[kind];
  const frame = letterheadFrame(design, letterhead, assets);
  const lines = frame.style === "lines";
  const accent = headingColour(frame, design);
  const blocks = blocksOf(kind, letterhead, accent, lines);
  const business = letterhead.business ? escapeHtml(letterhead.business) : "";
  const restStrip = lines
    ? `<div class="ag-strip">${business || blank(160)}  ·  Piano rental agreement</div>`
    : frame.restStrip;
  const firstTop = lines ? 44 : frame.firstTop;
  const restPad = lines ? 44 : frame.restPad;
  const restTop = lines ? 44 + 25 : frame.restTop;
  const bottom = PAGE_HEIGHT - frame.footBottom - FOOT_SPACE;
  const continued: Block = {
    html: heading("4. Terms and conditions (continued)", accent),
    height: BLOCK_HEIGHTS.heading,
  };
  const pages = paginate(blocks, bottom - firstTop, bottom - restTop, continued);
  return pages.map((page, index) =>
    framedPage(
      AG_CSS +
        (index === 0 ? frame.firstLayers : frame.restLayers + restStrip) +
        // Each part in its own box, which changes nothing on paper and lets its height be measured
        page.map((block) => `<div class="ag-b" data-h="${block.height}">${block.html}</div>`).join(""),
      agreement.footer,
      `Page ${index + 1} of ${pages.length}`,
      { padTop: index === 0 ? firstTop : restPad, footBottom: frame.footBottom }
    )
  );
};

/** `count` copies of an agreement, each its pages in order. */
export const agreementCopies = (
  kind: AgreementKind,
  letterhead: Letterhead,
  count: number,
  design: LetterheadDesign = DEFAULT_DESIGN,
  assets: LetterheadAssets = NO_ASSETS
): string[] => repeatPages(agreementPages(kind, letterhead, design, assets), clampCount(count));

/** The whole HTML document for an agreement, ready for expo-print. */
export const agreementHtml = (
  kind: AgreementKind,
  letterhead: Letterhead,
  count: number,
  fontCss = "",
  design: LetterheadDesign = DEFAULT_DESIGN,
  assets: LetterheadAssets = NO_ASSETS
): string =>
  paperDocument(
    AGREEMENTS[kind].title,
    agreementCopies(kind, letterhead, count, design, assets),
    fontCss + letterheadCss(assets)
  );