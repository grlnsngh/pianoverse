import React, { useEffect, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { fonts, motion } from "@/constants/theme";
import useReducedMotion from "@/lib/useReducedMotion";
import useTextScale from "@/lib/useTextScale";
import { makeStyles } from "@/lib/ThemeContext";

const PADDING = 2;
const OPTION_HEIGHT = 40;

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Says what the choice is for, such as "Category" */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Two to four choices in one grey track, of which one is selected: a white
 * chip with a bold label. Options share the width equally. The chip slides to
 * the option that is pressed in 200 ms; with reduced motion it jumps.
 *
 * With a big Font size the choices don't fit side by side ("Private person",
 * "Match phone"), so they become one row each, and the chosen one is the white
 * row itself rather than a chip that slides.
 */
function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
  testID,
}: SegmentedProps<T>) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const { large } = useTextScale();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const placed = useRef(false);

  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  // Each option's share of the track, inside its padding
  const optionWidth = width > 0 ? (width - PADDING * 2) / options.length : 0;

  useEffect(() => {
    if (!optionWidth) return;
    const target = index * optionWidth;
    // The first time, and with reduced motion, the chip is put in place
    if (!placed.current || reduced) {
      x.value = target;
      placed.current = true;
      return;
    }
    x.value = withTiming(target, {
      duration: motion.duration.switch,
      easing: Easing.bezier(...motion.easing.standard),
    });
  }, [index, optionWidth, reduced, x]);

  const chip = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.track, large && styles.trackStacked, style]}
    >
      {!large && optionWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          testID={testID ? `${testID}-chip` : undefined}
          style={[styles.chip, { width: optionWidth }, chip]}
        />
      )}

      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => !selected && onChange(option.value)}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            testID={testID ? `${testID}-${option.value}` : undefined}
            // 40 px high on the board, inside a 2 px padding: 44 px to touch
            hitSlop={{ top: PADDING, bottom: PADDING }}
            style={[
              styles.option,
              large && styles.optionStacked,
              large && selected && styles.optionChosen,
            ]}
          >
            <Text
              numberOfLines={large ? undefined : 1}
              style={[styles.label, large && styles.labelStacked, selected && styles.labelSelected]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  track: {
    flexDirection: "row",
    padding: PADDING,
    borderRadius: 10,
    backgroundColor: colors.hairline,
  },
  trackStacked: { flexDirection: "column", gap: PADDING },
  chip: {
    position: "absolute",
    top: PADDING,
    left: PADDING,
    height: OPTION_HEIGHT,
    borderRadius: 8,
    backgroundColor: colors.raised,
  },
  option: {
    flex: 1,
    height: OPTION_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  // One row each: as tall as its text needs, and never less than a row of the track
  optionStacked: { flex: 0, height: undefined, minHeight: OPTION_HEIGHT, paddingVertical: 8, paddingHorizontal: 12 },
  optionChosen: { backgroundColor: colors.raised },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink2 },
  labelStacked: { textAlign: "center" },
  labelSelected: { fontFamily: fonts.bold, color: colors.ink },
}));

export default Segmented;
