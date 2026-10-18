import React from "react";
import { Pressable, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { fonts, maxScale, spacing, type } from "@/constants/theme";
import {
  clearSelectedItems,
  selectAllItems,
  setBulkSelectionMode,
} from "@/redux/pianos/actions";
import { RootState } from "@/redux/store";
import { makeStyles } from "@/lib/ThemeContext";
import useTextScale from "@/lib/useTextScale";

/**
 * The bar at the top of the Pianos tab while choosing pianos: Cancel, how many
 * are chosen, and Select all (or Deselect all once every piano is chosen). It
 * takes the place of the search field and the tabs.
 */
const SelectionHeader = () => {
  const styles = useStyles();
  const { large } = useTextScale();
  const dispatch = useDispatch();
  const { selectedItems, filteredItems } = useSelector(
    (state: RootState) => state.pianos,
  );
  const allSelected =
    filteredItems.length > 0 && selectedItems.length === filteredItems.length;

  const toggleAll = () => {
    if (selectedItems.length === filteredItems.length) {
      dispatch(clearSelectedItems());
    } else {
      dispatch(selectAllItems(filteredItems.map((item) => item.$id)));
    }
  };

  const cancel = () => {
    dispatch(clearSelectedItems());
    dispatch(setBulkSelectionMode(false));
  };

  return (
    <View style={[styles.bar, large && styles.barFlow]}>
      <Pressable
        onPress={cancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel"
        style={styles.button}
      >
        <Text style={styles.cancel} maxFontSizeMultiplier={maxScale.section}>
          Cancel
        </Text>
      </Pressable>

      {/* Centred on the bar, whatever the buttons' widths */}
      <View pointerEvents="none" style={[styles.titleWrap, large && styles.titleFlow]}>
        <Text
          style={[styles.title, large && styles.titleCentred]}
          accessibilityLiveRegion="polite"
          maxFontSizeMultiplier={maxScale.section}
        >
          {selectedItems.length} selected
        </Text>
      </View>

      <Pressable
        onPress={toggleAll}
        accessibilityRole="button"
        accessibilityLabel={allSelected ? "Deselect all" : "Select all"}
        style={styles.button}
      >
        <Text style={styles.selectAll} maxFontSizeMultiplier={maxScale.section}>
          {allSelected ? "Deselect all" : "Select all"}
        </Text>
      </Pressable>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  bar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  // With a big Font size the title is no longer laid over the middle of the bar,
  // where the buttons would run into it: it sits between them and may wrap
  barFlow: { height: undefined, minHeight: 56, paddingBottom: spacing.xs },
  titleFlow: {
    position: "relative",
    top: undefined,
    left: undefined,
    right: undefined,
    flex: 1,
    height: undefined,
    minHeight: spacing.minTarget,
    paddingHorizontal: spacing.xs,
  },
  titleCentred: { textAlign: "center" },
  button: {
    minHeight: spacing.minTarget,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  cancel: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  selectAll: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.brandText,
  },
  titleWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: spacing.sm,
    height: spacing.minTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...type.sheetTitle, color: colors.ink },
}));

export default SelectionHeader;
