import { addDays } from "date-fns";
import React from "react";
import { StyleSheet, View } from "react-native";
import DateRow from "@/components/DateRow";
import PriceRow from "@/components/PriceRow";
import { FormRow, Group, Segmented } from "@/components/ui";
import { categoryOptions, PIANO_CATEGORY } from "@/constants/Piano";
import { spacing } from "@/constants/theme";
import { rentalLengthPhrase } from "@/utils/dates";
import { categoryLabelOf } from "@/utils/pianoDisplay";
import { PianoFormState } from "@/utils/pianoForm";

interface PianoCategoryFieldsProps {
  form: PianoFormState;
  onChange: (changes: Partial<PianoFormState>) => void;
}

const SEGMENTS = categoryOptions.map((option) => ({
  value: option.value,
  label: categoryLabelOf(option.value),
}));

// "Purchase price" and "Bought from" need more room than "Customer"
const WIDE_LABELS = 112;

/**
 * How the piano will be used, and the details that go with it (Add2Details
 * board): a segmented choice of category, then a panel of the fields of that
 * category. The fields change with the choice; what was typed for another
 * category is kept in case the choice changes back.
 */
const PianoCategoryFields: React.FC<PianoCategoryFieldsProps> = ({
  form,
  onChange,
}) => {
  const length = rentalLengthPhrase(form.rentalStartDate, form.rentalEndDate);

  return (
    <View>
      <Segmented
        options={SEGMENTS}
        value={form.category}
        onChange={(category) => onChange({ category })}
        accessibilityLabel="Category"
      />

      {form.category === PIANO_CATEGORY.RENTABLE && (
        <Group
          style={styles.panel}
          footer={
            length
              ? `${length}. You’ll get reminders before it ends.`
              : undefined
          }
        >
          <FormRow
            label="Customer"
            placeholder="Full name"
            input={{
              value: form.rentalCustomerName,
              onChangeText: (rentalCustomerName) => onChange({ rentalCustomerName }),
              autoCapitalize: "words",
              textContentType: "name",
              autoComplete: "name",
            }}
          />
          <FormRow
            label="Mobile"
            // A number typed with its own country code needs no +91 in front
            prefix={form.rentalCustomerMobileNumber.trim().startsWith("+") ? undefined : "+91"}
            placeholder="98765 43210"
            input={{
              value: form.rentalCustomerMobileNumber,
              onChangeText: (rentalCustomerMobileNumber) =>
                onChange({ rentalCustomerMobileNumber }),
              keyboardType: "phone-pad",
              textContentType: "telephoneNumber",
              autoComplete: "tel",
              maxLength: 16,
            }}
          />
          <FormRow
            label="Address"
            placeholder="House, street, city"
            input={{
              value: form.rentalCustomerAddress,
              onChangeText: (rentalCustomerAddress) => onChange({ rentalCustomerAddress }),
              autoCapitalize: "words",
              textContentType: "fullStreetAddress",
            }}
          />
          <DateRow
            label="Starts"
            sheetTitle="Rental starts"
            value={form.rentalStartDate}
            onChange={(rentalStartDate) => onChange({ rentalStartDate })}
          />
          <DateRow
            label="Ends"
            sheetTitle="Rental ends"
            value={form.rentalEndDate}
            onChange={(rentalEndDate) => onChange({ rentalEndDate })}
            // A rental ends at least a day after it starts
            minimumDate={addDays(form.rentalStartDate, 1)}
          />
          <PriceRow
            label="Rent"
            value={form.rentalPrice}
            onChangeValue={(rentalPrice) => onChange({ rentalPrice })}
          />
        </Group>
      )}

      {form.category === PIANO_CATEGORY.EVENTS && (
        <Group style={styles.panel} labelWidth={WIDE_LABELS}>
          <PriceRow
            label="Purchase price"
            value={form.eventPurchasePrice}
            onChangeValue={(eventPurchasePrice) => onChange({ eventPurchasePrice })}
          />
          <FormRow
            label="Bought from"
            placeholder="Seller or dealer"
            input={{
              value: form.eventPurchaseFrom,
              onChangeText: (eventPurchaseFrom) => onChange({ eventPurchaseFrom }),
              autoCapitalize: "words",
            }}
          />
          <FormRow
            label="Model number"
            placeholder="Required"
            input={{
              value: form.eventModelNumber,
              onChangeText: (eventModelNumber) => onChange({ eventModelNumber }),
              autoCapitalize: "characters",
            }}
          />
          <FormRow
            label="B number"
            placeholder="Required"
            input={{
              value: form.eventBNumber,
              onChangeText: (eventBNumber) => onChange({ eventBNumber }),
              autoCapitalize: "characters",
            }}
          />
        </Group>
      )}

      {form.category === PIANO_CATEGORY.ON_SALE && (
        <Group style={styles.panel} labelWidth={WIDE_LABELS}>
          <PriceRow
            label="Sale price"
            value={form.onSalePrice}
            onChangeValue={(onSalePrice) => onChange({ onSalePrice })}
          />
          <FormRow
            label="Bought from"
            placeholder="Seller or dealer"
            input={{
              value: form.onSalePurchaseFrom,
              onChangeText: (onSalePurchaseFrom) => onChange({ onSalePurchaseFrom }),
              autoCapitalize: "words",
            }}
          />
          <DateRow
            label="Import date"
            value={form.onSaleImportDate}
            onChange={(onSaleImportDate) => onChange({ onSaleImportDate })}
          />
        </Group>
      )}

      {form.category === PIANO_CATEGORY.WAREHOUSE && (
        <Group style={styles.panel} labelWidth={WIDE_LABELS}>
          <DateRow
            label="Stored since"
            value={form.warehouseStoredSinceDate}
            onChange={(warehouseStoredSinceDate) =>
              onChange({ warehouseStoredSinceDate })
            }
          />
        </Group>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: { marginTop: spacing.xl },
});

export default PianoCategoryFields;
