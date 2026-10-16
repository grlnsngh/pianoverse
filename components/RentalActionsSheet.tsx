import React from "react";
import { Pressable, Text } from "react-native";
import { Sheet } from "@/components/ui";
import { fonts, spacing } from "@/constants/theme";
import type { RentalHistoryEntry } from "@/lib/appwrite";
import { rentalLabel } from "@/utils/rentalHistoryEdit";
import { makeStyles } from "@/lib/ThemeContext";

export type RentalAction = "edit" | "delete";

export type RentalActionsSheetProps = {
  /** The kept rental that was pressed and held. The sheet shows while there is one. */
  entry: RentalHistoryEntry | null;
  onClose: () => void;
  onSelect: (action: RentalAction) => void;
};

/** What pressing and holding a kept rental opens: change it or delete it. Delete is red. */
const RentalActionsSheet = ({ entry, onClose, onSelect }: RentalActionsSheetProps) => {
  const styles = useStyles();
  return (
    <Sheet
      visible={!!entry}
      onClose={onClose}
      tone="white"
      title={entry ? rentalLabel(entry) : undefined}
      testID="rental-actions-sheet"
    >
      {(["edit", "delete"] as const).map((action) => {
        const label = action === "edit" ? "Edit rental" : "Delete rental";
        return (
          <Pressable
            key={action}
            onPress={() => onSelect(action)}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={[styles.label, action === "delete" && styles.destructive]}>{label}</Text>
          </Pressable>
        );
      })}
    </Sheet>
  );
};

const useStyles = makeStyles((colors) => ({
  row: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 20,
    // With bigger text the row grows, and keeps this room above and below its words
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  pressed: { backgroundColor: colors.grouped },
  label: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.ink },
  destructive: { color: colors.late },
}));

export default RentalActionsSheet;
