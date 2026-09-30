import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui";
import { bottomBar, colors, fonts, spacing } from "@/constants/theme";
import type { BarInfo } from "@/utils/pianoDetail";
import { toneColor } from "./DetailParts";

export type StickyActionBarProps = {
  /** The amount and the line under it, on the left */
  info: BarInfo;
  /** The one main action, on the right */
  label: string;
  /** Orange for the action that leads; grey for one that undoes something */
  variant?: "primary" | "secondary";
  onPress: () => void;
};

/**
 * The bar at the bottom of a piano's page: an amount with a line under it,
 * and the one action that fits the piano's state. As tall as the tab bar (84
 * on an iPhone), so a toast clears it the same way.
 */
const StickyActionBar = ({ info, label, variant = "primary", onPress }: StickyActionBarProps) => {
  const insets = useSafeAreaInsets();
  const emphasised = info.tone === "late" || info.tone === "soon";
  const inset = Math.max(insets.bottom, bottomBar.minInset);

  return (
    <View
      testID="sticky-action-bar"
      style={[styles.bar, { height: bottomBar.content + inset, paddingBottom: inset }]}
    >
      <View style={styles.left}>
        {!!info.amount && <Text style={styles.amount}>{info.amount}</Text>}
        {!!info.caption && (
          <Text
            style={[
              styles.caption,
              { fontFamily: emphasised ? fonts.semibold : fonts.medium, color: toneColor(info.tone) },
            ]}
            numberOfLines={1}
          >
            {info.caption}
          </Text>
        )}
      </View>
      <Button title={label} variant={variant} size="compact" onPress={onPress} style={styles.button} />
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
    paddingHorizontal: spacing.screen,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    backgroundColor: colors.white,
  },
  left: { flexShrink: 1, minWidth: 0 },
  amount: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  caption: { fontSize: 13, lineHeight: 18 },
  button: { paddingHorizontal: 24 },
});

export default StickyActionBar;
