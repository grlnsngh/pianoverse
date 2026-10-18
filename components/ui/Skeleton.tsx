import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  DimensionValue,
  Easing,
  LayoutChangeEvent,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import useReducedMotion from "@/lib/useReducedMotion";
import { motion } from "@/constants/theme";
import { useColors } from "@/lib/ThemeContext";

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
 *
 * The band moves with React Native's own Animated on the native driver, not
 * Reanimated (Batch 50, O2). Reanimated 4.5 keeps the last frame of a running
 * animation queued after its view is gone and applies the queue again each time
 * a drawing (react-native-svg) is drawn, logging an error with a long stack
 * trace for every gone view each time. When Today's and Pianos' skeletons gave
 * way to 166 pianos full of drawn icons, that was 3,600 errors and 470,000 log
 * lines on the main thread, and the app answered no tap for five seconds.
 * Reanimated 4.7.1 fixes it (#10435); this one never enters that queue.
 */
const Skeleton = ({
  width,
  height,
  radius = 8,
  style,
  testID,
}: SkeletonProps) => {
  const colors = useColors();
  const reduced = useReducedMotion();
  const [measured, setMeasured] = useState(0);
  // 0 to 1 across one sweep
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    sweep.setValue(0);
    if (reduced || measured === 0) return;
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: motion.duration.shimmer,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, measured, sweep]);

  // The band is as wide as the shape and moves from just off the left edge to
  // just off the right
  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-measured, measured] });

  return (
    <View
      testID={testID}
      onLayout={(event: LayoutChangeEvent) => setMeasured(event.nativeEvent.layout.width)}
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
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: measured,
            transform: [{ translateX }],
          }}
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
