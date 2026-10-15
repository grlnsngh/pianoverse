const mockMoves: { from: string; to: string; options: unknown }[] = [];
const mockBase64 = jest.fn(async (uri: string) => `B64(${uri})`);
/** The files on the "phone": letterhead images and PDFs a test has put there */
const mockExisting = new Set<string>();
const mockDeleted: string[] = [];

jest.mock("expo-file-system", () => {
  const join = (parts: (string | { uri: string })[]) =>
    parts.map((part) => (typeof part === "string" ? part : part.uri)).join("");
  class Directory {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = join(parts).replace(/([^/])$/, "$1/");
    }
  }
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = join(parts);
    }
    get exists() {
      return mockExisting.has(this.uri);
    }
    get contentUri() {
      return this.uri.replace("file:///docs/", "content://pianoverse/docs/");
    }
    base64() {
      return mockBase64(this.uri);
    }
    async move(target: { uri: string }, options: unknown) {
      mockMoves.push({ from: this.uri, to: target.uri, options });
      this.uri = target.uri;
    }
    delete() {
      mockDeleted.push(this.uri);
      mockExisting.delete(this.uri);
    }
  }
  return { File, Directory, Paths: { document: new Directory("file:///docs/") } };
});
jest.mock("expo-asset", () => ({
  Asset: {
    fromModule: jest.fn((module: number) => ({
      uri: `asset://${module}`,
      localUri: `file:///cache/font-${module}.ttf`,
      downloadAsync: jest.fn(async () => undefined),
    })),
  },
}));
jest.mock("expo-print", () => ({
  printToFileAsync: jest.fn(async () => ({ uri: "file:///cache/Print/abc.pdf", numberOfPages: 3 })),
  printAsync: jest.fn(async () => undefined),
}));
jest.mock("expo-sharing", () => ({ shareAsync: jest.fn(async () => undefined) }));
jest.mock("expo-intent-launcher", () => ({ startActivityAsync: jest.fn(async () => ({})) }));

import { Asset } from "expo-asset";
import * as IntentLauncher from "expo-intent-launcher";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import {
  forgetPaperPdfs,
  isPrintCancelled,
  loadFontCss,
  openPdf,
  printPdf,
  loadLetterheadAssets,
  resetFontCssForTests,
  saveAgreement,
  savePaperForm,
  savePaperKit,
  saveTestPage,
  sharePdf,
} from "@/lib/paperPdf";
import { DEFAULT_DESIGN, EMPTY_LETTERHEAD, type LetterheadDesign } from "@/utils/letterhead";

/** Making a paper form's PDF on the phone, keeping it, and opening, printing or sharing it. */

const printToFile = Print.printToFileAsync as jest.Mock;
const letterhead = { ...EMPTY_LETTERHEAD, business: "Tune and Play" };
const none: LetterheadDesign = { ...DEFAULT_DESIGN, style: "none" };

