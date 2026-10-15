import React from "react";
import { ScrollView } from "react-native";
import type { KeyboardTypeOptions, TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackBar from "@/components/BackBar";
import { FormRow, Group } from "@/components/ui";
import { spacing } from "@/constants/theme";
import useLetterhead from "@/lib/useLetterhead";
import { makeStyles } from "@/lib/ThemeContext";
import { LETTERHEAD_LIMITS, type LetterheadKey } from "@/utils/letterhead";

/** The details, in the order they are printed. */
const ROWS: {
  key: LetterheadKey;
  label: string;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps["autoCapitalize"];
}[] = [
  { key: "business", label: "Business", placeholder: "Business name", autoCapitalize: "words" },
  { key: "tagline", label: "What you do", placeholder: "Tuning and rentals" },
  { key: "address", label: "Address", placeholder: "Shop address", autoCapitalize: "words" },
  { key: "phone", label: "Phone", placeholder: "One or two numbers", keyboardType: "phone-pad" },
  { key: "email", label: "Email", placeholder: "Optional", keyboardType: "email-address", autoCapitalize: "none" },
  { key: "gst", label: "GST No.", placeholder: "Optional", autoCapitalize: "characters" },
  { key: "pan", label: "PAN", placeholder: "Optional", autoCapitalize: "characters" },
];

/**
 * The business details (from the LetterheadMake board's Details), opened from
 * the Letterhead screen: printed on a made letterhead, in the agreements'
 * terms and signatures, and on the forms when there is no letterhead. Saved
 * as they are typed, on this phone.
 */
const LetterheadDetails = () => {
  const styles = useStyles();
  const { details, updateDetails } = useLetterhead();
  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <BackBar title="Your details" fallback="/letterhead" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Group
          footer="On your letterhead, in the agreements, and on the forms when there is no letterhead. Leave any empty to write by hand. Kept on this phone only."
          labelWidth={100}
          style={styles.group}
        >
          {ROWS.map((row) => (
            <FormRow
              key={row.key}
              label={row.label}
              placeholder={row.placeholder}
              input={{
                value: details[row.key],
                onChangeText: (text: string) => updateDetails({ [row.key]: text }),
                maxLength: LETTERHEAD_LIMITS[row.key],
                keyboardType: row.keyboardType,
                autoCapitalize: row.autoCapitalize ?? "sentences",
                autoCorrect: false,
                returnKeyType: "done",
              }}
            />
          ))}
        </Group>
      </ScrollView>
    </SafeAreaView>
  );
};

const useStyles = makeStyles((colors) => ({
  page: { flex: 1, backgroundColor: colors.grouped },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl },
  group: { marginTop: spacing.lg },
}));

export default LetterheadDetails;
