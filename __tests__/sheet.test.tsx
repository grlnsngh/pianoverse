import React from "react";
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { act } from "react-test-renderer";
import { Sheet } from "@/components/ui";
import { colors, fonts } from "@/constants/theme";
import {
  advance,
  animatedStyles,
  hostByTestId,
  mount,
  setReduceMotion,
  textContent,
  update,
} from "./helpers/ui";

type Mounted = Awaited<ReturnType<typeof mount>>;

const flat = (style: unknown) => StyleSheet.flatten(style as any);
const WINDOW_HEIGHT = Dimensions.get("window").height;

// Like the app: a phone with a 34 px home indicator
const withSafeArea = (children: React.ReactNode) => (
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 47, left: 0, right: 0, bottom: 34 },
    }}
  >
    {children}
  </SafeAreaProvider>
);

const sheetElement = (props: Partial<React.ComponentProps<typeof Sheet>> = {}) =>
  withSafeArea(
    <Sheet visible onClose={() => {}} title="Record payment" {...props}>
      <Text>Content</Text>
    </Sheet>
  );

const open = (props: Partial<React.ComponentProps<typeof Sheet>> = {}) =>
  mount(sheetElement(props));

/** The sheet itself: the view that slides. */
const panel = (renderer: Mounted) =>
  renderer.root.find(
    (node) => typeof node.type === "string" && node.props.accessibilityViewIsModal === true
  );
const panelStyle = (renderer: Mounted) => flat(panel(renderer).props.style);
/** [dim, sheet] as Reanimated currently has them. */
const motion = (renderer: Mounted) => {
  const [dim, sheet] = animatedStyles(renderer.root);
  return { dim, sheet };
};
const header = (renderer: Mounted) => hostByTestId(renderer.root, "sheet-header");

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("Sheet look", () => {
  it("shows nothing until it is opened", async () => {
    const renderer = await open({ visible: false });

    expect(renderer.root.findAllByType(Modal)).toHaveLength(0);
    expect(renderer.root.findAllByType(Text)).toHaveLength(0);
  });

  it("is a transparent modal that does its own animation", async () => {
    const renderer = await open();
    const modal = renderer.root.findByType(Modal);

    expect(modal.props).toMatchObject({ transparent: true, animationType: "none" });
  });

  it("has rounded top corners of 24, clips its content, and is grouped grey by default", async () => {
    const renderer = await open();

    expect(panelStyle(renderer)).toMatchObject({
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: "hidden",
      backgroundColor: colors.grouped,
    });
  });

  it("can be white, for a sheet of text", async () => {
    const renderer = await open({ tone: "white" });

    expect(panelStyle(renderer).backgroundColor).toBe(colors.white);
  });

  it("never grows taller than 92% of the screen", async () => {
    const renderer = await open();

    expect(panelStyle(renderer).maxHeight).toBeCloseTo(WINDOW_HEIGHT * 0.92);
  });

  it("can be tall: a fixed 92% of the screen, with content that scrolls itself", async () => {
    const renderer = await open({ tall: true });

    // The height is fixed, but gives way when the keyboard takes room
    expect(panelStyle(renderer).height).toBeCloseTo(WINDOW_HEIGHT * 0.92);
    expect(panelStyle(renderer).maxHeight).toBe("100%");
    // No scroll view of its own: the content brings the list it scrolls
    expect(renderer.root.findAllByType(ScrollView)).toHaveLength(0);
    expect(textContent(renderer.root)).toContain("Content");
  });

  it("has a 36 x 5 grabber at the top", async () => {
    const renderer = await open();
    const grabber = header(renderer).children[0] as any;

    expect(flat(grabber.props.style)).toMatchObject({
      width: 36,
      height: 5,
      borderRadius: 3,
      marginTop: 8,
      backgroundColor: colors.grabber,
      alignSelf: "center",
    });
  });

  it("has a title row: a left button and a centred 17 px bold title", async () => {
    const renderer = await open();
    const title = renderer.root.findAllByType(Text).find((t) => textContent(t) === "Record payment")!;
    const left = renderer.root.findAllByType(Pressable).find(
      (p) => p.props.accessibilityLabel === "Cancel"
    )!;

    expect(flat(title.props.style)).toMatchObject({
      fontFamily: fonts.bold,
      fontSize: 17,
      color: colors.ink,
    });
    expect(title.props.accessibilityRole).toBe("header");
    expect(flat(left.props.style)).toMatchObject({
      position: "absolute",
      left: 8,
      top: 4,
      height: 44,
      paddingHorizontal: 12,
    });
    expect(flat(left.findByType(Text).props.style)).toMatchObject({
      fontFamily: fonts.medium,
      fontSize: 16,
    });
  });

  it("has only the grabber when it has no title", async () => {
    const renderer = await open({ title: undefined });

    expect(renderer.root.findAllByType(Text).map(textContent)).toEqual(["Content"]);
    expect(header(renderer).children).toHaveLength(1);
  });

  it("puts its content in a scroll view that keeps taps working while the keyboard is up", async () => {
    const renderer = await open();
    const scroll = renderer.root.findByType(ScrollView);

    expect(scroll.props.keyboardShouldPersistTaps).toBe("handled");
    expect(flat(scroll.props.contentContainerStyle).paddingHorizontal).toBe(20);
    expect(textContent(scroll)).toBe("Content");
  });

  it("is a modal for screen readers", async () => {
    const renderer = await open();

    expect(panel(renderer).props.accessibilityViewIsModal).toBe(true);
  });

  it("dims what is behind it", async () => {
    const renderer = await open();
    const close = renderer.root.findAllByType(Pressable).find(
      (p) => p.props.accessibilityLabel === "Close"
    )!;
    const dimView = close.parent!.parent!;

    expect(flat(dimView.props.style)).toMatchObject({ backgroundColor: colors.dim });
    expect(close.props.accessibilityRole).toBe("button");
  });
});

