import React from "react";
import { Pressable, Text, View } from "react-native";
import { Icon } from "@/components/ui";
import { fonts, radii } from "@/constants/theme";
import { costIcon, costLine, costTitle, type Cost, type Expense } from "@/utils/expenses";
import { formatRupees } from "@/utils/money";
import { makeStyles, useColors } from "@/lib/ThemeContext";

export type CostRowProps = {
  cost: Cost;
  /** A service's row opens its piano */
  onOpenPiano: (pianoId: string) => void;
  /** Press and hold an expense: its choices (edit or delete) */
  onHold: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
};

/**
 * One cost on the Expenses screen (Expenses board): its kind's icon, what it
 * was and when, and the amount. A service's cost opens its piano, where it is
 * changed in the service log; a business expense is pressed and held to edit
 * or delete it, and a screen reader has both as actions.
 */
const CostRow = ({ cost, onOpenPiano, onHold, onEdit, onDelete }: CostRowProps) => {
  const colors = useColors();
  const styles = useStyles();
  const title = costTitle(cost);
  const line = costLine(cost);
  const amount = formatRupees(cost.amount);
  const body = (
    <>
      <View style={styles.icon}>
        <Icon name={costIcon(cost)} size={20} color={colors.ink} strokeWidth={1.8} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.line}>{line}</Text>
      </View>
      <Text style={styles.amount}>{amount}</Text>
    </>
  );

  if (cost.type === "service") {
    const pianoId = cost.piano?.$id;
    return (
      <Pressable
        onPress={pianoId ? () => onOpenPiano(pianoId) : undefined}
        disabled={!pianoId}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${line}, ${amount}`}
        accessibilityHint={pianoId ? "Opens the piano" : undefined}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        {body}
        {!!pianoId && <Icon name="chevronRight" size={18} color={colors.chevron} strokeWidth={2} />}
      </Pressable>
    );
  }

  const { expense } = cost;
  return (
    <Pressable
      onLongPress={() => onHold(expense)}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${line}, ${amount}`}
      accessibilityHint="Press and hold to edit or delete it"
      accessibilityActions={[
        { name: "edit", label: "Edit expense" },
        { name: "delete", label: "Delete expense" },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "edit") onEdit(expense);
        if (event.nativeEvent.actionName === "delete") onDelete(expense);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
};

const useStyles = makeStyles((colors) => ({
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  pressed: { backgroundColor: colors.grouped },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.input,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.fill,
  },
  texts: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink },
  line: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  amount: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
}));

export default React.memo(CostRow);
