import { router } from "expo-router";
import React from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect } from "react-native-svg";
import { BrandMark, Button } from "@/components/ui";
import { fonts, spacing, type } from "@/constants/theme";
import { makeStyles, useColors } from "@/lib/ThemeContext";

// The board's 390 x 468 orange top: a keyboard running off the left, right and bottom
const HERO_WIDTH = 390;
const HERO_HEIGHT = 468;
const SHADE = "#E88A00";
const WHITE_KEY = "#FFF1D6";
const PRESSED_KEY = "#FFD98A";
const WHITE_KEYS = [-22, 40, 102, 164, 226, 288, 350];
const BLACK_KEYS = [20, 82, 206, 268, 330];

// Sits on the bottom edge of the orange top, so the keys always run off it
const Keyboard = ({ height }: { height: number }) => {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={[styles.keyboard, { height }]} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${HERO_WIDTH} ${HERO_HEIGHT}`}
        preserveAspectRatio="xMidYMax slice"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Rect x={0} y={146} width={390} height={14} fill={SHADE} />
        {WHITE_KEYS.map((x) => {
          // One key is pressed: a little lower, and darker
          const pressed = x === 164;
          return (
            <Rect
              key={x}
              x={x}
              y={pressed ? 172 : 160}
              width={56}
              height={330}
              rx={10}
              fill={pressed ? PRESSED_KEY : WHITE_KEY}
            />
          );
        })}
        {BLACK_KEYS.map((x) => (
          <React.Fragment key={x}>
            <Rect
              x={x}
              y={160}
              width={34}
              height={236}
              rx={8}
              fill={colors.onBrand}
            />
            <Rect
              x={x + 5}
              y={166}
              width={6}
              height={196}
              rx={3}
              fill={colors.white}
              fillOpacity={0.1}
            />
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
};

/**
 * The first screen when nobody is signed in (Welcome board): an orange top
 * with the logo and a keyboard, what the app is for, and the two ways in.
 */
const WelcomeScreen = () => {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // The board's height, plus the status bar; shorter phones give some of it back
  const heroHeight = Math.min(HERO_HEIGHT + insets.top, windowHeight * 0.52);

  return (
    <View style={styles.screen} testID="welcome">
      <View style={[styles.hero, { height: heroHeight }]}>
        <Keyboard height={Math.min(HERO_HEIGHT, heroHeight)} />
        <View style={[styles.brand, { top: insets.top + spacing.lg }]}>
          <BrandMark size={40} />
          <Text style={styles.brandName}>Pianoverse</Text>
        </View>
      </View>

      <View style={styles.text}>
        <Text style={styles.headline} accessibilityRole="header">
          Every piano, every rental, in one place.
        </Text>
        <Text style={styles.subtitle}>
          Know who has each piano and never miss a payment.
        </Text>
      </View>

      <View
        style={[
          styles.buttons,
          { paddingBottom: Math.max(insets.bottom - 6, spacing.lg) },
        ]}
      >
        <Button title="Sign in" onPress={() => router.push("/sign-in")} />
        <Button
          title="Create account"
          variant="secondary"
          onPress={() => router.push("/sign-up")}
        />
      </View>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surface },
  hero: {
    overflow: "hidden",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    backgroundColor: colors.brand,
  },
  keyboard: { position: "absolute", left: 0, right: 0, bottom: 0 },
  brand: {
    position: "absolute",
    left: spacing.xxl,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandName: {
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: -0.44,
    color: colors.onBrand,
  },
  text: { paddingTop: 28, paddingHorizontal: spacing.xxl },
  headline: { ...type.largeTitle, color: colors.ink },
  subtitle: { marginTop: 10, ...type.body, color: colors.ink2 },
  buttons: {
    marginTop: "auto",
    gap: 10,
    paddingHorizontal: spacing.xxl,
  },
}));

export default WelcomeScreen;
