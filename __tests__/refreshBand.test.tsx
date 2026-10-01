import React from "react";
import { Platform, StyleSheet } from "react-native";
import RefreshBand, { HIDDEN_REFRESH_INDICATOR } from "@/components/RefreshBand";
import { advance, animatedStyles, hostByTestId, mount, setReduceMotion, update } from "./helpers/ui";

const flat = (style: unknown) => StyleSheet.flatten(style as any);

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const spinners = (renderer: Awaited<ReturnType<typeof mount>>) =>
  renderer.root.findAll((node) => node.props.accessibilityLabel === "Refreshing");

describe("the phone's own pull to refresh", () => {
  it("is kept, but draws nothing: the band does the drawing", () => {
    expect(HIDDEN_REFRESH_INDICATOR).toEqual({
      tintColor: "transparent",
      colors: ["transparent"],
      progressBackgroundColor: "transparent",
      progressViewOffset: -200,
    });
  });
});

describe("the refresh band", () => {
  it("shows the 28 px ink spinner while it refreshes, and nothing before", async () => {
    const renderer = await mount(<RefreshBand refreshing={false} />);
    expect(spinners(renderer)).toHaveLength(0);

    await update(renderer, <RefreshBand refreshing />);

    const [spinner] = spinners(renderer);
    expect(spinner.props).toMatchObject({ size: 28, color: "#1A1814" });
  });

  it("takes the spinner away once it has faded out", async () => {
    const renderer = await mount(<RefreshBand refreshing />);
    expect(spinners(renderer).length).toBeGreaterThan(0);

    await update(renderer, <RefreshBand refreshing={false} />);
    // Still there while it fades
    expect(spinners(renderer).length).toBeGreaterThan(0);
    await advance(300);

    expect(spinners(renderer)).toHaveLength(0);
  });

  it("never takes a touch", async () => {
    const renderer = await mount(<RefreshBand refreshing />);

    expect(hostByTestId(renderer.root, "refresh-band").props.pointerEvents).toBe("none");
  });

  describe("on iOS", () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, "OS", "ios");
    });

    it("sits in the room the phone makes above the list, and doesn't move the list", async () => {
      const renderer = await mount(<RefreshBand refreshing />);

      expect(flat(hostByTestId(renderer.root, "refresh-band").props.style)).toMatchObject({
        position: "absolute",
        top: -60,
        height: 60,
      });
    });
  });

  describe("on Android", () => {
    beforeEach(() => {
      jest.replaceProperty(Platform, "OS", "android");
    });

    it("is shut while nothing is refreshing", async () => {
      const renderer = await mount(<RefreshBand refreshing={false} />);

      expect(flat(hostByTestId(renderer.root, "refresh-band").props.style).height).toBe(0);
      expect(animatedStyles(renderer.root)[0]).toMatchObject({ opacity: 0, height: 0 });
    });

    it("opens to 72 px, pushing the list down, in 200 ms", async () => {
      const renderer = await mount(<RefreshBand refreshing={false} />);

      await update(renderer, <RefreshBand refreshing />);
      await advance(200);

      expect(animatedStyles(renderer.root)[0]).toMatchObject({ opacity: 1, height: 72 });
    });

    it("jumps to 72 px and only fades, with Reduce Motion on", async () => {
      setReduceMotion(true);
      const renderer = await mount(<RefreshBand refreshing={false} />);

      await update(renderer, <RefreshBand refreshing />);
      await advance(130);

      expect(animatedStyles(renderer.root)[0]).toMatchObject({ opacity: 1, height: 72 });
    });
  });
});
