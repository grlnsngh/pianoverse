import React, { useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import Icon from "@/components/ui/Icon";
import {
  bottomBar,
  fonts,
  motion,
  radii,
  spacing,
  type,
} from "@/constants/theme";
import useReducedMotion from "@/lib/useReducedMotion";
import { addToastListener, setToastListener, ToastDetails, ToastListener } from "@/utils/toast";
import { makeStyles, useColors } from "@/lib/ThemeContext";

const HOLD_MS = {
  short: motion.duration.toastHold,
  long: motion.duration.toastHoldLong,
};

const ICON_SIZE = 22;
const CHECK_SIZE = 13;

type ActiveToast = ToastDetails & { id: number; message: string };

const standard = Easing.bezier(...motion.easing.decelerate);
const leaving = Easing.bezier(...motion.easing.accelerate);

export type ToastHostProps = {
  /**
   * The host of a sheet or a dialog. Those are modals and draw above the root
   * host, so a toast would be hidden behind them: each carries its own.
   */
  embedded?: boolean;
  /** How far above the bottom of the screen the toast sits. Defaults to above the bar. */
  bottomOffset?: number;
};

/**
 * Draws the toasts from showToast(): an ink pill at the bottom of the screen
 * that rises in over 220 ms, stays for 3 s and sinks out over 180 ms. With
 * reduced motion it only fades, over 120 ms. The same on every platform, and
 * above sheets and dialogs too.
 */
const ToastHost = ({ embedded = false, bottomOffset }: ToastHostProps) => {
  const colors = useColors();
  const styles = useStyles();
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const offset = useRef(new Animated.Value(0)).current;
  // (A dialog can be drawn with no safe area around it, as in a test: no inset then)
  const insets = useContext(SafeAreaInsetsContext) ?? { bottom: 0 };
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  const dismiss = useRef<() => void>(() => {});

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let latest = 0;
    let stopListening: () => void = () => {};

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

    const show: ToastListener = (message, duration, details) => {
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
    };
    if (embedded) {
      stopListening = addToastListener(show);
    } else {
      setToastListener(show);
      stopListening = () => setToastListener(null);
    }
    dismiss.current = () => hide(latest);

    return () => {
      stopListening();
      clearTimeout(hideTimer);
    };
  }, [opacity, offset, embedded]);

  if (!toast) return null;

  const { message, variant, action } = toast;
  // 12 px above the tab bar, or the sticky action bar on a piano's page
  const aboveBottomBar =
    Math.max(insets.bottom, bottomBar.minInset) +
    bottomBar.content +
    bottomBar.toastGap;

  return (
    <Animated.View
      // A toast without a button lets touches through to the screen behind it
      pointerEvents={action ? "box-none" : "none"}
      accessibilityLiveRegion="polite"
      accessibilityRole={variant === "error" ? "alert" : undefined}
      style={[
        styles.position,
        { bottom: bottomOffset ?? aboveBottomBar, opacity, transform: [{ translateY: offset }] },
      ]}
    >
      <View style={styles.toast}>
        {variant === "success" && (
          <View style={styles.check}>
            <Icon name="check" size={CHECK_SIZE} color={colors.onBrand} strokeWidth={3.2} />
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

const useStyles = makeStyles((colors) => ({
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
  text: { ...type.status, flexGrow: 1, flexShrink: 1, color: colors.onInk },
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
}));

export default ToastHost;
