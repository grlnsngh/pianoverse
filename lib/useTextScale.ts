import { useWindowDimensions } from "react-native";

/**
 * From this Font size on (125%), a screen switches to its big-text layout: a
 * label above its value instead of beside it, a button under the amount, and
 * so on (docs/large-text/PLAN.md, D2 and D4). Below it the layouts are the
 * boards' own, so on most phones 115% leaves everything as drawn.
 */
export const LARGE_TEXT_FROM = 1.25;

export const isLargeText = (fontScale: number) => fontScale >= LARGE_TEXT_FROM;

/**
 * What the person's Font size (Android) or Text size (iOS) is, and whether it
 * is big enough that crowded rows should stack. It follows the setting while
 * the app is open. Never write a layout that only works at 100%: see "Large
 * text" in CLAUDE.md.
 */
const useTextScale = () => {
  const { fontScale } = useWindowDimensions();
  return { fontScale, large: isLargeText(fontScale) };
};

export default useTextScale;
