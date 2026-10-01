import React from "react";
import { Pressable, StyleProp, Text, View, ViewStyle } from "react-native";
import { type } from "@/constants/theme";
import Icon, { IconName } from "./Icon";
import { makeStyles, useColors } from "@/lib/ThemeContext";

const ICON_SIZE = 24;

export type IconTabItem<T extends string> = {
  key: T;
  label: string;
  icon: IconName;
  /** Greyed out and not pressable */
  disabled?: boolean;
};

export type IconTabsProps<T extends string> = {
  tabs: readonly IconTabItem<T>[];
  active: T;
  onSelect: (key: T) => void;
  /** Says what the tabs choose between, such as "Category" */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A row of equal tabs, each an icon over a label, with a hairline under the
 * row. The active one is ink and bold with a 2 px ink line under it.
 */
function IconTabs<T extends string>({
  tabs,
  active,
  onSelect,
  accessibilityLabel,
  style,
  testID,
}: IconTabsProps<T>) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[styles.row, style]}
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            disabled={tab.disabled}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected, disabled: !!tab.disabled }}
            testID={testID ? `${testID}-${tab.key}` : undefined}
            style={[
              styles.tab,
              // The line sits over the row's hairline instead of above it
              { borderBottomColor: selected ? colors.ink : "transparent" },
              tab.disabled && styles.disabled,
            ]}
          >
            <Icon
              name={tab.icon}
              size={ICON_SIZE}
              color={selected ? colors.ink : colors.ink2}
              strokeWidth={selected ? 1.9 : 1.75}
            />
            <Text
              numberOfLines={1}
              style={[
                type.hint,
                {
                  fontFamily: selected ? type.badge.fontFamily : type.tabLabel.fontFamily,
                  color: selected ? colors.ink : colors.ink2,
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: "row",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  disabled: { opacity: 0.4 },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 2,
    marginBottom: -1,
  },
}));

export default IconTabs;
