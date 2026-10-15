import { DEFAULT_DESIGN, type Letterhead, type LetterheadDesign } from "../letterhead";
import { agreementPages } from "./agreements";
import {
  AGREEMENT_KINDS,
  clampCount,
  FULL_KIT,
  PAPER_FORMS,
  paperFormById,
  type PaperFormId,
} from "./catalog";
import {
  box,
  boxRow,
  checkBox,
  escapeHtml,
  formHeader,
  labelledLine,
  page,
  paperDocument,
  repeatPages,
} from "./html";
import {
  formStrip,
  letterheadCss,
  NO_ASSETS,
  receiptMark,
  type LetterheadAssets,
} from "./letterheads";

/**
 * The five forms of the Paper forms kit, as HTML pages (boards FormRentCard,
 * FormReceipts, FormPianoRegister, FormRentalRegister and FormHandover). Every
 * form is blank, to be filled in by hand: the only thing printed on it is the
 * business. With a letterhead (letterheads.ts) the rent card, receipts and
 * handover form carry the small one at the top (board LhRentCard and
 * LhCompact); without one they have lines with the business name and phone.
 * The registers are the business's own records and stay plain. To change a
 * form's wording or columns, change it here; an over-the-air update carries it.
 */

type Strip = { html: string; pad: number } | null;

/** "Business ______" with the name printed on it when there is one. */
const businessLine = (letterhead: Letterhead) => labelledLine("Business", letterhead.business);

/** Rows of a ruled table: each row's cells, numbered in the first. */
const numberedRows = (count: number, height: number, cells: number, numbered = true) =>
  Array.from(
    { length: count },
    (_, index) =>
      `<tr style="height:${height}px">${Array.from(
        { length: cells },
        (__, cell) => `<td>${cell === 0 && numbered ? index + 1 : ""}</td>`
      ).join("")}</tr>`
  ).join("");

/** The header cells of a table, each with its width (none for the one that takes the rest). */
const headerCells = (columns: [string, number?, "num"?][]) =>
  `<colgroup>${columns
    .map(([, width]) => (width ? `<col style="width:${width}px">` : "<col>"))
    .join("")}</colgroup><thead><tr>${columns
    .map(([label, , align]) => `<th${align ? ' class="num"' : ""}>${escapeHtml(label)}</th>`)
    .join("")}</tr></thead>`;

/**
 * The top of a form: the small letterhead and the form's title, or (with no
 * letterhead) the title with lines for the business and phone.
 */
const formTop = (
  strip: Strip,
  title: string,
  subtitle: string,
  letterhead: Letterhead,
  fields: string
) =>
  strip
    ? `${strip.html}<div style="margin-top:16px">${formHeader(title, subtitle, [fields])}</div>`
    : formHeader(title, subtitle, [businessLine(letterhead), labelledLine("Phone", letterhead.phone) + fields]);

/** A page that starts higher when it has the small letterhead, which brings its own space. */
const formPage = (body: string, name: string, strip: Strip, className = "") =>
  strip
    ? page(body, name, className).replace('<section class="page', `<section style="padding-top:${strip.pad}px" class="page`)
    : page(body, name, className);

const rentCard = (letterhead: Letterhead, strip: Strip): string =>
  formPage(
    formTop(strip, "Rent card", "One card per rental. Keep it with the agreement.", letterhead, labelledLine("Card no.", "", 60)) +
      `<div class="${strip ? "compact" : ""}">` +
      `<div class="h2" style="margin-top:${strip ? 14 : 18}px">Rental</div>` +
      boxRow([box("Customer name", 1.6), box("Mobile")], 4) +
      boxRow([box("Address")]) +
      boxRow([box("Piano (make and model)", 1.6), box("Piano ID or B-number")]) +
      boxRow([box("Rent per month, ₹"), box("Rent due on day (of the month)"), box("Deposit, ₹")]) +
      boxRow([box("Rental starts"), box("Rental ends"), box("Delivered on"), box("Returned on")]) +
      `</div>` +
      `<div class="h2">Payments</div>` +
      `<table class="tbl" style="margin-top:6px">${headerCells([
        ["Month", 80],
        ["Due date", 90],
        ["Amount, ₹", 96, "num"],
        ["Paid on", 90],
        ["Cash, UPI, cheque", 128],
        ["Receipt no.", 96],
        ["Received by"],
      ])}<tbody>${numberedRows(12, strip ? 33 : 34, 7)}<tr class="total" style="height:${
        strip ? 33 : 34
      }px"><td colspan="2">Total received</td><td></td><td colspan="4"></td></tr></tbody></table>` +
      `<div class="sigs" style="margin-top:${strip ? 34 : 40}px"><div class="sig">Owner’s signature</div><div class="sig">Customer’s signature</div></div>`,
    "Rent card",
    strip
  );

