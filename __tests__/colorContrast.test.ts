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
  ["inkBody", colors.inkBody, colors.hairline, "an option of a segmented control"],
  ["ink2", colors.ink2, colors.white, "secondary text"],
  ["ink2", colors.ink2, colors.grouped, "secondary text on form pages"],
  ["ink2", colors.ink2, colors.fill, "hints on a grey fill"],
  ["ink3", colors.ink3, colors.white, "placeholders, inactive tab labels"],
  ["ink3", colors.ink3, colors.grouped, "placeholders on form pages"],
  ["ink3", colors.ink3, colors.fill, "a placeholder in a search field"],
  ["ink3", colors.ink3, colors.fillInput, "a placeholder in an input"],
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
  it.each(TEXT)("%s on %s is at least 4.5:1 (%s)", (_name, text, background) => {
    expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("includes the placeholder grey on the darkest grey it sits on", () => {
    // Placeholders were 4.1:1 on the grey fills with the board's #77716A
    expect(contrast("#77716A", colors.fill)).toBeLessThan(4.5);
    expect(contrast(colors.ink3, colors.fill)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("the colours of controls", () => {
  it("makes the chevron at the end of a row visible enough (3:1 for a graphic)", () => {
    expect(contrast(colors.chevron, colors.white)).toBeGreaterThanOrEqual(3);
  });
});
