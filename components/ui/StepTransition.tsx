import React, { useEffect, useRef } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { motion } from "@/constants/theme";
import useReducedMotion from "@/lib/useReducedMotion";

export type StepTransitionProps = {
  /** Which step is showing. A higher number than before slides in from the right, a lower one from the left. */
  step: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Wraps what a step shows. When the step changes, the new content slides in
 * 24 px from the side it is coming from while it fades in, over 240 ms (the
 * Motion board's "add step change"). With reduced motion it only fades, over
 * 120 ms. The content is already the new step's when it starts.
 */
const StepTransition = ({ step, children, style, testID }: StepTransitionProps) => {
  const reduced = useReducedMotion();
  const progress = useSharedValue(1);
  // 1 slides in from the right (going forward), -1 from the left (going back)
  const direction = useSharedValue(1);
  const previous = useRef(step);

  useEffect(() => {
    if (previous.current === step) return;
    direction.value = step > previous.current ? 1 : -1;
    previous.current = step;
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: reduced ? motion.duration.reducedFade : motion.duration.addStep,
      easing: Easing.bezier(...motion.easing.standard),
    });
  }, [step, reduced, progress, direction]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: reduced
      ? []
      : [{ translateX: (1 - progress.value) * motion.addStepOffset * direction.value }],
  }));

  return (
    <Animated.View style={[style, animated]} testID={testID}>
      {children}
    </Animated.View>
  );
};

export default StepTransition;
