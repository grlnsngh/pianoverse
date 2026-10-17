import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createRentalHistory,
  deleteRentalHistoryEntry,
  getRentalHistory,
  NewRentalHistory,
  RentalHistoryChanges,
  RentalHistoryEntry,
  updateRentalHistoryEntry,
} from "@/lib/appwrite";
import { paymentsChanged } from "@/redux/payments/actions";
import { RootState } from "@/redux/store";
import { parseStoredDate } from "@/utils/dates";
import { showToast } from "@/utils/toast";

export interface OwnerRentalHistory {
  /** False until the first load has finished, one way or the other */
  loaded: boolean;
  /** The rentals that were kept, in no particular order */
  entries: RentalHistoryEntry[];
  /** Loads again, and resolves when that has finished */
  reload: () => Promise<void>;
  /** Changes a kept rental (Edit rental). Resolves to whether it was saved; the sheet stays open when it wasn't. */
  change: (entry: RentalHistoryEntry, changes: RentalHistoryChanges) => Promise<boolean>;
  /** Deletes a kept rental, with Undo. Resolves to whether it was deleted. */
  remove: (entry: RentalHistoryEntry) => Promise<boolean>;
}

/**
 * The same fields as `changes`, as the kept rental had them before: what
 * putting the change back needs.
 */
const before = (entry: RentalHistoryEntry, changes: RentalHistoryChanges): RentalHistoryChanges => ({
  ...(changes.customerName !== undefined ? { customerName: entry.customer_name ?? null } : {}),
  ...(changes.customerMobile !== undefined ? { customerMobile: entry.customer_mobile ?? null } : {}),
  ...(changes.customerAddress !== undefined ? { customerAddress: entry.customer_address ?? null } : {}),
  ...(changes.periodStart !== undefined
    ? { periodStart: entry.period_start ? parseStoredDate(entry.period_start) : null }
    : {}),
  ...(changes.periodEnd !== undefined
    ? { periodEnd: entry.period_end ? parseStoredDate(entry.period_end) : null }
    : {}),
  ...(changes.price !== undefined ? { price: entry.price ?? null } : {}),
});

/** A kept rental as a new one to keep, as it was: what Undo on "Rental deleted" puts back. */
const asNew = (entry: RentalHistoryEntry): NewRentalHistory => ({
  pianoId: entry.piano_id,
  pianoTitle: entry.piano_title,
  creator: entry.creator,
  customerName: entry.customer_name,
  customerMobile: entry.customer_mobile,
  customerAddress: entry.customer_address,
  periodStart: entry.period_start,
  periodEnd: entry.period_end,
  price: entry.price,
  deposit: entry.deposit ?? null,
  closedOn: parseStoredDate(entry.closed_on) ?? new Date(),
  // Kept as it was, even when it was kept without one
  reason: (entry.reason ?? undefined) as NewRentalHistory["reason"],
});

/**
 * The past rentals the signed-in user has kept, for every piano, with what
 * fixes a wrong one: change it, or delete it (each with the message and Undo
 * the payments have). They are an extra: when they can't be loaded (no
 * connection, or the rental_history table isn't there) the screens simply
 * have none to show, and say nothing. It loads again when a payment or piano
 * changes, when an old rental has just been kept, and when one was changed or
 * deleted (which all signal the same way as a payment). Pass `enabled` false
 * where there is nothing to ask for (the page of a piano that isn't a rental).
 */
