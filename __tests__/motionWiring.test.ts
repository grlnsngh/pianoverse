import fs from "fs";
import path from "path";

const source = (file: string) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

// Where the motion and gesture pieces are plugged in. The pieces themselves are
// tested on their own; this keeps them from being unplugged by accident.
describe("where the motion is used", () => {
  it("has a piano's page fade in and grow, and its bar rise after it", () => {
    const page = source("app/detail/[id].tsx");

    expect(page).toMatch(/<ScreenEntrance mode="grow"/);
    expect(page).toMatch(/<ScreenEntrance mode="rise"/);
  });

  it("has the piano's route fade in, instead of sliding, for the card-to-hero fallback", () => {
    const layout = source("app/_layout.tsx");

    expect(layout).toMatch(/name="detail\/\[id\]"[\s\S]{0,80}animation: "fade"/);
  });

  it("has the Add flow's steps slide in", () => {
    expect(source("app/create.tsx")).toMatch(/<StepTransition step=\{step\}>/);
  });

  it("has the Pianos list and Today draw the refresh band and hide the system spinner", () => {
    for (const file of ["app/(tabs)/home.tsx", "app/(tabs)/today.tsx"]) {
      const screen = source(file);
      expect(screen).toMatch(/<RefreshBand refreshing=\{refreshing\}/);
      expect(screen).toMatch(/HIDDEN_REFRESH_INDICATOR/);
    }
  });
});

describe("where the gestures are used", () => {
  it("wraps the whole app in the gesture handler's root view, which swipeable rows need", () => {
    const layout = source("app/_layout.tsx");

    expect(layout).toMatch(/import \{ GestureHandlerRootView \} from "react-native-gesture-handler"/);
    expect(layout).toMatch(/<GestureHandlerRootView style=\{\{ flex: 1 \}\}>/);
  });

  it("gives the list layout's rows Edit and Delete, and the grid none", () => {
    const home = source("app/(tabs)/home.tsx");

    expect(home).toMatch(/<PianoRow \{\.\.\.shared\} onEdit=\{editPiano\} onDelete=\{confirmDelete\} \/>/);
    expect(home).toMatch(/<PianoCard \{\.\.\.shared\} \/>/);
  });
});
