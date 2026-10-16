import React from "react";
import { Pressable, Text, View } from "react-native";
import { Icon } from "@/components/ui";
import { fonts, spacing, type } from "@/constants/theme";
import { formatRupees } from "@/utils/money";
import { PastRental, pastRentalDeposit, pastRentalDetail } from "@/utils/customers";
import { SectionTitle } from "./DetailParts";
import { makeStyles, useColors } from "@/lib/ThemeContext";

export type PastRentersSectionProps = {
  rentals: PastRental[];
  /** Opens a customer's page, with the key that names them */
  onOpen: (key: string) => void;
  /**
   * Fixing a kept rental: press and hold it for its menu. Only a rental that
   * was kept can be changed; someone known only from the piano's payments is
   * changed in the payments.
   */
  onHold?: (rental: PastRental) => void;
  onEdit?: (rental: PastRental) => void;
  onDelete?: (rental: PastRental) => void;
};

/**
 * "Previous renters" on a rented piano's page: the rentals it has had before
 * this one, the one that ended last first. A kept rental shows its dates and
 * rent and what that person paid in it, and is pressed and held to edit or
 * delete it; someone who only appears in the piano's payments (from before
 * rentals were kept) shows their payments.
 */
const PastRentersSection = ({ rentals, onOpen, onHold, onEdit, onDelete }: PastRentersSectionProps) => {
  const colors = useColors();
  const styles = useStyles();
  const fixable = !!onHold && rentals.some((rental) => rental.fromHistory);
  return (
    <View>
      <SectionTitle>Previous renters</SectionTitle>
      <Text style={styles.subtitle}>
        {rentals.length === 1 ? "1 earlier rental" : `${rentals.length} earlier rentals`}
      </Text>
      <View style={styles.list}>
        {rentals.map((rental) => {
          const detail = pastRentalDetail(rental);
          const deposit = pastRentalDeposit(rental);
          const total = rental.paymentsCount > 0 ? formatRupees(rental.total) : "";
          const open = () => onOpen(rental.key);
          const holdable = fixable && rental.fromHistory;
          const label = [rental.name, detail, deposit, total].filter(Boolean).join(", ");
          const holdProps = holdable
            ? {
                onLongPress: () => onHold?.(rental),
                accessibilityActions: [
                  { name: "edit", label: "Edit rental" },
                  { name: "delete", label: "Delete rental" },
                ],
                onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => {
                  if (event.nativeEvent.actionName === "edit") onEdit?.(rental);
                  if (event.nativeEvent.actionName === "delete") onDelete?.(rental);
                },
              }
            : {};
          const body = (
            <>
              <View style={styles.texts}>
                <Text style={styles.name} numberOfLines={1}>
                  {rental.name}
                </Text>
                {!!detail && (
                  <Text style={styles.detail} numberOfLines={2}>
                    {detail}
                  </Text>
                )}
                {!!deposit && (
                  <View style={styles.depositLine}>
                    <View style={styles.depositDot} />
                    <Text style={styles.deposit}>{deposit}</Text>
                  </View>
                )}
              </View>
              {!!total && <Text style={styles.total}>{total}</Text>}
              {!!rental.key && <Icon name="chevronRight" size={18} color={colors.chevron} strokeWidth={2} />}
            </>
          );
          // A rental with no name can't open anyone, but a kept one can still be fixed
          return rental.key ? (
            <Pressable
              key={rental.id}
              onPress={open}
              {...holdProps}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityHint={holdable ? "Opens this customer. Press and hold to edit or delete it." : "Opens this customer"}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              {body}
            </Pressable>
          ) : holdable ? (
            <Pressable
              key={rental.id}
              {...holdProps}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityHint="Press and hold to edit or delete it"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              {body}
            </Pressable>
          ) : (
            <View key={rental.id} accessible accessibilityLabel={label} style={styles.row}>
              {body}
            </View>
          );
        })}
      </View>
      {fixable && <Text style={styles.hint}>Press and hold a kept rental to edit or delete it.</Text>}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  subtitle: { ...type.secondary, marginTop: 2, color: colors.ink2 },
  list: { marginTop: spacing.sm },
  row: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  pressed: { backgroundColor: colors.grouped },
  texts: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.ink },
  detail: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  // A deposit that wasn't settled: an orange dot, so it isn't forgotten
  depositLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  depositDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.brand },
  deposit: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.brandText },
  total: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink, fontVariant: ["tabular-nums"] },
  hint: { ...type.caption, marginTop: spacing.md, fontFamily: fonts.regular, color: colors.ink2 },
}));

export default PastRentersSection;
