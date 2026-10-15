import React from "react";
import { Pressable, Text, View } from "react-native";
import { Badge, HighlightedText, Icon, PianoPhoto } from "@/components/ui";
import { fonts, radii } from "@/constants/theme";
import { PianoItem } from "@/redux/pianos/types";
import { getPianoDisplay } from "@/utils/pianoDisplay";
import { getPianoPhotos } from "@/utils/photos";
import SelectionMark from "./SelectionMark";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import useTextScale from "@/lib/useTextScale";

const PHOTO_HEIGHT = 169;
const CATEGORY_CIRCLE = 30;

export type PianoCardProps = {
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
 * One piano in the two-column grid: the photo first, with a badge when a
 * rental needs attention and the category's icon in the corner, then the
 * title, the company, and the price with the status.
 */
const PianoCard = ({
  item,
  selecting = false,
  selected = false,
  onOpen,
  onToggle,
  onSelectStart,
  highlight,
}: PianoCardProps) => {
  const colors = useColors();
  const styles = useStyles();
  const { large } = useTextScale();
  // One line each, unless the text is big: then a name or a status may take two rather than be cut
  const lines = large ? 2 : 1;
  const display = getPianoDisplay(item);
  const id = item.$id;
  const company = item.company_associated;

  const summary = [
    item.title,
    company,
    display.price,
    display.status.text,
  ]
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
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <PianoPhoto id={id} uri={getPianoPhotos(item)[0]} style={styles.photo}>
        {selecting ? (
          <SelectionMark selected={selected} />
        ) : (
          <>
            {display.badge && (
              <Badge onPhoto tone={display.badge.tone} label={display.badge.text} />
            )}
            <View style={styles.categoryCircle} testID="category-icon">
              <Icon name={display.categoryIcon} size={16} color={colors.ink} strokeWidth={2} />
            </View>
          </>
        )}
      </PianoPhoto>

      <Text style={styles.title} numberOfLines={lines}>
        <HighlightedText text={item.title} term={highlight} matchStyle={styles.titleMatch} />
      </Text>
      {!!company && (
        <Text style={styles.line} numberOfLines={lines}>
          <HighlightedText text={company} term={highlight} matchStyle={styles.lineMatch} />
        </Text>
      )}
      {!selecting && (display.price || display.cardRest) ? (
        large ? (
          // With a big Font size the price and the status don't share a line that would cut one of them
          <>
            {display.price ? (
              <Text style={[styles.line, styles.price]} numberOfLines={lines}>
                {display.price}
              </Text>
            ) : null}
            {display.cardRest.replace(/^ · /, "") ? (
              <Text style={styles.line} numberOfLines={lines}>
                {display.cardRest.replace(/^ · /, "")}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.line} numberOfLines={1}>
            {display.price ? <Text style={styles.price}>{display.price}</Text> : null}
            {display.cardRest}
          </Text>
        )
      ) : null}
    </Pressable>
  );
};

const useStyles = makeStyles((colors) => ({
  card: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.9 },
  photo: { height: PHOTO_HEIGHT, borderRadius: radii.card },
  categoryCircle: {
    position: "absolute",
    top: 8,
    right: 8,
    width: CATEGORY_CIRCLE,
    height: CATEGORY_CIRCLE,
    borderRadius: CATEGORY_CIRCLE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  title: {
    marginTop: 10,
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.ink,
  },
  titleMatch: { fontFamily: fonts.bold },
  line: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink2,
  },
  lineMatch: { fontFamily: fonts.bold, color: colors.ink },
  price: {
    fontFamily: fonts.bold,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
}));

export default React.memo(PianoCard);
