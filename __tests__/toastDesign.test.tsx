import React from "react";
import { Platform, Pressable, StyleSheet, Text, ToastAndroid, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { act } from "react-test-renderer";
import ToastHost from "@/components/ToastHost";
import { ICONS } from "@/components/ui/Icon";
import { colors, fonts, radii } from "@/constants/theme";
import { setToastListener, showToast } from "@/utils/toast";
import { advance, mount, setReduceMotion, textContent } from "./helpers/ui";

type Mounted = Awaited<ReturnType<typeof mount>>;

// Like the app: a phone 390 wide with a 34 px home indicator
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

const host = async () => mount(withSafeArea(<ToastHost />));

/** The view that slides and fades: the toast's outer wrapper. */
const wrapper = (renderer: Mounted) =>
  renderer.root.find(
    (node) => typeof node.type === "string" && node.props.accessibilityLiveRegion === "polite"
  );
const wrapperStyle = (renderer: Mounted) => StyleSheet.flatten(wrapper(renderer).props.style);
/** The ink pill inside it. */
const pill = (renderer: Mounted) => wrapper(renderer).findAllByType(View)[0];
const pillStyle = (renderer: Mounted) => StyleSheet.flatten(pill(renderer).props.style);
const shown = (renderer: Mounted) =>
  renderer.root.findAll(
    (node) => typeof node.type === "string" && node.props.accessibilityLiveRegion === "polite"
  ).length > 0;
const iconPaths = (renderer: Mounted) =>
  renderer.root.findAllByType(Path).map((path) => path.props.d as string);

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  setToastListener(null);
});

describe("a toast's look", () => {
  it("is an ink pill, 52 high with radius 14, and 20 px in from the sides", async () => {
    const renderer = await host();
    await act(async () => showToast("Piano deleted"));

    expect(pillStyle(renderer)).toMatchObject({
      backgroundColor: colors.ink,
      borderRadius: radii.control,
      minHeight: 52,
      paddingHorizontal: 16,
      gap: 12,
    });
    expect(wrapperStyle(renderer)).toMatchObject({ left: 20, right: 20 });
  });

  it("sits 12 px above the 84 px tab bar (or the sticky bar on a piano page)", async () => {
    const renderer = await host();
    await act(async () => showToast("Piano deleted"));

    // 34 px home indicator plus the 50 px bar, plus the gap
    expect(wrapperStyle(renderer).bottom).toBe(84 + 12);
  });

  it("has white 14 px semibold text", async () => {
    const renderer = await host();
    await act(async () => showToast("Piano deleted"));
    const text = renderer.root.findByType(Text);

    expect(StyleSheet.flatten(text.props.style)).toMatchObject({
      color: colors.white,
      fontFamily: fonts.semibold,
      fontSize: 14,
      lineHeight: 20,
    });
    expect(textContent(text)).toBe("Piano deleted");
  });

  it("is text only when it has no variant", async () => {
    const renderer = await host();
    await act(async () => showToast("Piano deleted"));

    expect(iconPaths(renderer)).toEqual([]);
  });

  it("has an orange circle with an ink check when it says something worked", async () => {
    const renderer = await host();
    await act(async () => showToast("Payment saved", { variant: "success" }));
    // findAllByType includes the pill itself, so the circle is the second View
    const circle = pill(renderer).findAllByType(View)[1];
    const check = renderer.root.findAllByType(Path)[0];

    expect(StyleSheet.flatten(circle.props.style)).toMatchObject({
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.brand,
    });
    expect(check.props).toMatchObject({ d: ICONS.check[0].d });
    // Drawn at 13 px with a heavy stroke so it holds up at that size
    const svg = renderer.root.findByType(Svg);
    expect(svg.props).toMatchObject({ width: 13, height: 13, stroke: colors.ink, strokeWidth: 3.2 });
  });

  it("has a coral alert icon when it says something failed", async () => {
    const renderer = await host();
    await act(async () => showToast("Couldn’t save. Check your connection.", { variant: "error" }));
    const alert = renderer.root.findAllByType(Path)[0];
    const svg = renderer.root.findByType(Svg);

    expect(alert.props.d).toBe(ICONS.alert[1].d);
    expect(svg.props).toMatchObject({
      width: 22,
      height: 22,
      stroke: colors.lateOnInk,
      strokeWidth: 2,
    });
    expect(wrapper(renderer).props.accessibilityRole).toBe("alert");
  });

  it("wraps a long message onto two lines instead of cutting it off", async () => {
    const renderer = await host();
    await act(async () =>
      showToast("Couldn’t save this piano because the connection dropped while uploading photos.")
    );
    const text = StyleSheet.flatten(renderer.root.findByType(Text).props.style);

    expect(text.flexShrink).toBe(1);
    expect(pillStyle(renderer).minHeight).toBe(52);
    expect(pillStyle(renderer).height).toBeUndefined();
  });
});

