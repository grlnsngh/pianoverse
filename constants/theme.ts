import type { TextStyle, ViewStyle } from "react-native";

/**
 * Design tokens for the redesign (docs/redesign/SPEC.md sections 3, 4, 5 and 7).
 *
 * tailwind.config.js repeats the colours and radii for `className`. It can't
 * import TypeScript, so __tests__/designTokens.test.ts keeps the two in step.
 * Use these values directly where a style has to change at runtime (pressed
 * states, animations) or where a class name can't reach (svg, shadows).
 */

// The four category colours in constants/colors.ts are not part of the new
// design: category is shown as plain text plus an icon, never a coloured chip.
export const colors = {
  white: "#FFFFFF",
  /** Screens with lists */
  page: "#FFFFFF",
  /** Screens and sheets made of grouped panels */
  grouped: "#F6F5F2",
  /** Search field fill, secondary buttons */
  fill: "#EFEDE8",
  /** Text input fill */
  fillInput: "#F1EFEA",
  /** Dividers */
  hairline: "#E7E4DD",
  /** Input borders */
  inputBorder: "#C9C4B9",
  /** Outline of round controls such as the filter button */
  controlBorder: "#D9D5CC",
  /** Primary text, selected states, the active tab */
  ink: "#1A1814",
  /** Body copy in dialogs and explainers */
  inkBody: "#3C3831",
  /** Secondary text */
  ink2: "#6B665D",
  /** Placeholders and inactive tab labels */
  ink3: "#77716A",
  /** Primary buttons (ink text on it), the + button, switches on, progress fill */
  brand: "#FF9C01",
  brandPressed: "#E88A00",
  /** Orange used as text or a link on white */
  brandText: "#A85D00",
  /** Toast action on the ink toast */
  brandOnInk: "#FFB84D",
  /** Overdue text, badge fill, destructive buttons and text */
  late: "#C4321C",
  lateTint: "#FCEDEA",
  lateTintText: "#7A1F10",
  disabledFill: "#EFEDE8",
  disabledText: "#A39D92",
  switchOff: "#D9D5CC",
  /** Behind sheets and dialogs */
  dim: "rgba(26, 24, 20, 0.45)",
  /** Track of a progress bar drawn over a photo */
  progressTrack: "rgba(26, 24, 20, 0.28)",
  skeletonBase: "#EFEDE8",
  skeletonHighlight: "#F8F7F4",
} as const;

export const radii = {
  input: 12,
  control: 14,
  card: 16,
  panel: 20,
  /** Top corners only */
  sheet: 24,
  /** Avatars, the + button, badges and pills */
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  /** Margin at the left and right edge of a screen */
  screen: 20,
  /** Smallest tap target, width and height */
  minTarget: 44,
} as const;

/** One family per weight, as React Native needs. Loaded in app/_layout.tsx. */
export const fonts = {
  regular: "Figtree_400Regular",
  medium: "Figtree_500Medium",
  semibold: "Figtree_600SemiBold",
  bold: "Figtree_700Bold",
} as const;

/** Amounts and dates line up when digits are all the same width. */
const tabular: TextStyle["fontVariant"] = ["tabular-nums"];

/**
 * Type styles. React Native takes letter spacing in px, so the spec's em values
 * are converted (32 px at -0.02em is -0.64).
 */
export const type = {
  /** Tab titles */
  largeTitle: {
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.64,
  },
  /** Received this month, sheet amounts */
  amount: {
    fontFamily: fonts.bold,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1.1,
    fontVariant: tabular,
  },
  /** Detail page */
  pianoTitle: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.56,
  },
  /** Section titles */
  section: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  /** Card and row titles */
  rowTitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  /** Form values, descriptions */
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  /** Meta lines */
  secondary: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  /** Coloured status */
  status: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  /** Hints */
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  /** Smallest hint, and the label inside an outlined field */
  hint: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  /** Text in a badge */
  badge: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 18 },
  tabLabel: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 },
  tabLabelActive: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14 },
  /** Button label */
  button: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  /** Centred title in a sheet's header row */
  sheetTitle: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
} as const satisfies Record<string, TextStyle>;

/** The only shadow in the design, on the search pill. */
export const shadows = {
  searchPill: {
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
} as const satisfies Record<string, ViewStyle>;

/** Durations in milliseconds and easing as cubic-bezier control points. */
export const motion = {
  duration: {
    press: 100,
    switch: 200,
    /** Push and back */
    push: 300,
    sheetIn: 320,
    sheetOut: 240,
    photoToHero: 380,
    /** Cross-fade, no slide */
    tabSwitch: 120,
    /** 24 px slide plus fade */
    addStep: 240,
    toastIn: 220,
    toastOut: 180,
    /** How long a toast stays */
    toastHold: 3000,
    checkPop: 280,
    checkDraw: 260,
    /** One pass of the skeleton shimmer, looping */
    shimmer: 1500,
    /** One loop of the keys loader, with each bar starting `keysStagger` later */
    keysLoop: 1100,
    keysStagger: 120,
    /** With reduced motion, every change is a fade this long */
    reducedFade: 120,
    /** Show a skeleton only after this long */
    skeletonDelay: 200,
  },
  easing: {
    standard: [0.2, 0, 0, 1],
    accelerate: [0.3, 0, 1, 1],
    decelerate: [0, 0, 0, 1],
  },
  /** How far an add step slides in, in px */
  addStepOffset: 24,
  /** Scale of a pressed button */
  pressedScale: 0.98,
} as const;

export type PianoPalette = {
  name: string;
  wall: string;
  floor: string;
  body: string;
  dark: string;
  panel: string;
};

/**
 * Colours of the no-photo piano drawing. A piano gets one by hashing its id,
 * so it always looks the same. The order is part of that mapping: don't
 * reorder, add new palettes at the end.
 */
export const pianoPalettes: readonly PianoPalette[] = [
  {
    name: "walnut",
    wall: "#E9E1D3",
    floor: "#D8CDBB",
    body: "#6A5545",
    dark: "#4A3B30",
    panel: "#57453A",
  },
  {
    name: "ebony",
    wall: "#DDE3DC",
    floor: "#C9D1C7",
    body: "#34302E",
    dark: "#24211F",
    panel: "#2B2826",
  },
  {
    name: "mahogany",
    wall: "#E8DDD9",
    floor: "#D8CBC6",
    body: "#7A3E2F",
    dark: "#5A2B20",
    panel: "#683528",
  },
  {
    name: "oak",
    wall: "#E1E6EA",
    floor: "#CFD5DB",
    body: "#B08A5E",
    dark: "#8C6A43",
    panel: "#9C7A50",
  },
  {
    name: "white",
    wall: "#EFE9E0",
    floor: "#DDD5C8",
    body: "#F4F1EA",
    dark: "#D9D3C6",
    panel: "#E6E0D3",
  },
];
