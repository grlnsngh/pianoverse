import React from "react";
import { Pressable, Text, View } from "react-native";
import { Icon, PianoPhoto } from "@/components/ui";
import { fonts, radii } from "@/constants/theme";
import { getPianoPhotos } from "@/utils/photos";
import { statusToneColor } from "@/utils/rentalStatus";
import type { RentalEntry } from "@/utils/today";
import { makeStyles, useColors } from "@/lib/ThemeContext";

const THUMBNAIL = 64;

export type AttentionRowProps = {
  entry: RentalEntry;
  onOpen: (id: string) => void;
};

/**
 * One rental that needs the owner, in Today's "Needs attention" list: a small
 * photo, the title, who has it, and how long ago it ended or how soon it ends,
 * in red or orange. The hairline under it starts at the text.
 */
const AttentionRow = ({ entry, onOpen }: AttentionRowProps) => {
  const colors = useColors();
  const styles = useStyles();
  const { piano, who, status } = entry;
  const summary = [piano.title, who, status.text].filter(Boolean).join(", ");

  return (
    <Pressable
      onPress={() => onOpen(piano.$id)}
      accessibilityRole="button"
      accessibilityLabel={summary}
      accessibilityHint="Opens this piano"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.photoCell}>
        <PianoPhoto id={piano.$id} uri={getPianoPhotos(piano)[0]} style={styles.photo} />
      </View>

      <View style={styles.content}>
        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={1}>
            {piano.title}
          </Text>
          {!!who && (
            <Text style={styles.who} numberOfLines={1}>
              {who}
            </Text>
          )}
          <Text style={[styles.status, { color: statusToneColor(status.tone, colors) }]} numberOfLines={1}>
            {status.text}
          </Text>
        </View>
        <Icon name="chevronRight" size={18} color={colors.chevron} strokeWidth={2} />
      </View>
    </Pressable>
  );
};

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: "row", paddingLeft: 20 },
  pressed: { backgroundColor: colors.grouped },
  photoCell: { paddingTop: 12, paddingBottom: 12, paddingRight: 14 },
  photo: { width: THUMBNAIL, height: THUMBNAIL, borderRadius: radii.input },
  content: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  texts: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink },
  who: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink2 },
  status: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
}));

export default React.memo(AttentionRow);