const SCISSORS =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#767676" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></svg>';

const RECEIPT_CSS =
  "<style>" +
  ".rc{display:flex;height:320px;border:1px solid #8A857C;border-radius:8px;overflow:hidden}" +
  ".rc-office{width:186px;flex-shrink:0;padding:12px 14px;border-right:1px dashed #8A857C}" +
  ".rc-office b{display:block;font-size:13px;line-height:18px}" +
  ".rc-office .box{flex:none;height:44px;margin-top:6px}" +
  ".rc-main{flex-grow:1;min-width:0;padding:10px 18px;display:flex;flex-direction:column;gap:4px}" +
  ".rc-main .ln{height:32px}" +
  ".rc-main .ln.small{height:20px}" +
  ".rc-mark .rc-main{gap:3px}" +
  ".rc-mark .rc-main .ln{height:30px}" +
  ".rc-mark .rc-main .rc-ticks.amount{height:38px}" +
  ".rc-main .say{font-size:13px;line-height:18px;color:#3C3831;white-space:nowrap}" +
  ".rc-top{display:flex;align-items:flex-end;gap:12px;height:26px}" +
  ".rc-top .name{font-size:20px;font-weight:700;line-height:24px;margin-right:auto}" +
  ".rc-ticks{display:flex;align-items:center;gap:14px}" +
  ".rc-ticks.amount{height:40px}" +
  ".rc-ticks .lead{font-size:12px;font-weight:700;line-height:16px}" +
  ".rc-amount{width:150px;height:38px;flex-shrink:0;display:flex;align-items:center;padding:0 10px;border:1.5px solid #1A1814;border-radius:6px;font-size:18px;font-weight:700}" +
  ".rc-sign{display:flex;align-items:flex-end;gap:16px;height:56px}" +
  ".rc-stamp{width:100px;height:56px;flex-shrink:0;border:1px dashed #767676;border-radius:4px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12px;line-height:14px;color:#767676}" +
  ".rc-cut{display:flex;align-items:center;gap:8px;height:20px}" +
  ".rc-cut div{flex-grow:1;border-top:1px dashed #8A857C}" +
  "</style>";

const receipt = (letterhead: Letterhead, mark: string | null): string =>
  `<div class="rc${mark ? " rc-mark" : ""}">` +
  `<div class="rc-office"><b>Office copy</b>${[
    "Receipt no.",
    "Date",
    "Received from",
    "For (rent, deposit, sale)",
    "Amount, ₹",
  ]
    .map((label) => box(label))
    .join("")}</div>` +
  `<div class="rc-main">` +
  (mark ?? "") +
  `<div class="rc-top"><div class="name">Receipt</div>${labelledLine("No.", "", 80)}${labelledLine(
    "Date",
    "",
    100
  )}</div>` +
  (mark
    ? ""
    : `<div class="ln small">${labelledLine("From", letterhead.business)}${labelledLine(
        "Phone",
        letterhead.phone,
        130
      )}</div>`) +
  `<div class="ln"><span class="say">Received with thanks from</span><span class="rule"></span></div>` +
  `<div class="ln"><span class="say">The sum of rupees (in words)</span><span class="rule"></span></div>` +
  `<div class="rc-ticks amount"><div class="rc-amount">₹</div><span class="lead">For</span>${[
    "Rent",
    "Deposit",
    "Sale",
    "Other",
  ]
    .map(checkBox)
    .join("")}</div>` +
  `<div class="ln" style="height:30px">${labelledLine("Piano")}${labelledLine("Month", "", 110)}</div>` +
  `<div class="rc-ticks" style="height:28px"><span class="lead">Paid by</span>${checkBox("Cash")}${checkBox(
    "UPI"
  )}${checkBox("Cheque no.")}<span class="rule" style="align-self:flex-end;margin-bottom:5px"></span></div>` +
  `<div class="rc-sign"><div class="rc-stamp">Revenue stamp<br>cash over ₹5,000</div><div class="sig">Signature, for ${
    letterhead.business ? escapeHtml(letterhead.business) : "the business"
  }</div></div>` +
  `</div></div>`;

