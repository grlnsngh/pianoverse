import React from "react";
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import ToastHost from "@/components/ToastHost";
import { fonts, maxScale, radii } from "@/constants/theme";
import { confirmTap } from "@/utils/haptics";
import { makeStyles, useColors } from "@/lib/ThemeContext";

/** As drawn; on a narrower screen (a large Screen zoom) it keeps 20 px to each side */
const WIDTH = 284;
const SIDE_ROOM = 20;
/** The least a choice is high; it is taller when its words wrap */
const ACTION_HEIGHT = 52;
/** The most of the screen the dialog may take, so its choices are never pushed off it */
const HEIGHT_SHARE = 0.9;

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
 *
 * With a big Font size the words take more room: the message scrolls inside
 * the dialog if it has to, and the choices stay where they can be pressed.
 */
const Dialog = ({
  visible,
  title,
  message,
  actions,
  onDismiss,
  testID,
}: DialogProps) => {
  const colors = useColors();
  const styles = useStyles();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
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
        <View
          style={[
            styles.card,
            {
              width: Math.min(WIDTH, windowWidth - 2 * SIDE_ROOM),
              maxHeight: windowHeight * HEIGHT_SHARE,
            },
          ]}
          accessibilityViewIsModal
          testID="dialog-card"
        >
          <ScrollView style={styles.scroll} contentContainerStyle={styles.text} bounces={false}>
            <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxScale.section}>
              {title}
            </Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </ScrollView>

          {ordered.map((action) => {
            const destructive = action.tone === "destructive";
            return (
              <Pressable
                key={action.label}
                onPress={() => {
                  if (destructive) confirmTap();
                  action.onPress();
                }}
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

const useStyles = makeStyles((colors) => ({
  dim: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dim,
  },
  card: {
    overflow: "hidden",
    borderRadius: radii.panel,
    backgroundColor: colors.surface,
  },
  // Takes what its words need and no more; shrinks, and scrolls, only if the screen is full
  scroll: { flexGrow: 0, flexShrink: 1 },
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
    minHeight: ACTION_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  actionText: { fontFamily: fonts.medium, fontSize: 16, textAlign: "center", color: colors.ink },
  destructive: { fontFamily: fonts.bold, color: colors.late },
  emphasis: { fontFamily: fonts.semibold },
}));

export default Dialog;
