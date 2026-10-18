import React, { useMemo, useRef, useState } from "react";
import { AccessibilityActionEvent, LayoutChangeEvent, PanResponder, View } from "react-native";
import { makeStyles } from "@/lib/ThemeContext";

const THUMB = 26;
const TOUCH = 44;

export type SliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** What the value is, for a screen reader: "Space at the top" */
  accessibilityLabel: string;
  /** Read after the value: "millimetres" */
  unit?: string;
  testID?: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * A value dragged along a track (LetterheadUpload and LetterheadPrinted
 * boards). The whole 44 px high strip takes the finger; a screen reader
 * changes it a step at a time.
 */
const Slider = ({ value, min, max, step = 1, onChange, accessibilityLabel, unit, testID }: SliderProps) => {
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const start = useRef(0);
  const latest = useRef({ width, min, max, step, onChange, value });
  latest.current = { width, min, max, step, onChange, value };

  const fromX = (x: number) => {
    const { width: w, min: low, max: high, step: s } = latest.current;
    if (w <= 0) return latest.current.value;
    return clamp(Math.round(((x / w) * (high - low)) / s) * s + low, low, high);
  };

  const set = (next: number) => {
    if (next !== latest.current.value) latest.current.onChange(next);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          start.current = event.nativeEvent.locationX;
          set(fromX(start.current));
        },
        onPanResponderMove: (_, gesture) => set(fromX(start.current + gesture.dx)),
      }),
    // The handlers read the latest values from the ref
    []
  );

  const share = max > min ? (clamp(value, min, max) - min) / (max - min) : 0;

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === "increment") set(clamp(value + step, min, max));
    if (event.nativeEvent.actionName === "decrement") set(clamp(value - step, min, max));
  };

  return (
    <View
      style={styles.touch}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value, text: unit ? `${value} ${unit}` : String(value) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={onAccessibilityAction}
      testID={testID}
      {...responder.panHandlers}
    >
      <View style={styles.track} pointerEvents="none">
        <View style={[styles.fill, { width: `${share * 100}%` }]} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.thumb, { left: Math.max(0, share * width - THUMB / 2), opacity: width > 0 ? 1 : 0 }]}
      />
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  touch: { height: TOUCH, justifyContent: "center" },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.switchOff, overflow: "hidden" },
  fill: { height: 4, backgroundColor: colors.ink },
  thumb: {
    position: "absolute",
    top: (TOUCH - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.controlBorder,
  },
}));

export default React.memo(Slider);
