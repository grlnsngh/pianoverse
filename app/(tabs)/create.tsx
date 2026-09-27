import { icons } from "@/constants";
import { useGlobalContext } from "@/context/GlobalProvider";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
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
import { rentalDetailsError } from "@/utils/validation";
import { addDays } from "date-fns";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import CompanyAssociatedPicker from "../components/CompanyAssociatedPicker";
import CustomButton from "../components/CustomButton";
import FormField from "../components/FormField";
import PriceField from "../components/PriceField";
import {
  categoryOptions,
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

const createEmptyForm = (): FormState => ({
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
  onSalePurchaseFrom: "",
  onSaleImportDate: new Date(),
  onSalePrice: 0,
  companyAssociated: "",
  dateOfPurchase: new Date(),
});

const Create = () => {
  const { user } = useGlobalContext();
  const params = useLocalSearchParams();
  const [imageError, setImageError] = useState(false);
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

    return createEmptyForm();
  });

  // Start over once the piano has been published from the review screen
  const createFormResetCount = useSelector(
    (state: RootState) => state.navigation.createFormResetCount
  );
  useEffect(() => {
    if (createFormResetCount > 0) setForm(createEmptyForm());
  }, [createFormResetCount]);

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

  // Reset image error when image changes
  useEffect(() => {
    setImageError(false);
  }, [form.image]);

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
    let totalSteps = 3;
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
      const problem = rentalDetailsError({
        mobile: form.rentalCustomerMobileNumber,
        startDate: form.rentalStartDate,
        endDate: form.rentalEndDate,
      });
      if (problem) {
        Alert.alert("Check the rental details", problem);
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

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView>
        <View className="w-full flex justify-center px-4 my-6">
          <Text className="text-2xl text-white font-psemibold mb-4">
            Add Piano
          </Text>

          {/* Step Progress Indicator */}
          <View className="mb-8 px-4">
            {/* Step Indicators with Connecting Lines */}
            <View className="flex-row items-center justify-center mb-4">
              {[1, 2, 3].map((step) => (
                <View key={step} className="flex-row items-center">
                  {/* Step Circle */}
                  <View
                    className={`w-8 h-8 rounded-full items-center justify-center border-2 ${
                      calculateProgress().currentStep > step
                        ? "bg-secondary border-secondary shadow-lg"
                        : calculateProgress().currentStep === step
                        ? "bg-secondary border-white shadow-lg"
                        : "bg-black-200 border-gray-600"
                    }`}
                  >
                    <Text
                      className={`font-psemibold text-xs ${
                        calculateProgress().currentStep >= step
                          ? "text-black-100"
                          : "text-gray-400"
                      }`}
                    >
                      {step}
                    </Text>
                  </View>

                  {/* Connecting Line (only between steps 1-2 and 2-3) */}
                  {step < 3 && (
                    <View className="w-12 mx-2">
                      <View className="h-1 bg-gray-600 rounded-full">
                        <View
                          className="h-full bg-secondary rounded-full"
                          style={{
                            width:
                              calculateProgress().currentStep > step
                                ? "100%"
                                : calculateProgress().currentStep === step
                                ? "50%"
                                : "0%",
                          }}
                        />
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Step Information */}
            <View className="text-center">
              <Text className="text-gray-100 text-base font-psemibold mb-1">
                Step {calculateProgress().currentStep} of{" "}
                {calculateProgress().totalSteps}
              </Text>
              <Text className="text-secondary text-sm font-pmedium">
                {calculateProgress().stepName}
              </Text>
            </View>
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
              <View className="w-full h-16 px-4 bg-black-100 rounded-2xl border-2 border-black-200 flex flex-row items-center">
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
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    maxLength={16}
                    placeholder="98765 43210"
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
                        // A rental ends at least a day after it starts
                        minimumDate={addDays(form.rentalStartDate, 1)}
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
            title={
              calculateProgress().currentStep === 2
                ? "Review & Publish"
                : "Continue Filling Form"
            }
            handlePress={
              calculateProgress().currentStep === 2 ? handleReview : () => {}
            }
            containerStyles="mt-7"
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
