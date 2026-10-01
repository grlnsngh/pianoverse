import React from "react";
import { Pressable, Text, View } from "react-native";
import { PianoPhoto } from "@/components/ui";
import { fonts, radii } from "@/constants/theme";
import { getPianoPhotos } from "@/utils/photos";
import { statusToneColor } from "@/utils/rentalStatus";
import type { ShelfEntry } from "@/utils/today";
import { makeStyles, useColors } from "@/lib/ThemeContext";

export const SHELF_CARD_WIDTH = 244;
const PHOTO_HEIGHT = 152;
const BAR_HEIGHT = 5;

export type ShelfCardProps = {
  entry: ShelfEntry;
  onOpen: (id: string) => void;
};

/**
 * One rental in Today's "Rented out" shelf: a wide photo with a thin bar along
 * its bottom edge that fills as the rental period passes, then the title, who
 * has it, and the status.
 */
const ShelfCard = ({ entry, onOpen }: ShelfCardProps) => {
  const styles = useStyles();
  const colors = useColors();
  const { piano, who, status, progress } = entry;
  const summary = [piano.title, who, status.text].filter(Boolean).join(", ");

  return (
    <Pressable
      onPress={() => onOpen(piano.$id)}
      accessibilityRole="button"
      accessibilityLabel={summary}
      accessibilityHint="Opens this piano"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <PianoPhoto id={piano.$id} uri={getPianoPhotos(piano)[0]} style={styles.photo}>
        {progress !== null && (
          <View style={styles.track} testID="shelf-progress-track">
            <View
              testID="shelf-progress-fill"
              style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]}
            />
          </View>
        )}
      </PianoPhoto>

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
    </Pressable>
  );
};

const useStyles = makeStyles((colors) => ({
  card: { width: SHELF_CARD_WIDTH },
  pressed: { opacity: 0.9 },
  photo: { width: SHELF_CARD_WIDTH, height: PHOTO_HEIGHT, borderRadius: radii.card },
  track: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: BAR_HEIGHT,
    backgroundColor: colors.progressTrack,
  },
  fill: { height: BAR_HEIGHT, backgroundColor: colors.brand },
  title: {
    marginTop: 10,
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
  who: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink2 },
  status: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
}));

export default React.memo(ShelfCard);
