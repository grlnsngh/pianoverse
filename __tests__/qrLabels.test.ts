import {
  A4_MM,
  clampLabels,
  hasContact,
  labelContent,
  labelPosition,
  labelsDocument,
  labelSheetPages,
  labelsFor,
  LABEL_SHEETS,
  MAX_LABELS_EACH,
  perSheet,
  pianoLink,
  QUIET_ZONE,
  qrMatrix,
  qrPath,
  qrSvg,
  sheetsFor,
  testSheetDocument,
  type LabelContent,
} from "@/utils/qrLabels";
import { EMPTY_LETTERHEAD } from "@/utils/letterhead";
import { makePiano } from "./helpers/fixtures";

/** QR labels: the code, the sheets and what a label says (canvas page "QR labels"). */

const ID = "64f1a2b3c4d5e6f7a8b9";
const letterhead = { ...EMPTY_LETTERHEAD, business: "The Piano Services", phone: "+91 98765 43210" };
const samick = makePiano({
  $id: ID,
  title: "Samick SU-118",
  make: "Samick",
  company_associated: "Kirpalsons",
});

describe("the code", () => {
  it("holds the link that opens the piano in the app", () => {
    expect(pianoLink(ID)).toBe("pianoverse://detail/64f1a2b3c4d5e6f7a8b9");
  });

  it("is 29 modules across for a link with a piano's ID (the smallest version that fits)", () => {
    const matrix = qrMatrix(pianoLink(ID));
    expect(matrix).toHaveLength(29);
    expect(matrix.every((row) => row.length === 29)).toBe(true);
  });

  it("is the same for the same piano and different for another", () => {
    expect(qrMatrix(pianoLink(ID))).toEqual(qrMatrix(pianoLink(ID)));
    expect(qrMatrix(pianoLink(ID))).not.toEqual(qrMatrix(pianoLink("64f1a2b3c4d5e6f7a8c0")));
  });

  it("has the three squares that a scanner finds it by, in three corners", () => {
    const matrix = qrMatrix(pianoLink(ID));
    const n = matrix.length;
    // Each is a dark ring 7 across, a light ring inside it and a dark 3 x 3 in the middle
    const finder = (top: number, left: number) => {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          const edge = y === 0 || y === 6 || x === 0 || x === 6;
          const middle = y >= 2 && y <= 4 && x >= 2 && x <= 4;
          expect(matrix[top + y][left + x]).toBe(edge || middle);
        }
      }
    };
    finder(0, 0);
    finder(0, n - 7);
    finder(n - 7, 0);
  });

  it("is drawn by a path that, read back module by module, gives the code again", () => {
    const matrix = qrMatrix(pianoLink(ID));
    const path = qrPath(matrix);
    const drawn = matrix.map((row) => row.map(() => false));
    const rectangle = /M(\d+) (\d+)h(\d+)v1h-(\d+)z/g;
    let found: RegExpExecArray | null;
    let rectangles = 0;
    while ((found = rectangle.exec(path))) {
      rectangles += 1;
      const [x, y, width] = [Number(found[1]), Number(found[2]), Number(found[3])];
      expect(Number(found[4])).toBe(width);
      for (let i = 0; i < width; i++) drawn[y][x + i] = true;
    }
    expect(drawn).toEqual(matrix);
    // A run of dark modules in a row is one rectangle, not one each
    expect(rectangles).toBeLessThan(matrix.flat().filter(Boolean).length);
  });

  it("is an SVG on white with its quiet zone of four modules round it", () => {
    const svg = qrSvg(pianoLink(ID));
    const side = 29 + QUIET_ZONE * 2;
    expect(svg).toContain(`viewBox="-4 -4 ${side} ${side}"`);
    expect(svg).toContain('fill="#FFFFFF"');
    expect(svg).toContain('fill="#000000"');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('shape-rendering="crispEdges"');
  });
});

