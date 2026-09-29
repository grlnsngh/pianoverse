import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { addMonths, startOfMonth } from "date-fns";
import { getRentPaymentsBetween } from "@/lib/appwrite";
import { RootState } from "@/redux/store";
import { totalReceived } from "@/utils/stats";

export interface RentReceived {
  // False until the first load has finished, and when it failed
  loaded: boolean;
  failed: boolean;
  count: number;
  total: number;
}

const NOTHING: RentReceived = {
  loaded: false,
  failed: false,
  count: 0,
  total: 0,
};

/**
 * The rent payments the signed-in user recorded this month, added up. It
 * loads again whenever a payment is added or deleted, or a piano is deleted
 * (which deletes its payments too), and keeps showing the last total while it
 * does.
 */
const useRentReceived = (): RentReceived => {
  const accountId = useSelector(
    (state: RootState) => state.users.user?.accountId
  );
  const changeCount = useSelector(
    (state: RootState) => state.payments.changeCount
  );
  const pianoCount = useSelector(
    (state: RootState) => state.pianos.items.length
  );
  const [received, setReceived] = useState<RentReceived>(NOTHING);

  useEffect(() => {
    if (!accountId) {
      setReceived({ ...NOTHING, loaded: true });
      return;
    }

    let cancelled = false;
    const firstOfMonth = startOfMonth(new Date());
    getRentPaymentsBetween(accountId, firstOfMonth, addMonths(firstOfMonth, 1))
      .then((payments) => {
        if (!cancelled) {
          setReceived({ loaded: true, failed: false, ...totalReceived(payments) });
        }
      })
      .catch((error) => {
        console.warn("Could not load the rent received this month:", error);
        if (!cancelled) setReceived({ ...NOTHING, failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [accountId, changeCount, pianoCount]);

  return received;
};

export default useRentReceived;
