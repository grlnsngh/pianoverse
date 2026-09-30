import React, { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import DateRow from "@/components/DateRow";
import MakePickerSheet from "@/components/MakePickerSheet";
import { FormRow, Group, PickerSheet } from "@/components/ui";
import { COMPANY_ASSOCIATED, pianoCompaniesMakeList } from "@/constants/Piano";
import { colors, fonts, radii, spacing } from "@/constants/theme";
import { PianoFormState } from "@/utils/pianoForm";

interface PianoBasicsFieldsProps {
  form: PianoFormState;
  onChange: (changes: Partial<PianoFormState>) => void;
  // The photos, which differ a little between creating and editing
  photo: React.ReactNode;
}

const MAKES = pianoCompaniesMakeList.map((make) => make.value);
const COMPANIES = Object.values(COMPANY_ASSOCIATED).map((company) => ({
  value: company,
  label: company,
}));

/**
 * What every piano has (Add1Basics board): its photos, then title, make,
 * company and purchase date in one panel and the notes in another. Make and
 * company open pickers and the date opens the calendar.
 */
const PianoBasicsFields: React.FC<PianoBasicsFieldsProps> = ({
  form,
  onChange,
  photo,
}) => {
  const [picker, setPicker] = useState<"make" | "company" | null>(null);

  return (
    <View>
      {photo}

      <Group style={styles.panel}>
        <FormRow
          label="Title"
          placeholder="Required"
          input={{
            value: form.title,
            onChangeText: (title) => onChange({ title }),
            autoCapitalize: "words",
            returnKeyType: "next",
          }}
        />
        <FormRow
          label="Make"
          value={form.make}
          placeholder="Choose"
          onPress={() => setPicker("make")}
        />
        <FormRow
          label="Company"
          value={form.companyAssociated}
          placeholder="Choose"
          onPress={() => setPicker("company")}
        />
        <DateRow
          label="Purchased"
          value={form.dateOfPurchase}
          onChange={(dateOfPurchase) => onChange({ dateOfPurchase })}
        />
      </Group>

      <View style={styles.notes}>
        <TextInput
          value={form.description}
          onChangeText={(description) => onChange({ description })}
          placeholder="Notes: condition, finish, service history"
          placeholderTextColor={colors.ink3}
          accessibilityLabel="Notes"
          multiline
          textAlignVertical="top"
          selectionColor={colors.ink}
          underlineColorAndroid="transparent"
          style={styles.notesInput}
        />
      </View>

      <MakePickerSheet
        visible={picker === "make"}
        makes={MAKES}
        value={form.make}
        onSelect={(make) => {
          onChange({ make });
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === "company"}
        title="Company"
        options={COMPANIES}
        value={form.companyAssociated}
        onSelect={(companyAssociated) => {
          onChange({ companyAssociated });
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  panel: { marginTop: spacing.xxl },
  notes: {
    marginTop: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  notesInput: {
    height: 88,
    padding: spacing.lg,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
});

export default PianoBasicsFields;
