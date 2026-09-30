import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { addMonths, startOfMonth, subMonths } from "date-fns";
import { getRentPaymentsBetween, RentPayment } from "@/lib/appwrite";
import { RootState } from "@/redux/store";

export interface TodayPayments {
  /** False until the first load has finished, one way or the other */
  loaded: boolean;
  /**
   * The load failed and there is nothing from an earlier load to show. A
   * later failure keeps the payments that are already there.
   */
  failed: boolean;
  /** Last month's and this month's payments, in no particular order */
  payments: RentPayment[];
  /** Loads again, and resolves when that has finished */
  reload: () => Promise<void>;
}

/**
 * The rent payments the signed-in user recorded last month and this month,
 * for the Today tab: this month's add up to "Received", and the newest of both
 * are "Recent payments". Last month is included so the list isn't empty on the
 * first of the month. It loads again whenever a payment is added or deleted, or
 * a piano is deleted (which deletes its payments too), and keeps showing what
 * it has while it does.
 */
const useTodayPayments = (): TodayPayments => {
  const accountId = useSelector((state: RootState) => state.users.user?.accountId);
  const changeCount = useSelector((state: RootState) => state.payments.changeCount);
  const pianoCount = useSelector((state: RootState) => state.pianos.items.length);
  const [state, setState] = useState<Omit<TodayPayments, "reload">>({
    loaded: false,
    failed: false,
    payments: [],
  });
  const mounted = useRef(true);
  // Whether any load has worked yet
  const hasData = useRef(false);
  // Only the latest load may answer, so a slow one can't overwrite a newer one
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
      setState({ loaded: true, failed: false, payments: [] });
      return;
    }
    const firstOfMonth = startOfMonth(new Date());
    try {
      const payments = await getRentPaymentsBetween(
        accountId,
        subMonths(firstOfMonth, 1),
        addMonths(firstOfMonth, 1)
      );
      if (mounted.current && request === latest.current) {
        hasData.current = true;
        setState({ loaded: true, failed: false, payments });
      }
    } catch (error) {
      console.warn("Could not load the rent payments for Today:", error);
      if (mounted.current && request === latest.current) {
        setState((current) => ({
          loaded: true,
          failed: !hasData.current,
          payments: current.payments,
        }));
      }
    }
  }, [accountId]);

  useEffect(() => {
    reload();
  }, [reload, changeCount, pianoCount]);

  return { ...state, reload };
};

export default useTodayPayments;
