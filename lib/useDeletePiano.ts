import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { cancelRentalNotification } from "@/services/notifications";
import { deletePianoEntry } from "@/lib/appwrite";
import { removePianoItems } from "@/redux/pianos/actions";
import { PianoItem } from "@/redux/pianos/types";
import { showDialog } from "@/utils/dialog";
import { showToast } from "@/utils/toast";

/**
 * Returns a function that asks the user to confirm, then deletes the piano
 * (document and image), cancels its rental reminder and removes it from the
 * store. `onDeleted` runs once the piano has been deleted.
 */
const useDeletePiano = () => {
  const dispatch = useDispatch();

  return useCallback(
    (item: PianoItem, onDeleted?: () => void) => {
      const deletePiano = async () => {
        try {
          await deletePianoEntry(item);
        } catch (error) {
          console.warn(`Could not delete ${item.title}:`, error);
          showToast(`Couldn’t delete ${item.title}. Check your connection.`, {
            variant: "error",
            duration: "long",
            action: { label: "Retry", onPress: deletePiano },
          });
          return;
        }

        await cancelRentalNotification(item.$id);
        onDeleted?.();
        dispatch(removePianoItems([item.$id]) as any);
        showToast(`Deleted ${item.title} successfully`, { variant: "success" });
      };

      showDialog({
        title: `Delete ${item.title}?`,
        message:
          "This removes the piano, its photos and its payments. This can’t be undone.",
        actions: [
          { label: "Delete", tone: "destructive", onPress: deletePiano },
          { label: "Cancel", onPress: () => {} },
        ],
      });
    },
    [dispatch]
  );
};

export default useDeletePiano;
