import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Sheet } from "@/components/ui";
import { colors, fonts, spacing } from "@/constants/theme";

type SignOutSheetProps = {
  visible: boolean;
  /** True while the sign-out is going on: the red button shows it and can't be pressed again */
  signingOut: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * The question before signing out (SignOutConfirm board): what will be
 * cleared from this phone, and that everything stays in the account.
 */
const SignOutSheet = ({ visible, signingOut, onConfirm, onClose }: SignOutSheetProps) => (
  <Sheet
    visible={visible}
    onClose={onClose}
    tone="white"
    testID="sign-out-sheet"
    footer={
      <View style={styles.buttons}>
        <Button
          title="Sign out"
          variant="destructive"
          loading={signingOut}
          loadingTitle="Signing out"
          onPress={onConfirm}
        />
        <Button title="Cancel" variant="secondary" onPress={onClose} />
      </View>
    }
  >
    <View style={styles.body}>
      <Text style={styles.title} accessibilityRole="header">
        Sign out of Pianoverse?
      </Text>
      <Text style={styles.message}>
        Pianos and reminders saved on this device will be cleared. Everything stays in your
        account.
      </Text>
    </View>
  </Sheet>
);

const styles = StyleSheet.create({
  body: { paddingTop: spacing.xl, paddingHorizontal: spacing.xs, paddingBottom: spacing.sm },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.22,
    color: colors.ink,
    textAlign: "center",
  },
  message: {
    marginTop: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink2,
    textAlign: "center",
  },
  buttons: { gap: 10 },
});

export default SignOutSheet;
