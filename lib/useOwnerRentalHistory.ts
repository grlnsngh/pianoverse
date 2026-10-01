import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { getRentalHistory, RentalHistoryEntry } from "@/lib/appwrite";
import { RootState } from "@/redux/store";

export interface OwnerRentalHistory {
  /** False until the first load has finished, one way or the other */
  loaded: boolean;
  /** The rentals that were kept, in no particular order */
  entries: RentalHistoryEntry[];
  /** Loads again, and resolves when that has finished */
  reload: () => Promise<void>;
}

/**
 * The past rentals the signed-in user has kept, for every piano. They are an
 * extra: when they can't be loaded (no connection, or the rental_history table
 * isn't there) the screens simply have none to show, and say nothing. It loads
 * again when a payment or piano changes, and when an old rental has just been
 * kept (which signals the same way as a payment). Pass `enabled` false where
 * there is nothing to ask for (the page of a piano that isn't a rental).
 */
const useOwnerRentalHistory = (enabled = true): OwnerRentalHistory => {
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

  return { ...state, reload };
};

export default useOwnerRentalHistory;
