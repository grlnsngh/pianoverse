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

  it("lets Tailwind see the class names used in components", () => {
    const { content } = require(path.join(root, "tailwind.config.js"));

    expect(content).toEqual(
      expect.arrayContaining([
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
      ])
    );
  });
});
