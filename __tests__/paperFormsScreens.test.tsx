jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: jest.fn(() => ({ id: "rent_card" })),
}));
jest.mock("@/lib/formEvents", () => ({ recordFormEvent: jest.fn() }));
jest.mock("@/lib/paperPdf", () => ({
  savePaperForm: jest.fn(),
  savePaperKit: jest.fn(),
  saveAgreement: jest.fn(),
  loadPaperParts: jest.fn(async () => ({ fontCss: "", assets: { logo: null, image: null } })),
  openPdf: jest.fn(async () => undefined),
  printPdf: jest.fn(async () => undefined),
  sharePdf: jest.fn(async () => undefined),
  isPrintCancelled: (error: unknown) => error instanceof Error && /cancel/i.test(error.message),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { act } from "react-test-renderer";
import { router, useLocalSearchParams } from "expo-router";
import PaperAgreement from "@/app/paper-agreement";
import PaperFormDetail from "@/app/paper-form/[id]";
import PaperForms from "@/app/paper-forms";
import PaperSavedSheet from "@/components/PaperSavedSheet";
import { recordFormEvent } from "@/lib/formEvents";
import { resetLetterheadStoreForTests } from "@/lib/letterheadStore";
import { saveLetterhead, saveLetterheadDesign } from "@/lib/letterheadStorage";
import { openPdf, printPdf, saveAgreement, savePaperForm, savePaperKit, sharePdf } from "@/lib/paperPdf";
import { DEFAULT_DESIGN, EMPTY_LETTERHEAD } from "@/utils/letterhead";
import {
  allTexts,
  captureToastCalls,
  createTestStore,
  flushPromises,
  pressLabel,
  renderWithStore,
} from "./helpers/render";

/** The Paper forms screen and a form's screen (PaperForms, PaperFormDetail and PaperSaved boards). */

const madeCard = { uri: "file:///docs/Rent card.pdf", fileName: "Rent card.pdf", pages: 2 };
const madeKit = { uri: "file:///docs/Paper forms kit.pdf", fileName: "Paper forms kit.pdf", pages: 9 };
const madeAgreement = {
  uri: "file:///docs/Rental agreement (hotel).pdf",
  fileName: "Rental agreement (hotel).pdf",
  pages: 4,
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  resetLetterheadStoreForTests();
  (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "rent_card" });
  (savePaperForm as jest.Mock).mockResolvedValue(madeCard);
  (savePaperKit as jest.Mock).mockResolvedValue(madeKit);
  (saveAgreement as jest.Mock).mockResolvedValue(madeAgreement);
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const render = async (screen: React.ReactElement) => {
  const renderer = renderWithStore(screen, createTestStore({ user: { accountId: "account-1" } }));
  await flushPromises();
  return renderer;
};

const savedSheet = (renderer: any) => renderer.root.findByType(PaperSavedSheet);

/** The usage counts made, as [form, action, pages]. */
const counts = () =>
  (recordFormEvent as jest.Mock).mock.calls.map(([creator, form, action, pages]) => {
    expect(creator).toBe("account-1");
    return pages === undefined ? [form, action] : [form, action, pages];
  });

/** The pages the previews show, as the web view was given them. */
const previewPages = (renderer: any): string[] =>
  renderer.root
    .findAll((node: any) => typeof node.type === "string" && node.props.testID === "webview" && node.props.source)
    .map((node: any) => node.props.source.html);

/** The letterhead row that opens the Letterhead screen. */
const letterheadRow = (renderer: any) =>
  renderer.root.find(
    (node: any) =>
      typeof node.props.accessibilityLabel === "string" &&
      node.props.accessibilityLabel.startsWith("Letterhead: ") &&
      typeof node.props.onPress === "function"
  );

/** The button labelled `label`, the last one drawn when a closing sheet has one too. */
const button = (renderer: any, label: string) =>
  renderer.root
    .findAll(
      (node: any) => node.props.accessibilityLabel === label && typeof node.props.onPress === "function"
    )
    .pop();

describe("the Paper forms screen", () => {
  it("offers the full kit, then each form, then what is good to know", async () => {
    const renderer = await render(<PaperForms />);
    const texts = allTexts(renderer.root);

    expect(texts).toContain("Paper forms");
    expect(texts).toContain(
      "Prefer pen and paper? Print these and fill them in by hand. The columns match the app."
    );
    expect(texts).toContain("The full kit");
    expect(texts).toContain("All 6 forms in one PDF, 9 pages");
    expect(texts).toContain("Get the full kit");
    for (const title of [
      "Rent card",
      "Rent receipts",
      "Piano register",
      "Rental register",
      "Handover and return",
      "Rental agreement",
    ]) {
      expect(texts).toContain(title);
    }
    expect(texts).toContain("Hotel or private person, your terms printed");
    expect(texts.indexOf("Handover and return")).toBeLessThan(texts.indexOf("Rental agreement"));
    expect(texts).toContain("One per rental, 12 months of payments");
    expect(texts).toContain("Print at home or at a shop");
    expect(texts).toContain("Private by design");
    expect(texts).toContain(
      "Forms are made on this phone, and what you write stays on paper. Pianoverse counts which forms are used, never what’s on them."
    );
    expect(texts.indexOf("The full kit")).toBeLessThan(texts.indexOf("Your letterhead"));
    expect(texts.indexOf("Your letterhead")).toBeLessThan(texts.indexOf("One form at a time"));
    expect(texts).toContain("Monogram · add your business name");
    expect(texts).toContain("On every form and agreement");
    expect(texts.indexOf("Handover and return")).toBeLessThan(texts.indexOf("Good to know"));
  });

  it("opens a form's own screen", async () => {
    const renderer = await render(<PaperForms />);

    await pressLabel(renderer.root, "Rent receipts. Three to a page, each with an office copy");

    expect(router.push).toHaveBeenCalledWith("/paper-form/receipts");
  });

  it("opens the rental agreement's screen", async () => {
    const renderer = await render(<PaperForms />);

    await pressLabel(renderer.root, "Rental agreement. Hotel or private person, your terms printed");

    expect(router.push).toHaveBeenCalledWith("/paper-agreement");
  });

  it("opens the Letterhead screen from the letterhead row", async () => {
    await saveLetterhead({ ...EMPTY_LETTERHEAD, business: "Tune and Play" });
    const renderer = await render(<PaperForms />);

    expect(letterheadRow(renderer).props.accessibilityLabel).toBe(
      "Letterhead: Monogram · Tune and Play. On every form and agreement"
    );
    await act(async () => letterheadRow(renderer).props.onPress());

    expect(router.push).toHaveBeenCalledWith("/letterhead");
  });

  it("goes back to Account", async () => {
    const renderer = await render(<PaperForms />);

    await pressLabel(renderer.root, "Back");
    expect(router.back).toHaveBeenCalled();

    (router.canGoBack as jest.Mock).mockReturnValueOnce(false);
    await pressLabel(renderer.root, "Back");
    expect(router.replace).toHaveBeenCalledWith("/profile");
  });

  it("makes the full kit with the saved business details and letterhead, then says it is ready", async () => {
    await saveLetterhead({ ...EMPTY_LETTERHEAD, business: "Tune and Play" });
    await saveLetterheadDesign({ ...DEFAULT_DESIGN, template: "band", colour: "navy" });
    const renderer = await render(<PaperForms />);

    await pressLabel(renderer.root, "Get the full kit");

    expect(savePaperKit).toHaveBeenCalledWith(
      expect.objectContaining({ business: "Tune and Play" }),
      expect.objectContaining({ template: "band", colour: "navy" })
    );
    expect(savedSheet(renderer).props.visible).toBe(true);
    const texts = allTexts(renderer.root);
    expect(texts).toContain("Paper forms kit is ready");
    expect(texts).toContain("Paper forms kit.pdf");
    expect(texts).toContain("9 pages · A4 · on this phone");

    await pressLabel(renderer.root, "Open");
    expect(openPdf).toHaveBeenCalledWith(madeKit);
  });

  it("counts the kit saved, and nothing for opening the list", async () => {
    const renderer = await render(<PaperForms />);
    expect(counts()).toEqual([]);

    await pressLabel(renderer.root, "Get the full kit");

    expect(counts()).toEqual([["kit", "saved", 9]]);
  });

  it("says so when the kit can't be made, and stays ready to try again", async () => {
    const toasts = captureToastCalls();
    (savePaperKit as jest.Mock).mockRejectedValueOnce(new Error("WebView gone"));
    const renderer = await render(<PaperForms />);

    await pressLabel(renderer.root, "Get the full kit");

    expect(toasts).toEqual([
      expect.objectContaining({ message: "Couldn’t make the PDF. Try again.", variant: "error" }),
    ]);
    expect(savedSheet(renderer).props.visible).toBe(false);
    expect(button(renderer, "Get the full kit").props.disabled).toBe(false);
  });
});

describe("a form's screen", () => {
  it("shows the real page, what is on it, the letterhead it carries and the copies", async () => {
    const renderer = await render(<PaperFormDetail />);
    const texts = allTexts(renderer.root);

    expect(texts).toContain("Rent card");
    expect(texts).toContain("The real page · A4 · 1 page per card");
    expect(texts).toContain("Customer, piano, rent, and 12 months of payments");
    expect(texts).toContain("Letterhead");
    expect(texts).toContain("The small version goes on this form");
    expect(texts).toContain("Changing it here changes it on every form.");
    expect(texts).toContain("Cards");
    expect(texts).toContain("One page each");
    expect(texts).toContain("Made on this phone. What you write stays with you.");
  });

  it("draws the page with the letterhead saved on this phone, and opens the Letterhead screen to change it", async () => {
    await saveLetterhead({ ...EMPTY_LETTERHEAD, business: "Tune and Play", phone: "98140 12345" });
    const renderer = await render(<PaperFormDetail />);

    const [page] = previewPages(renderer);
    expect(page).toContain("Customer name");
    expect(page).toContain("transform:scale(");
    expect(allTexts(renderer.root)).toContain("Monogram · Tune and Play");

    await act(async () => letterheadRow(renderer).props.onPress());
    expect(router.push).toHaveBeenCalledWith("/letterhead");
  });

  it("tells each form where its letterhead goes", async () => {
    const hints = {
      receipts: "The small version goes on each receipt",
      piano_register: "The small version goes on this form",
      handover: "The small version goes on this form",
    };
    for (const [id, hint] of Object.entries(hints)) {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id });
      const renderer = await render(<PaperFormDetail />);
      expect(allTexts(renderer.root)).toContain(hint);
      act(() => renderer.unmount());
    }
  });

  it("counts copies from 1 to 20", async () => {
    const renderer = await render(<PaperFormDetail />);

    expect(button(renderer, "Fewer cards").props.disabled).toBe(true);
    await pressLabel(renderer.root, "More cards");
    await pressLabel(renderer.root, "More cards");
    expect(allTexts(renderer.root)).toContain("3");
    await pressLabel(renderer.root, "Fewer cards");
    expect(allTexts(renderer.root)).toContain("2");

    for (let i = 0; i < 25; i++) {
      const more = button(renderer, "More cards");
      if (more.props.disabled) break;
      await act(async () => more.props.onPress());
    }
    expect(allTexts(renderer.root)).toContain("20");
    expect(button(renderer, "More cards").props.disabled).toBe(true);
  });

  it("saves the PDF with the letterhead and the copies, and says it is ready", async () => {
    const details = { ...EMPTY_LETTERHEAD, business: "Tune and Play", phone: "98140 12345" };
    await saveLetterhead(details);
    await saveLetterheadDesign({ ...DEFAULT_DESIGN, style: "printed" });
    const renderer = await render(<PaperFormDetail />);
    await pressLabel(renderer.root, "More cards");

    await pressLabel(renderer.root, "Save PDF");

    expect(savePaperForm).toHaveBeenCalledWith(
      "rent_card",
      details,
      2,
      expect.objectContaining({ style: "printed" })
    );
    const texts = allTexts(renderer.root);
    expect(texts).toContain("Rent card is ready");
    expect(texts).toContain("Rent card.pdf");
    expect(texts).toContain("2 pages · A4 · on this phone");
    expect(texts).toContain("Print sends it to a Wi-Fi printer. Share sends it on WhatsApp, by email or to Drive.");
  });

  it("prints or shares the PDF just made from the ready sheet", async () => {
    const renderer = await render(<PaperFormDetail />);
    await pressLabel(renderer.root, "Save PDF");
    const sheet = savedSheet(renderer);

    await act(async () => sheet.props.onPrint());
    await act(async () => sheet.props.onShare());

    expect(printPdf).toHaveBeenCalledWith(madeCard);
    expect(sharePdf).toHaveBeenCalledWith(madeCard);
    expect(savePaperForm).toHaveBeenCalledTimes(1);
  });

  it("closes the ready sheet and keeps the PDF to show while it leaves", async () => {
    const renderer = await render(<PaperFormDetail />);
    await pressLabel(renderer.root, "Save PDF");

    await act(async () => savedSheet(renderer).props.onClose());

    expect(savedSheet(renderer).props.visible).toBe(false);
    expect(savedSheet(renderer).props.pdf).toEqual(madeCard);
  });

  it("makes the PDF and goes straight to printing with Print, and to sharing with Share", async () => {
    const renderer = await render(<PaperFormDetail />);

    await pressLabel(renderer.root, "Print");
    expect(printPdf).toHaveBeenCalledWith(madeCard);

    await pressLabel(renderer.root, "Share");
    expect(sharePdf).toHaveBeenCalledWith(madeCard);

    expect(savePaperForm).toHaveBeenCalledTimes(2);
    expect(savedSheet(renderer).props.visible).toBe(false);
  });

  it("says nothing when the print screen is closed without printing, and explains a real failure", async () => {
    const toasts = captureToastCalls();
    const renderer = await render(<PaperFormDetail />);

    (printPdf as jest.Mock).mockRejectedValueOnce(new Error("Print job was cancelled"));
    await pressLabel(renderer.root, "Print");
    expect(toasts).toEqual([]);

    (printPdf as jest.Mock).mockRejectedValueOnce(new Error("No print service"));
    await pressLabel(renderer.root, "Print");
    expect(toasts).toEqual([
      expect.objectContaining({ message: "Couldn’t print. Try Share instead.", variant: "error" }),
    ]);
  });

  it("does one thing at a time: the other buttons wait while the PDF is made", async () => {
    let finish: (pdf: typeof madeCard) => void = () => {};
    (savePaperForm as jest.Mock).mockImplementationOnce(
      () => new Promise((resolve) => (finish = resolve))
    );
    const renderer = await render(<PaperFormDetail />);

    act(() => {
      button(renderer, "Save PDF").props.onPress();
    });
    await flushPromises();

    expect(allTexts(renderer.root)).toContain("Making PDF");
    expect(button(renderer, "Print").props.disabled).toBe(true);
    expect(button(renderer, "Share").props.disabled).toBe(true);

    await act(async () => finish(madeCard));
    await flushPromises();
    expect(button(renderer, "Print").props.disabled).toBe(false);
  });

  it("counts the form opened, and each PDF saved, printed and shared with its pages", async () => {
    const renderer = await render(<PaperFormDetail />);
    expect(counts()).toEqual([["rent_card", "opened"]]);

    await pressLabel(renderer.root, "Save PDF");
    await act(async () => savedSheet(renderer).props.onPrint());
    await act(async () => savedSheet(renderer).props.onShare());
    await act(async () => savedSheet(renderer).props.onOpen());
    await pressLabel(renderer.root, "Print");
    await pressLabel(renderer.root, "Share");

    expect(counts()).toEqual([
      ["rent_card", "opened"],
      ["rent_card", "saved", 2],
      ["rent_card", "printed", 2],
      ["rent_card", "shared", 2],
      ["rent_card", "printed", 2],
      ["rent_card", "shared", 2],
    ]);
  });

  it("counts nothing that didn't happen: a PDF not made, or a print screen closed", async () => {
    const renderer = await render(<PaperFormDetail />);

    (savePaperForm as jest.Mock).mockRejectedValueOnce(new Error("WebView gone"));
    await pressLabel(renderer.root, "Save PDF");
    (printPdf as jest.Mock).mockRejectedValueOnce(new Error("Print job was cancelled"));
    await pressLabel(renderer.root, "Print");

    expect(counts()).toEqual([["rent_card", "opened"]]);
  });

  it("counts the form opened once, not again as the screen draws", async () => {
    const renderer = await render(<PaperFormDetail />);
    await pressLabel(renderer.root, "More cards");
    await pressLabel(renderer.root, "More cards");

    expect(counts()).toEqual([["rent_card", "opened"]]);
  });

  it("explains a form that isn't there, and goes back to the list", async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "nonsense" });
    const renderer = await render(<PaperFormDetail />);

    expect(allTexts(renderer.root)).toContain("This form isn’t here");
    await pressLabel(renderer.root, "See all forms");
    expect(router.replace).toHaveBeenCalledWith("/paper-forms");
    expect(counts()).toEqual([]);
  });
});

