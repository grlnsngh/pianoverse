import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createRentPayment,
  deleteRentPayment,
  getRentPayments,
  RentPayment,
  RentPaymentChanges,
  updateRentPayment,
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
 * The same fields as `changes`, as the payment had them before: what putting
 * the change back needs.
 */
const before = (payment: RentPayment, changes: RentPaymentChanges): RentPaymentChanges => ({
  ...(changes.amount !== undefined ? { amount: payment.amount } : {}),
  ...(changes.paidOn !== undefined
    ? { paidOn: parseStoredDate(payment.paid_on) ?? new Date() }
    : {}),
  ...(changes.note !== undefined ? { note: payment.note ?? "" } : {}),
  ...(changes.customerName !== undefined
    ? { customerName: payment.customer_name ?? "" }
    : {}),
});

/**
 * Loads the rent payments of a piano and returns them with functions to
 * record, change and delete one. They tell the user when saving fails, and
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

  // Puts a changed payment back as it was: what Undo on "Payment updated" does
  const revert = useCallback(
    async (payment: RentPayment, changes: RentPaymentChanges) => {
      try {
        const restored = await updateRentPayment(payment.$id, before(payment, changes));
        setPayments((current) =>
          newestFirst(
            current.map((candidate) => (candidate.$id === payment.$id ? restored : candidate))
          )
        );
        dispatch(paymentsChanged() as any);
        showToast("Change undone", { variant: "success" });
      } catch (error) {
        console.warn("Could not undo the change to the rent payment:", error);
        showToast("Couldn’t undo the change. Check your connection.", {
          variant: "error",
          duration: "long",
        });
      }
    },
    [dispatch]
  );

  const update = useCallback(
    async (payment: RentPayment, changes: RentPaymentChanges): Promise<boolean> => {
      try {
        const updated = await updateRentPayment(payment.$id, changes);
        setPayments((current) =>
          newestFirst(
            current.map((candidate) => (candidate.$id === payment.$id ? updated : candidate))
          )
        );
        dispatch(paymentsChanged() as any);
        showToast("Payment updated", {
          variant: "success",
          duration: "long",
          action: { label: "Undo", onPress: () => revert(payment, changes) },
        });
        return true;
      } catch (error) {
        // The sheet is still open, so the person can just press Save again
        console.warn("Could not change the rent payment:", error);
        showToast("Couldn’t save. Check your connection.", {
          variant: "error",
          duration: "long",
        });
        return false;
      }
    },
    [dispatch, revert]
  );

  return { payments, status, reload: load, add, update, remove };
};

export default useRentPayments;
