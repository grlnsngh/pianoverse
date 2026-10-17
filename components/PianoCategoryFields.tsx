import { addDays } from "date-fns";
import React from "react";
import { Pressable, Text, View } from "react-native";
import DateRow from "@/components/DateRow";
import PriceRow from "@/components/PriceRow";
import { FormRow, Group, Icon, Segmented } from "@/components/ui";
import { COLUMN_LIMITS } from "@/constants/columnLimits";
import { categoryOptions, PIANO_CATEGORY } from "@/constants/Piano";
import { fonts, radii, spacing, type } from "@/constants/theme";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import { depositText, DEPOSIT_MONTHS, suggestedDeposit } from "@/utils/deposits";
import { rentalLengthPhrase } from "@/utils/dates";
import { categoryLabelOf } from "@/utils/pianoDisplay";
import { PianoFormState } from "@/utils/pianoForm";

interface PianoCategoryFieldsProps {
  form: PianoFormState;
  onChange: (changes: Partial<PianoFormState>) => void;
  /** The piano being edited holds a deposit: say what a new rental does with it */
  holdsDeposit?: boolean;
}

const SEGMENTS = categoryOptions.map((option) => ({
  value: option.value,
  label: categoryLabelOf(option.value),
}));

// "Bought from" and "Model number" need more room than "Customer"
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
  holdsDeposit = false,
}) => {
  const colors = useColors();
  const styles = useStyles();
  const length = rentalLengthPhrase(form.rentalStartDate, form.rentalEndDate);
  const suggested = suggestedDeposit(form.rentalPrice);

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
              maxLength: COLUMN_LIMITS.pianos.rental_customer_name,
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
              maxLength: COLUMN_LIMITS.pianos.rental_customer_address,
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
          <PriceRow
            label="Deposit"
            value={form.rentalDeposit}
            onChangeValue={(rentalDeposit) => onChange({ rentalDeposit })}
            placeholder="Optional"
          />
          {form.rentalDeposit > 0 && (
            <DateRow
              label="Received"
              sheetTitle="Deposit received on"
              value={form.depositReceivedOn}
              onChange={(depositReceivedOn) => onChange({ depositReceivedOn })}
              // It can't have been received in the future
              maximumDate={new Date()}
            />
          )}
        </Group>
      )}

      {form.category === PIANO_CATEGORY.RENTABLE && (
        <View style={styles.deposit}>
          {suggested > 0 && form.rentalDeposit !== suggested && (
            <Pressable
              onPress={() => onChange({ rentalDeposit: suggested })}
              accessibilityRole="button"
              accessibilityLabel={`Use ${DEPOSIT_MONTHS} months’ rent as the deposit, ${depositText(suggested)}`}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            >
              <Icon name="plus" size={16} color={colors.ink} strokeWidth={2.2} />
              <Text style={styles.chipText}>
                {DEPOSIT_MONTHS} months’ rent · {depositText(suggested)}
              </Text>
            </Pressable>
          )}
          <Text style={styles.note}>
            Optional. A deposit is refundable and held until the piano comes back. It is not counted as income. Leave it
            empty for no deposit.
          </Text>
          {holdsDeposit && (
            <Text style={styles.note}>
              Changing the start date starts a new rental. It starts with no deposit unless you change this one, and the
              old one is kept in Previous renters, not settled.
            </Text>
          )}
        </View>
      )}

      {form.category === PIANO_CATEGORY.EVENTS && (
        <Group style={styles.panel} labelWidth={WIDE_LABELS}>
          <FormRow
            label="Bought from"
            placeholder="Seller or dealer"
            input={{
              value: form.eventPurchaseFrom,
              onChangeText: (eventPurchaseFrom) => onChange({ eventPurchaseFrom }),
              autoCapitalize: "words",
              maxLength: COLUMN_LIMITS.pianos.event_purchase_from,
            }}
          />
          <FormRow
            label="Model number"
            placeholder="Required"
            input={{
              value: form.eventModelNumber,
              onChangeText: (eventModelNumber) => onChange({ eventModelNumber }),
              autoCapitalize: "characters",
              maxLength: COLUMN_LIMITS.pianos.event_model_number,
            }}
          />
          <FormRow
            label="B number"
            placeholder="Required"
            input={{
              value: form.eventBNumber,
              onChangeText: (eventBNumber) => onChange({ eventBNumber }),
              autoCapitalize: "characters",
              maxLength: COLUMN_LIMITS.pianos.event_b_number,
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
              maxLength: COLUMN_LIMITS.pianos.on_sale_purchase_from,
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

const useStyles = makeStyles((colors) => ({
  panel: { marginTop: spacing.xl },
  deposit: { marginTop: spacing.md, gap: spacing.sm },
  chip: {
    alignSelf: "flex-start",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
  },
  chipPressed: { backgroundColor: colors.grouped },
  chipText: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink },
  note: { ...type.caption, fontFamily: fonts.regular, marginHorizontal: spacing.lg, color: colors.ink2 },
}));

export default PianoCategoryFields;
