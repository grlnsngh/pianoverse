import { PianoItem } from "@/redux/pianos/types";
import { RootState } from "@/redux/store";
import { formatDate, printCategoryLabel } from "@/utils/ObjectManipulation";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { categoryOptions, PIANO_CATEGORY } from "../constants/Piano";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import FormField from "../components/FormField";
import { icons } from "@/constants";
import DateTimePicker from "@react-native-community/datetimepicker";
import CustomButton from "../components/CustomButton";
import * as ImageManipulator from "expo-image-manipulator";

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

const EditScreen = () => {
  const { id } = useLocalSearchParams();
  const pianosList = useSelector((state: RootState) => state.pianos.items);

  const filteredPiano: PianoItem | undefined = pianosList.find(
    (piano) => piano.$id === id
  );

  useEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: "#FFA001",
      },
      headerTintColor: "#161622",
      title: `Edit Piano`,
    });
  }, [id]);

  if (!filteredPiano) {
    return (
      <SafeAreaView className="bg-primary h-full">
        <Text className="text-lg text-white">Piano not found</Text>
      </SafeAreaView>
    );
  }

  const {
    title,
    image_url,
    category,
    make,
    description,
    rental_customer_name,
    rental_customer_address,
    rental_customer_mobile,
    rental_period_start,
    rental_period_end,
    rental_price,
    warehouse_since_date,
    event_purchase_price,
    event_purchase_from,
    event_model_number,
    event_b_number,
    event_company_associated,
    on_sale_purchase_from,
    on_sale_import_date,
    on_sale_price,
  } = filteredPiano;

  const navigation = useNavigation();
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<FormState>({
    category: category,
    title: title,
    description: description || "",
    image: null,
    make: make,
    rentalCustomerName: rental_customer_name || "",
    rentalCustomerAddress: rental_customer_address || "",
    rentalCustomerMobileNumber: rental_customer_mobile || "",
    rentalStartDate: rental_period_start
      ? new Date(rental_period_start)
      : new Date(),
    rentalEndDate: rental_period_end ? new Date(rental_period_end) : new Date(),
    rentalPrice: rental_price || 0,
    warehouseStoredSinceDate: warehouse_since_date
      ? new Date(warehouse_since_date)
      : new Date(),
    eventPurchasePrice: event_purchase_price || 0,
    eventPurchaseFrom: event_purchase_from || "",
    eventModelNumber: event_model_number || "",
    eventBNumber: event_b_number || "",
    eventCompanyAssociated: event_company_associated || "",
    onSalePurchaseFrom: on_sale_purchase_from || "",
    onSaleImportDate: on_sale_import_date
      ? new Date(on_sale_import_date)
      : new Date(),
    onSalePrice: on_sale_price || 0,
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
    ToastAndroid.show("Piano updated successfully", ToastAndroid.SHORT);
  };

  useEffect(() => {
    console.log("form.image", form.image);
  }, [form.image]);

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView>
        <View className="w-full flex min-h-[90vh] px-4 my-6">
          <View className=" space-y-2">
            <View>
              {form.image ? (
                <>
                  <Image
                    style={{ height: 300 }}
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
                <>
                  <Image
                    source={{ uri: image_url }}
                    className="w-full rounded-2xl"
                    resizeMode="cover"
                    style={{ height: 300 }}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      // setForm({ ...form, image: null });
                      openImagePicker();
                    }}
                    style={{
                      position: "absolute",
                      bottom: 16,
                      left: 16,
                      backgroundColor: "rgba(0,0,0,0.5)",
                      borderRadius: 15,
                      width: 32,
                      height: 32,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Image
                      source={icons.pencil}
                      className="w-3 h-3 absolute"
                      tintColor="white"
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <View className="space-y-2 mt-7">
            <Text className="text-base text-gray-100 font-pmedium">
              Category
            </Text>
            <View
              className="w-full h-16 px-4 bg-black-100 rounded-2xl border-2 
            border-black-200 focus:border-secondary flex flex-row items-center mt-3"
            >
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
              <FormField
                title="Company Associated"
                value={form.eventCompanyAssociated}
                handleChangeText={(e) => {
                  setForm({ ...form, eventCompanyAssociated: e });
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
            title="Save Changes"
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

export default EditScreen;
