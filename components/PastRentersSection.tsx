import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/ui";
import { colors, fonts, spacing, type } from "@/constants/theme";
import { formatRupees } from "@/utils/money";
import { PastRenter, paymentsText, periodText } from "@/utils/customers";
import { SectionTitle } from "./DetailParts";

export type PastRentersSectionProps = {
  renters: PastRenter[];
  /** Opens a customer's page, with the key that names them */
  onOpen: (key: string) => void;
};

/**
 * "Previous renters" on a rented piano's page: who else has paid rent for it,
 * with how many payments, over which months, and how much, the one who paid
 * most recently first. It is worked out from the names saved with the payments.
 */
const PastRentersSection = ({ renters, onOpen }: PastRentersSectionProps) => (
  <View>
    <SectionTitle>Previous renters</SectionTitle>
    <Text style={styles.subtitle}>
      {renters.length === 1 ? "1 other person has paid rent for it" : `${renters.length} other people have paid rent for it`}
    </Text>
    <View style={styles.list}>
      {renters.map((renter) => {
        const period = periodText(renter.firstPaidOn, renter.lastPaidOn);
        const detail = [paymentsText(renter.paymentsCount), period].filter(Boolean).join(" · ");
        const total = formatRupees(renter.total);
        return (
          <Pressable
            key={renter.key}
            onPress={() => onOpen(renter.key)}
            accessibilityRole="button"
            accessibilityLabel={`${renter.name}, ${detail}, ${total}`}
            accessibilityHint="Opens this customer"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.texts}>
              <Text style={styles.name} numberOfLines={1}>
                {renter.name}
              </Text>
              <Text style={styles.detail} numberOfLines={1}>
                {detail}
              </Text>
            </View>
            <Text style={styles.total}>{total}</Text>
            <Icon name="chevronRight" size={18} color={colors.chevron} strokeWidth={2} />
          </Pressable>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  subtitle: { ...type.secondary, marginTop: 2, color: colors.ink2 },
  list: { marginTop: spacing.sm },
  row: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  pressed: { backgroundColor: colors.grouped },
  texts: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.ink },
  detail: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  total: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink, fontVariant: ["tabular-nums"] },
});

export default PastRentersSection;
