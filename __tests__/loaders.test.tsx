import React from "react";
import { AccessibilityInfo, Text } from "react-native";
import Svg, { Circle, Path, Rect, Stop } from "react-native-svg";
import { act } from "react-test-renderer";
import { KeysLoader, Skeleton, Spinner, useSkeletonDelay } from "@/components/ui";
import { lightColors as colors } from "@/constants/theme";
import {
  advance,
  animatedStyleOf,
  animatedStyles,
  hostByTestId,
  mount,
  setReduceMotion,
} from "./helpers/ui";

type Mounted = Awaited<ReturnType<typeof mount>>;

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const degrees = (style: any) => parseFloat(style.transform[0].rotate);
const flatten = (style: any) =>
  (Array.isArray(style) ? style : [style]).reduce(
    (all: any, part: any) => ({ ...all, ...part }),
    {}
  );

describe("Spinner", () => {
  it("is a ring with a quarter turning, 24 px by default", async () => {
    const renderer = await mount(<Spinner />);
    const svg = renderer.root.findByType(Svg);
    const ring = renderer.root.findByType(Circle);
    const arc = renderer.root.findByType(Path);

    expect(svg.props).toMatchObject({ width: 24, height: 24, viewBox: "0 0 24 24" });
    expect(ring.props).toMatchObject({
      cx: 12,
      cy: 12,
      r: 9,
      stroke: colors.hairline,
      strokeWidth: 3,
    });
    expect(arc.props).toMatchObject({
      d: "M21 12a9 9 0 0 0-9-9",
      stroke: colors.ink,
      strokeWidth: 3,
      strokeLinecap: "round",
    });
  });

  it("takes a size and colours, and draws a thinner ring when big", async () => {
    const big = await mount(
      <Spinner size={40} color="#123456" trackColor="#abcdef" />
    );

    expect(big.root.findByType(Svg).props.width).toBe(40);
    expect(big.root.findByType(Circle).props).toMatchObject({
      stroke: "#abcdef",
      strokeWidth: 2.4,
    });
    expect(big.root.findByType(Path).props).toMatchObject({
      stroke: "#123456",
      strokeWidth: 2.4,
    });
  });

  it("makes a full turn every 0.8 seconds", async () => {
    const renderer = await mount(<Spinner testID="spinner" />);
    const spinner = () => animatedStyleOf(hostByTestId(renderer.root, "spinner"));

    expect(degrees(spinner())).toBe(0);
    await advance(200);
    expect(degrees(spinner())).toBeCloseTo(90, 0);
    await advance(200);
    expect(degrees(spinner())).toBeCloseTo(180, 0);
    await advance(400);
    // Back at the start of the next turn
    expect(degrees(spinner()) % 360).toBeCloseTo(0, 0);
  });

  it("stands still when the phone asks for less motion", async () => {
    setReduceMotion(true);
    const renderer = await mount(<Spinner testID="spinner" />);

    await advance(400);

    expect(
      degrees(animatedStyleOf(hostByTestId(renderer.root, "spinner")))
    ).toBe(0);
    // Still there, as a static shape
    expect(renderer.root.findByType(Path)).toBeTruthy();
  });

  it("stops when the setting is switched on while it is showing", async () => {
    let onChange: (enabled: boolean) => void = () => {};
    jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation(((
      _event: string,
      handler: (enabled: boolean) => void
    ) => {
      onChange = handler;
      return { remove: jest.fn() };
    }) as any);
    const renderer = await mount(<Spinner testID="spinner" />);
    await advance(200);
    expect(
      degrees(animatedStyleOf(hostByTestId(renderer.root, "spinner")))
    ).toBeCloseTo(90, 0);

    await act(async () => onChange(true));
    await advance(300);

    expect(
      degrees(animatedStyleOf(hostByTestId(renderer.root, "spinner")))
    ).toBe(0);
  });

  it("says it is loading, unless the words beside it already do", async () => {
    const alone = await mount(<Spinner testID="alone" />);
    const beside = await mount(<Spinner testID="beside" decorative />);

    expect(hostByTestId(alone.root, "alone").props).toMatchObject({
      accessible: true,
      accessibilityRole: "progressbar",
      accessibilityLabel: "Loading",
      accessibilityState: { busy: true },
    });
    expect(hostByTestId(beside.root, "beside").props).toMatchObject({
      accessibilityElementsHidden: true,
      importantForAccessibility: "no-hide-descendants",
    });
    expect(hostByTestId(beside.root, "beside").props.accessible).toBeUndefined();
  });

  it("can say what it is loading", async () => {
    const renderer = await mount(
      <Spinner testID="s" accessibilityLabel="Refreshing" />
    );

    expect(hostByTestId(renderer.root, "s").props.accessibilityLabel).toBe(
      "Refreshing"
    );
  });

  it("keeps working when the phone can't say whether motion is reduced", async () => {
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockRejectedValue(new Error("unavailable"));
    const renderer = await mount(<Spinner testID="spinner" />);

    await advance(200);

    expect(
      degrees(animatedStyleOf(hostByTestId(renderer.root, "spinner")))
    ).toBeCloseTo(90, 0);
  });
});

