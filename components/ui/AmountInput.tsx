import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts } from "@/constants/theme";

export type AmountInputProps = {
  /** The amount, in rupees. 0 shows an empty field. */
  value: number;
  onChangeValue: (value: number) => void;
  /** Read out for the field, such as "Amount" or "Sale price" */
  label: string;
  /** Room for the digits: 180 for a payment, 210 for a sale (the boards' widths) */
  width?: number;
  autoFocus?: boolean;
  testID?: string;
};

/** "1250000" as "12,50,000": Indian digit grouping, keeping any decimal part typed so far. */
const group = (raw: string) => {
  const [whole, decimals] = raw.split(".");
  const grouped = whole ? Number(whole).toLocaleString("en-IN") : "";
  return decimals === undefined ? grouped : `${grouped || "0"}.${decimals}`;
};

const toText = (value: number) => (value ? String(value) : "");

/**
 * The big amount at the top of the Record payment and Mark as sold sheets:
 * a grey ₹ and 44 px digits, grouped the Indian way as they are typed
 * ("1,20,000"). Keeps what is being typed (an empty field, "12.") while it
 * tells the form the number. Up to two decimals.
 */
const AmountInput = ({
  value,
  onChangeValue,
  label,
  width = 180,
  autoFocus,
  testID,
}: AmountInputProps) => {
  const [raw, setRaw] = useState(toText(value));

  // Follow changes made outside the field, such as the sheet opening again
  useEffect(() => {
    if ((parseFloat(raw) || 0) !== value) setRaw(toText(value));
  }, [value, raw]);

  const handleChangeText = (input: string) => {
    // Commas are only the grouping the field draws; a comma typed is ignored
    const cleaned = input.replace(/[,\s]/g, "");
    if (!/^\d*\.?\d{0,2}$/.test(cleaned)) return;
    setRaw(cleaned);
    onChangeValue(parseFloat(cleaned) || 0);
  };

  return (
    <View style={styles.row} testID={testID}>
      <Text style={styles.rupee} accessibilityElementsHidden importantForAccessibility="no">
        ₹
      </Text>
      <TextInput
        value={group(raw)}
        onChangeText={handleChangeText}
        placeholder="0"
        placeholderTextColor={colors.ink3}
        keyboardType="decimal-pad"
        accessibilityLabel={label}
        autoFocus={autoFocus}
        selectionColor={colors.ink}
        style={[styles.input, { width }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 8 },
  rupee: {
    fontFamily: fonts.bold,
    fontSize: 44,
    lineHeight: 56,
    letterSpacing: -1.1,
    color: colors.ink2,
  },
  input: {
    height: 56,
    padding: 0,
    fontFamily: fonts.bold,
    fontSize: 44,
    letterSpacing: -1.1,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
});

export default AmountInput;
