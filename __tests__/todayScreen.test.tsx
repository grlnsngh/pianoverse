jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

import React from "react";
import { StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import Today from "@/app/(tabs)/today";
import { colors, fonts } from "@/constants/theme";
import { mount, textContent } from "./helpers/ui";

// Tuesday 29 September 2026, the day on the boards
beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 12, 0, 0) });
  jest.clearAllMocks();
});
afterEach(() => {
  jest.useRealTimers();
});

const flat = (style: unknown) => StyleSheet.flatten(style as any);

describe("the Today tab", () => {
  it("shows today's date above a large Today title", async () => {
    const renderer = await mount(<Today />);
    const texts = renderer.root.findAllByType(Text);
    const date = texts.find((text) => textContent(text) === "Tuesday, 29 September")!;
    const title = texts.find((text) => textContent(text) === "Today")!;

    expect(flat(date.props.style)).toMatchObject({
      fontFamily: fonts.medium,
      fontSize: 14,
      color: colors.ink2,
    });
    expect(flat(title.props.style)).toMatchObject({
      fontFamily: fonts.bold,
      fontSize: 32,
      lineHeight: 38,
      color: colors.ink,
    });
  });

  it("follows the calendar", async () => {
    jest.setSystemTime(new Date(2026, 11, 5, 9, 0, 0));
    const renderer = await mount(<Today />);

    expect(renderer.root.findAllByType(Text).map(textContent)).toContain("Saturday, 5 December");
  });

  it("has the orange + button, which opens the Add screen", async () => {
    const renderer = await mount(<Today />);
    const add = renderer.root.find(
      (node) => node.props.accessibilityLabel === "Add piano" && typeof node.props.onPress === "function"
    );

    add.props.onPress();

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/create");
  });

  it("is a white page, not the old navy one", async () => {
    const renderer = await mount(<Today />);
    const page = renderer.root.findAll(
      (node) => typeof node.type === "string" && flat(node.props.style)?.backgroundColor === colors.page
    );

    expect(page.length).toBeGreaterThan(0);
  });

  it("says the rest is coming and points to the Pianos tab, rather than showing empty boxes", async () => {
    const renderer = await mount(<Today />);
    const texts = renderer.root.findAllByType(Text).map(textContent).join(" ");

    expect(texts).toMatch(/soon/);
    expect(texts).toMatch(/Pianos tab/);
  });
});
