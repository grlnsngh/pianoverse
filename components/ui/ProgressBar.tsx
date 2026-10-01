import React, { useEffect } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import useReducedMotion from "@/lib/useReducedMotion";
import { makeStyles } from "@/lib/ThemeContext";

export type ProgressBarProps = {
  /** How far along, from 0 to 1 */
  progress: number;
  /** What the bar measures, read out with the percentage: "Uploading" */
  accessibilityLabel: string;
  /** Width and position. The bar is 6 high and 240 wide unless told otherwise. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const HEIGHT = 6;
const DEFAULT_WIDTH = 240;
const GROW_MS = 300;

/**
 * A bar of known length (Publishing board): a light track with an orange fill
 * that grows to the progress. With reduced motion the fill jumps.
 */
const ProgressBar = ({
  progress,
  accessibilityLabel,
  style,
  testID,
}: ProgressBarProps) => {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const clamped = Math.min(1, Math.max(0, progress));
  const filled = useSharedValue(clamped);

  useEffect(() => {
    filled.value = reduced
      ? clamped
      : withTiming(clamped, { duration: GROW_MS, easing: Easing.out(Easing.quad) });
  }, [clamped, reduced, filled]);

  const fill = useAnimatedStyle(() => ({ width: `${filled.value * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      testID={testID}
      style={[styles.track, style]}
    >
      <Animated.View style={[styles.fill, fill]} />
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  track: {
    width: DEFAULT_WIDTH,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    overflow: "hidden",
    backgroundColor: colors.fill,
  },
  fill: {
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    backgroundColor: colors.brand,
  },
}));

export default ProgressBar;
