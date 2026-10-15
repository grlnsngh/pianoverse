/**
 * The pieces every paper form is built from: the page, its header and footer,
 * the lines and boxes to write on, and the HTML document that expo-print turns
 * into a PDF (lib/paperPdf.ts). The look is the Paper forms kit boards on the
 * design canvas: A4 at 96 px to the inch (794 x 1122), Figtree, black on
 * white, so it prints the same on any printer and photocopies well.
 *
 * Everything the person typed goes through `escapeHtml`, so a business name
 * with a < or & in it prints as typed.
 */

/** Text made safe to put inside HTML. */
export const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * One A4 page is 794 x 1122 px at 96 px to the inch. A page that is a pixel too
 * tall spills a blank page after it, so the page is cut to this height.
 */
export const PAGE_WIDTH = 794;
export const PAGE_HEIGHT = 1122;

const CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #FFFFFF; }
body {
  font-family: 'Figtree', -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: #1A1814;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.page {
  position: relative;
  width: ${PAGE_WIDTH}px;
  height: ${PAGE_HEIGHT}px;
  padding: 44px 48px;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
}
.page:last-child { page-break-after: auto; break-after: auto; }
.page.tight { padding-top: 36px; }
.foot {
  position: absolute; left: 48px; right: 48px; bottom: 30px;
  display: flex; justify-content: space-between;
  font-size: 12px; line-height: 16px; color: #767676;
}
.head {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 28px;
  padding-bottom: 12px; border-bottom: 2px solid #1A1814;
}
.title { font-size: 30px; font-weight: 700; line-height: 36px; letter-spacing: -0.02em; }
.sub { font-size: 13px; line-height: 18px; color: #5C574F; }
.lh { width: 300px; flex-shrink: 0; }
.ln { display: flex; align-items: flex-end; gap: 8px; height: 26px; }
.lbl { font-size: 12px; line-height: 16px; color: #5C574F; white-space: nowrap; }
.rule {
  flex: 1 1 auto; min-width: 0; height: 18px; margin-bottom: 3px;
  border-bottom: 1px solid #8A857C;
  font-size: 13px; font-weight: 700; line-height: 17px; color: #1A1814;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rule.fixed { flex: none; }
.note { margin-top: 12px; font-size: 12px; line-height: 16px; color: #3C3831; }
.h2 { margin-top: 22px; font-size: 15px; font-weight: 700; line-height: 20px; }
.row { display: flex; gap: 24px; margin-top: 6px; }
.box {
  flex: 1; height: 46px; border-bottom: 1px solid #8A857C;
  font-size: 12px; line-height: 16px; color: #5C574F;
}
.tbl { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #8A857C; }
.tbl th {
  height: 30px; padding: 0 8px; background: #EFEDE8; border: 1px solid #8A857C;
  font-size: 12px; font-weight: 700; line-height: 15px; text-align: left; vertical-align: middle;
}
.tbl th.num { text-align: right; }
.tbl td {
  padding: 4px 6px; border: 1px solid #9B968C; vertical-align: top;
  font-size: 12px; line-height: 14px; color: #767676;
}
.tbl tr.total td {
  background: #F6F5F2; border-color: #8A857C; vertical-align: middle;
  font-size: 13px; font-weight: 700; color: #1A1814; padding: 0 8px;
}
.cb { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; line-height: 16px; white-space: nowrap; }
.cb i { display: inline-block; width: 12px; height: 12px; border: 1px solid #1A1814; border-radius: 2px; }
.sigs { display: flex; gap: 48px; margin-top: 40px; }
.sig {
  flex: 1; border-top: 1px solid #1A1814; padding-top: 6px;
  font-size: 12px; line-height: 16px; color: #5C574F;
}
`;

/** A line to write on, with its label in front: "Business ______". */
export const labelledLine = (label: string, value = "", width?: number): string =>
  `<span class="lbl">${escapeHtml(label)}</span><span class="rule${
    width ? ' fixed" style="width:' + width + 'px' : ""
  }">${escapeHtml(value)}</span>`;

/** A labelled box to write in, as wide as `flex` shares of its row. */
export const box = (label: string, flex = 1): string =>
  `<div class="box"${flex === 1 ? "" : ` style="flex:${flex}"`}>${escapeHtml(label)}</div>`;

/** A row of boxes side by side. */
export const boxRow = (boxes: string[], marginTop?: number): string =>
  `<div class="row"${marginTop === undefined ? "" : ` style="margin-top:${marginTop}px"`}>${boxes.join(
    ""
  )}</div>`;

/** A tick box with its label. */
export const checkBox = (label: string): string =>
  `<span class="cb"><i></i>${escapeHtml(label)}</span>`;

/**
 * The header of a form: its title and what it is for on the left, and on the
 * right the lines for the business (printed when given) and the form's own
 * fields.
 */
export const formHeader = (title: string, subtitle: string, lines: string[]): string =>
  `<div class="head"><div><div class="title">${escapeHtml(title)}</div><div class="sub">${escapeHtml(
    subtitle
  )}</div></div><div class="lh">${lines.map((line) => `<div class="ln">${line}</div>`).join("")}</div></div>`;

/** One A4 page with its own words at the bottom left and right. */
export const pageWithFooter = (body: string, left: string, right: string, className = ""): string =>
  `<section class="page${className ? " " + className : ""}">${body}<div class="foot"><span>${escapeHtml(
    left
  )}</span><span>${escapeHtml(right)}</span></div></section>`;

/** One A4 page with the footer every form has. */
export const page = (body: string, footerName: string, className = ""): string =>
  pageWithFooter(body, "Made with Pianoverse paper forms", `${footerName} · A4`, className);

/** Each page repeated `count` times, in order. */
export const repeatPages = (pages: string[], count: number): string[] =>
  Array.from({ length: count }, () => pages).flat();

/**
 * The document expo-print renders: the pages one after another, with the
 * fonts (`fontCss`, @font-face rules) when they could be read. Without them
 * the PDF is set in the phone's own sans serif, which is still fine.
 */
export const paperDocument = (title: string, pages: string[], fontCss = ""): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=${PAGE_WIDTH}"><title>${escapeHtml(
    title
  )}</title><style>${fontCss}${CSS}</style></head><body>${pages.join("")}</body></html>`;
