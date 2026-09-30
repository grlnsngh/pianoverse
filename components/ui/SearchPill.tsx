import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, fonts, shadows, type } from "@/constants/theme";
import Icon from "./Icon";

const HEIGHT = 52;
const FILTER_SIZE = 40;

export type SearchPillProps = {
  /** Opens the search screen */
  onPress: () => void;
  /** Adds the round filter button on the right. Leave it off when there is nothing to filter. */
  onFilterPress?: () => void;
  /** How many filters are narrowing the list; shown on the filter button */
  filterCount?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The search field of the Pianos tab: a white pill with the search icon and
 * two lines of text. It is a button that opens the search screen, so nothing
 * is typed here. The round filter button sits inside its right end.
 */
const SearchPill = ({
  onPress,
  onFilterPress,
  filterCount = 0,
  style,
  testID,
}: SearchPillProps) => {
  const withFilter = !!onFilterPress;

  return (
    <View
      testID={testID}
      style={[styles.pill, withFilter && styles.pillWithFilter, style]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Search pianos"
        accessibilityHint="Title, make or customer"
        style={[styles.search, { paddingLeft: withFilter ? 12 : 16 }]}
      >
        <Icon name="search" size={20} color={colors.ink} strokeWidth={2} />
        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={1}>
            Search pianos
          </Text>
          <Text style={styles.hint} numberOfLines={1}>
            Title, make or customer
          </Text>
        </View>
      </Pressable>

      {withFilter && (
        <Pressable
          onPress={onFilterPress}
          accessibilityRole="button"
          accessibilityLabel={
            filterCount > 0 ? `Filters, ${filterCount} active` : "Filters"
          }
          style={styles.filter}
        >
          <Icon name="sliders" size={18} color={colors.ink} strokeWidth={1.9} />
          {filterCount > 0 && (
            <View testID="active-filter-badge" style={styles.count}>
              <Text style={styles.countText}>{filterCount}</Text>
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    height: HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: HEIGHT / 2,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.white,
    ...shadows.searchPill,
  },
  pillWithFilter: { gap: 6, paddingLeft: 4, paddingRight: 6 },
  search: {
    flex: 1,
    minWidth: 0,
    height: HEIGHT - 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  texts: { flexShrink: 1 },
  title: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.ink },
  hint: { ...type.hint, fontFamily: fonts.regular, color: colors.ink2 },
  filter: {
    width: FILTER_SIZE,
    height: FILTER_SIZE,
    borderRadius: FILTER_SIZE / 2,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: colors.white,
  },
  countText: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 12, color: colors.ink },
});

export default React.memo(SearchPill);
