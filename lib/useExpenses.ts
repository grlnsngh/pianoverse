import { useEffect, useSyncExternalStore } from "react";
import { useSelector } from "react-redux";
import {
  addExpense,
  changeExpense,
  getExpensesState,
  loadExpenses,
  removeExpense,
  subscribeExpenses,
} from "@/lib/expensesStore";
import type { RootState } from "@/redux/store";

/**
 * The signed-in owner's business expenses (lib/expensesStore.ts), read the
 * first time a screen asks and the same on every screen, with what records,
 * changes and deletes one. `reload` reads them again (pull to refresh).
 */
const useExpenses = () => {
  const accountId = useSelector((state: RootState) => state.users.user?.accountId);
  const store = useSyncExternalStore(subscribeExpenses, getExpensesState, getExpensesState);
  useEffect(() => {
    void loadExpenses(accountId);
  }, [accountId]);
  const mine = !!accountId && store.accountId === accountId;
  return {
    expenses: mine ? store.expenses : [],
    // Nobody signed in has nothing to wait for
    status: !accountId ? "ready" : mine ? store.status : "loading",
    reload: () => loadExpenses(accountId, true),
    add: addExpense,
    change: changeExpense,
    remove: removeExpense,
  } as const;
};

export default useExpenses;