describe("a toast with a button", () => {
  const withAction = (onPress = jest.fn(), label = "Retry") => ({
    variant: "error" as const,
    action: { label, onPress },
  });

  it("shows an orange bold action on the right", async () => {
    const renderer = await host();
    await act(async () => showToast("Couldn’t save.", withAction()));
    const action = renderer.root.findByType(Pressable);
    const label = action.findByType(Text);

    expect(textContent(label)).toBe("Retry");
    expect(StyleSheet.flatten(label.props.style)).toMatchObject({
      color: colors.brandOnInk,
      fontFamily: fonts.bold,
    });
    expect(action.props.accessibilityRole).toBe("button");
    expect(action.props.accessibilityLabel).toBe("Retry");
  });

  it("has a tap target of at least 44 px", async () => {
    const renderer = await host();
    await act(async () => showToast("Piano deleted", { action: { label: "Undo", onPress: () => {} } }));

    expect(StyleSheet.flatten(renderer.root.findByType(Pressable).props.style).minHeight).toBe(44);
  });

  it("runs the action and takes the toast away when it is pressed", async () => {
    const onPress = jest.fn();
    const renderer = await host();
    await act(async () => showToast("Piano deleted", { action: { label: "Undo", onPress } }));

    await act(async () => renderer.root.findByType(Pressable).props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);

    await advance(250);
    expect(shown(renderer)).toBe(false);
  });

  it("lets touches through the toast's edges only when it has no button", async () => {
    const renderer = await host();

    await act(async () => showToast("Saved"));
    expect(wrapper(renderer).props.pointerEvents).toBe("none");

    await act(async () => showToast("Piano deleted", { action: { label: "Undo", onPress: () => {} } }));
    expect(wrapper(renderer).props.pointerEvents).toBe("box-none");
  });

  it("has no button unless it is given one", async () => {
    const renderer = await host();
    await act(async () => showToast("Saved", { variant: "success" }));

    expect(renderer.root.findAllByType(Pressable)).toHaveLength(0);
  });
});

describe("a toast's motion", () => {
  it("rises 24 px and fades in over 220 ms", async () => {
    const renderer = await host();
    await act(async () => showToast("Saved"));

    expect(wrapperStyle(renderer)).toMatchObject({ opacity: 0, transform: [{ translateY: 24 }] });
    await advance(110);
    const halfway = wrapperStyle(renderer);
    expect(halfway.opacity).toBeGreaterThan(0.5);
    expect(halfway.transform[0].translateY).toBeLessThan(12);
    await advance(120);
    expect(wrapperStyle(renderer)).toMatchObject({ opacity: 1, transform: [{ translateY: 0 }] });
  });

  it("stays for 3 seconds, then sinks 12 px and fades out over 180 ms", async () => {
    const renderer = await host();
    await act(async () => showToast("Saved"));

    await advance(3200);
    expect(wrapperStyle(renderer).opacity).toBeGreaterThan(0.95);

    await advance(110);
    const leaving = wrapperStyle(renderer);
    expect(leaving.opacity).toBeLessThan(0.7);
    expect(leaving.transform[0].translateY).toBeGreaterThan(0);

    await advance(200);
    expect(shown(renderer)).toBe(false);
  });

  it("stays longer for a long message", async () => {
    const renderer = await host();
    await act(async () => showToast("Password reset email sent!", "long"));

    await advance(5000);
    expect(shown(renderer)).toBe(true);
    await advance(500);
    expect(shown(renderer)).toBe(false);
  });

  it("only fades, over 120 ms, when the phone asks for less motion", async () => {
    setReduceMotion(true);
    const renderer = await host();
    await act(async () => showToast("Saved"));

    expect(wrapperStyle(renderer)).toMatchObject({ opacity: 0, transform: [{ translateY: 0 }] });
    await advance(60);
    const halfway = wrapperStyle(renderer);
    expect(halfway.opacity).toBeGreaterThan(0.3);
    expect(halfway.transform[0].translateY).toBe(0);
    await advance(70);
    expect(wrapperStyle(renderer).opacity).toBe(1);
  });

  it("gives way to a newer toast, which gets its full time", async () => {
    const renderer = await host();
    await act(async () => showToast("First"));
    // The first one has started to leave when the second arrives
    await advance(3300);
    await act(async () => showToast("Second"));

    await advance(300);
    expect(textContent(renderer.root.findByType(Text))).toBe("Second");
    // The first toast's exit must not wipe out the second
    await advance(2500);
    expect(textContent(renderer.root.findByType(Text))).toBe("Second");
    expect(wrapperStyle(renderer).opacity).toBe(1);

    await advance(1000);
    expect(shown(renderer)).toBe(false);
  });
});

describe("showToast", () => {
  const listener = () => {
    const received = jest.fn();
    setToastListener(received);
    return received;
  };

  it("still takes a duration on its own", () => {
    const received = listener();

    showToast("Saved", "long");

    expect(received).toHaveBeenCalledWith("Saved", "long", { variant: undefined, action: undefined });
  });

  it("takes a duration, a variant and an action together", () => {
    const received = listener();
    const action = { label: "Undo", onPress: jest.fn() };

    showToast("Piano deleted", { duration: "long", variant: "success", action });

    expect(received).toHaveBeenCalledWith("Piano deleted", "long", { variant: "success", action });
  });

  it("is a short toast by default", () => {
    const received = listener();

    showToast("Saved", { variant: "success" });

    expect(received.mock.calls[0][1]).toBe("short");
  });

  describe("on Android", () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, "OS", "android");
    });

    it("uses the native toast for a plain message, which shows above sheets and dialogs", () => {
      const native = jest.spyOn(ToastAndroid, "show").mockImplementation(() => {});
      const received = listener();

      showToast("Saved");
      showToast("Password reset email sent!", "long");
      showToast("Saved", { duration: "long", variant: "success" });

      expect(native.mock.calls).toEqual([
        ["Saved", ToastAndroid.SHORT],
        ["Password reset email sent!", ToastAndroid.LONG],
        ["Saved", ToastAndroid.LONG],
      ]);
      expect(received).not.toHaveBeenCalled();
    });

    it("draws a toast with a button in the app, because a native toast can't hold one", () => {
      const native = jest.spyOn(ToastAndroid, "show").mockImplementation(() => {});
      const received = listener();
      const action = { label: "Undo", onPress: jest.fn() };

      showToast("Piano deleted", { action });

      expect(native).not.toHaveBeenCalled();
      expect(received).toHaveBeenCalledWith("Piano deleted", "short", { variant: undefined, action });
    });
  });
});
