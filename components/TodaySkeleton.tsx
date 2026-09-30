import React from "react";
import { StyleSheet, View } from "react-native";
import { AddButton, Skeleton } from "@/components/ui";
import { colors, radii } from "@/constants/theme";
import { SHELF_CARD_WIDTH } from "./ShelfCard";

// Line widths from the LoadingToday board, so the rows don't all look alike
const ROWS = [
  [150, 100, 120],
  [130, 110, 100],
  [160, 90, 130],
];

export type TodaySkeletonProps = {
  /** The + is real and stays pressable while the rest loads */
  onAdd: () => void;
};

/**
 * What the Today tab shows while it loads for the first time: grey shapes with
 * the size of the date, the money, the three counts, the list rows and the
 * shelf. The + button is real. Show it with useSkeletonDelay, not at once.
 */
const TodaySkeleton = ({ onAdd }: TodaySkeletonProps) => (
  <View>
    <View style={styles.header}>
      <View>
        <Skeleton width={150} height={14} radius={7} style={styles.dateLine} />
        <Skeleton width={112} height={30} radius={8} />
      </View>
      <AddButton onPress={onAdd} />
    </View>

    <View
      accessible
      accessibilityLabel="Loading Today"
      accessibilityState={{ busy: true }}
      testID="today-skeleton"
    >
      <View style={styles.income}>
        <Skeleton width={150} height={14} radius={7} />
        <Skeleton width={220} height={44} radius={10} style={styles.gap10} />
        <Skeleton width={110} height={14} radius={7} style={styles.gap10} />
      </View>

      <View style={styles.counts}>
        <View style={styles.count}>
          <Skeleton width={36} height={22} radius={6} />
          <Skeleton width={60} height={12} radius={6} style={styles.gap8} />
        </View>
        <View style={styles.count}>
          <Skeleton width={28} height={22} radius={6} />
          <Skeleton width={52} height={12} radius={6} style={styles.gap8} />
        </View>
        <View style={[styles.count, styles.wideCount]}>
          <Skeleton width={90} height={22} radius={6} />
          <Skeleton width={96} height={12} radius={6} style={styles.gap8} />
        </View>
      </View>

      <View style={styles.attentionTitle}>
        <Skeleton width={160} height={20} radius={8} />
      </View>
      {ROWS.map((lines, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.thumb}>
            <Skeleton width={64} height={64} radius={radii.input} />
          </View>
          <View style={styles.rowText}>
            <Skeleton width={lines[0]} height={16} radius={8} />
            <Skeleton width={lines[1]} height={14} radius={7} style={styles.gap8} />
            <Skeleton width={lines[2]} height={14} radius={7} style={styles.gap8} />
          </View>
        </View>
      ))}

      <View style={styles.shelfTitle}>
        <Skeleton width={110} height={20} radius={8} />
      </View>
      <View style={styles.shelf}>
        <View style={styles.shelfCard}>
          <Skeleton width={SHELF_CARD_WIDTH} height={152} radius={radii.card} />
          <Skeleton width={140} height={16} radius={8} style={styles.gap12} />
          <Skeleton width={90} height={14} radius={7} style={styles.gap8} />
        </View>
        <View style={styles.shelfCard}>
          <Skeleton width={SHELF_CARD_WIDTH} height={152} radius={radii.card} />
        </View>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  dateLine: { marginBottom: 8 },
  income: { paddingTop: 32, paddingHorizontal: 20 },
  counts: {
    flexDirection: "row",
    marginTop: 22,
    marginHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  count: { flex: 1 },
  wideCount: { flex: 1.3 },
  attentionTitle: { paddingTop: 36, paddingBottom: 8, paddingHorizontal: 20 },
  row: { flexDirection: "row", paddingLeft: 20 },
  thumb: { paddingTop: 12, paddingBottom: 12, paddingRight: 14 },
  rowText: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 12,
    paddingRight: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  shelfTitle: { paddingTop: 32, paddingBottom: 12, paddingHorizontal: 20 },
  shelf: { flexDirection: "row", gap: 12, paddingHorizontal: 20, overflow: "hidden" },
  shelfCard: { width: SHELF_CARD_WIDTH },
  gap8: { marginTop: 8 },
  gap10: { marginTop: 10 },
  gap12: { marginTop: 12 },
});

export default React.memo(TodaySkeleton);
