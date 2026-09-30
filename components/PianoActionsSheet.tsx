import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Sheet } from "@/components/ui";
import { colors, fonts } from "@/constants/theme";
import { ACTION_LABELS, ActionKey } from "@/utils/pianoDetail";

export type PianoActionsSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** What the page can do, the action in the bar first and Delete last */
  actions: ActionKey[];
  onSelect: (action: ActionKey) => void;
};

/**
 * What the ⋯ button on a piano's page opens: every action the page has, one to
 * a row, so any of them is one tap from the photo. Delete is red.
 */
const PianoActionsSheet = ({ visible, onClose, actions, onSelect }: PianoActionsSheetProps) => (
  <Sheet visible={visible} onClose={onClose} tone="white" testID="piano-actions-sheet">
    {actions.map((action) => (
      <Pressable
        key={action}
        onPress={() => onSelect(action)}
        accessibilityRole="button"
        accessibilityLabel={ACTION_LABELS[action]}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <Text style={[styles.label, action === "delete" && styles.destructive]}>
          {ACTION_LABELS[action]}
        </Text>
      </Pressable>
    ))}
  </Sheet>
);

const styles = StyleSheet.create({
  row: {
    height: 52,
    justifyContent: "center",
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  pressed: { backgroundColor: colors.grouped },
  label: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.ink },
  destructive: { color: colors.late },
});

export default PianoActionsSheet;
