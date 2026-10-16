import {
  createExpense,
  deleteExpense,
  getExpenses,
  updateExpense,
  type ExpenseChanges,
  type NewExpense,
} from "@/lib/appwrite";
import { parseStoredDate } from "@/utils/dates";
import { newestFirst, type Expense, type ExpenseCategory } from "@/utils/expenses";
import { showToast } from "@/utils/toast";

/**
 * The owner's business expenses while the app is open: read from Appwrite
 * once per account, shared by the Income and Expenses screens, and kept up to
 * date as expenses are recorded, changed and deleted (each with the message
 * and Undo the payments have).
 */

export type ExpensesStatus = "idle" | "loading" | "ready" | "error";

export interface ExpensesState {
  accountId: string | null;
  /** The newest first */
  expenses: Expense[];
  status: ExpensesStatus;
}

const INITIAL: ExpensesState = { accountId: null, expenses: [], status: "idle" };

let state: ExpensesState = INITIAL;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

const set = (next: Partial<ExpensesState>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

export const getExpensesState = (): ExpensesState => state;

export const subscribeExpenses = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Reads the account's expenses, once (again with `force`, as when the Income screen is pulled down). */
export const loadExpenses = (accountId: string | null | undefined, force = false): Promise<void> => {
  if (!accountId) return Promise.resolve();
  if (state.accountId !== accountId) {
    loading = null;
    set({ accountId, expenses: [], status: "idle" });
  }
  if (loading && !force) return loading;
  if (state.status !== "ready") set({ status: "loading" });
  const request = (async () => {
    try {
      const expenses = await getExpenses(accountId);
      if (state.accountId !== accountId) return;
      set({ expenses: newestFirst(expenses), status: "ready" });
    } catch (error) {
      console.warn("Could not load the expenses:", error);
      if (state.accountId === accountId) set({ status: state.expenses.length ? "ready" : "error" });
      loading = null;
    }
  })();
  loading = request;
  return request;
};

const changed = (expenses: Expense[]) => set({ expenses: newestFirst(expenses) });

/** What putting a change back needs: the same fields, as the expense had them. */
const before = (expense: Expense, changes: ExpenseChanges): ExpenseChanges => ({
  ...(changes.spentOn !== undefined ? { spentOn: parseStoredDate(expense.spent_on) ?? new Date() } : {}),
  ...(changes.amount !== undefined ? { amount: expense.amount } : {}),
  ...(changes.category !== undefined ? { category: expense.category as ExpenseCategory } : {}),
  ...(changes.note !== undefined ? { note: expense.note ?? "" } : {}),
});

const failed = (message: string, retry?: () => void) =>
  showToast(message, {
    variant: "error",
    duration: "long",
    ...(retry ? { action: { label: "Retry", onPress: retry } } : {}),
  });

/** Keeps a new expense. Resolves to whether it was saved; the sheet stays open when it wasn't. */
export const addExpense = async (expense: Omit<NewExpense, "creator">): Promise<boolean> => {
  if (!state.accountId) {
    failed("Please sign in again.");
    return false;
  }
  try {
    const created = await createExpense({ ...expense, creator: state.accountId });
    changed([created, ...state.expenses]);
    showToast("Expense recorded", { variant: "success" });
    return true;
  } catch (error) {
    console.warn("Could not save the expense:", error);
    failed("Couldn’t save. Check your connection.");
    return false;
  }
};

/** Keeps a deleted expense again, as it was: what Undo on "Expense deleted" does. */
const restore = async (expense: Expense) => {
  try {
    const created = await createExpense({
      creator: expense.creator,
      spentOn: parseStoredDate(expense.spent_on) ?? new Date(),
      amount: expense.amount,
      category: expense.category as ExpenseCategory,
      note: expense.note ?? null,
    });
    changed([created, ...state.expenses]);
    showToast("Expense restored", { variant: "success" });
  } catch (error) {
    console.warn("Could not restore the expense:", error);
    failed("Couldn’t restore it. Check your connection.");
  }
};

export const removeExpense = async function remove(expense: Expense): Promise<boolean> {
  try {
    await deleteExpense(expense.$id);
    changed(state.expenses.filter((candidate) => candidate.$id !== expense.$id));
    showToast("Expense deleted", {
      variant: "success",
      duration: "long",
      action: { label: "Undo", onPress: () => restore(expense) },
    });
    return true;
  } catch (error) {
    console.warn("Could not delete the expense:", error);
    failed("Couldn’t delete. Check your connection.", () => remove(expense));
    return false;
  }
};

const replace = (updated: Expense) =>
  changed(state.expenses.map((candidate) => (candidate.$id === updated.$id ? updated : candidate)));

/** Puts a changed expense back as it was: what Undo on "Expense updated" does. */
const revert = async (expense: Expense, changes: ExpenseChanges) => {
  try {
    replace(await updateExpense(expense.$id, before(expense, changes)));
    showToast("Change undone", { variant: "success" });
  } catch (error) {
    console.warn("Could not undo the change to the expense:", error);
    failed("Couldn’t undo the change. Check your connection.");
  }
};

export const changeExpense = async (expense: Expense, changes: ExpenseChanges): Promise<boolean> => {
  try {
    replace(await updateExpense(expense.$id, changes));
    showToast("Expense updated", {
      variant: "success",
      duration: "long",
      action: { label: "Undo", onPress: () => revert(expense, changes) },
    });
    return true;
  } catch (error) {
    console.warn("Could not change the expense:", error);
    failed("Couldn’t save. Check your connection.");
    return false;
  }
};

/** Forgets the expenses on this phone: at sign out and on deleting the account. */
export const forgetExpenses = () => {
  loading = null;
  set(INITIAL);
};

/** Starts again from nothing. For tests. */
export const resetExpensesForTests = () => {
  loading = null;
  state = INITIAL;
  listeners.clear();
};