const useOwnerRentalHistory = (enabled = true): OwnerRentalHistory => {
  const dispatch = useDispatch();
  const accountId = useSelector(
    (state: RootState) => state.users.user?.accountId
  );
  const changeCount = useSelector(
    (state: RootState) => state.payments.changeCount
  );
  const pianoCount = useSelector(
    (state: RootState) => state.pianos.items.length
  );
  const [state, setState] = useState<{
    loaded: boolean;
    entries: RentalHistoryEntry[];
  }>({
    loaded: false,
    entries: [],
  });
  const mounted = useRef(true);
  const latest = useRef(0);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );

  const reload = useCallback(async () => {
    const request = ++latest.current;
    if (!accountId) {
      setState({ loaded: true, entries: [] });
      return;
    }
    try {
      const entries = await getRentalHistory(accountId);
      if (mounted.current && request === latest.current)
        setState({ loaded: true, entries });
    } catch (error) {
      console.warn("Could not load the rental history:", error);
      if (mounted.current && request === latest.current) {
        setState((current) => ({ loaded: true, entries: current.entries }));
      }
    }
  }, [accountId]);

  useEffect(() => {
    if (enabled) reload();
  }, [reload, enabled, changeCount, pianoCount]);

  /** Shows `next` at once, and has every screen that shows the history load it again. */
  const shown = useCallback(
    (next: (entries: RentalHistoryEntry[]) => RentalHistoryEntry[]) => {
      if (mounted.current) setState((current) => ({ ...current, entries: next(current.entries) }));
      dispatch(paymentsChanged() as any);
    },
    [dispatch]
  );

  // Puts a changed rental back as it was: what Undo on "Rental updated" does
  const revert = useCallback(
    async (entry: RentalHistoryEntry, changes: RentalHistoryChanges) => {
      try {
        const restored = await updateRentalHistoryEntry(entry.$id, before(entry, changes));
        shown((entries) => entries.map((candidate) => (candidate.$id === entry.$id ? restored : candidate)));
        showToast("Change undone", { variant: "success" });
      } catch (error) {
        console.warn("Could not undo the change to the kept rental:", error);
        showToast("Couldn’t undo the change. Check your connection.", {
          variant: "error",
          duration: "long",
        });
      }
    },
    [shown]
  );

  const change = useCallback(
    async (entry: RentalHistoryEntry, changes: RentalHistoryChanges): Promise<boolean> => {
      try {
        const updated = await updateRentalHistoryEntry(entry.$id, changes);
        shown((entries) => entries.map((candidate) => (candidate.$id === entry.$id ? updated : candidate)));
        showToast("Rental updated", {
          variant: "success",
          duration: "long",
          action: { label: "Undo", onPress: () => void revert(entry, changes) },
        });
        return true;
      } catch (error) {
        // The sheet is still open, so the person can just press Save again
        console.warn("Could not change the kept rental:", error);
        showToast("Couldn’t save. Check your connection.", { variant: "error", duration: "long" });
        return false;
      }
    },
    [shown, revert]
  );

  // Keeps a deleted rental again, as it was: what Undo on "Rental deleted" does
  const restore = useCallback(
    async (entry: RentalHistoryEntry) => {
      try {
        const created = await createRentalHistory(asNew(entry));
        shown((entries) => [created, ...entries]);
        showToast("Rental restored", { variant: "success" });
      } catch (error) {
        console.warn("Could not restore the kept rental:", error);
        showToast("Couldn’t restore it. Check your connection.", { variant: "error", duration: "long" });
      }
    },
    [shown]
  );

  const remove = useCallback(
    async function removeRental(entry: RentalHistoryEntry): Promise<boolean> {
      try {
        await deleteRentalHistoryEntry(entry.$id);
        shown((entries) => entries.filter((candidate) => candidate.$id !== entry.$id));
        showToast("Rental deleted", {
          variant: "success",
          duration: "long",
          action: { label: "Undo", onPress: () => void restore(entry) },
        });
        return true;
      } catch (error) {
        console.warn("Could not delete the kept rental:", error);
        showToast("Couldn’t delete. Check your connection.", {
          variant: "error",
          duration: "long",
          action: { label: "Retry", onPress: () => void removeRental(entry) },
        });
        return false;
      }
    },
    [shown, restore]
  );

  return { ...state, reload, change, remove };
};

export default useOwnerRentalHistory;