const receipts = (letterhead: Letterhead, mark: string | null): string =>
  page(
    RECEIPT_CSS +
      `<div style="display:flex;align-items:baseline;justify-content:space-between;height:32px"><div style="font-size:22px;font-weight:700;line-height:28px;letter-spacing:-0.01em">Rent receipts</div><div class="sub">Give the right side. Keep the office copy.</div></div>` +
      [0, 1, 2]
        .map(
          (index) =>
            (index > 0 ? `<div class="rc-cut">${SCISSORS}<div></div></div>` : "") + receipt(letterhead, mark)
        )
        .join(""),
    "Rent receipts",
    // Three receipts and two cut lines fill the page, so it starts a little higher
    "tight"
  );

const pianoRegister = (letterhead: Letterhead): string =>
  page(
    formHeader("Piano register", "Every piano you own, one line each.", [
      businessLine(letterhead),
      labelledLine("Year") + labelledLine("Page", "", 60),
    ]) +
      `<div class="note"><b>Category:</b> R rentable · E events · S on sale · W warehouse. When a piano is sold, write “Sold” and the date under Where now.</div>` +
      `<table class="tbl" style="margin-top:10px">${headerCells([
        ["No.", 38],
        ["Piano (make, model)", 160],
        ["ID or B-no.", 92],
        ["Cat.", 46],
        ["Bought on", 82],
        ["Bought for, ₹", 98, "num"],
        ["Where now", 110],
        ["Notes"],
      ])}<tbody>${numberedRows(22, 36, 8)}</tbody></table>`,
    "Piano register"
  );

const rentalRegister = (letterhead: Letterhead): string =>
  page(
    formHeader("Rental register", "Every rental, in the order they start.", [
      businessLine(letterhead),
      labelledLine("Year") + labelledLine("Page", "", 60),
    ]) +
      `<div class="note">Keep each rental’s payments on its rent card. Write the card number under No.</div>` +
      `<table class="tbl" style="margin-top:10px">${headerCells([
        ["No.", 38],
        ["Customer and mobile", 160],
        ["Piano", 120],
        ["Starts", 76],
        ["Ends", 76],
        ["Rent, ₹", 80, "num"],
        ["Deposit, ₹", 80, "num"],
        ["Returned"],
      ])}<tbody>${numberedRows(20, 40, 8)}</tbody></table>`,
    "Rental register"
  );

/** The checks on a handover, and whether each is a yes or no (the rest are written in). */
const HANDOVER_CHECKS: [string, boolean][] = [
  ["Date", false],
  ["Outside finish has no new marks", true],
  ["All keys play", true],
  ["Pedals work", true],
  ["Bench or stool", true],
  ["Cover", true],
  ["Lid keys (how many)", false],
  ["Tuned before delivery", true],
  ["Photos taken: front, sides, keys", true],
  ["Moved by (name)", false],
];

const UPRIGHT_PIANO =
  '<svg width="224" height="168" viewBox="0 0 80 60" fill="none" stroke="#5C574F" stroke-width="0.45" stroke-linejoin="round"><rect x="8" y="8" width="64" height="6" rx="2"/><rect x="11" y="14" width="58" height="22" rx="1.5"/><rect x="17" y="19" width="46" height="12" rx="1"/><rect x="8" y="36" width="64" height="4" rx="1.5"/><rect x="13" y="40" width="54" height="7"/><path d="M18.4 40v7M23.8 40v7M29.2 40v7M34.6 40v7M40 40v7M45.4 40v7M50.8 40v7M56.2 40v7M61.6 40v7"/><rect x="11" y="47" width="58" height="5"/><rect x="11" y="47" width="5" height="11" rx="1"/><rect x="64" y="47" width="5" height="11" rx="1"/></svg>';

const yesNo = `<span style="display:inline-flex;gap:14px">${checkBox("Yes")}${checkBox("No")}</span>`;

