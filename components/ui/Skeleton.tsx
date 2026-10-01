import React, { useEffect, useState } from "react";
import {
  DimensionValue,
  LayoutChangeEvent,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import useReducedMotion from "@/lib/useReducedMotion";
import { colors, motion } from "@/constants/theme";

/**
 * Whether to show a skeleton for something that is loading. False for the
 * first 200 ms, so a quick load shows nothing and never flashes a placeholder,
 * and false again as soon as loading ends.
 */
export const useSkeletonDelay = (
  loading: boolean,
  delay: number = motion.duration.skeletonDelay
) => {
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    if (!loading) {
      setWaited(false);
      return;
    }
    const timer = setTimeout(() => setWaited(true), delay);
    return () => clearTimeout(timer);
  }, [loading, delay]);

  return loading && waited;
};

export type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  /** Corner radius. Give it half the height for a pill, or the size for a circle. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A grey placeholder shape with a light band sweeping across it once every
 * 1.5 s. Give it the size and radius of the real content so nothing jumps when
 * the content arrives. With reduced motion it is a plain grey shape.
 */
const Skeleton = ({
  width,
  height,
  radius = 8,
  style,
  testID,
}: SkeletonProps) => {
  const reduced = useReducedMotion();
  const [measured, setMeasured] = useState(0);
  // The width also lives in a shared value, so the animated style below reads
  // the current width rather than one captured when it was created
  const bandWidth = useSharedValue(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (reduced || measured === 0) {
      cancelAnimation(sweep);
      sweep.value = 0;
      return;
    }
    sweep.value = 0;
    sweep.value = withRepeat(
      withTiming(1, { duration: motion.duration.shimmer, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(sweep);
  }, [reduced, measured, sweep]);

  // The band is as wide as the shape and moves from just off the left edge to
  // just off the right
  const band = useAnimatedStyle(() => ({
    transform: [
      { translateX: -bandWidth.value + sweep.value * 2 * bandWidth.value },
    ],
  }));

  return (
    <View
      testID={testID}
      onLayout={(event: LayoutChangeEvent) => {
        const measuredWidth = event.nativeEvent.layout.width;
        bandWidth.value = measuredWidth;
        setMeasured(measuredWidth);
      }}
      // Decoration: the screen says it is loading, not each grey shape
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.skeletonBase,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {!reduced && measured > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", top: 0, bottom: 0, left: 0, width: measured },
            band,
          ]}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={colors.skeletonBase} />
                <Stop offset="0.5" stopColor={colors.skeletonHighlight} />
                <Stop offset="1" stopColor={colors.skeletonBase} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#shimmer)" />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
};

export default React.memo(Skeleton);
