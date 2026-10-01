import fs from "fs";
import path from "path";

const root = path.join(__dirname, "..");
const BRAND = "#FF9C01";

describe("launch and system UI", () => {
  const { expo } = JSON.parse(
    fs.readFileSync(path.join(root, "app.json"), "utf8")
  );

  it("is brand orange on the phone's own splash screen, as on the Splash board", () => {
    expect(expo.splash.backgroundColor).toBe(BRAND);
  });

  it("has no splash artwork: the app's Splash draws the logo as soon as it starts", () => {
    expect(expo.splash.image).toBeUndefined();
  });

  it("has a white root view, since every screen of the design is light", () => {
    expect(expo.backgroundColor).toBe("#FFFFFF");
  });

  it("asks for light native pickers, keyboards and dialogs", () => {
    expect(expo.userInterfaceStyle).toBe("light");
  });
});
