import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Spinner } from "@/components/ui";
import { colors, fonts, spacing, type } from "@/constants/theme";
import type { RentPayment } from "@/lib/appwrite";
import type { PaymentsStatus } from "@/lib/useRentPayments";
import { formatRupees } from "@/utils/money";
import { formatDay, PAYMENTS_SHOWN, paymentsSummary } from "@/utils/pianoDetail";
import { SectionTitle } from "./DetailParts";

export type PaymentsSectionProps = {
  payments: RentPayment[];
  status: PaymentsStatus;
  /** Loads them again after they couldn't be loaded */
  onRetry: () => void;
  /** Asks to delete a payment (the person presses and holds it) */
  onDelete: (payment: RentPayment) => void;
};

/**
 * A rented piano's Payments section: what has been received in all, the latest
 * three payments, and "Show all N payments" for the rest. A payment is deleted
 * by pressing and holding it, which asks first.
 */
const PaymentsSection = ({ payments, status, onRetry, onDelete }: PaymentsSectionProps) => {
  const [showAll, setShowAll] = useState(false);
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
                  onLongPress={() => onDelete(payment)}
                  accessibilityLabel={[date, payment.note, amount].filter(Boolean).join(", ")}
                  accessibilityHint="Press and hold to delete this payment"
                  accessibilityActions={[{ name: "delete", label: "Delete payment" }]}
                  onAccessibilityAction={(event) => {
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

          <Text style={styles.hint}>Press and hold a payment to delete it.</Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default PaymentsSection;