describe("Sheet footer", () => {
  it("keeps the footer under the content, 12 px below it, with 20 px sides", async () => {
    const renderer = await open({ footer: <Text>Save payment</Text> });
    const footer = hostByTestId(renderer.root, "sheet-footer");

    expect(flat(footer.props.style)).toMatchObject({ paddingTop: 12, paddingHorizontal: 20 });
    expect(textContent(footer)).toBe("Save payment");
  });

  it("clears the home indicator: 28 below the button on an iPhone", async () => {
    const renderer = await open({ footer: <Text>Save</Text> });

    expect(flat(hostByTestId(renderer.root, "sheet-footer").props.style).paddingBottom).toBe(28);
  });

  it("has no footer area when it has no footer", async () => {
    const renderer = await open();

    expect(renderer.root.findAll((n) => n.props.testID === "sheet-footer")).toHaveLength(0);
  });
});

describe("Sheet leaving", () => {
  it("closes from the dim, the left button and the back button", async () => {
    const onClose = jest.fn();
    const renderer = await open({ onClose });
    const byLabel = (label: string) =>
      renderer.root.findAllByType(Pressable).find((p) => p.props.accessibilityLabel === label)!;

    byLabel("Close").props.onPress();
    byLabel("Cancel").props.onPress();
    renderer.root.findByType(Modal).props.onRequestClose();

    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("lets the left button do something else, such as Reset", async () => {
    const onClose = jest.fn();
    const onLeftPress = jest.fn();
    const renderer = await open({ onClose, onLeftPress, leftLabel: "Reset", title: "Filters" });
    const reset = renderer.root.findAllByType(Pressable).find(
      (p) => p.props.accessibilityLabel === "Reset"
    )!;

    reset.props.onPress();

    expect(onLeftPress).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(textContent(reset)).toBe("Reset");
  });
});

describe("Sheet motion", () => {
  it("starts below the screen with the dim clear", async () => {
    const renderer = await open();

    expect(motion(renderer).dim.opacity).toBe(0);
    expect(motion(renderer).sheet.transform[0].translateY).toBeCloseTo(WINDOW_HEIGHT, 0);
    expect(motion(renderer).sheet.opacity).toBe(1);
  });

  it("rises in 320 ms while the dim fades in", async () => {
    const renderer = await open();

    await advance(160);
    const half = motion(renderer);
    expect(half.dim.opacity).toBeGreaterThan(0.3);
    expect(half.dim.opacity).toBeLessThan(1);
    expect(half.sheet.transform[0].translateY).toBeGreaterThan(0);
    expect(half.sheet.transform[0].translateY).toBeLessThan(WINDOW_HEIGHT / 2);

    await advance(170);
    expect(motion(renderer).dim.opacity).toBe(1);
    expect(motion(renderer).sheet.transform[0].translateY).toBe(0);
  });

  it("slides from its own height once it knows it, not from far below", async () => {
    const renderer = await open();
    await act(async () =>
      panel(renderer).props.onLayout({ nativeEvent: { layout: { height: 300, width: 390, x: 0, y: 0 } } })
    );

    await advance(16);
    expect(motion(renderer).sheet.transform[0].translateY).toBeLessThanOrEqual(300);
  });

  it("only fades, over 120 ms, with reduced motion", async () => {
    setReduceMotion(true);
    const renderer = await open();

    await advance(60);
    const half = motion(renderer);
    expect(half.sheet.transform[0].translateY).toBe(0);
    expect(half.sheet.opacity).toBeGreaterThan(0.2);
    expect(half.sheet.opacity).toBeLessThan(1);

    await advance(70);
    expect(motion(renderer).sheet.opacity).toBe(1);
    expect(motion(renderer).dim.opacity).toBe(1);
  });

  it("leaves in 240 ms, then is gone", async () => {
    const renderer = await open();
    await advance(400);

    await update(renderer, sheetElement({ visible: false }));
    await advance(120);
    // Halfway out: still there, still moving
    expect(renderer.root.findAllByType(Modal)).toHaveLength(1);
    expect(motion(renderer).dim.opacity).toBeLessThan(1);
    expect(motion(renderer).dim.opacity).toBeGreaterThan(0);

    await advance(160);
    expect(renderer.root.findAllByType(Modal)).toHaveLength(0);
  });

  it("can be opened again after it has left", async () => {
    const renderer = await open();
    await advance(400);
    await update(renderer, sheetElement({ visible: false }));
    await advance(300);
    await update(renderer, sheetElement({ visible: true }));
    await advance(400);

    expect(renderer.root.findAllByType(Modal)).toHaveLength(1);
    expect(motion(renderer).dim.opacity).toBe(1);
    expect(motion(renderer).sheet.transform[0].translateY).toBe(0);
  });

  it("never draws anything for a sheet that was never opened", async () => {
    const renderer = await open({ visible: false });
    await advance(1000);

    expect(renderer.root.findAllByType(Modal)).toHaveLength(0);
  });
});

describe("Sheet drag", () => {
  const touch = (y: number) => ({ nativeEvent: { pageY: y } }) as any;

  const settle = async (renderer: Mounted) => {
    await advance(400);
    return renderer;
  };

  it("follows a finger dragging the header down", async () => {
    const renderer = await settle(await open());

    act(() => header(renderer).props.onTouchStart(touch(100)));
    act(() => header(renderer).props.onTouchMove(touch(140)));
    await advance(16);

    expect(motion(renderer).sheet.transform[0].translateY).toBeCloseTo(40, 0);
  });

  it("doesn't move up past its resting place", async () => {
    const renderer = await settle(await open());

    act(() => header(renderer).props.onTouchStart(touch(100)));
    act(() => header(renderer).props.onTouchMove(touch(60)));
    await advance(16);

    expect(motion(renderer).sheet.transform[0].translateY).toBe(0);
  });

  it("springs back when let go after a short drag", async () => {
    const onClose = jest.fn();
    const renderer = await settle(await open({ onClose }));

    act(() => header(renderer).props.onTouchStart(touch(100)));
    act(() => header(renderer).props.onTouchMove(touch(180)));
    act(() => header(renderer).props.onTouchEnd());
    await advance(200);

    expect(onClose).not.toHaveBeenCalled();
    expect(motion(renderer).sheet.transform[0].translateY).toBe(0);
  });

  it("closes when let go after dragging further than 100 px", async () => {
    const onClose = jest.fn();
    const renderer = await settle(await open({ onClose }));

    act(() => header(renderer).props.onTouchStart(touch(100)));
    act(() => header(renderer).props.onTouchMove(touch(230)));
    act(() => header(renderer).props.onTouchEnd());

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("carries on out of the screen when the screen closes it", async () => {
    const Host = () => {
      const [visible, setVisible] = React.useState(true);
      return sheetElement({ visible, onClose: () => setVisible(false) });
    };
    const renderer = await settle(await mount(<Host />));

    act(() => header(renderer).props.onTouchStart(touch(100)));
    act(() => header(renderer).props.onTouchMove(touch(230)));
    act(() => header(renderer).props.onTouchEnd());
    await advance(100);

    // Still on its way out from where the finger left it, not snapped back
    expect(renderer.root.findAllByType(Modal)).toHaveLength(1);
    expect(motion(renderer).sheet.transform[0].translateY).toBeGreaterThan(130);

    await advance(200);
    expect(renderer.root.findAllByType(Modal)).toHaveLength(0);
  });

  it("comes back up when the screen decides to keep it open, such as to ask first", async () => {
    // onClose does nothing, like a screen that shows "Discard changes?" first
    const renderer = await settle(await open({ onClose: () => {} }));

    act(() => header(renderer).props.onTouchStart(touch(100)));
    act(() => header(renderer).props.onTouchMove(touch(230)));
    act(() => header(renderer).props.onTouchEnd());
    await advance(16);
    expect(motion(renderer).sheet.transform[0].translateY).toBeGreaterThan(50);

    await advance(200);
    expect(motion(renderer).sheet.transform[0].translateY).toBe(0);
    expect(renderer.root.findAllByType(Modal)).toHaveLength(1);
  });

  it("does not close for a tap on the header", async () => {
    const onClose = jest.fn();
    const renderer = await settle(await open({ onClose }));

    act(() => header(renderer).props.onTouchStart(touch(100)));
    act(() => header(renderer).props.onTouchEnd());

    expect(onClose).not.toHaveBeenCalled();
  });

  it("treats a cancelled touch like letting go", async () => {
    const onClose = jest.fn();
    const renderer = await settle(await open({ onClose }));

    act(() => header(renderer).props.onTouchStart(touch(100)));
    act(() => header(renderer).props.onTouchMove(touch(300)));
    act(() => header(renderer).props.onTouchCancel());

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores moves that didn't start on the header", async () => {
    const renderer = await settle(await open());

    act(() => header(renderer).props.onTouchMove(touch(300)));
    await advance(16);

    expect(motion(renderer).sheet.transform[0].translateY).toBe(0);
  });
});
