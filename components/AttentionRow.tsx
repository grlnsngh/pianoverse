import React from "react";
import { Pressable, Text, View } from "react-native";
import { Icon, PianoPhoto } from "@/components/ui";
import { fonts, radii } from "@/constants/theme";
import { getPianoPhotos } from "@/utils/photos";
import { statusToneColor } from "@/utils/rentalStatus";
import type { RentalEntry } from "@/utils/today";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import useTextScale from "@/lib/useTextScale";

const THUMBNAIL = 64;

export type AttentionRowProps = {
  entry: RentalEntry;
  onOpen: (id: string) => void;
  /** For a rental that has ended: open the piano with Mark as returned started */
  onReturned?: (id: string) => void;
  /** For a rental that has ended: open the piano with Extend rental started */
  onExtend?: (id: string) => void;
};

/**
 * One rental that needs the owner, in Today's "Needs attention" list: a small
 * photo, the title, who has it, and how long ago it ended or how soon it ends,
 * in red or orange. The hairline under it starts at the text.
 *
 * A rental that has ended also has Mark returned and Extend under it, so an
 * old one that would otherwise come back every morning (here and in the 9:00
 * summary) is settled in two taps: each opens the piano with that step started.
 */
const AttentionRow = ({ entry, onOpen, onReturned, onExtend }: AttentionRowProps) => {
  const colors = useColors();
  const styles = useStyles();
  const { large } = useTextScale();
  // One line each, unless the text is big: then a name or a status may take two rather than be cut
  const lines = large ? 2 : 1;
  const { piano, who, status } = entry;
  const summary = [piano.title, who, status.text].filter(Boolean).join(", ");
  const ended = entry.daysLeft < 0 && (!!onReturned || !!onExtend);

  const row = (
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

      <View style={[styles.content, ended && styles.contentAbove]}>
        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={lines}>
            {piano.title}
          </Text>
          {!!who && (
            <Text style={styles.who} numberOfLines={lines}>
              {who}
            </Text>
          )}
          <Text style={[styles.status, { color: statusToneColor(status.tone, colors) }]} numberOfLines={lines}>
            {status.text}
          </Text>
        </View>
        <Icon name="chevronRight" size={18} color={colors.chevron} strokeWidth={2} />
      </View>
    </Pressable>
  );
  if (!ended) return row;

  return (
    <View>
      {row}
      {/* Under the words, wrapping onto a second line when the text is big */}
      <View style={styles.actions}>
        {onReturned && (
          <Pressable
            onPress={() => onReturned(piano.$id)}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${piano.title} as returned`}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <Text style={styles.actionText}>Mark returned</Text>
          </Pressable>
        )}
        {onExtend && (
          <Pressable
            onPress={() => onExtend(piano.$id)}
            accessibilityRole="button"
            accessibilityLabel={`Extend the rental of ${piano.title}`}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <Text style={styles.actionText}>Extend</Text>
          </Pressable>
        )}
      </View>
    </View>
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
  // With the buttons under it, the hairline goes under the buttons instead
  contentAbove: { borderBottomWidth: 0, borderBottomColor: "transparent", paddingBottom: 4 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginLeft: 20 + THUMBNAIL + 14,
    paddingRight: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  action: {
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.control,
    backgroundColor: colors.fill,
  },
  actionPressed: { backgroundColor: colors.fillPressed },
  actionText: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink },
  texts: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink },
  who: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink2 },
  status: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
}));

export default React.memo(AttentionRow);
