import React, { useEffect, useState } from "react";
import { Platform, RefreshControlProps, StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Spinner } from "@/components/ui";
import { motion } from "@/constants/theme";
import useReducedMotion from "@/lib/useReducedMotion";
import { useColors } from "@/lib/ThemeContext";

/** The board's band: 72 high, with a 28 px spinner in the middle */
const BAND = 72;
/** What iOS makes room for by itself above a list that is being refreshed */
const IOS_GAP = 60;

/**
 * The phone's own pull-to-refresh still does the pulling, but draws nothing:
 * its spinner is made invisible here, and the RefreshPianos board's band is
 * shown instead. Spread these on the list's `RefreshControl`.
 */
export const HIDDEN_REFRESH_INDICATOR: Pick<
  RefreshControlProps,
  "tintColor" | "colors" | "progressBackgroundColor" | "progressViewOffset"
> = {
  // iOS draws its spinner in the tint colour
  tintColor: "transparent",
  // Android draws a disc with coloured arcs; make both clear, and park it off screen
  colors: ["transparent"],
  progressBackgroundColor: "transparent",
  progressViewOffset: -200,
};

type RefreshBandProps = {
  /** Shown while this is true */
  refreshing: boolean;
};

/**
 * The band that says a list is being refreshed (RefreshPianos board): 72 px
 * under the tabs with an ink spinner, used on the Pianos tab and on Today.
 * Put it first in the list's content. On Android it opens up and pushes the
 * list down; on iOS the phone has already made room above the list, so it sits
 * in that room. With reduced motion it fades and does not move the list.
 */
const RefreshBand = ({ refreshing }: RefreshBandProps) => {
  const colors = useColors();
  const reduced = useReducedMotion();
  const progress = useSharedValue(refreshing ? 1 : 0);
  // The spinner stays until the band has faded away
  const [mounted, setMounted] = useState(refreshing);

  useEffect(() => {
    progress.value = withTiming(refreshing ? 1 : 0, {
      duration: reduced ? motion.duration.reducedFade : motion.duration.switch,
      easing: Easing.bezier(...motion.easing.standard),
    });
    if (refreshing) {
      setMounted(true);
      return;
    }
    const timer = setTimeout(() => setMounted(false), motion.duration.switch + 20);
    return () => clearTimeout(timer);
  }, [refreshing, reduced, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    // Android: the band opens to 72; with reduced motion it is 72 at once
    ...(Platform.OS === "android"
      ? { height: reduced ? (progress.value > 0 ? BAND : 0) : BAND * progress.value }
      : null),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[Platform.OS === "ios" ? styles.ios : styles.android, style]}
      testID="refresh-band"
    >
      {mounted && (
        <Spinner
          size={28}
          color={colors.ink}
          trackColor={colors.hairline}
          accessibilityLabel="Refreshing"
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  android: { overflow: "hidden", alignItems: "center", justifyContent: "center", height: 0 },
  // Above the content, in the gap iOS opens while it refreshes
  ios: {
    position: "absolute",
    top: -IOS_GAP,
    left: 0,
    right: 0,
    height: IOS_GAP,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default RefreshBand;
