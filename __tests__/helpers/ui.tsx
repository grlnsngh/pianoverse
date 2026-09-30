import React from "react";
import { AccessibilityInfo } from "react-native";
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
