import React from "react";
import { Text } from "react-native";
import { ScreenEntrance, StepTransition, SuccessMark } from "@/components/ui";
import useReducedMotion from "@/lib/useReducedMotion";
import { advance, animatedStyles, mount, setReduceMotion, update } from "./helpers/ui";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Any screen that asks the phone about motion, as every animated one does
const ReducedProbe = () => {
  useReducedMotion();
  return null;
};

const style = (renderer: Awaited<ReturnType<typeof mount>>) => animatedStyles(renderer.root)[0];

describe("a change of step", () => {
  const step = (n: number) => (
    <StepTransition step={n}>
      <Text>{`Step ${n}`}</Text>
    </StepTransition>
  );

  it("shows the first step as it is, with nothing to play", async () => {
    const renderer = await mount(step(1));

    expect(style(renderer)).toMatchObject({ opacity: 1, transform: [{ translateX: 0 }] });
  });

  it("slides the next step in 24 px from the right while it fades in, over 240 ms", async () => {
    const renderer = await mount(step(1));

    await update(renderer, step(2));
    await advance(16);
    const start = style(renderer);
    await advance(120);
    const middle = style(renderer);
    await advance(140);

    expect(start.opacity).toBeLessThan(0.3);
    expect(start.transform[0].translateX).toBeGreaterThan(18);
    expect(middle.opacity).toBeGreaterThan(0.4);
    expect(middle.opacity).toBeLessThan(1);
    expect(middle.transform[0].translateX).toBeGreaterThan(0);
    expect(middle.transform[0].translateX).toBeLessThan(24);
    expect(style(renderer)).toMatchObject({ opacity: 1, transform: [{ translateX: 0 }] });
  });

  it("slides the step in from the left when going back", async () => {
    const renderer = await mount(step(2));

    await update(renderer, step(1));
    await advance(16);

    expect(style(renderer).transform[0].translateX).toBeLessThan(-18);
  });

  it("only fades, over 120 ms, with Reduce Motion on", async () => {
    setReduceMotion(true);
    const renderer = await mount(step(1));

    await update(renderer, step(2));
    await advance(16);
    expect(style(renderer).transform).toEqual([]);
    expect(style(renderer).opacity).toBeLessThan(1);
    await advance(130);

    expect(style(renderer)).toMatchObject({ opacity: 1, transform: [] });
  });

  it("plays nothing when it is rendered again with the same step", async () => {
    const renderer = await mount(step(2));

    await update(renderer, step(2));
    await advance(16);

    expect(style(renderer).opacity).toBe(1);
  });
});

describe("a piano's page appearing", () => {
  const page = (mode: "grow" | "rise") => (
    <ScreenEntrance mode={mode}>
      <Text>The page</Text>
    </ScreenEntrance>
  );

  it("fades in while growing from 96% to full size, over 240 ms", async () => {
    const renderer = await mount(page("grow"));
    await advance(16);
    const start = style(renderer);
    await advance(260);

    expect(start.opacity).toBeLessThan(0.3);
    expect(start.transform[0].scale).toBeLessThan(0.97);
    expect(start.transform[0].scale).toBeGreaterThanOrEqual(0.96);
    expect(style(renderer)).toMatchObject({ opacity: 1, transform: [{ scale: 1 }] });
  });

  it("makes the bar wait 160 ms, then rise 24 px while it fades in", async () => {
    const renderer = await mount(page("rise"));
    await advance(100);
    const waiting = style(renderer);
    await advance(400);

    expect(waiting.opacity).toBe(0);
    expect(waiting.transform[0].translateY).toBe(24);
    expect(style(renderer)).toMatchObject({ opacity: 1, transform: [{ translateY: 0 }] });
  });

  it("only fades, over 120 ms, with Reduce Motion on, even for the bar", async () => {
    setReduceMotion(true);
    // The first screen learns the setting; the pages opened after it start from it
    await mount(<ReducedProbe />);
    const grow = await mount(page("grow"));
    const rise = await mount(page("rise"));
    await advance(140);

    for (const renderer of [grow, rise]) {
      expect(style(renderer)).toEqual({ opacity: 1 });
    }
  });
});

describe("the success mark popping in", () => {
  it("starts small and clear, overshoots a little, and settles at full size in 280 ms", async () => {
    const renderer = await mount(<SuccessMark />);
    await advance(16);
    const start = style(renderer);
    await advance(150);
    const peak = style(renderer);
    await advance(200);

    expect(start.opacity).toBeLessThan(0.5);
    expect(start.transform[0].scale).toBeLessThan(0.8);
    expect(peak.transform[0].scale).toBeGreaterThan(1);
    expect(style(renderer)).toMatchObject({ opacity: 1, transform: [{ scale: 1 }] });
  });

  it("is simply there with Reduce Motion on", async () => {
    setReduceMotion(true);
    await mount(<ReducedProbe />);
    const renderer = await mount(<SuccessMark />);

    expect(style(renderer)).toMatchObject({ opacity: 1, transform: [{ scale: 1 }] });
  });
});
