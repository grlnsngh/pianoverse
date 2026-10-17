import { DEFAULT_DESIGN, EMPTY_LETTERHEAD, LETTERHEAD_TEMPLATES, type Letterhead, type LetterheadDesign } from "@/utils/letterhead";
import { HOTEL_TERMS, PRIVATE_TERMS } from "@/utils/paperForms/agreementTerms";
import {
  agreementCopies,
  agreementHtml,
  agreementPages,
  BLOCK_HEIGHTS,
  paginate,
  paragraphLines,
  termParagraphs,
} from "@/utils/paperForms/agreements";
import { AGREEMENT_KINDS, AGREEMENTS, FULL_KIT, isAgreementKind } from "@/utils/paperForms/catalog";
import { kitHtml } from "@/utils/paperForms/forms";
import { PAGE_HEIGHT } from "@/utils/paperForms/html";

/** The two rental agreements: their terms, how they fill their pages, and what each kind prints. */

const full: Letterhead = {
  business: "Tune & Play <Pianos>",
  phone: "98140 12345",
  tagline: "Tuning, rentals and moving",
  address: "SCO 12, Sector 17-C, Chandigarh",
  email: "hello@tuneandplay.in",
  gst: "03ABCDE1234F1Z5",
  pan: "ABCDE1234F",
};
const tps: Letterhead = { ...full, business: "The Piano Services" };
const none: LetterheadDesign = { ...DEFAULT_DESIGN, style: "none" };
const pagesIn = (html: string) => html.match(/<section /g)?.length ?? 0;
const text = (html: string) => html.replace(/<style>.*?<\/style>/gs, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

/** Each page's parts and how much room they were given: their measured heights never run past the footer. */
const fits = (page: string) => {
  const top = Number(page.match(/padding-top:(\d+)px/)?.[1]);
  const footBottom = Number(page.match(/class="foot" style="bottom:(\d+)px/)?.[1]);
  const strip = page.includes('class="ag-strip"') ? 25 : 0;
  const used = [...page.matchAll(/class="ag-b" data-h="(\d+)"/g)].reduce((sum, match) => sum + Number(match[1]), 0);
  return { used, room: PAGE_HEIGHT - footBottom - 26 - top - strip };
};

describe("the agreements in the catalog", () => {
  it("has a hotel and a private-person agreement, two pages each, with ids that never change", () => {
    expect(AGREEMENT_KINDS).toEqual(["hotel", "private"]);
    expect(AGREEMENTS.hotel).toMatchObject({ id: "agreement_hotel", title: "Hotel rental agreement", pagesPerCopy: 2 });
    expect(AGREEMENTS.private).toMatchObject({ id: "agreement_private", title: "Private rental agreement", pagesPerCopy: 2 });
    expect(isAgreementKind("private")).toBe(true);
    expect(isAgreementKind("company")).toBe(false);
  });

  it("makes the full kit six forms and nine pages: the five forms, then both agreements", () => {
    expect(FULL_KIT).toMatchObject({ forms: 6, pages: 9 });

    const html = kitHtml(tps, "", DEFAULT_DESIGN);
    const footers = [...html.matchAll(/<div class="foot"[^>]*><span>([^<]+)<\/span><span>([^<]+)<\/span>/g)].map(
      (match) => `${match[1]} | ${match[2]}`
    );

    expect(pagesIn(html)).toBe(9);
    expect(footers.slice(5)).toEqual([
      "Piano rental agreement · hotel | Page 1 of 2",
      "Piano rental agreement · hotel | Page 2 of 2",
      "Piano rental agreement · private person | Page 1 of 2",
      "Piano rental agreement · private person | Page 2 of 2",
    ]);
  });
});

describe("the terms, written as plain text", () => {
  it("gives a paragraph for each blank line, titles in bold, in order", () => {
    const paragraphs = termParagraphs(HOTEL_TERMS, full);

    expect(paragraphs.map((paragraph) => paragraph.match(/^<b>([^<]+)<\/b>/)?.[1])).toEqual([
      "Payment:",
      "Late payment:",
      "Ownership:",
      "Care and maintenance:",
      "Damage:",
      "Shifting:",
      "Maintenance and tuning:",
      "Termination and return:",
      "Extension:",
      "Delivery and collection:",
    ]);
  });

  it("ignores an old line that said where page 2 starts: the pages fill themselves", () => {
    expect(termParagraphs("**A:** one\n\n--- page 2 ---\n\n**B:** two", full)).toEqual(["<b>A:</b> one", "<b>B:</b> two"]);
  });

  it("prints the business name where it says {business}, escaped, or a line to write it on", () => {
    expect(termParagraphs("The piano belongs to {business}.", full)).toEqual([
      "The piano belongs to Tune &amp; Play &lt;Pianos&gt;.",
    ]);
    expect(termParagraphs("The piano belongs to {business}.", EMPTY_LETTERHEAD)).toEqual([
      'The piano belongs to <span class="ag-blank" style="width:160px"></span>.',
    ]);
  });

  it("turns {blank} into a line to write on, 120 wide unless it says, and escapes the rest", () => {
    expect(termParagraphs("From {blank} for ₹{blank 90} a month.", EMPTY_LETTERHEAD)).toEqual([
      'From <span class="ag-blank" style="width:120px"></span> for ₹<span class="ag-blank" style="width:90px"></span> a month.',
    ]);
    expect(termParagraphs("Rent < 5 & more", EMPTY_LETTERHEAD)).toEqual(["Rent &lt; 5 &amp; more"]);
  });
});

describe("how long a paragraph is on paper", () => {
  it("counts lines the way the page wraps them (measured in the browser)", () => {
    const [payment, late, ownership, care, , , , termination] = HOTEL_TERMS.split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    expect(paragraphLines(payment, tps)).toBe(1);
    expect(paragraphLines(late, tps)).toBe(3);
    expect(paragraphLines(ownership, tps)).toBe(2);
    expect(paragraphLines(care, tps)).toBe(2);
    expect(paragraphLines(termination, tps)).toBe(4);
  });

  it("counts a long business name and write-in lines in the width", () => {
    expect(paragraphLines("Owned by {business}.", { ...tps, business: "x".repeat(10) })).toBe(1);
    expect(paragraphLines("{blank 600} {blank 600}", tps)).toBe(2);
  });
});

describe("filling the pages", () => {
  const block = (height: number, extra = {}) => ({ html: `<p>${height}</p>`, height, ...extra });
  const continued = block(38);

  it("starts a new page when a part doesn't fit", () => {
    const pages = paginate([block(300), block(300), block(300)], 650, 650, continued);

    expect(pages.map((page) => page.map((part) => part.height))).toEqual([[300, 300], [300]]);
  });

  it("keeps a heading with what follows it", () => {
    const pages = paginate([block(560), block(38, { keepWithNext: true }), block(60)], 650, 650, continued);

    expect(pages.map((page) => page.map((part) => part.height))).toEqual([[560], [38, 60]]);
  });

  it("heads terms that go on to a new page with “continued”", () => {
    const pages = paginate([block(600), block(80, { paragraph: true })], 650, 650, continued);

    expect(pages[1]).toEqual([continued, expect.objectContaining({ height: 80 })]);
  });

  it("keeps both agreements to two pages under every design, each part inside its page", () => {
    for (const { id } of LETTERHEAD_TEMPLATES) {
      for (const kind of AGREEMENT_KINDS) {
        const pages = agreementPages(kind, tps, { ...DEFAULT_DESIGN, template: id });

        expect(pages).toHaveLength(2);
        for (const page of pages) {
          const { used, room } = fits(page);
          expect(used).toBeLessThanOrEqual(room);
        }
      }
    }
  });

  it("goes on to more pages when a tall letterhead leaves less room, and numbers them", () => {
    const tall: LetterheadDesign = {
      ...DEFAULT_DESIGN,
      style: "upload",
      upload: { image: { file: "letterhead-1.jpg", width: 1240, height: 1754 }, kind: "page", top: 90, bottom: 60, strength: 100 },
    };
    const pages = agreementPages("hotel", tps, tall, { logo: null, image: "data:image/jpeg;base64,X" });

    expect(pages.length).toBeGreaterThan(2);
    pages.forEach((page, index) => {
      expect(page).toContain(`Page ${index + 1} of ${pages.length}`);
      const { used, room } = fits(page);
      expect(used).toBeLessThanOrEqual(room);
    });
  });

  it("knows the height of each fixed part, measured from the printed page", () => {
    expect(BLOCK_HEIGHTS).toMatchObject({ titleAndParties: 170, piano: 150, period: 66, chargesHotel: 196, heading: 38 });
  });
});

describe("what each agreement prints", () => {
  it("makes the hotel's with its GSTIN, GST on late charges, 18% interest, a designation and a hotel stamp", () => {
    const words = text(agreementPages("hotel", tps, none).join(""));

    expect(words).toContain(" Hotel Name ");
    expect(words).toContain("GSTIN");
    expect(words).toContain("3. Monthly rental charges");
    expect(words).toContain("including GST");
    expect(words).toContain("1.5% per month (18% per annum)");
    expect(words).toContain("GST shall apply on late payment charges");
    expect(words).toContain("For the hotel");
    expect(words).toContain("Designation");
    expect(words).toContain("Hotel stamp");
    expect(words).not.toContain("Security deposit");
    expect(words).not.toContain("ID seen");
  });

  it("makes the private person's with their mobile and ID, a deposit refunded in 15 days, 12% interest and no hotel stamp", () => {
    const words = text(agreementPages("private", tps, none).join(""));

    expect(words).toContain(" Renter Name ");
    expect(words).toContain("Address where the piano will be kept");
    expect(words).toContain("ID seen (type)");
    expect(words).toContain("3. Rent and deposit");
    expect(words).toContain("GST @ %, if charged");
    expect(words).toContain("Security deposit, refundable on return");
    expect(words).toContain("simple interest at 1% per month (12% per annum)");
    expect(words).toContain("refunded within 15 days of the piano’s return");
    expect(words).not.toContain("18% per annum");
    expect(words).not.toContain("Designation");
    expect(words).not.toContain("Hotel stamp");
    expect(words).toContain("Business stamp");
  });

  it("prints the business on the letterhead, in the terms and in the signatures, escaped", () => {
    const html = agreementPages("hotel", full).join("");

    expect(html).toContain("TUNE &amp; PLAY &lt;PIANOS&gt;");
    expect(html).toContain("sole property of Tune &amp; Play &lt;Pianos&gt;");
    expect(html).toContain("For Tune &amp; Play &lt;Pianos&gt;");
    expect(html).not.toContain("<Pianos>");
  });

  it("prints lines to write the details on when there is no business name yet", () => {
    const [first, second] = agreementPages("private", EMPTY_LETTERHEAD);

    expect(first).toContain('class="ag-head"');
    expect(text(first)).toContain("Business");
    expect(text(first)).toContain("GST No.");
    expect(second).toContain('class="ag-strip"');
    expect(second).toContain("For the business");
  });

  it("colours the headings in the design's colour on Monogram, Modern and Band, and ink on the rest", () => {
    expect(agreementPages("hotel", tps, { ...DEFAULT_DESIGN, template: "monogram", colour: "copper" })[0]).toContain(
      'class="ag-h" style="color:#9A4A24"'
    );
    expect(agreementPages("hotel", tps, { ...DEFAULT_DESIGN, template: "classic", colour: "gold" })[0]).toContain(
      'class="ag-h" style="color:#1A1814"'
    );
    expect(agreementPages("hotel", tps, none)[0]).toContain('class="ag-h" style="color:#1A1814"');
  });

  it("fills in nothing about the client, the piano or the money", () => {
    const html = agreementPages("private", tps, none).join("");
    const amounts = [...html.matchAll(/<td class="amt"[^>]*>(.*?)<\/td>/g)].map((match) => match[1]);

    expect(amounts).toHaveLength(5);
    for (const cell of amounts) {
      expect(cell).toBe('₹<span class="ag-blank" style="width:110px"></span>');
    }
  });

  it("repeats all the pages for each copy, in order, from 1 to 20", () => {
    const copies = agreementCopies("hotel", tps, 2, none);

    expect(copies).toHaveLength(4);
    expect(copies.map((page) => page.match(/Page (\d) of 2/)?.[1])).toEqual(["1", "2", "1", "2"]);
    expect(agreementCopies("hotel", tps, 99, none)).toHaveLength(40);
    expect(agreementCopies("hotel", tps, 0, none)).toHaveLength(2);
  });

  it("makes a whole document named after the agreement, with the font and the letterhead's images", () => {
    const html = agreementHtml("private", tps, 1, "@font-face{x}", DEFAULT_DESIGN, {
      logo: "data:image/png;base64,LOGO",
      image: null,
    });

    expect(html).toContain("<title>Private rental agreement</title>");
    expect(html).toContain("@font-face{x}");
    expect(html.match(/LOGO/g)).toHaveLength(1);
    expect(pagesIn(html)).toBe(2);
  });

  it("keeps the private terms with their own clauses", () => {
    expect(termParagraphs(PRIVATE_TERMS, tps).some((paragraph) => paragraph.startsWith("<b>Security deposit:</b>"))).toBe(true);
  });
});
