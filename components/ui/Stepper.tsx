import React from "react";
import { Pressable, Text, View } from "react-native";
import { fonts, spacing } from "@/constants/theme";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import Icon from "./Icon";

const BUTTON = 44;

export type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** What is counted, in the plural, for the buttons' names: "cards" makes "Fewer cards" and "More cards" */
  unit: string;
  testID?: string;
};

/**
 * A number with a round minus and plus button either side (PaperFormDetail
 * board). A button greys out at the end of the range rather than disappearing,
 * so the number stays put.
 */
const Stepper = ({ value, onChange, min = 1, max = 99, unit, testID }: StepperProps) => {
  const colors = useColors();
  const styles = useStyles();
  const canLower = value > min;
  const canRaise = value < max;

  const button = (direction: "fewer" | "more") => {
    const enabled = direction === "fewer" ? canLower : canRaise;
    const label = `${direction === "fewer" ? "Fewer" : "More"} ${unit}`;
    return (
      <Pressable
        onPress={() => onChange(direction === "fewer" ? value - 1 : value + 1)}
        disabled={!enabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !enabled }}
        hitSlop={4}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Icon
          name={direction === "fewer" ? "minus" : "plus"}
          size={18}
          strokeWidth={2.4}
          color={enabled ? colors.ink : colors.disabledText}
        />
      </Pressable>
    );
  };

  return (
    <View style={styles.row} testID={testID}>
      {button("fewer")}
      <Text style={styles.value} accessibilityLiveRegion="polite" accessibilityLabel={`${value} ${unit}`}>
        {value}
      </Text>
      {button("more")}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.fillInput,
  },
  pressed: { backgroundColor: colors.fillPressed },
  value: {
    width: 36,
    textAlign: "center",
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
}));

export default React.memo(Stepper);
