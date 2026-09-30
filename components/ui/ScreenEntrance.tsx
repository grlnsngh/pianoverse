import React, { useEffect } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { motion } from "@/constants/theme";
import useReducedMotion from "@/lib/useReducedMotion";

export type ScreenEntranceProps = {
  /**
   * `grow`: fades in while growing from 96% to full size, like a card opening
   * into a page. `rise`: fades in while rising 24 px, a little later, like the
   * bar that slides up once the page is there.
   */
  mode: "grow" | "rise";
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const GROW_FROM = 0.96;
const RISE_DELAY = 160;

/**
 * How a piano's page appears (the Motion board's "open a piano"). The board
 * grows the photo card into the hero, which isn't practical across two
 * screens on expo-router 3.5, so the page itself fades in over 240 ms and
 * grows slightly, and its bar rises after it. With reduced motion everything
 * only fades, over 120 ms.
 */
const ScreenEntrance = ({ mode, children, style, testID }: ScreenEntranceProps) => {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    const animation = withTiming(1, {
      duration: reduced ? motion.duration.reducedFade : motion.duration.addStep,
      easing: Easing.bezier(...motion.easing.standard),
    });
    progress.value = mode === "rise" && !reduced ? withDelay(RISE_DELAY, animation) : animation;
    // Once, when the page appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animated = useAnimatedStyle(() => {
    if (reduced) return { opacity: progress.value };
    return mode === "grow"
      ? {
          opacity: progress.value,
          transform: [{ scale: GROW_FROM + (1 - GROW_FROM) * progress.value }],
        }
      : {
          opacity: progress.value,
          transform: [{ translateY: (1 - progress.value) * motion.addStepOffset }],
        };
  });

  return (
    <Animated.View style={[style, animated]} testID={testID}>
      {children}
    </Animated.View>
  );
};

export default ScreenEntrance;
