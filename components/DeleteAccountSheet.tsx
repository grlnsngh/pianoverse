import React from "react";
import { Text, View } from "react-native";
import { Button, Sheet } from "@/components/ui";
import { fonts, spacing } from "@/constants/theme";
import { confirmTap } from "@/utils/haptics";
import { makeStyles } from "@/lib/ThemeContext";

type DeleteAccountSheetProps = {
  visible: boolean;
  /** True while the account is being deleted: the red button shows it and can't be pressed again */
  deleting: boolean;
  /** How many pianos will go with it */
  pianoCount: number;
  onConfirm: () => void;
  onClose: () => void;
};

const pianosPhrase = (count: number) =>
  count === 1 ? "your piano" : count > 1 ? `your ${count} pianos` : "your pianos";

/**
 * The question before deleting the account, like the one before signing out:
 * everything that goes with it, that it is for good, and how to keep a copy.
 */
const DeleteAccountSheet = ({
  visible,
  deleting,
  pianoCount,
  onConfirm,
  onClose,
}: DeleteAccountSheetProps) => {
  const styles = useStyles();
  return (
    <Sheet
      visible={visible}
      onClose={deleting ? () => {} : onClose}
      tone="white"
      testID="delete-account-sheet"
      footer={
        <View style={styles.buttons}>
          <Button
            title="Delete account"
            variant="destructive"
            loading={deleting}
            loadingTitle="Deleting"
            onPress={() => {
              confirmTap();
              onConfirm();
            }}
          />
          <Button title="Cancel" variant="secondary" onPress={onClose} disabled={deleting} />
        </View>
      }
    >
      <View style={styles.body}>
        <Text style={styles.title} accessibilityRole="header">
          Delete your account?
        </Text>
        <Text style={styles.message}>
          This deletes your account and everything in it for good: {pianosPhrase(pianoCount)} and
          their photos, rent payments, rental history and customers. It can’t be undone.
        </Text>
        <Text style={styles.message}>
          To keep a copy, download your piano list and payments under Your data first.
        </Text>
      </View>
    </Sheet>
  );
};

const useStyles = makeStyles((colors) => ({
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
}));

export default DeleteAccountSheet;
