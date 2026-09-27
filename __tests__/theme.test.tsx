jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn() },
  usePathname: jest.fn(() => "/home"),
}));

import fs from "fs";
import path from "path";
import zlib from "zlib";
import React from "react";
import { TextInput } from "react-native";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import FormField from "@/app/components/FormField";
import SearchInput from "@/app/components/SearchInput";

const root = path.join(__dirname, "..");
const PRIMARY = "#161622";

describe("launch and system UI", () => {
  const { expo } = JSON.parse(
    fs.readFileSync(path.join(root, "app.json"), "utf8")
  );

  it("uses the app's dark background for the splash and root view", () => {
    expect(expo.splash.backgroundColor).toBe(PRIMARY);
    expect(expo.backgroundColor).toBe(PRIMARY);
  });

  it("asks for dark native pickers and dialogs", () => {
    expect(expo.userInterfaceStyle).toBe("dark");
  });

  it("draws the splash artwork in a light colour, so it shows on the dark background", () => {
    const png = fs.readFileSync(path.join(root, expo.splash.image));
    const { pixels, width, height } = decodeRgba(png);

    let opaque = 0;
    let brightness = 0;
    for (let i = 0; i < width * height * 4; i += 4) {
      if (pixels[i + 3] < 128) continue;
      opaque++;
      brightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    }
    expect(opaque).toBeGreaterThan(0);
    expect(brightness / opaque).toBeGreaterThan(200);
  });
});

describe("styling", () => {
  // Utilities NativeWind v2 silently drops: animations, transitions, blur,
  // pseudo-classes on plain Views, and sizes missing from the theme
  const unsupported =
    /\b(animate-[a-z]+|transition(-[a-z]+)?|duration-\d+|ease-[a-z-]+|backdrop-[a-z-]+|focus:[a-z0-9/-]+|hover:[a-z0-9/-]+|[hw]-15)\b/;

  const sourceFiles = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return entry.name.endsWith(".tsx") ? [full] : [];
    });

  it("only uses classes NativeWind v2 can apply", () => {
    const offenders = sourceFiles(path.join(root, "app")).flatMap((file) =>
      fs
        .readFileSync(file, "utf8")
        .split("\n")
        .map((line, i) => ({
          line,
          at: `${path.relative(root, file)}:${i + 1}`,
        }))
        // Every line, so class strings that wrap onto a second line count too
        .filter(({ line }) => unsupported.test(line))
        .map(({ at, line }) => `${at} ${line.trim()}`)
    );
    expect(offenders).toEqual([]);
  });
});

describe("focus highlight", () => {
  const borderOf = (renderer: ReactTestRenderer) =>
    renderer.root
      .findAll((node) => /\bborder-2\b/.test(node.props.className ?? ""))
      .map(
        (node) =>
          node.props.className.match(/border-(secondary|black-200)/)?.[0]
      )[0];

  it("highlights a form field while it is being typed in", () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <FormField
          title="Title"
          value=""
          handleChangeText={() => {}}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      );
    });
    expect(borderOf(renderer)).toBe("border-black-200");

    act(() => renderer.root.findByType(TextInput).props.onFocus({}));
    expect(borderOf(renderer)).toBe("border-secondary");
    expect(onFocus).toHaveBeenCalled();

    act(() => renderer.root.findByType(TextInput).props.onBlur({}));
    expect(borderOf(renderer)).toBe("border-black-200");
    expect(onBlur).toHaveBeenCalled();
  });

  it("highlights the search box while it is being typed in", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<SearchInput />);
    });
    expect(borderOf(renderer)).toBe("border-black-200");

    act(() => renderer.root.findByType(TextInput).props.onFocus({}));
    expect(borderOf(renderer)).toBe("border-secondary");
  });
});

/** Minimal decoder for 8-bit RGBA, non-interlaced PNGs (like the splash). */
function decodeRgba(png: Buffer) {
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  expect([png[24], png[25], png[28]]).toEqual([8, 6, 0]);

  const chunks: Buffer[] = [];
  for (let offset = 8; offset < png.length; ) {
    const length = png.readUInt32BE(offset);
    if (png.toString("ascii", offset + 4, offset + 8) === "IDAT") {
      chunks.push(png.subarray(offset + 8, offset + 8 + length));
    }
    offset += 12 + length;
  }
  const raw = zlib.inflateSync(Buffer.concat(chunks));
  const stride = width * 4;
  const pixels = Buffer.alloc(height * stride);
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x];
      const a = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y > 0 ? pixels[(y - 1) * stride + x - 4] : 0;
      let predictor = 0;
      switch (filter) {
        case 1:
          predictor = a;
          break;
        case 2:
          predictor = b;
          break;
        case 3:
          predictor = (a + b) >> 1;
          break;
        case 4:
          predictor = paeth(a, b, c);
          break;
      }
      pixels[y * stride + x] = (value + predictor) & 255;
    }
  }
  return { pixels, width, height };
}
