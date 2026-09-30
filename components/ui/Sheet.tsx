import React, { useEffect, useRef, useState } from "react";
import {
  GestureResponderEvent,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useReducedMotion from "@/lib/useReducedMotion";
import { colors, motion, radii, spacing, type } from "@/constants/theme";

/** Dragging the header down further than this lets go of the sheet */
const DISMISS_DRAG = 100;
const SNAP_BACK_MS = 160;
const MAX_HEIGHT_SHARE = 0.92;

export type SheetProps = {
  visible: boolean;
  /** Called when the person leaves: the dim, the back button, a drag down or the left button */
  onClose: () => void;
  /** With a title the sheet has a header row: left button and centred title */
  title?: string;
  /** Text of the left button. "Cancel" by default; Filters uses "Reset". */
  leftLabel?: string;
  /** What the left button does. Leaves the sheet by default. */
  onLeftPress?: () => void;
  /** `grouped` for a sheet of form panels, `white` for a sheet of text */
  tone?: "grouped" | "white";
  /** Stays under the scrolling content: the one main button */
  footer?: React.ReactNode;
  children: React.ReactNode;
  testID?: string;
};

/**
 * A panel that rises from the bottom over a dimmed screen. It rises in 320 ms
 * while the dim fades in, leaves in 240 ms, and can be dragged down or closed
 * by tapping the dim. With reduced motion it only fades, over 120 ms.
 */
const Sheet = ({
  visible,
  onClose,
  title,
  leftLabel = "Cancel",
  onLeftPress,
  tone = "grouped",
  footer,
  children,
  testID,
}: SheetProps) => {
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  // The modal stays mounted while the sheet leaves
  const [mounted, setMounted] = useState(visible);
  // 0 is hidden, 1 is fully shown
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const sheetHeight = useSharedValue(windowHeight);
  const dragStartY = useRef<number | null>(null);
  const wasVisible = useRef(false);
  const visibleRef = useRef(visible);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    if (visible) {
      wasVisible.current = true;
      setMounted(true);
      drag.value = 0;
      progress.value = withTiming(1, {
        duration: reduced ? motion.duration.reducedFade : motion.duration.sheetIn,
        easing: Easing.bezier(...motion.easing.decelerate),
      });
    } else if (wasVisible.current) {
      progress.value = withTiming(
        0,
        {
          duration: reduced ? motion.duration.reducedFade : motion.duration.sheetOut,
          easing: Easing.bezier(...motion.easing.accelerate),
        },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        }
      );
    }
  }, [visible, reduced, progress, drag]);

  const dim = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheet = useAnimatedStyle(
    () =>
      reduced
        ? { opacity: progress.value, transform: [{ translateY: 0 }] }
        : {
            opacity: 1,
            transform: [
              { translateY: (1 - progress.value) * sheetHeight.value + drag.value },
            ],
          },
    // Named so the style follows the Reduce Motion setting when it changes
    [reduced]
  );

  const finishDrag = () => {
    if (dragStartY.current === null) return;
    dragStartY.current = null;
    if (drag.value > DISMISS_DRAG) {
      onClose();
      // The screen may decide to keep the sheet open, say to ask about unsaved
      // changes first. Then it must not stay pulled down.
      setTimeout(() => {
        if (visibleRef.current) drag.value = withTiming(0, { duration: SNAP_BACK_MS });
      }, 0);
    } else {
      drag.value = withTiming(0, { duration: SNAP_BACK_MS });
    }
  };

  const dragHandlers = {
    onTouchStart: (event: GestureResponderEvent) => {
      dragStartY.current = event.nativeEvent.pageY;
    },
    onTouchMove: (event: GestureResponderEvent) => {
      if (dragStartY.current === null) return;
      drag.value = Math.max(0, event.nativeEvent.pageY - dragStartY.current);
    },
    onTouchEnd: finishDrag,
    onTouchCancel: finishDrag,
  };

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.fill} testID={testID}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.dim, dim]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.bottom}
          pointerEvents="box-none"
        >
          <Animated.View
            accessibilityViewIsModal
            onLayout={(event) => {
              sheetHeight.value = event.nativeEvent.layout.height;
            }}
            style={[
              styles.sheet,
              {
                backgroundColor: tone === "grouped" ? colors.grouped : colors.white,
                maxHeight: windowHeight * MAX_HEIGHT_SHARE,
              },
              sheet,
            ]}
          >
            <View {...dragHandlers} testID="sheet-header">
              <View style={styles.grabber} />
              {title !== undefined && (
                <View style={styles.titleRow}>
                  <Pressable
                    onPress={onLeftPress ?? onClose}
                    accessibilityRole="button"
                    accessibilityLabel={leftLabel}
                    style={styles.left}
                  >
                    <Text style={styles.leftText}>{leftLabel}</Text>
                  </Pressable>
                  <Text style={styles.title} accessibilityRole="header">
                    {title}
                  </Text>
                </View>
              )}
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.content}
              contentContainerStyle={styles.contentInner}
            >
              {children}
            </ScrollView>

            {footer ? (
              <View
                testID="sheet-footer"
                style={[
                  styles.footer,
                  // 28 on an iPhone with a home indicator, 16 elsewhere
                  { paddingBottom: Math.max(insets.bottom - 6, spacing.lg) },
                ]}
              >
                {footer}
              </View>
            ) : (
              <View style={{ height: Math.max(insets.bottom, spacing.md) }} />
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  dim: { backgroundColor: colors.dim },
  bottom: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    overflow: "hidden",
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 8,
    backgroundColor: colors.grabber,
  },
  titleRow: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  left: {
    position: "absolute",
    left: 8,
    top: 4,
    height: spacing.minTarget,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  leftText: { ...type.bodyMedium, color: colors.ink },
  title: { ...type.sheetTitle, color: colors.ink },
  content: { flexShrink: 1 },
  contentInner: { paddingHorizontal: spacing.screen },
  footer: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.screen,
  },
});

export default Sheet;
