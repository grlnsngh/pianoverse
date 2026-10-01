import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/constants/theme";
import Icon from "./Icon";
import Sheet from "./Sheet";

export type PickerOption<T extends string> = {
  value: T;
  label: string;
};

export type PickerSheetProps<T extends string> = {
  visible: boolean;
  /** Says what is being chosen, such as "Sort by" */
  title: string;
  options: readonly PickerOption<T>[];
  value: T;
  /** Called with the chosen value. The screen closes the sheet. */
  onSelect: (value: T) => void;
  onClose: () => void;
  testID?: string;
};

/**
 * A white sheet with a list to choose one thing from: 52 px rows with a
 * hairline between them, the chosen one bold with a check at the end.
 */
function PickerSheet<T extends string>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
  testID,
}: PickerSheetProps<T>) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      tone="white"
      testID={testID}
    >
      <View accessibilityRole="radiogroup" accessibilityLabel={title}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected, checked: selected }}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.label,
                  { fontFamily: selected ? fonts.bold : fonts.medium },
                ]}
              >
                {option.label}
              </Text>
              {selected && (
                <Icon name="check" size={22} color={colors.ink} strokeWidth={2.6} />
              )}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  pressed: { backgroundColor: colors.grouped },
  label: { fontSize: 16, color: colors.ink },
});

export default PickerSheet;
