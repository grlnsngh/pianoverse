import fs from "fs";
import path from "path";

const root = path.join(__dirname, "..");

describe("project layout", () => {
  it("keeps only screens in app/, where Expo Router turns every file into a route", () => {
    const folders = fs
      .readdirSync(path.join(root, "app"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    for (const helperFolder of [
      "components",
      "constants",
      "services",
      "utils",
    ]) {
      expect(folders).not.toContain(helperFolder);
    }
  });

  it("draws everything with styles: there is no Tailwind or NativeWind to read class names", () => {
    const sourceFiles = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return sourceFiles(full);
        return entry.name.endsWith(".tsx") ? [full] : [];
      });
    const withClassName = ["app", "components"]
      .flatMap((dir) => sourceFiles(path.join(root, dir)))
      .filter((file) => /\bclassName=/.test(fs.readFileSync(file, "utf8")))
      .map((file) => path.relative(root, file));

    expect(withClassName).toEqual([]);
    expect(fs.existsSync(path.join(root, "tailwind.config.js"))).toBe(false);
  });
});
