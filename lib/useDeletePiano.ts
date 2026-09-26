import { useCallback } from "react";
import { Alert, Platform, ToastAndroid } from "react-native";
import { useDispatch } from "react-redux";
import { cancelRentalNotification } from "@/app/services/notifications";
import { deletePianoEntry } from "@/lib/appwrite";
import { removePianoItems } from "@/redux/pianos/actions";
import { PianoItem } from "@/redux/pianos/types";

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
          Alert.alert(
            "Error",
            error instanceof Error
              ? `Error deleting piano entry: ${item.title} - ${error.message}`
              : "An unknown error occurred"
          );
          return;
        }

        await cancelRentalNotification(item.$id);
        onDeleted?.();
        dispatch(removePianoItems([item.$id]) as any);
        ToastAndroid.show(
          `Deleted ${item.title} successfully`,
          ToastAndroid.SHORT
        );
      };

      const message = `Are you sure you want to delete "${item.title}"? This cannot be undone.`;

      // Alert.alert does nothing on web
      if (Platform.OS === "web") {
        if (window.confirm(message)) deletePiano();
        return;
      }

      Alert.alert("Delete Piano", message, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: deletePiano },
      ]);
    },
    [dispatch]
  );
};

export default useDeletePiano;
