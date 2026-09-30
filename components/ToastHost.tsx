import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/ui";
import { colors, fonts, motion, radii, spacing, type } from "@/constants/theme";
import useReducedMotion from "@/lib/useReducedMotion";
import { setToastListener, ToastDetails } from "@/utils/toast";

const HOLD_MS = {
  short: motion.duration.toastHold,
  long: motion.duration.toastHoldLong,
};

const ICON_SIZE = 22;
const CHECK_SIZE = 13;
/** Distance from the bottom of the screen, above the tab bar */
const ABOVE_TAB_BAR = 96;

type ActiveToast = ToastDetails & { id: number; message: string };

const standard = Easing.bezier(...motion.easing.decelerate);
const leaving = Easing.bezier(...motion.easing.accelerate);

/**
 * Draws the toasts from showToast(): an ink pill at the bottom of the screen
 * that rises in over 220 ms, stays for 3 s and sinks out over 180 ms. With
 * reduced motion it only fades, over 120 ms.
 */
const ToastHost = () => {
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const offset = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  const dismiss = useRef<() => void>(() => {});

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let latest = 0;

    const hide = (id: number) => {
      clearTimeout(hideTimer);
      const fade = reducedRef.current;
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: fade ? motion.duration.reducedFade : motion.duration.toastOut,
          easing: leaving,
          useNativeDriver: true,
        }),
        Animated.timing(offset, {
          toValue: fade ? 0 : motion.toastDrop,
          duration: motion.duration.toastOut,
          easing: leaving,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        // A newer toast may have replaced this one while it was fading
        if (finished && latest === id) setToast(null);
      });
    };

    setToastListener((message, duration, details) => {
      clearTimeout(hideTimer);
      const id = ++latest;
      const fade = reducedRef.current;
      setToast({ id, message, ...details });

      opacity.stopAnimation();
      offset.stopAnimation();
      opacity.setValue(0);
      offset.setValue(fade ? 0 : motion.toastRise);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: fade ? motion.duration.reducedFade : motion.duration.toastIn,
          easing: standard,
          useNativeDriver: true,
        }),
        Animated.timing(offset, {
          toValue: 0,
          duration: motion.duration.toastIn,
          easing: standard,
          useNativeDriver: true,
        }),
      ]).start();

      hideTimer = setTimeout(
        () => hide(id),
        motion.duration.toastIn + HOLD_MS[duration]
      );
    });
    dismiss.current = () => hide(latest);

    return () => {
      setToastListener(null);
      clearTimeout(hideTimer);
    };
  }, [opacity, offset]);

  if (!toast) return null;

  const { message, variant, action } = toast;

  return (
    <Animated.View
      // A toast without a button lets touches through to the screen behind it
      pointerEvents={action ? "box-none" : "none"}
      accessibilityLiveRegion="polite"
      accessibilityRole={variant === "error" ? "alert" : undefined}
      style={[
        styles.position,
        { bottom: insets.bottom + ABOVE_TAB_BAR, opacity, transform: [{ translateY: offset }] },
      ]}
    >
      <View style={styles.toast}>
        {variant === "success" && (
          <View style={styles.check}>
            <Icon name="check" size={CHECK_SIZE} color={colors.ink} strokeWidth={3.2} />
          </View>
        )}
        {variant === "error" && (
          <Icon name="alert" size={ICON_SIZE} color={colors.lateOnInk} strokeWidth={2} />
        )}
        <Text style={styles.text}>{message}</Text>
        {action && (
          <Pressable
            onPress={() => {
              dismiss.current();
              action.onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={styles.action}
          >
            <Text style={styles.actionText}>{action.label}</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  position: {
    position: "absolute",
    left: spacing.screen,
    right: spacing.screen,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radii.control,
    backgroundColor: colors.ink,
  },
  check: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
  },
  text: { ...type.status, flexGrow: 1, flexShrink: 1, color: colors.white },
  action: {
    minHeight: spacing.minTarget,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  actionText: {
    ...type.status,
    fontFamily: fonts.bold,
    color: colors.brandOnInk,
  },
});

export default ToastHost;
