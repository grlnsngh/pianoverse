import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, fonts } from "@/constants/theme";

const PADDING = 2;
const OPTION_HEIGHT = 40;

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Says what the choice is for, such as "Category" */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Two to four choices in one grey track, of which one is selected: a white
 * chip with a bold label. Options share the width equally.
 */
function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
  testID,
}: SegmentedProps<T>) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[styles.track, style]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => !selected && onChange(option.value)}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            testID={testID ? `${testID}-${option.value}` : undefined}
            style={[styles.option, selected && styles.selected]}
          >
            <Text
              numberOfLines={1}
              style={[styles.label, selected && styles.labelSelected]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: PADDING,
    borderRadius: 10,
    backgroundColor: colors.hairline,
  },
  option: {
    flex: 1,
    height: OPTION_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  selected: { backgroundColor: colors.white },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink2 },
  labelSelected: { fontFamily: fonts.bold, color: colors.ink },
});

export default Segmented;
