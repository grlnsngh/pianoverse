import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { bottomBar, maxScale, type } from "@/constants/theme";
import Icon, { IconName } from "./Icon";
import { useReportBottomBar } from "@/lib/bottomBars";
import { makeStyles, useColors } from "@/lib/ThemeContext";

const ICON_SIZE = 26;
/**
 * A tab is 51 high at 100%: 8 above, a 26 icon, 3, and a 14 label. The 50 of
 * `bottomBar.content` leaves that last pixel to the room below, so the bar is
 * 84 on an iPhone as drawn and a bigger label makes it taller.
 */
const TAB_CONTENT = 51;

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
 * That is the least it is: a big Font size makes the labels, and so the bar,
 * taller, and it tells the toasts how tall it is (lib/bottomBars.ts).
 */
function TabBar<T extends string>({ tabs, active, onSelect, testID }: TabBarProps<T>) {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const reportHeight = useReportBottomBar();
  const inset = Math.max(insets.bottom, bottomBar.minInset);

  return (
    <View
      accessibilityRole="tablist"
      testID={testID}
      onLayout={reportHeight}
      style={[
        styles.bar,
        {
          minHeight: bottomBar.content + inset,
          paddingBottom: Math.max(inset - (TAB_CONTENT - bottomBar.content), 0),
        },
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
              maxFontSizeMultiplier={maxScale.tabLabel}
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
