import React from "react";
import { StyleSheet, View } from "react-native";
import { Icon } from "@/components/ui";
import { makeStyles, useColors } from "@/lib/ThemeContext";

export type SelectionMarkProps = {
  selected: boolean;
  /**
   * `photo`: drawn over a card's photo, with an ink ring round it when
   * selected. `row`: a plain circle at the end of a list row.
   */
  variant?: "photo" | "row";
};

/** Shows, while choosing pianos, whether this one is chosen. */
const SelectionMark = ({ selected, variant = "photo" }: SelectionMarkProps) => {
  const colors = useColors();
  const styles = useStyles();
  if (variant === "row") {
    return (
      <View
        testID="selection-mark"
        style={[styles.rowCircle, selected && styles.selectedCircle]}
      >
        {selected && <Icon name="check" size={14} color={colors.onInk} strokeWidth={3} />}
      </View>
    );
  }

  return selected ? (
    <View
      testID="selection-mark"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.ring]}
    >
      <View style={[styles.photoCircle, styles.selectedCircle]}>
        <Icon name="check" size={16} color={colors.onInk} strokeWidth={3} />
      </View>
    </View>
  ) : (
    <View
      testID="selection-mark"
      pointerEvents="none"
      style={[styles.photoCircle, styles.emptyCircle]}
    />
  );
};

const useStyles = makeStyles((colors) => ({
  ring: { borderRadius: 16, borderWidth: 3, borderColor: colors.ink },
  photoCircle: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCircle: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderWidth: 2,
    borderColor: colors.white,
  },
  selectedCircle: { backgroundColor: colors.ink },
  rowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.inputBorder,
  },
}));

export default React.memo(SelectionMark);
