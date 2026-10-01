import React, { useEffect } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import useReducedMotion from "@/lib/useReducedMotion";
import { motion } from "@/constants/theme";
import { makeStyles, useColors } from "@/lib/ThemeContext";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Length of the check's stroke, so it can be drawn in by moving a dash along it */
const CHECK_LENGTH = 20;
const SIZE = 96;

export type SuccessMarkProps = {
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The orange circle with an ink check that says a piano was added (Published
 * board). The circle pops in (from 60% to 108% and settling at 100%) while the
 * check is drawn. With reduced motion it simply appears.
 */
const SuccessMark = ({ style, testID }: SuccessMarkProps) => {
  const colors = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const pop = useSharedValue(reduced ? 1 : 0);
  const draw = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      pop.value = 1;
      draw.value = 1;
      return;
    }
    pop.value = withSequence(
      withTiming(1.08, { duration: motion.duration.checkPop * 0.6, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: motion.duration.checkPop * 0.4 })
    );
    draw.value = withTiming(1, {
      duration: motion.duration.checkDraw,
      easing: Easing.out(Easing.quad),
    });
  }, [reduced, pop, draw]);

  const circle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.6),
    transform: [{ scale: 0.6 + Math.min(pop.value, 1.08) * 0.4 }],
  }));
  const stroke = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - draw.value),
  }));

  return (
    <Animated.View
      style={[styles.circle, circle, style]}
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Success"
    >
      <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
        <AnimatedPath
          d="m5 12.5 4.5 4.5L19 7.5"
          stroke={colors.onBrand}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={CHECK_LENGTH}
          animatedProps={stroke}
        />
      </Svg>
    </Animated.View>
  );
};

const useStyles = makeStyles((colors) => ({
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
  },
}));

export default SuccessMark;
