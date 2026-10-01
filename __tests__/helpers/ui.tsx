import React from "react";
import { AccessibilityInfo, StyleSheet } from "react-native";
import { darkColors, lightColors } from "@/constants/theme";
import { ThemeContext, ThemeValue } from "@/lib/ThemeContext";
import { resetReducedMotion } from "@/lib/useReducedMotion";
import {
  act,
  create,
  ReactTestInstance,
  ReactTestRenderer,
} from "react-test-renderer";

const mounted = new Set<ReactTestRenderer>();

afterEach(() => {
  // Unmounting stops the looping animations, so Jest can exit
  mounted.forEach((renderer) => act(() => renderer.unmount()));
  mounted.clear();

  // React Native's Jest setup makes these shared jest.fn()s, and
  // restoreAllMocks doesn't undo what a test set on them. Without this, one
  // test's "reduce motion is on" would carry into the next.
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockReset();
  jest.mocked(AccessibilityInfo.addEventListener).mockReset();
  // ...and what the hook remembered of the phone's answer
  resetReducedMotion();
});

/**
 * Renders an element and lets effects settle, including the promise that reads
 * the phone's reduce-motion setting. Unmounted automatically after the test.
 */
export const mount = async (element: React.ReactElement) => {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(element);
  });
  mounted.add(renderer);
  return renderer;
};

const DARK_THEME: ThemeValue = {
  scheme: "dark",
  colors: darkColors,
  setting: "dark",
  setSetting: () => {},
  ready: true,
};

/** Draws an element the way it looks with the dark theme on. Components outside a provider are light. */
export const inDark = (element: React.ReactElement) => (
  <ThemeContext.Provider value={DARK_THEME}>{element}</ThemeContext.Provider>
);

/** Every colour the host views of a tree are drawn with, read from their styles. */
export const colorsDrawn = (renderer: ReactTestRenderer) => {
  const drawn = new Set<string>();
  const visit = (node: ReactTestInstance) => {
    if (typeof node.type === "string") {
      const style = StyleSheet.flatten(
        typeof node.props.style === "function" ? node.props.style({ pressed: false }) : node.props.style
      );
      for (const [key, value] of Object.entries(style ?? {})) {
        if (/olor$/.test(key) && typeof value === "string") drawn.add(value);
      }
    }
    node.children.forEach((child) => typeof child !== "string" && visit(child));
  };
  visit(renderer.root);
  return drawn;
};

/** Colours that only the light palette has: drawing one in the dark theme is a leak. */
export const lightOnlyColors: string[] = Object.values(lightColors).filter(
  (value) => !(Object.values(darkColors) as string[]).includes(value)
);

/** The colours of the light theme that a tree drawn in dark still uses. */
export const lightLeaks = (renderer: ReactTestRenderer) =>
  [...colorsDrawn(renderer)].filter((color) => lightOnlyColors.includes(color));

/** Re-renders with new props, letting effects run, like a state change would. */
export const update = (renderer: ReactTestRenderer, element: React.ReactElement) =>
  act(async () => {
    renderer.update(element);
  });

/** Pretends the phone's Reduce Motion setting is on (or off). */
export const setReduceMotion = (enabled: boolean) =>
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(enabled);

/** Moves fake time forward and lets animations and effects run. */
export const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

/**
 * The style a Reanimated view has right now. Reanimated keeps it on
 * `jestAnimatedStyle` when running under Jest.
 */
export const animatedStyleOf = (node: ReactTestInstance): any =>
  node.props.jestAnimatedStyle?.value;

/** Every Reanimated view under `root`, in tree order, with its current style. */
export const animatedStyles = (root: ReactTestInstance): any[] =>
  root
    .findAll((node) => node.props?.jestAnimatedStyle !== undefined)
    // findAll returns the composite and the host view for each; keep one each
    .filter((node) => typeof node.type === "string")
    .map(animatedStyleOf);

/**
 * Finds the instances of a component exported with React.memo. The test
 * renderer reports the inner function as a memo component's type, so
 * `findAllByType(Memo)` finds nothing.
 */
export const findAllMemo = (root: ReactTestInstance, component: unknown) =>
  root.findAll((node) => node.type === (component as { type: unknown }).type);

/** The native-side element with a testID, not the component that was given it. */
export const hostByTestId = (root: ReactTestInstance, testID: string) => {
  const [node] = root.findAll(
    (candidate) =>
      typeof candidate.type === "string" && candidate.props.testID === testID
  );
  if (!node) throw new Error(`No element with testID "${testID}"`);
  return node;
};

/** All the text under a node, joined, including text in nested <Text>. */
export const textContent = (node: ReactTestInstance): string =>
  node.children
    .map((child) => (typeof child === "string" ? child : textContent(child)))
    .join("");
