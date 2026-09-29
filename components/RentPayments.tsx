import { RentPayment } from "@/lib/appwrite";
import useRentPayments from "@/lib/useRentPayments";
import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate } from "@/utils/dates";
import { formatRupees } from "@/utils/money";
import { format } from "date-fns";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import RecordPaymentSheet from "./RecordPaymentSheet";

const formatDay = (day: string) => {
  const date = parseStoredDate(day);
  return date ? format(date, "d MMM yyyy") : "";
};

/**
 * The rent payments recorded for a rented piano, newest first, with what has
 * been received in total, and a way to record or delete a payment.
 */
const RentPayments = ({ piano }: { piano: PianoItem }) => {
  const { payments, status, reload, add, remove } = useRentPayments(piano.$id);
  const [showSheet, setShowSheet] = useState(false);

  const received = payments.reduce((total, payment) => total + payment.amount, 0);

  const confirmRemove = (payment: RentPayment) => {
    const message = `Delete the payment of ${formatRupees(
      payment.amount
    )} on ${formatDay(payment.paid_on)}? This cannot be undone.`;

    // Alert.alert does nothing on web
    if (Platform.OS === "web") {
      if (window.confirm(message)) remove(payment);
      return;
    }

    Alert.alert("Delete Payment", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => remove(payment),
      },
    ]);
  };

  return (
    <View className="bg-black-100/50 rounded-xl overflow-hidden">
      <View className="p-4 border-b border-gray-700">
        <Text className="text-lg text-white font-psemibold">Rent Payments</Text>
        {payments.length > 0 && (
          <Text className="text-sm text-gray-400 font-pregular">
            {formatRupees(received)} received
          </Text>
        )}
      </View>

      <View className="p-4 space-y-3">
        {status === "loading" && <ActivityIndicator color="#FF9C01" />}

        {status === "error" && (
          <View className="items-center py-2">
            <Text className="text-gray-300 font-pmedium">
              Couldn't load payments
            </Text>
            <TouchableOpacity
              onPress={reload}
              className="mt-3 px-5 py-2 rounded-xl border border-secondary/40"
            >
              <Text className="text-secondary font-psemibold">Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === "ready" && payments.length === 0 && (
          <Text className="text-gray-400 font-pregular">
            No payments recorded yet
          </Text>
        )}

        {status === "ready" &&
          payments.map((payment) => (
            <View
              key={payment.$id}
              className="flex-row items-center justify-between"
            >
              <View className="flex-1 mr-3">
                <Text className="text-white font-psemibold">
                  {formatRupees(payment.amount)}
                </Text>
                <Text className="text-sm text-gray-400 font-pregular">
                  {formatDay(payment.paid_on)}
                </Text>
                {!!payment.note && (
                  <Text className="text-sm text-gray-300 font-pregular">
                    {payment.note}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => confirmRemove(payment)}
                accessibilityLabel={`Delete payment of ${formatRupees(
                  payment.amount
                )}`}
              >
                <Text className="text-red-400 font-pmedium">Delete</Text>
              </TouchableOpacity>
            </View>
          ))}

        {status === "ready" && (
          <TouchableOpacity
            onPress={() => setShowSheet(true)}
            className="bg-secondary/20 rounded-xl py-3 border border-secondary/40 items-center"
          >
            <Text className="text-secondary font-psemibold">
              Record Payment
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <RecordPaymentSheet
        piano={piano}
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        onSave={add}
      />
    </View>
  );
};

export default RentPayments;
