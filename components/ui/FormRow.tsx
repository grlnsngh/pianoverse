import React, { useRef } from "react";
import {
  Pressable,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
} from "react-native";
import { fonts, spacing, type } from "@/constants/theme";
import { useGroup } from "./Group";
import Icon from "./Icon";
import { makeStyles, useColors } from "@/lib/ThemeContext";

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
  const inputRef = useRef<TextInput>(null);
  const showChevron = chevron ?? !!onPress;
  const columnWidth = labelWidth ?? group.labelWidth;
  const digits =
    !!input?.keyboardType && KEYBOARDS_WITH_DIGITS.includes(input.keyboardType);

  const labelStyle: TextStyle[] = [styles.label];
  // On a page the labels line up in a column. In a sheet the value is pushed right.
  if (!group.inSheet) labelStyle.push({ width: columnWidth });

  const valueAlign: TextStyle = { textAlign: group.inSheet ? "right" : "left" };

  const body = (
    <>
      <Text style={labelStyle} numberOfLines={1}>
        {label}
      </Text>

      {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}

      {input ? (
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
          numberOfLines={1}
          style={[styles.value, valueAlign, !value && { color: colors.ink3 }]}
        >
          {value || placeholder}
        </Text>
      )}

      {showChevron && (
        <Icon
          name="chevronRight"
          size={CHEVRON_SIZE}
          color={colors.chevron}
          strokeWidth={2}
        />
      )}
    </>
  );

  const rowStyle = [
    styles.row,
    { height: group.inSheet ? 52 : 56 },
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
  },
  label: { ...type.body, flexShrink: 0, color: colors.ink2 },
  prefix: { ...type.bodyMedium, color: colors.ink2 },
  value: { ...type.bodyMedium, flexGrow: 1, flexShrink: 1, color: colors.ink },
  input: {
    ...type.bodyMedium,
    flex: 1,
    minWidth: 0,
    height: "100%",
    padding: 0,
    color: colors.ink,
    includeFontPadding: false,
  },
}));

export default FormRow;
