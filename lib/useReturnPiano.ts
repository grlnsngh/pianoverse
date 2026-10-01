import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { deleteRentalHistoryEntry, updatePianoFields } from "@/lib/appwrite";
import saveOldRental from "@/lib/saveOldRental";
import { SAVE_FAILED } from "@/lib/useUpdatePiano";
import { paymentsChanged } from "@/redux/payments/actions";
import { updatePianoItem } from "@/redux/pianos/actions";
import { PianoItem } from "@/redux/pianos/types";
import { scheduleRentalDueNotification } from "@/services/notifications";
import { rentalReturned } from "@/utils/rentalHistory";
import { clearedRental, restoredRental } from "@/utils/returnPiano";
import { showToast } from "@/utils/toast";

/**
 * Returns a function that marks a piano as returned: the rental comes off the
 * piano (so it is in stock again and its reminders stop), the rental is kept in
 * the piano's history, and a toast says so with Undo, which puts the rental
 * back and takes the kept one away. Resolves to whether the piano was saved.
 * The sheet that asks is still open when it fails, so there is no Retry.
 */
const useReturnPiano = () => {
  const dispatch = useDispatch();

  return useCallback(
    async function returnPiano(piano: PianoItem, returnedOn: Date): Promise<boolean> {
      let updated: PianoItem;
      try {
        updated = await updatePianoFields(piano.$id, clearedRental());
      } catch (error) {
        console.warn("Could not mark the piano as returned:", error);
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

      const entry = rentalReturned(piano, returnedOn);
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
