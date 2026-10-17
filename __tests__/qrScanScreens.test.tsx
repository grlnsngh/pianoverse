jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
}));

import React from "react";
import { Linking } from "react-native";
import { act } from "react-test-renderer";
import { router } from "expo-router";
import ScanScreen from "@/app/scan";
import { PianoDataContext, type PianoLoadStatus } from "@/lib/PianoDataContext";
import { PianoItem } from "@/redux/pianos/types";
import { pianoLink } from "@/utils/qrLabels";
import { a11yProblems, describeProblems } from "./helpers/a11y";
import { fakeCamera, PERMISSIONS } from "./helpers/fakeCamera";
import { makePiano, testUser } from "./helpers/fixtures";
import {
  allTexts,
  atFontScale,
  createTestStore,
  flushPromises,
  pressButton,
  pressLabel,
  renderWithStore,
} from "./helpers/render";

/** Scan a label (canvas page "QR labels"): the camera, what it finds, and the camera permission. */

const samick = makePiano({ $id: "samick-id", title: "Samick SU-118", category: "rentable" });
const weber = makePiano({ $id: "weber-id", title: "Weber W-121", category: "rentable" });

beforeEach(() => {
  jest.clearAllMocks();
  fakeCamera.reset();
  jest.mocked(router.canGoBack).mockReturnValue(true);
});

const open = async (items: PianoItem[] = [samick, weber], status: PianoLoadStatus = "ready") => {
  const refresher = { current: null };
  const renderer = renderWithStore(
    <PianoDataContext.Provider value={{ status, reportStatus: () => {}, refresher }}>
      <ScanScreen />
    </PianoDataContext.Provider>,
    createTestStore({ user: testUser, items })
  );
  await flushPromises();
  return renderer;
};

type Rendered = Awaited<ReturnType<typeof open>>;
const has = (renderer: Rendered, text: string) => allTexts(renderer.root).includes(text);
const scan = async (data: string) => {
  await act(async () => {
    fakeCamera.scan(data);
  });
  await flushPromises();
};
const camera = (renderer: Rendered) =>
  renderer.root.findAll((node) => typeof node.type === "string" && node.props.testID === "camera");
const deniedSheet = (renderer: Rendered) =>
  renderer.root.findAll((node) => node.props.testID === "camera-denied-sheet" && "visible" in node.props)[0];

describe("the camera", () => {
  it("looks for QR codes only, through the back camera, and says what to do", async () => {
    const renderer = await open();

    expect(camera(renderer)).toHaveLength(1);
    expect(fakeCamera.props).toMatchObject({ facing: "back", barcodeScannerSettings: { barcodeTypes: ["qr"] } });
    expect(has(renderer, "Scan a label")).toBe(true);
    expect(has(renderer, "Point the camera at the label on the piano")).toBe(true);
  });

  it("has a Light button that turns the torch on and off, and says which it is", async () => {
    const renderer = await open();
    const light = () => renderer.root.findAll((node) => node.props.accessibilityLabel === "Light" && typeof node.props.onPress === "function")[0];

    expect(fakeCamera.props?.enableTorch).toBe(false);
    expect(light().props.accessibilityState).toMatchObject({ checked: false });
    await pressLabel(renderer.root, "Light");
    expect(fakeCamera.props?.enableTorch).toBe(true);
    expect(light().props.accessibilityState).toMatchObject({ checked: true });
    await pressLabel(renderer.root, "Light");
    expect(fakeCamera.props?.enableTorch).toBe(false);
  });

  it("closes with the X: back to where it was opened from, or the Pianos tab", async () => {
    const renderer = await open();

    await pressLabel(renderer.root, "Close");
    expect(router.back).toHaveBeenCalled();

    jest.mocked(router.canGoBack).mockReturnValueOnce(false);
    await pressLabel(renderer.root, "Close");
    expect(router.replace).toHaveBeenCalledWith("/home");
  });
});

describe("a label of a piano in the account", () => {
  it("opens that piano's page, in place of the scanner", async () => {
    const renderer = await open();

    await scan(pianoLink("weber-id"));

    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith("/detail/weber-id");
    expect(has(renderer, "That isn’t a Pianoverse label")).toBe(false);
  });

  it("opens it once, however many times the camera reads it", async () => {
    await open();

    await scan(pianoLink("samick-id"));
    await scan(pianoLink("samick-id"));
    await scan(pianoLink("samick-id"));

    expect(router.replace).toHaveBeenCalledTimes(1);
  });
});

