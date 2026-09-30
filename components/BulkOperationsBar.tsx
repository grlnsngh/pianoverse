import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import {
  clearSelectedItems,
  removePianoItems,
  setBulkSelectionMode,
} from "@/redux/pianos/actions";
import { deleteMultiplePianoEntries } from "@/lib/appwrite";
import { cancelRentalNotification } from "@/services/notifications";
import { Button, Dialog } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { showToast } from "@/utils/toast";

interface BulkOperationsBarProps {
  onRefresh: () => void;
}

const pianos = (count: number) =>
  `${count} ${count === 1 ? "piano" : "pianos"}`;

/**
 * The red Delete bar at the bottom of the Pianos tab while choosing pianos. It
 * takes the place of the tab bar. It asks before it deletes, and names how
 * many.
 */
const BulkOperationsBar: React.FC<BulkOperationsBarProps> = ({ onRefresh }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { selectedItems, filteredItems, isBulkSelectionMode } = useSelector(
    (state: RootState) => state.pianos,
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    setIsDeleting(true);
    const itemsToDelete = filteredItems.filter((item) =>
      selectedItems.includes(item.$id),
    );

    const { deletedIds, failedIds } =
      await deleteMultiplePianoEntries(itemsToDelete);
    await Promise.all(deletedIds.map((id) => cancelRentalNotification(id)));
    dispatch(removePianoItems(deletedIds) as any);
    setIsDeleting(false);

    if (failedIds.length === 0) {
      // Clear selection and exit bulk mode
      dispatch(clearSelectedItems() as any);
      dispatch(setBulkSelectionMode(false) as any);
      showToast(
        `Deleted ${deletedIds.length} piano${deletedIds.length === 1 ? "" : "s"}`,
      );
    } else {
      // The pianos that could not be deleted stay selected to try again
      Alert.alert(
        "Delete Failed",
        `Couldn't delete ${failedIds.length} of ${itemsToDelete.length} pianos. Check your connection and try again.`,
      );
    }

    // Refresh the list
    onRefresh();
  };

  // Only while choosing pianos. Leaving is Cancel in the bar at the top.
  if (!isBulkSelectionMode) {
    return null;
  }

  const count = selectedItems.length;
  const deleteLabel = count > 0 ? `Delete ${pianos(count)}` : "Delete pianos";

  return (
    <>
      <View
        style={[
          styles.bar,
          // 28 below the button on an iPhone with a home indicator, 16 elsewhere
          { paddingBottom: Math.max(insets.bottom - 6, spacing.lg) },
        ]}
      >
        <Button
          title={deleteLabel}
          variant="destructive"
          disabled={count === 0}
          loading={isDeleting}
          loadingTitle="Deleting"
          onPress={handleBulkDelete}
        />
      </View>

      <Dialog
        visible={showDeleteModal}
        title={`Delete ${pianos(count)}?`}
        message={`${
          count === 1
            ? "Its photos and payments are"
            : "Their photos and payments are"
        } removed too. This can’t be undone.`}
        actions={[
          {
            label: deleteLabel,
            tone: "destructive",
            onPress: handleConfirmDelete,
          },
          { label: "Cancel", onPress: () => setShowDeleteModal(false) },
        ]}
      />
    </>
  );
};

const styles = StyleSheet.create({
  bar: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.screen,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    backgroundColor: colors.page,
  },
});

export default BulkOperationsBar;
