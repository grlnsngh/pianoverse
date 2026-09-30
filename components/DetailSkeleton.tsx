import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, Skeleton } from "@/components/ui";
import { bottomBar, colors, radii } from "@/constants/theme";
import { HERO_HEIGHT } from "./PhotoHero";

export type DetailSkeletonProps = {
  /** The Back button is real, so the person can leave while it loads */
  onBack: () => void;
};

/**
 * What a piano's page shows while the piano isn't there yet (LoadingDetail
 * board): grey shapes with the size of the photo, the title, the rental, two
 * rows and the bar at the bottom. Show it with useSkeletonDelay, not at once.
 */
const DetailSkeleton = ({ onBack }: DetailSkeletonProps) => {
  const insets = useSafeAreaInsets();
  const inset = Math.max(insets.bottom, bottomBar.minInset);

  return (
    <View style={styles.page}>
      <View
        accessible
        accessibilityLabel="Loading piano"
        accessibilityState={{ busy: true }}
        style={styles.fill}
        testID="detail-skeleton"
      >
        <View>
          <Skeleton width="100%" height={HERO_HEIGHT + insets.top} radius={0} />
        </View>

        <View style={styles.sheet}>
          <Skeleton width={240} height={28} radius={8} />
          <Skeleton width={210} height={14} radius={7} style={styles.gap12} />
          <Skeleton width={170} height={15} radius={7} style={styles.gap12} />

          <View style={styles.divider} />

          <Skeleton width={90} height={20} radius={8} />
          <View style={styles.customer}>
            <Skeleton width={48} height={48} radius={24} />
            <View>
              <Skeleton width={130} height={16} radius={8} />
              <Skeleton width={110} height={13} radius={6} style={styles.gap8} />
            </View>
          </View>
          <Skeleton width="100%" height={8} radius={4} style={styles.bar} />
          <View style={styles.dates}>
            <Skeleton width={80} height={14} radius={7} />
            <Skeleton width={80} height={14} radius={7} />
          </View>

          <View style={[styles.line, styles.firstLine]}>
            <Skeleton width={60} height={16} radius={8} />
            <Skeleton width={80} height={16} radius={8} />
          </View>
          <View style={styles.line}>
            <Skeleton width={70} height={16} radius={8} />
            <Skeleton width={150} height={16} radius={8} />
          </View>
        </View>
      </View>

      {/* Real: Back stays pressable while the rest loads */}
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back to pianos"
        style={[styles.back, { top: insets.top + 12 }]}
      >
        <Icon name="chevronLeft" size={22} color={colors.ink} strokeWidth={2.2} />
      </Pressable>

      <View
        style={[styles.bottomBar, { height: bottomBar.content + inset, paddingBottom: inset }]}
      >
        <View>
          <Skeleton width={70} height={20} radius={8} />
          <Skeleton width={90} height={13} radius={6} style={styles.gap6} />
        </View>
        <Skeleton width={160} height={48} radius={radii.control} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  fill: { flex: 1 },
  sheet: {
    marginTop: -24,
    paddingTop: 24,
    paddingHorizontal: 20,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    backgroundColor: colors.white,
  },
  divider: { height: 1, marginVertical: 24, backgroundColor: colors.hairline },
  customer: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 18 },
  bar: { marginTop: 26 },
  dates: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  firstLine: { marginTop: 22 },
  back: {
    position: "absolute",
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    backgroundColor: colors.white,
  },
  gap6: { marginTop: 6 },
  gap8: { marginTop: 8 },
  gap12: { marginTop: 12 },
});

export default React.memo(DetailSkeleton);
