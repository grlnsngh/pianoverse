import React from "react";
import Svg, { Path, Rect } from "react-native-svg";
import { useColors } from "@/lib/ThemeContext";

// The keys and the lines between them on the Account and NotifyPrimer boards
const KEYS = "#FFE2A8";
const KEY_LINES = "#E3B865";
const BLACK_KEYS = [6.5, 16.5, 36.5, 46.5, 56.5];

export type KeyboardMarkProps = {
  /** Width in px. The height is 48/70 of it. */
  width?: number;
};

/**
 * A little piano keyboard, drawn on the orange square of a sample
 * notification. It says "Pianoverse" without words.
 */
const KeyboardMark = ({ width = 24 }: KeyboardMarkProps) => {
  const colors = useColors();
  return (
    <Svg
      width={width}
      height={(width * 48) / 70}
      viewBox="0 0 70 48"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Rect width={70} height={48} rx={5} fill={KEYS} />
      <Path d="M10 0v48M20 0v48M30 0v48M40 0v48M50 0v48M60 0v48" stroke={KEY_LINES} />
      {BLACK_KEYS.map((x) => (
        <Rect key={x} x={x} width={7} height={29} rx={1.5} fill={colors.onBrand} />
      ))}
    </Svg>
  );
};

export default KeyboardMark;
