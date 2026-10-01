import React, { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { format, isToday } from "date-fns";
import { AmountInput, Button, DatePickerSheet, FormRow, Group, Sheet } from "@/components/ui";
import { type } from "@/constants/theme";
import useUpdatePiano from "@/lib/useUpdatePiano";
import { PianoItem } from "@/redux/pianos/types";
import { toStoredDate } from "@/utils/dates";
import { makeStyles } from "@/lib/ThemeContext";

interface MarkAsSoldSheetProps {
  piano: PianoItem;
  visible: boolean;
  onClose: () => void;
}

/** "Today, 29 Sep 2026", or "21 Sep 2026" for another day. */
const dayLabel = (date: Date) =>
  `${isToday(date) ? "Today, " : ""}${format(date, "d MMM yyyy")}`;

/**
 * Records that a piano was sold (MarkSold board): the price big and centred,
 * suggesting the asking price of a piano on sale, then the day, the buyer and
 * an optional address, and one orange button.
 */
const MarkAsSoldSheet: React.FC<MarkAsSoldSheetProps> = ({
  piano,
  visible,
  onClose,
}) => {
  const styles = useStyles();
  const updatePiano = useUpdatePiano();
  const [buyerName, setBuyerName] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [price, setPrice] = useState(0);
  const [saleDate, setSaleDate] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [choosingDay, setChoosingDay] = useState(false);

  // Start afresh each time, suggesting the asking price of a piano on sale
  useEffect(() => {
    if (!visible) return;
    setBuyerName("");
    setBuyerAddress("");
    setPrice(piano.on_sale_price ?? 0);
    setSaleDate(new Date());
    setChoosingDay(false);
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
      `Marked ${piano.title} as sold`,
      {
        undo: {
          fields: { sold_date: null, sold_price: null, sold_to_name: null, sold_to_address: null },
          message: `${piano.title} is back in stock`,
        },
      }
    );
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Mark as sold"
      footer={
        <Button title="Confirm sale" loadingTitle="Saving" loading={saving} onPress={handleSave} />
      }
    >
      <Text style={styles.subject}>{`Sale price for ${piano.title}`}</Text>

      <AmountInput value={price} onChangeValue={setPrice} label="Sale price" width={210} />

      <Group inSheet style={styles.group}>
        <FormRow
          label="Sold on"
          value={dayLabel(saleDate)}
          onPress={() => setChoosingDay(true)}
          chevron={false}
        />
        <FormRow
          label="Buyer"
          placeholder="Who bought it?"
          input={{
            value: buyerName,
            onChangeText: setBuyerName,
            autoCapitalize: "words",
            returnKeyType: "next",
          }}
        />
        <FormRow
          label="Address"
          placeholder="Optional"
          input={{
            value: buyerAddress,
            onChangeText: setBuyerAddress,
            autoCapitalize: "sentences",
            returnKeyType: "done",
          }}
        />
      </Group>

      <Text style={styles.note}>
        The piano leaves your stock and is marked Sold. You can undo this later from its page.
      </Text>
      <View style={styles.bottom} />

      <DatePickerSheet
        visible={choosingDay}
        title="Sold on"
        value={saleDate}
        maximumDate={new Date()}
        onSelect={setSaleDate}
        onClose={() => setChoosingDay(false)}
      />
    </Sheet>
  );
};

const useStyles = makeStyles((colors) => ({
  subject: { ...type.secondary, textAlign: "center", color: colors.ink2 },
  group: { marginTop: 20 },
  note: { ...type.caption, marginTop: 12, marginHorizontal: 16, fontFamily: type.secondary.fontFamily, color: colors.ink2 },
  bottom: { height: 8 },
}));

export default MarkAsSoldSheet;
