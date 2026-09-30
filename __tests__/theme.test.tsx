jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn() },
  usePathname: jest.fn(() => "/home"),
}));

import fs from "fs";
import path from "path";
import React from "react";
import { TextInput } from "react-native";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import FormField from "@/components/FormField";

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

describe("styling", () => {
  // Utilities NativeWind v2 silently drops: animations, transitions, blur,
  // pseudo-classes on plain Views, and sizes missing from the theme
  const unsupported =
    /\b(animate-[a-z]+|transition(-[a-z]+)?|duration-\d+|ease-[a-z-]+|backdrop-[a-z-]+|focus:[a-z0-9/-]+|hover:[a-z0-9/-]+|[hw]-15|border(-[trblxy])?-[35679])\b/;

  const sourceFiles = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return entry.name.endsWith(".tsx") ? [full] : [];
    });

  it("doesn't make something full width and give it side margins too", () => {
    // It would be wider than the screen by its margins
    const offenders = ["app", "components"]
      .flatMap((dir) => sourceFiles(path.join(root, dir)))
      .flatMap((file) =>
        fs
          .readFileSync(file, "utf8")
          .split("\n")
          .map((line, i) => ({
            line,
            at: `${path.relative(root, file)}:${i + 1}`,
          }))
      )
      .filter(
        ({ line }) => /\bw-full\b/.test(line) && /\b(mx|m)-(\d|px)/.test(line)
      )
      .map(({ at, line }) => `${at} ${line.trim()}`);

    expect(offenders).toEqual([]);
  });

  it("only uses classes NativeWind v2 can apply", () => {
    const offenders = ["app", "components"]
      .flatMap((dir) => sourceFiles(path.join(root, dir)))
      .flatMap((file) =>
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
});
