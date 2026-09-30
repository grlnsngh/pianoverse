import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/ui";
import { colors, fonts, spacing, type } from "@/constants/theme";
import { ACTION_LABELS, ActionKey, DetailRow, DetailTone } from "@/utils/pianoDetail";

// The small pieces a piano's page is built from: the rule between sections,
// a section's title, a list of label and value rows, and a row that does
// something.

/** The colour of a status: red, orange, grey, or plain ink. */
export const toneColor = (tone: DetailTone) =>
  tone === "late"
    ? colors.late
    : tone === "soon"
      ? colors.brandText
      : tone === "normal"
        ? colors.ink2
        : colors.ink;

/** The hairline with 24 above and below that separates two sections. */
export const Divider = ({ flush = false }: { flush?: boolean }) => (
  <View style={[styles.divider, flush && styles.flush]} />
);

/** A section's title: "Rental", "Payments", "Details". */
export const SectionTitle = ({ children }: { children: string }) => (
  <Text style={styles.sectionTitle} accessibilityRole="header">
    {children}
  </Text>
);

/** Rows of a label in grey and its value, each under a hairline. */
export const InfoRows = ({ rows }: { rows: DetailRow[] }) => (
  <View style={styles.rows}>
    {rows.map((row) => (
      <View
        key={row.label}
        accessible
        accessibilityLabel={`${row.label}, ${row.value}`}
        style={styles.row}
      >
        <Text style={styles.label}>{row.label}</Text>
        <Text style={[styles.value, row.strong && styles.strong]}>{row.value}</Text>
      </View>
    ))}
  </View>
);

/** A row at the bottom of the page that does one thing. Delete is red, and has no arrow. */
export const ActionRow = ({
  action,
  onPress,
}: {
  action: ActionKey;
  onPress: () => void;
}) => {
  const destructive = action === "delete";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={ACTION_LABELS[action]}
      style={({ pressed }) => [
        styles.action,
        !destructive && styles.actionRule,
        pressed && styles.actionPressed,
      ]}
    >
      <Text style={[styles.actionText, destructive && styles.actionDestructive]}>
        {ACTION_LABELS[action]}
      </Text>
      {!destructive && <Icon name="chevronRight" size={18} color={colors.chevron} strokeWidth={2} />}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  divider: { height: 1, marginVertical: spacing.xxl, backgroundColor: colors.hairline },
  flush: { marginBottom: 0 },
  sectionTitle: { ...type.section, color: colors.ink },
  rows: { marginTop: spacing.sm },
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  label: { ...type.body, color: colors.ink2 },
  value: {
    flexShrink: 1,
    textAlign: "right",
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
  strong: { fontFamily: fonts.bold, fontVariant: ["tabular-nums"] },
  action: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionRule: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  actionPressed: { opacity: 0.6 },
  actionText: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.ink },
  actionDestructive: { color: colors.late },
});
