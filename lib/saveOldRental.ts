import {
  createRentalHistory,
  isMissingTable,
  NewRentalHistory,
} from "@/lib/appwrite";
import { showToast } from "@/utils/toast";

/**
 * Keeps a rental that was just written over, in its piano's history. The
 * piano has been saved already, so a failure doesn't undo that: the person is
 * told, with Retry (the details are still in hand) unless the table isn't
 * there at all. Resolves to whether it was kept; `onSaved` runs then.
 */
const saveOldRental = async (
  entry: NewRentalHistory,
  onSaved: () => void
): Promise<boolean> => {
  try {
    await createRentalHistory(entry);
    onSaved();
    return true;
  } catch (error) {
    if (isMissingTable(error)) {
      showToast(
        "Saved, but the old rental wasn’t kept: rental_history isn’t set up in Appwrite yet.",
        {
          variant: "error",
          duration: "long",
        }
      );
    } else {
      console.warn("Could not keep the old rental:", error);
      showToast("Saved, but couldn’t keep the old rental in its history.", {
        variant: "error",
        duration: "long",
        action: {
          label: "Retry",
          onPress: () => void saveOldRental(entry, onSaved),
        },
      });
    }
    return false;
  }
};

export default saveOldRental;
