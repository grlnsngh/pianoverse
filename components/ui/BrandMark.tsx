import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import KeyboardMark from "./KeyboardMark";
import { makeStyles } from "@/lib/ThemeContext";

export type BrandMarkProps = {
  /** Width and height of the tile in px: 104 on the splash, 40 on the welcome screen */
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The Pianoverse mark: a rounded ink tile with a little piano keyboard on it
 * (Splash and Welcome boards). The keys are 65% of the tile wide, and the
 * corners are 29% of its size.
 */
const BrandMark = ({ size = 104, style, testID }: BrandMarkProps) => {
  const styles = useStyles();
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Pianoverse"
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: Math.round(size * 0.29) },
        style,
      ]}
    >
      <KeyboardMark width={Math.round(size * 0.65)} />
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  tile: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.onBrand,
  },
}));

export default BrandMark;
