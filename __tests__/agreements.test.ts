import { EMPTY_LETTERHEAD, type Letterhead } from "@/utils/letterhead";
import { HOTEL_TERMS, PRIVATE_TERMS } from "@/utils/paperForms/agreementTerms";
import { agreementCopies, agreementHtml, agreementPages, termPages } from "@/utils/paperForms/agreements";
import { AGREEMENT_KINDS, AGREEMENTS, FULL_KIT, isAgreementKind } from "@/utils/paperForms/catalog";
import { kitHtml } from "@/utils/paperForms/forms";

/** The two rental agreements: their terms, what each kind prints, and the letterhead at the top. */

const full: Letterhead = {
  business: "Tune & Play <Pianos>",
  phone: "98140 12345",
  tagline: "Tuning, rentals and moving",
  address: "SCO 12, Sector 17-C, Chandigarh",
  email: "hello@tuneandplay.in",
  gst: "03ABCDE1234F1Z5",
  pan: "ABCDE1234F",
};
const pagesIn = (html: string) => html.match(/<section class="page/g)?.length ?? 0;
const text = (html: string) => html.replace(/<style>.*?<\/style>/gs, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("the agreements in the catalog", () => {
  it("has a hotel and a private-person agreement, two pages each, with ids that never change", () => {
    expect(AGREEMENT_KINDS).toEqual(["hotel", "private"]);
    expect(AGREEMENTS.hotel).toMatchObject({
      id: "agreement_hotel",
      label: "Hotel",
      title: "Hotel rental agreement",
      fileName: "Rental agreement (hotel).pdf",
      pagesPerCopy: 2,
    });
    expect(AGREEMENTS.private).toMatchObject({
      id: "agreement_private",
      label: "Private person",
      title: "Private rental agreement",
      fileName: "Rental agreement (private).pdf",
      pagesPerCopy: 2,
    });
    expect(isAgreementKind("private")).toBe(true);
    expect(isAgreementKind("company")).toBe(false);
  });

  it("makes the full kit six forms and nine pages: the five forms, then both agreements", () => {
    expect(FULL_KIT).toMatchObject({ forms: 6, pages: 9 });

    const html = kitHtml(EMPTY_LETTERHEAD);
    const footers = [...html.matchAll(/<div class="foot"><span>([^<]+)<\/span><span>([^<]+)<\/span>/g)].map(
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
  it("splits at the page 2 line, one paragraph per blank line, with the titles in bold", () => {
    const [first, second] = termPages(HOTEL_TERMS, full);

    expect(first.map((paragraph) => paragraph.match(/^<b>([^<]+)<\/b>/)?.[1])).toEqual([
      "Payment:",
      "Late payment:",
      "Ownership:",
      "Care and maintenance:",
    ]);
    expect(second.map((paragraph) => paragraph.match(/^<b>([^<]+)<\/b>/)?.[1])).toEqual([
      "Damage:",
      "Shifting:",
      "Maintenance and tuning:",
      "Termination and return:",
      "Extension:",
      "Delivery and collection:",
    ]);
  });

  it("prints the business name where it says {business}, escaped, or a line to write it on", () => {
    const [named] = termPages("The piano belongs to {business}.", full);
    const [blankName] = termPages("The piano belongs to {business}.", EMPTY_LETTERHEAD);

    expect(named).toEqual(["The piano belongs to Tune &amp; Play &lt;Pianos&gt;."]);
    expect(blankName).toEqual(['The piano belongs to <span class="ag-blank" style="width:160px"></span>.']);
  });

  it("turns {blank} into a line to write on, 120 wide unless it says", () => {
    const [[paragraph]] = termPages("From {blank} for ₹{blank 90} a month.", EMPTY_LETTERHEAD);

    expect(paragraph).toBe(
      'From <span class="ag-blank" style="width:120px"></span> for ₹<span class="ag-blank" style="width:90px"></span> a month.'
    );
  });

  it("escapes anything else that looks like HTML in the terms", () => {
    const [[paragraph]] = termPages("Rent < 5 & more", EMPTY_LETTERHEAD);

    expect(paragraph).toBe("Rent &lt; 5 &amp; more");
  });

  it("keeps both pages of terms short enough to fit (check the PDF after a change, then raise these)", () => {
    const length = (part: string) =>
      part
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .reduce((sum, paragraph) => sum + paragraph.length, 0);
    const pagesOf = (terms: string) => terms.split(/^\s*---\s*page 2\s*---\s*$/im);

    const [hotelFirst, hotelSecond] = pagesOf(HOTEL_TERMS);
    const [privateFirst, privateSecond] = pagesOf(PRIVATE_TERMS);
    // Measured with the PDF printed: room for about four more lines on page 1 and one on page 2
    expect(length(hotelFirst)).toBeLessThanOrEqual(1000);
    expect(length(privateFirst)).toBeLessThanOrEqual(1000);
    expect(length(hotelSecond)).toBeLessThanOrEqual(1350);
    expect(length(privateSecond)).toBeLessThanOrEqual(1400);
  });
});

describe("what each agreement prints", () => {
  it("is two pages, numbered, with the agreement's name at the bottom", () => {
    for (const kind of AGREEMENT_KINDS) {
      const [first, second] = agreementPages(kind, EMPTY_LETTERHEAD);

      expect(first).toContain(`<span>${AGREEMENTS[kind].footer}</span><span>Page 1 of 2</span>`);
      expect(second).toContain(`<span>${AGREEMENTS[kind].footer}</span><span>Page 2 of 2</span>`);
      expect(first).toContain("PIANO RENTAL AGREEMENT");
      expect(second).toContain("5. Delivery acknowledgment");
    }
  });

  it("makes the hotel's with its GSTIN, GST on late charges, 18% interest, a designation and a hotel stamp", () => {
    const words = text(agreementPages("hotel", full).join(""));

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
    const words = text(agreementPages("private", full).join(""));

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

  it("prints the whole letterhead at the top when given, escaped", () => {
    const [first, second] = agreementPages("hotel", full);

    expect(first).toContain('<div class="ag-name">Tune &amp; Play &lt;Pianos&gt;</div>');
    for (const detail of ["Tuning, rentals and moving", "SCO 12, Sector 17-C, Chandigarh"]) {
      expect(first).toContain(`<div class="ag-small">${detail}</div>`);
    }
    for (const detail of ["03ABCDE1234F1Z5", "ABCDE1234F", "98140 12345", "hello@tuneandplay.in"]) {
      expect(first).toContain(`<b>${detail}</b>`);
    }
    expect(second).toContain("Tune &amp; Play &lt;Pianos&gt;  ·  Piano rental agreement");
    expect(second).toContain("For Tune &amp; Play &lt;Pianos&gt;");
    expect(first + second).not.toContain("<Pianos>");
  });

  it("prints lines to write the letterhead on when it is empty, and leaves out what you do", () => {
    const [first, second] = agreementPages("private", EMPTY_LETTERHEAD);
    const words = text(first);

    expect(words).toContain("Business");
    expect(words).toContain("Address");
    expect(words).toContain("GST No.");
    expect(first).not.toContain('class="ag-name"');
    expect(first).not.toContain('class="ag-small"');
    expect(second).toContain("For the business");
  });

  it("fills in nothing about the client, the piano or the money", () => {
    const html = agreementPages("private", full).join("");
    const amounts = [...html.matchAll(/<td class="amt"[^>]*>(.*?)<\/td>/g)].map((match) => match[1]);

    expect(amounts).toHaveLength(5);
    for (const cell of amounts) {
      expect(cell).toBe('₹<span class="ag-blank" style="width:110px"></span>');
    }
  });

  it("repeats both pages for each copy, in order, from 1 to 20", () => {
    const copies = agreementCopies("hotel", EMPTY_LETTERHEAD, 2);

    expect(copies).toHaveLength(4);
    expect(copies.map((page) => page.match(/Page (\d) of 2/)?.[1])).toEqual(["1", "2", "1", "2"]);
    expect(agreementCopies("hotel", EMPTY_LETTERHEAD, 99)).toHaveLength(40);
    expect(agreementCopies("hotel", EMPTY_LETTERHEAD, 0)).toHaveLength(2);
  });

  it("makes a whole document named after the agreement, with the font", () => {
    const html = agreementHtml("private", full, 1, "@font-face{x}");

    expect(html).toContain("<title>Private rental agreement</title>");
    expect(html).toContain("@font-face{x}");
    expect(pagesIn(html)).toBe(2);
  });
});