const handover = (letterhead: Letterhead, strip: Strip): string =>
  formPage(
    formTop(
      strip,
      "Handover and return",
      "Check together when the piano leaves, and again when it comes back.",
      letterhead,
      labelledLine("Card no.", "", 60)
    ) +
      boxRow([box("Piano (make, model, ID or B-number)"), box("Customer")], 14) +
      boxRow([box("Address", 1.6), box("Mobile")]) +
      `<table class="tbl" style="margin-top:18px">${headerCells([
        ["Check"],
        ["At handover", 160],
        ["At return", 160],
      ])}<tbody>${HANDOVER_CHECKS.map(
        ([label, isYesNo]) =>
          `<tr style="height:32px"><td style="vertical-align:middle;padding:0 10px;font-size:13px;line-height:18px;color:#1A1814">${escapeHtml(
            label
          )}</td><td style="vertical-align:middle;padding:0 10px;color:#1A1814">${
            isYesNo ? yesNo : ""
          }</td><td style="vertical-align:middle;padding:0 10px;color:#1A1814">${isYesNo ? yesNo : ""}</td></tr>`
      ).join(
        ""
      )}<tr style="height:56px"><td style="padding:8px 10px;font-size:13px;line-height:18px;color:#1A1814">Notes</td><td></td><td></td></tr></tbody></table>` +
      `<div style="display:flex;gap:24px;margin-top:20px">` +
      `<div style="width:360px;flex-shrink:0"><div style="font-size:13px;font-weight:700;line-height:18px">Mark scratches and marks</div><div class="sub" style="font-size:12px;line-height:16px">Write H for handover and R for return next to each mark.</div><div style="height:186px;margin-top:8px;border:1px solid #8A857C;border-radius:6px;display:flex;align-items:center;justify-content:center">${UPRIGHT_PIANO}</div></div>` +
      `<div style="flex-grow:1;display:flex;flex-direction:column;justify-content:flex-end;gap:28px"><div style="font-size:13px;font-weight:700;line-height:18px;margin-bottom:-18px">Signatures</div>${[
        "Owner, at handover",
        "Customer, at handover",
        "Owner, at return",
        "Customer, at return",
      ]
        .map((label) => `<div class="sig" style="flex:none;padding-top:5px">${escapeHtml(label)}</div>`)
        .join("")}</div>` +
      `</div>`,
    "Handover and return",
    strip
  );

/** The pages of one form, `count` copies of it, with the letterhead where the form takes one. */
export const formPages = (
  id: PaperFormId,
  letterhead: Letterhead,
  count: number,
  design: LetterheadDesign = DEFAULT_DESIGN,
  assets: LetterheadAssets = NO_ASSETS
): string[] => {
  const strip = formStrip(design, letterhead, assets);
  const pageOf: Record<PaperFormId, () => string> = {
    rent_card: () => rentCard(letterhead, strip),
    receipts: () => receipts(letterhead, receiptMark(design, letterhead, assets)),
    piano_register: () => pianoRegister(letterhead),
    rental_register: () => rentalRegister(letterhead),
    handover: () => handover(letterhead, strip),
  };
  return repeatPages([pageOf[id]()], clampCount(count));
};

/** The whole HTML document for one form, ready for expo-print. */
export const formHtml = (
  id: PaperFormId,
  letterhead: Letterhead,
  count: number,
  fontCss = "",
  design: LetterheadDesign = DEFAULT_DESIGN,
  assets: LetterheadAssets = NO_ASSETS
): string =>
  paperDocument(
    paperFormById(id)?.title ?? "Paper form",
    formPages(id, letterhead, count, design, assets),
    fontCss + letterheadCss(assets)
  );

/** The full kit: every form once in the order of the list, then both agreements, in one document. */
export const kitHtml = (
  letterhead: Letterhead,
  fontCss = "",
  design: LetterheadDesign = DEFAULT_DESIGN,
  assets: LetterheadAssets = NO_ASSETS
): string =>
  paperDocument(
    FULL_KIT.title,
    [
      ...PAPER_FORMS.flatMap((form) => formPages(form.id, letterhead, 1, design, assets)),
      ...AGREEMENT_KINDS.flatMap((kind) => agreementPages(kind, letterhead, design, assets)),
    ],
    fontCss + letterheadCss(assets)
  );