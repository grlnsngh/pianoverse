import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { bottomBar, type } from "@/constants/theme";
import Icon, { IconName } from "./Icon";
import { makeStyles, useColors } from "@/lib/ThemeContext";

const ICON_SIZE = 26;

export type TabBarItem<T extends string> = {
  key: T;
  label: string;
  icon: IconName;
};

export type TabBarProps<T extends string> = {
  tabs: readonly TabBarItem<T>[];
  active: T;
  onSelect: (key: T) => void;
  testID?: string;
};

/**
 * The bar at the bottom of the app: an icon over a label for each tab. The
 * active tab is ink and bold with a heavier icon; the others are grey. It is
 * 84 high on an iPhone (50 plus the home indicator), with a hairline on top.
 */
function TabBar<T extends string>({ tabs, active, onSelect, testID }: TabBarProps<T>) {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      testID={testID}
      style={[
        styles.bar,
        { height: bottomBar.content + Math.max(insets.bottom, bottomBar.minInset) },
      ]}
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            testID={testID ? `${testID}-${tab.key}` : undefined}
            style={styles.tab}
          >
            <Icon
              name={tab.icon}
              size={ICON_SIZE}
              color={selected ? colors.ink : colors.ink3}
              active={selected}
            />
            <Text
              style={[
                selected ? type.tabLabelActive : type.tabLabel,
                { color: selected ? colors.ink : colors.ink3 },
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
  bar: {
    flexDirection: "row",
    paddingTop: 8,
    backgroundColor: colors.page,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
}));

export default TabBar;
