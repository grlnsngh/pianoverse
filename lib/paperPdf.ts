import { Figtree_400Regular } from "@expo-google-fonts/figtree/400Regular";
import { Figtree_600SemiBold } from "@expo-google-fonts/figtree/600SemiBold";
import { Figtree_700Bold } from "@expo-google-fonts/figtree/700Bold";
import { Asset } from "expo-asset";
import { File, Paths } from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { Letterhead } from "@/utils/letterhead";
import {
  clampCount,
  FULL_KIT,
  paperFormById,
  pdfFileName,
  type PaperFormId,
} from "@/utils/paperForms/catalog";
import { formHtml, kitHtml } from "@/utils/paperForms/forms";

/**
 * Paper forms as PDF files, made on the phone: the form's HTML
 * (utils/paperForms) is drawn by the phone's own web view through expo-print,
 * and the PDF is kept in the app's documents as "Rent card.pdf", replacing the
 * last one of that form. Nothing is uploaded.
 */

/** A4 in PDF points, which is what expo-print measures in. */
const A4 = { width: 595, height: 842 };
const NO_MARGINS = { top: 0, right: 0, bottom: 0, left: 0 };

export type SavedPdf = {
  /** The PDF's file:// address in the app's documents */
  uri: string;
  /** "Rent card.pdf" */
  fileName: string;
  pages: number;
};

/** The weights the forms are set in, from the font files the app already has. */
const FONT_FILES: [number, number][] = [
  [Figtree_400Regular, 400],
  [Figtree_600SemiBold, 600],
  [Figtree_700Bold, 700],
];

let fontCss: Promise<string> | null = null;

/**
 * The @font-face rules that put Figtree in the PDF, read once. If the font
 * files can't be read, the forms are set in the phone's own sans serif rather
 * than not made at all.
 */
export const loadFontCss = (): Promise<string> => {
  if (!fontCss) {
    fontCss = Promise.all(
      FONT_FILES.map(async ([module, weight]) => {
        const asset = Asset.fromModule(module);
        await asset.downloadAsync();
        const base64 = await new File(asset.localUri ?? asset.uri).base64();
        return `@font-face{font-family:'Figtree';font-style:normal;font-weight:${weight};src:url(data:font/ttf;base64,${base64}) format('truetype');}`;
      })
    )
      .then((faces) => faces.join(""))
      .catch((error) => {
        console.warn("Could not read the font for paper forms:", error);
        // Try again next time; this PDF goes without
        fontCss = null;
        return "";
      });
  }
  return fontCss;
};

/** Forgets the font read earlier. For tests. */
export const resetFontCssForTests = () => {
  fontCss = null;
};

/** Draws the HTML as a PDF and keeps it in the app's documents under `fileName`. */
const savePdf = async (html: string, fileName: string, expectedPages: number): Promise<SavedPdf> => {
  const printed = await Print.printToFileAsync({ html, ...A4, margins: NO_MARGINS });
  const target = new File(Paths.document, fileName);
  await new File(printed.uri).move(target, { overwrite: true });
  return { uri: target.uri, fileName, pages: printed.numberOfPages || expectedPages };
};

/**
 * Makes the form's PDF, `count` copies of it, and keeps it in the app's documents.
 *
 * @throws {Error} If the PDF can't be made or kept; the screen tells the person.
 */
export const savePaperForm = async (
  id: PaperFormId,
  letterhead: Letterhead,
  count: number
): Promise<SavedPdf> => {
  const form = paperFormById(id);
  if (!form) throw new Error(`There is no paper form called ${id}`);
  const copies = clampCount(count);
  return savePdf(
    formHtml(id, letterhead, copies, await loadFontCss()),
    pdfFileName(form),
    copies * form.pagesPerCopy
  );
};

/**
 * Makes the full kit, every form once, and keeps it in the app's documents.
 *
 * @throws {Error} If the PDF can't be made or kept; the screen tells the person.
 */
export const savePaperKit = async (letterhead: Letterhead): Promise<SavedPdf> =>
  savePdf(kitHtml(letterhead, await loadFontCss()), FULL_KIT.fileName, FULL_KIT.pages);

const shareOptions = (fileName: string) => ({
  mimeType: "application/pdf",
  dialogTitle: fileName,
  UTI: "com.adobe.pdf",
});

/**
 * Opens the PDF in the phone's PDF viewer on Android (the share sheet when no
 * app takes it), and in the share sheet on iPhone, which can show it.
 */
export const openPdf = async (pdf: SavedPdf): Promise<void> => {
  if (Platform.OS === "android") {
    try {
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: new File(pdf.uri).contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: "application/pdf",
      });
      return;
    } catch (error) {
      console.warn("No app opened the PDF, sharing it instead:", error);
    }
  }
  await Sharing.shareAsync(pdf.uri, shareOptions(pdf.fileName));
};

/** The phone's print screen, for a Wi-Fi printer or saving elsewhere as PDF. */
export const printPdf = async (pdf: SavedPdf): Promise<void> => {
  await Print.printAsync({ uri: pdf.uri, margins: NO_MARGINS });
};

/** The share sheet: WhatsApp, email, Drive, a print shop's number. */
export const sharePdf = async (pdf: SavedPdf): Promise<void> => {
  await Sharing.shareAsync(pdf.uri, shareOptions(pdf.fileName));
};

/**
 * Whether the person closed the print screen without printing. expo-print
 * rejects then on some phones; that isn't an error to show.
 */
export const isPrintCancelled = (error: unknown): boolean =>
  error instanceof Error && /cancel/i.test(error.message);
