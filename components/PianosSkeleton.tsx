import React from "react";
import { StyleSheet, View } from "react-native";
import { Skeleton } from "@/components/ui";
import { radii } from "@/constants/theme";

// Line widths from the LoadingPianos board, so the cards don't all look alike
const GRID_LINES = [
  [120, 90, 60],
  [100, 110, 70],
  [110, 80, 64],
  [126, 96, 58],
];
const LIST_LINES = [
  [150, 110, 90],
  [130, 120, 80],
  [160, 100, 96],
  [140, 116, 84],
  [120, 104, 92],
  [150, 96, 76],
];

export type PianosSkeletonProps = {
  /** The same shapes as the real list, so nothing jumps when it arrives */
  layout: "grid" | "list";
};

/**
 * What the Pianos list shows while the pianos load for the first time: grey
 * shapes with the size of the cards or rows. The search field and the tabs are
 * real and stay above it. Show it with useSkeletonDelay, not at once.
 */
const PianosSkeleton = ({ layout }: PianosSkeletonProps) => (
  <View
    accessible
    accessibilityLabel="Loading pianos"
    accessibilityState={{ busy: true }}
    testID="pianos-skeleton"
  >
    {/* Where "10 pianos" and the sort link go */}
    <View style={styles.countRow}>
      <Skeleton width={70} height={14} radius={7} />
    </View>

    {layout === "grid" ? (
      <View style={styles.grid}>
        {[0, 2].map((first) => (
          <View key={first} style={styles.gridRow}>
            {GRID_LINES.slice(first, first + 2).map((lines, i) => (
              <View key={i} style={styles.gridCell}>
                <Skeleton width="100%" height={169} radius={radii.card} />
                <Skeleton width={lines[0]} height={15} radius={7} style={styles.first} />
                <Skeleton width={lines[1]} height={13} radius={6} style={styles.next} />
                <Skeleton width={lines[2]} height={14} radius={7} style={styles.next} />
              </View>
            ))}
          </View>
        ))}
      </View>
    ) : (
      <View>
        {LIST_LINES.map((lines, i) => (
          <View key={i} style={styles.listRow}>
            <View style={styles.thumb}>
              <Skeleton width={64} height={64} radius={radii.input} />
            </View>
            <View style={styles.listText}>
              <Skeleton width={lines[0]} height={16} radius={8} />
              <Skeleton width={lines[1]} height={14} radius={7} style={styles.next} />
              <Skeleton width={lines[2]} height={14} radius={7} style={styles.next} />
            </View>
          </View>
        ))}
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  countRow: { height: 44, justifyContent: "center", paddingHorizontal: 20 },
  grid: { paddingTop: 4, paddingHorizontal: 20, rowGap: 20 },
  gridRow: { flexDirection: "row", columnGap: 12 },
  gridCell: { flex: 1, minWidth: 0 },
  first: { marginTop: 12 },
  next: { marginTop: 8 },
  listRow: { flexDirection: "row", paddingLeft: 20 },
  thumb: { paddingVertical: 12, paddingRight: 14 },
  listText: { flex: 1, paddingVertical: 12, paddingRight: 20 },
});

export default React.memo(PianosSkeleton);
