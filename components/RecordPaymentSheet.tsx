import { NewPayment } from "@/lib/useRentPayments";
import { PianoItem } from "@/redux/pianos/types";
import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import BottomSheet from "./BottomSheet";
import CustomButton from "./CustomButton";
import DateField from "./DateField";
import FormField from "./FormField";
import PriceField from "./PriceField";

interface RecordPaymentSheetProps {
  piano: PianoItem;
  visible: boolean;
  onClose: () => void;
  // Resolves to whether the payment was saved
  onSave: (payment: NewPayment) => Promise<boolean>;
}

/** Records a rent payment: how much, when it was paid and an optional note. */
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

  // Start afresh each time, suggesting the rent
  useEffect(() => {
    if (!visible) return;
    setAmount(piano.rental_price ?? 0);
    setPaidOn(new Date());
    setNote("");
  }, [visible, piano.rental_price]);

  const handleSave = async () => {
    if (amount <= 0) {
      Alert.alert("Missing Details", "Please enter the amount.");
      return;
    }

    setSaving(true);
    const saved = await onSave({ amount, paidOn, note: note.trim() });
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <BottomSheet visible={visible} title="New Payment" onClose={onClose}>
      <PriceField title="Amount" value={amount} onChangeValue={setAmount} />
      <DateField
        title="Paid On"
        value={paidOn}
        onChange={setPaidOn}
        maximumDate={new Date()}
      />
      <FormField
        title="Note"
        value={note}
        placeholder="Optional"
        handleChangeText={setNote}
        otherStyles="mt-5"
      />
      <CustomButton
        title="Save Payment"
        handlePress={handleSave}
        isLoading={saving}
        containerStyles="mt-7"
      />
    </BottomSheet>
  );
};

export default RecordPaymentSheet;
