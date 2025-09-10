import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import {
  clearSelectedItems,
  setBulkSelectionMode,
  selectAllItems,
} from "@/redux/pianos/actions";
import { deleteMultiplePianoEntries } from "@/lib/appwrite";
import { icons } from "@/constants";
import { Image } from "expo-image";
import CustomAlertModal from "./CustomAlertModal";

interface BulkOperationsBarProps {
  onRefresh: () => void;
}

const BulkOperationsBar: React.FC<BulkOperationsBarProps> = ({ onRefresh }) => {
  const dispatch = useDispatch();
  const { selectedItems, filteredItems } = useSelector(
    (state: RootState) => state.pianos
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    try {
      const itemsToDelete = filteredItems.filter((item) =>
        selectedItems.includes(item.$id)
      );

      await deleteMultiplePianoEntries(itemsToDelete);

      // Clear selection and exit bulk mode
      dispatch(clearSelectedItems() as any);
      dispatch(setBulkSelectionMode(false) as any);

      // Refresh the list
      onRefresh();

      // Show success message (you might want to use a toast or another modal here)
      console.log(
        `Successfully deleted ${selectedItems.length} piano${
          selectedItems.length > 1 ? "s" : ""
        }`
      );
    } catch (error) {
      // Show error message (you might want to use a toast or another modal here)
      console.error(
        `Failed to delete items: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
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

  if (selectedItems.length === 0) {
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
          className="bg-red-600 w-10 h-10 rounded-lg items-center justify-center"
          activeOpacity={0.8}
        >
          <Image source={icons.trash} className="w-5 h-5" tintColor="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCancelSelection}
          className="bg-gray-600 w-10 h-10 rounded-lg items-center justify-center"
          activeOpacity={0.8}
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
