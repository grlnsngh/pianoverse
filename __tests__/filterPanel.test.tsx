import React from "react";
import { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer";
import FilterButton from "@/components/FilterButton";
import { DEFAULT_FILTERS } from "@/constants/Piano";
import {
  createTestStore,
  flushPromises,
  pressText,
  renderWithStore,
} from "./helpers/render";

// Lets the panel's open and close animations finish
const settle = () =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, 400)));

const byLabel = (renderer: ReactTestRenderer, label: string) => {
  const [node] = renderer.root.findAll(
    (candidate) =>
      candidate.props.accessibilityLabel === label &&
      (typeof candidate.props.onPress === "function" ||
        typeof candidate.props.onValueChange === "function")
  );
  if (!node) throw new Error(`Nothing labelled "${label}"`);
  return node;
};

const isPanelOpen = (renderer: ReactTestRenderer) =>
  renderer.root.findAll((node) => node.props.testID === "filter-sheet")
    .length > 0;

const openPanel = async (renderer: ReactTestRenderer) => {
  await act(async () => byLabel(renderer, "Filters").props.onPress());
  await settle();
  expect(isPanelOpen(renderer)).toBe(true);
};

const switchValue = (renderer: ReactTestRenderer, label: string) =>
  byLabel(renderer, label).props.value;

const flip = (renderer: ReactTestRenderer, label: string) =>
  act(() => {
    const node = byLabel(renderer, label);
    node.props.onValueChange(!node.props.value);
  });

const chipSelected = (renderer: ReactTestRenderer, label: string) =>
  byLabel(renderer, `${label} category`).props.accessibilityState?.selected;

// A touch on the sheet, as React Native's responder system reports it
const touchAt = (y: number, time: number) => {
  const touch = {
    touchActive: true,
    startPageX: 100,
    startPageY: 100,
    startTimeStamp: 1000,
    currentPageX: 100,
    currentPageY: y,
    currentTimeStamp: time,
    previousPageX: 100,
    previousPageY: 100,
    previousTimeStamp: 1000,
  };
  return {
    nativeEvent: { touches: [{ pageX: 100, pageY: y }] },
    touchHistory: {
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: time,
      touchBank: [touch],
    },
  };
};

/** Drags the sheet down by `distance`, like pulling it closed. */
const dragSheetDown = async (renderer: ReactTestRenderer, distance: number) => {
  const [sheet] = renderer.root.findAll(
    (node: ReactTestInstance) =>
      node.props.testID === "filter-sheet" &&
      typeof node.props.onResponderRelease === "function"
  );
  act(() => {
    sheet.props.onResponderGrant(touchAt(100, 1000));
    sheet.props.onResponderMove(touchAt(100 + distance, 1300));
    sheet.props.onResponderRelease(touchAt(100 + distance, 1300));
  });
  await settle();
};

describe("the filter panel", () => {
  it("forgets what was changed when it is dragged closed", async () => {
    const store = createTestStore();
    const renderer = renderWithStore(<FilterButton />, store);
    await openPanel(renderer);

    flip(renderer, "Sold Pianos");
    expect(switchValue(renderer, "Sold Pianos")).toBe(true);
    await dragSheetDown(renderer, 250);
    expect(isPanelOpen(renderer)).toBe(false);

    await openPanel(renderer);

    // Shows the filters in use, which nothing changed
    expect(switchValue(renderer, "Sold Pianos")).toBe(false);
    expect(store.getState().pianos.filters.isSold).toBe(false);
  });

  it("stays open when dragged only a little", async () => {
    const renderer = renderWithStore(<FilterButton />, createTestStore());
    await openPanel(renderer);

    flip(renderer, "Sold Pianos");
    await dragSheetDown(renderer, 20);

    expect(isPanelOpen(renderer)).toBe(true);
    expect(switchValue(renderer, "Sold Pianos")).toBe(true);
  });

  it("applies what was changed with Show Results", async () => {
    const store = createTestStore();
    const renderer = renderWithStore(<FilterButton />, store);
    await openPanel(renderer);

    flip(renderer, "Sold Pianos");
    await pressText(renderer.root, "Show Results");
    await settle();

    expect(store.getState().pianos.filters.isSold).toBe(true);
  });

  it("has a close button big enough to tap that drops the changes", async () => {
    const store = createTestStore();
    const renderer = renderWithStore(<FilterButton />, store);
    await openPanel(renderer);
    flip(renderer, "Sold Pianos");

    const close = byLabel(renderer, "Close filters");
    // The icon is 16 points; with the extra touch area around it the button
    // reaches the 44-point minimum
    const { top, bottom, left, right } = close.props.hitSlop;
    expect(16 + top + bottom).toBeGreaterThanOrEqual(44);
    expect(16 + left + right).toBeGreaterThanOrEqual(44);

    await act(async () => close.props.onPress());
    await settle();
    await openPanel(renderer);

    expect(switchValue(renderer, "Sold Pianos")).toBe(false);
    expect(store.getState().pianos.filters.isSold).toBe(false);
  });

  describe("Active Rentals", () => {
    it("keeps Rentable when it was chosen first", async () => {
      const store = createTestStore();
      const renderer = renderWithStore(<FilterButton />, store);
      await openPanel(renderer);

      await pressText(renderer.root, "Rentable");
      expect(chipSelected(renderer, "Rentable")).toBe(true);
      flip(renderer, "Active Rentals");

      expect(chipSelected(renderer, "Rentable")).toBe(true);
      await pressText(renderer.root, "Show Results");
      await flushPromises();
      expect(store.getState().pianos.filters).toMatchObject({
        category: "Rentable",
        isActiveRentals: true,
      });
    });

    it("chooses Rentable when turned on, and leaves the category when turned off", async () => {
      const store = createTestStore();
      const renderer = renderWithStore(<FilterButton />, store);
      await openPanel(renderer);

      flip(renderer, "Active Rentals");
      expect(chipSelected(renderer, "Rentable")).toBe(true);

      flip(renderer, "Active Rentals");
      expect(switchValue(renderer, "Active Rentals")).toBe(false);
      expect(chipSelected(renderer, "Rentable")).toBe(true);
      // The other categories can be chosen again
      await pressText(renderer.root, "Events");
      expect(chipSelected(renderer, "Events")).toBe(true);

      await pressText(renderer.root, "Show Results");
      await flushPromises();
      expect(store.getState().pianos.filters).toEqual({
        ...DEFAULT_FILTERS,
        category: "Events",
      });
    });
  });
});
