import type { TextStyle, ViewStyle } from "react-native";

/**
 * Design tokens for the redesign (docs/redesign/SPEC.md sections 3, 4, 5 and 7).
 *
 * web/site.css (the pages on GitHub Pages) and email/password-recovery.html
 * repeat the colours. They can't import TypeScript, so
 * __tests__/webPages.test.ts and __tests__/recoveryEmail.test.ts keep them in
 * step. Use these values directly where a style has to change at runtime
 * (pressed states, animations) or where a class name can't reach (svg, shadows).
 */

// The four category colours in constants/colors.ts are not part of the new
// design: category is shown as plain text plus an icon, never a coloured chip.

/**
 * The light palette, which is the design as drawn on the boards. The dark
 * palette below has the same names, so a screen asks for `colors.surface` and
 * gets the right one for the person's theme (see lib/ThemeContext.tsx: read it
 * with `useColors()`, or write styles with `makeStyles`). Never import
 * `lightColors` or `darkColors` into a screen.
 *
 * Names say what a colour is for, not what it looks like, so they stay true in
 * both themes: `ink` is the text colour (dark in light, light in dark) and
 * `onInk` is what sits on a fill drawn in `ink`; `white` is white in both, for
 * the rare spot that is white on a photo or on red.
 */
export const lightColors = {
  /** White in both themes: on a photo, on a red fill, a keyboard's white key */
  white: "#FFFFFF",
  /** A raised card, a dialog, a sheet and the field of a screen drawn on white */
  surface: "#FFFFFF",
  /** A control that sits on a fill and stands out from it (the chosen segment) */
  raised: "#FFFFFF",
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
  /** Chevron at the end of a row that opens a picker */
  chevron: "#8A8479",
  /** The bar at the top of a sheet */
  grabber: "#CFCBC2",
  /** Primary text, selected states, the active tab */
  ink: "#1A1814",
  /** Text and icons on a fill drawn in `ink` (a selected mark, the toast) */
  onInk: "#FFFFFF",
  /** Body copy in dialogs and explainers */
  inkBody: "#3C3831",
  /** Secondary text */
  ink2: "#6B665D",
  /**
   * Placeholders and inactive tab labels. This is the boards' colour. On white
   * it is 4.8:1, but on the grey fills placeholders sit on it is 4.1 to 4.4:1,
   * a little under the 4.5:1 that text needs; the owner chose the boards' exact
   * colours (Q21), and __tests__/colorContrast.test.ts records it.
   */
  ink3: "#77716A",
  /** Primary buttons, the + button, switches on, progress fill: the same orange in both themes */
  brand: "#FF9C01",
  brandPressed: "#E88A00",
  /** Text and icons on `brand` (the label of a primary button) */
  onBrand: "#1A1814",
  /** Orange used as text or a link on the surface */
  brandText: "#A85D00",
  /** Toast action on the ink toast */
  brandOnInk: "#FFB84D",
  /** Overdue text and destructive text and icons, on the surface */
  late: "#C4321C",
  /** Fill of a destructive button and of the overdue badge (white text on it) */
  lateFill: "#C4321C",
  /** Alert icon on the ink toast */
  lateOnInk: "#FF8F7F",
  lateTint: "#FCEDEA",
  lateTintText: "#7A1F10",
  /** A pressed secondary button (Feedback board) */
  fillPressed: "#E4E0D8",
  /** A mid grey fill with white text on it (the Edit action of a swipe) */
  neutralFill: "#6B665D",
  /** A wash over something while it is busy, so it looks set aside */
  veil: "rgba(255, 255, 255, 0.7)",
  /** A pressed destructive button. No board draws it: `late` at 90% brightness */
  latePressed: "#B02D19",
  disabledFill: "#EFEDE8",
  disabledText: "#A39D92",
  switchOff: "#D9D5CC",
  /** Behind sheets and dialogs */
  dim: "rgba(26, 24, 20, 0.45)",
  /** Track of a progress bar drawn over a photo */
  progressTrack: "rgba(26, 24, 20, 0.28)",
  /** Count on a piano's photo ("1 / 4") */
  photoScrim: "rgba(26, 24, 20, 0.78)",
  /** Over the photo of a sold piano, so it looks set aside */
  soldWash: "rgba(255, 255, 255, 0.45)",
  /** The full-screen photo viewer (PhotoViewer board) */
  viewer: "#0F0E0C",
  viewerButton: "rgba(255, 255, 255, 0.14)",
  viewerHint: "rgba(15, 14, 12, 0.8)",
  skeletonBase: "#EFEDE8",
  skeletonHighlight: "#F8F7F4",
} as const;

/** Every colour name, each as a hex or rgba string, so both palettes fit it. */
export type Palette = { [Name in keyof typeof lightColors]: string };

/** The theme that is drawn: the person's choice, or the phone's when they chose to follow it. */
export type Scheme = "light" | "dark";

