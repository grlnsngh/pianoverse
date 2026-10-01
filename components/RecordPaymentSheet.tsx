import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { format, isToday } from "date-fns";
import { AmountInput, Button, DatePickerSheet, FormRow, Group, Sheet } from "@/components/ui";
import { colors, type } from "@/constants/theme";
import { NewPayment } from "@/lib/useRentPayments";
import { PianoItem } from "@/redux/pianos/types";
import { formatRupees } from "@/utils/money";

interface RecordPaymentSheetProps {
  piano: PianoItem;
  visible: boolean;
  onClose: () => void;
  // Resolves to whether the payment was saved
  onSave: (payment: NewPayment) => Promise<boolean>;
}

/** "Today, 29 Sep 2026", or "21 Sep 2026" for another day. */
const dayLabel = (date: Date) =>
  `${isToday(date) ? "Today, " : ""}${format(date, "d MMM yyyy")}`;

/**
 * Records a rent payment (RecordPayment board): the amount big and centred,
 * suggesting the rent, then the day it was paid and an optional note, and one
 * orange button. The renter's name is saved with the payment, so the name
 * stays right if the piano is rented to someone else later.
 */
const RecordPaymentSheet: React.FC<RecordPaymentSheetProps> = ({
  piano,
  visible,
  onClose,
  onSave,
}) => {
  const [amount, setAmount] = useState(0);
  const [paidOn, setPaidOn] = useState(new Date());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [choosingDay, setChoosingDay] = useState(false);

  // Start afresh each time, suggesting the rent
  useEffect(() => {
    if (!visible) return;
    setAmount(piano.rental_price ?? 0);
    setPaidOn(new Date());
    setNote("");
    setChoosingDay(false);
  }, [visible, piano.rental_price]);

  const customer = piano.rental_customer_name?.trim() || "";

  const handleSave = async () => {
    if (amount <= 0) {
      Alert.alert("Missing Details", "Please enter the amount.");
      return;
    }

    setSaving(true);
    const saved = await onSave({
      amount,
      paidOn,
      note: note.trim(),
      customerName: customer || undefined,
    });
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Record payment"
      footer={
        <Button title="Save payment" loadingTitle="Saving" loading={saving} onPress={handleSave} />
      }
    >
      <Text style={styles.subject}>{[customer, piano.title].filter(Boolean).join(" · ")}</Text>

      <AmountInput value={amount} onChangeValue={setAmount} label="Amount" width={180} />
      {!!piano.rental_price && (
        <Text style={styles.subject}>{`Rent is ${formatRupees(piano.rental_price)}`}</Text>
      )}

      <Group inSheet style={styles.group}>
        <FormRow
          label="Paid on"
          value={dayLabel(paidOn)}
          onPress={() => setChoosingDay(true)}
          chevron={false}
        />
        <FormRow
          label="Note"
          placeholder="Cash, UPI, cheque no."
          input={{
            value: note,
            onChangeText: setNote,
            returnKeyType: "done",
            autoCapitalize: "sentences",
          }}
        />
      </Group>
      <View style={styles.bottom} />

      <DatePickerSheet
        visible={choosingDay}
        title="Paid on"
        value={paidOn}
        maximumDate={new Date()}
        onSelect={setPaidOn}
        onClose={() => setChoosingDay(false)}
      />
    </Sheet>
  );
};

const styles = StyleSheet.create({
  subject: { ...type.secondary, textAlign: "center", color: colors.ink2 },
  group: { marginTop: 24 },
  bottom: { height: 8 },
});

export default RecordPaymentSheet;
