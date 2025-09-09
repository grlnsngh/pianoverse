import { icons } from "@/constants";
import { useGlobalContext } from "@/context/GlobalProvider";
import { createPianoEntry } from "@/lib/appwrite";
import { Image } from "expo-image";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import CustomButton from "./components/CustomButton";
import { COMPANY_ASSOCIATED, PIANO_CATEGORY } from "./constants/Piano";

interface ReviewParams {
  formData?: string;
}

const Review = () => {
  const { user } = useGlobalContext();
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  const [uploading, setUploading] = useState(false);

  // Parse the form data from the navigation params
  const form = params.formData ? JSON.parse(params.formData as string) : {};

  // Hide the default header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handlePublish = async () => {
    const basicDetails = {
      users: user.$id,
      category: form.category,
      make: form.make,
      title: form.title,
      description: form.description,
      image_url: form.image,
      creator: user.accountId,
      company_associated: form.companyAssociated,
      date_of_purchase: form.dateOfPurchase,
    };

    let finalDetails = { ...basicDetails };

    if (form.category === PIANO_CATEGORY.RENTABLE) {
      const rentalDetails = {
        rental_customer_name: form.rentalCustomerName,
        rental_customer_address: form.rentalCustomerAddress,
        rental_customer_mobile: form.rentalCustomerMobileNumber,
        rental_period_start: form.rentalStartDate,
        rental_period_end: form.rentalEndDate,
        rental_price: form.rentalPrice,
      };
      finalDetails = { ...finalDetails, ...rentalDetails };
    } else if (form.category === PIANO_CATEGORY.WAREHOUSE) {
      const warehouseDetails = {
        warehouse_since_date: form.warehouseStoredSinceDate,
      };
      finalDetails = { ...finalDetails, ...warehouseDetails };
    } else if (form.category === PIANO_CATEGORY.EVENTS) {
      const eventDetails = {
        event_purchase_price: form.eventPurchasePrice,
        event_purchase_from: form.eventPurchaseFrom,
        event_model_number: form.eventModelNumber,
        event_b_number: form.eventBNumber,
      };
      finalDetails = { ...finalDetails, ...eventDetails };
    } else if (form.category === PIANO_CATEGORY.ON_SALE) {
      const onSaleDetails = {
        on_sale_purchase_from: form.onSalePurchaseFrom,
        on_sale_import_date: form.onSaleImportDate,
        on_sale_price: form.onSalePrice,
      };
      finalDetails = { ...finalDetails, ...onSaleDetails };
    }

    try {
      setUploading(true);
      await createPianoEntry(finalDetails);
      router.push("/home"); // Navigate to home tab
      ToastAndroid.show(
        "Piano entry created successfully.",
        ToastAndroid.SHORT
      );
    } catch (error) {
      const errorMessage = (error as Error).message;
      Alert.alert("Error while uploading", errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = () => {
    // Navigate back to create screen with the form data
    router.back();
  };

  return (
    <View className="bg-primary flex-1">
      {/* Custom Header */}
      <View className="bg-primary pt-12 pb-4 px-6 shadow-lg">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={handleEdit}
            className="w-10 h-10 bg-black-200 rounded-full items-center justify-center"
          >
            <Image
              source={icons.leftArrow}
              className="w-5 h-5"
              tintColor="#CDCDE0"
            />
          </TouchableOpacity>
          <Text className="text-xl text-white font-psemibold flex-1 text-center mr-10">
            Review & Confirm
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 py-4">
          {/* Progress Indicator */}
          <View className="mb-6">
            <View className="flex-row items-center justify-center mb-2">
              <View className="w-3 h-3 bg-secondary rounded-full mr-2"></View>
              <View className="w-8 h-1 bg-secondary rounded-full mr-2"></View>
              <View className="w-3 h-3 bg-secondary rounded-full"></View>
            </View>
            <Text className="text-center text-gray-100 text-sm font-pmedium">
              Step 3 of 3: Final Review
            </Text>
          </View>

          {/* Basic Information Card */}
          <View className="mb-6">
            <View className="flex-row items-center mb-4">
              <View className="w-8 h-8 bg-secondary/20 rounded-full items-center justify-center mr-3">
                <Text className="text-secondary font-psemibold text-sm">
                  📋
                </Text>
              </View>
              <Text className="text-lg text-white font-psemibold">
                Basic Information
              </Text>
            </View>

            <View className="bg-black-200 rounded-2xl p-5 shadow-lg">
              <View className="space-y-3">
                <View className="flex-row items-center py-2 border-b border-black-100/50">
                  <Text className="text-gray-100 font-pmedium w-24">
                    Category:
                  </Text>
                  <Text className="text-white font-psemibold flex-1">
                    {form.category}
                  </Text>
                </View>

                <View className="flex-row items-center py-2 border-b border-black-100/50">
                  <Text className="text-gray-100 font-pmedium w-24">
                    Title:
                  </Text>
                  <Text className="text-white font-psemibold flex-1">
                    {form.title}
                  </Text>
                </View>

                <View className="flex-row items-center py-2 border-b border-black-100/50">
                  <Text className="text-gray-100 font-pmedium w-24">Make:</Text>
                  <Text className="text-white font-psemibold flex-1">
                    {form.make}
                  </Text>
                </View>

                <View className="flex-row items-center py-2 border-b border-black-100/50">
                  <Text className="text-gray-100 font-pmedium w-24">
                    Company:
                  </Text>
                  <Text className="text-white font-psemibold flex-1">
                    {form.companyAssociated}
                  </Text>
                </View>

                <View className="flex-row items-center py-2">
                  <Text className="text-gray-100 font-pmedium w-24">
                    Purchase:
                  </Text>
                  <Text className="text-white font-psemibold flex-1">
                    {new Date(form.dateOfPurchase).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              {form.image && (
                <View className="mt-4 pt-4 border-t border-black-100/50">
                  <Text className="text-gray-100 font-pmedium mb-3">
                    Piano Image:
                  </Text>
                  <View className="rounded-xl overflow-hidden shadow-md">
                    <Image
                      source={{ uri: form.image.uri }}
                      className="w-full h-48"
                      resizeMode="cover"
                    />
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Category-Specific Details Card */}
          {form.category && (
            <View className="mb-6">
              <View className="flex-row items-center mb-4">
                <View className="w-8 h-8 bg-secondary/20 rounded-full items-center justify-center mr-3">
                  <Text className="text-secondary font-psemibold text-sm">
                    {form.category === PIANO_CATEGORY.RENTABLE && "🏠"}
                    {form.category === PIANO_CATEGORY.WAREHOUSE && "📦"}
                    {form.category === PIANO_CATEGORY.EVENTS && "🎹"}
                    {form.category === PIANO_CATEGORY.ON_SALE && "💰"}
                  </Text>
                </View>
                <Text className="text-lg text-white font-psemibold">
                  {form.category === PIANO_CATEGORY.RENTABLE &&
                    "Rental Details"}
                  {form.category === PIANO_CATEGORY.WAREHOUSE &&
                    "Warehouse Details"}
                  {form.category === PIANO_CATEGORY.EVENTS && "Event Details"}
                  {form.category === PIANO_CATEGORY.ON_SALE && "Sale Details"}
                </Text>
              </View>

              <View className="bg-black-200 rounded-2xl p-5 shadow-lg">
                <View className="space-y-3">
                  {form.category === PIANO_CATEGORY.RENTABLE && (
                    <>
                      <View className="flex-row items-center py-2 border-b border-black-100/50">
                        <Text className="text-gray-100 font-pmedium w-28">
                          Customer:
                        </Text>
                        <Text className="text-white font-psemibold flex-1">
                          {form.rentalCustomerName}
                        </Text>
                      </View>

                      <View className="flex-row items-center py-2 border-b border-black-100/50">
                        <Text className="text-gray-100 font-pmedium w-28">
                          Address:
                        </Text>
                        <Text className="text-white font-psemibold flex-1">
                          {form.rentalCustomerAddress}
                        </Text>
                      </View>

                      <View className="flex-row items-center py-2 border-b border-black-100/50">
                        <Text className="text-gray-100 font-pmedium w-28">
                          Mobile:
                        </Text>
                        <Text className="text-white font-psemibold flex-1">
                          {form.rentalCustomerMobileNumber}
                        </Text>
                      </View>

                      <View className="flex-row items-center py-2 border-b border-black-100/50">
                        <Text className="text-gray-100 font-pmedium w-28">
                          Start Date:
                        </Text>
                        <Text className="text-white font-psemibold flex-1">
                          {new Date(form.rentalStartDate).toLocaleDateString()}
                        </Text>
                      </View>

                      <View className="flex-row items-center py-2 border-b border-black-100/50">
                        <Text className="text-gray-100 font-pmedium w-28">
                          End Date:
                        </Text>
                        <Text className="text-white font-psemibold flex-1">
                          {new Date(form.rentalEndDate).toLocaleDateString()}
                        </Text>
                      </View>

                      <View className="flex-row items-center py-2">
                        <Text className="text-gray-100 font-pmedium w-28">
                          Price:
                        </Text>
                        <Text className="text-secondary font-psemibold flex-1 text-lg">
                          ${form.rentalPrice}
                        </Text>
                      </View>
                    </>
                  )}

                  {form.category === PIANO_CATEGORY.WAREHOUSE && (
                    <View className="flex-row items-center py-2">
                      <Text className="text-gray-100 font-pmedium w-28">
                        Stored Since:
                      </Text>
                      <Text className="text-white font-psemibold flex-1">
                        {new Date(
                          form.warehouseStoredSinceDate
                        ).toLocaleDateString()}
                      </Text>
                    </View>
                  )}

                  {form.category === PIANO_CATEGORY.EVENTS && (
                    <>
                      <View className="flex-row items-center py-2 border-b border-black-100/50">
                        <Text className="text-gray-100 font-pmedium w-28">
                          Purchase Price:
                        </Text>
                        <Text className="text-secondary font-psemibold flex-1">
                          ${form.eventPurchasePrice}
                        </Text>
                      </View>

                      <View className="flex-row items-center py-2 border-b border-black-100/50">
                        <Text className="text-gray-100 font-pmedium w-28">
                          Purchased From:
                        </Text>
                        <Text className="text-white font-psemibold flex-1">
                          {form.eventPurchaseFrom}
                        </Text>
                      </View>

                      <View className="flex-row items-center py-2 border-b border-black-100/50">
                        <Text className="text-gray-100 font-pmedium w-28">
                          Model:
                        </Text>
                        <Text className="text-white font-psemibold flex-1">
                          {form.eventModelNumber}
                        </Text>
                      </View>

                      <View className="flex-row items-center py-2">
                        <Text className="text-gray-100 font-pmedium w-28">
                          B Number:
                        </Text>
                        <Text className="text-white font-psemibold flex-1">
                          {form.eventBNumber}
                        </Text>
                      </View>
                    </>
                  )}

                  {form.category === PIANO_CATEGORY.ON_SALE && (
                    <>
                      <View className="flex-row items-center py-2 border-b border-black-100/50">
                        <Text className="text-gray-100 font-pmedium w-28">
                          Purchase From:
                        </Text>
                        <Text className="text-white font-psemibold flex-1">
                          {form.onSalePurchaseFrom}
                        </Text>
                      </View>

                      <View className="flex-row items-center py-2 border-b border-black-100/50">
                        <Text className="text-gray-100 font-pmedium w-28">
                          Import Date:
                        </Text>
                        <Text className="text-white font-psemibold flex-1">
                          {new Date(form.onSaleImportDate).toLocaleDateString()}
                        </Text>
                      </View>

                      <View className="flex-row items-center py-2">
                        <Text className="text-gray-100 font-pmedium w-28">
                          Price:
                        </Text>
                        <Text className="text-secondary font-psemibold flex-1 text-lg">
                          ${form.onSalePrice}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View className="mb-8">
            <View className="bg-black-200 rounded-2xl p-6 shadow-lg">
              <Text className="text-center text-gray-100 text-sm mb-4 font-pmedium">
                Ready to publish your piano entry?
              </Text>

              <View className="flex-row space-x-4">
                <TouchableOpacity
                  onPress={handleEdit}
                  className="flex-1 bg-gray-600 rounded-xl py-4 items-center border border-gray-500"
                >
                  <Text className="text-white font-psemibold text-base">
                    ✏️ Edit
                  </Text>
                </TouchableOpacity>

                <View className="flex-1">
                  <CustomButton
                    title="🚀 Publish"
                    handlePress={handlePublish}
                    isLoading={uploading}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default Review;
