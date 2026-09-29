import useUpdatePiano from "@/lib/useUpdatePiano";
import { PianoItem } from "@/redux/pianos/types";
import { toStoredDate } from "@/utils/dates";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import BottomSheet from "./BottomSheet";
import CustomButton from "./CustomButton";
import FormField from "./FormField";
import PriceField from "./PriceField";

interface MarkAsSoldSheetProps {
  piano: PianoItem;
  visible: boolean;
  onClose: () => void;
}

/** Records who bought the piano, for how much and when. */
const MarkAsSoldSheet: React.FC<MarkAsSoldSheetProps> = ({
  piano,
  visible,
  onClose,
}) => {
  const updatePiano = useUpdatePiano();
  const [buyerName, setBuyerName] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [price, setPrice] = useState(0);
  const [saleDate, setSaleDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Start afresh each time, suggesting the asking price of a piano on sale
  useEffect(() => {
    if (!visible) return;
    setBuyerName("");
    setBuyerAddress("");
    setPrice(piano.on_sale_price ?? 0);
    setSaleDate(new Date());
  }, [visible]);

  const handleSave = async () => {
    if (!buyerName.trim()) {
      Alert.alert("Missing Details", "Please enter the buyer's name.");
      return;
    }
    if (price <= 0) {
      Alert.alert("Missing Details", "Please enter the sale price.");
      return;
    }

    setSaving(true);
    const saved = await updatePiano(
      piano,
      {
        sold_to_name: buyerName.trim(),
        sold_to_address: buyerAddress.trim() || null,
        sold_price: price,
        sold_date: toStoredDate(saleDate),
      },
      `Marked ${piano.title} as sold`
    );
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <BottomSheet visible={visible} title="Mark as Sold" onClose={onClose}>
      <FormField
        title="Buyer Name"
        value={buyerName}
        placeholder="Who bought it?"
        handleChangeText={setBuyerName}
        otherStyles="mt-5"
      />
      <FormField
        title="Buyer Address"
        value={buyerAddress}
        placeholder="Optional"
        handleChangeText={setBuyerAddress}
        otherStyles="mt-5"
      />
      <PriceField title="Sale Price" value={price} onChangeValue={setPrice} />
      <FormField
        title="Sale Date"
        value={saleDate.toDateString()}
        handleChangeText={() => {}}
        onFocus={() => setShowDatePicker(true)}
        otherStyles="mt-5"
      />
      {showDatePicker && (
        <DateTimePicker
          value={saleDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(_event: any, date?: Date) => {
            setShowDatePicker(false);
            if (date) setSaleDate(date);
          }}
        />
      )}
      <CustomButton
        title="Mark as Sold"
        handlePress={handleSave}
        isLoading={saving}
        containerStyles="mt-7"
      />
    </BottomSheet>
  );
};

export default MarkAsSoldSheet;
