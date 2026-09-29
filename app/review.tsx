import { icons } from "@/constants";
import { useGlobalContext } from "@/context/GlobalProvider";
import { createPianoEntry, toPianoItem } from "@/lib/appwrite";
import { resetCreateForm, setActiveTab } from "@/redux/navigation/actions";
import { addPianoItem } from "@/redux/pianos/actions";
import { Image } from "expo-image";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch } from "react-redux";
import { PIANO_CATEGORY } from "@/constants/Piano";
import {
  createEmptyPianoForm,
  parsePianoForm,
  photoUri,
  toPianoEntryInput,
} from "@/utils/pianoForm";
import { scheduleRentalDueNotification } from "@/services/notifications";
import { showToast } from "@/utils/toast";

const Review = () => {
  const { user } = useGlobalContext();
  const dispatch = useDispatch();
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // Parse the form data from the navigation params (once, not on every render)
  const form = useMemo(
    () =>
      params.formData
        ? parsePianoForm(params.formData as string)
        : createEmptyPianoForm(),
    [params.formData]
  );
  // The cover, and how many more photos there are
  const imageUri: string | undefined = form.photos[0]
    ? photoUri(form.photos[0])
    : undefined;
  const morePhotos = form.photos.length - 1;

  // Give a new image a fresh start, and stop showing "Loading image..." if it
  // hasn't loaded within 2 seconds
  useEffect(() => {
    setImageError(false);
    setImageLoading(false);
    if (!imageUri) return;

    const timeout = setTimeout(() => setImageLoading(false), 2000);
    return () => clearTimeout(timeout);
  }, [imageUri]);

  // Hide the default header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handlePublish = async () => {
    if (!user || !user.accountId) {
      Alert.alert("Error", "You must be logged in to publish a piano entry.");
      return;
    }

    try {
      setUploading(true);
      const createdPiano = await createPianoEntry(
        toPianoEntryInput(form, { user })
      );
      await scheduleRentalDueNotification(createdPiano);
      dispatch(addPianoItem(toPianoItem(createdPiano)) as any);
      dispatch(resetCreateForm() as any);
      dispatch(setActiveTab("home") as any);
      // Go back to the tabs, so Back can't return here and publish again
      if (router.canGoBack()) router.back();
      else router.replace("/home");
      showToast("Piano entry created successfully.");
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
          {/* Step Progress Indicator */}
          <View className="mb-8 px-4">
            {/* Step Indicators with Connecting Lines */}
            <View className="flex-row items-center justify-center mb-4">
              {[1, 2, 3].map((step) => (
                <View key={step} className="flex-row items-center">
                  {/* Step Circle */}
                  <View
                    className={`w-8 h-8 rounded-full items-center justify-center border-2 ${
                      step < 3
                        ? "bg-secondary border-secondary shadow-lg"
                        : "bg-secondary border-white shadow-lg"
                    }`}
                  >
                    <Text className="font-psemibold text-xs text-black-100">
                      {step}
                    </Text>
                  </View>

                  {/* Connecting Line (only between steps 1-2 and 2-3) */}
                  {step < 3 && (
                    <View className="w-12 mx-2">
                      <View className="h-1 bg-secondary rounded-full" />
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Step Information */}
            <View className="text-center">
              <Text className="text-gray-100 text-base font-psemibold mb-1">
                Step 3 of 3
              </Text>
              <Text className="text-secondary text-sm font-pmedium">
                Final Review
              </Text>
            </View>
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

              {imageUri && (
                <View className="mt-4 pt-4 border-t border-black-100/50">
                  <Text className="text-gray-100 font-pmedium mb-3">
                    Piano Image:
                  </Text>
                  <View className="rounded-xl overflow-hidden shadow-md">
                    {imageUri ? (
                      <>
                        {imageLoading && (
                          <View className="absolute inset-0 bg-black-100 items-center justify-center z-10">
                            <Text className="text-gray-100 font-pmedium">
                              Loading image...
                            </Text>
                          </View>
                        )}
                        {!imageError ? (
                          <Image
                            source={{ uri: imageUri }}
                            className="w-full h-48"
                            resizeMode="cover"
                            onError={() => {
                              setImageError(true);
                              setImageLoading(false);
                            }}
                            onLoad={() => {
                              setImageError(false);
                              setImageLoading(false);
                            }}
                            onLoadStart={() => setImageLoading(true)}
                          />
                        ) : (
                          <View className="w-full h-48 bg-black-100 items-center justify-center">
                            <Text className="text-gray-100 font-pmedium">
                              Failed to load image
                            </Text>
                            <Text className="text-gray-100 text-sm mt-2 text-center px-4">
                              The image may be corrupted, too small, or unable
                              to load.
                            </Text>
                          </View>
                        )}
                      </>
                    ) : null}
                  </View>
                  {morePhotos > 0 && (
                    <Text className="text-gray-100 font-pregular mt-2">
                      + {morePhotos} more photo{morePhotos === 1 ? "" : "s"}
                    </Text>
                  )}
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
              <Text className="text-center text-gray-100 text-base mb-6 font-psemibold">
                Ready to publish your piano entry?
              </Text>

              <View className="flex-row space-x-4">
                {/* Edit Button */}
                <TouchableOpacity
                  onPress={handleEdit}
                  className="flex-1 bg-gray-600 rounded-xl py-4 items-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-white font-psemibold text-base">
                    Edit
                  </Text>
                </TouchableOpacity>

                {/* Publish Button */}
                <TouchableOpacity
                  onPress={handlePublish}
                  disabled={uploading}
                  className={`flex-1 rounded-xl py-4 items-center ${
                    uploading ? "bg-gray-600 opacity-50" : "bg-secondary"
                  }`}
                  activeOpacity={0.7}
                >
                  {uploading ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator
                        size="small"
                        color="#fff"
                        className="mr-2"
                      />
                      <Text className="text-primary font-psemibold text-base">
                        Publishing...
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-primary font-psemibold text-base">
                      Publish
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Additional Info */}
              <Text className="text-center text-gray-400 text-xs mt-4 font-pmedium">
                You can edit your entry later from your profile
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default Review;