describe("KeysLoader", () => {
  const bars = (renderer: Mounted) =>
    renderer.root
      .findAll(
        (node) =>
          typeof node.type === "string" &&
          node.props.jestAnimatedStyle !== undefined
      )
      .map((node) => ({
        animated: animatedStyleOf(node),
        base: flatten(node.props.style),
      }));
  const scale = (bar: { animated: any }) => bar.animated.transform[1].scaleY as number;

  it("is five bars, with the middle one orange", async () => {
    const renderer = await mount(<KeysLoader />);

    expect(bars(renderer).map((bar) => bar.base.backgroundColor)).toEqual([
      colors.ink,
      colors.ink,
      colors.brand,
      colors.ink,
      colors.ink,
    ]);
  });

  it("can have all five bars the same colour, as on the orange splash", async () => {
    const renderer = await mount(<KeysLoader accent={null} />);

    expect(bars(renderer).map((bar) => bar.base.backgroundColor)).toEqual(
      Array(5).fill(colors.ink)
    );
  });

  it("takes a colour for the bars", async () => {
    const renderer = await mount(<KeysLoader color="#123456" accent="#654321" />);

    expect(bars(renderer).map((bar) => bar.base.backgroundColor)).toEqual([
      "#123456",
      "#123456",
      "#654321",
      "#123456",
      "#123456",
    ]);
  });

  it.each([
    [32, { width: 8, height: 32, borderRadius: 4 }],
    [40, { width: 8, height: 40, borderRadius: 4 }],
    [56, { width: 12, height: 56, borderRadius: 6 }],
  ] as const)("draws the %s px size like the boards", async (size, expected) => {
    const renderer = await mount(<KeysLoader size={size} />);

    for (const bar of bars(renderer)) {
      expect(bar.base).toMatchObject(expected);
    }
  });

  it("rises and falls once every 1.1 seconds, between 0.4 and full height", async () => {
    const renderer = await mount(<KeysLoader />);
    const first = () => scale(bars(renderer)[0]);

    expect(first()).toBeCloseTo(0.4, 2);
    await advance(550);
    expect(first()).toBeCloseTo(1, 1);
    await advance(550);
    expect(first()).toBeCloseTo(0.4, 1);
  });

  it("starts each bar 120 ms after the one before, so they ripple", async () => {
    const renderer = await mount(<KeysLoader />);

    await advance(200);
    const [a, b, c] = bars(renderer).map(scale);

    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
    // The middle bar starts at 240 ms, so it hasn't moved yet
    expect(c).toBeCloseTo(0.4, 2);
  });

  it("keeps the bottom of each bar on the line while it scales", async () => {
    const renderer = await mount(<KeysLoader size={40} />);
    await advance(300);

    for (const { animated } of bars(renderer)) {
      const [{ translateY }, { scaleY }] = animated.transform;
      expect(translateY).toBeCloseTo((40 * (1 - scaleY)) / 2, 5);
    }
  });

  it("stands still at full height with reduced motion", async () => {
    setReduceMotion(true);
    const renderer = await mount(<KeysLoader />);
    await advance(700);

    for (const bar of bars(renderer)) {
      expect(bar.animated.transform).toEqual([{ translateY: 0 }, { scaleY: 1 }]);
    }
  });

  it("says it is loading", async () => {
    const renderer = await mount(<KeysLoader testID="keys" />);

    expect(hostByTestId(renderer.root, "keys").props).toMatchObject({
      accessible: true,
      accessibilityRole: "progressbar",
      accessibilityLabel: "Loading",
      accessibilityState: { busy: true },
    });
  });
});

