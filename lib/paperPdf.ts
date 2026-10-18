import { Figtree_400Regular } from "@expo-google-fonts/figtree/400Regular";
import { Figtree_600SemiBold } from "@expo-google-fonts/figtree/600SemiBold";
import { Figtree_700Bold } from "@expo-google-fonts/figtree/700Bold";
import { Lora_400Regular } from "@expo-google-fonts/lora/400Regular";
import { PlayfairDisplay_400Regular } from "@expo-google-fonts/playfair-display/400Regular";
import { PlayfairDisplay_500Medium } from "@expo-google-fonts/playfair-display/500Medium";
import { Asset } from "expo-asset";
import { File, Paths } from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { letterheadImageData } from "@/lib/letterheadImages";
import { DEFAULT_DESIGN, printedPicture, type Letterhead, type LetterheadDesign } from "@/utils/letterhead";
import { agreementHtml, agreementPages } from "@/utils/paperForms/agreements";
import {
  AGREEMENT_KINDS,
  AGREEMENTS,
  clampCount,
  FULL_KIT,
  PAPER_FORMS,
  paperFormById,
  pdfFileName,
  type AgreementKind,
  type PaperFormId,
} from "@/utils/paperForms/catalog";
import { formHtml, kitHtml } from "@/utils/paperForms/forms";
import { paperDocument } from "@/utils/paperForms/html";
import {
  LABEL_TEST_FILE,
  LABELS_FILE,
  labelsDocument,
  sheetsFor,
  testSheetDocument,
  type LabelContent,
  type LabelSizeId,
} from "@/utils/qrLabels";
import {
  builtInPicture,
  fontsForDesign,
  letterheadCss,
  type LetterheadAssets,
} from "@/utils/paperForms/letterheads";

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

type FontId = "figtree400" | "figtree600" | "figtree700" | "lora400" | "playfair400" | "playfair500";

/** The font files the PDFs are set in, from the app's own fonts and the letterhead's. */
const FONT_FILES: Record<FontId, { module: number; family: string; weight: number }> = {
  figtree400: { module: Figtree_400Regular, family: "Figtree", weight: 400 },
  figtree600: { module: Figtree_600SemiBold, family: "Figtree", weight: 600 },
  figtree700: { module: Figtree_700Bold, family: "Figtree", weight: 700 },
  lora400: { module: Lora_400Regular, family: "Lora", weight: 400 },
  playfair400: { module: PlayfairDisplay_400Regular, family: "Playfair Display", weight: 400 },
  playfair500: { module: PlayfairDisplay_500Medium, family: "Playfair Display", weight: 500 },
};

const FIGTREE: FontId[] = ["figtree400", "figtree600", "figtree700"];

const faces = new Map<FontId, Promise<string>>();

