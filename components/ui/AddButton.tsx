import React from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { colors, motion } from "@/constants/theme";
import Icon from "./Icon";

const SIZE = 44;
const ICON_SIZE = 22;

export type AddButtonProps = {
  onPress: () => void;
  /** What it adds. "Add piano" by default. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The orange + at the top right of Today and Pianos. It opens the Add flow.
 * A 44 px circle, which is also the smallest a tap target should be.
 */
const AddButton = ({
  onPress,
  accessibilityLabel = "Add piano",
  style,
  testID,
}: AddButtonProps) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    testID={testID}
    style={({ pressed }) => [
      styles.button,
      pressed && {
        backgroundColor: colors.brandPressed,
        transform: [{ scale: motion.pressedScale }],
      },
      style,
    ]}
  >
    <Icon name="plus" size={ICON_SIZE} color={colors.ink} strokeWidth={2.2} />
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
  },
});

export default React.memo(AddButton);
