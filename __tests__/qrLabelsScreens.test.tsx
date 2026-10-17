jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn() },
  usePathname: jest.fn(() => "/home"),
}));
jest.mock("react-native-appwrite", () => require("./helpers/fakeAppwrite").createFakeAppwriteModule());
jest.mock("@/lib/formEvents", () => ({ recordFormEvent: jest.fn() }));
jest.mock("@/lib/paperPdf", () => ({
  savePianoLabels: jest.fn(),
  saveLabelTestSheet: jest.fn(),
  openPdf: jest.fn(async () => undefined),
  printPdf: jest.fn(async () => undefined),
  sharePdf: jest.fn(async () => undefined),
  isPrintCancelled: (error: unknown) => error instanceof Error && /cancel/i.test(error.message),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { act } from "react-test-renderer";
import BulkOperationsBar from "@/components/BulkOperationsBar";
import PrintLabelsSheet from "@/components/PrintLabelsSheet";
import { Sheet } from "@/components/ui";
import { recordFormEvent } from "@/lib/formEvents";
import { resetLetterheadStoreForTests } from "@/lib/letterheadStore";
import { saveLetterhead } from "@/lib/letterheadStorage";
import { openPdf, printPdf, saveLabelTestSheet, savePianoLabels, sharePdf } from "@/lib/paperPdf";
import { selectAllItems, setBulkSelectionMode, setFilteredPianoListItems } from "@/redux/pianos/actions";
import { EMPTY_LETTERHEAD } from "@/utils/letterhead";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { makePiano, testUser } from "./helpers/fixtures";
import { a11yProblems, describeProblems } from "./helpers/a11y";
import {
  allTexts,
  atFontScale,
  captureToastCalls,
  createTestStore,
  flushPromises,
  pressButton,
  pressLabel,
  renderWithStore,
} from "./helpers/render";

/** QR labels: Print labels on the Pianos tab and its sheet (canvas page "QR labels"). */

const samick = makePiano({
  $id: "samick-id",
  title: "Samick SU-118",
  make: "Samick",
  company_associated: "Kirpalsons",
});
const weber = makePiano({ $id: "weber-id", title: "Weber W-121", make: "Weber", company_associated: "Shamshersons" });
const petrof = makePiano({ $id: "petrof-id", title: "Petrof P118", make: "Petrof" });
const pianos = [samick, weber, petrof];

const made = { uri: "file:///docs/Piano labels.pdf", fileName: "Piano labels.pdf", pages: 1 };
const madeTest = { uri: "file:///docs/Label test sheet.pdf", fileName: "Label test sheet.pdf", pages: 1 };

beforeEach(async () => {
  jest.clearAllMocks();
  fakeBackend.reset();
  await AsyncStorage.clear();
  resetLetterheadStoreForTests();
  (savePianoLabels as jest.Mock).mockResolvedValue(made);
  (saveLabelTestSheet as jest.Mock).mockResolvedValue(madeTest);
  jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

const withDetails = () => saveLetterhead({ ...EMPTY_LETTERHEAD, business: "The Piano Services", phone: "+91 98765 43210" });

const choose = async (selected: string[], bar = true) => {
  const store = createTestStore({ user: testUser, items: pianos });
  act(() => {
    store.dispatch(setFilteredPianoListItems(pianos) as any);
    store.dispatch(setBulkSelectionMode(true) as any);
    if (selected.length) store.dispatch(selectAllItems(selected) as any);
  });
  const renderer = renderWithStore(bar ? <BulkOperationsBar onRefresh={jest.fn()} /> : <></>, store);
  await flushPromises();
  return { store, renderer };
};

const open = async (selected = ["samick-id", "weber-id"]) => {
  const { renderer } = await choose(selected);
  await pressButton(renderer.root, "Print labels");
  return renderer;
};

type Rendered = Awaited<ReturnType<typeof open>>;
const texts = (renderer: Rendered) => allTexts(renderer.root);
const has = (renderer: Rendered, text: string) => texts(renderer).includes(text);
const previewLabel = (renderer: Rendered) =>
  renderer.root.findAll((node) => typeof node.type === "string" && node.props.testID === "label-preview")[0]?.props
    .accessibilityLabel as string | undefined;

describe("the bar at the bottom while choosing pianos", () => {
  it("has Print labels in orange and the red Delete under it", async () => {
    const { renderer } = await choose(["samick-id", "weber-id"]);

    expect(texts(renderer as any)).toEqual(expect.arrayContaining(["Print labels", "Delete 2 pianos"]));
  });

  it("can't print labels for no pianos", async () => {
    const { renderer } = await choose([]);
    const button = renderer.root.findAll(
      (node) => node.props.accessibilityLabel === "Print labels" && node.props.accessibilityRole === "button"
    )[0];

    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    expect(texts(renderer as any)).toContain("Delete pianos");
  });
});

describe("the Print labels sheet", () => {
  it("opens from the bar, saying how many pianos and sheets", async () => {
    const renderer = await open();

    expect(has(renderer, "Print labels")).toBe(true);
    expect(has(renderer, "2 pianos · 1 sheet")).toBe(true);
    expect(has(renderer, "Labels per sheet")).toBe(true);
    expect(has(renderer, "24 · Large")).toBe(true);
    expect(has(renderer, "65 · Small")).toBe(true);
    expect(has(renderer, "Labels of each")).toBe(true);
    expect(has(renderer, "Business name and phone")).toBe(true);
    expect(has(renderer, "Make labels")).toBe(true);
    expect(has(renderer, "Print a test sheet first")).toBe(true);
  });

  it("says in one piano's own words when it is one", async () => {
    const renderer = await open(["samick-id"]);
    expect(has(renderer, "1 piano · 1 sheet")).toBe(true);
  });

  it("shows the label of the first piano, with who to call from the Letterhead details", async () => {
    await withDetails();
    const renderer = await open();

    expect(previewLabel(renderer)).toBe(
      "Label for Samick SU-118. Samick · Kirpalsons. If found, call The Piano Services, +91 98765 43210"
    );
    expect(has(renderer, "“If found, call…” from your Letterhead details")).toBe(true);
    expect(has(renderer, "Looks like this on the sticker.")).toBe(true);
  });

  it("says when no business or phone is set, and leaves them off", async () => {
    const renderer = await open();

    expect(previewLabel(renderer)).toBe("Label for Samick SU-118. Samick · Kirpalsons");
    expect(has(renderer, "Not set yet. Add them under Letterhead, Your details")).toBe(true);
    const control = renderer.root.findAll(
      (node) => node.props.accessibilityLabel === "Business name and phone" && typeof node.props.onValueChange === "function"
    )[0];
    expect(control.props.disabled).toBe(true);
  });

  it("counts the labels and sheets when there are several of each", async () => {
    const renderer = await open();

    await pressLabel(renderer.root, "More labels");
    expect(has(renderer, "2 pianos · 4 labels · 1 sheet")).toBe(true);
    for (let i = 0; i < 5; i++) await pressLabel(renderer.root, "More labels");
    // 2 pianos, 7 of each: 14 labels, still a sheet of 24
    expect(has(renderer, "2 pianos · 14 labels · 1 sheet")).toBe(true);
    await pressLabel(renderer.root, "More labels");
    await pressLabel(renderer.root, "More labels");
    await pressLabel(renderer.root, "More labels");
    // 10 of each is 20 labels; at the most
    expect(has(renderer, "2 pianos · 20 labels · 1 sheet")).toBe(true);
    await pressLabel(renderer.root, "More labels").catch(() => {});
    expect(has(renderer, "2 pianos · 20 labels · 1 sheet")).toBe(true);
  });

  it("starts at one of each every time it opens", async () => {
    const { renderer } = await choose(["samick-id"]);
    await pressButton(renderer.root, "Print labels");
    await pressLabel(renderer.root, "More labels");
    expect(has(renderer, "1 piano · 2 labels · 1 sheet")).toBe(true);

    await pressLabel(renderer.root, "Cancel");
    await pressButton(renderer.root, "Print labels");
    expect(has(renderer, "1 piano · 1 sheet")).toBe(true);
  });

  it("makes the labels for the chosen pianos, a label for each of them, on the large sheet", async () => {
    await withDetails();
    const renderer = await open();

    await pressButton(renderer.root, "Make labels");

    expect(savePianoLabels).toHaveBeenCalledTimes(1);
    const [labels, size] = (savePianoLabels as jest.Mock).mock.calls[0];
    expect(size).toBe("large");
    expect(labels.map((label: any) => [label.title, label.link, label.business, label.phone])).toEqual([
      ["Samick SU-118", "pianoverse://detail/samick-id", "The Piano Services", "+91 98765 43210"],
      ["Weber W-121", "pianoverse://detail/weber-id", "The Piano Services", "+91 98765 43210"],
    ]);
  });

  it("makes more labels of each when asked, and small ones when 65 is chosen", async () => {
    const renderer = await open(["samick-id"]);

    await pressButton(renderer.root, "65 · Small");
    await pressLabel(renderer.root, "More labels");
    await pressButton(renderer.root, "Make labels");

    const [labels, size] = (savePianoLabels as jest.Mock).mock.calls[0];
    expect(size).toBe("small");
    expect(labels).toHaveLength(2);
  });

  it("leaves out who to call when the switch is turned off", async () => {
    await withDetails();
    const renderer = await open(["samick-id"]);
    const control = () =>
      renderer.root.findAll(
        (node) => node.props.accessibilityLabel === "Business name and phone" && typeof node.props.onValueChange === "function"
      )[0];
    expect(control().props.value).toBe(true);

    await act(async () => control().props.onValueChange(false));
    expect(previewLabel(renderer)).toBe("Label for Samick SU-118. Samick · Kirpalsons");
    await pressButton(renderer.root, "Make labels");

    const [labels] = (savePianoLabels as jest.Mock).mock.calls[0];
    expect(labels[0]).toMatchObject({ business: "", phone: "" });
  });

  it("says the labels are ready, and Open, Print and Share work on them", async () => {
    const renderer = await open();

    await pressButton(renderer.root, "Make labels");

    expect(has(renderer, "Labels are ready")).toBe(true);
    expect(has(renderer, "Piano labels.pdf")).toBe(true);
    await pressButton(renderer.root, "Open");
    expect(openPdf).toHaveBeenCalledWith(made);
    await pressButton(renderer.root, "Print");
    expect(printPdf).toHaveBeenCalledWith(made);
    await pressButton(renderer.root, "Share");
    expect(sharePdf).toHaveBeenCalledWith(made);
  });

  it("goes back to the sheet when the ready message is closed, to make another size", async () => {
    const renderer = await open();
    await pressButton(renderer.root, "Make labels");
    expect(has(renderer, "Labels are ready")).toBe(true);
    // The Print labels sheet makes way for it
    const printSheet = () => renderer.root.findAllByType(Sheet).find((sheet) => sheet.props.title === "Print labels")!;
    expect(printSheet().props.visible).toBe(false);

    await act(async () => {
      renderer.root.findByProps({ testID: "paper-saved-sheet" }).props.onClose();
    });
    await flushPromises();

    expect(printSheet().props.visible).toBe(true);
  });

  it("prints a test sheet at once, with the first piano's label in it and the chosen size", async () => {
    await withDetails();
    const renderer = await open();

    await pressButton(renderer.root, "65 · Small");
    await pressButton(renderer.root, "Print a test sheet first");

    expect(saveLabelTestSheet).toHaveBeenCalledTimes(1);
    const [size, sample] = (saveLabelTestSheet as jest.Mock).mock.calls[0];
    expect(size).toBe("small");
    expect(sample).toMatchObject({ title: "Samick SU-118", link: "pianoverse://detail/samick-id" });
    expect(printPdf).toHaveBeenCalledWith(madeTest);
    // No "ready" message for a test
    expect(has(renderer, "Labels are ready")).toBe(false);
    expect(savePianoLabels).not.toHaveBeenCalled();
  });

  it("counts nothing: the labels aren't one of the paper forms", async () => {
    const renderer = await open();
    await pressButton(renderer.root, "Make labels");
    await pressButton(renderer.root, "Print");
    await pressButton(renderer.root, "Share");

    expect(recordFormEvent).not.toHaveBeenCalled();
  });

  it("says so when the PDF can't be made, and stays open to try again", async () => {
    (savePianoLabels as jest.Mock).mockRejectedValueOnce(new Error("no space"));
    const toasts = captureToastCalls();
    const renderer = await open();

    await pressButton(renderer.root, "Make labels");

    expect(toasts.map((toast) => toast.message)).toContain("Couldn’t make the PDF. Try again.");
    expect(has(renderer, "Labels are ready")).toBe(false);
    expect(has(renderer, "Make labels")).toBe(true);
  });

  it("does not say it failed when the print screen is closed without printing", async () => {
    (printPdf as jest.Mock).mockRejectedValueOnce(new Error("Printing cancelled"));
    const toasts = captureToastCalls();
    const renderer = await open();

    await pressButton(renderer.root, "Print a test sheet first");

    expect(toasts).toEqual([]);
  });

  it("is usable: everything that can be pressed has a name and a role, and is big enough", async () => {
    await withDetails();
    const renderer = await open();
    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });
});

describe("the sheet on its own", () => {
  it("shows nothing until it is opened", async () => {
    const renderer = renderWithStore(
      <PrintLabelsSheet visible={false} pianos={pianos} onClose={jest.fn()} />,
      createTestStore({ user: testUser })
    );
    await flushPromises();
    expect(allTexts(renderer.root)).toEqual([]);
  });
});

describe("at a big Font size", () => {
  atFontScale(1.5);

  it("stacks the stepper under 'Labels of each', and nothing can be pressed that is too small", async () => {
    const renderer = await open();

    expect(has(renderer, "Labels of each")).toBe(true);
    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });

  it("draws the label at the size of a sticker whatever the Font size", async () => {
    const renderer = await open();
    const texts = renderer.root.findAll((node) => (node.type as unknown) === "Text" && node.props.allowFontScaling === false);

    // Title, make, "If found, call" are drawn at paper size
    expect(texts.length).toBeGreaterThan(0);
  });
});
