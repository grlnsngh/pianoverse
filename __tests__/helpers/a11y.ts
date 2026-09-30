import { Pressable, StyleSheet, TouchableOpacity } from "react-native";
import { ReactTestInstance } from "react-test-renderer";

/** The least a finger needs, in px (SPEC: 44 x 44). */
export const MIN_TARGET = 44;

/** Hidden from screen readers on purpose, such as a strip of letters that only speeds up scrolling. */
const isHidden = (node: ReactTestInstance) => {
  for (let current: ReactTestInstance | null = node; current; current = current.parent) {
    if (
      current.props.accessibilityElementsHidden ||
      current.props.importantForAccessibility === "no-hide-descendants"
    ) {
      return true;
    }
  }
  return false;
};

/** Every Pressable and TouchableOpacity a person could meet, which is what a finger actually lands on. */
const touchables = (root: ReactTestInstance) =>
  [...root.findAllByType(Pressable), ...root.findAllByType(TouchableOpacity)].filter(
    (node) => !isHidden(node)
  );

const textOf = (node: ReactTestInstance): string =>
  node.children
    .map((child) => (typeof child === "string" ? child : textOf(child)))
    .join("");

/** What a screen reader would call it: its label, or else the words inside it. */
const nameOf = (node: ReactTestInstance) => {
  const label = node.props.accessibilityLabel;
  if (typeof label === "string" && label.trim()) return label.trim();
  return textOf(node).trim();
};

/** The size a pressable is given in its style, when it is given one (the other side is left to its content). */
const sizeOf = (node: ReactTestInstance) => {
  const style = node.props.style;
  const flat = StyleSheet.flatten(typeof style === "function" ? style({ pressed: false }) : style) ?? {};
  const slop = node.props.hitSlop;
  const extra = (side: "top" | "bottom" | "left" | "right") =>
    typeof slop === "number" ? slop : slop?.[side] ?? 0;
  // 0 means the size comes from the layout (flex), which a test can't see
  const given = (value: unknown) => (typeof value === "number" && value > 0 ? value : undefined);
  const height = given(flat.height) ?? given(flat.minHeight);
  const width = given(flat.width) ?? given(flat.minWidth);
  return {
    height: height === undefined ? undefined : height + extra("top") + extra("bottom"),
    width: width === undefined ? undefined : width + extra("left") + extra("right"),
  };
};

export type A11yProblem = { what: string; name: string };

/**
 * What is wrong for someone using a screen reader or a thumb, on whatever is
 * rendered under `root`: a pressable with nothing to read out, a pressable that
 * doesn't say what kind of control it is, or one whose style makes it smaller
 * than 44 px where it is given a size.
 */
export const a11yProblems = (root: ReactTestInstance): A11yProblem[] =>
  touchables(root).flatMap((node) => {
    const name = nameOf(node);
    const problems: A11yProblem[] = [];
    if (!name) problems.push({ what: "has no name to read out", name: "(unnamed)" });
    if (!node.props.accessibilityRole && node.props.accessible !== false) {
      problems.push({ what: "has no role (button, link, tab...)", name });
    }
    const { height, width } = sizeOf(node);
    if (height !== undefined && height < MIN_TARGET) {
      problems.push({ what: `is ${height} px high (the least is ${MIN_TARGET})`, name });
    }
    if (width !== undefined && width < MIN_TARGET) {
      problems.push({ what: `is ${width} px wide (the least is ${MIN_TARGET})`, name });
    }
    return problems;
  });

/** The problems as lines a failing test prints: "Sort by Latest: is 32 px high". */
export const describeProblems = (problems: A11yProblem[]) =>
  problems.map(({ name, what }) => `${name}: ${what}`);
