import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { format, isToday, startOfToday } from "date-fns";
import { Button, DatePickerSheet, FormRow, Group, Sheet } from "@/components/ui";
import { colors, type } from "@/constants/theme";
import useReturnPiano from "@/lib/useReturnPiano";
import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate } from "@/utils/dates";
import { formatRupees } from "@/utils/money";
import type { RentBalance } from "@/utils/rentDue";

interface MarkReturnedSheetProps {
  piano: PianoItem;
  visible: boolean;
  onClose: () => void;
  /** What the renter still owes, when it is known, so the person is told before it stops showing */
  owing?: RentBalance | null;
}

/** "Today, 29 Sep 2026", or "21 Sep 2026" for another day. */
const dayLabel = (date: Date) =>
  `${isToday(date) ? "Today, " : ""}${format(date, "d MMM yyyy")}`;

/**
 * Marks a rented piano as returned: the day it came back (today unless the
 * person says otherwise, never in the future or before the rental started), and
 * one button. The rental is kept in the piano's history and the piano goes back
 * into stock. If the renter still owes rent, the sheet says so, since that no
 * longer shows in Rent due once the piano is returned.
 */
const MarkReturnedSheet: React.FC<MarkReturnedSheetProps> = ({
  piano,
  visible,
  onClose,
  owing = null,
}) => {
  const returnPiano = useReturnPiano();
  const [returnedOn, setReturnedOn] = useState(startOfToday());
  const [choosingDay, setChoosingDay] = useState(false);
  const [saving, setSaving] = useState(false);

  // Start afresh each time: it came back today
  useEffect(() => {
    if (!visible) return;
    setReturnedOn(startOfToday());
    setChoosingDay(false);
  }, [visible]);

  const customer = piano.rental_customer_name?.trim() || "";
  const start = parseStoredDate(piano.rental_period_start);
  // A rental can't come back before it started (one that starts later can be taken back today)
  const earliest = start && start <= startOfToday() ? start : undefined;
  const owes = owing && owing.due > 0 ? owing : null;

  const handleSave = async () => {
    setSaving(true);
    const saved = await returnPiano(piano, returnedOn);
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Mark as returned"
      footer={
        <Button
          title="Mark as returned"
          loadingTitle="Saving"
          loading={saving}
          onPress={handleSave}
        />
      }
    >
      <Text style={styles.subject}>{[customer, piano.title].filter(Boolean).join(" · ")}</Text>

      <Group inSheet style={styles.group}>
        <FormRow
          label="Returned on"
          value={dayLabel(returnedOn)}
          onPress={() => setChoosingDay(true)}
          chevron={false}
        />
      </Group>

      <Text style={styles.note}>
        The rental is saved in the piano’s history, and the piano goes back into stock.
      </Text>
      {owes && (
        <Text style={[styles.note, styles.owes]}>
          {`${customer || "The renter"} still owes ${formatRupees(owes.due)} of rent. Once the piano is returned it no longer shows in Rent due.`}
        </Text>
      )}
      <View style={styles.bottom} />

      <DatePickerSheet
        visible={choosingDay}
        title="Returned on"
        value={returnedOn}
        minimumDate={earliest}
        maximumDate={new Date()}
        onSelect={setReturnedOn}
        onClose={() => setChoosingDay(false)}
      />
    </Sheet>
  );
};

const styles = StyleSheet.create({
  subject: { ...type.secondary, textAlign: "center", color: colors.ink2 },
  group: { marginTop: 20 },
  note: {
    ...type.caption,
    marginTop: 12,
    marginHorizontal: 16,
    fontFamily: type.secondary.fontFamily,
    color: colors.ink2,
  },
  owes: { color: colors.late },
  bottom: { height: 8 },
});

export default MarkReturnedSheet;
