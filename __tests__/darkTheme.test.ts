import {
  darkColors,
  lightColors,
  Palette,
  palettes,
  pianoPalettes,
  pianoPalettesDark,
} from "@/constants/theme";

const channel = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
const brightness = (hex: string) =>
  0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);

describe("the two palettes", () => {
  it("name the same colours, so a screen can ask for one without knowing the theme", () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it("are a colour each: a hex or an rgba()", () => {
    for (const palette of [lightColors, darkColors] as Palette[]) {
      for (const [name, value] of Object.entries(palette)) {
        expect(value).toMatch(
          /^(#[0-9A-Fa-f]{6}|rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (0|1|0?\.\d+)\))$/
        );
        expect(name).toMatch(/^[a-z][A-Za-z0-9]*$/);
      }
    }
  });

  it("are looked up by the theme's name", () => {
    expect(palettes.light).toBe(lightColors);
    expect(palettes.dark).toBe(darkColors);
  });

  it("keep the same orange, white and photo viewer in both, since they are not about the theme", () => {
    for (const name of [
      "brand",
      "brandPressed",
      "onBrand",
      "white",
      "lateFill",
      "latePressed",
      "neutralFill",
      "viewer",
      "viewerButton",
      "viewerHint",
      "progressTrack",
      "photoScrim",
    ] as const) {
      expect(darkColors[name]).toBe(lightColors[name]);
    }
  });

  it("turn over everything that is a surface or a text colour", () => {
    for (const name of [
      "surface",
      "page",
      "grouped",
      "fill",
      "fillInput",
      "hairline",
      "inputBorder",
      "ink",
      "onInk",
      "inkBody",
      "ink2",
      "ink3",
      "brandText",
      "late",
      "lateTint",
      "lateTintText",
      "raised",
      "dim",
      "veil",
      "skeletonBase",
      "skeletonHighlight",
    ] as const) {
      expect(darkColors[name]).not.toBe(lightColors[name]);
    }
  });

  it("keep the light palette exactly as the boards drew it", () => {
    expect(lightColors.page).toBe("#FFFFFF");
    expect(lightColors.surface).toBe("#FFFFFF");
    expect(lightColors.raised).toBe("#FFFFFF");
    expect(lightColors.grouped).toBe("#F6F5F2");
    expect(lightColors.ink).toBe("#1A1814");
    expect(lightColors.onInk).toBe("#FFFFFF");
    expect(lightColors.onBrand).toBe("#1A1814");
    expect(lightColors.late).toBe("#C4321C");
    expect(lightColors.lateFill).toBe("#C4321C");
    expect(lightColors.brand).toBe("#FF9C01");
  });
});

describe("the dark palette", () => {
  it("steps up from the darkest background to the raised controls, the way light steps down from white", () => {
    expect(brightness(darkColors.grouped)).toBeLessThan(brightness(darkColors.surface));
    expect(brightness(darkColors.surface)).toBeLessThan(brightness(darkColors.fill));
    expect(brightness(darkColors.fill)).toBeLessThan(brightness(darkColors.raised));
  });

  it("draws the text lighter than every surface it sits on", () => {
    for (const text of ["ink", "inkBody", "ink2", "ink3"] as const) {
      for (const surface of ["surface", "grouped", "fill"] as const) {
        expect(brightness(darkColors[text])).toBeGreaterThan(brightness(darkColors[surface]));
      }
    }
  });

  it("draws the text, and what sits on ink, the other way round from light", () => {
    expect(brightness(darkColors.ink)).toBeGreaterThan(0.8);
    expect(brightness(darkColors.onInk)).toBeLessThan(0.2);
    expect(brightness(lightColors.ink)).toBeLessThan(0.2);
    expect(brightness(lightColors.onInk)).toBeGreaterThan(0.8);
  });

  it("makes the page and a card on it the same dark, as they are the same white in light", () => {
    expect(darkColors.page).toBe(darkColors.surface);
  });
});

describe("the piano drawings in the dark theme", () => {
  it("are the same five, in the same order, so a piano keeps its palette", () => {
    expect(pianoPalettesDark.map((palette) => palette.name)).toEqual(
      pianoPalettes.map((palette) => palette.name)
    );
  });

  it("keep the piano's own colours and darken only the wall and floor behind it", () => {
    pianoPalettes.forEach((light, index) => {
      const dark = pianoPalettesDark[index];
      expect(dark.body).toBe(light.body);
      expect(dark.dark).toBe(light.dark);
      expect(dark.panel).toBe(light.panel);
      expect(brightness(dark.wall)).toBeLessThan(brightness(light.wall));
      expect(brightness(dark.floor)).toBeLessThan(brightness(light.floor));
      // still lighter than the black keys' piano, so it shows against the wall
      expect(brightness(dark.wall)).toBeGreaterThan(brightness("#34302E"));
    });
  });
});
