import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { scheduleRentalDueNotification } from "@/services/notifications";
import { PianoFieldsUpdate, updatePianoFields } from "@/lib/appwrite";
import { updatePianoItem } from "@/redux/pianos/actions";
import { PianoItem } from "@/redux/pianos/types";
import { showToast } from "@/utils/toast";

export interface UpdateOptions {
  /**
   * How to take the change back. The success toast then has an Undo button
   * that saves these fields, with `message` as its own confirmation.
   */
  undo?: { fields: PianoFieldsUpdate; message: string };
  /**
   * Put a Retry button on the toast that says it couldn't save. Leave it off
   * when the person can just press the button again (a sheet that is still open).
   */
  retry?: boolean;
}

/** The toast when a save fails, as on the Feedback board. */
export const SAVE_FAILED = "Couldn’t save. Check your connection.";

/**
 * Returns a function that saves a few fields of a piano (e.g. a sale or a new
 * rental end date), updates the store and its rental reminders, and confirms
 * with a toast saying `successMessage`. Resolves to whether it was saved. A
 * failure is a toast too, with Retry if `options.retry` says so.
 */
const useUpdatePiano = () => {
  const dispatch = useDispatch();

  return useCallback(
    async function update(
      piano: PianoItem,
      fields: PianoFieldsUpdate,
      successMessage: string,
      options: UpdateOptions = {}
    ): Promise<boolean> {
      let updated: PianoItem;
      try {
        updated = await updatePianoFields(piano.$id, fields);
      } catch (error) {
        console.warn("Could not save the piano:", error);
        showToast(SAVE_FAILED, {
          variant: "error",
          duration: "long",
          action: options.retry
            ? {
                label: "Retry",
                onPress: () => {
                  update(piano, fields, successMessage, options);
                },
              }
            : undefined,
        });
        return false;
      }

      dispatch(updatePianoItem(updated) as any);
      // The rental may have a new end date, or be over because it was sold
      await scheduleRentalDueNotification(updated);
      const { undo } = options;
      showToast(successMessage, {
        variant: "success",
        ...(undo
          ? {
              duration: "long" as const,
              action: {
                label: "Undo",
                onPress: () => {
                  update(updated, undo.fields, undo.message);
                },
              },
            }
          : {}),
      });
      return true;
    },
    [dispatch]
  );
};

export default useUpdatePiano;
