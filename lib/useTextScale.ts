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
 * A screen this many dp wide at 100% text (or fewer, at the text size in
 * use) can't fit a piano's name and company in half its width without
 * breaking a word, so the grid shows one card per row there. A 411 dp phone
 * keeps two columns up to 180%, a 384 dp phone (S24 FE) up to about 170%.
 */
export const GRID_ONE_COLUMN_BELOW = 225;

export const gridColumnsFor = (width: number, fontScale: number) =>
  width / Math.max(fontScale, 1) < GRID_ONE_COLUMN_BELOW ? 1 : 2;

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

/** How many cards a row of the pianos grid holds on this screen at this Font size */
export const useGridColumns = () => {
  const { width, fontScale } = useWindowDimensions();
  return gridColumnsFor(width, fontScale);
};

export default useTextScale;
