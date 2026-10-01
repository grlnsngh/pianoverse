import { darkColors, lightColors, Palette } from "@/constants/theme";

/** WCAG 2 relative luminance and contrast ratio of two "#RRGGBB" colours. */
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

/** Text must reach 4.5:1 (WCAG AA); every pair here is one the app draws, in each theme. */
const textPairs = (c: Palette): [string, string, string, string][] => [
  // [what it is, text colour, background, where]
  ["ink", c.ink, c.surface, "everything on a page"],
  ["ink", c.ink, c.grouped, "form pages and sheets"],
  ["ink", c.ink, c.fill, "secondary buttons, search fields"],
  ["ink", c.ink, c.raised, "the chosen segment of a segmented control"],
  ["onBrand", c.onBrand, c.brand, "primary buttons, the + button, the logo"],
  ["inkBody", c.inkBody, c.grouped, "a sample notification"],
  ["ink2", c.ink2, c.surface, "secondary text"],
  ["ink2", c.ink2, c.grouped, "secondary text on form pages"],
  ["ink2", c.ink2, c.fill, "hints on a grey fill"],
  ["ink3", c.ink3, c.surface, "placeholders, inactive tab labels"],
  ["brandText", c.brandText, c.surface, "links and soon-ending rentals"],
  ["brandText", c.brandText, c.grouped, "links on form pages"],
  ["white", c.white, c.lateFill, "destructive buttons, overdue badges"],
  ["late", c.late, c.surface, "overdue text"],
  ["late", c.late, c.grouped, "overdue text on form pages"],
  ["late", c.late, c.lateTint, "a field's error text"],
  ["lateTintText", c.lateTintText, c.lateTint, "the red box above a form"],
  ["onInk", c.onInk, c.ink, "toasts, the chosen day of a calendar"],
  ["brandOnInk", c.brandOnInk, c.ink, "a toast's Undo"],
  ["lateOnInk", c.lateOnInk, c.ink, "a failed toast's icon"],
  ["white", c.white, c.neutralFill, "the Edit button behind a row"],
];

describe.each([
  ["light", lightColors],
  ["dark", darkColors],
] as const)("the colours of text in the %s theme", (_theme, palette) => {
  const pairs = textPairs(palette).map(([name, text, background, where]) => ({ name, text, background, where }));

  it.each(pairs)("$name, $where, is at least 4.5:1", ({ text, background }) => {
    expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5);
  });
});

// The dark theme's own colours were chosen to clear 4.5:1 everywhere, including
// the pairs the light theme keeps a little under (below)
describe("the colours of text on the grey fills, in the dark theme", () => {
  const c = darkColors;
  const pairs = [
    ["ink3", c.ink3, c.grouped, "placeholders on form pages"],
    ["ink3", c.ink3, c.fillInput, "a placeholder in an input"],
    ["ink3", c.ink3, c.fill, "a placeholder in a search field"],
    ["ink2", c.ink2, c.hairline, "an unselected option of a segmented control"],
    ["ink2", c.ink2, c.fillInput, "hints in an input"],
  ].map(([name, text, background, where]) => ({ name, text, background, where }));

  it.each(pairs)("$name, $where, is at least 4.5:1", ({ text, background }) => {
    expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5);
  });
});

// The boards' own colours, which the owner chose to keep exactly (Q21), although
// they are a little under the 4.5:1 that text needs. They are listed so that
// nothing gets worse, and so it is clear these are known and chosen. This is
// the light theme, which is the boards' design.
const colors = lightColors;
const BOARD_CHOICES: [string, string, string, string, number][] = [
  ["ink3", colors.ink3, colors.grouped, "placeholders on form pages", 4.4],
  ["ink3", colors.ink3, colors.fillInput, "a placeholder in an input", 4.1],
  ["ink3", colors.ink3, colors.fill, "a placeholder in a search field", 4.1],
  ["ink2", colors.ink2, colors.hairline, "an unselected option of a segmented control", 4.4],
];

describe("the boards' colours that are a little under 4.5:1, kept on purpose", () => {
  const choices = BOARD_CHOICES.map(([name, text, background, where, floor]) => ({ name, text, background, where, floor }));

  it.each(choices)("$name, $where, is under 4.5 but no worse than $floor", ({ text, background, floor }) => {
    const ratio = contrast(text, background);

    expect(ratio).toBeLessThan(4.5);
    expect(ratio).toBeGreaterThanOrEqual(floor);
  });
});

describe.each([
  ["light", lightColors],
  ["dark", darkColors],
] as const)("the colours of controls in the %s theme", (_theme, palette) => {
  it("makes the chevron at the end of a row visible enough (3:1 for a graphic)", () => {
    expect(contrast(palette.chevron, palette.surface)).toBeGreaterThanOrEqual(3);
  });
});
