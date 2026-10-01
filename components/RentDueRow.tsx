import React from "react";
import { Pressable, Text, View } from "react-native";
import { Icon, PianoPhoto } from "@/components/ui";
import { fonts, radii } from "@/constants/theme";
import { getPianoPhotos } from "@/utils/photos";
import { canRemind } from "@/utils/reminders";
import { dueLine, dueShort, type RentDueEntry } from "@/utils/rentDue";
import { makeStyles, useColors } from "@/lib/ThemeContext";

const THUMBNAIL = 64;
const BUTTON = 44;
// Where the hairline starts: the row's left padding, the photo and the gap after it
const TEXT_START = 20 + THUMBNAIL + 14;

export type RentDueRowProps = {
  entry: RentDueEntry;
  /** The day the "since" date is worded against */
  today: Date;
  onOpen: (id: string) => void;
  /** Opens the reminder for this rental: given the whole entry so it can say how much is due */
  onRemind: (entry: RentDueEntry) => void;
};

/**
 * One rental that owes rent, in Today's "Rent due" list: a small photo, the
 * title, who has it, and how much is due, in red. A rental with a number to
 * message has a button to remind them on WhatsApp; the rest of the row opens the piano.
 */
const RentDueRow = ({ entry, today, onOpen, onRemind }: RentDueRowProps) => {
  const colors = useColors();
  const styles = useStyles();
  const { piano, who, balance } = entry;
  // The row says it short, so it fits beside the button; a screen reader gets since when too
  const summary = [piano.title, who, dueLine(balance, today)]
    .filter(Boolean)
    .join(", ");
  const remindable = canRemind(piano);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onOpen(piano.$id)}
        accessibilityRole="button"
        accessibilityLabel={summary}
        accessibilityHint="Opens this piano"
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <View style={styles.photoCell}>
          <PianoPhoto id={piano.$id} uri={getPianoPhotos(piano)[0]} style={styles.photo} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={1}>
            {piano.title}
          </Text>
          {!!who && (
            <Text style={styles.who} numberOfLines={1}>
              {who}
            </Text>
          )}
          <Text style={styles.due} numberOfLines={1}>
            {dueShort(balance)}
          </Text>
        </View>
        {!remindable && (
          <Icon name="chevronRight" size={18} color={colors.chevron} strokeWidth={2} />
        )}
      </Pressable>

      {remindable && (
        <Pressable
          onPress={() => onRemind(entry)}
          accessibilityRole="button"
          accessibilityLabel={`Remind ${who ?? piano.title} on WhatsApp`}
          style={({ pressed }) => [styles.remind, pressed && styles.pressed]}
        >
          <Icon name="message" size={20} color={colors.ink} strokeWidth={1.8} />
        </Pressable>
      )}

      <View style={styles.hairline} pointerEvents="none" />
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: "row", alignItems: "center", paddingLeft: 20, paddingRight: 16 },
  main: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center" },
  pressed: { backgroundColor: colors.grouped },
  photoCell: { paddingTop: 12, paddingBottom: 12, paddingRight: 14 },
  photo: { width: THUMBNAIL, height: THUMBNAIL, borderRadius: radii.input },
  texts: { flex: 1, minWidth: 0, paddingVertical: 12, paddingRight: 8 },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink },
  who: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink2 },
  due: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.late,
    fontVariant: ["tabular-nums"],
  },
  remind: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  hairline: {
    position: "absolute",
    left: TEXT_START,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: colors.hairline,
  },
}));

export default React.memo(RentDueRow);
