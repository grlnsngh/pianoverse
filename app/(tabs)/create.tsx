import { icons } from "@/constants";
import { useGlobalContext } from "@/context/GlobalProvider";
import { createPianoEntry } from "@/lib/appwrite";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { ProgressBar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import CompanyAssociatedPicker from "../components/CompanyAssociatedPicker";
import CustomButton from "../components/CustomButton";
import FormField from "../components/FormField";
import {
  categoryOptions,
  COMPANY_ASSOCIATED,
  PIANO_CATEGORY,
  pianoCompaniesMakeList,
} from "../constants/Piano";

interface ImageAsset {
  uri: string;
  fileSize: number;
  assetId?: string | null;
  width: number;
  height: number;
  type?: "image" | "video";
  fileName?: string | null;
  exif?: Record<string, any> | null;
  base64?: string | null;
  duration?: number | null;
  mimeType?: string;
}
interface FormState {
  category: string;
  title: string;
  description: string;
  image: ImageAsset | null;
  make: string;
  rentalCustomerName: string;
  rentalCustomerAddress: string;
  rentalCustomerMobileNumber: string;
  rentalStartDate: Date;
  rentalEndDate: Date;
  rentalPrice: number;
  warehouseStoredSinceDate: Date;
  eventPurchasePrice: number;
  eventPurchaseFrom: string;
  eventModelNumber: string;
  eventBNumber: string;
  onSalePurchaseFrom: string;
  onSaleImportDate: Date;
  onSalePrice: number;
  companyAssociated: string;
  dateOfPurchase: Date;
}

const Create = () => {
  const { user } = useGlobalContext();
  const params = useLocalSearchParams();
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<FormState>(() => {
    // If we have formData from params (coming back from review), use it
    if (params.formData) {
      try {
        const parsedForm = JSON.parse(params.formData as string);
        // Convert date strings back to Date objects
        return {
          ...parsedForm,
          dateOfPurchase: new Date(parsedForm.dateOfPurchase),
          rentalStartDate: new Date(parsedForm.rentalStartDate),
          rentalEndDate: new Date(parsedForm.rentalEndDate),
          warehouseStoredSinceDate: new Date(
            parsedForm.warehouseStoredSinceDate
          ),
          onSaleImportDate: new Date(parsedForm.onSaleImportDate),
        };
      } catch (error) {
        console.error("Error parsing form data:", error);
      }
    }

    // Default form state with sample data for testing
    return {
      category: "rentable",
      title: "Yamaha Grand Piano U3",
      description:
        "Beautiful Yamaha U3 grand piano in excellent condition. Perfect for concerts and professional performances.",
      image: null, // Keep null for image
      make: "Yamaha",
      rentalCustomerName: "John Smith",
      rentalCustomerAddress: "123 Music Street, Los Angeles, CA 90210",
      rentalCustomerMobileNumber: "+1-555-0123",
      rentalStartDate: new Date(),
      rentalEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      rentalPrice: 2500,
      warehouseStoredSinceDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      eventPurchasePrice: 15000,
      eventPurchaseFrom: "Piano World Store",
      eventModelNumber: "U3-2020",
      eventBNumber: "B-45678",
      onSalePurchaseFrom: "Music Center Inc",
      onSaleImportDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      onSalePrice: 18000,
      companyAssociated: COMPANY_ASSOCIATED.SHAMSHERSONS,
      dateOfPurchase: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
    };
  });

  const [showRentalStartDatePicker, setShowRentalStartDatePicker] =
    useState(false);
  const [showRentalEndDatePicker, setShowRentalEndDatePicker] = useState(false);
  const [
    showWarehouseStoredSinceDatePicker,
    setShowWarehouseStoredSinceDatePicker,
  ] = useState(false);
  const [showDateOfPurchasePicker, setShowDateOfPurchasePicker] =
    useState(false);

  const calculateProgress = () => {
    const basicFields = [
      form.category,
      form.title.trim(),
      form.description.trim(),
      form.image,
      form.make,
      form.companyAssociated,
      form.dateOfPurchase,
    ];

    const basicComplete = basicFields.every(
      (field) => field !== null && field !== undefined && field !== ""
    );

    let currentStep = 1;
    let totalSteps = 2;
    let stepName = "Basic Information";

    if (basicComplete) {
      currentStep = 2;
      stepName =
        form.category === PIANO_CATEGORY.RENTABLE
          ? "Rental Details"
          : form.category === PIANO_CATEGORY.WAREHOUSE
          ? "Warehouse Details"
          : form.category === PIANO_CATEGORY.EVENTS
          ? "Event Details"
          : form.category === PIANO_CATEGORY.ON_SALE
          ? "Sale Details"
          : "Category Details";
    }

    return {
      currentStep,
      totalSteps,
      stepName,
      progress: currentStep / totalSteps,
    };
  };

  const onDateOfPurchaseChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || form.dateOfPurchase;
    setShowDateOfPurchasePicker(false);
    setForm({ ...form, dateOfPurchase: currentDate });
  };

  const onRentalStartDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || form.rentalStartDate;
    setShowRentalStartDatePicker(false);
    setForm({ ...form, rentalStartDate: currentDate });
  };

  const onRentalEndDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || form.rentalEndDate;
    setShowRentalEndDatePicker(false);
    setForm({ ...form, rentalEndDate: currentDate });
  };

  const onWarehouseStoredSinceDateChange = (
    event: any,
    selectedDate?: Date
  ) => {
    const currentDate = selectedDate || form.warehouseStoredSinceDate;
    setShowWarehouseStoredSinceDatePicker(false);
    setForm({ ...form, warehouseStoredSinceDate: currentDate });
  };

  const openImagePicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const fileSize = blob.size; // File size in bytes

      const targetSize = 500 * 1024; // Target size in bytes (500 KB)
      let compress = 1.0;
      let compressedFileSize = fileSize;
      let compressedImageUri = imageUri;
      // Loop to adjust compression ratio
      while (compressedFileSize > targetSize && compress > 0) {
        compress -= 0.1;
        const compressedImage = await ImageManipulator.manipulateAsync(
          imageUri,
          [],
          {
            compress,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        const compressedResponse = await fetch(compressedImage.uri);
        const compressedBlob = await compressedResponse.blob();
        compressedFileSize = compressedBlob.size; // Compressed file size in bytes
        compressedImageUri = compressedImage.uri;
      }
      setForm({
        ...form,
        image: {
          ...result.assets[0],
          uri: compressedImageUri,
          fileSize: compressedFileSize,
        },
      });
    }
  };

  const handleReview = () => {
    // Check if basic details are provided
    const basicDetails = {
      category: form.category,
      title: form.title,
      description: form.description,
      image: form.image,
      make: form.make,
      companyAssociated: form.companyAssociated,
      dateOfPurchase: form.dateOfPurchase,
    };

    for (const [key, value] of Object.entries(basicDetails)) {
      if (!value) {
        Alert.alert("Error", `Please provide a valid ${key}.`);
        return;
      }
    }

    // Check category-specific details
    if (form.category === PIANO_CATEGORY.RENTABLE) {
      if (
        !form.rentalCustomerName.trim() ||
        !form.rentalCustomerAddress.trim() ||
        !form.rentalCustomerMobileNumber.trim() ||
        form.rentalPrice <= 0
      ) {
        Alert.alert("Error", "Please fill all rental details.");
        return;
      }
    } else if (form.category === PIANO_CATEGORY.WAREHOUSE) {
      // Warehouse might not need additional validation beyond basic
    } else if (form.category === PIANO_CATEGORY.EVENTS) {
      if (
        !form.eventPurchaseFrom.trim() ||
        !form.eventModelNumber.trim() ||
        !form.eventBNumber.trim()
      ) {
        Alert.alert("Error", "Please fill all event details.");
        return;
      }
    } else if (form.category === PIANO_CATEGORY.ON_SALE) {
      if (!form.onSalePurchaseFrom.trim() || form.onSalePrice <= 0) {
        Alert.alert("Error", "Please fill all sale details.");
        return;
      }
    }

    // Navigate to review screen with form data
    router.push({
      pathname: "/review",
      params: { formData: JSON.stringify(form) },
    });
  };

  const handleOnSubmit = async () => {
    const basicDetails = {
      users: user.$id,
      category: form.category,
      make: form.make,
      title: form.title,
      description: form.description,
      image_url: form.image,
      creator: user.accountId,
      company_associated: form.companyAssociated,
      date_of_purchase: form.dateOfPurchase.toDateString(),
    };

    // Check if all basic details are provided
    for (const [key, value] of Object.entries(basicDetails)) {
      if (!value) {
        Alert.alert("Error", `Please provide a valid ${key}.`);
        return;
      }
    }

    let finalDetails = { ...basicDetails };

    if (form.category === PIANO_CATEGORY.RENTABLE) {
      const rentalDetails = {
        rental_customer_name: form.rentalCustomerName,
        rental_customer_address: form.rentalCustomerAddress,
        rental_customer_mobile: form.rentalCustomerMobileNumber,
        rental_period_start: form.rentalStartDate.toDateString(),
        rental_period_end: form.rentalEndDate.toDateString(),
        rental_price: form.rentalPrice,
      };
      finalDetails = { ...finalDetails, ...rentalDetails };
    } else if (form.category === PIANO_CATEGORY.WAREHOUSE) {
      const warehouseDetails = {
        warehouse_since_date: form.warehouseStoredSinceDate.toDateString(),
      };
      finalDetails = { ...finalDetails, ...warehouseDetails };
    } else if (form.category === PIANO_CATEGORY.EVENTS) {
      const eventDetails = {
        event_purchase_price: 0,
        event_purchase_from: "",
        event_model_number: "",
        event_b_number: "",
      };
      finalDetails = { ...finalDetails, ...eventDetails };
    } else if (form.category === PIANO_CATEGORY.ON_SALE) {
      const onSaleDetails = {
        on_sale_purchase_from: "",
        on_sale_import_date: new Date().toDateString(),
        on_sale_price: 0,
      };
      finalDetails = { ...finalDetails, ...onSaleDetails };
    }

    try {
      setUploading(true);
      await createPianoEntry(finalDetails);
      router.push("/home");
      ToastAndroid.show(
        "Piano entry created successfully.",
        ToastAndroid.SHORT
      );
    } catch (error) {
      const errorMessage = (error as Error).message;
      Alert.alert("Error while uploading", errorMessage);
    } finally {
      setForm({
        category: PIANO_CATEGORY.RENTABLE,
        title: "",
        description: "",
        image: null,
        make: "",
        rentalCustomerName: "",
        rentalCustomerAddress: "",
        rentalCustomerMobileNumber: "",
        rentalStartDate: new Date(),
        rentalEndDate: new Date(),
        rentalPrice: 0,
        warehouseStoredSinceDate: new Date(),
        eventPurchasePrice: 0,
        eventPurchaseFrom: "",
        eventModelNumber: "",
        eventBNumber: "",
        onSalePurchaseFrom: "",
        onSaleImportDate: new Date(),
        onSalePrice: 0,
        companyAssociated: COMPANY_ASSOCIATED.SHAMSHERSONS,
        dateOfPurchase: new Date(),
      });

      setUploading(false);
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView>
        <View className="w-full flex justify-center px-4 my-6">
          <Text className="text-2xl text-white font-psemibold mb-4">
            Add Piano
          </Text>

          {/* Progress Bar */}
          <View className="mb-6">
            <Text className="text-base text-gray-100 font-pmedium mb-2">
              Form Progress
            </Text>
            <ProgressBar
              progress={calculateProgress().progress}
              color="#FFA001"
              style={{ height: 8, borderRadius: 4 }}
            />
            <Text className="text-sm text-gray-100 mt-1">
              Step {calculateProgress().currentStep} of{" "}
              {calculateProgress().totalSteps}: {calculateProgress().stepName}
            </Text>
          </View>

          {/* Basic Information Section */}
          <View className="bg-black-200 rounded-2xl p-4 mb-6">
            <Text className="text-lg text-white font-psemibold mb-4">
              Basic Information
            </Text>

            <View className="space-y-2 mb-4">
              <Text className="text-base text-gray-100 font-pmedium">
                Category
              </Text>
              <View className="w-full h-16 px-4 bg-black-100 rounded-2xl border-2 border-black-200 focus:border-secondary flex flex-row items-center">
                <Picker
                  selectedValue={form.category}
                  style={styles.picker}
                  onValueChange={(itemValue) =>
                    setForm({ ...form, category: itemValue })
                  }
                  dropdownIconColor="#f7fafc"
                >
                  {categoryOptions.map((option) => (
                    <Picker.Item
                      key={option.value}
                      label={option.label}
                      value={option.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-base text-gray-100 font-pmedium mb-2">
                Upload Image
              </Text>
              <TouchableOpacity onPress={openImagePicker}>
                {form.image ? (
                  <>
                    <Image
                      style={{ height: 180 }}
                      source={{ uri: form.image.uri }}
                      resizeMode="cover"
                      className="w-full h-64 rounded-2xl"
                    />
                    <TouchableOpacity
                      onPress={() => {
                        setForm({ ...form, image: null });
                      }}
                      style={{
                        position: "absolute",
                        top: 16,
                        right: 16,
                        backgroundColor: "rgba(0,0,0,0.5)",
                        borderRadius: 15,
                        width: 32,
                        height: 32,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Image
                        source={icons.close}
                        className="w-3 h-3 absolute"
                        tintColor="white"
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  </>
                ) : (
                  <View
                    style={{ height: 60 }}
                    className="w-full h-16 px-4 bg-black-100 rounded-2xl border-2 
                  border-black-200 flex justify-center items-center flex-row space-x-2"
                  >
                    <Image
                      source={icons.upload}
                      resizeMode="contain"
                      alt="upload"
                      className="w-5 h-5"
                    />
                    <Text className="text-sm text-gray-100 font-pmedium">
                      Choose a file
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <FormField
              title="Title"
              placeholder="Enter Piano Title"
              value={form.title}
              handleChangeText={(e) => setForm({ ...form, title: e })}
            />

            <FormField
              title="Description"
              value={form.description}
              handleChangeText={(e) => setForm({ ...form, description: e })}
              placeholder="Enter additional details..."
            />

            <Text className="text-base text-gray-100 font-pmedium mb-2">
              Make
            </Text>
            <View className="w-full px-4 py-5 bg-black-100 rounded-2xl border-2 border-black-200 focus:border-secondary">
              <Dropdown
                data={pianoCompaniesMakeList}
                search
                labelField="label"
                valueField="value"
                placeholder="Select piano make"
                searchPlaceholder="Search..."
                placeholderStyle={styles.pianoMakePlaceholderStyle}
                selectedTextStyle={styles.pianoMakeSelectedTextStyle}
                containerStyle={{
                  width: "90%",
                  borderRadius: 16,
                  left: 21,
                }}
                value={form.make}
                onChange={(item) => setForm({ ...form, make: item.value })}
                maxHeight={300}
              />
            </View>

            <CompanyAssociatedPicker form={form} setForm={setForm} />

            <View>
              <FormField
                title="Date of Purchase"
                value={form.dateOfPurchase.toDateString()}
                handleChangeText={() => {}}
                onFocus={() => setShowDateOfPurchasePicker(true)}
              />
              {showDateOfPurchasePicker && (
                <DateTimePicker
                  value={form.dateOfPurchase}
                  mode="date"
                  display="default"
                  onChange={onDateOfPurchaseChange}
                />
              )}
            </View>
          </View>

          {/* Category-Specific Details Section */}
          {form.category && (
            <View className="bg-black-200 rounded-2xl p-4 mb-6">
              <Text className="text-lg text-white font-psemibold mb-4">
                {form.category === PIANO_CATEGORY.RENTABLE && "Rental Details"}
                {form.category === PIANO_CATEGORY.WAREHOUSE &&
                  "Warehouse Details"}
                {form.category === PIANO_CATEGORY.EVENTS && "Event Details"}
                {form.category === PIANO_CATEGORY.ON_SALE && "Sale Details"}
              </Text>

              {form.category === PIANO_CATEGORY.RENTABLE && (
                <>
                  <FormField
                    title="Customer Name"
                    value={form.rentalCustomerName}
                    handleChangeText={(e) =>
                      setForm({ ...form, rentalCustomerName: e })
                    }
                  />
                  <FormField
                    title="Customer Address"
                    value={form.rentalCustomerAddress}
                    handleChangeText={(e) => {
                      setForm({ ...form, rentalCustomerAddress: e });
                    }}
                  />
                  <FormField
                    title="Customer Mobile Number"
                    value={form.rentalCustomerMobileNumber}
                    handleChangeText={(e) => {
                      setForm({ ...form, rentalCustomerMobileNumber: e });
                    }}
                    keyboardType="numeric"
                  />

                  <View>
                    <FormField
                      title="Rental Period Start Date"
                      value={form.rentalStartDate.toDateString()}
                      handleChangeText={() => {}}
                      onFocus={() => setShowRentalStartDatePicker(true)}
                    />
                    {showRentalStartDatePicker && (
                      <DateTimePicker
                        value={form.rentalStartDate}
                        mode="date"
                        display="default"
                        onChange={onRentalStartDateChange}
                      />
                    )}
                  </View>
                  <View>
                    <FormField
                      title="Rental Period End Date"
                      value={form.rentalEndDate.toDateString()}
                      handleChangeText={() => {}}
                      onFocus={() => setShowRentalEndDatePicker(true)}
                    />
                    {showRentalEndDatePicker && (
                      <DateTimePicker
                        value={form.rentalEndDate}
                        mode="date"
                        display="default"
                        onChange={onRentalEndDateChange}
                      />
                    )}
                  </View>
                  <FormField
                    title="Rent Price"
                    value={form.rentalPrice.toString()}
                    handleChangeText={(e) => {
                      const numericValue = parseFloat(e);
                      if (!isNaN(numericValue)) {
                        setForm({ ...form, rentalPrice: numericValue });
                      }
                    }}
                    keyboardType="numeric"
                  />
                </>
              )}

              {form.category === PIANO_CATEGORY.WAREHOUSE && (
                <View>
                  <FormField
                    title="Stored Since Date"
                    value={form.warehouseStoredSinceDate.toDateString()}
                    handleChangeText={() => {}}
                    onFocus={() => setShowWarehouseStoredSinceDatePicker(true)}
                  />
                  {showWarehouseStoredSinceDatePicker && (
                    <DateTimePicker
                      value={form.warehouseStoredSinceDate}
                      mode="date"
                      display="default"
                      onChange={onWarehouseStoredSinceDateChange}
                    />
                  )}
                </View>
              )}

              {form.category === PIANO_CATEGORY.EVENTS && (
                <>
                  <FormField
                    title="Purchase Price"
                    value={form.eventPurchasePrice.toString()}
                    handleChangeText={(e) => {
                      const numericValue = parseFloat(e);
                      if (!isNaN(numericValue)) {
                        setForm({ ...form, eventPurchasePrice: numericValue });
                      }
                    }}
                    keyboardType="numeric"
                  />
                  <FormField
                    title="Purchased From"
                    value={form.eventPurchaseFrom}
                    handleChangeText={(e) => {
                      setForm({ ...form, eventPurchaseFrom: e });
                    }}
                  />
                  <FormField
                    title="Model Number"
                    value={form.eventModelNumber}
                    handleChangeText={(e) => {
                      setForm({ ...form, eventModelNumber: e });
                    }}
                  />
                  <FormField
                    title="B Number"
                    value={form.eventBNumber}
                    handleChangeText={(e) => {
                      setForm({ ...form, eventBNumber: e });
                    }}
                  />
                </>
              )}
              {form.category === PIANO_CATEGORY.ON_SALE && (
                <>
                  <FormField
                    title="Purchase From"
                    value={form.onSalePurchaseFrom}
                    handleChangeText={(e) => {
                      setForm({ ...form, onSalePurchaseFrom: e });
                    }}
                  />
                  <View>
                    <FormField
                      title="Import Date"
                      value={form.onSaleImportDate.toDateString()}
                      handleChangeText={() => {}}
                      onFocus={() =>
                        setShowWarehouseStoredSinceDatePicker(true)
                      }
                    />
                    {showWarehouseStoredSinceDatePicker && (
                      <DateTimePicker
                        value={form.onSaleImportDate}
                        mode="date"
                        display="default"
                        onChange={onWarehouseStoredSinceDateChange}
                      />
                    )}
                  </View>
                  <FormField
                    title="Price"
                    value={form.onSalePrice.toString()}
                    handleChangeText={(e) => {
                      const numericValue = parseFloat(e);
                      if (!isNaN(numericValue)) {
                        setForm({ ...form, onSalePrice: numericValue });
                      }
                    }}
                    keyboardType="numeric"
                  />
                </>
              )}
            </View>
          )}

          <CustomButton
            title={
              calculateProgress().currentStep === 2
                ? "Review & Publish"
                : "Continue Filling Form"
            }
            handlePress={
              calculateProgress().currentStep === 2 ? handleReview : () => {}
            }
            containerStyles="mt-7"
            isLoading={uploading}
            disabled={calculateProgress().currentStep !== 2}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  picker: {
    height: 60,
    width: "100%",
    color: "#f7fafc",
  },
  pianoMakePlaceholderStyle: {
    color: "white",
  },
  pianoMakeSelectedTextStyle: {
    color: "white",
  },
});

export default Create;
