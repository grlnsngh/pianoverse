import { PianoFormState } from "@/utils/pianoForm";
import { Picker } from "@react-native-picker/picker";
import { addDays } from "date-fns";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import {
  categoryOptions,
  PIANO_CATEGORY,
  pianoCompaniesMakeList,
} from "../constants/Piano";
import CompanyAssociatedPicker from "./CompanyAssociatedPicker";
import DateField from "./DateField";
import FormField from "./FormField";
import PriceField from "./PriceField";

interface PianoFormFieldsProps {
  form: PianoFormState;
  onChange: (changes: Partial<PianoFormState>) => void;
  // The photo field, which differs between creating and editing
  photo: React.ReactNode;
}

const CATEGORY_SECTION_TITLES: Record<string, string> = {
  [PIANO_CATEGORY.RENTABLE]: "Rental Details",
  [PIANO_CATEGORY.WAREHOUSE]: "Warehouse Details",
  [PIANO_CATEGORY.EVENTS]: "Event Details",
  [PIANO_CATEGORY.ON_SALE]: "Sale Details",
};

/**
 * The fields of the Create and Edit screens: the basic information every
 * piano has, then the details of its category.
 */
const PianoFormFields: React.FC<PianoFormFieldsProps> = ({
  form,
  onChange,
  photo,
}) => (
  <>
    <View className="bg-black-200 rounded-2xl p-4 mb-6">
      <Text className="text-lg text-white font-psemibold mb-4">
        Basic Information
      </Text>

      <View className="space-y-2 mb-4">
        <Text className="text-base text-gray-100 font-pmedium">Category</Text>
        <View className="w-full h-16 px-4 bg-black-100 rounded-2xl border-2 border-black-200 flex flex-row items-center">
          <Picker
            selectedValue={form.category}
            style={styles.picker}
            onValueChange={(category) => onChange({ category })}
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
        {photo}
      </View>

      <FormField
        title="Title"
        placeholder="Enter Piano Title"
        value={form.title}
        handleChangeText={(title) => onChange({ title })}
      />

      <FormField
        title="Description"
        value={form.description}
        handleChangeText={(description) => onChange({ description })}
        placeholder="Enter additional details..."
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
          placeholderStyle={styles.pianoMakeText}
          selectedTextStyle={styles.pianoMakeText}
          containerStyle={styles.pianoMakeList}
          value={form.make}
          onChange={(item) => onChange({ make: item.value })}
          maxHeight={300}
        />
      </View>

      <CompanyAssociatedPicker
        value={form.companyAssociated}
        onChange={(companyAssociated) => onChange({ companyAssociated })}
      />

      <DateField
        title="Date of Purchase"
        value={form.dateOfPurchase}
        onChange={(dateOfPurchase) => onChange({ dateOfPurchase })}
      />
    </View>

    {!!form.category && (
      <View className="bg-black-200 rounded-2xl p-4 mb-6">
        <Text className="text-lg text-white font-psemibold mb-4">
          {CATEGORY_SECTION_TITLES[form.category]}
        </Text>

        {form.category === PIANO_CATEGORY.RENTABLE && (
          <>
            <FormField
              title="Customer Name"
              value={form.rentalCustomerName}
              handleChangeText={(rentalCustomerName) =>
                onChange({ rentalCustomerName })
              }
            />
            <FormField
              title="Customer Address"
              value={form.rentalCustomerAddress}
              handleChangeText={(rentalCustomerAddress) =>
                onChange({ rentalCustomerAddress })
              }
            />
            <FormField
              title="Customer Mobile Number"
              value={form.rentalCustomerMobileNumber}
              handleChangeText={(rentalCustomerMobileNumber) =>
                onChange({ rentalCustomerMobileNumber })
              }
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              maxLength={16}
              placeholder="98765 43210"
            />
            <DateField
              title="Rental Period Start Date"
              value={form.rentalStartDate}
              onChange={(rentalStartDate) => onChange({ rentalStartDate })}
            />
            <DateField
              title="Rental Period End Date"
              value={form.rentalEndDate}
              onChange={(rentalEndDate) => onChange({ rentalEndDate })}
              // A rental ends at least a day after it starts
              minimumDate={addDays(form.rentalStartDate, 1)}
            />
            <PriceField
              title="Rent Price"
              value={form.rentalPrice}
              onChangeValue={(rentalPrice) => onChange({ rentalPrice })}
            />
          </>
        )}

        {form.category === PIANO_CATEGORY.WAREHOUSE && (
          <DateField
            title="Stored Since Date"
            value={form.warehouseStoredSinceDate}
            onChange={(warehouseStoredSinceDate) =>
              onChange({ warehouseStoredSinceDate })
            }
          />
        )}

        {form.category === PIANO_CATEGORY.EVENTS && (
          <>
            <PriceField
              title="Purchase Price"
              value={form.eventPurchasePrice}
              onChangeValue={(eventPurchasePrice) =>
                onChange({ eventPurchasePrice })
              }
            />
            <FormField
              title="Purchased From"
              value={form.eventPurchaseFrom}
              handleChangeText={(eventPurchaseFrom) =>
                onChange({ eventPurchaseFrom })
              }
            />
            <FormField
              title="Model Number"
              value={form.eventModelNumber}
              handleChangeText={(eventModelNumber) =>
                onChange({ eventModelNumber })
              }
            />
            <FormField
              title="B Number"
              value={form.eventBNumber}
              handleChangeText={(eventBNumber) => onChange({ eventBNumber })}
            />
          </>
        )}

        {form.category === PIANO_CATEGORY.ON_SALE && (
          <>
            <FormField
              title="Purchase From"
              value={form.onSalePurchaseFrom}
              handleChangeText={(onSalePurchaseFrom) =>
                onChange({ onSalePurchaseFrom })
              }
            />
            <DateField
              title="Import Date"
              value={form.onSaleImportDate}
              onChange={(onSaleImportDate) => onChange({ onSaleImportDate })}
            />
            <PriceField
              title="Price"
              value={form.onSalePrice}
              onChangeValue={(onSalePrice) => onChange({ onSalePrice })}
            />
          </>
        )}
      </View>
    )}
  </>
);

const styles = StyleSheet.create({
  picker: {
    height: 60,
    width: "100%",
    color: "#f7fafc",
  },
  pianoMakeText: {
    color: "white",
  },
  pianoMakeList: {
    width: "90%",
    borderRadius: 16,
    left: 21,
  },
});

export default PianoFormFields;
