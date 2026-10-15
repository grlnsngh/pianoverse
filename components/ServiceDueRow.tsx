import React from "react";
import { Pressable, Text, View } from "react-native";
import { Icon, PianoPhoto } from "@/components/ui";
import { fonts, radii } from "@/constants/theme";
import { getPianoPhotos } from "@/utils/photos";
import { canRemind } from "@/utils/reminders";
import { serviceDueLine, whereLine, type ServiceDueEntry } from "@/utils/serviceLog";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import useTextScale from "@/lib/useTextScale";

const THUMBNAIL = 64;
const BUTTON = 44;
// Where the hairline starts: the row's left padding, the photo and the gap after it
const TEXT_START = 20 + THUMBNAIL + 14;

export type ServiceDueRowProps = {
  entry: ServiceDueEntry;
  onOpen: (id: string) => void;
  /** Opens the renter's WhatsApp with the message about the visit */
  onMessage: (entry: ServiceDueEntry) => void;
};

/**
 * One tuning that is overdue or due within a week, in Today's "Service due"
 * (TodayServiceDue board): the photo, the title, where the piano is, and when
 * the tuning is due, red when overdue. A rented piano with a number has a
 * WhatsApp button to book the visit; the rest of the row opens the piano.
 */
const ServiceDueRow = ({ entry, onOpen, onMessage }: ServiceDueRowProps) => {
  const colors = useColors();
  const styles = useStyles();
  const { large } = useTextScale();
  // One line each, unless the text is big: then a name or a status may take two rather than be cut
  const lines = large ? 2 : 1;
  const { piano, state } = entry;
  const where = whereLine(piano);
  const line = serviceDueLine(state);
  const messageable = canRemind(piano);
  const who = piano.rental_customer_name?.trim();

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onOpen(piano.$id)}
        accessibilityRole="button"
        accessibilityLabel={[piano.title, where, line].join(", ")}
        accessibilityHint="Opens this piano"
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <View style={styles.photoCell}>
          <PianoPhoto id={piano.$id} uri={getPianoPhotos(piano)[0]} style={styles.photo} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={lines}>
            {piano.title}
          </Text>
          <Text style={styles.where} numberOfLines={lines}>
            {where}
          </Text>
          <Text style={[styles.due, { color: state.tone === "late" ? colors.late : colors.brandText }]} numberOfLines={lines}>
            {line}
          </Text>
        </View>
        {!messageable && <Icon name="chevronRight" size={18} color={colors.chevron} strokeWidth={2} />}
      </Pressable>

      {messageable && (
        <Pressable
          onPress={() => onMessage(entry)}
          accessibilityRole="button"
          accessibilityLabel={`Message ${who ?? piano.title} about the tuning`}
          style={({ pressed }) => [styles.message, pressed && styles.pressed]}
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
  where: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink2 },
  due: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  message: {
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

export default React.memo(ServiceDueRow);
