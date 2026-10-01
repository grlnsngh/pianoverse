import React from "react";
import { Pressable, Text } from "react-native";
import { Sheet } from "@/components/ui";
import { fonts } from "@/constants/theme";
import type { RentPayment } from "@/lib/appwrite";
import { formatRupees } from "@/utils/money";
import { formatDay } from "@/utils/pianoDetail";
import { makeStyles } from "@/lib/ThemeContext";

export type PaymentAction = "receipt" | "edit" | "delete";

const ROWS: { action: PaymentAction; label: string }[] = [
  { action: "receipt", label: "Send receipt" },
  { action: "edit", label: "Edit payment" },
  { action: "delete", label: "Delete payment" },
];

export type PaymentActionsSheetProps = {
  /** The payment that was pressed and held. The sheet shows while there is one. */
  payment: RentPayment | null;
  onClose: () => void;
  onSelect: (action: PaymentAction) => void;
};

/**
 * What pressing and holding a payment opens: send its receipt, change it, or
 * delete it, one to a row. Delete is red.
 */
const PaymentActionsSheet = ({ payment, onClose, onSelect }: PaymentActionsSheetProps) => {
  const styles = useStyles();
  return (
    <Sheet
      visible={!!payment}
      onClose={onClose}
      tone="white"
      title={
        payment
          ? [formatRupees(payment.amount), formatDay(payment.paid_on)].filter(Boolean).join(" · ")
          : undefined
      }
      testID="payment-actions-sheet"
    >
      {ROWS.map(({ action, label }) => (
        <Pressable
          key={action}
          onPress={() => onSelect(action)}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Text style={[styles.label, action === "delete" && styles.destructive]}>{label}</Text>
        </Pressable>
      ))}
    </Sheet>
  );
};

const useStyles = makeStyles((colors) => ({
  row: {
    height: 52,
    justifyContent: "center",
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  pressed: { backgroundColor: colors.grouped },
  label: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.ink },
  destructive: { color: colors.late },
}));

export default PaymentActionsSheet;
