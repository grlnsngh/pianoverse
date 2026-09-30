import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import ToastHost from "@/components/ToastHost";
import { colors, fonts, radii } from "@/constants/theme";

const WIDTH = 284;
const ACTION_HEIGHT = 52;

export type DialogAction = {
  label: string;
  onPress: () => void;
  /** `destructive` is red and bold: the one that destroys something */
  tone?: "default" | "destructive";
  /** A safe choice that keeps the person's work, such as "Keep editing", gets a bolder label */
  emphasis?: boolean;
};

export type DialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  /**
   * Two or three choices, as full-width rows. Destructive ones are always
   * drawn first, so the safe choice ends up last, where a thumb rests.
   */
  actions: readonly DialogAction[];
  /**
   * Android's back button. Defaults to the last action, which should be the
   * safe one. Tapping outside the dialog does nothing, like a system alert.
   */
  onDismiss?: () => void;
  testID?: string;
};

/**
 * A confirmation for something that can't be undone: 284 wide, title and
 * message centred, one full-width row per choice. Name the piano or the
 * amount in the title or message, so nobody confirms blindly.
 */
const Dialog = ({
  visible,
  title,
  message,
  actions,
  onDismiss,
  testID,
}: DialogProps) => {
  // Destructive first, keeping the order given otherwise
  const ordered = [
    ...actions.filter((action) => action.tone === "destructive"),
    ...actions.filter((action) => action.tone !== "destructive"),
  ];
  const back = onDismiss ?? ordered[ordered.length - 1]?.onPress ?? (() => {});

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={back}
    >
      <View style={styles.dim} testID={testID}>
        <View style={styles.card} accessibilityViewIsModal testID="dialog-card">
          <View style={styles.text}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>

          {ordered.map((action) => {
            const destructive = action.tone === "destructive";
            return (
              <Pressable
                key={action.label}
                onPress={action.onPress}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                style={({ pressed }) => [
                  styles.action,
                  pressed && { backgroundColor: colors.grouped },
                ]}
              >
                <Text
                  style={[
                    styles.actionText,
                    destructive && styles.destructive,
                    !destructive && action.emphasis && styles.emphasis,
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ToastHost embedded />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  dim: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dim,
  },
  card: {
    width: WIDTH,
    overflow: "hidden",
    borderRadius: radii.panel,
    backgroundColor: colors.white,
  },
  text: {
    alignItems: "center",
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    textAlign: "center",
    color: colors.ink,
  },
  message: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: colors.ink2,
  },
  action: {
    height: ACTION_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  actionText: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  destructive: { fontFamily: fonts.bold, color: colors.late },
  emphasis: { fontFamily: fonts.semibold },
});

export default Dialog;
