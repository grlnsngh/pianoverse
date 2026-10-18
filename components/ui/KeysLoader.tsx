import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import useReducedMotion from "@/lib/useReducedMotion";
import { motion } from "@/constants/theme";
import { useColors } from "@/lib/ThemeContext";

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

// The bars move with React Native's own Animated on the native driver, not
// Reanimated: the splash shows them as the app starts, and a Reanimated loop
// left a queue behind when they went (see Skeleton.tsx, Batch 50)
const Key = ({ index, height, width, radius, color, animate }: KeyProps) => {
  // 0 is the smallest bar, 1 the full height
  const grow = useRef(new Animated.Value(animate ? 0 : 1)).current;

  useEffect(() => {
    if (!animate) {
      grow.setValue(1);
      return;
    }
    grow.setValue(0);
    const half = (toValue: number) =>
      Animated.timing(grow, {
        toValue,
        duration: HALF_LOOP_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });
    const loop = Animated.loop(Animated.sequence([half(1), half(0)]));
    // Each bar starts a little after the one before, so they ripple
    const start = setTimeout(() => loop.start(), index * motion.duration.keysStagger);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, [animate, index, grow]);

  // Scaling happens around the middle, so the bar moves down as it shrinks to keep its foot on the line
  const style = {
    transform: [
      { translateY: grow.interpolate({ inputRange: [0, 1], outputRange: [(height * (1 - MIN_SCALE)) / 2, 0] }) },
      { scaleY: grow.interpolate({ inputRange: [0, 1], outputRange: [MIN_SCALE, 1] }) },
    ],
  };

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
  color,
  accent,
  accessibilityLabel = "Loading",
  style,
  testID,
}: KeysLoaderProps) => {
  const colors = useColors();
  const reduced = useReducedMotion();
  const { width, gap, radius } = SIZES[size];
  const barColor = color ?? colors.ink;
  const accentColor = accent === undefined ? colors.brand : accent;

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
          color={index === CENTRE && accentColor ? accentColor : barColor}
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