/** One @font-face rule, read once; "" (and tried again next time) when its file can't be read. */
const fontFace = (id: FontId): Promise<string> => {
  let face = faces.get(id);
  if (!face) {
    const { module, family, weight } = FONT_FILES[id];
    face = (async () => {
      const asset = Asset.fromModule(module);
      await asset.downloadAsync();
      const base64 = await new File(asset.localUri ?? asset.uri).base64();
      return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};src:url(data:font/ttf;base64,${base64}) format('truetype');}`;
    })().catch((error) => {
      console.warn("Could not read a font for paper forms:", error);
      faces.delete(id);
      return "";
    });
    faces.set(id, face);
  }
  return face;
};

/**
 * The @font-face rules for a PDF: Figtree, and the letterhead's own fonts
 * when its design uses them. A font that can't be read is left out; the PDF is
 * still made, in the phone's own font.
 */
export const loadFontCss = async (design: LetterheadDesign = DEFAULT_DESIGN): Promise<string> =>
  (await Promise.all([...FIGTREE, ...fontsForDesign(design)].map(fontFace))).join("");

/** Forgets the fonts read earlier. For tests. */
export const resetFontCssForTests = () => {
  faces.clear();
};

/**
 * The letterhead's images, read from the phone, for a PDF or a preview: the
 * logo, the uploaded letterhead, and the picture (the grand piano comes with
 * the app; the person's own is read from the phone).
 */
export const loadLetterheadAssets = async (design: LetterheadDesign): Promise<LetterheadAssets> => {
  const picture = printedPicture(design);
  const [logo, image, own] = await Promise.all([
    design.style === "make" ? letterheadImageData(design.logo) : Promise.resolve(null),
    design.style === "upload" ? letterheadImageData(design.upload.image) : Promise.resolve(null),
    picture?.source === "own" ? letterheadImageData(picture.image) : Promise.resolve(null),
  ]);
  return { logo, image, picture: builtInPicture(design) ?? own };
};

/** Everything a document needs besides its pages: the fonts and the letterhead's images. */
export type PaperParts = { fontCss: string; assets: LetterheadAssets };

export const loadPaperParts = async (design: LetterheadDesign): Promise<PaperParts> => {
  const [fontCss, assets] = await Promise.all([loadFontCss(design), loadLetterheadAssets(design)]);
  return { fontCss, assets };
};

/**
 * Draws the HTML as a PDF and keeps it in the app's documents under `fileName`.
 * `textZoom: 100` keeps Android's web view from enlarging the text by the
 * phone's Font size: the pages are laid out for the designed size, so a PDF
 * made on a phone at 150% would otherwise overflow its boxes and pages.
 *
 * The page count is the app's own (`expectedPages`, every page being a box of
 * a fixed size): the number Android's print code returns is only an estimate
 * from the height of the content, and said 2 for a one page card (Expo SDK 58).
 */
const savePdf = async (html: string, fileName: string, expectedPages: number): Promise<SavedPdf> => {
  const printed = await Print.printToFileAsync({ html, ...A4, margins: NO_MARGINS, textZoom: 100 });
  const target = new File(Paths.document, fileName);
  await new File(printed.uri).move(target, { overwrite: true });
  return { uri: target.uri, fileName, pages: expectedPages };
};

/**
 * Makes the form's PDF, `count` copies of it, on the letterhead, and keeps it in the app's documents.
 *
 * @throws {Error} If the PDF can't be made or kept; the screen tells the person.
 */
export const savePaperForm = async (
  id: PaperFormId,
  letterhead: Letterhead,
  count: number,
  design: LetterheadDesign = DEFAULT_DESIGN
): Promise<SavedPdf> => {
  const form = paperFormById(id);
  if (!form) throw new Error(`There is no paper form called ${id}`);
  const copies = clampCount(count);
  const { fontCss, assets } = await loadPaperParts(design);
  return savePdf(
    formHtml(id, letterhead, copies, fontCss, design, assets),
    pdfFileName(form),
    copies * form.pagesPerCopy
  );
};

/**
 * Makes a rental agreement's PDF, `count` copies of its pages, and keeps it in the app's documents.
 *
 * @throws {Error} If the PDF can't be made or kept; the screen tells the person.
 */
export const saveAgreement = async (
  kind: AgreementKind,
  letterhead: Letterhead,
  count: number,
  design: LetterheadDesign = DEFAULT_DESIGN
): Promise<SavedPdf> => {
  const agreement = AGREEMENTS[kind];
  const copies = clampCount(count);
  const { fontCss, assets } = await loadPaperParts(design);
  return savePdf(
    agreementHtml(kind, letterhead, copies, fontCss, design, assets),
    agreement.fileName,
    copies * agreement.pagesPerCopy
  );
};

/**
 * Makes the full kit, every form once and both agreements, and keeps it in the app's documents.
 *
 * @throws {Error} If the PDF can't be made or kept; the screen tells the person.
 */
export const savePaperKit = async (
  letterhead: Letterhead,
  design: LetterheadDesign = DEFAULT_DESIGN
): Promise<SavedPdf> => {
  const { fontCss, assets } = await loadPaperParts(design);
  return savePdf(kitHtml(letterhead, fontCss, design, assets), FULL_KIT.fileName, FULL_KIT.pages);
};

/**
 * Makes the sheets of QR labels, one page per A4 sticker sheet, and keeps the PDF in the app's documents.
 *
 * @throws {Error} If the PDF can't be made or kept; the screen tells the person.
 */
export const savePianoLabels = async (labels: readonly LabelContent[], size: LabelSizeId): Promise<SavedPdf> => {
  const fontCss = await loadFontCss();
  return savePdf(labelsDocument(labels, size, fontCss), LABELS_FILE, sheetsFor(labels.length, size));
};

/**
 * A test sheet for the labels: every place a label goes as a box, to print on plain paper and hold against the stickers.
 *
 * @throws {Error} If the PDF can't be made or kept; the screen tells the person.
 */
export const saveLabelTestSheet = async (size: LabelSizeId, sample: LabelContent): Promise<SavedPdf> => {
  const fontCss = await loadFontCss();
  return savePdf(testSheetDocument(size, sample, fontCss), LABEL_TEST_FILE, 1);
};

const TEST_PAGE_FILE = "Letterhead test page.pdf";

/**
 * A test page for "My printed paper": the first page of the hotel agreement,
 * to print on plain paper and hold against the pad.
 *
 * @throws {Error} If the PDF can't be made or kept; the screen tells the person.
 */
export const saveTestPage = async (letterhead: Letterhead, design: LetterheadDesign): Promise<SavedPdf> => {
  const { fontCss, assets } = await loadPaperParts(design);
  const [first] = agreementPages("hotel", letterhead, design, assets);
  return savePdf(paperDocument("Test page", [first], fontCss + letterheadCss(assets)), TEST_PAGE_FILE, 1);
};

/**
 * Deletes the PDFs kept in the app's documents, which carry the business's
 * letterhead and details: at sign out and on deleting the account. Ones that
 * were shared or saved elsewhere stay where they went.
 */
export const forgetPaperPdfs = () => {
  const names = [
    ...PAPER_FORMS.map(pdfFileName),
    ...AGREEMENT_KINDS.map((kind) => AGREEMENTS[kind].fileName),
    FULL_KIT.fileName,
    TEST_PAGE_FILE,
    LABELS_FILE,
    LABEL_TEST_FILE,
  ];
  for (const name of names) {
    try {
      const file = new File(Paths.document, name);
      if (file.exists) file.delete();
    } catch (error) {
      console.warn(`Could not delete ${name}:`, error);
    }
  }
};

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
