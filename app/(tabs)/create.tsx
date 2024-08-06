import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  TextInput,
  ToastAndroid,
} from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { icons } from "@/constants";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { useGlobalContext } from "@/context/GlobalProvider";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { createPianoEntry } from "@/lib/appwrite";
import { router } from "expo-router";
import * as ImageManipulator from "expo-image-manipulator";
import FormField from "../components/FormField";
import CustomButton from "../components/CustomButton";

const categoryOptions = [
  { label: "Rentable", value: "rentable" },
  { label: "Events", value: "events" },
  { label: "On Sale", value: "on_sale" },
  { label: "Warehouse", value: "warehouse" },
];
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
  eventCompanyAssociated: string;
  onSalePurchaseFrom: string;
  onSaleImportDate: Date;
  onSalePrice: number;
}

const Create = () => {
  const { user } = useGlobalContext();
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<FormState>({
    category: "rentable",
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
    eventCompanyAssociated: "",
    onSalePurchaseFrom: "",
    onSaleImportDate: new Date(),
    onSalePrice: 0,
  });

  const [showRentalStartDatePicker, setShowRentalStartDatePicker] =
    useState(false);
  const [showRentalEndDatePicker, setShowRentalEndDatePicker] = useState(false);
  const [
    showWarehouseStoredSinceDatePicker,
    setShowWarehouseStoredSinceDatePicker,
  ] = useState(false);

  const onRentalStartDateChange = (
    event: React.SyntheticEvent,
    selectedDate?: Date
  ) => {
    const currentDate = selectedDate || form.rentalStartDate;
    setShowRentalStartDatePicker(false);
    setForm({ ...form, rentalStartDate: currentDate });
  };

  const onRentalEndDateChange = (
    event: React.SyntheticEvent,
    selectedDate?: Date
  ) => {
    const currentDate = selectedDate || form.rentalEndDate;
    setShowRentalEndDatePicker(false);
    setForm({ ...form, rentalEndDate: currentDate });
  };

  const onWarehouseStoredSinceDateChange = (
    event: React.SyntheticEvent,
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

  const handleOnSubmit = async () => {
    const basicDetails = {
      users: user.$id,
      category: form.category,
      make: form.make,
      title: form.title,
      description: form.description,
      image_url: form.image,
    };

    // Check if all basic details are provided
    for (const [key, value] of Object.entries(basicDetails)) {
      if (!value) {
        Alert.alert("Error", `Please provide a valid ${key}.`);
        return;
      }
    }

    let finalDetails = { ...basicDetails };

    if (form.category === "rentable") {
      const rentalDetails = {
        rental_customer_name: form.rentalCustomerName,
        rental_customer_address: form.rentalCustomerAddress,
        rental_customer_mobile: form.rentalCustomerMobileNumber,
        rental_period_start: form.rentalStartDate.toDateString(),
        rental_period_end: form.rentalEndDate.toDateString(),
        rental_price: form.rentalPrice,
      };
      finalDetails = { ...finalDetails, ...rentalDetails };
    } else if (form.category === "warehouse") {
      const warehouseDetails = {
        warehouse_since_date: form.warehouseStoredSinceDate.toDateString(),
      };
      finalDetails = { ...finalDetails, ...warehouseDetails };
    } else if (form.category === "events") {
      const eventDetails = {
        event_purchase_price: 0,
        event_purchase_from: "",
        event_model_number: "",
        event_b_number: "",
        event_company_associated: "",
      };
      finalDetails = { ...finalDetails, ...eventDetails };
    } else if (form.category === "on_sale") {
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
        category: "rentable",
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
        eventCompanyAssociated: "",
        onSalePurchaseFrom: "",
        onSaleImportDate: new Date(),
        onSalePrice: 0,
      });

      setUploading(false);
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView>
        <View className="w-full flex justify-center min-h-[90vh] px-4 my-6">
          <Text className="text-2xl text-white font-psemibold">Add Piano</Text>

          <View className="space-y-2 mt-7">
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

          <FormField
            title="Make"
            value={form.make}
            handleChangeText={(e) => setForm({ ...form, make: e })}
            placeholder="Enter Piano Make"
          />

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
            placeholder="Enter addition details ..."
          />

          <View className="mt-7 space-y-2">
            <Text className="text-base text-gray-100 font-pmedium">
              Upload Image
            </Text>

            <TouchableOpacity onPress={openImagePicker}>
              {form.image ? (
                <>
                  <Image
                    style={{ height: 120 }}
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

          {form.category === "rentable" && (
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

          {form.category === "warehouse" && (
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

          {form.category === "events" && (
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
              <FormField
                title="Company Associated"
                value={form.eventCompanyAssociated}
                handleChangeText={(e) => {
                  setForm({ ...form, eventCompanyAssociated: e });
                }}
              />
            </>
          )}
          {form.category === "on_sale" && (
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
                  onFocus={() => setShowWarehouseStoredSinceDatePicker(true)}
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

          <CustomButton
            title="Submit & Publish"
            handlePress={handleOnSubmit}
            containerStyles="mt-7"
            isLoading={uploading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  picker: {
    height: 50,
    width: "100%",
    color: "#f7fafc",
  },
});

export default Create;
