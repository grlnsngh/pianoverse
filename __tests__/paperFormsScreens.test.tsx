jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: jest.fn(() => ({ id: "rent_card" })),
}));
jest.mock("@/lib/paperPdf", () => ({
  savePaperForm: jest.fn(),
  savePaperKit: jest.fn(),
  openPdf: jest.fn(async () => undefined),
  printPdf: jest.fn(async () => undefined),
  sharePdf: jest.fn(async () => undefined),
  isPrintCancelled: (error: unknown) => error instanceof Error && /cancel/i.test(error.message),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { act } from "react-test-renderer";
import { router, useLocalSearchParams } from "expo-router";
import PaperFormDetail from "@/app/paper-form/[id]";
import PaperForms from "@/app/paper-forms";
import PaperSavedSheet from "@/components/PaperSavedSheet";
import { loadLetterhead, saveLetterhead } from "@/lib/letterheadStorage";
import { openPdf, printPdf, savePaperForm, savePaperKit, sharePdf } from "@/lib/paperPdf";
import { EMPTY_LETTERHEAD } from "@/utils/letterhead";
import {
  allTexts,
  captureToastCalls,
  createTestStore,
  flushPromises,
  inputValue,
  pressLabel,
  renderWithStore,
  typeInto,
} from "./helpers/render";

/** The Paper forms screen and a form's screen (PaperForms, PaperFormDetail and PaperSaved boards). */

const madeCard = { uri: "file:///docs/Rent card.pdf", fileName: "Rent card.pdf", pages: 2 };
const madeKit = { uri: "file:///docs/Paper forms kit.pdf", fileName: "Paper forms kit.pdf", pages: 5 };

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "rent_card" });
  (savePaperForm as jest.Mock).mockResolvedValue(madeCard);
  (savePaperKit as jest.Mock).mockResolvedValue(madeKit);
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const render = async (screen: React.ReactElement) => {
  const renderer = renderWithStore(screen, createTestStore());
  await flushPromises();
  return renderer;
};

const savedSheet = (renderer: any) => renderer.root.findByType(PaperSavedSheet);

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
    expect(texts).toContain("All 5 forms in one PDF, 5 pages");
    expect(texts).toContain("Get the full kit");
    for (const title of ["Rent card", "Rent receipts", "Piano register", "Rental register", "Handover and return"]) {
      expect(texts).toContain(title);
    }
    expect(texts).toContain("One per rental, 12 months of payments");
    expect(texts).toContain("Print at home or at a shop");
    expect(texts).toContain("Private by design");
    expect(texts.indexOf("The full kit")).toBeLessThan(texts.indexOf("One form at a time"));
    expect(texts.indexOf("Handover and return")).toBeLessThan(texts.indexOf("Good to know"));
  });

  it("opens a form's own screen", async () => {
    const renderer = await render(<PaperForms />);

    await pressLabel(renderer.root, "Rent receipts. Three to a page, each with an office copy");

    expect(router.push).toHaveBeenCalledWith("/paper-form/receipts");
  });

  it("goes back to Account", async () => {
    const renderer = await render(<PaperForms />);

    await pressLabel(renderer.root, "Back");
    expect(router.back).toHaveBeenCalled();

    (router.canGoBack as jest.Mock).mockReturnValueOnce(false);
    await pressLabel(renderer.root, "Back");
    expect(router.replace).toHaveBeenCalledWith("/profile");
  });

  it("makes the full kit with the saved business details, then says it is ready", async () => {
    await saveLetterhead({ ...EMPTY_LETTERHEAD, business: "Tune and Play" });
    const renderer = await render(<PaperForms />);

    await pressLabel(renderer.root, "Get the full kit");

    expect(savePaperKit).toHaveBeenCalledWith(expect.objectContaining({ business: "Tune and Play" }));
    expect(savedSheet(renderer).props.visible).toBe(true);
    const texts = allTexts(renderer.root);
    expect(texts).toContain("Paper forms kit is ready");
    expect(texts).toContain("Paper forms kit.pdf");
    expect(texts).toContain("5 pages · A4 · on this phone");

    await pressLabel(renderer.root, "Open");
    expect(openPdf).toHaveBeenCalledWith(madeKit);
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
  it("shows the form, how its paper is used and what is on it", async () => {
    const renderer = await render(<PaperFormDetail />);
    const texts = allTexts(renderer.root);

    expect(texts).toContain("Rent card");
    expect(texts).toContain("A4 · 1 page per card");
    expect(texts).toContain("Customer, piano, rent, and 12 months of payments");
    expect(texts).toContain("Printed at the top");
    expect(texts).toContain("Leave them empty to write by hand. Kept on this phone only.");
    expect(texts).toContain("Cards");
    expect(texts).toContain("One page each");
    expect(texts).toContain("Made on this phone. What you write stays with you.");
  });

  it("fills in the business details saved on this phone", async () => {
    await saveLetterhead({ ...EMPTY_LETTERHEAD, business: "Tune and Play", phone: "98140 12345" });
    const renderer = await render(<PaperFormDetail />);

    expect(inputValue(renderer.root, "Business")).toBe("Tune and Play");
    expect(inputValue(renderer.root, "Phone")).toBe("98140 12345");
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

  it("saves the PDF with what was typed and the copies, remembers the details, and says it is ready", async () => {
    const renderer = await render(<PaperFormDetail />);
    typeInto(renderer.root, "Business", "Tune and Play");
    typeInto(renderer.root, "Phone", "98140 12345");
    await pressLabel(renderer.root, "More cards");

    await pressLabel(renderer.root, "Save PDF");

    expect(savePaperForm).toHaveBeenCalledWith(
      "rent_card",
      expect.objectContaining({ business: "Tune and Play", phone: "98140 12345" }),
      2
    );
    expect(await loadLetterhead()).toEqual({
      ...EMPTY_LETTERHEAD,
      business: "Tune and Play",
      phone: "98140 12345",
    });
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

  it("explains a form that isn't there, and goes back to the list", async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "nonsense" });
    const renderer = await render(<PaperFormDetail />);

    expect(allTexts(renderer.root)).toContain("This form isn’t here");
    await pressLabel(renderer.root, "See all forms");
    expect(router.replace).toHaveBeenCalledWith("/paper-forms");
  });
});
