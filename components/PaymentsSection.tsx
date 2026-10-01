import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import PaymentActionsSheet, { PaymentAction } from "@/components/PaymentActionsSheet";
import { Button, Spinner } from "@/components/ui";
import { fonts, spacing, type } from "@/constants/theme";
import type { RentPayment } from "@/lib/appwrite";
import type { PaymentsStatus } from "@/lib/useRentPayments";
import { formatRupees } from "@/utils/money";
import { formatDay, PAYMENTS_SHOWN, paymentsSummary } from "@/utils/pianoDetail";
import { SectionTitle } from "./DetailParts";
import { makeStyles } from "@/lib/ThemeContext";

export type PaymentsSectionProps = {
  payments: RentPayment[];
  status: PaymentsStatus;
  /** Loads them again after they couldn't be loaded */
  onRetry: () => void;
  /** Asks to delete a payment (chosen after pressing and holding it) */
  onDelete: (payment: RentPayment) => void;
  /** Opens a payment to change it (chosen after pressing and holding it) */
  onEdit: (payment: RentPayment) => void;
  /** Sends the receipt of a payment (the person taps it, or chooses it after pressing and holding) */
  onReceipt: (payment: RentPayment) => void;
};

// The sheet takes 240 ms to leave; what it chose runs after that, so the
// sheet or dialog it opens isn't started under a sheet that is still going
const SHEET_CLOSE_MS = 300;

/**
 * A rented piano's Payments section: what has been received in all, the latest
 * three payments, and "Show all N payments" for the rest. Tapping a payment
 * sends its receipt; pressing and holding it offers to send the receipt, edit
 * the payment or delete it (which asks first).
 */
const PaymentsSection = ({
  payments,
  status,
  onRetry,
  onDelete,
  onEdit,
  onReceipt,
}: PaymentsSectionProps) => {
  const styles = useStyles();
  const [showAll, setShowAll] = useState(false);
  // The payment that was pressed and held, while its choices are showing
  const [held, setHeld] = useState<RentPayment | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const choose = (action: PaymentAction) => {
    const payment = held;
    setHeld(null);
    if (!payment) return;
    const run = { receipt: onReceipt, edit: onEdit, delete: onDelete }[action];
    timer.current = setTimeout(() => run(payment), SHEET_CLOSE_MS);
  };
  const shown = showAll ? payments : payments.slice(0, PAYMENTS_SHOWN);
  const hidden = payments.length - PAYMENTS_SHOWN;

  return (
    <View>
      <SectionTitle>Payments</SectionTitle>

      {status === "loading" && (
        <View style={styles.centered}>
          <Spinner size={24} accessibilityLabel="Loading payments" />
        </View>
      )}

      {status === "error" && (
        <View style={styles.centered}>
          <Text style={styles.note}>Couldn't load payments</Text>
          <Button title="Retry" variant="text" size="compact" onPress={onRetry} />
        </View>
      )}

      {status === "ready" && payments.length === 0 && (
        <Text style={styles.subtitle}>No payments recorded yet</Text>
      )}

      {status === "ready" && payments.length > 0 && (
        <>
          <Text style={styles.subtitle}>{paymentsSummary(payments)}</Text>

          <View style={styles.list}>
            {shown.map((payment) => {
              const date = formatDay(payment.paid_on) ?? "";
              const amount = formatRupees(payment.amount);
              return (
                <Pressable
                  key={payment.$id}
                  onPress={() => onReceipt(payment)}
                  onLongPress={() => setHeld(payment)}
                  accessibilityRole="button"
                  accessibilityLabel={[date, payment.note, amount].filter(Boolean).join(", ")}
                  accessibilityHint="Sends a receipt. Press and hold to edit or delete this payment"
                  accessibilityActions={[
                    { name: "receipt", label: "Send receipt" },
                    { name: "edit", label: "Edit payment" },
                    { name: "delete", label: "Delete payment" },
                  ]}
                  onAccessibilityAction={(event) => {
                    if (event.nativeEvent.actionName === "receipt") onReceipt(payment);
                    if (event.nativeEvent.actionName === "edit") onEdit(payment);
                    if (event.nativeEvent.actionName === "delete") onDelete(payment);
                  }}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={styles.texts}>
                    <Text style={styles.date}>{date}</Text>
                    {!!payment.note && (
                      <Text style={styles.paymentNote} numberOfLines={1}>
                        {payment.note}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.amount}>{amount}</Text>
                </Pressable>
              );
            })}
          </View>

          {hidden > 0 && (
            <Button
              title={showAll ? "Show fewer" : `Show all ${payments.length} payments`}
              variant="outline"
              size="compact"
              onPress={() => setShowAll((value) => !value)}
              style={styles.showAll}
            />
          )}

          <Text style={styles.hint}>
            Tap a payment to send a receipt. Press and hold to edit or delete it.
          </Text>
        </>
      )}

      <PaymentActionsSheet payment={held} onClose={() => setHeld(null)} onSelect={choose} />
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  subtitle: { ...type.secondary, marginTop: 2, color: colors.ink2 },
  centered: { alignItems: "center", paddingVertical: spacing.lg, gap: spacing.sm },
  note: { ...type.bodyMedium, color: colors.ink2 },
  list: { marginTop: spacing.sm },
  row: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  pressed: { backgroundColor: colors.grouped },
  texts: { flexShrink: 1, minWidth: 0 },
  date: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.ink },
  paymentNote: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  amount: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  showAll: { marginTop: spacing.lg },
  hint: { ...type.caption, marginTop: spacing.md, fontFamily: fonts.regular, color: colors.ink2 },
}));

export default PaymentsSection;
