import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { BrandMark, KeysLoader } from "@/components/ui";
import { fonts, motion } from "@/constants/theme";
import useReducedMotion from "@/lib/useReducedMotion";
import { makeStyles, useColors } from "@/lib/ThemeContext";

/** The logo starts this much smaller and grows to full size as it fades in */
const START_SCALE = 0.88;

/**
 * The orange screen shown while the app finds out who is signed in (Splash
 * board): the logo tile and the name pop in, and the keys loader runs under
 * them. The phone's own splash screen, in the same orange, covers the start
 * before this. With reduced motion the logo is simply there.
 */
const Splash = () => {
  const styles = useStyles();
  const colors = useColors();
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    progress.value = reduced
      ? 1
      : withTiming(1, {
          duration: motion.duration.splashPop,
          easing: Easing.bezier(...motion.easing.standard),
        });
  }, [reduced, progress]);

  const pop = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: START_SCALE + (1 - START_SCALE) * progress.value }],
  }));

  return (
    <View style={styles.screen} testID="splash" accessibilityLabel="Pianoverse is loading">
      <Animated.View style={[styles.logo, pop]}>
        <BrandMark size={104} />
        <Text style={styles.name}>Pianoverse</Text>
      </Animated.View>

      <View style={styles.loader}>
        <KeysLoader size={32} color={colors.onBrand} accent={null} accessibilityLabel="Loading" />
      </View>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
  },
  // A little above the middle, as on the board
  logo: { alignItems: "center", marginTop: -40 },
  name: {
    marginTop: 20,
    fontFamily: fonts.bold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.85,
    color: colors.onBrand,
  },
  // 172 above the bottom of the board's 844 px screen
  loader: { position: "absolute", left: 0, right: 0, bottom: 172, alignItems: "center" },
}));

export default Splash;
