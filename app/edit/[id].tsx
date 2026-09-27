import { icons } from "@/constants";
import { SECONDARY_COLOR } from "@/constants/colors";
import {
  PianoEntryInput,
  toPianoItem,
  updatePianoEntry,
} from "@/lib/appwrite";
import { updatePianoItem } from "@/redux/pianos/actions";
import { PianoItem } from "@/redux/pianos/types";
import { RootState } from "@/redux/store";
import { parseStoredDate, toStoredDate } from "@/utils/dates";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { SafeAreaView } from "react-native-safe-area-context";
import { prepareImageForUpload } from "@/utils/image";
import { useDispatch, useSelector } from "react-redux";
import CompanyAssociatedPicker from "../components/CompanyAssociatedPicker";
import CustomButton from "../components/CustomButton";
import FormField from "../components/FormField";
import PriceField from "../components/PriceField";
import {
  categoryOptions,
  PIANO_CATEGORY,
  pianoCompaniesMakeList,
} from "../constants/Piano";
import { scheduleRentalDueNotification } from "../services/notifications";
import { showToast } from "@/utils/toast";

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
  companyAssociated: string;
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
  dateOfPurchase: Date;
}

const EditScreen = () => {
  const { id } = useLocalSearchParams();
  const pianosList = useSelector((state: RootState) => state.pianos.items);
  const user = useSelector((state: RootState) => state.users.user);
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const filteredPiano: PianoItem | undefined = pianosList.find(
    (piano) => piano.$id === id
  );

  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [existingImageError, setExistingImageError] = useState(false);

  const [form, setForm] = useState<FormState>({
    category: filteredPiano?.category || "",
    title: filteredPiano?.title || "",
    description: filteredPiano?.description || "",
    companyAssociated: filteredPiano?.company_associated || "",
    image: null,
    make: filteredPiano?.make || "",
    rentalCustomerName: filteredPiano?.rental_customer_name || "",
    rentalCustomerAddress: filteredPiano?.rental_customer_address || "",
    rentalCustomerMobileNumber: filteredPiano?.rental_customer_mobile || "",
    rentalStartDate:
      parseStoredDate(filteredPiano?.rental_period_start) ?? new Date(),
    rentalEndDate:
      parseStoredDate(filteredPiano?.rental_period_end) ?? new Date(),
    rentalPrice: filteredPiano?.rental_price || 0,
    warehouseStoredSinceDate:
      parseStoredDate(filteredPiano?.warehouse_since_date) ?? new Date(),
    eventPurchasePrice: filteredPiano?.event_purchase_price || 0,
    eventPurchaseFrom: filteredPiano?.event_purchase_from || "",
    eventModelNumber: filteredPiano?.event_model_number || "",
    eventBNumber: filteredPiano?.event_b_number || "",
    onSalePurchaseFrom: filteredPiano?.on_sale_purchase_from || "",
    onSaleImportDate:
      parseStoredDate(filteredPiano?.on_sale_import_date) ?? new Date(),
    onSalePrice: filteredPiano?.on_sale_price || 0,
    dateOfPurchase:
      parseStoredDate(filteredPiano?.date_of_purchase) ?? new Date(),
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
  const [showOnSaleImportDatePicker, setShowOnSaleImportDatePicker] =
    useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: SECONDARY_COLOR,
      },
      headerTintColor: "#161622",
      title: `Edit Piano`,
    });
  }, [id]);

  // Reset image error when image changes
  useEffect(() => {
    setImageError(false);
  }, [form.image]);

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
    company_associated,
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
    on_sale_purchase_from,
    on_sale_import_date,
    on_sale_price,
    date_of_purchase,
  } = filteredPiano;

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

  const onOnSaleImportDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || form.onSaleImportDate;
    setShowOnSaleImportDatePicker(false);
    setForm({ ...form, onSaleImportDate: currentDate });
  };

  const openImagePicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];

      // Check minimum dimensions to prevent too small cropped images
      const minWidth = 50;
      const minHeight = 50;
      if (asset.width < minWidth || asset.height < minHeight) {
        Alert.alert(
          "Image Too Small",
          `The cropped image is too small (${asset.width}x${asset.height}). Please select a larger area or choose a different image. Minimum size: ${minWidth}x${minHeight} pixels.`
        );
        return;
      }

      const image = await prepareImageForUpload(asset);
      setForm({ ...form, image });
    }
  };

  const handleOnSubmit = async () => {
    if (!user || !user.accountId) {
      Alert.alert("Error", "You must be logged in to update a piano entry.");
      return;
    }

    const basicDetails = {
      users: user.$id,
      category: form.category,
      make: form.make,
      title: form.title,
      description: form.description,
      company_associated: form.companyAssociated,
      image_url: form.image ?? image_url,
      creator: user.accountId,
      date_of_purchase: toStoredDate(form.dateOfPurchase),
    };

    // Check if all basic details are provided
    for (const [key, value] of Object.entries(basicDetails)) {
      if (!value) {
        Alert.alert("Error", `Please provide a valid ${key}.`);
        return;
      }
    }

    let finalDetails: PianoEntryInput = { ...basicDetails };

    if (form.category === PIANO_CATEGORY.RENTABLE) {
      const rentalDetails = {
        rental_customer_name: form.rentalCustomerName,
        rental_customer_address: form.rentalCustomerAddress,
        rental_customer_mobile: form.rentalCustomerMobileNumber,
        rental_period_start: toStoredDate(form.rentalStartDate),
        rental_period_end: toStoredDate(form.rentalEndDate),
        rental_price: form.rentalPrice,
      };
      finalDetails = { ...finalDetails, ...rentalDetails };
    } else if (form.category === PIANO_CATEGORY.WAREHOUSE) {
      const warehouseDetails = {
        warehouse_since_date: toStoredDate(form.warehouseStoredSinceDate),
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
        on_sale_import_date: toStoredDate(form.onSaleImportDate),
        on_sale_price: form.onSalePrice,
      };
      finalDetails = { ...finalDetails, ...onSaleDetails };
    }

    try {
      setUploading(true);
      const updatedPiano = await updatePianoEntry(
        id.toString(),
        finalDetails,
        image_url
      );
      // The end date or category may have changed
      await scheduleRentalDueNotification(updatedPiano);
      dispatch(updatePianoItem(toPianoItem(updatedPiano)) as any);
      if (router.canGoBack()) router.back();
      else router.replace("/home");
      showToast("Piano entry updated successfully");
    } catch (error) {
      const errorMessage = (error as Error).message;
      Alert.alert("Error while uploading", errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView>
        <View className="w-full flex justify-center px-4 my-6">
          {/* Basic Information Section */}
          <View className="bg-black-200 rounded-2xl p-4 mb-6">
            <Text className="text-lg text-white font-psemibold mb-4">
              Basic Information
            </Text>

            <View className="space-y-2 mb-4">
              <Text className="text-base text-gray-100 font-pmedium">
                Category
              </Text>
              <View
                className="w-full h-16 px-4 bg-black-100 rounded-2xl border-2 
            border-black-200 flex flex-row items-center mt-3"
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

            <View className="mb-4">
              <Text className="text-base text-gray-100 font-pmedium mb-2">
                Upload Image
              </Text>
              <TouchableOpacity onPress={openImagePicker}>
                {form.image ? (
                  <>
                    {imageError ? (
                      <View className="w-full h-64 rounded-2xl bg-black-100 items-center justify-center">
                        <Text className="text-gray-100 font-pmedium">
                          Failed to load image
                        </Text>
                        <Text className="text-gray-100 text-sm mt-2 text-center px-4">
                          The image may be corrupted or too small.
                        </Text>
                      </View>
                    ) : (
                      <Image
                        style={{ height: 180 }}
                        source={{ uri: form.image.uri }}
                        resizeMode="cover"
                        className="w-full h-64 rounded-2xl"
                        onError={() => setImageError(true)}
                      />
                    )}
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
                    {existingImageError ? (
                      <View
                        className="w-full rounded-2xl bg-black-100 items-center justify-center"
                        style={{ height: 60 }}
                      >
                        <Text className="text-gray-100 font-pmedium">
                          Failed to load image
                        </Text>
                        <Text className="text-gray-100 text-sm mt-2 text-center px-4">
                          The existing image may be corrupted.
                        </Text>
                      </View>
                    ) : (
                      <Image
                        source={{ uri: image_url }}
                        className="w-full rounded-2xl"
                        resizeMode="cover"
                        style={{ height: 180 }}
                      />
                    )}
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
              placeholder="Enter addition details ..."
            />

            <Text className="text-base text-gray-100 font-pmedium mb-2 mt-7">
              Make
            </Text>
            <View className="w-full px-4 py-5 bg-black-100 rounded-2xl border-2 border-black-200">
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
                  <PriceField
                    title="Rent Price"
                    value={form.rentalPrice}
                    onChangeValue={(rentalPrice) =>
                      setForm({ ...form, rentalPrice })
                    }
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
                  <PriceField
                    title="Purchase Price"
                    value={form.eventPurchasePrice}
                    onChangeValue={(eventPurchasePrice) =>
                      setForm({ ...form, eventPurchasePrice })
                    }
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
                      onFocus={() => setShowOnSaleImportDatePicker(true)}
                    />
                    {showOnSaleImportDatePicker && (
                      <DateTimePicker
                        value={form.onSaleImportDate}
                        mode="date"
                        display="default"
                        onChange={onOnSaleImportDateChange}
                      />
                    )}
                  </View>
                  <PriceField
                    title="Price"
                    value={form.onSalePrice}
                    onChangeValue={(onSalePrice) =>
                      setForm({ ...form, onSalePrice })
                    }
                  />
                </>
              )}
            </View>
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

export default EditScreen;
