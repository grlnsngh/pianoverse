import fs from "fs";
import path from "path";
import {
  colors,
  fonts,
  motion,
  pianoPalettes,
  radii,
  spacing,
  type,
} from "@/constants/theme";

const root = path.join(__dirname, "..");
const tailwind = require(path.join(root, "tailwind.config.js")).theme.extend;

const HEX = /^#[0-9A-F]{6}$/i;

describe("colours", () => {
  it("are the redesign's palette", () => {
    // SPEC section 3. A change here is a change to the brand, so it is spelled out
    expect(colors).toMatchObject({
      page: "#FFFFFF",
      grouped: "#F6F5F2",
      fill: "#EFEDE8",
      hairline: "#E7E4DD",
      ink: "#1A1814",
      ink2: "#6B665D",
      ink3: "#77716A",
      brand: "#FF9C01",
      brandText: "#A85D00",
      late: "#C4321C",
      lateTint: "#FCEDEA",
      lateTintText: "#7A1F10",
      inputBorder: "#C9C4B9",
      fillInput: "#F1EFEA",
    });
  });

  it("are all six digit hex values or rgba", () => {
    for (const value of Object.values(colors)) {
      expect(value).toMatch(/^(#[0-9A-F]{6}|rgba\(.+\))$/i);
    }
  });

  it("are the same in Tailwind, so className and style agree", () => {
    expect(tailwind.colors).toMatchObject({
      page: colors.page,
      grouped: colors.grouped,
      fill: colors.fill,
      hairline: colors.hairline,
      ink: colors.ink,
      ink2: colors.ink2,
      ink3: colors.ink3,
      brand: colors.brand,
      "brand-text": colors.brandText,
      late: colors.late,
      "late-tint": colors.lateTint,
      "late-tint-text": colors.lateTintText,
    });
  });

  it("keep the old scheme in Tailwind until the last screen has moved", () => {
    expect(tailwind.colors.primary.DEFAULT).toBe("#161622");
    expect(tailwind.colors.secondary.DEFAULT).toBe("#FF9C01");
  });
});

describe("radii", () => {
  it("follow the spec, from input to sheet", () => {
    expect(radii).toEqual({
      input: 12,
      control: 14,
      card: 16,
      panel: 20,
      sheet: 24,
      full: 999,
    });
  });

  it("are the same in Tailwind", () => {
    expect(tailwind.borderRadius).toEqual({
      input: `${radii.input}px`,
      control: `${radii.control}px`,
      card: `${radii.card}px`,
      panel: `${radii.panel}px`,
      sheet: `${radii.sheet}px`,
    });
  });
});

describe("spacing", () => {
  it("uses a 20 px screen margin and 44 px tap targets", () => {
    expect(spacing.screen).toBe(20);
    expect(spacing.minTarget).toBe(44);
  });

  it("step up 4, 8, 12, 16, 20, 24, 32", () => {
    const steps = [
      spacing.xs,
      spacing.sm,
      spacing.md,
      spacing.lg,
      spacing.xl,
      spacing.xxl,
      spacing.xxxl,
    ];
    expect(steps).toEqual([4, 8, 12, 16, 20, 24, 32]);
  });
});

describe("fonts", () => {
  it("are the four Figtree weights", () => {
    expect(fonts).toEqual({
      regular: "Figtree_400Regular",
      medium: "Figtree_500Medium",
      semibold: "Figtree_600SemiBold",
      bold: "Figtree_700Bold",
    });
  });

  it("are installed, one file per weight", () => {
    expect(require("@expo-google-fonts/figtree/400Regular").Figtree_400Regular).toBeDefined();
    expect(require("@expo-google-fonts/figtree/500Medium").Figtree_500Medium).toBeDefined();
    expect(require("@expo-google-fonts/figtree/600SemiBold").Figtree_600SemiBold).toBeDefined();
    expect(require("@expo-google-fonts/figtree/700Bold").Figtree_700Bold).toBeDefined();
  });

  it("are all loaded by the root layout, under the names the styles use", () => {
    const layout = fs.readFileSync(path.join(root, "app/_layout.tsx"), "utf8");
    for (const family of Object.values(fonts)) {
      expect(layout).toContain(`${family},`);
    }
  });

  it("have a Tailwind class each, and the Poppins ones are still there", () => {
    expect(tailwind.fontFamily.figtree[0]).toBe(fonts.regular);
    expect(tailwind.fontFamily["figtree-medium"][0]).toBe(fonts.medium);
    expect(tailwind.fontFamily["figtree-semibold"][0]).toBe(fonts.semibold);
    expect(tailwind.fontFamily["figtree-bold"][0]).toBe(fonts.bold);
    expect(tailwind.fontFamily.pregular[0]).toBe("Poppins-Regular");
  });
});

describe("type styles", () => {
  it("match the spec's sizes and line heights", () => {
    const sizes = Object.fromEntries(
      Object.entries(type).map(([name, style]) => [
        name,
        `${style.fontSize}/${style.lineHeight}`,
      ])
    );
    expect(sizes).toEqual({
      largeTitle: "32/38",
      amount: "44/50",
      pianoTitle: "28/34",
      section: "20/26",
      rowTitle: "16/22",
      body: "16/22",
      bodyMedium: "16/22",
      secondary: "14/20",
      status: "14/20",
      caption: "13/18",
      hint: "12/16",
      badge: "12/18",
      tabLabel: "11/14",
      tabLabelActive: "11/14",
      button: "16/22",
      sheetTitle: "17/22",
    });
  });

  it("only use the Figtree families, never a fontWeight, which Android ignores for custom fonts", () => {
    for (const style of Object.values(type)) {
      expect(Object.values(fonts)).toContain(style.fontFamily);
      expect(style).not.toHaveProperty("fontWeight");
    }
  });

  it("gives every style room for its text", () => {
    for (const style of Object.values(type)) {
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize);
    }
  });

  it("gives amounts tabular figures, so digits line up", () => {
    expect(type.amount.fontVariant).toEqual(["tabular-nums"]);
  });

  it("turns the spec's em letter spacing into px", () => {
    expect(type.largeTitle.letterSpacing).toBeCloseTo(32 * -0.02);
    expect(type.amount.letterSpacing).toBeCloseTo(44 * -0.025);
    expect(type.pianoTitle.letterSpacing).toBeCloseTo(28 * -0.02);
    expect(type.section.letterSpacing).toBeCloseTo(20 * -0.01);
  });
});

describe("motion", () => {
  it("has the durations on the Motion board", () => {
    expect(motion.duration).toMatchObject({
      press: 100,
      switch: 200,
      push: 300,
      sheetIn: 320,
      sheetOut: 240,
      photoToHero: 380,
      tabSwitch: 120,
      addStep: 240,
      toastIn: 220,
      toastOut: 180,
      toastHold: 3000,
      checkPop: 280,
      checkDraw: 260,
      shimmer: 1500,
      keysLoop: 1100,
      keysStagger: 120,
      reducedFade: 120,
      skeletonDelay: 200,
    });
  });

  it("has the three easing curves as cubic-bezier control points", () => {
    expect(motion.easing).toEqual({
      standard: [0.2, 0, 0, 1],
      accelerate: [0.3, 0, 1, 1],
      decelerate: [0, 0, 0, 1],
    });
    for (const curve of Object.values(motion.easing)) {
      // x must stay within 0..1 or the curve isn't a function of time
      expect(curve[0]).toBeGreaterThanOrEqual(0);
      expect(curve[0]).toBeLessThanOrEqual(1);
      expect(curve[2]).toBeGreaterThanOrEqual(0);
      expect(curve[2]).toBeLessThanOrEqual(1);
    }
  });

  it("slides an add step 24 px and presses a button to 0.98", () => {
    expect(motion.addStepOffset).toBe(24);
    expect(motion.pressedScale).toBe(0.98);
  });
});

describe("piano drawing palettes", () => {
  it("are the five in the spec, in this order", () => {
    expect(pianoPalettes.map((palette) => palette.name)).toEqual([
      "walnut",
      "ebony",
      "mahogany",
      "oak",
      "white",
    ]);
  });

  it("have a colour for every layer", () => {
    for (const palette of pianoPalettes) {
      for (const layer of ["wall", "floor", "body", "dark", "panel"] as const) {
        expect(palette[layer]).toMatch(HEX);
      }
    }
  });

  it("match the spec table", () => {
    expect(pianoPalettes[0]).toEqual({
      name: "walnut",
      wall: "#E9E1D3",
      floor: "#D8CDBB",
      body: "#6A5545",
      dark: "#4A3B30",
      panel: "#57453A",
    });
    expect(pianoPalettes[4]).toEqual({
      name: "white",
      wall: "#EFE9E0",
      floor: "#DDD5C8",
      body: "#F4F1EA",
      dark: "#D9D3C6",
      panel: "#E6E0D3",
    });
  });
});