describe("Skeleton", () => {
  const layout = (width: number) => ({
    nativeEvent: { layout: { width, height: 20, x: 0, y: 0 } },
  });
  const shape = (renderer: Mounted) => hostByTestId(renderer.root, "sk");
  const band = (renderer: Mounted) => animatedStyles(renderer.root)[0];

  it("is a grey shape of the size and radius it is given", async () => {
    const renderer = await mount(
      <Skeleton testID="sk" width={220} height={28} radius={8} />
    );

    expect(flatten(shape(renderer).props.style)).toMatchObject({
      width: 220,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.skeletonBase,
      overflow: "hidden",
    });
  });

  it("is left out of what a screen reader reads", async () => {
    const renderer = await mount(<Skeleton testID="sk" width={100} height={16} />);

    expect(shape(renderer).props).toMatchObject({
      accessibilityElementsHidden: true,
      importantForAccessibility: "no-hide-descendants",
    });
  });

  it("has no shimmer until it knows how wide it is", async () => {
    const renderer = await mount(<Skeleton testID="sk" width={100} height={16} />);

    expect(animatedStyles(renderer.root)).toHaveLength(0);
  });

  it("sweeps a light band that runs from base to highlight and back to base", async () => {
    const renderer = await mount(<Skeleton testID="sk" width={200} height={16} />);
    await act(async () => shape(renderer).props.onLayout(layout(200)));

    const stops = renderer.root.findAllByType(Stop).map((stop) => stop.props);
    expect(stops).toEqual([
      expect.objectContaining({ offset: "0", stopColor: colors.skeletonBase }),
      expect.objectContaining({ offset: "0.5", stopColor: colors.skeletonHighlight }),
      expect.objectContaining({ offset: "1", stopColor: colors.skeletonBase }),
    ]);
    expect(renderer.root.findByType(Rect).props.fill).toBe("url(#shimmer)");
  });

  it("moves the band across in 1.5 seconds, at a steady speed", async () => {
    const renderer = await mount(<Skeleton testID="sk" width={200} height={16} />);
    await act(async () => shape(renderer).props.onLayout(layout(200)));
    const x = () => band(renderer).transform[0].translateX as number;

    // Just off the left edge, then across the middle, then off the right.
    // (One frame in, because Reanimated applies a new width on the next frame)
    await advance(16);
    expect(x()).toBeLessThan(-190);
    await advance(734);
    expect(x()).toBeCloseTo(0, 0);
    await advance(700);
    expect(x()).toBeGreaterThan(150);
  });

  it("is a plain grey shape with reduced motion", async () => {
    setReduceMotion(true);
    const renderer = await mount(<Skeleton testID="sk" width={200} height={16} />);
    await act(async () => shape(renderer).props.onLayout(layout(200)));
    await advance(750);

    expect(animatedStyles(renderer.root)).toHaveLength(0);
    expect(renderer.root.findAllByType(Rect)).toHaveLength(0);
  });
});

describe("useSkeletonDelay", () => {
  const Probe = ({ loading, delay }: { loading: boolean; delay?: number }) => (
    <Text>{useSkeletonDelay(loading, delay) ? "skeleton" : "nothing"}</Text>
  );
  const shown = (renderer: Mounted) => renderer.root.findByType(Text).props.children;

  it("shows nothing for the first 200 ms, then the skeleton", async () => {
    const renderer = await mount(<Probe loading />);

    expect(shown(renderer)).toBe("nothing");
    await advance(199);
    expect(shown(renderer)).toBe("nothing");
    await advance(1);
    expect(shown(renderer)).toBe("skeleton");
  });

  it("never flashes a skeleton when the data arrives in time", async () => {
    const renderer = await mount(<Probe loading />);
    await advance(150);
    await act(async () => renderer.update(<Probe loading={false} />));
    await advance(500);

    expect(shown(renderer)).toBe("nothing");
  });

  it("hides the skeleton as soon as loading ends", async () => {
    const renderer = await mount(<Probe loading />);
    await advance(300);
    expect(shown(renderer)).toBe("skeleton");

    await act(async () => renderer.update(<Probe loading={false} />));

    expect(shown(renderer)).toBe("nothing");
  });

  it("waits again the next time something loads", async () => {
    const renderer = await mount(<Probe loading />);
    await advance(300);
    await act(async () => renderer.update(<Probe loading={false} />));
    await act(async () => renderer.update(<Probe loading />));

    expect(shown(renderer)).toBe("nothing");
    await advance(200);
    expect(shown(renderer)).toBe("skeleton");
  });

  it("shows nothing when nothing is loading", async () => {
    const renderer = await mount(<Probe loading={false} />);
    await advance(1000);

    expect(shown(renderer)).toBe("nothing");
  });

  it("can wait for another length of time", async () => {
    const renderer = await mount(<Probe loading delay={500} />);

    await advance(499);
    expect(shown(renderer)).toBe("nothing");
    await advance(1);
    expect(shown(renderer)).toBe("skeleton");
  });
});
