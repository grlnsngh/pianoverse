import React from "react";
import { Text, View } from "react-native";
import { fonts } from "@/constants/theme";
import { formatRupees } from "@/utils/money";
import type { RecentPayment } from "@/utils/today";
import { makeStyles } from "@/lib/ThemeContext";

export type PaymentRowProps = {
  payment: RecentPayment;
};

/**
 * One line of Today's "Recent payments": who paid (or which piano), the piano
 * and the day under it, and the amount at the end. It only reports; nothing
 * opens from it.
 */
const PaymentRow = ({ payment }: PaymentRowProps) => {
  const styles = useStyles();
  const amount = formatRupees(payment.amount);

  return (
    <View
      accessible
      accessibilityLabel={`${payment.primary}, ${payment.secondary}, ${amount}`}
      style={styles.row}
    >
      <View style={styles.content}>
        <View style={styles.texts}>
          <Text style={styles.primary} numberOfLines={1}>
            {payment.primary}
          </Text>
          <Text style={styles.secondary} numberOfLines={1}>
            {payment.secondary}
          </Text>
        </View>
        <Text style={styles.amount}>{amount}</Text>
      </View>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  row: { paddingLeft: 20 },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingRight: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  texts: { flex: 1, minWidth: 0 },
  primary: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.ink },
  secondary: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink2 },
  amount: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
}));

export default React.memo(PaymentRow);
