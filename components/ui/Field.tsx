import React, { forwardRef, useRef, useState } from "react";
import { Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle, TextInputInstance } from "react-native";
import { fonts, radii, type } from "@/constants/theme";
import Icon from "./Icon";
import { makeStyles, useColors } from "@/lib/ThemeContext";

/** The least a field is high: label, value and the room below them, at 100% */
const MIN_HEIGHT = 60;
const ERROR_ICON_SIZE = 14;

export type FieldProps = Omit<TextInputProps, "style" | "placeholderTextColor"> & {
  /** Sits inside the field, above the value */
  label: string;
  /**
   * The message under the field. Setting it turns the field red. Show it on
   * blur or on submit, never while the person is still typing.
   */
  error?: string;
  /** Greyed out and not editable */
  disabled?: boolean;
  /** For the whole field with its message */
  style?: StyleProp<ViewStyle>;
};

/**
 * An outlined text field with its label inside. A `secureTextEntry` field gets
 * a Show / Hide button. Forwards its ref, so a form can move focus to the next
 * field.
 */
const Field = forwardRef<TextInputInstance, FieldProps>(function Field(
  {
    label,
    error,
    disabled = false,
    secureTextEntry,
    style,
    onFocus,
    onBlur,
    editable,
    ...inputProps
  },
  forwardedRef
) {
  const colors = useColors();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const localRef = useRef<TextInputInstance | null>(null);
  const isPassword = !!secureTextEntry;
  const hasError = !!error;

  const setRef = (node: TextInputInstance | null) => {
    localRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  const handleFocus: TextInputProps["onFocus"] = (event) => {
    setFocused(true);
    onFocus?.(event);
  };
  const handleBlur: TextInputProps["onBlur"] = (event) => {
    setFocused(false);
    onBlur?.(event);
  };

  // A 2 px ring for focus or an error, 1 px otherwise. It is drawn over the
  // field rather than as its border, so the text never moves when it thickens.
  const ringColor = hasError
    ? colors.late
    : focused
      ? colors.ink
      : colors.inputBorder;
  const ringWidth = hasError || focused ? 2 : 1;

  return (
    <View style={style}>
      <Pressable
        onPress={() => localRef.current?.focus()}
        disabled={disabled}
        accessible={false}
        style={[
          styles.box,
          { paddingRight: isPassword ? 4 : 16 },
          disabled && styles.disabled,
        ]}
      >
        <View style={styles.texts}>
          <Text
            style={[styles.label, hasError && { color: colors.late }]}
            numberOfLines={1}
          >
            {label}
          </Text>
          <TextInput
            ref={setRef}
            style={styles.input}
            placeholderTextColor={colors.ink3}
            accessibilityLabel={label}
            accessibilityHint={error}
            editable={editable ?? !disabled}
            secureTextEntry={isPassword && !revealed}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...inputProps}
          />
        </View>

        {isPassword && (
          <Pressable
            onPress={() => setRevealed((shown) => !shown)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
            style={styles.reveal}
          >
            <Text style={styles.revealText}>{revealed ? "Hide" : "Show"}</Text>
          </Pressable>
        )}

        <View
          pointerEvents="none"
          testID="field-ring"
          style={[
            StyleSheet.absoluteFill,
            styles.ring,
            { borderColor: ringColor, borderWidth: ringWidth },
          ]}
        />
      </Pressable>

      {hasError && (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Icon name="alert" size={ERROR_ICON_SIZE} color={colors.late} strokeWidth={2.4} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
});

const useStyles = makeStyles((colors) => ({
  box: {
    minHeight: MIN_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    borderRadius: radii.input,
  },
  disabled: { backgroundColor: colors.grouped },
  // 10 above and 6 below the label and value: the 60 of the board at 100%, and
  // the same room around bigger text, which makes the field taller
  texts: { flex: 1, minWidth: 0, alignSelf: "stretch", paddingTop: 10, paddingBottom: 6 },
  label: { ...type.hint, color: colors.ink2 },
  input: {
    minHeight: 28,
    padding: 0,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.ink,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  reveal: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  revealText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.ink,
    textDecorationLine: "underline",
  },
  ring: { borderRadius: radii.input },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    marginHorizontal: 4,
  },
  errorText: { ...type.caption, flexShrink: 1, color: colors.late },
}));

export default Field;
