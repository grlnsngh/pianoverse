import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { format } from "date-fns";
import { Icon } from "@/components/ui";
import { colors, fonts, spacing, type } from "@/constants/theme";
import { Customer, customerLine } from "@/utils/customers";
import { formatRupees } from "@/utils/money";

export type CustomerRowProps = {
  customer: Customer;
  onOpen: (key: string) => void;
};

const AVATAR = 44;

/** The first letters of the first two words of a name, in capitals. */
const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

/**
 * One customer in the Customers list: their initials, their name, which
 * pianos and how many payments, and on the right what they have paid in all
 * and whether they have a piano now or when they last paid.
 */
const CustomerRow = ({ customer, onOpen }: CustomerRowProps) => {
  const total = formatRupees(customer.total);
  const note = customer.renting
    ? "Renting now"
    : customer.lastPaidOn
      ? `Last paid ${format(customer.lastPaidOn, "d MMM yyyy")}`
      : "";
  const line = customerLine(customer);

  return (
    <Pressable
      onPress={() => onOpen(customer.key)}
      accessibilityRole="button"
      accessibilityLabel={[customer.name, line, `paid ${total}`, note]
        .filter(Boolean)
        .join(", ")}
      accessibilityHint="Opens this customer"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        <Text style={styles.initials}>{initialsOf(customer.name)}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.texts}>
          <Text style={styles.name} numberOfLines={1}>
            {customer.name}
          </Text>
          <Text style={styles.line} numberOfLines={1}>
            {line}
          </Text>
        </View>
        <View style={styles.amounts}>
          <Text style={styles.total}>{total}</Text>
          {!!note && (
            <Text
              style={[styles.note, customer.renting && styles.renting]}
              numberOfLines={1}
            >
              {note}
            </Text>
          )}
        </View>
        <Icon
          name="chevronRight"
          size={18}
          color={colors.chevron}
          strokeWidth={2}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.screen,
  },
  pressed: { backgroundColor: colors.grouped },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.fill,
  },
  initials: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  content: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginLeft: 14,
    paddingVertical: 14,
    paddingRight: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  texts: { flex: 1, minWidth: 0 },
  name: { ...type.rowTitle, color: colors.ink },
  line: { ...type.secondary, color: colors.ink2 },
  amounts: { alignItems: "flex-end" },
  total: { ...type.rowTitle, color: colors.ink, fontVariant: ["tabular-nums"] },
  note: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
  renting: { fontFamily: fonts.semibold, color: colors.brandText },
});

export default CustomerRow;
