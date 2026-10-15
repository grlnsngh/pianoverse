import {
  cleanDetail,
  cleanLetterhead,
  DEFAULT_DESIGN,
  EMPTY_LETTERHEAD,
  isEmptyLetterhead,
  LETTERHEAD_KEYS,
  LETTERHEAD_LIMITS,
} from "@/utils/letterhead";
import {
  clampCount,
  FULL_KIT,
  isPaperFormId,
  MAX_COPIES,
  pageCountText,
  PAPER_FORMS,
  paperFormById,
  pdfFileName,
} from "@/utils/paperForms/catalog";
import { formHtml, formPages, kitHtml } from "@/utils/paperForms/forms";
import {
  escapeHtml,
  labelledLine,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  paperDocument,
  previewDocument,
} from "@/utils/paperForms/html";

/** The paper forms as HTML: what each form prints, and the business details on it. */

const pagesIn = (html: string) => html.match(/<section /g)?.length ?? 0;
const named = { ...EMPTY_LETTERHEAD, business: "Tune & Play <Pianos>", phone: "98140 12345" };
/** No letterhead: the forms' own header with lines for the business and phone */
const NONE = { ...DEFAULT_DESIGN, style: "none" as const };

describe("the list of paper forms", () => {
  it("has the five forms of the kit, in the order of the boards, with ids that never change", () => {
    expect(PAPER_FORMS.map((form) => form.id)).toEqual([
      "rent_card",
      "receipts",
      "piano_register",
      "rental_register",
      "handover",
    ]);
    expect(PAPER_FORMS.map((form) => form.title)).toEqual([
      "Rent card",
      "Rent receipts",
      "Piano register",
      "Rental register",
      "Handover and return",
    ]);
  });

  it("knows a form by its id, and nothing else", () => {
    expect(paperFormById("receipts")?.title).toBe("Rent receipts");
    expect(paperFormById("agreement")).toBeUndefined();
    expect(paperFormById(undefined)).toBeUndefined();
    expect(isPaperFormId("handover")).toBe(true);
    expect(isPaperFormId("handovers")).toBe(false);
  });

  it("keeps copies between 1 and 20, whole", () => {
    expect(MAX_COPIES).toBe(20);
    expect(clampCount(0)).toBe(1);
    expect(clampCount(-3)).toBe(1);
    expect(clampCount(4)).toBe(4);
    expect(clampCount(2.6)).toBe(3);
    expect(clampCount(99)).toBe(20);
    expect(clampCount(NaN)).toBe(1);
  });

  it("names the PDF after the form and counts its pages", () => {
    const card = paperFormById("rent_card")!;

    expect(pdfFileName(card)).toBe("Rent card.pdf");
    expect(pageCountText(card, 1)).toBe("1 page");
    expect(pageCountText(card, 4)).toBe("4 pages");
  });

  it("makes the full kit every form once and both agreements", () => {
    expect(FULL_KIT).toEqual({ title: "Paper forms kit", fileName: "Paper forms kit.pdf", forms: 6, pages: 9 });
  });
});

describe("the business details printed at the top", () => {
  it("tidies spaces and cuts each detail to its length", () => {
    expect(cleanDetail("business", "  Tune   and\nPlay  ")).toBe("Tune and Play");
    expect(cleanDetail("pan", "ABCDE1234FXXXX")).toHaveLength(LETTERHEAD_LIMITS.pan);
    expect(cleanDetail("phone", 98140)).toBe("");
  });

  it("reads anything stored as a whole letterhead, ignoring what doesn't belong", () => {
    expect(cleanLetterhead({ business: " Tune ", extra: "x", phone: null })).toEqual({
      ...EMPTY_LETTERHEAD,
      business: "Tune",
    });
    expect(cleanLetterhead("not an object")).toEqual(EMPTY_LETTERHEAD);
    expect(Object.keys(cleanLetterhead(null))).toEqual([...LETTERHEAD_KEYS]);
  });

  it("knows when nothing was given", () => {
    expect(isEmptyLetterhead(EMPTY_LETTERHEAD)).toBe(true);
    expect(isEmptyLetterhead({ ...EMPTY_LETTERHEAD, phone: "1" })).toBe(false);
  });
});

