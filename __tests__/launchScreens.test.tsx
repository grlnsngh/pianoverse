const mockContext = { loading: true, isLogged: false };

jest.mock("@/context/GlobalProvider", () => ({
  useGlobalContext: () => mockContext,
}));
jest.mock("expo-router", () => {
  const React = require("react");
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    Redirect: ({ href }: { href: string }) => React.createElement("Redirect", { href }),
  };
});

import React from "react";
import { StyleSheet } from "react-native";
import { router } from "expo-router";
import Index from "@/app/index";
import Splash from "@/components/Splash";
import WelcomeScreen from "@/components/WelcomeScreen";
import { BrandMark, KeyboardMark } from "@/components/ui";
import { lightColors as colors } from "@/constants/theme";
import {
  allTexts,
  createTestStore,
  pressButton,
  renderWithStore,
} from "./helpers/render";

beforeEach(() => {
  jest.clearAllMocks();
  mockContext.loading = true;
  mockContext.isLogged = false;
});

const render = (ui: React.ReactElement) => renderWithStore(ui, createTestStore());

const hosts = (renderer: ReturnType<typeof render>, type: string) =>
  renderer.root.findAll((node) => (node.type as unknown) === type);

describe("the first screen", () => {
  it("is the splash while the app finds out who is signed in", () => {
    const renderer = render(<Index />);

    expect(renderer.root.findAll((node) => node.props.testID === "splash").length).toBeGreaterThan(0);
    expect(allTexts(renderer.root)).toContain("Pianoverse");
    expect(allTexts(renderer.root)).not.toContain("Sign in");
  });

  it("sends someone who is signed in to the tabs", () => {
    mockContext.loading = false;
    mockContext.isLogged = true;

    const renderer = render(<Index />);

    expect(hosts(renderer, "Redirect")[0].props.href).toBe("/home");
  });

  it("is the welcome screen for everyone else", () => {
    mockContext.loading = false;

    const renderer = render(<Index />);

    expect(renderer.root.findAll((node) => node.props.testID === "welcome").length).toBeGreaterThan(0);
    expect(hosts(renderer, "Redirect")).toHaveLength(0);
  });
});

describe("the splash", () => {
  it("is brand orange with the logo tile and the name", () => {
    const renderer = render(<Splash />);

    const [screen] = renderer.root.findAll(
      (node) => node.props.testID === "splash" && typeof node.type === "string"
    );
    expect(StyleSheet.flatten(screen.props.style).backgroundColor).toBe(colors.brand);
    expect(allTexts(renderer.root)).toContain("Pianoverse");
    const [tile] = renderer.root.findAll(
      (node) => node.props.accessibilityLabel === "Pianoverse" && typeof node.type === "string"
    );
    expect(StyleSheet.flatten(tile.props.style)).toMatchObject({
      width: 104,
      height: 104,
      borderRadius: 30,
      backgroundColor: colors.ink,
    });
  });

  it("runs the keys loader under the logo", () => {
    const renderer = render(<Splash />);

    const loader = renderer.root.findAll((node) => node.props.accessibilityLabel === "Loading");
    expect(loader.length).toBeGreaterThan(0);
  });
});

describe("the logo tile", () => {
  it("scales its corners and its keys with its size", () => {
    const renderer = render(<BrandMark size={40} />);

    const [tile] = renderer.root.findAll(
      (node) => node.props.accessibilityLabel === "Pianoverse" && typeof node.type === "string"
    );
    expect(StyleSheet.flatten(tile.props.style)).toMatchObject({ width: 40, borderRadius: 12 });
    expect(renderer.root.findByType(KeyboardMark).props.width).toBe(26);
  });
});

describe("the welcome screen", () => {
  it("says what the app is for", () => {
    const renderer = render(<WelcomeScreen />);

    const texts = allTexts(renderer.root);
    expect(texts).toContain("Pianoverse");
    expect(texts).toContain("Every piano, every rental, in one place.");
    expect(texts).toContain("Know who has each piano and never miss a payment.");
  });

  it("has Sign in and Create account", async () => {
    const renderer = render(<WelcomeScreen />);

    await pressButton(renderer.root, "Sign in");
    expect(router.push).toHaveBeenLastCalledWith("/sign-in");

    await pressButton(renderer.root, "Create account");
    expect(router.push).toHaveBeenLastCalledWith("/sign-up");
  });

  it("draws the keyboard as an orange top with rounded bottom corners", () => {
    const renderer = render(<WelcomeScreen />);

    const hero = renderer.root.find(
      (node) =>
        typeof node.type === "string" &&
        StyleSheet.flatten(node.props.style)?.backgroundColor === colors.brand &&
        StyleSheet.flatten(node.props.style)?.borderBottomLeftRadius === 32
    );
    expect(StyleSheet.flatten(hero.props.style).borderBottomRightRadius).toBe(32);
  });
});
