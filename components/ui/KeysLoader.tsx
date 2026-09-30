import React, { useEffect } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import useReducedMotion from "@/lib/useReducedMotion";
import { colors, motion } from "@/constants/theme";

/** Bar height in px, with the width, gap and corner radius that go with it. */
const SIZES = {
  /** On the splash screen */
  32: { width: 8, gap: 6, radius: 4 },
  /** In the States and feedback board */
  40: { width: 8, gap: 5, radius: 4 },
  /** While a piano is being published */
  56: { width: 12, gap: 8, radius: 6 },
} as const;

export type KeysLoaderSize = keyof typeof SIZES;

const BARS = 5;
const CENTRE = 2;
/** The bars are drawn at their smallest scale, and grow to full height */
const MIN_SCALE = 0.4;
const HALF_LOOP_MS = motion.duration.keysLoop / 2;

export type KeysLoaderProps = {
  size?: KeysLoaderSize;
  /** Colour of the bars */
  color?: string;
  /** Colour of the middle bar. `null` makes all five the same. Default brand. */
  accent?: string | null;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

type KeyProps = {
  index: number;
  height: number;
  width: number;
  radius: number;
  color: string;
  animate: boolean;
};

const Key = ({ index, height, width, radius, color, animate }: KeyProps) => {
  // 0 is the smallest bar, 1 the full height
  const grow = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) {
      cancelAnimation(grow);
      grow.value = 1;
      return;
    }
    grow.value = 0;
    grow.value = withDelay(
      index * motion.duration.keysStagger,
      withRepeat(
        withSequence(
          withTiming(1, { duration: HALF_LOOP_MS, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: HALF_LOOP_MS, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
    return () => cancelAnimation(grow);
  }, [animate, index, grow]);

  const style = useAnimatedStyle(() => {
    const scale = MIN_SCALE + (1 - MIN_SCALE) * grow.value;
    // Scaling happens around the middle, so nudge the bar down to keep its foot on the line
    return {
      transform: [{ translateY: (height * (1 - scale)) / 2 }, { scaleY: scale }],
    };
  });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: color },
        style,
      ]}
    />
  );
};

/**
 * Five bars that rise and fall in turn, like piano keys. For a wait that fills
 * the screen; use a spinner inside a button and a skeleton for content. With
 * reduced motion the bars stand still at full height.
 */
const KeysLoader = ({
  size = 40,
  color = colors.ink,
  accent = colors.brand,
  accessibilityLabel = "Loading",
  style,
  testID,
}: KeysLoaderProps) => {
  const reduced = useReducedMotion();
  const { width, gap, radius } = SIZES[size];

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
      testID={testID}
      style={[styles.row, { height: size, gap }, style]}
    >
      {Array.from({ length: BARS }, (_, index) => (
        <Key
          key={index}
          index={index}
          height={size}
          width={width}
          radius={radius}
          color={index === CENTRE && accent ? accent : color}
          animate={!reduced}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center" },
});

export default React.memo(KeysLoader);
