import React from "react";
import { Text, View } from "react-native";
import { KeyboardMark } from "@/components/ui";
import { fonts, radii, spacing } from "@/constants/theme";
import { makeStyles } from "@/lib/ThemeContext";

/** What a reminder looks like, in the words the app really sends at 9:00 AM */
export const SAMPLE_REMINDER = {
  title: "Piano Rental Due Soon!",
  time: "9:00 AM",
  body: "“Young Chang U-121” rental ends tomorrow. Please arrange return or extension.",
};

type ReminderPreviewProps = {
  /** "Piano Rental Due Soon!" */
  title: string;
  /** "9:00 AM" */
  time: string;
  body: string;
};

/**
 * A drawing of a notification on the grouped background: the orange app
 * square, the title with its time, and the message. Shows what a reminder
 * looks like before any has arrived (Account and NotifyPrimer boards).
 */
const ReminderPreview = ({ title, time, body }: ReminderPreviewProps) => {
  const styles = useStyles();
  return (
    <View
      style={styles.box}
      accessible
      accessibilityLabel={`Example reminder. ${title}. ${body}`}
    >
      <View style={styles.app}>
        <KeyboardMark />
      </View>
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  box: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.grouped,
  },
  app: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
  },
  text: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  title: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.ink },
  time: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 20, color: colors.ink2 },
  body: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.inkBody },
}));

export default ReminderPreview;
