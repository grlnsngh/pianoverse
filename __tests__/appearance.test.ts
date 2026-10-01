import {
  APPEARANCE_LABELS,
  APPEARANCE_SETTINGS,
  DEFAULT_APPEARANCE,
  isAppearanceSetting,
  resolveScheme,
} from "@/utils/appearance";

describe("the appearance setting", () => {
  it("is light until the person picks something else, so nobody's phone changes by itself", () => {
    expect(DEFAULT_APPEARANCE).toBe("light");
  });

  it("offers light, dark and the phone's own, in that order, each with its words", () => {
    expect(APPEARANCE_SETTINGS).toEqual(["light", "dark", "system"]);
    expect(APPEARANCE_LABELS).toEqual({
      light: "Light",
      dark: "Dark",
      system: "Match phone",
    });
  });

  it("knows a saved value from rubbish", () => {
    expect(APPEARANCE_SETTINGS.every(isAppearanceSetting)).toBe(true);
    for (const rubbish of ["", "Dark", "auto", null, undefined, 1, {}]) {
      expect(isAppearanceSetting(rubbish)).toBe(false);
    }
  });
});

describe("the theme that is drawn", () => {
  it("is the one picked, whatever the phone says", () => {
    expect(resolveScheme("light", "dark")).toBe("light");
    expect(resolveScheme("dark", "light")).toBe("dark");
    expect(resolveScheme("dark", null)).toBe("dark");
    expect(resolveScheme("light", undefined)).toBe("light");
  });

  it("is the phone's when the person chose to match it", () => {
    expect(resolveScheme("system", "dark")).toBe("dark");
    expect(resolveScheme("system", "light")).toBe("light");
  });

  it("is light when the phone can't say, or says something unexpected", () => {
    expect(resolveScheme("system", null)).toBe("light");
    expect(resolveScheme("system", undefined)).toBe("light");
    expect(resolveScheme("system", "unspecified")).toBe("light");
  });
});
