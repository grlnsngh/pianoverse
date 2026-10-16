import React from "react";
import { Pressable, Text } from "react-native";
import { Sheet } from "@/components/ui";
import { fonts, spacing } from "@/constants/theme";
import { categoryOf, expenseDay, type Expense } from "@/utils/expenses";
import { makeStyles } from "@/lib/ThemeContext";

export type ExpenseAction = "edit" | "delete";

export type ExpenseActionsSheetProps = {
  /** The expense that was pressed and held. The sheet shows while there is one. */
  expense: Expense | null;
  onClose: () => void;
  onSelect: (action: ExpenseAction) => void;
};

/** What pressing and holding an expense opens: change it or delete it. Delete is red. */
const ExpenseActionsSheet = ({ expense, onClose, onSelect }: ExpenseActionsSheetProps) => {
  const styles = useStyles();
  return (
    <Sheet
      visible={!!expense}
      onClose={onClose}
      tone="white"
      title={expense ? `${expense.note?.trim() || categoryOf(expense.category).label} · ${expenseDay(expense)}` : undefined}
      testID="expense-actions-sheet"
    >
      {(["edit", "delete"] as const).map((action) => {
        const label = action === "edit" ? "Edit expense" : "Delete expense";
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
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  pressed: { backgroundColor: colors.grouped },
  label: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.ink },
  destructive: { color: colors.late },
}));

export default ExpenseActionsSheet;
