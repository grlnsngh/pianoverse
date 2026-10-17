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
  // The grand piano comes with the app, so a made letterhead has it without reading the phone
  loadPaperParts: jest.fn(async (design: any) => ({
    fontCss: "",
    assets: {
      logo: null,
      image: null,
      picture: design?.style === "make" && design.picture?.source === "piano" ? "data:image/jpeg;base64,PIANO" : null,
    },
  })),
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
  it("shows the top of the real page, then your details, the design, the picture and the other kinds", async () => {
    await saved({});
    const renderer = await render(<LetterheadScreen />);
    const texts = allTexts(renderer.root);

    expect(texts).toContain("Letterhead");
    expect(texts).toContain("The top of an A4 page, as it will print");
    expect(texts).toContain("Full size on page 1 of the agreements, small on every other form");
    // In the order they matter
    const order = ["Your details", "The Piano Services", "Design", "Picture", "More options", "Other kinds of letterhead"];
    expect(order.map((text) => texts.indexOf(text))).toEqual([...order.map((text) => texts.indexOf(text))].sort((a, b) => a - b));
    for (const name of ["Monogram", "Classic", "Modern", "Band", "Minimal"]) expect(texts).toContain(name);
    expect(isChecked(renderer, "radio", "Monogram design")).toBe(true);
    expect(isChecked(renderer, "radio", "Copper")).toBe(true);
    for (const kind of ["My own letterhead image", "Printed letterhead paper", "No letterhead"]) expect(texts).toContain(kind);
    expect(texts).not.toContain("In use");
    // The logo and lettering wait under More options
    expect(texts).not.toContain("No logo");
    expect(texts).toContain("Saved as you go, on this phone. Nothing is uploaded.");
    expect(previewPage(renderer)).toContain("THE PIANO SERVICES");
  });

  it("keeps the design, colour and lettering chosen, and saves them", async () => {
    await saved({});
    const renderer = await render(<LetterheadScreen />);

    await pressLabel(renderer.root, "Band design");
    await pressLabel(renderer.root, "Navy");
    await pressLabel(renderer.root, "More options: logo and lettering");
    await act(async () => byRole(renderer, "tab", "Clean").props.onPress());
    await flushPromises();

    expect(getLetterheadState().design).toMatchObject({ style: "make", template: "band", colour: "navy", elegant: false });
    expect(isChecked(renderer, "radio", "Band design")).toBe(true);
    expect(await loadLetterheadDesign()).toMatchObject({ template: "band", colour: "navy", elegant: false });
  });

  it("opens and closes More options, with the logo and the lettering", async () => {
    await saved({});
    const renderer = await render(<LetterheadScreen />);

    await pressLabel(renderer.root, "More options: logo and lettering");
    expect(byRole(renderer, "button", "More options: logo and lettering").props.accessibilityState).toEqual({ expanded: true });
    expect(allTexts(renderer.root)).toEqual(expect.arrayContaining(["Logo", "No logo", "TPS", "Lettering of your details"]));
    expect(byRole(renderer, "tab", "Elegant").props.accessibilityState).toEqual({ selected: true });

    await pressLabel(renderer.root, "More options: logo and lettering");
    expect(allTexts(renderer.root)).not.toContain("No logo");
  });

  it("opens the screens for your own image and printed paper, and uses no letterhead at once", async () => {
    const renderer = await render(<LetterheadScreen />);

    await pressLabel(renderer.root, "My own letterhead image. A page or top strip made in Canva, or a scan");
    expect(router.push).toHaveBeenLastCalledWith("/letterhead-upload");
    await pressLabel(renderer.root, "Printed letterhead paper. Leaves space for the letterhead on your pad");
    expect(router.push).toHaveBeenLastCalledWith("/letterhead-printed");
    // Only opening them changes nothing
    expect(getLetterheadState().design.style).toBe("make");

    await pressLabel(renderer.root, "No letterhead. Just the document");
    expect(getLetterheadState().design.style).toBe("none");
    await flushPromises();
    expect((await loadLetterheadDesign()).style).toBe("none");
  });

  it("says which other kind is in use, offers to change it, and goes back to making one", async () => {
    await saved({ style: "printed" });
    const renderer = await render(<LetterheadScreen />);
    const texts = allTexts(renderer.root);

    expect(texts).toEqual(expect.arrayContaining(["In use", "Printed letterhead paper"]));
    expect(texts).toContain("45 mm left empty at the top and 15 mm at the bottom");
    expect(texts).toContain("An A4 page, as it will print");
    // Nothing to make while another kind is used
    expect(texts).not.toContain("Design");
    expect(texts).toContain("Your details");
    expect(byRole(renderer, "button", "Printed letterhead paper. Leaves space for the letterhead on your pad. In use")).toBeTruthy();

    await pressLabel(renderer.root, "Change it");
    expect(router.push).toHaveBeenLastCalledWith("/letterhead-printed");

    await pressLabel(renderer.root, "Make a letterhead instead");
    expect(getLetterheadState().design.style).toBe("make");
    expect(allTexts(renderer.root)).toContain("Design");
  });

  it("says when no letterhead is used, with nothing to change", async () => {
    await saved({ style: "none" });
    const renderer = await render(<LetterheadScreen />);

    expect(allTexts(renderer.root)).toContain("Just the document, with your business name on a line at the top");
    expect(renderer.root.findAll((node: any) => node.props.accessibilityLabel === "Change it")).toHaveLength(0);
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
  it("draws the design chosen in the preview", async () => {
    await saved({ template: "band", colour: "navy" });
    const renderer = await render(<LetterheadScreen />);

    expect(previewPage(renderer)).toContain("background:#1F3A5F");
  });

  it("adds a logo from the photos, changes it, and removes it", async () => {
    await saved({});
    (pickLetterheadImage as jest.Mock).mockResolvedValueOnce(logo);
    const renderer = await render(<LetterheadScreen />);

    await pressLabel(renderer.root, "More options: logo and lettering");
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
    const renderer = await render(<LetterheadScreen />);

    await pressLabel(renderer.root, "More options: logo and lettering");
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
    const renderer = await render(<LetterheadScreen />);

    await pressLabel(renderer.root, "Your details. Add your business name");

    expect(router.push).toHaveBeenCalledWith("/letterhead-details");
  });
});

