import React from "react";
import { Pressable, Text } from "react-native";
import { Sheet } from "@/components/ui";
import { fonts, spacing } from "@/constants/theme";
import { entryDay, kindOf, type ServiceEntry } from "@/utils/serviceLog";
import { makeStyles } from "@/lib/ThemeContext";

export type ServiceAction = "edit" | "delete";

export type ServiceActionsSheetProps = {
  /** The entry that was pressed and held. The sheet shows while there is one. */
  entry: ServiceEntry | null;
  onClose: () => void;
  onSelect: (action: ServiceAction) => void;
};

/** What pressing and holding a service opens: change it or delete it. Delete is red. */
const ServiceActionsSheet = ({ entry, onClose, onSelect }: ServiceActionsSheetProps) => {
  const styles = useStyles();
  return (
    <Sheet
      visible={!!entry}
      onClose={onClose}
      tone="white"
      title={entry ? `${kindOf(entry.kind).label} · ${entryDay(entry)}` : undefined}
      testID="service-actions-sheet"
    >
      {(["edit", "delete"] as const).map((action) => {
        const label = action === "edit" ? "Edit service" : "Delete service";
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

export default ServiceActionsSheet;
