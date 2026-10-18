import React, { useRef } from "react";
import { Pressable, Text, TextInput, TextInputProps, TextStyle, View, TextInputInstance } from "react-native";
import { fonts, spacing, type } from "@/constants/theme";
import { useGroup } from "./Group";
import Icon from "./Icon";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import useTextScale from "@/lib/useTextScale";

const CHEVRON_SIZE = 18;
const KEYBOARDS_WITH_DIGITS = ["numeric", "number-pad", "decimal-pad", "phone-pad"];

export type FormRowProps = {
  label: string;
  /** For a row that opens a picker: what is chosen now */
  value?: string;
  /** Shown in grey when there is no value, or as the hint in an empty input */
  placeholder?: string;
  /** Makes the whole row a button. Shows a chevron unless `chevron` says not to. */
  onPress?: () => void;
  chevron?: boolean;
  /** Makes the row a text field. `strong` sets amounts in semibold. */
  input?: Omit<TextInputProps, "style" | "placeholder" | "placeholderTextColor"> & {
    strong?: boolean;
  };
  /** Grey text before the input, such as ₹ or +91 */
  prefix?: string;
  /** Overrides the group's label column width, for one long label */
  labelWidth?: number;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * A label with what belongs to it: a value that opens a picker, or a text
 * field. Lives in a Group, which sets its height and the width of the label
 * column, and draws the line between rows.
 *
 * Both heights are the least a row is. With a big Font size a row on a page
 * puts its label above its value instead of beside it (the column would cut
 * the label), and so does a text field in a sheet (its hint would be cut);
 * a row in a sheet that opens a picker keeps its label whole and lets the value
 * wrap. Short of that the label column grows with the text, so a label that
 * fit still does.
 */
const FormRow = ({
  label,
  value,
  placeholder,
  onPress,
  chevron,
  input,
  prefix,
  labelWidth,
  accessibilityLabel,
  testID,
}: FormRowProps) => {
  const colors = useColors();
  const styles = useStyles();
  const group = useGroup();
  const { fontScale, large } = useTextScale();
  const inputRef = useRef<TextInputInstance>(null);
  const showChevron = chevron ?? !!onPress;
  const columnWidth = labelWidth ?? group.labelWidth;
  // Label above value: on a page, and for a text field in a sheet, whose hint has to be read
  const stacked = large && (!group.inSheet || !!input);
  const digits =
    !!input?.keyboardType && KEYBOARDS_WITH_DIGITS.includes(input.keyboardType);

  const labelStyle: TextStyle[] = [stacked ? styles.labelStacked : styles.label];
  if (stacked) {
    // The label sits above the value, so it needs no column
  } else if (group.inSheet) {
    // The value is pushed right; with big text the label keeps its words together
    // (up to half the row) and the value is what wraps
    if (large) labelStyle.push(styles.labelHalf);
  } else {
    // On a page the labels line up in a column that grows with the text
    labelStyle.push({ width: Math.round(columnWidth * Math.max(1, fontScale)) });
  }

  const valueAlign: TextStyle = { textAlign: group.inSheet && !stacked ? "right" : "left" };
  // One line, unless the text is big: then it wraps rather than being cut
  const lines = large ? undefined : 1;

  const labelNode = (
    <Text style={labelStyle} numberOfLines={lines}>
      {label}
    </Text>
  );

  const prefixNode = prefix ? <Text style={styles.prefix}>{prefix}</Text> : null;

  const valueNode = input ? (
    <TextInput
      ref={inputRef}
      {...input}
      placeholder={placeholder}
      placeholderTextColor={colors.ink3}
      accessibilityLabel={input.accessibilityLabel ?? label}
      style={[
        styles.input,
        valueAlign,
        input.strong && { fontFamily: fonts.semibold },
        digits && { fontVariant: ["tabular-nums"] },
      ]}
    />
  ) : (
    <Text
      numberOfLines={lines}
      style={[styles.value, valueAlign, !value && { color: colors.ink3 }]}
    >
      {value || placeholder}
    </Text>
  );

  const chevronNode = showChevron ? (
    <Icon
      name="chevronRight"
      size={CHEVRON_SIZE}
      color={colors.chevron}
      strokeWidth={2}
    />
  ) : null;

  const body = stacked ? (
    <>
      <View style={styles.stack}>
        {labelNode}
        <View style={styles.valueLine}>
          {prefixNode}
          {valueNode}
        </View>
      </View>
      {chevronNode}
    </>
  ) : (
    <>
      {labelNode}
      {prefixNode}
      {valueNode}
      {chevronNode}
    </>
  );

  const rowStyle = [
    styles.row,
    { minHeight: group.inSheet ? 52 : 56 },
    stacked && styles.rowStacked,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          accessibilityLabel ?? [label, value || placeholder].filter(Boolean).join(", ")
        }
        testID={testID}
        style={({ pressed }) => [
          rowStyle,
          pressed && { backgroundColor: colors.grouped },
        ]}
      >
        {body}
      </Pressable>
    );
  }

  if (input) {
    // Tapping the label or the empty space focuses the field, like a <label>
    return (
      <Pressable
        onPress={() => inputRef.current?.focus()}
        accessible={false}
        testID={testID}
        style={rowStyle}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View style={rowStyle} testID={testID}>
      {body}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    // Nothing at 100%, where a line of 22 sits in a row of 52 or 56; room above
    // and below the text once it wraps and the row grows
    paddingVertical: spacing.sm,
  },
  rowStacked: { paddingVertical: spacing.md },
  label: { ...type.body, flexShrink: 0, color: colors.ink2 },
  labelStacked: { ...type.secondary, color: colors.ink2 },
  labelHalf: { flexShrink: 0, maxWidth: "50%" },
  stack: { flex: 1, minWidth: 0, gap: 2 },
  valueLine: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  prefix: { ...type.bodyMedium, color: colors.ink2 },
  value: { ...type.bodyMedium, flexGrow: 1, flexShrink: 1, color: colors.ink },
  input: {
    ...type.bodyMedium,
    flex: 1,
    minWidth: 0,
    // As tall as the row, so a tap anywhere on it lands in the field
    alignSelf: "stretch",
    padding: 0,
    color: colors.ink,
    includeFontPadding: false,
  },
}));

export default FormRow;
