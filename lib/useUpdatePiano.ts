import { useCallback } from "react";
import { Alert } from "react-native";
import { useDispatch } from "react-redux";
import { scheduleRentalDueNotification } from "@/services/notifications";
import { PianoFieldsUpdate, updatePianoFields } from "@/lib/appwrite";
import { updatePianoItem } from "@/redux/pianos/actions";
import { PianoItem } from "@/redux/pianos/types";
import { showToast } from "@/utils/toast";

/**
 * Returns a function that saves a few fields of a piano (e.g. a sale or a new
 * rental end date), updates the store and its rental reminders, and confirms
 * with `successMessage`. Resolves to whether it was saved.
 */
const useUpdatePiano = () => {
  const dispatch = useDispatch();

  return useCallback(
    async (
      piano: PianoItem,
      fields: PianoFieldsUpdate,
      successMessage: string
    ) => {
      let updated: PianoItem;
      try {
        updated = await updatePianoFields(piano.$id, fields);
      } catch (error) {
        Alert.alert(
          "Couldn't Save",
          error instanceof Error ? error.message : "Please try again."
        );
        return false;
      }

      dispatch(updatePianoItem(updated) as any);
      // The rental may have a new end date, or be over because it was sold
      await scheduleRentalDueNotification(updated);
      showToast(successMessage);
      return true;
    },
    [dispatch]
  );
};

export default useUpdatePiano;
