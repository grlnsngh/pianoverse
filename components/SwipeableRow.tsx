import React, { useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { Icon } from "@/components/ui";
import { fonts } from "@/constants/theme";
import { makeStyles, useColors } from "@/lib/ThemeContext";

/** Width of each button behind a row; 80 is wider than the 44 px a thumb needs */
const ACTION_WIDTH = 80;

// The row that is open now, so opening another one closes it
let openRow: Swipeable | null = null;

type SwipeableRowProps = {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  /** Off while choosing pianos: a swipe then has no meaning */
  enabled?: boolean;
};

/**
 * A list row that slides left to show Edit and Delete behind it (the Handoff
 * board's "swipe a list row for Edit and Delete"). Pressing one closes the row
 * and does it; Delete asks first, as it does everywhere. The buttons are left
 * out of the screen reader's way: the row itself offers the same two actions
 * to it, since a swipe can't be done with one finger on a screen reader.
 */
const SwipeableRow = ({ children, onEdit, onDelete, enabled = true }: SwipeableRowProps) => {
  const colors = useColors();
  const styles = useStyles();
  const row = useRef<Swipeable>(null);

  const choose = (action: () => void) => () => {
    row.current?.close();
    action();
  };

  const renderRightActions = () => (
    <View
      style={styles.actions}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Pressable
        onPress={choose(onEdit)}
        accessibilityRole="button"
        accessibilityLabel="Edit"
        style={[styles.action, styles.edit]}
      >
        <Icon name="pencil" size={22} color={colors.white} />
        <Text style={styles.label}>Edit</Text>
      </Pressable>
      <Pressable
        onPress={choose(onDelete)}
        accessibilityRole="button"
        accessibilityLabel="Delete"
        style={[styles.action, styles.delete]}
      >
        <Icon name="trash" size={22} color={colors.white} />
        <Text style={styles.label}>Delete</Text>
      </Pressable>
    </View>
  );

  return (
    <Swipeable
      ref={row}
      enabled={enabled}
      renderRightActions={renderRightActions}
      overshootRight={false}
      rightThreshold={ACTION_WIDTH / 2}
      friction={2}
      onSwipeableWillOpen={() => {
        if (openRow && openRow !== row.current) openRow.close();
        openRow = row.current;
      }}
      onSwipeableClose={() => {
        if (openRow === row.current) openRow = null;
      }}
    >
      {children}
    </Swipeable>
  );
};

const useStyles = makeStyles((colors) => ({
  actions: { flexDirection: "row" },
  action: {
    width: ACTION_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  edit: { backgroundColor: colors.neutralFill },
  delete: { backgroundColor: colors.lateFill },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.white },
}));

export default SwipeableRow;
