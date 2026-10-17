import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { createRentPayment, deleteRentalHistoryEntry, deleteRentPayment, updatePianoFields } from "@/lib/appwrite";
import saveOldRental from "@/lib/saveOldRental";
import { SAVE_FAILED } from "@/lib/useUpdatePiano";
import { paymentsChanged } from "@/redux/payments/actions";
import { updatePianoItem } from "@/redux/pianos/actions";
import { PianoItem } from "@/redux/pianos/types";
import { scheduleRentalDueNotification } from "@/services/notifications";
import type { Settlement } from "@/utils/deposits";
import { rentalReturned } from "@/utils/rentalHistory";
import { clearedRental, restoredRental } from "@/utils/returnPiano";
import { showToast } from "@/utils/toast";

/** What the rent kept out of a deposit is recorded as, in the payments. */
export const FROM_DEPOSIT_NOTE = "From deposit";

/**
 * Returns a function that marks a piano as returned: the rental comes off the
 * piano (so it is in stock again and its reminders stop), the rental is kept in
 * the piano's history, and a toast says so with Undo, which puts the rental
 * back and takes the kept one away. Resolves to whether the piano was saved.
 * The sheet that asks is still open when it fails, so there is no Retry.
 *
 * When a deposit was held, `settlement` says how it was settled: what was
 * refunded and why part was kept go into the kept rental. Rent kept out of the
 * deposit is also a real rent payment ("From deposit", on the day the piano
 * came back), so the renter's balance and the income come out right; it is
 * recorded first, so that when it can't be nothing has changed, and Undo takes
 * it away again.
 */
const useReturnPiano = () => {
  const dispatch = useDispatch();

  return useCallback(
    async function returnPiano(
      piano: PianoItem,
      returnedOn: Date,
      settlement: Settlement | null = null
    ): Promise<boolean> {
      // The rent kept out of the deposit, as a payment
      let paymentId: string | null = null;
      if (settlement && settlement.forRent > 0) {
        try {
          const payment = await createRentPayment({
            pianoId: piano.$id,
            creator: piano.creator,
            amount: settlement.forRent,
            paidOn: returnedOn,
            note: FROM_DEPOSIT_NOTE,
            customerName: piano.rental_customer_name?.trim() || undefined,
          });
          paymentId = payment.$id;
          dispatch(paymentsChanged() as any);
        } catch (error) {
          console.warn("Could not record the rent kept from the deposit:", error);
          showToast(SAVE_FAILED, { variant: "error", duration: "long" });
          return false;
        }
      }

      let updated: PianoItem;
      try {
        updated = await updatePianoFields(piano.$id, clearedRental());
      } catch (error) {
        console.warn("Could not mark the piano as returned:", error);
        if (paymentId) {
          // Nothing else changed, so the payment made for it goes too
          await deleteRentPayment(paymentId).catch((failure) =>
            console.warn("Could not take back the rent kept from the deposit:", failure)
          );
          dispatch(paymentsChanged() as any);
        }
        showToast(SAVE_FAILED, { variant: "error", duration: "long" });
        return false;
      }

      dispatch(updatePianoItem(updated) as any);
      // No rental any more, so no reminders
      await scheduleRentalDueNotification(updated);

      // The kept rental's ID, once it is kept, for Undo to take it away again
      let keptId: string | null = null;

      const undo = async (): Promise<void> => {
        try {
          const restored = await updatePianoFields(piano.$id, restoredRental(piano));
          dispatch(updatePianoItem(restored) as any);
          await scheduleRentalDueNotification(restored);
          if (keptId) {
            await deleteRentalHistoryEntry(keptId).catch((error) =>
              console.warn("Could not take back the kept rental:", error)
            );
            keptId = null;
          }
          if (paymentId) {
            await deleteRentPayment(paymentId).catch((error) =>
              console.warn("Could not take back the rent kept from the deposit:", error)
            );
            paymentId = null;
          }
          dispatch(paymentsChanged() as any);
          showToast("Return undone", { variant: "success" });
        } catch (error) {
          console.warn("Could not undo marking the piano as returned:", error);
          showToast("Couldn’t undo. Check your connection.", {
            variant: "error",
            duration: "long",
            action: { label: "Retry", onPress: () => void undo() },
          });
        }
      };

      showToast("Piano marked as returned", {
        variant: "success",
        duration: "long",
        action: { label: "Undo", onPress: () => void undo() },
      });

      const entry = rentalReturned(piano, returnedOn, settlement);
      if (entry) {
        await saveOldRental(entry, (kept) => {
          keptId = kept.$id;
          // The screens that show history load it again
          dispatch(paymentsChanged() as any);
        });
      }
      return true;
    },
    [dispatch]
  );
};

export default useReturnPiano;
