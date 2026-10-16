import React from "react";
import { Pressable, Text, View } from "react-native";
import { Icon, PianoPhoto } from "@/components/ui";
import { fonts, radii } from "@/constants/theme";
import { depositText, sinceText, type HeldDeposit } from "@/utils/deposits";
import { getPianoPhotos } from "@/utils/photos";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import useTextScale from "@/lib/useTextScale";

const THUMBNAIL = 48;

export type DepositRowProps = {
  held: HeldDeposit;
  onOpen: (pianoId: string) => void;
};

/**
 * One deposit in the Deposits held list (DepList board): a small photo, who it
 * is held for, the piano and since when, and the amount. With a big Font size
 * the amount goes under the words instead of squeezing them. The row opens the
 * piano, where the rental is.
 */
const DepositRow = ({ held, onOpen }: DepositRowProps) => {
  const colors = useColors();
  const styles = useStyles();
  const { large } = useTextScale();
  const { piano, amount, since, who } = held;
  const title = who ?? piano.title;
  const sub = [who ? piano.title : "", sinceText(since)].filter(Boolean).join(" · ");
  const money = depositText(amount);

  return (
    <Pressable
      onPress={() => onOpen(piano.$id)}
      accessibilityRole="button"
      accessibilityLabel={[title, sub, money].filter(Boolean).join(", ")}
      accessibilityHint="Opens this piano"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.photoCell}>
        <PianoPhoto id={piano.$id} uri={getPianoPhotos(piano)[0]} style={styles.photo} />
      </View>
      <View style={styles.content}>
        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={large ? 2 : 1}>
            {title}
          </Text>
          {!!sub && <Text style={styles.sub}>{sub}</Text>}
          {large && <Text style={styles.amount}>{money}</Text>}
        </View>
        {!large && <Text style={styles.amount}>{money}</Text>}
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
    minHeight: 72,
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
  amount: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink, fontVariant: ["tabular-nums"] },
}));

export default React.memo(DepositRow);
