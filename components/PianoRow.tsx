import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { HighlightedText, PianoPhoto } from "@/components/ui";
import { colors, fonts, radii } from "@/constants/theme";
import { PianoItem } from "@/redux/pianos/types";
import { getPianoDisplay } from "@/utils/pianoDisplay";
import { getPianoPhotos } from "@/utils/photos";
import { STATUS_TONE_COLORS } from "@/utils/rentalStatus";
import SelectionMark from "./SelectionMark";

const THUMBNAIL = 64;

export type PianoRowProps = {
  item: PianoItem;
  /** Choosing pianos to delete: a tap chooses instead of opening */
  selecting?: boolean;
  selected?: boolean;
  onOpen: (id: string) => void;
  /** Left out where pianos can't be chosen, such as the search results */
  onToggle?: (id: string) => void;
  /** A long press starts choosing pianos. Left out, a long press does nothing. */
  onSelectStart?: (id: string) => void;
  /** The words that were searched for, made bold in the title and company */
  highlight?: string;
};

/**
 * One piano in the compact list: a 64 px photo, the title, "Category ·
 * Company", the status in its colour, and the price at the end. The hairline
 * under it starts at the text, not at the edge of the screen.
 */
const PianoRow = ({
  item,
  selecting = false,
  selected = false,
  onOpen,
  onToggle,
  onSelectStart,
  highlight,
}: PianoRowProps) => {
  const display = getPianoDisplay(item);
  const id = item.$id;
  const company = item.company_associated;

  const summary = [item.title, display.categoryLabel, company, display.status.text, display.price]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      onPress={() => (selecting ? onToggle?.(id) : onOpen(id))}
      onLongPress={selecting || !onSelectStart ? undefined : () => onSelectStart(id)}
      accessibilityRole="button"
      accessibilityLabel={summary}
      accessibilityHint={selecting ? "Chooses this piano" : "Opens this piano"}
      accessibilityState={selecting ? { selected } : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.photoCell}>
        <PianoPhoto id={id} uri={getPianoPhotos(item)[0]} style={styles.photo} />
      </View>

      <View style={styles.content}>
        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={1}>
            <HighlightedText text={item.title} term={highlight} matchStyle={styles.titleMatch} />
          </Text>
          <Text style={styles.line} numberOfLines={1}>
            {company ? (
              <>
                {display.categoryLabel} ·{" "}
                <HighlightedText text={company} term={highlight} matchStyle={styles.lineMatch} />
              </>
            ) : (
              display.categoryLabel
            )}
          </Text>
          <Text
            style={[styles.status, { color: STATUS_TONE_COLORS[display.status.tone] }]}
            numberOfLines={1}
          >
            {display.status.text}
          </Text>
        </View>

        {selecting ? (
          <SelectionMark variant="row" selected={selected} />
        ) : display.price ? (
          <Text style={styles.price}>{display.price}</Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", paddingLeft: 20 },
  pressed: { backgroundColor: colors.grouped },
  photoCell: { paddingVertical: 12, paddingRight: 14 },
  photo: { width: THUMBNAIL, height: THUMBNAIL, borderRadius: radii.input },
  content: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    paddingRight: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  texts: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink },
  titleMatch: { fontFamily: fonts.bold },
  line: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink2 },
  lineMatch: { fontFamily: fonts.bold, color: colors.ink },
  status: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  price: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
});

export default React.memo(PianoRow);
