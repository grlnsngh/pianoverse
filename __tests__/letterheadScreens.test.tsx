jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock("@/lib/formEvents", () => ({ recordFormEvent: jest.fn() }));
jest.mock("@/lib/paperPdf", () => ({
  loadPaperParts: jest.fn(async () => ({ fontCss: "", assets: { logo: null, image: null } })),
  saveTestPage: jest.fn(),
  openPdf: jest.fn(async () => undefined),
  printPdf: jest.fn(async () => undefined),
  sharePdf: jest.fn(async () => undefined),
  isPrintCancelled: (error: unknown) => error instanceof Error && /cancel/i.test(error.message),
}));
jest.mock("@/lib/letterheadImages", () => ({
  pickLetterheadImage: jest.fn(),
  deleteLetterheadImage: jest.fn(),
  clearLetterheadImages: jest.fn(),
  letterheadImageUri: (image: { file: string }) => `file:///docs/letterhead/${image.file}`,
  letterheadImageData: jest.fn(async () => null),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { act } from "react-test-renderer";
import { router } from "expo-router";
import LetterheadScreen from "@/app/letterhead";
import LetterheadDetails from "@/app/letterhead-details";
import LetterheadMake from "@/app/letterhead-make";
import LetterheadPrinted from "@/app/letterhead-printed";
import LetterheadUpload from "@/app/letterhead-upload";
import { clearLetterheadImages, deleteLetterheadImage, pickLetterheadImage } from "@/lib/letterheadImages";
import { forgetLetterhead, getLetterheadState, resetLetterheadStoreForTests } from "@/lib/letterheadStore";
import {
  loadLetterhead,
  loadLetterheadDesign,
  saveLetterhead,
  saveLetterheadDesign,
} from "@/lib/letterheadStorage";
import { recordFormEvent } from "@/lib/formEvents";
import { printPdf, saveTestPage } from "@/lib/paperPdf";
import { DEFAULT_DESIGN, EMPTY_LETTERHEAD, type LetterheadDesign } from "@/utils/letterhead";
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

/** The Letterhead screens (canvas page "Letterhead"): the choice, the details, and each way to have one. */

const tps = { ...EMPTY_LETTERHEAD, business: "The Piano Services", phone: "98110 20513" };
const logo = { file: "logo-1.png", width: 600, height: 400 };
const page = { file: "letterhead-1.jpg", width: 1240, height: 1754 };
const testPage = { uri: "file:///docs/Letterhead test page.pdf", fileName: "Letterhead test page.pdf", pages: 1 };

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  resetLetterheadStoreForTests();
  (saveTestPage as jest.Mock).mockResolvedValue(testPage);
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

/** Saved before the screen opens, as if set on an earlier day. */
const saved = async (design: Partial<LetterheadDesign>, details = tps) => {
  await saveLetterhead(details);
  await saveLetterheadDesign({ ...DEFAULT_DESIGN, ...design });
};

const byRole = (renderer: any, role: string, label: string) =>
  renderer.root.find(
    (node: any) =>
      node.props.accessibilityRole === role &&
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === "function"
  );

const isChecked = (renderer: any, role: string, label: string) =>
  byRole(renderer, role, label).props.accessibilityState.checked;

/** The page the preview shows, as the web view was given it. */
const previewPage = (renderer: any): string =>
  renderer.root.find(
    (node: any) => typeof node.type === "string" && node.props.testID === "webview" && node.props.source
  ).props.source.html;

const slider = (renderer: any, label: string) =>
  renderer.root.find(
    (node: any) => node.props.accessibilityRole === "adjustable" && node.props.accessibilityLabel === label
  );

/** Moves the slider a step, the way a screen reader does. */
const step = (renderer: any, label: string, actionName: "increment" | "decrement", times = 1) => {
  for (let i = 0; i < times; i++) {
    act(() => slider(renderer, label).props.onAccessibilityAction({ nativeEvent: { actionName } }));
  }
};

describe("the Letterhead screen", () => {
  it("shows the real page, the four styles with the chosen one, the details and where it is used", async () => {
    await saved({});
    const renderer = await render(<LetterheadScreen />);
    const texts = allTexts(renderer.root);

    expect(texts).toContain("Letterhead");
    expect(texts).toContain("The real page, as it will print");
    expect(texts).toContain("Rental agreement, page 1");
    for (const title of ["None", "My printed paper", "Make one", "Upload mine"]) expect(texts).toContain(title);
    expect(isChecked(renderer, "radio", "Make one. Pick a design, add your logo and details")).toBe(true);
    expect(isChecked(renderer, "radio", "None. Just the document. Clean and simple.")).toBe(false);
    expect(texts).toContain("Monogram · The Piano Services");
    expect(texts).toContain("The Piano Services");
    expect(texts).toContain("98110 20513");
    expect(texts).toContain("Rent card, receipts, handover");
    expect(texts).toContain("Kept plain: they’re your own records");
    expect(texts).toContain("Kept on this phone. Nothing is uploaded.");
    expect(previewPage(renderer)).toContain("THE PIANO SERVICES");
  });

  it("keeps the style chosen, and offers the next step for it", async () => {
    const renderer = await render(<LetterheadScreen />);

    await pressLabel(renderer.root, "My printed paper. Leaves space for your letterhead pad");
    expect(getLetterheadState().design.style).toBe("printed");
    expect(allTexts(renderer.root)).toContain("My printed paper · top 45 mm left empty");
    await pressLabel(renderer.root, "Adjust");
    expect(router.push).toHaveBeenLastCalledWith("/letterhead-printed");

    await pressLabel(renderer.root, "Upload mine. Your own letterhead image, from Canva or a scan");
    expect(allTexts(renderer.root)).toContain("Upload mine · no image yet");
    await pressLabel(renderer.root, "Choose image");
    expect(router.push).toHaveBeenLastCalledWith("/letterhead-upload");

    await pressLabel(renderer.root, "Make one. Pick a design, add your logo and details");
    await pressLabel(renderer.root, "Edit");
    expect(router.push).toHaveBeenLastCalledWith("/letterhead-make");

    await pressLabel(renderer.root, "None. Just the document. Clean and simple.");
    expect(renderer.root.findAll((node: any) => node.props.accessibilityLabel === "Edit")).toHaveLength(0);
    await flushPromises();
    expect((await loadLetterheadDesign()).style).toBe("none");
  });

  it("opens the details, asking for the business name when there is none", async () => {
    const renderer = await render(<LetterheadScreen />);

    expect(allTexts(renderer.root)).toContain("Add your business name");
    await pressLabel(renderer.root, "Your details. Add your business name");

    expect(router.push).toHaveBeenCalledWith("/letterhead-details");
  });

  it("goes back to the paper forms", async () => {
    const renderer = await render(<LetterheadScreen />);

    (router.canGoBack as jest.Mock).mockReturnValueOnce(false);
    await pressLabel(renderer.root, "Back");

    expect(router.replace).toHaveBeenCalledWith("/paper-forms");
  });
});

describe("your details", () => {
  it("shows what is saved, and saves what is typed for every form at once", async () => {
    await saved({});
    const renderer = await render(<LetterheadDetails />);

    expect(inputValue(renderer.root, "Business")).toBe("The Piano Services");
    expect(inputValue(renderer.root, "Phone")).toBe("98110 20513");
    for (const label of ["What you do", "Address", "Email", "GST No.", "PAN"]) {
      expect(inputValue(renderer.root, label)).toBe("");
    }

    typeInto(renderer.root, "GST No.", "07AAMFT8696F1ZF");
    typeInto(renderer.root, "What you do", "Expert Piano Tuning");
    await flushPromises();

    expect(getLetterheadState().details).toMatchObject({ gst: "07AAMFT8696F1ZF", tagline: "Expert Piano Tuning" });
    expect(await loadLetterhead()).toEqual({ ...tps, gst: "07AAMFT8696F1ZF", tagline: "Expert Piano Tuning" });
  });

  it("keeps what is typed before the saved details are read", async () => {
    await saved({});
    resetLetterheadStoreForTests();
    const renderer = renderWithStore(<LetterheadDetails />, createTestStore());
    typeInto(renderer.root, "Business", "Tune and Play");
    await flushPromises();

    expect(inputValue(renderer.root, "Business")).toBe("Tune and Play");
  });
});

describe("making a letterhead", () => {
  it("shows the top of the page and the design, colour, logo and lettering chosen", async () => {
    await saved({});
    const renderer = await render(<LetterheadMake />);
    const texts = allTexts(renderer.root);

    expect(texts).toContain("Make a letterhead");
    expect(texts).toContain("The top of an A4 page, as it will print");
    for (const name of ["Monogram", "Classic", "Modern", "Band", "Minimal"]) expect(texts).toContain(name);
    expect(isChecked(renderer, "radio", "Monogram design")).toBe(true);
    expect(isChecked(renderer, "radio", "Copper")).toBe(true);
    expect(texts).toContain("No logo");
    expect(texts).toContain("TPS");
    expect(byRole(renderer, "tab", "Elegant").props.accessibilityState).toEqual({ selected: true });
    expect(previewPage(renderer)).toContain("THE PIANO SERVICES");
  });

  it("keeps the design, colour and lettering chosen, and makes Make one the style", async () => {
    await saved({ style: "none" });
    const renderer = await render(<LetterheadMake />);

    await pressLabel(renderer.root, "Band design");
    await pressLabel(renderer.root, "Navy");
    await act(async () => byRole(renderer, "tab", "Clean").props.onPress());
    await flushPromises();

    expect(getLetterheadState().design).toMatchObject({ style: "make", template: "band", colour: "navy", elegant: false });
    expect(isChecked(renderer, "radio", "Band design")).toBe(true);
    expect(await loadLetterheadDesign()).toMatchObject({ template: "band", colour: "navy", elegant: false });
  });

  it("draws a design already in the preview, even when another style is chosen", async () => {
    await saved({ style: "none", template: "band", colour: "navy" });
    const renderer = await render(<LetterheadMake />);

    expect(previewPage(renderer)).toContain("background:#1F3A5F");
  });

  it("adds a logo from the photos, changes it, and removes it", async () => {
    await saved({});
    (pickLetterheadImage as jest.Mock).mockResolvedValueOnce(logo);
    const renderer = await render(<LetterheadMake />);

    await pressLabel(renderer.root, "Add a logo");
    expect(pickLetterheadImage).toHaveBeenCalledWith("logo");
    expect(getLetterheadState().design.logo).toEqual(logo);
    expect(allTexts(renderer.root)).toContain("Your logo");

    const second = { ...logo, file: "logo-2.png" };
    (pickLetterheadImage as jest.Mock).mockResolvedValueOnce(second);
    await pressLabel(renderer.root, "Change the logo");
    expect(deleteLetterheadImage).toHaveBeenLastCalledWith(logo);
    expect(getLetterheadState().design.logo).toEqual(second);

    await pressLabel(renderer.root, "Remove the logo");
    expect(deleteLetterheadImage).toHaveBeenLastCalledWith(second);
    expect(getLetterheadState().design.logo).toBeNull();
    expect(allTexts(renderer.root)).toContain("No logo");
  });

  it("changes nothing when no photo is picked, and says so when one can't be used", async () => {
    const toasts = captureToastCalls();
    (pickLetterheadImage as jest.Mock).mockResolvedValueOnce(null);
    const renderer = await render(<LetterheadMake />);

    await pressLabel(renderer.root, "Add a logo");
    expect(getLetterheadState().design.logo).toBeNull();
    expect(toasts).toEqual([]);

    (pickLetterheadImage as jest.Mock).mockRejectedValueOnce(new Error("Unsupported image"));
    await pressLabel(renderer.root, "Add a logo");
    expect(toasts).toEqual([
      expect.objectContaining({ message: "Couldn’t add that image. Try another.", variant: "error" }),
    ]);
    expect(deleteLetterheadImage).not.toHaveBeenCalled();
  });

  it("opens the details", async () => {
    const renderer = await render(<LetterheadMake />);

    await pressLabel(renderer.root, "Your details. Add your business name");

    expect(router.push).toHaveBeenCalledWith("/letterhead-details");
  });
});

describe("uploading a letterhead", () => {
  it("explains the steps and asks for the image first", async () => {
    const renderer = await render(<LetterheadUpload />);
    const texts = allTexts(renderer.root);

    expect(texts).toContain("Your own letterhead");
    expect(texts).toContain("Use the letterhead you already have");
    expect(texts).toContain("Choose image");
    expect(texts).not.toContain("Space at the top");
  });

  it("chooses the image, makes Upload mine the style, and shows the page on it", async () => {
    (pickLetterheadImage as jest.Mock).mockResolvedValueOnce(page);
    const renderer = await render(<LetterheadUpload />);

    await pressLabel(renderer.root, "Choose image");

    expect(pickLetterheadImage).toHaveBeenCalledWith("letterhead");
    expect(getLetterheadState().design).toMatchObject({ style: "upload", upload: { image: page, kind: "page" } });
    const texts = allTexts(renderer.root);
    expect(texts).toContain("Your writing goes inside the orange box");
    expect(texts).toContain("54 mm");
    expect(texts).toContain("18 mm");
  });

  it("moves the space at the top and bottom, and has no bottom for a top strip", async () => {
    await saved({ style: "upload", upload: { ...DEFAULT_DESIGN.upload, image: page } });
    const renderer = await render(<LetterheadUpload />);

    step(renderer, "Space at the top", "increment", 3);
    step(renderer, "Space at the bottom", "decrement", 2);
    expect(getLetterheadState().design.upload).toMatchObject({ top: 57, bottom: 16 });
    expect(slider(renderer, "Space at the top").props.accessibilityValue).toMatchObject({ now: 57, text: "57 millimetres" });

    await act(async () => byRole(renderer, "tab", "Top strip only").props.onPress());
    expect(getLetterheadState().design.upload.kind).toBe("strip");
    expect(renderer.root.findAll((node: any) => node.props.accessibilityLabel === "Space at the bottom")).toHaveLength(0);
    await flushPromises();
    expect((await loadLetterheadDesign()).upload).toMatchObject({ kind: "strip", top: 57, bottom: 16 });
  });

  it("stops the sliders at their ends", async () => {
    await saved({ style: "upload", upload: { ...DEFAULT_DESIGN.upload, image: page, top: 89, bottom: 11 } });
    const renderer = await render(<LetterheadUpload />);

    step(renderer, "Space at the top", "increment", 3);
    step(renderer, "Space at the bottom", "decrement", 3);

    expect(getLetterheadState().design.upload).toMatchObject({ top: 90, bottom: 10 });
  });

  it("replaces the image with another, deleting the old one", async () => {
    await saved({ style: "upload", upload: { ...DEFAULT_DESIGN.upload, image: page } });
    const next = { ...page, file: "letterhead-2.jpg" };
    (pickLetterheadImage as jest.Mock).mockResolvedValueOnce(next);
    const renderer = await render(<LetterheadUpload />);

    await pressLabel(renderer.root, "Choose another image");

    expect(deleteLetterheadImage).toHaveBeenCalledWith(page);
    expect(getLetterheadState().design.upload.image).toEqual(next);
  });
});

describe("printing on a letterhead pad", () => {
  it("shows the page with the spaces left empty, and keeps the spaces chosen", async () => {
    const renderer = await render(<LetterheadPrinted />);
    const texts = allTexts(renderer.root);

    expect(texts).toContain("My printed paper");
    expect(texts).toContain("45 mm");
    expect(texts).toContain("15 mm");
    expect(previewPage(renderer)).toContain('style="padding-top:170px"');

    step(renderer, "Empty space at the top", "decrement", 5);
    step(renderer, "Empty space at the bottom", "increment");
    await flushPromises();

    expect(getLetterheadState().design).toMatchObject({ style: "printed", printed: { top: 40, bottom: 16 } });
    expect(allTexts(renderer.root)).toContain("40 mm");
    expect((await loadLetterheadDesign()).printed).toEqual({ top: 40, bottom: 16 });
  });

  it("prints a test page with the spaces on screen", async () => {
    await saved({ style: "none", printed: { top: 30, bottom: 10 } });
    const renderer = await render(<LetterheadPrinted />);

    await pressLabel(renderer.root, "Print a test page");

    expect(saveTestPage).toHaveBeenCalledWith(
      tps,
      expect.objectContaining({ style: "printed", printed: { top: 30, bottom: 10 } })
    );
    expect(printPdf).toHaveBeenCalledWith(testPage);
    expect(recordFormEvent).toHaveBeenCalledWith("account-1", "letterhead_test", "printed", 1);
  });
});

describe("forgetting the letterhead", () => {
  it("clears the details, the design and the images from this phone", async () => {
    await saved({ template: "band" });
    await render(<LetterheadScreen />);
    expect(getLetterheadState().design.template).toBe("band");

    await act(async () => forgetLetterhead());

    expect(getLetterheadState()).toEqual({ details: EMPTY_LETTERHEAD, design: DEFAULT_DESIGN, ready: false });
    expect(clearLetterheadImages).toHaveBeenCalled();
    expect(await loadLetterhead()).toEqual(EMPTY_LETTERHEAD);
    expect(await loadLetterheadDesign()).toEqual(DEFAULT_DESIGN);
  });
});
