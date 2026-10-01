import React, { useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from "react-native";
import { colors, motion, radii, type } from "@/constants/theme";
import Spinner from "./Spinner";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "destructive"
  | "text";

/** Regular is 52 high. Compact is 48, for a sticky bar or a tight spot. */
export type ButtonSize = "regular" | "compact";

const HEIGHT: Record<ButtonSize, number> = { regular: 52, compact: 48 };

/** Spinner inside a button, and the gap between it and the label (Feedback board) */
const SPINNER_SIZE = 18;
const SPINNER_GAP = 10;
const TEXT_PRESSED_OPACITY = 0.5;

type Look = {
  fill: string;
  pressedFill: string;
  label: string;
  radius: number;
  border?: string;
  labelStyle: TextStyle;
  /** Arc and ring of the spinner shown while loading */
  spinner: { arc: string; track: string };
};

const DISABLED_SPINNER = { arc: colors.ink, track: "rgba(26, 24, 20, 0.2)" };

const lookOf = (variant: ButtonVariant, tone: "ink" | "brand"): Look => {
  switch (variant) {
    case "secondary":
      return {
        fill: colors.fill,
        pressedFill: colors.fillPressed,
        label: colors.ink,
        radius: radii.control,
        labelStyle: type.button,
        spinner: DISABLED_SPINNER,
      };
    case "outline":
      return {
        fill: "transparent",
        pressedFill: colors.grouped,
        label: colors.ink,
        radius: radii.input,
        border: colors.ink,
        labelStyle: type.buttonQuiet,
        spinner: DISABLED_SPINNER,
      };
    case "destructive":
      return {
        fill: colors.late,
        pressedFill: colors.latePressed,
        label: colors.white,
        radius: radii.control,
        labelStyle: type.button,
        spinner: { arc: colors.white, track: "rgba(255, 255, 255, 0.35)" },
      };
    case "text":
      return {
        fill: "transparent",
        pressedFill: "transparent",
        label: tone === "brand" ? colors.brandText : colors.ink,
        radius: radii.control,
        labelStyle: type.buttonQuiet,
        spinner: DISABLED_SPINNER,
      };
    default:
      return {
        fill: colors.brand,
        pressedFill: colors.brandPressed,
        label: colors.ink,
        radius: radii.control,
        labelStyle: type.button,
        spinner: DISABLED_SPINNER,
      };
  }
};

export type ButtonProps = {
  title: string;
  onPress: () => void;
  /** Primary is the one main action of a screen. Default primary. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Colour of a text button's label */
  tone?: "ink" | "brand";
  /** Shows a spinner and stops presses. The button keeps its width. */
  loading?: boolean;
  /** Label while loading, such as "Saving". Defaults to `title`. */
  loadingTitle?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Width and position. Put `flex: 1` here to share a row, or `alignSelf`. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const Button = ({
  title,
  onPress,
  variant = "primary",
  size = "regular",
  tone = "ink",
  loading = false,
  loadingTitle,
  disabled = false,
  accessibilityLabel,
  style,
  testID,
}: ButtonProps) => {
  // The width the button had before it started loading, so "Saving" doesn't
  // make a button that sizes to its label jump narrower or wider
  const [restingWidth, setRestingWidth] = useState<number>();
  const look = lookOf(variant, tone);
  const blocked = loading || disabled;
  const label = loading && loadingTitle ? loadingTitle : title;
  const isText = variant === "text";
  const isOutline = variant === "outline";

  const onLayout = (event: LayoutChangeEvent) => {
    if (!loading) setRestingWidth(event.nativeEvent.layout.width);
  };

  // A loading button keeps its normal colours. Only a disabled one greys out.
  const greyedOut = disabled && !loading;

  return (
    <Pressable
      onPress={blocked ? undefined : onPress}
      disabled={blocked}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      testID={testID}
      style={({ pressed }) => {
        const down = pressed && !blocked;
        return [
          styles.base,
          {
            height: HEIGHT[size],
            borderRadius: look.radius,
            backgroundColor: greyedOut
              ? isText || isOutline
                ? "transparent"
                : colors.disabledFill
              : down
                ? look.pressedFill
                : look.fill,
          },
          isOutline && {
            borderWidth: 1,
            borderColor: greyedOut ? colors.controlBorder : look.border,
          },
          down && isText && { opacity: TEXT_PRESSED_OPACITY },
          down && !isText && { transform: [{ scale: motion.pressedScale }] },
          loading && restingWidth ? { minWidth: restingWidth } : null,
          style,
        ];
      }}
    >
      {loading && (
        <Spinner
          size={SPINNER_SIZE}
          color={look.spinner.arc}
          trackColor={look.spinner.track}
          decorative
          style={styles.spinner}
        />
      )}
      <Text
        numberOfLines={1}
        style={[look.labelStyle, { color: greyedOut ? colors.disabledText : look.label }]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  spinner: { marginRight: SPINNER_GAP },
});

export default React.memo(Button);
