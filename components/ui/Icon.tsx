import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useColors } from "@/lib/ThemeContext";

/**
 * A stroked shape on the 24 x 24 grid: a path, a circle, a rounded rectangle,
 * or (`filled`) a solid dot.
 */
type Shape =
  | { d: string }
  | { cx: number; cy: number; r: number; filled?: true }
  | { x: number; y: number; width: number; height: number; rx: number };

const isPath = (shape: Shape): shape is { d: string } => "d" in shape;
const isRect = (
  shape: Shape
): shape is { x: number; y: number; width: number; height: number; rx: number } =>
  "width" in shape;

/** The icon set from docs/redesign/SPEC.md section 5. */
export const ICONS = {
  search: [{ cx: 11, cy: 11, r: 7 }, { d: "m20 20-3.5-3.5" }],
  // From the NoResults board: the search icon with a cross in the lens
  searchOff: [{ cx: 11, cy: 11, r: 7 }, { d: "m20 20-3.5-3.5M8.5 8.5l5 5M13.5 8.5l-5 5" }],
  sliders: [
    { d: "M4 7h10M18 7h2M4 17h2M10 17h10" },
    { cx: 16, cy: 7, r: 2 },
    { cx: 8, cy: 17, r: 2 },
  ],
  plus: [{ d: "M12 5v14M5 12h14" }],
  chevronRight: [{ d: "m9 6 6 6-6 6" }],
  chevronLeft: [{ d: "m15 6-6 6 6 6" }],
  chevronDown: [{ d: "m6 9 6 6 6-6" }],
  check: [{ d: "m5 12.5 4.5 4.5L19 7.5" }],
  close: [{ d: "M6 6l12 12M18 6 6 18" }],
  more: [
    { cx: 5, cy: 12, r: 1.8, filled: true },
    { cx: 12, cy: 12, r: 1.8, filled: true },
    { cx: 19, cy: 12, r: 1.8, filled: true },
  ],
  share: [
    { d: "M12 15V4M8 8l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" },
  ],
  phone: [
    {
      d: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
    },
  ],
  message: [{ d: "M4 20l1.3-4.2A8 8 0 1 1 8.3 18.8L4 20z" }],
  tabToday: [
    { x: 3.5, y: 5, width: 17, height: 15.5, rx: 3 },
    { d: "M3.5 10h17M8 3v4M16 3v4" },
  ],
  tabPianos: [
    { x: 3, y: 5, width: 18, height: 14, rx: 2.5 },
    { d: "M9 19v-4M15 19v-4M7.5 5v6M12 5v6M16.5 5v6" },
  ],
  tabAccount: [{ cx: 12, cy: 8, r: 4 }, { d: "M4.5 20.5a7.5 7.5 0 0 1 15 0" }],
  categoryAll: [{ d: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" }],
  categoryRentable: [
    { d: "M12 15a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM11 12l9-9M16 7l3 3" },
  ],
  categoryEvents: [
    {
      d: "M9 18V5l11-2v13M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM20 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z",
    },
  ],
  categoryOnSale: [{ d: "M3.5 12.5V4.5h8l9 9-8 8-9-9zM8 8.5h.01" }],
  categoryWarehouse: [{ d: "M3 8l9-5 9 5v8l-9 5-9-5V8zM3 8l9 5 9-5M12 13v8" }],
  bell: [
    { d: "M6 9a6 6 0 0 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9zM10 20a2 2 0 0 0 4 0" },
  ],
  download: [{ d: "M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" }],
  logout: [{ d: "M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M15 8l4 4-4 4M19 12H9" }],
  chart: [{ d: "M5 20v-7M12 20V5M19 20v-10" }],
  moon: [{ d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" }],
  lock: [{ d: "M6 11h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1zM8 11V8a4 4 0 0 1 8 0v3M12 15v2" }],
  wifiOff: [
    { d: "M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18" },
  ],
  camera: [
    {
      d: "M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z",
    },
    { cx: 12, cy: 13, r: 3.5 },
  ],
  cameraOff: [
    {
      d: "M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z",
    },
    { cx: 12, cy: 13, r: 3.5 },
    { d: "M3 3l18 18" },
  ],
  refresh: [{ d: "M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5" }],
  alert: [{ cx: 12, cy: 12, r: 9 }, { d: "M12 7.5v5.5M12 16.5v.01" }],
  list: [{ d: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" }],
  pencil: [{ d: "M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" }],
  trash: [{ d: "M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13" }],
} as const satisfies Record<string, readonly Shape[]>;

export type IconName = keyof typeof ICONS;

export type IconProps = {
  name: IconName;
  /** Width and height in px */
  size?: number;
  color?: string;
  /** Selected tab or control: a slightly heavier stroke (2 instead of 1.75) */
  active?: boolean;
  /**
   * Stroke in the 24 unit grid, when the default doesn't fit. Small icons need
   * more: the toast's 13 px check is drawn at 3.2 to look as heavy as the rest.
   */
  strokeWidth?: number;
  /**
   * Set this when the icon stands alone. Without it the icon is hidden from
   * screen readers, since the button or row around it carries the label.
   */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const Icon = ({
  name,
  size = 24,
  color,
  active = false,
  strokeWidth,
  accessibilityLabel,
  style,
  testID,
}: IconProps) => {
  const colors = useColors();
  const stroke = color ?? colors.ink;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth ?? (active ? 2 : 1.75)}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      testID={testID}
      {...(accessibilityLabel
        ? { accessible: true, accessibilityRole: "image", accessibilityLabel }
        : {
            accessibilityElementsHidden: true,
            importantForAccessibility: "no-hide-descendants",
          })}
    >
      {(ICONS[name] as readonly Shape[]).map((shape, i) => {
        if (isPath(shape)) return <Path key={i} d={shape.d} />;
        if (isRect(shape)) return <Rect key={i} {...shape} />;
        return shape.filled ? (
          <Circle
            key={i}
            cx={shape.cx}
            cy={shape.cy}
            r={shape.r}
            fill={stroke}
            stroke="none"
          />
        ) : (
          <Circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} />
        );
      })}
    </Svg>
  );
};

export default React.memo(Icon);
