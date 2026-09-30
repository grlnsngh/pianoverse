import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import {
  createRentPayment,
  deleteRentPayment,
  getRentPayments,
  RentPayment,
} from "@/lib/appwrite";
import { paymentsChanged } from "@/redux/payments/actions";
import { RootState } from "@/redux/store";
import { showToast } from "@/utils/toast";

export type PaymentsStatus = "loading" | "ready" | "error";

export interface NewPayment {
  amount: number;
  paidOn: Date;
  note?: string;
}

const newestFirst = (payments: RentPayment[]) =>
  [...payments].sort(
    (a, b) =>
      b.paid_on.localeCompare(a.paid_on) ||
      b.$createdAt.localeCompare(a.$createdAt)
  );

/**
 * Loads the rent payments of a piano and returns them with functions to
 * record and delete one. Both ask the user again when saving fails, and
 * resolve to whether they worked. Pass `enabled` false for a piano that isn't
 * a rental: nothing is loaded for it.
 */
const useRentPayments = (pianoId: string, enabled = true) => {
  const user = useSelector((state: RootState) => state.users.user);
  const dispatch = useDispatch();
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [status, setStatus] = useState<PaymentsStatus>("loading");
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const loaded = await getRentPayments(pianoId);
      if (!mounted.current) return;
      setPayments(loaded);
      setStatus("ready");
    } catch (error) {
      console.warn("Could not load the rent payments:", error);
      if (mounted.current) setStatus("error");
    }
  }, [pianoId]);

  useEffect(() => {
    if (enabled) load();
  }, [load, enabled]);

  const add = useCallback(
    async ({ amount, paidOn, note }: NewPayment) => {
      try {
        if (!user) throw new Error("Please sign in again.");
        const created = await createRentPayment({
          pianoId,
          creator: user.accountId,
          amount,
          paidOn,
          note,
        });
        setPayments((current) => newestFirst([created, ...current]));
        dispatch(paymentsChanged() as any);
        showToast("Payment recorded");
        return true;
      } catch (error) {
        Alert.alert(
          "Couldn't Save",
          error instanceof Error ? error.message : "Please try again."
        );
        return false;
      }
    },
    [pianoId, user, dispatch]
  );

  const remove = useCallback(
    async (payment: RentPayment) => {
      try {
        await deleteRentPayment(payment.$id);
        setPayments((current) =>
          current.filter((candidate) => candidate.$id !== payment.$id)
        );
        dispatch(paymentsChanged() as any);
        showToast("Payment deleted");
        return true;
      } catch (error) {
        Alert.alert(
          "Couldn't Delete",
          error instanceof Error ? error.message : "Please try again."
        );
        return false;
      }
    },
    [dispatch]
  );

  return { payments, status, reload: load, add, remove };
};

export default useRentPayments;