/**
 * The dark palette: the same warm neutrals as the light one, turned over.
 * Surfaces step up from the grouped background (the darkest) to the raised
 * cards, the way light steps down from white. The orange stays, since it is the
 * brand and sits well on dark; text that was orange or red on white is
 * lightened so it keeps its 4.5:1 on the dark surface (__tests__/colorContrast.test.ts
 * checks every pair that is drawn).
 */
export const darkColors: Palette = {
  white: "#FFFFFF",
  surface: "#1C1B19",
  raised: "#46423C",
  page: "#1C1B19",
  grouped: "#121110",
  fill: "#2B2926",
  fillInput: "#262421",
  hairline: "#34312C",
  inputBorder: "#6B665D",
  controlBorder: "#45413B",
  chevron: "#8F897E",
  grabber: "#4D4943",
  ink: "#F4F1EA",
  onInk: "#1A1814",
  inkBody: "#D6D1C7",
  ink2: "#A9A398",
  ink3: "#9A9488",
  brand: "#FF9C01",
  brandPressed: "#E88A00",
  onBrand: "#1A1814",
  brandText: "#FFB84D",
  brandOnInk: "#9C5600",
  late: "#FF8A78",
  lateFill: "#C4321C",
  lateOnInk: "#C4321C",
  lateTint: "#3A1F1B",
  lateTintText: "#FFB4A8",
  fillPressed: "#3A3733",
  neutralFill: "#6B665D",
  veil: "rgba(28, 27, 25, 0.7)",
  latePressed: "#B02D19",
  disabledFill: "#2B2926",
  disabledText: "#6F6A62",
  switchOff: "#4A4640",
  dim: "rgba(0, 0, 0, 0.6)",
  progressTrack: "rgba(26, 24, 20, 0.28)",
  photoScrim: "rgba(26, 24, 20, 0.78)",
  soldWash: "rgba(20, 19, 17, 0.55)",
  viewer: "#0F0E0C",
  viewerButton: "rgba(255, 255, 255, 0.14)",
  viewerHint: "rgba(15, 14, 12, 0.8)",
  skeletonBase: "#2B2926",
  skeletonHighlight: "#36332F",
};

export const palettes: Record<Scheme, Palette> = {
  light: lightColors,
  dark: darkColors,
};

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

/**
 * Bars pinned to the bottom of the screen: the tab bar, and the sticky action
 * bar on a piano's page. Both are 84 high on an iPhone, which is this content
 * height plus the 34 px home indicator.
 */
export const bottomBar = {
  /** Height above the home indicator */
  content: 50,
  /** The least space kept below the content, on phones with no home indicator */
  minInset: 8,
  /** Gap between the bar and a toast above it */
  toastGap: 12,
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
  /** Label of a filled button */
  button: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  /** Label of an outline or text button, one weight lighter */
  buttonQuiet: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  /** Centred title in a sheet's header row */
  sheetTitle: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
} as const satisfies Record<string, TextStyle>;

/** The only shadow in the design, on the search pill. Dark in both themes: on a dark surface it simply isn't seen. */
export const shadows = {
  searchPill: {
    shadowColor: lightColors.ink,
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
    /** The same for a long message, such as one that says an email was sent */
    toastHoldLong: 5000,
    /** The logo popping in on the splash screen */
    splashPop: 600,
    checkPop: 280,
    checkDraw: 260,
    /** One pass of the skeleton shimmer, looping */
    shimmer: 1500,
    /** One turn of a spinner, looping (Feedback board) */
    spinnerTurn: 800,
    /** One loop of the keys loader, with each bar starting `keysStagger` later */
    keysLoop: 1100,
    keysStagger: 120,
    /** With reduced motion, every change is a fade this long */
    reducedFade: 120,
    /** Show a skeleton only after this long */
    skeletonDelay: 200,
    /** Content replacing a skeleton fades in over this long */
    contentFade: 150,
  },
  easing: {
    standard: [0.2, 0, 0, 1],
    accelerate: [0.3, 0, 1, 1],
    decelerate: [0, 0, 0, 1],
  },
  /** How far an add step slides in, in px */
  addStepOffset: 24,
  /** A toast rises this far as it appears, and sinks this far as it goes, in px */
  toastRise: 24,
  toastDrop: 12,
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

/**
 * The same five palettes for the dark theme, in the same order: the wall and
 * floor are muted mid-darks (still lighter than a black piano, so it shows),
 * and the piano keeps its colours.
 */
export const pianoPalettesDark: readonly PianoPalette[] = pianoPalettes.map(
  (palette, index) => ({
    ...palette,
    wall: ["#4A433A", "#4A524C", "#50423E", "#434A52", "#4D473F"][index],
    floor: ["#3B352E", "#3C443E", "#40352F", "#363C43", "#3D3832"][index],
  })
);
