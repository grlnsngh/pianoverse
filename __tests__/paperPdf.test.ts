const mockMoves: { from: string; to: string; options: unknown }[] = [];
const mockBase64 = jest.fn(async (uri: string) => `B64(${uri})`);

jest.mock("expo-file-system", () => {
  class Directory {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
  }
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((part) => (typeof part === "string" ? part : part.uri)).join("");
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
  isPrintCancelled,
  loadFontCss,
  openPdf,
  printPdf,
  resetFontCssForTests,
  savePaperForm,
  savePaperKit,
  sharePdf,
} from "@/lib/paperPdf";
import { EMPTY_LETTERHEAD } from "@/utils/letterhead";

/** Making a paper form's PDF on the phone, keeping it, and opening, printing or sharing it. */

const printToFile = Print.printToFileAsync as jest.Mock;
const letterhead = { ...EMPTY_LETTERHEAD, business: "Tune and Play" };

beforeEach(() => {
  jest.clearAllMocks();
  mockMoves.length = 0;
  resetFontCssForTests();
  jest.replaceProperty(Platform, "OS", "android");
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

describe("making a form's PDF", () => {
  it("draws the form's HTML on A4 with no margins", async () => {
    await savePaperForm("rent_card", letterhead, 3);

    const options = printToFile.mock.calls[0][0];
    expect(options).toMatchObject({
      width: 595,
      height: 842,
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    expect(options.html).toContain("<title>Rent card</title>");
    expect(options.html).toContain("Tune and Play");
    expect(options.html.match(/<section class="page/g)).toHaveLength(3);
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

    expect(printToFile.mock.calls[0][0].html.match(/<section class="page/g)).toHaveLength(20);
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

  it("makes the full kit as one PDF of every form", async () => {
    printToFile.mockResolvedValueOnce({ uri: "file:///cache/Print/kit.pdf", numberOfPages: 5 });

    const pdf = await savePaperKit(letterhead);

    expect(printToFile.mock.calls[0][0].html.match(/<section class="page/g)).toHaveLength(5);
    expect(pdf).toEqual({ uri: "file:///docs/Paper forms kit.pdf", fileName: "Paper forms kit.pdf", pages: 5 });
  });
});

describe("the font in the PDF", () => {
  it("embeds Figtree's regular, semibold and bold from the app's own font files", async () => {
    const css = await loadFontCss();

    expect(Asset.fromModule).toHaveBeenCalledTimes(3);
    expect(css.match(/@font-face/g)).toHaveLength(3);
    for (const weight of [400, 600, 700]) expect(css).toContain(`font-weight:${weight}`);
    expect(css).toContain("src:url(data:font/ttf;base64,B64(file:///cache/font-");
  });

  it("reads the font files once, not for every PDF", async () => {
    await savePaperForm("rent_card", letterhead, 1);
    await savePaperForm("receipts", letterhead, 1);

    expect(mockBase64).toHaveBeenCalledTimes(3);
    expect(printToFile.mock.calls[1][0].html).toContain("@font-face");
  });

  it("makes the PDF in the phone's own font when the files can't be read, and tries again next time", async () => {
    mockBase64.mockRejectedValueOnce(new Error("no file"));

    await savePaperForm("rent_card", letterhead, 1);
    expect(printToFile.mock.calls[0][0].html).not.toContain("@font-face");

    await savePaperForm("rent_card", letterhead, 1);
    expect(printToFile.mock.calls[1][0].html).toContain("@font-face");
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