beforeEach(() => {
  jest.clearAllMocks();
  mockMoves.length = 0;
  mockDeleted.length = 0;
  mockExisting.clear();
  resetFontCssForTests();
  jest.replaceProperty(Platform, "OS", "android");
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

describe("making a form's PDF", () => {
  it("draws the form's HTML on A4 with no margins", async () => {
    await savePaperForm("rent_card", letterhead, 3, none);

    const options = printToFile.mock.calls[0][0];
    expect(options).toMatchObject({
      width: 595,
      height: 842,
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    expect(options.html).toContain("<title>Rent card</title>");
    expect(options.html).toContain("Tune and Play");
    expect(options.html.match(/<section /g)).toHaveLength(3);
  });

  it("keeps the web view from enlarging the text by the phone's Font size", async () => {
    // The pages are laid out for the designed size; at 150% a PDF would overflow its boxes
    await savePaperForm("rent_card", letterhead, 1, none);

    expect(printToFile.mock.calls[0][0]).toMatchObject({ textZoom: 100 });
  });

  it("keeps it in the app's documents as the form's name, replacing the last one", async () => {
    const pdf = await savePaperForm("receipts", letterhead, 1);

    expect(mockMoves).toEqual([
      {
        from: "file:///cache/Print/abc.pdf",
        to: "file:///docs/Rent receipts.pdf",
        options: { overwrite: true },
      },
    ]);
    expect(pdf).toEqual({ uri: "file:///docs/Rent receipts.pdf", fileName: "Rent receipts.pdf", pages: 3 });
  });

  it("counts the pages itself when the phone doesn't say", async () => {
    printToFile.mockResolvedValueOnce({ uri: "file:///cache/Print/x.pdf", numberOfPages: 0 });

    expect((await savePaperForm("handover", letterhead, 4)).pages).toBe(4);
  });

  it("makes no more than 20 copies", async () => {
    await savePaperForm("rent_card", letterhead, 500);

    expect(printToFile.mock.calls[0][0].html.match(/<section /g)).toHaveLength(20);
  });

  it("refuses a form that doesn't exist, without drawing anything", async () => {
    await expect(savePaperForm("agreement" as any, letterhead, 1)).rejects.toThrow(
      "There is no paper form called agreement"
    );
    expect(printToFile).not.toHaveBeenCalled();
  });

  it("passes on a failure to draw, for the screen to tell the person", async () => {
    printToFile.mockRejectedValueOnce(new Error("WebView gone"));

    await expect(savePaperForm("rent_card", letterhead, 1)).rejects.toThrow("WebView gone");
    expect(mockMoves).toEqual([]);
  });

  it("makes the full kit as one PDF of every form and both agreements", async () => {
    printToFile.mockResolvedValueOnce({ uri: "file:///cache/Print/kit.pdf", numberOfPages: 0 });

    const pdf = await savePaperKit(letterhead);

    expect(printToFile.mock.calls[0][0].html.match(/<section /g)).toHaveLength(9);
    expect(pdf).toEqual({ uri: "file:///docs/Paper forms kit.pdf", fileName: "Paper forms kit.pdf", pages: 9 });
  });

  it("makes an agreement's copies, two pages each, kept under its own name", async () => {
    printToFile.mockResolvedValueOnce({ uri: "file:///cache/Print/ag.pdf", numberOfPages: 0 });

    const pdf = await saveAgreement("private", letterhead, 2);

    const html = printToFile.mock.calls[0][0].html;
    expect(html).toContain("<title>Private rental agreement</title>");
    expect(html.match(/<section /g)).toHaveLength(4);
    expect(mockMoves[0]).toMatchObject({ to: "file:///docs/Rental agreement (private).pdf" });
    expect(pdf).toEqual({
      uri: "file:///docs/Rental agreement (private).pdf",
      fileName: "Rental agreement (private).pdf",
      pages: 4,
    });
  });
});

describe("the fonts in the PDF", () => {
  it("embeds Figtree's regular, semibold and bold from the app's own font files", async () => {
    const css = await loadFontCss(none);

    expect(Asset.fromModule).toHaveBeenCalledTimes(3);
    expect(css.match(/@font-face/g)).toHaveLength(3);
    expect(css.match(/font-family:'Figtree'/g)).toHaveLength(3);
    for (const weight of [400, 600, 700]) expect(css).toContain(`font-weight:${weight}`);
    expect(css).toContain("src:url(data:font/ttf;base64,B64(file:///cache/font-");
  });

  it("adds the letterhead's own fonts when its design uses them: Monogram's initials and Elegant lettering", async () => {
    const css = await loadFontCss(DEFAULT_DESIGN);

    expect(css.match(/@font-face/g)).toHaveLength(5);
    expect(css).toContain("font-family:'Playfair Display'");
    expect(css).toContain("font-family:'Lora'");
  });

  it("reads each font file once, not for every PDF", async () => {
    await savePaperForm("rent_card", letterhead, 1);
    await savePaperForm("receipts", letterhead, 1);

    expect(mockBase64).toHaveBeenCalledTimes(5);
    expect(printToFile.mock.calls[1][0].html.match(/@font-face/g)).toHaveLength(5);
  });

  it("still makes the PDF when a font file can't be read, and tries that one again next time", async () => {
    mockBase64.mockRejectedValueOnce(new Error("no file"));

    await savePaperForm("rent_card", letterhead, 1, none);
    expect(printToFile.mock.calls[0][0].html.match(/@font-face/g)).toHaveLength(2);

    await savePaperForm("rent_card", letterhead, 1, none);
    expect(printToFile.mock.calls[1][0].html.match(/@font-face/g)).toHaveLength(3);
  });
});

describe("the letterhead in the PDF", () => {
  const logo = { file: "logo-1.png", width: 600, height: 400 };
  const page = { file: "letterhead-1.jpg", width: 1240, height: 1754 };

  it("puts the small letterhead on a form and the full one on an agreement", async () => {
    await savePaperForm("rent_card", letterhead, 1);
    await saveAgreement("hotel", letterhead, 1);

    expect(printToFile.mock.calls[0][0].html).toContain("TUNE AND PLAY");
    expect(printToFile.mock.calls[1][0].html).toContain("font-size:300px");
  });

  it("reads the logo of a made letterhead from the phone, and puts it in the PDF once", async () => {
    mockExisting.add("file:///docs/letterhead/logo-1.png");

    await saveAgreement("hotel", letterhead, 2, { ...DEFAULT_DESIGN, logo });

    const html = printToFile.mock.calls[0][0].html;
    expect(html).toContain(".lh-logo{background:url(data:image/png;base64,B64(file:///docs/letterhead/logo-1.png))");
    expect(html.match(/logo-1\.png/g)).toHaveLength(1);
    expect(html).toContain('class="lh-logo"');
  });

  it("reads only the image the chosen style uses, and goes without one that has gone missing", async () => {
    mockExisting.add("file:///docs/letterhead/letterhead-1.jpg");
    const upload: LetterheadDesign = { ...DEFAULT_DESIGN, style: "upload", logo, upload: { ...DEFAULT_DESIGN.upload, image: page } };

    expect(await loadLetterheadAssets(upload)).toEqual({
      logo: null,
      image: "data:image/jpeg;base64,B64(file:///docs/letterhead/letterhead-1.jpg)",
    });
    // The logo file isn't there
    expect(await loadLetterheadAssets({ ...DEFAULT_DESIGN, logo })).toEqual({ logo: null, image: null });
  });

  it("makes a test page for a printed pad: the agreement's first page alone", async () => {
    printToFile.mockResolvedValueOnce({ uri: "file:///cache/Print/t.pdf", numberOfPages: 1 });

    const pdf = await saveTestPage(letterhead, { ...DEFAULT_DESIGN, style: "printed" });

    const html = printToFile.mock.calls[0][0].html;
    expect(html.match(/<section /g)).toHaveLength(1);
    expect(html).toContain("PIANO RENTAL AGREEMENT");
    expect(html).toContain('style="padding-top:170px"');
    expect(pdf).toEqual({ uri: "file:///docs/Letterhead test page.pdf", fileName: "Letterhead test page.pdf", pages: 1 });
  });
});

describe("forgetting the PDFs", () => {
  it("deletes every PDF the app kept, which carry the letterhead, and nothing else", () => {
    for (const name of ["Rent card.pdf", "Rental agreement (private).pdf", "Paper forms kit.pdf", "Letterhead test page.pdf", "Someone else.pdf"]) {
      mockExisting.add(`file:///docs/${name}`);
    }

    forgetPaperPdfs();

    expect(mockDeleted.sort()).toEqual([
      "file:///docs/Letterhead test page.pdf",
      "file:///docs/Paper forms kit.pdf",
      "file:///docs/Rent card.pdf",
      "file:///docs/Rental agreement (private).pdf",
    ]);
    expect([...mockExisting]).toEqual(["file:///docs/Someone else.pdf"]);
  });

  it("carries on past a file it can't delete", () => {
    mockExisting.add("file:///docs/Rent card.pdf");
    mockExisting.add("file:///docs/Rent receipts.pdf");
    const deleteOnce = jest.fn(() => {
      throw new Error("in use");
    });
    const { File } = jest.requireMock("expo-file-system");
    const original = File.prototype.delete;
    File.prototype.delete = function (this: { uri: string }) {
      if (this.uri.endsWith("Rent card.pdf")) return deleteOnce();
      return original.call(this);
    };

    try {
      expect(() => forgetPaperPdfs()).not.toThrow();
    } finally {
      File.prototype.delete = original;
    }

    expect(mockDeleted).toEqual(["file:///docs/Rent receipts.pdf"]);
    expect(console.warn).toHaveBeenCalledWith("Could not delete Rent card.pdf:", expect.any(Error));
  });
});

describe("what to do with the PDF", () => {
  const pdf = { uri: "file:///docs/Rent card.pdf", fileName: "Rent card.pdf", pages: 1 };

  it("opens it in the phone's PDF viewer on Android, through an address other apps may read", async () => {
    await openPdf(pdf);

    expect(IntentLauncher.startActivityAsync).toHaveBeenCalledWith("android.intent.action.VIEW", {
      data: "content://pianoverse/docs/Rent card.pdf",
      flags: 1,
      type: "application/pdf",
    });
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  it("offers the share sheet when no app opens it, and on iPhone", async () => {
    (IntentLauncher.startActivityAsync as jest.Mock).mockRejectedValueOnce(new Error("No activity"));
    await openPdf(pdf);

    jest.replaceProperty(Platform, "OS", "ios");
    await openPdf(pdf);

    expect(Sharing.shareAsync).toHaveBeenCalledTimes(2);
    expect(Sharing.shareAsync).toHaveBeenCalledWith(pdf.uri, {
      mimeType: "application/pdf",
      dialogTitle: "Rent card.pdf",
      UTI: "com.adobe.pdf",
    });
  });

  it("prints it through the phone's print screen", async () => {
    await printPdf(pdf);

    expect(Print.printAsync).toHaveBeenCalledWith({
      uri: pdf.uri,
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  });

  it("shares it as a PDF", async () => {
    await sharePdf(pdf);

    expect(Sharing.shareAsync).toHaveBeenCalledWith(pdf.uri, expect.objectContaining({ mimeType: "application/pdf" }));
  });

  it("tells a closed print screen apart from a failure", () => {
    expect(isPrintCancelled(new Error("Printing did not complete. Print was cancelled"))).toBe(true);
    expect(isPrintCancelled(new Error("No printer"))).toBe(false);
    expect(isPrintCancelled("cancelled")).toBe(false);
  });
});
