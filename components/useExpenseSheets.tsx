import React, { useEffect, useRef, useState } from "react";
import ExpenseActionsSheet, { type ExpenseAction } from "@/components/ExpenseActionsSheet";
import RecordExpenseSheet, { expenseChanges, type ExpenseDraft } from "@/components/RecordExpenseSheet";
import useExpenses from "@/lib/useExpenses";
import { showDialog } from "@/utils/dialog";
import { categoryOf, expenseDay, type Expense } from "@/utils/expenses";
import { formatRupees } from "@/utils/money";

// A sheet takes 240 ms to leave; what it chose runs after that, so the next
// sheet or dialog isn't started under one that is still going
const SHEET_CLOSE_MS = 300;

/**
 * Everything a screen needs to record, change and delete business expenses
 * (the Income and Expenses screens): the expenses, the handlers, and the
 * sheets to draw.
 */
const useExpenseSheets = () => {
  const store = useExpenses();
  const [recording, setRecording] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [held, setHeld] = useState<Expense | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const confirmDelete = (expense: Expense) =>
    showDialog({
      title: "Delete this expense?",
      message: `${expense.note?.trim() || categoryOf(expense.category).label}, ${formatRupees(expense.amount)} on ${expenseDay(expense)}, will be removed.`,
      actions: [
        { label: "Delete", tone: "destructive", onPress: () => store.remove(expense) },
        { label: "Cancel", onPress: () => {} },
      ],
    });

  const choose = (action: ExpenseAction) => {
    const expense = held;
    setHeld(null);
    if (!expense) return;
    timer.current = setTimeout(() => (action === "edit" ? setEditing(expense) : confirmDelete(expense)), SHEET_CLOSE_MS);
  };

  const save = (draft: ExpenseDraft) =>
    editing
      ? store.change(editing, expenseChanges(editing, draft))
      : store.add({ spentOn: draft.spentOn, amount: draft.amount, category: draft.category, note: draft.note });

  const sheets = (
    <>
      <RecordExpenseSheet
        visible={recording || !!editing}
        expense={editing}
        onClose={() => {
          setRecording(false);
          setEditing(null);
        }}
        onSave={save}
      />
      <ExpenseActionsSheet expense={held} onClose={() => setHeld(null)} onSelect={choose} />
    </>
  );

  return {
    store,
    startRecording: () => setRecording(true),
    hold: setHeld,
    edit: setEditing,
    confirmDelete,
    sheets,
  };
};

export default useExpenseSheets;
