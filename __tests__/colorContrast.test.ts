import { colors } from "@/constants/theme";

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

/** Text must reach 4.5:1 (WCAG AA); every pair here is one the app draws. */
const TEXT: [string, string, string, string][] = [
  // [what it is, text colour, background, where]
  ["ink", colors.ink, colors.white, "everything on a page"],
  ["ink", colors.ink, colors.grouped, "form pages and sheets"],
  ["ink", colors.ink, colors.fill, "secondary buttons, search fields"],
  ["ink", colors.ink, colors.brand, "primary buttons, the + button"],
  ["inkBody", colors.inkBody, colors.grouped, "a sample notification"],
  ["ink2", colors.ink2, colors.white, "secondary text"],
  ["ink2", colors.ink2, colors.grouped, "secondary text on form pages"],
  ["ink2", colors.ink2, colors.fill, "hints on a grey fill"],
  ["ink3", colors.ink3, colors.white, "placeholders, inactive tab labels"],
  ["brandText", colors.brandText, colors.white, "links and soon-ending rentals"],
  ["brandText", colors.brandText, colors.grouped, "links on form pages"],
  ["white", colors.white, colors.late, "destructive buttons, overdue badges"],
  ["late", colors.late, colors.white, "overdue text"],
  ["late", colors.late, colors.grouped, "overdue text on form pages"],
  ["late", colors.late, colors.lateTint, "a field's error text"],
  ["lateTintText", colors.lateTintText, colors.lateTint, "the red box above a form"],
  ["white", colors.white, colors.ink, "toasts"],
  ["brandOnInk", colors.brandOnInk, colors.ink, "a toast's Undo"],
  ["lateOnInk", colors.lateOnInk, colors.ink, "a failed toast's icon"],
  ["white", colors.white, colors.ink2, "the Edit button behind a row"],
];

describe("the colours of text", () => {
  const pairs = TEXT.map(([name, text, background, where]) => ({ name, text, background, where }));

  it.each(pairs)("$name, $where, is at least 4.5:1", ({ text, background }) => {
    expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5);
  });

});

// The boards' own colours, which the owner chose to keep exactly (Q21), although
// they are a little under the 4.5:1 that text needs. They are listed so that
// nothing gets worse, and so it is clear these are known and chosen.
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

describe("the colours of controls", () => {
  it("makes the chevron at the end of a row visible enough (3:1 for a graphic)", () => {
    expect(contrast(colors.chevron, colors.white)).toBeGreaterThanOrEqual(3);
  });
});
