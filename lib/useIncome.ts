import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { getRentPaymentsBetween, RentPayment } from "@/lib/appwrite";
import { RootState } from "@/redux/store";
import { incomeRange } from "@/utils/income";

export interface IncomePayments {
  /** False until the first load has finished, one way or the other */
  loaded: boolean;
  /** The load failed and there is nothing from an earlier load to show */
  failed: boolean;
  /** The payments of the last `months` months, in no particular order */
  payments: RentPayment[];
  /** Loads again, and resolves when that has finished */
  reload: () => Promise<void>;
}

/**
 * The rent payments the signed-in user recorded in the last `months` months,
 * for the income chart and list. It loads again whenever a payment is added or
 * deleted, or a piano is deleted (which deletes its payments too), and keeps
 * showing what it has while it does. The sales come from the pianos in redux.
 */
const useIncome = (months: number): IncomePayments => {
  const accountId = useSelector(
    (state: RootState) => state.users.user?.accountId
  );
  const changeCount = useSelector(
    (state: RootState) => state.payments.changeCount
  );
  const pianoCount = useSelector(
    (state: RootState) => state.pianos.items.length
  );
  const [state, setState] = useState<Omit<IncomePayments, "reload">>({
    loaded: false,
    failed: false,
    payments: [],
  });
  const mounted = useRef(true);
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
    const { from, to } = incomeRange(months);
    try {
      const payments = await getRentPaymentsBetween(accountId, from, to);
      if (mounted.current && request === latest.current) {
        hasData.current = true;
        setState({ loaded: true, failed: false, payments });
      }
    } catch (error) {
      console.warn("Could not load the rent payments for the income:", error);
      if (mounted.current && request === latest.current) {
        setState((current) => ({
          loaded: true,
          failed: !hasData.current,
          payments: current.payments,
        }));
      }
    }
  }, [accountId, months]);

  useEffect(() => {
    reload();
  }, [reload, changeCount, pianoCount]);

  return { ...state, reload };
};

export default useIncome;
