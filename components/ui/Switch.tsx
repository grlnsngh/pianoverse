import React, { useEffect } from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import useReducedMotion from "@/lib/useReducedMotion";
import { motion } from "@/constants/theme";
import { makeStyles, useColors } from "@/lib/ThemeContext";

const WIDTH = 51;
const HEIGHT = 31;
const PADDING = 2;
const THUMB = 27;
/** How far the thumb travels from the left end to the right end */
const TRAVEL = WIDTH - PADDING * 2 - THUMB;

export type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Says what the switch controls. A switch has no visible label of its own. */
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * An on/off switch, 51 x 31. Orange when on. The thumb slides in 200 ms; with
 * reduced motion it jumps and only the colour fades, over 120 ms.
 */
const Switch = ({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
  style,
  testID,
}: SwitchProps) => {
  const colors = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  // 0 is off, 1 is on. Starts where it should be, so it doesn't animate on mount.
  const position = useSharedValue(value ? 1 : 0);
  const fade = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    const target = value ? 1 : 0;
    const easing = Easing.bezier(...motion.easing.standard);
    position.value = withTiming(target, {
      duration: reduced ? 0 : motion.duration.switch,
      easing,
    });
    fade.value = withTiming(target, {
      duration: reduced ? motion.duration.reducedFade : motion.duration.switch,
      easing,
    });
  }, [value, reduced, position, fade]);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      fade.value,
      [0, 1],
      [colors.switchOff, colors.brand]
    ),
  }));
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value * TRAVEL }],
  }));

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      // The switch is 31 high; the tap area is at least 44
      hitSlop={{ top: 7, bottom: 7, left: 4, right: 4 }}
      testID={testID}
      style={[disabled && styles.disabled, style]}
    >
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.thumb, thumb]} />
      </Animated.View>
    </Pressable>
  );
};

const useStyles = makeStyles((colors) => ({
  track: {
    width: WIDTH,
    height: HEIGHT,
    padding: PADDING,
    borderRadius: HEIGHT / 2,
    justifyContent: "center",
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.white,
  },
  disabled: { opacity: 0.4 },
}));

export default React.memo(Switch);
