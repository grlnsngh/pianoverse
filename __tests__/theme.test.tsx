import fs from "fs";
import path from "path";
import zlib from "zlib";

const root = path.join(__dirname, "..");
const BRAND = "#FF9C01";

describe("launch and system UI", () => {
  const { expo } = JSON.parse(
    fs.readFileSync(path.join(root, "app.json"), "utf8")
  );
  // The phone's own splash screen is set up by the expo-splash-screen plugin
  const [, splash] = expo.plugins.find(
    (plugin: unknown) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen"
  );

  it("is brand orange on the phone's own splash screen, as on the Splash board", () => {
    expect(splash.backgroundColor).toBe(BRAND);
  });

  it("has no splash artwork: the app's Splash draws the logo as soon as it starts", () => {
    // Android 12 and later always draw an icon on the splash screen, so the
    // plugin is given one that is wholly transparent: every byte of its pixel
    // data (one filter byte per row, then red, green, blue, alpha) is 0
    const png = fs.readFileSync(path.join(root, splash.image));
    const chunks = [];
    for (let at = 8; at < png.length; ) {
      const length = png.readUInt32BE(at);
      const type = png.toString("ascii", at + 4, at + 8);
      if (type === "IDAT") chunks.push(png.subarray(at + 8, at + 8 + length));
      at += 12 + length;
    }
    const pixels = zlib.inflateSync(Buffer.concat(chunks));

    expect(pixels.length).toBeGreaterThan(0);
    expect(pixels.every((byte) => byte === 0)).toBe(true);
  });

  it("has a white root view, since every screen of the design is light", () => {
    expect(expo.backgroundColor).toBe("#FFFFFF");
  });

  it("asks for light native pickers, keyboards and dialogs", () => {
    expect(expo.userInterfaceStyle).toBe("light");
  });
});
