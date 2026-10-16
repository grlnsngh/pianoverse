import { format, isToday } from "date-fns";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { AmountInput, Button, DatePickerSheet, FormRow, Group, Icon, Sheet } from "@/components/ui";
import { COLUMN_LIMITS } from "@/constants/columnLimits";
import { fonts, spacing, type } from "@/constants/theme";
import type { ExpenseChanges } from "@/lib/appwrite";
import { parseStoredDate } from "@/utils/dates";
import { EXPENSE_CATEGORIES, categoryOf, type Expense, type ExpenseCategory } from "@/utils/expenses";
import { makeStyles, useColors } from "@/lib/ThemeContext";

export interface ExpenseDraft {
  amount: number;
  category: ExpenseCategory;
  spentOn: Date;
  note: string;
}

const draftOf = (expense: Expense | null): ExpenseDraft => ({
  amount: expense?.amount ?? 0,
  category: expense ? categoryOf(expense.category).category : "shop",
  spentOn: (expense && parseStoredDate(expense.spent_on)) || new Date(),
  note: expense?.note ?? "",
});

/** Only what differs from the expense, as Appwrite takes it. */
export const expenseChanges = (expense: Expense, draft: ExpenseDraft): ExpenseChanges => {
  const before = draftOf(expense);
  const changes: ExpenseChanges = {};
  if (draft.amount !== before.amount) changes.amount = draft.amount;
  if (draft.category !== before.category) changes.category = draft.category;
  if (format(draft.spentOn, "yyyy-MM-dd") !== format(before.spentOn, "yyyy-MM-dd")) changes.spentOn = draft.spentOn;
  if (draft.note.trim() !== before.note.trim()) changes.note = draft.note;
  return changes;
};

/** "Today, 16 Oct 2026", or "21 Sep 2026" for another day. */
const dayLabel = (date: Date) => `${isToday(date) ? "Today, " : ""}${format(date, "d MMM yyyy")}`;

export interface RecordExpenseSheetProps {
  visible: boolean;
  /** The expense being changed; none to record a new one */
  expense?: Expense | null;
  onClose: () => void;
  /** Resolves to whether it was saved; the sheet stays open when it wasn't */
  onSave: (draft: ExpenseDraft) => Promise<boolean>;
}

/**
 * Records a business expense, or changes one (RecordExpense board): the
 * amount big and centred, its kind, the day it was spent and a note. A cost
 * for one piano belongs in that piano's service log, and the sheet says so.
 */
const RecordExpenseSheet = ({ visible, expense = null, onClose, onSave }: RecordExpenseSheetProps) => {
  const colors = useColors();
  const styles = useStyles();
  const [draft, setDraft] = useState<ExpenseDraft>(draftOf(expense));
  const [saving, setSaving] = useState(false);
  const [choosingDay, setChoosingDay] = useState(false);

  // Start afresh each time it opens
  useEffect(() => {
    if (!visible) return;
    setDraft(draftOf(expense));
    setChoosingDay(false);
  }, [visible, expense]);

  const change = (fields: Partial<ExpenseDraft>) => setDraft((current) => ({ ...current, ...fields }));

  const editing = !!expense;
  const unchanged = expense ? Object.keys(expenseChanges(expense, draft)).length === 0 : false;

  const save = async () => {
    if (unchanged) {
      onClose();
      return;
    }
    if (draft.amount <= 0) {
      Alert.alert("Missing Details", "Please enter the amount.");
      return;
    }
    setSaving(true);
    const saved = await onSave(draft);
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? "Edit expense" : "Record expense"}
      leftLabel="Cancel"
      onLeftPress={onClose}
      footer={
        <Button
          title={editing ? "Save changes" : "Save expense"}
          loadingTitle="Saving"
          loading={saving}
          disabled={unchanged}
          onPress={save}
        />
      }
    >
      <Text style={styles.subject}>A business cost, not for one piano</Text>

      <AmountInput value={draft.amount} onChangeValue={(amount) => change({ amount })} label="Amount" width={180} />

      <View style={styles.kinds} accessibilityRole="radiogroup" accessibilityLabel="Kind of expense">
        {EXPENSE_CATEGORIES.map((option) => {
          const chosen = draft.category === option.category;
          return (
            <Pressable
              key={option.category}
              onPress={() => change({ category: option.category })}
              accessibilityRole="radio"
              accessibilityState={{ checked: chosen }}
              accessibilityLabel={option.label}
              style={[styles.kind, chosen && styles.kindOn]}
            >
              <Icon name={option.icon} size={18} color={chosen ? colors.onInk : colors.ink} strokeWidth={1.8} />
              <Text style={[styles.kindLabel, chosen && styles.kindLabelOn]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Group inSheet style={styles.group}>
        <FormRow label="Spent on" value={dayLabel(draft.spentOn)} onPress={() => setChoosingDay(true)} chevron={false} />
        <FormRow
          label="Note"
          placeholder="What it was for"
          input={{
            value: draft.note,
            onChangeText: (note) => change({ note }),
            returnKeyType: "done",
            autoCapitalize: "sentences",
            maxLength: COLUMN_LIMITS.expenses.note,
          }}
        />
      </Group>

      <View style={styles.tip}>
        <Icon name="wrench" size={20} color={colors.ink} strokeWidth={1.8} />
        <Text style={styles.tipText}>
          A repair, tuning or move for one piano? Use <Text style={styles.tipStrong}>Log service</Text> on its page. Its
          cost counts as an expense too.
        </Text>
      </View>
      <View style={styles.bottom} />

      <DatePickerSheet
        visible={choosingDay}
        title="Spent on"
        value={draft.spentOn}
        maximumDate={new Date()}
        onSelect={(spentOn) => change({ spentOn })}
        onClose={() => setChoosingDay(false)}
      />
    </Sheet>
  );
};

const useStyles = makeStyles((colors) => ({
  subject: { ...type.secondary, textAlign: "center", color: colors.ink2 },
  kinds: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: 14 },
  kind: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surface,
  },
  kindOn: { borderColor: colors.ink, backgroundColor: colors.ink },
  kindLabel: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink },
  kindLabelOn: { color: colors.onInk },
  group: { marginTop: 18 },
  tip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  tipText: { flex: 1, minWidth: 0, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.inkBody },
  tipStrong: { fontFamily: fonts.bold, color: colors.ink },
  bottom: { height: 8 },
}));

export default RecordExpenseSheet;
