import fs from "fs";
import path from "path";

const root = path.join(__dirname, "..");

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });

const relative = (file: string) => path.relative(root, file).split(path.sep).join("/");

/** Code that moves something: a Reanimated or Animated animation, or a layout animation. */
const MOVES =
  /react-native-reanimated|\bAnimated\.(timing|spring|loop|parallel|sequence)\b|LayoutAnimation/;

// Files that move things without asking the phone for less motion, and why that is fine
const ALLOWED: Record<string, string> = {
  "components/ui/TabScenes.tsx":
    "a tab switch is already only a 120 ms cross-fade, which is what reduced motion asks for",
  "components/PhotoViewer.tsx":
    "only fades its hint in and out; the zoom follows the fingers, which is not a slide",
};

describe("reduced motion", () => {
  const files = ["app", "components", "lib", "utils"]
    .flatMap((dir) => sourceFiles(path.join(root, dir)))
    .map((file) => ({ name: relative(file), text: fs.readFileSync(file, "utf8") }));

  it("is asked about by everything that moves, unless there is a reason not to", () => {
    const missing = files
      .filter(({ name, text }) => MOVES.test(text) && !/useReducedMotion/.test(text))
      .map(({ name }) => name)
      .filter((name) => !(name in ALLOWED));

    expect(missing).toEqual([]);
  });

  it("has no reasons left over for files that no longer exist or no longer move", () => {
    const stale = Object.keys(ALLOWED).filter((name) => {
      const file = files.find((candidate) => candidate.name === name);
      return !file || !MOVES.test(file.text);
    });

    expect(stale).toEqual([]);
  });

  it("is remembered for the screens that open after the first, so they start right", () => {
    const hook = fs.readFileSync(path.join(root, "lib", "useReducedMotion.ts"), "utf8");

    expect(hook).toMatch(/useState\(known\)/);
  });
});