describe("the HTML the PDFs are made from", () => {
  it("prints what was typed as typed, never as HTML", () => {
    expect(escapeHtml(`<b>"Tom's" & co</b>`)).toBe("&lt;b&gt;&quot;Tom&#39;s&quot; &amp; co&lt;/b&gt;");
    expect(labelledLine("Business", "A & B")).toContain(">A &amp; B</span>");
  });

  it("is A4 with no margins, the font first, and nothing fetched from the internet", () => {
    const html = paperDocument("Test", ["<section class=\"page\"></section>"], "@font-face{x}");

    expect(PAGE_WIDTH).toBe(794);
    expect(PAGE_HEIGHT).toBe(1122);
    expect(html).toContain("@page { size: A4; margin: 0; }");
    expect(html).toContain('<meta charset="utf-8">');
    expect(html.indexOf("@font-face{x}")).toBeLessThan(html.indexOf("@page"));
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toMatch(/<script/i);
  });

  it("gives each form one page a copy, with its name in the footer", () => {
    for (const form of PAPER_FORMS) {
      const html = formHtml(form.id, EMPTY_LETTERHEAD, 3);

      expect(pagesIn(html)).toBe(3 * form.pagesPerCopy);
      expect(html).toContain(`<title>${escapeHtml(form.title)}</title>`);
      expect(html).toContain(`${escapeHtml(form.title)} · A4`);
      expect(html).toContain("Made with Pianoverse paper forms");
    }
  });

  it("never makes more than 20 copies or fewer than one", () => {
    expect(formPages("rent_card", EMPTY_LETTERHEAD, 50)).toHaveLength(20);
    expect(formPages("rent_card", EMPTY_LETTERHEAD, 0)).toHaveLength(1);
  });

  it("with no letterhead, prints the business name and phone on lines, escaped, and blank lines when not given", () => {
    const withName = formHtml("rent_card", named, 1, "", NONE);
    const blank = formHtml("rent_card", EMPTY_LETTERHEAD, 1, "", NONE);

    expect(withName).toContain("Tune &amp; Play &lt;Pianos&gt;");
    expect(withName).toContain("98140 12345");
    expect(withName).not.toContain("<Pianos>");
    expect(blank).toContain('<span class="lbl">Business</span><span class="rule"></span>');
    expect(blank).toContain('<span class="lbl">Phone</span><span class="rule"></span>');
  });

  it("with a letterhead, puts the small one at the top of the rent card and handover, and not on the registers", () => {
    for (const id of ["rent_card", "handover"] as const) {
      const html = formHtml(id, named, 1, "", DEFAULT_DESIGN);

      expect(html).toContain("TUNE &amp; PLAY &lt;PIANOS&gt;");
      expect(html).not.toContain('<span class="lbl">Business</span>');
      expect(html).toContain('<section style="padding-top:28px" class="page');
    }
    expect(formHtml("piano_register", named, 1, "", DEFAULT_DESIGN)).toContain(
      '<span class="lbl">Business</span><span class="rule">Tune &amp; Play &lt;Pianos&gt;</span>'
    );
  });

  it("puts the business on every receipt, three receipts and two cut lines to a page", () => {
    const html = formHtml("receipts", named, 2, "", NONE);

    expect(html.match(/class="rc"/g)).toHaveLength(6);
    expect(html.match(/class="rc-cut"/g)).toHaveLength(4);
    // On the From line and in "Signature, for …" on each of the six
    expect(html.match(/Tune &amp; Play &lt;Pianos&gt;/g)).toHaveLength(12);
    expect(html).toContain("Revenue stamp<br>cash over ₹5,000");
  });

  it("with a letterhead, carries the small one on each receipt instead of the From line", () => {
    const html = formHtml("receipts", named, 1, "", DEFAULT_DESIGN);

    expect(html.match(/class="rc rc-mark"/g)).toHaveLength(3);
    expect(html.match(/TUNE &amp; PLAY &lt;PIANOS&gt;/g)).toHaveLength(3);
    expect(html).not.toContain('<span class="lbl">From</span>');
  });

  it("shows one page on a screen at the width asked for, with the same page and styles", () => {
    const [page] = formPages("rent_card", named, 1, NONE);
    const html = previewDocument(page, "@font-face{x}", 250);

    expect(html).toContain('content="width=250,');
    expect(html).toContain("transform:scale(0.31486)");
    expect(html).toContain("@font-face{x}");
    expect(html).toContain(page);
  });

  it("rules 12 months on a rent card, 22 pianos and 20 rentals on the registers", () => {
    const rows = (html: string) => html.match(/<tr style="height/g)?.length ?? 0;

    // 12 months, then the total
    expect(rows(formHtml("rent_card", EMPTY_LETTERHEAD, 1))).toBe(12);
    expect(formHtml("rent_card", EMPTY_LETTERHEAD, 1)).toContain('<tr class="total"');
    expect(rows(formHtml("piano_register", EMPTY_LETTERHEAD, 1))).toBe(22);
    expect(rows(formHtml("rental_register", EMPTY_LETTERHEAD, 1))).toBe(20);
    // Ten checks and the notes
    expect(rows(formHtml("handover", EMPTY_LETTERHEAD, 1))).toBe(11);
  });

  it("fills in nothing but the business: every form is written by hand", () => {
    const html = formHtml("rent_card", named, 1);

    for (const label of ["Customer name", "Mobile", "Rent per month, ₹", "Deposit, ₹", "Total received"]) {
      expect(html).toContain(label);
    }
    expect(html).not.toMatch(/<td>[^<\d]+<\/td>/);
  });

  it("makes the full kit as every form once, in the order of the list (then the agreements)", () => {
    const html = kitHtml(named, "@font-face{x}", NONE);
    const footers = [...html.matchAll(/<span>([^<]+) · A4<\/span>/g)].map((match) => match[1]);

    expect(pagesIn(html)).toBe(FULL_KIT.pages);
    expect(footers).toEqual(PAPER_FORMS.map((form) => escapeHtml(form.title)));
    expect(html).toContain("@font-face{x}");
    expect(html).toContain("<title>Paper forms kit</title>");
  });
});
