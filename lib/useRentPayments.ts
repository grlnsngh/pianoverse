import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createRentPayment,
  deleteRentPayment,
  getRentPayments,
  RentPayment,
} from "@/lib/appwrite";
import { paymentsChanged } from "@/redux/payments/actions";
import { RootState } from "@/redux/store";
import { parseStoredDate } from "@/utils/dates";
import { showToast } from "@/utils/toast";

export type PaymentsStatus = "loading" | "ready" | "error";

/** What to do after a payment is recorded: offer to send its receipt. */
export interface AddOptions {
  onReceipt?: (payment: RentPayment) => void;
}

export interface NewPayment {
  amount: number;
  paidOn: Date;
  note?: string;
  customerName?: string;
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
    async (
      { amount, paidOn, note, customerName }: NewPayment,
      { onReceipt }: AddOptions = {}
    ) => {
      if (!user) {
        showToast("Please sign in again.", { variant: "error", duration: "long" });
        return false;
      }
      try {
        const created = await createRentPayment({
          pianoId,
          creator: user.accountId,
          amount,
          paidOn,
          note,
          customerName,
        });
        setPayments((current) => newestFirst([created, ...current]));
        dispatch(paymentsChanged() as any);
        showToast(
          "Payment recorded",
          onReceipt
            ? {
                variant: "success",
                duration: "long",
                action: { label: "Send receipt", onPress: () => onReceipt(created) },
              }
            : { variant: "success" }
        );
        return true;
      } catch (error) {
        // The sheet is still open, so the person can just press Save again
        console.warn("Could not save the rent payment:", error);
        showToast("Couldn’t save. Check your connection.", {
          variant: "error",
          duration: "long",
        });
        return false;
      }
    },
    [pianoId, user, dispatch]
  );

  // Records a deleted payment again: the same piano, amount, day, note and name
  const restore = useCallback(
    async (payment: RentPayment) => {
      try {
        const created = await createRentPayment({
          pianoId: payment.piano_id,
          creator: payment.creator,
          amount: payment.amount,
          paidOn: parseStoredDate(payment.paid_on) ?? new Date(),
          note: payment.note ?? undefined,
          customerName: payment.customer_name ?? undefined,
        });
        setPayments((current) => newestFirst([created, ...current]));
        dispatch(paymentsChanged() as any);
        showToast("Payment restored", { variant: "success" });
      } catch (error) {
        console.warn("Could not restore the rent payment:", error);
        showToast("Couldn’t restore the payment. Check your connection.", {
          variant: "error",
          duration: "long",
        });
      }
    },
    [dispatch]
  );

  const remove = useCallback(
    async function removePayment(payment: RentPayment): Promise<boolean> {
      try {
        await deleteRentPayment(payment.$id);
        setPayments((current) =>
          current.filter((candidate) => candidate.$id !== payment.$id)
        );
        dispatch(paymentsChanged() as any);
        showToast("Payment deleted", {
          variant: "success",
          duration: "long",
          action: { label: "Undo", onPress: () => restore(payment) },
        });
        return true;
      } catch (error) {
        console.warn("Could not delete the rent payment:", error);
        showToast("Couldn’t delete. Check your connection.", {
          variant: "error",
          duration: "long",
          action: { label: "Retry", onPress: () => removePayment(payment) },
        });
        return false;
      }
    },
    [dispatch, restore]
  );

  return { payments, status, reload: load, add, remove };
};

export default useRentPayments;
