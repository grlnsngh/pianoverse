import fs from "fs";
import path from "path";

const root = path.join(__dirname, "..");
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const relative = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(relative);
    return /\.(ts|tsx|js)$/.test(entry.name) ? [relative] : [];
  });

const appFiles = ["app", "components", "lib", "utils", "services", "context"].flatMap(sourceFiles);

describe("where the theme is wired in", () => {
  it("wraps the whole app in the theme provider, so every screen can ask for its colours", () => {
    const layout = source("app/_layout.tsx");

    expect(layout).toMatch(/import \{ ThemeProvider, useTheme \} from "@\/lib\/ThemeContext"/);
    expect(layout).toMatch(/<ThemeProvider>\s*<RootContent \/>\s*<\/ThemeProvider>/);
  });

  it("keeps the splash screen up until the saved theme has been read, so the first frame isn't the wrong colour", () => {
    const layout = source("app/_layout.tsx");

    expect(layout).toMatch(/if \(fontsLoaded && ready\) \{\s*SplashScreen\.hideAsync\(\);/);
    expect(layout).toMatch(/if \(!fontsLoaded \|\| !ready\) \{\s*return null;/);
  });

  it("gives the navigation its own theme, worked out from the theme being drawn", () => {
    const layout = source("app/_layout.tsx");

    expect(layout).toMatch(/<NavigationThemeProvider value=\{navigationTheme\}>/);
    expect(layout).toMatch(/navigationThemeFor\(scheme, colors\)/);
  });

  it("keeps the status bar and the window behind the app in step with the theme", () => {
    expect(source("app/_layout.tsx")).toMatch(/useSystemChrome\(scheme, colors\)/);
  });

  it("keeps the app fixed to light in app.json, so nothing about the native build changes (the phone's own setting is asked for in JavaScript)", () => {
    const config = JSON.parse(source("app.json")).expo;

    expect(config.userInterfaceStyle).toBe("light");
    expect(config.runtimeVersion).toBe("3");
  });
});

describe("how screens get their colours", () => {
  it("never reads a palette directly: they ask the theme, so a change of theme reaches them", () => {
    const direct = appFiles.filter((file) => {
      if (file === "lib/ThemeContext.tsx") return false;
      const text = source(file);
      return (
        /\b(lightColors|darkColors)\b/.test(text) ||
        /import \{[^}]*\bcolors\b[^}]*\} from "@\/constants\/theme"/.test(text)
      );
    });

    expect(direct).toEqual([]);
  });

  it("has no hex or rgba colour of its own outside the artwork (logos, keys, a Google button)", () => {
    const withLiteral = appFiles
      .filter((file) => file !== "services/notifications.ts")
      .filter((file) => /#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b|\brgba?\(/.test(source(file)));

    expect(withLiteral.sort()).toEqual([
      "components/GoogleButton.tsx",
      "components/SelectionMark.tsx",
      "components/WelcomeScreen.tsx",
      "components/ui/Button.tsx",
      "components/ui/KeyboardMark.tsx",
      "components/ui/PianoPhoto.tsx",
    ]);
  });
});