describe("the rental agreement's screen", () => {
  beforeEach(() => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
  });

  const choice = (renderer: any, label: string) =>
    renderer.root.find(
      (node: any) => node.props.accessibilityRole === "tab" && node.props.accessibilityLabel === label
    );

  it("starts with the hotel agreement, its two real pages, the letterhead and two copies", async () => {
    const renderer = await render(<PaperAgreement />);
    const texts = allTexts(renderer.root);

    expect(texts).toContain("Rental agreement");
    expect(choice(renderer, "Hotel").props.accessibilityState).toEqual({ selected: true });
    expect(texts).toContain("Your hotel agreement, with GST, designation and a hotel stamp");
    expect(texts).toContain("The real pages · A4 · your terms printed");
    expect(texts).toContain("Letterhead");
    expect(texts).toContain("Full on page 1, small on the pages after");
    expect(texts).toContain("Copies");
    expect(texts).toContain("One for each side to keep");
    expect(texts).toContain("2");
    const [first, second] = previewPages(renderer);
    expect(first).toContain("PIANO RENTAL AGREEMENT");
    expect(first).toContain("Page 1 of 2");
    expect(second).toContain("Page 2 of 2");
    expect(second).toContain("Hotel stamp");
  });

  it("switches to the private person's agreement", async () => {
    const renderer = await render(<PaperAgreement />);

    await act(async () => choice(renderer, "Private person").props.onPress());

    expect(allTexts(renderer.root)).toContain(
      "The same terms for one person: ID seen, a refundable deposit, no stamp"
    );
    expect(previewPages(renderer)[1]).toContain("Piano rental agreement · private person");
  });

  it("opens on the private person's agreement when asked to", async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ kind: "private" });
    const renderer = await render(<PaperAgreement />);

    expect(choice(renderer, "Private person").props.accessibilityState).toEqual({ selected: true });
  });

  it("uses the letterhead saved on this phone, the same one as the forms, and opens the Letterhead screen", async () => {
    await saveLetterhead({ ...EMPTY_LETTERHEAD, business: "Tune and Play", phone: "98140 12345" });
    await saveLetterheadDesign({ ...DEFAULT_DESIGN, style: "none" });
    const renderer = await render(<PaperAgreement />);

    expect(allTexts(renderer.root)).toContain("No letterhead · just the document");
    await act(async () => letterheadRow(renderer).props.onPress());
    expect(router.push).toHaveBeenCalledWith("/letterhead");
  });

  it("saves the agreement chosen with the letterhead and the copies, and says it is ready", async () => {
    const expected = {
      ...EMPTY_LETTERHEAD,
      business: "Tune and Play",
      tagline: "Tuning and rentals",
      address: "Sector 17, Chandigarh",
      email: "hello@tuneandplay.in",
      pan: "ABCDE1234F",
    };
    await saveLetterhead(expected);
    const renderer = await render(<PaperAgreement />);
    await act(async () => choice(renderer, "Private person").props.onPress());
    await pressLabel(renderer.root, "Fewer copies");
    (saveAgreement as jest.Mock).mockResolvedValueOnce({
      uri: "file:///docs/Rental agreement (private).pdf",
      fileName: "Rental agreement (private).pdf",
      pages: 2,
    });

    await pressLabel(renderer.root, "Save PDF");

    expect(saveAgreement).toHaveBeenCalledWith("private", expected, 1, DEFAULT_DESIGN);
    const texts = allTexts(renderer.root);
    expect(texts).toContain("Private rental agreement is ready");
    expect(texts).toContain("Rental agreement (private).pdf");
    expect(texts).toContain("2 pages · A4 · on this phone");
  });

  it("prints and shares straight away, and opens the PDF from the ready sheet", async () => {
    const renderer = await render(<PaperAgreement />);

    await pressLabel(renderer.root, "Print");
    expect(saveAgreement).toHaveBeenLastCalledWith("hotel", EMPTY_LETTERHEAD, 2, DEFAULT_DESIGN);
    expect(printPdf).toHaveBeenCalledWith(madeAgreement);

    await pressLabel(renderer.root, "Share");
    expect(sharePdf).toHaveBeenCalledWith(madeAgreement);

    await pressLabel(renderer.root, "Save PDF");
    expect(allTexts(renderer.root)).toContain("Hotel rental agreement is ready");
    await act(async () => savedSheet(renderer).props.onOpen());
    expect(openPdf).toHaveBeenCalledWith(madeAgreement);
  });

  it("counts each agreement opened, and the one saved", async () => {
    const renderer = await render(<PaperAgreement />);
    await act(async () => choice(renderer, "Private person").props.onPress());

    await pressLabel(renderer.root, "Save PDF");

    expect(counts()).toEqual([
      ["agreement_hotel", "opened"],
      ["agreement_private", "opened"],
      ["agreement_private", "saved", 4],
    ]);
  });

  it("says so when the agreement can't be made", async () => {
    const toasts = captureToastCalls();
    (saveAgreement as jest.Mock).mockRejectedValueOnce(new Error("WebView gone"));
    const renderer = await render(<PaperAgreement />);

    await pressLabel(renderer.root, "Save PDF");

    expect(toasts).toEqual([
      expect.objectContaining({ message: "Couldn’t make the PDF. Try again.", variant: "error" }),
    ]);
  });

  it("goes back to the list of forms", async () => {
    const renderer = await render(<PaperAgreement />);

    (router.canGoBack as jest.Mock).mockReturnValueOnce(false);
    await pressLabel(renderer.root, "Back");

    expect(router.replace).toHaveBeenCalledWith("/paper-forms");
  });
});
