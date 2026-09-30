import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { colors, fonts, spacing, type } from "@/constants/theme";
import {
  clearSelectedItems,
  selectAllItems,
  setBulkSelectionMode,
} from "@/redux/pianos/actions";
import { RootState } from "@/redux/store";

/**
 * The bar at the top of the Pianos tab while choosing pianos: Cancel, how many
 * are chosen, and Select all (or Deselect all once every piano is chosen). It
 * takes the place of the search field and the tabs.
 */
const SelectionHeader = () => {
  const dispatch = useDispatch();
  const { selectedItems, filteredItems } = useSelector(
    (state: RootState) => state.pianos,
  );
  const allSelected =
    filteredItems.length > 0 && selectedItems.length === filteredItems.length;

  const toggleAll = () => {
    if (selectedItems.length === filteredItems.length) {
      dispatch(clearSelectedItems() as any);
    } else {
      dispatch(selectAllItems(filteredItems.map((item) => item.$id)) as any);
    }
  };

  const cancel = () => {
    dispatch(clearSelectedItems() as any);
    dispatch(setBulkSelectionMode(false) as any);
  };

  return (
    <View style={styles.bar}>
      <Pressable
        onPress={cancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel"
        style={styles.button}
      >
        <Text style={styles.cancel}>Cancel</Text>
      </Pressable>

      {/* Centred on the bar, whatever the buttons' widths */}
      <View pointerEvents="none" style={styles.titleWrap}>
        <Text style={styles.title} accessibilityLiveRegion="polite">
          {selectedItems.length} selected
        </Text>
      </View>

      <Pressable
        onPress={toggleAll}
        accessibilityRole="button"
        accessibilityLabel={allSelected ? "Deselect all" : "Select all"}
        style={styles.button}
      >
        <Text style={styles.selectAll}>
          {allSelected ? "Deselect all" : "Select all"}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  button: {
    height: spacing.minTarget,
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
});

export default SelectionHeader;