describe("the sheets", () => {
  it("are the two common A4 sticker sheets: 24 labels and 65 labels", () => {
    expect(perSheet(LABEL_SHEETS.large)).toBe(24);
    expect(perSheet(LABEL_SHEETS.small)).toBe(65);
    expect(LABEL_SHEETS.large).toMatchObject({ width: 63.5, height: 33.9, columns: 3, rows: 8 });
    expect(LABEL_SHEETS.small).toMatchObject({ width: 38.1, height: 21.2, columns: 5, rows: 13 });
  });

  it("put the first label where the sticker sheets have it: 7.2 mm across and 12.9 mm down for 24, 4.7 and 10.7 for 65", () => {
    const large = labelPosition(LABEL_SHEETS.large, 0);
    expect(large.left).toBeCloseTo(7.25, 2);
    expect(large.top).toBeCloseTo(12.9, 2);
    const small = labelPosition(LABEL_SHEETS.small, 0);
    expect(small.left).toBeCloseTo(4.75, 2);
    expect(small.top).toBeCloseTo(10.7, 2);
  });

  it("count labels across and then down, a gap of 2.5 mm between two in a row and none between rows", () => {
    const first = labelPosition(LABEL_SHEETS.large, 0);
    const second = labelPosition(LABEL_SHEETS.large, 1);
    const below = labelPosition(LABEL_SHEETS.large, 3);
    expect(second.left - first.left).toBeCloseTo(66, 5);
    expect(second.top).toBe(first.top);
    expect(below.left).toBe(first.left);
    expect(below.top - first.top).toBeCloseTo(33.9, 5);
  });

  it("start again at the top of the next sheet", () => {
    expect(labelPosition(LABEL_SHEETS.large, 24)).toEqual(labelPosition(LABEL_SHEETS.large, 0));
    expect(labelPosition(LABEL_SHEETS.small, 65)).toEqual(labelPosition(LABEL_SHEETS.small, 0));
  });

  it.each(["large", "small"] as const)("keep every %s label on the page, with the same margin either side", (id) => {
    const sheet = LABEL_SHEETS[id];
    const first = labelPosition(sheet, 0);
    const last = labelPosition(sheet, perSheet(sheet) - 1);
    expect(first.left).toBeGreaterThan(0);
    expect(last.left + sheet.width).toBeLessThan(A4_MM.width);
    expect(last.top + sheet.height).toBeLessThan(A4_MM.height);
    expect(A4_MM.width - (last.left + sheet.width)).toBeCloseTo(first.left, 5);
    expect(A4_MM.height - (last.top + sheet.height)).toBeCloseTo(first.top, 5);
  });

  it("are as many as the labels need, and at least one", () => {
    expect(sheetsFor(0, "large")).toBe(1);
    expect(sheetsFor(24, "large")).toBe(1);
    expect(sheetsFor(25, "large")).toBe(2);
    expect(sheetsFor(65, "small")).toBe(1);
    expect(sheetsFor(66, "small")).toBe(2);
  });
});

describe("how many labels of each", () => {
  it("is from one to ten, whole", () => {
    expect(clampLabels(0)).toBe(1);
    expect(clampLabels(-3)).toBe(1);
    expect(clampLabels(Number.NaN)).toBe(1);
    expect(clampLabels(2.4)).toBe(2);
    expect(clampLabels(MAX_LABELS_EACH + 1)).toBe(MAX_LABELS_EACH);
  });
});

describe("what a label says", () => {
  it("is the piano's title, its make and company, and who to call", () => {
    expect(labelContent(samick, letterhead, true)).toEqual({
      title: "Samick SU-118",
      line: "Samick · Kirpalsons",
      business: "The Piano Services",
      phone: "+91 98765 43210",
      link: `pianoverse://detail/${ID}`,
    });
  });

  it("leaves out who to call when that is switched off, or when none is set", () => {
    expect(labelContent(samick, letterhead, false)).toMatchObject({ business: "", phone: "" });
    expect(labelContent(samick, EMPTY_LETTERHEAD, true)).toMatchObject({ business: "", phone: "" });
    expect(hasContact(labelContent(samick, EMPTY_LETTERHEAD, true))).toBe(false);
    expect(hasContact(labelContent(samick, letterhead, true))).toBe(true);
    expect(hasContact(labelContent(samick, { ...EMPTY_LETTERHEAD, phone: "98765" }, true))).toBe(true);
  });

  it("skips a make that is only 'Other', and a company that isn't there", () => {
    expect(labelContent(makePiano({ make: "Other", company_associated: "Kirpalsons" }), letterhead, false).line).toBe("Kirpalsons");
    expect(labelContent(makePiano({ make: "Weber", company_associated: null }), letterhead, false).line).toBe("Weber");
    expect(labelContent(makePiano({ make: "", company_associated: "" }), letterhead, false).line).toBe("");
  });

  it("tidies spaces, and names a piano with no title", () => {
    expect(labelContent(makePiano({ title: "  Samick   SU-118 " }), letterhead, false).title).toBe("Samick SU-118");
    expect(labelContent(makePiano({ title: "" }), letterhead, false).title).toBe("Piano");
  });

  it("is repeated for each piano as many times as asked, a piano's labels together", () => {
    const weber = makePiano({ $id: "weber", title: "Weber W-121" });
    const labels = labelsFor([samick, weber], letterhead, true, 2);
    expect(labels.map((label) => label.title)).toEqual(["Samick SU-118", "Samick SU-118", "Weber W-121", "Weber W-121"]);
    expect(labelsFor([samick], letterhead, true, 99)).toHaveLength(MAX_LABELS_EACH);
  });
});

