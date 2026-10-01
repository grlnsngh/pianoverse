import React, { useEffect } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import useReducedMotion from "@/lib/useReducedMotion";
import { motion } from "@/constants/theme";
import { useColors } from "@/lib/ThemeContext";

export type SpinnerProps = {
  /** 16 in a small button, 18 in a button, 24 inline, 40 on a screen */
  size?: number;
  /** The turning arc */
  color?: string;
  /** The ring the arc runs on */
  trackColor?: string;
  /**
   * Leave the spinner out of the screen reader. Use it where the words beside
   * it already say what is happening, such as the label of a busy button.
   */
  decorative?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A ring with a quarter of it turning. With reduced motion it stays still, so
 * it still shows that something is loading.
 */
const Spinner = ({
  size = 24,
  color,
  trackColor,
  decorative = false,
  accessibilityLabel = "Loading",
  style,
  testID,
}: SpinnerProps) => {
  const colors = useColors();
  const reduced = useReducedMotion();
  const turn = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(turn);
      turn.value = 0;
      return;
    }
    turn.value = 0;
    turn.value = withRepeat(
      withTiming(1, { duration: motion.duration.spinnerTurn, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(turn);
  }, [reduced, turn]);

  const spin = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 360}deg` }],
  }));

  // A thinner ring looks right on a big spinner
  const strokeWidth = size >= 40 ? 2.4 : 3;

  return (
    <Animated.View
      style={[{ width: size, height: size }, spin, style]}
      testID={testID}
      {...(decorative
        ? {
            accessibilityElementsHidden: true,
            importantForAccessibility: "no-hide-descendants",
          }
        : {
            accessible: true,
            accessibilityRole: "progressbar",
            accessibilityLabel,
            accessibilityState: { busy: true },
          })}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle
          cx={12}
          cy={12}
          r={9}
          stroke={trackColor ?? colors.hairline}
          strokeWidth={strokeWidth}
        />
        <Path
          d="M21 12a9 9 0 0 0-9-9"
          stroke={color ?? colors.ink}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
};

export default React.memo(Spinner);
