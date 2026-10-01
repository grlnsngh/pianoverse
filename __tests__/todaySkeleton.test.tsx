import React from "react";
import { StyleSheet } from "react-native";
import TodaySkeleton from "@/components/TodaySkeleton";
import { colors } from "@/constants/theme";
import { mount } from "./helpers/ui";

const flat = (style: unknown) => StyleSheet.flatten(style as any);

const shapes = (renderer: any) =>
  renderer.root
    .findAll((node: any) => typeof node.type === "string" && node.props.accessibilityElementsHidden === true)
    .map((node: any) => flat(node.props.style))
    // (the + button's icon is hidden from screen readers too, but has no rounded corners)
    .filter((style: any) => style.borderRadius !== undefined)
    .map((style: any) => [style.width, style.height, style.borderRadius] as [number, number, number]);

describe("the Today skeleton (LoadingToday board)", () => {
  it("draws the shapes of the date, the money, the counts, the rows and the shelf", async () => {
    const renderer = await mount(<TodaySkeleton onAdd={jest.fn()} />);

    expect(shapes(renderer)).toEqual([
      // Date and title
      [150, 14, 7],
      [112, 30, 8],
      // Received: label, amount, note
      [150, 14, 7],
      [220, 44, 10],
      [110, 14, 7],
      // In stock, On rent, Sold this month: number and label
      [36, 22, 6],
      [60, 12, 6],
      [28, 22, 6],
      [52, 12, 6],
      [90, 22, 6],
      [96, 12, 6],
      // Needs attention title, then three rows: photo and three lines
      [160, 20, 8],
      [64, 64, 12],
      [150, 16, 8],
      [100, 14, 7],
      [120, 14, 7],
      [64, 64, 12],
      [130, 16, 8],
      [110, 14, 7],
      [100, 14, 7],
      [64, 64, 12],
      [160, 16, 8],
      [90, 14, 7],
      [130, 14, 7],
      // Rented out title, then a whole card and the start of the next
      [110, 20, 8],
      [244, 152, 16],
      [140, 16, 8],
      [90, 14, 7],
      [244, 152, 16],
    ]);
  });

  it("keeps the + button real, and pressable while everything else loads", async () => {
    const onAdd = jest.fn();
    const renderer = await mount(<TodaySkeleton onAdd={onAdd} />);
    const add = renderer.root.find(
      (node) => node.props.accessibilityLabel === "Add piano" && typeof node.props.onPress === "function"
    );

    add.props.onPress();

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("says it is loading, as one thing, rather than announcing each grey shape", async () => {
    const renderer = await mount(<TodaySkeleton onAdd={jest.fn()} />);
    const loading = renderer.root.find(
      (node) => typeof node.type === "string" && node.props.testID === "today-skeleton"
    );

    expect(loading.props.accessible).toBe(true);
    expect(loading.props.accessibilityLabel).toBe("Loading Today");
    expect(loading.props.accessibilityState).toEqual({ busy: true });
  });

  it("uses the skeleton's grey, with hairlines where the real rows have them", async () => {
    const renderer = await mount(<TodaySkeleton onAdd={jest.fn()} />);
    const hairlines = renderer.root.findAll(
      (node: any) =>
        typeof node.type === "string" &&
        (flat(node.props.style)?.borderBottomColor === colors.hairline ||
          flat(node.props.style)?.borderTopColor === colors.hairline)
    );

    // The rule above the counts, and one under each of the three rows
    expect(hairlines).toHaveLength(4);
    const first = renderer.root.findAll(
      (node: any) => typeof node.type === "string" && flat(node.props.style)?.backgroundColor === colors.skeletonBase
    );
    expect(first.length).toBeGreaterThan(0);
  });
});