describe("the printed page", () => {
  /** What a page says, without its markup and its codes. */
  const words = (html: string) => html.replace(/<svg.*?<\/svg>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const label = (extra: Partial<LabelContent> = {}): LabelContent => ({
    ...labelContent(samick, letterhead, true),
    ...extra,
  });

  it("has one page for each sheet, with the labels in their places in millimetres", () => {
    const labels = Array.from({ length: 30 }, () => label());
    const pages = labelSheetPages(labels, "large");
    expect(pages).toHaveLength(2);
    expect(pages[0].match(/class="lb lg"/g)).toHaveLength(24);
    expect(pages[1].match(/class="lb lg"/g)).toHaveLength(6);
    expect(pages[0]).toContain("left:7.25mm;top:12.9mm");
    expect(pages[0]).toContain("left:73.25mm;top:12.9mm");
    expect(pages[0]).toContain("left:7.25mm;top:46.8mm");
  });

  it("has an empty page when there are no labels, so the PDF is still one page", () => {
    expect(labelSheetPages([], "small")).toHaveLength(1);
  });

  it("holds each label's code, title, make and who to call on the large label", () => {
    const [page] = labelSheetPages([label()], "large");
    expect(page).toContain("<svg");
    expect(words(page)).toBe(" Samick SU-118 Samick · Kirpalsons If found, call The Piano Services +91 98765 43210 ");
  });

  it("has only the title and the phone on the small label", () => {
    const [page] = labelSheetPages([label()], "small");
    expect(page).toContain('class="lb sm"');
    expect(words(page)).toBe(" Samick SU-118 If found, call +91 98765 43210 ");
  });

  it("falls back to the business name on the small label when there is no phone", () => {
    const [page] = labelSheetPages([label({ phone: "" })], "small");
    expect(page).toContain("The Piano Services");
  });

  it("has no 'If found, call' when there is nobody to call", () => {
    const bare = labelContent(samick, letterhead, false);
    expect(labelSheetPages([bare], "large")[0]).not.toContain("If found");
    expect(labelSheetPages([bare], "small")[0]).not.toContain("If found");
    expect(words(labelSheetPages([bare], "large")[0])).toBe(" Samick SU-118 Samick · Kirpalsons ");
  });

  it("prints what was typed as typed, never as markup", () => {
    const [page] = labelSheetPages([label({ title: "A <b>&</b> B", business: 'Tom & "Jerry"' })], "large");
    expect(page).toContain("A &lt;b&gt;&amp;&lt;/b&gt; B");
    expect(page).toContain("Tom &amp; &quot;Jerry&quot;");
    expect(page).not.toContain("<b>&</b>");
  });

  it("keeps a word with a hyphen in one piece, so U-121 isn't split over two lines", () => {
    const [page] = labelSheetPages([label({ title: "Young Chang U-121" })], "large");
    expect(page).toContain('Young Chang <span style="white-space:nowrap">U-121</span>');
  });

  it("is a whole document with the fonts first and the label styles after them", () => {
    const html = labelsDocument([label()], "large", "@font-face{font-family:'Figtree';}");
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html.indexOf("@font-face")).toBeLessThan(html.indexOf(".lb.lg"));
    expect(html).toContain("<title>Piano labels</title>");
  });

  it("has a test sheet with a box in every place, a label in the first and what to do", () => {
    const large = testSheetDocument("large", label());
    expect(large.match(/class="slot"/g)).toHaveLength(24);
    expect(large.match(/class="lb lg"/g)).toHaveLength(1);
    expect(large).toContain("Test sheet");
    expect(large).toContain("not “fit to page”");
    expect(testSheetDocument("small", label()).match(/class="slot"/g)).toHaveLength(65);
    // The boxes are drawn over the label, so they are never hidden by it
    expect(large.indexOf('class="lb lg"')).toBeLessThan(large.indexOf('class="slot"'));
  });
});
