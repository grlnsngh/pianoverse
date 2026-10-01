import React from "react";
import { Pressable, Text, View } from "react-native";
import { Icon } from "@/components/ui";
import { fonts, spacing, type } from "@/constants/theme";
import { formatRupees } from "@/utils/money";
import { PastRental, pastRentalDetail } from "@/utils/customers";
import { SectionTitle } from "./DetailParts";
import { makeStyles, useColors } from "@/lib/ThemeContext";

export type PastRentersSectionProps = {
  rentals: PastRental[];
  /** Opens a customer's page, with the key that names them */
  onOpen: (key: string) => void;
};

/**
 * "Previous renters" on a rented piano's page: the rentals it has had before
 * this one, the one that ended last first. A kept rental shows its dates and
 * rent and what that person paid in it; someone who only appears in the
 * piano's payments (from before rentals were kept) shows their payments.
 */
const PastRentersSection = ({ rentals, onOpen }: PastRentersSectionProps) => {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View>
      <SectionTitle>Previous renters</SectionTitle>
      <Text style={styles.subtitle}>
        {rentals.length === 1 ? "1 earlier rental" : `${rentals.length} earlier rentals`}
      </Text>
      <View style={styles.list}>
        {rentals.map((rental) => {
          const detail = pastRentalDetail(rental);
          const total = rental.paymentsCount > 0 ? formatRupees(rental.total) : "";
          const open = () => onOpen(rental.key);
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
              </View>
              {!!total && <Text style={styles.total}>{total}</Text>}
              {!!rental.key && <Icon name="chevronRight" size={18} color={colors.chevron} strokeWidth={2} />}
            </>
          );
          // A rental with no name can't open anyone
          return rental.key ? (
            <Pressable
              key={rental.id}
              onPress={open}
              accessibilityRole="button"
              accessibilityLabel={[rental.name, detail, total].filter(Boolean).join(", ")}
              accessibilityHint="Opens this customer"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              {body}
            </Pressable>
          ) : (
            <View
              key={rental.id}
              accessible
              accessibilityLabel={[rental.name, detail, total].filter(Boolean).join(", ")}
              style={styles.row}
            >
              {body}
            </View>
          );
        })}
      </View>
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
  total: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink, fontVariant: ["tabular-nums"] },
}));

export default PastRentersSection;
