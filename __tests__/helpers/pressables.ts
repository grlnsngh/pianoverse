import { Pressable } from "react-native";
import type { ReactTestInstance } from "react-test-renderer";

/**
 * React Native exports Pressable wrapped in React.memo, and the test renderer
 * reports the function inside as its type, so `findAllByType(Pressable)`
 * finds nothing. These look for that function instead.
 */
const pressableType = (Pressable as unknown as { type: unknown }).type;

/** Every Pressable under `root`, in tree order. */
export const findAllPressables = (root: ReactTestInstance) =>
  root.findAll((node) => node.type === pressableType);

/** The one Pressable under `root`; throws when there is none or more than one, like `findByType`. */
export const findPressable = (root: ReactTestInstance) => {
  const found = findAllPressables(root);
  if (found.length !== 1) {
    throw new Error(`Expected 1 Pressable but found ${found.length}`);
  }
  return found[0];
};
