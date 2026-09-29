import React, { useState } from "react";
import { Alert, View, Text, TouchableOpacity } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import {
  clearSelectedItems,
  removePianoItems,
  setBulkSelectionMode,
  selectAllItems,
} from "@/redux/pianos/actions";
import { deleteMultiplePianoEntries } from "@/lib/appwrite";
import { cancelRentalNotification } from "@/services/notifications";
import { icons } from "@/constants";
import { Image } from "expo-image";
import CustomAlertModal from "./CustomAlertModal";
import { showToast } from "@/utils/toast";

interface BulkOperationsBarProps {
  onRefresh: () => void;
}

const BulkOperationsBar: React.FC<BulkOperationsBarProps> = ({ onRefresh }) => {
  const dispatch = useDispatch();
  const { selectedItems, filteredItems, isBulkSelectionMode } = useSelector(
    (state: RootState) => state.pianos
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
      selectedItems.includes(item.$id)
    );

    const { deletedIds, failedIds } = await deleteMultiplePianoEntries(
      itemsToDelete
    );
    await Promise.all(deletedIds.map((id) => cancelRentalNotification(id)));
    dispatch(removePianoItems(deletedIds) as any);
    setIsDeleting(false);

    if (failedIds.length === 0) {
      // Clear selection and exit bulk mode
      dispatch(clearSelectedItems() as any);
      dispatch(setBulkSelectionMode(false) as any);
      showToast(
        `Deleted ${deletedIds.length} piano${deletedIds.length === 1 ? "" : "s"}`
      );
    } else {
      // The pianos that could not be deleted stay selected to try again
      Alert.alert(
        "Delete Failed",
        `Couldn't delete ${failedIds.length} of ${itemsToDelete.length} pianos. Check your connection and try again.`
      );
    }

    // Refresh the list
    onRefresh();
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      dispatch(clearSelectedItems() as any);
    } else {
      const allIds = filteredItems.map((item) => item.$id);
      dispatch(selectAllItems(allIds) as any);
    }
  };

  const handleCancelSelection = () => {
    dispatch(clearSelectedItems() as any);
    dispatch(setBulkSelectionMode(false) as any);
  };

  // Stay visible in selection mode, even with nothing selected, so it can
  // always be cancelled
  if (!isBulkSelectionMode) {
    return null;
  }

  return (
    <View className="bg-secondary px-4 py-3 flex-row items-center justify-between">
      <View className="flex-row items-center">
        <Text className="text-primary font-psemibold text-base mr-2">
          {selectedItems.length} selected
        </Text>
      </View>

      <View className="flex-row items-center space-x-2">
        {selectedItems.length !== filteredItems.length && (
          <TouchableOpacity
            onPress={handleSelectAll}
            className="bg-primary-300 w-10 h-10 rounded-lg items-center justify-center"
            activeOpacity={0.8}
            accessibilityLabel="Select all pianos"
          >
            <Image
              source={icons.grid}
              className="w-5 h-5"
              tintColor="#CDCDE0"
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleBulkDelete}
          disabled={selectedItems.length === 0 || isDeleting}
          className={`bg-red-600 w-10 h-10 rounded-lg items-center justify-center ${
            selectedItems.length === 0 || isDeleting ? "opacity-50" : ""
          }`}
          activeOpacity={0.8}
          accessibilityLabel="Delete selected pianos"
        >
          <Image source={icons.trash} className="w-5 h-5" tintColor="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCancelSelection}
          className="bg-gray-600 w-10 h-10 rounded-lg items-center justify-center"
          activeOpacity={0.8}
          accessibilityLabel="Leave selection mode"
        >
          <Image source={icons.close} className="w-5 h-5" tintColor="#ffffff" />
        </TouchableOpacity>
      </View>

      <CustomAlertModal
        visible={showDeleteModal}
        title="Confirm Bulk Delete"
        message={`Are you sure you want to delete ${
          selectedItems.length
        } piano${
          selectedItems.length > 1 ? "s" : ""
        }? This action cannot be undone.`}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        cancelText="Cancel"
        confirmText="Delete"
        type="destructive"
      />
    </View>
  );
};

export default BulkOperationsBar;