describe("a code that is not a label", () => {
  it("says so, with Scan again, and stops reading", async () => {
    const renderer = await open();

    await scan("https://example.com/menu");

    expect(has(renderer, "That isn’t a Pianoverse label")).toBe(true);
    expect(has(renderer, "It may be another kind of code. Point the camera at the label on a piano.")).toBe(true);
    expect(has(renderer, "Point the camera at the label on the piano")).toBe(false);
    expect(fakeCamera.props?.onBarcodeScanned).toBeUndefined();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("reads again after Scan again", async () => {
    const renderer = await open();
    await scan("something else");

    await pressButton(renderer.root, "Scan again");

    expect(has(renderer, "That isn’t a Pianoverse label")).toBe(false);
    expect(typeof fakeCamera.props?.onBarcodeScanned).toBe("function");
    await scan(pianoLink("samick-id"));
    expect(router.replace).toHaveBeenCalledWith("/detail/samick-id");
  });
});

describe("a label of a piano that isn't in the account", () => {
  it("says so, and that it may have been deleted or be from another account", async () => {
    const renderer = await open();

    await scan(pianoLink("gone-id"));

    expect(has(renderer, "This piano isn’t in your account")).toBe(true);
    expect(has(renderer, "It may have been deleted, or the label is from another account.")).toBe(true);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("says the pianos are still loading, rather than that it isn't there, while they are", async () => {
    const renderer = await open([], "loading");

    await scan(pianoLink("samick-id"));

    expect(has(renderer, "Your pianos are still loading")).toBe(true);
    expect(has(renderer, "This piano isn’t in your account")).toBe(false);
  });

  it("reads again after Scan again", async () => {
    const renderer = await open();
    await scan(pianoLink("gone-id"));

    await pressButton(renderer.root, "Scan again");
    await scan(pianoLink("weber-id"));

    expect(router.replace).toHaveBeenCalledWith("/detail/weber-id");
  });
});

describe("the camera permission", () => {
  it("is asked for once when it hasn't been, and the camera starts when it is allowed", async () => {
    fakeCamera.permission = PERMISSIONS.notAsked;
    const renderer = await open();

    expect(fakeCamera.requests).toBe(1);
    expect(camera(renderer)).toHaveLength(1);
    expect(deniedSheet(renderer).props.visible).toBe(false);
  });

  it("says Camera access is off when it is refused, with Open Settings and Not now", async () => {
    fakeCamera.permission = PERMISSIONS.notAsked;
    fakeCamera.grantOnRequest = false;
    const renderer = await open();

    expect(fakeCamera.requests).toBe(1);
    expect(camera(renderer)).toHaveLength(0);
    expect(deniedSheet(renderer).props.visible).toBe(true);
    expect(has(renderer, "Camera access is off")).toBe(true);
    expect(has(renderer, "Allow camera access in Settings to scan the labels on your pianos.")).toBe(true);
    expect(has(renderer, "Open Settings")).toBe(true);
    expect(has(renderer, "Not now")).toBe(true);
    // There is no gallery to choose from here
    expect(has(renderer, "Choose from gallery")).toBe(false);
    expect(has(renderer, "Point the camera at the label on the piano")).toBe(false);
  });

  it("says so at once, without asking, when it was refused for good", async () => {
    fakeCamera.permission = PERMISSIONS.refusedForGood;
    const renderer = await open();

    expect(fakeCamera.requests).toBe(0);
    expect(deniedSheet(renderer).props.visible).toBe(true);
  });

  it("opens the phone's settings from Open Settings, and goes back on Not now", async () => {
    const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
    fakeCamera.permission = PERMISSIONS.refusedForGood;
    const renderer = await open();

    await pressButton(renderer.root, "Open Settings");
    expect(openSettings).toHaveBeenCalled();

    await pressButton(renderer.root, "Not now");
    expect(router.back).toHaveBeenCalled();
  });

  it("shows nothing but a spinner while the phone hasn't said yet", async () => {
    fakeCamera.permission = null;
    const renderer = await open();

    expect(camera(renderer)).toHaveLength(0);
    expect(deniedSheet(renderer).props.visible).toBe(false);
    expect(has(renderer, "Point the camera at the label on the piano")).toBe(false);
  });

  it("has no Light button without the camera", async () => {
    fakeCamera.permission = PERMISSIONS.refusedForGood;
    const renderer = await open();

    expect(renderer.root.findAll((node) => node.props.accessibilityLabel === "Light")).toEqual([]);
  });
});

describe("for a screen reader and a thumb", () => {
  it("has a name and a role on everything that can be pressed, and none too small", async () => {
    const renderer = await open();
    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);

    await scan("not ours");
    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });
});

describe("at a big Font size", () => {
  atFontScale(1.5);

  it("keeps the buttons, the title and the message usable", async () => {
    const renderer = await open();
    await scan(pianoLink("gone-id"));

    expect(has(renderer, "This piano isn’t in your account")).toBe(true);
    expect(has(renderer, "Scan a label")).toBe(true);
    expect(describeProblems(a11yProblems(renderer.root))).toEqual([]);
  });
});
