import React, { useState } from "react";
import { act } from "react-test-renderer";
import { Slider } from "@/components/ui";
import { hostByTestId, mount } from "./helpers/ui";

/** The slider of the Letterhead screens: dragged by a finger, stepped by a screen reader. */

/** A finger at `x` px along the track, moved from `from`, as React Native's responder system reports it. */
const touch = (x: number, time: number, from = x) => {
  const record = {
    touchActive: true,
    startPageX: 0,
    startPageY: 0,
    startTimeStamp: 0,
    currentPageX: x,
    currentPageY: 0,
    currentTimeStamp: time,
    previousPageX: from,
    previousPageY: 0,
    previousTimeStamp: time,
  };
  return {
    nativeEvent: { locationX: x, pageX: x, touches: [{}], changedTouches: [{}], timestamp: time },
    touchHistory: { touchBank: [record], numberActiveTouches: 1, indexOfSingleActiveTouch: 0, mostRecentTimeStamp: time },
  };
};

const Controlled = ({ onChange, start = 30 }: { onChange: jest.Mock; start?: number }) => {
  const [value, setValue] = useState(start);
  return (
    <Slider
      value={value}
      min={10}
      max={90}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
      accessibilityLabel="Space at the top"
      unit="millimetres"
      testID="slider"
    />
  );
};

const setup = async (start?: number) => {
  const onChange = jest.fn();
  const renderer = await mount(<Controlled onChange={onChange} start={start} />);
  const node = () => hostByTestId(renderer.root, "slider");
  act(() => node().props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 44 } } }));
  return { onChange, node };
};

describe("Slider", () => {
  it("tells a screen reader what it is and where it stands", async () => {
    const { node } = await setup();

    expect(node().props.accessibilityRole).toBe("adjustable");
    expect(node().props.accessibilityLabel).toBe("Space at the top");
    expect(node().props.accessibilityValue).toEqual({ min: 10, max: 90, now: 30, text: "30 millimetres" });
  });

  it("jumps to where the finger lands, and follows it along the track", async () => {
    const { onChange, node } = await setup();

    act(() => {
      node().props.onResponderGrant(touch(100, 1));
    });
    expect(onChange).toHaveBeenLastCalledWith(50);

    act(() => {
      node().props.onResponderMove(touch(150, 2, 100));
    });
    expect(onChange).toHaveBeenLastCalledWith(70);
    expect(node().props.accessibilityValue.now).toBe(70);

    // Past the end of the track it stays at the end
    act(() => {
      node().props.onResponderMove(touch(400, 3, 150));
    });
    expect(onChange).toHaveBeenLastCalledWith(90);
  });

  it("says nothing when the value doesn't change", async () => {
    const { onChange, node } = await setup(50);

    act(() => {
      node().props.onResponderGrant(touch(100, 1));
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("steps one at a time for a screen reader, and stops at the ends", async () => {
    const { onChange, node } = await setup(89);

    act(() => node().props.onAccessibilityAction({ nativeEvent: { actionName: "increment" } }));
    act(() => node().props.onAccessibilityAction({ nativeEvent: { actionName: "increment" } }));
    expect(onChange.mock.calls).toEqual([[90]]);

    act(() => node().props.onAccessibilityAction({ nativeEvent: { actionName: "decrement" } }));
    expect(onChange).toHaveBeenLastCalledWith(89);
  });
});
