import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Spinner } from "@/components/ui";
import { colors, radii, type } from "@/constants/theme";

const HEIGHT = 52;
const LOGO = 20;

/** Google's "G", in its own four colours (Google's sign-in branding asks for the colour logo on white). */
const GoogleLogo = () => (
  <Svg width={LOGO} height={LOGO} viewBox="0 0 48 48" accessibilityElementsHidden>
    <Path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <Path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <Path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <Path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </Svg>
);

export type GoogleButtonProps = {
  onPress: () => void;
  /** Google's page is open: the logo turns into a spinner and the words change */
  loading?: boolean;
  /** Something else on the screen is going on */
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * "Continue with Google": a white button with an outline and Google's logo, as
 * Google asks for. It is as tall as the main button above it.
 */
const GoogleButton = ({ onPress, loading = false, disabled = false, style }: GoogleButtonProps) => {
  const blocked = loading || disabled;
  const label = loading ? "Opening Google" : "Continue with Google";

  return (
    <Pressable
      onPress={blocked ? undefined : onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        pressed && !blocked && styles.pressed,
        disabled && !loading && styles.greyed,
        style,
      ]}
    >
      {loading ? <Spinner size={18} decorative /> : <GoogleLogo />}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    height: HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    backgroundColor: colors.white,
  },
  pressed: { backgroundColor: colors.grouped },
  greyed: { opacity: 0.5 },
  label: { ...type.buttonQuiet, color: colors.ink },
});

export default GoogleButton;
