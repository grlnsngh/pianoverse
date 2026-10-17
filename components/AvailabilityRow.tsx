import React from "react";
import { Pressable, Text, View } from "react-native";
import { Icon, PianoPhoto } from "@/components/ui";
import { fonts, radii } from "@/constants/theme";
import { PianoItem } from "@/redux/pianos/types";
import { getPianoPhotos } from "@/utils/photos";
import type { StatusTone } from "@/utils/rentalStatus";
import { statusToneColor } from "@/utils/rentalStatus";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import useTextScale from "@/lib/useTextScale";

const THUMBNAIL = 48;

export type AvailabilityRowProps = {
  piano: PianoItem;
  /** Under the title: who has it, or what kind of piano it is */
  sub: string;
  /** Beside it: "Until 20 Nov", "Free since 2 Oct". Orange or red by its tone. */
  line?: { text: string; tone: StatusTone } | null;
  onOpen: (id: string) => void;
};

/**
 * One piano in the Availability lists (AvailDay board): a small photo, the
 * title, a line under it, and on the right when it is free or out until. With a
 * big Font size the right-hand text goes under the line instead of squeezing
 * the title. The hairline under it starts at the text; the row opens the piano.
 */
const AvailabilityRow = ({ piano, sub, line, onOpen }: AvailabilityRowProps) => {
  const colors = useColors();
  const styles = useStyles();
  const { large } = useTextScale();
  const lineColor = line ? statusToneColor(line.tone, colors) : colors.ink2;
  const summary = [piano.title, sub, line?.text].filter(Boolean).join(", ");

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
          <Text style={styles.title} numberOfLines={large ? 2 : 1}>
            {piano.title}
          </Text>
          <Text style={styles.sub}>{sub}</Text>
          {large && !!line && <Text style={[styles.line, { color: lineColor }]}>{line.text}</Text>}
        </View>
        {!large && !!line && <Text style={[styles.lineSide, { color: lineColor }]}>{line.text}</Text>}
        <Icon name="chevronRight" size={18} color={colors.chevron} strokeWidth={2} />
      </View>
    </Pressable>
  );
};

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: "row", paddingLeft: 20 },
  pressed: { backgroundColor: colors.grouped },
  photoCell: { paddingTop: 8, paddingBottom: 8, paddingRight: 14, justifyContent: "center" },
  photo: { width: THUMBNAIL, height: THUMBNAIL, borderRadius: radii.input },
  content: {
    flex: 1,
    minWidth: 0,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  texts: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  line: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  // Takes at most 42% of the row and wraps, so a long "Ended 9 Oct, not back" never pushes the title off
  lineSide: { maxWidth: "42%", textAlign: "right", fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
}));

export default React.memo(AvailabilityRow);