describe("the letterhead's picture", () => {
  const GRAND = "Grand piano. A grand piano in colour";
  const OWN = "My picture. A photo or a logo from your phone";
  const NONE = "None. No picture";
  const own = { file: "picture-1.jpg", width: 800, height: 600 };

  it("has the grand piano at the top right of the page at first, as on TPS 2", async () => {
    await saved({});
    const renderer = await render(<LetterheadScreen />);
    const texts = allTexts(renderer.root);

    expect(texts).toContain("Picture");
    expect(isChecked(renderer, "radio", GRAND)).toBe(true);
    expect(byRole(renderer, "tab", "Right").props.accessibilityState).toEqual({ selected: true });
    expect(texts).toContain("Big on page 1 of the agreements, beside your letterhead. Every other form gets a small one.");
    expect(previewPage(renderer)).toContain('class="lh-pic" style="width:115px;height:136px;flex-shrink:0;position:absolute;right:48px;top:26px"');
  });

  it("moves the picture to the left or behind the writing, and sizes and fades it", async () => {
    await saved({});
    const renderer = await render(<LetterheadScreen />);

    await act(async () => byRole(renderer, "tab", "Left").props.onPress());
    expect(getLetterheadState().design.picture.place).toBe("left");

    step(renderer, "Size of the picture", "increment", 2);
    step(renderer, "How strongly the picture prints", "decrement", 3);
    expect(getLetterheadState().design.picture).toMatchObject({ size: 110, strength: 85 });
    expect(allTexts(renderer.root)).toEqual(expect.arrayContaining(["110%", "85%"]));

    // Behind the writing it starts faint, and the whole page is shown
    await act(async () => byRole(renderer, "tab", "Behind text").props.onPress());
    // The preview is drawn again once the change has settled
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });
    expect(getLetterheadState().design.picture).toMatchObject({ place: "behind", strength: 15 });
    expect(allTexts(renderer.root)).toContain("An A4 page, as it will print");
    expect(previewPage(renderer)).toContain("mix-blend-mode:multiply");

    // Beside the letterhead again, at full strength
    await act(async () => byRole(renderer, "tab", "Right").props.onPress());
    expect(getLetterheadState().design.picture).toMatchObject({ place: "right", strength: 100 });
    await flushPromises();
    expect((await loadLetterheadDesign()).picture).toMatchObject({ place: "right", size: 110, strength: 100 });
  });

  it("stops the size where the agreement still fits on two pages", async () => {
    await saved({ picture: { ...DEFAULT_DESIGN.picture, size: 125 } });
    const renderer = await render(<LetterheadScreen />);

    step(renderer, "Size of the picture", "increment", 3);

    expect(getLetterheadState().design.picture.size).toBe(130);
  });

  it("chooses the person's own picture from their photos, changes it, and keeps it to go back to", async () => {
    await saved({});
    (pickLetterheadImage as jest.Mock).mockResolvedValueOnce(own);
    const renderer = await render(<LetterheadScreen />);

    await pressLabel(renderer.root, OWN);
    expect(pickLetterheadImage).toHaveBeenCalledWith("picture");
    expect(getLetterheadState().design.picture).toMatchObject({ source: "own", image: own });
    expect(isChecked(renderer, "radio", OWN)).toBe(true);

    const second = { ...own, file: "picture-2.jpg" };
    (pickLetterheadImage as jest.Mock).mockResolvedValueOnce(second);
    await pressLabel(renderer.root, "Change your picture");
    expect(deleteLetterheadImage).toHaveBeenLastCalledWith(own);
    expect(getLetterheadState().design.picture.image).toEqual(second);

    // No picture: the settings go, the picture is kept for later
    await pressLabel(renderer.root, NONE);
    expect(getLetterheadState().design.picture).toMatchObject({ source: "none", image: second });
    expect(renderer.root.findAll((node: any) => node.props.accessibilityLabel === "Size of the picture")).toHaveLength(0);

    (pickLetterheadImage as jest.Mock).mockClear();
    await pressLabel(renderer.root, OWN);
    expect(pickLetterheadImage).not.toHaveBeenCalled();
    expect(getLetterheadState().design.picture.source).toBe("own");
  });

  it("keeps the grand piano when no photo is picked, and says so when one can't be used", async () => {
    const toasts = captureToastCalls();
    (pickLetterheadImage as jest.Mock).mockResolvedValueOnce(null);
    const renderer = await render(<LetterheadScreen />);

    await pressLabel(renderer.root, OWN);
    expect(getLetterheadState().design.picture.source).toBe("piano");

    (pickLetterheadImage as jest.Mock).mockRejectedValueOnce(new Error("Unsupported image"));
    await pressLabel(renderer.root, OWN);
    expect(getLetterheadState().design.picture.source).toBe("piano");
    expect(toasts).toEqual([
      expect.objectContaining({ message: "Couldn’t add that picture. Try another.", variant: "error" }),
    ]);
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

  it("makes the letterhead paler with Visibility", async () => {
    await saved({ style: "upload", upload: { ...DEFAULT_DESIGN.upload, image: page } });
    const renderer = await render(<LetterheadUpload />);

    step(renderer, "How strongly your letterhead prints", "decrement", 4);
    await flushPromises();

    expect(getLetterheadState().design.upload.strength).toBe(80);
    expect(allTexts(renderer.root)).toContain("80%");
  });

  it("moves an image that is only a picture to Make one, at the top right", async () => {
    const toasts = captureToastCalls();
    const photo = { file: "letterhead-3.jpg", width: 750, height: 750 };
    await saved({ style: "upload", upload: { ...DEFAULT_DESIGN.upload, image: photo } });
    const renderer = await render(<LetterheadUpload />);

    expect(allTexts(renderer.root)).toContain("Only a picture or a logo?");
    await pressLabel(renderer.root, "Use it as a picture");

    expect(getLetterheadState().design).toMatchObject({
      style: "make",
      picture: { source: "own", image: photo, place: "right", size: 100, strength: 100 },
      upload: { image: null },
    });
    // It moved: the same file, not deleted
    expect(deleteLetterheadImage).not.toHaveBeenCalled();
    // Back to the Letterhead screen, which shows it
    expect(router.back).toHaveBeenCalled();
    expect(toasts).toEqual([expect.objectContaining({ message: "Your picture is at the top right now", variant: "success" })]);
  });

  it("uses an image chosen before only when asked", async () => {
    await saved({ style: "make", upload: { ...DEFAULT_DESIGN.upload, image: page } });
    const renderer = await render(<LetterheadUpload />);

    expect(getLetterheadState().design.style).toBe("make");
    await pressLabel(renderer.root, "Use this letterhead");
    expect(getLetterheadState().design.style).toBe("upload");
    expect(renderer.root.findAll((node: any) => node.props.accessibilityLabel === "Use this letterhead")).toHaveLength(0);
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

    expect(texts).toContain("Printed letterhead paper");
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

  it("uses printed paper only when asked, or when a space is moved", async () => {
    await saved({});
    const renderer = await render(<LetterheadPrinted />);

    expect(getLetterheadState().design.style).toBe("make");
    await pressLabel(renderer.root, "Use printed paper");
    expect(getLetterheadState().design.style).toBe("printed");
    expect(renderer.root.findAll((node: any) => node.props.accessibilityLabel === "Use printed paper")).toHaveLength(0);
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
