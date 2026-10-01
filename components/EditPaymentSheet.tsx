import React, { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { format, isToday } from "date-fns";
import { AmountInput, Button, DatePickerSheet, FormRow, Group, Sheet } from "@/components/ui";
import { type } from "@/constants/theme";
import type { RentPayment, RentPaymentChanges } from "@/lib/appwrite";
import { PianoItem } from "@/redux/pianos/types";
import { changesOf, draftOf, hasChanges, monthMoveNote, PaymentDraft } from "@/utils/paymentEdit";
import { makeStyles } from "@/lib/ThemeContext";

interface EditPaymentSheetProps {
  /** The payment being changed. The sheet shows while there is one. */
  payment: RentPayment | null;
  piano: PianoItem;
  onClose: () => void;
  /** Resolves to whether the change was saved */
  onSave: (payment: RentPayment, changes: RentPaymentChanges) => Promise<boolean>;
}

/** "Today, 29 Sep 2026", or "21 Sep 2026" for another day. */
const dayLabel = (date: Date) =>
  `${isToday(date) ? "Today, " : ""}${format(date, "d MMM yyyy")}`;

/**
 * Changes a payment that was recorded: the amount, the day it was paid, who
 * paid it and the note. Save changes is greyed out until something differs, and
 * only what differs is saved. Moving the day into another month says so, since
 * the income of both months changes.
 */
const EditPaymentSheet: React.FC<EditPaymentSheetProps> = ({ payment, piano, onClose, onSave }) => {
  const styles = useStyles();
  // What was being changed stays while the sheet leaves
  const [shown, setShown] = useState<RentPayment | null>(null);
  const [draft, setDraft] = useState<PaymentDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [choosingDay, setChoosingDay] = useState(false);

  // Start from the payment each time one is opened
  useEffect(() => {
    if (!payment) return;
    setShown(payment);
    setDraft(draftOf(payment));
    setChoosingDay(false);
  }, [payment]);

  const change = (fields: Partial<PaymentDraft>) =>
    setDraft((current) => (current ? { ...current, ...fields } : current));

  const changes = shown && draft ? changesOf(shown, draft) : {};
  const note = shown && draft ? monthMoveNote(shown, draft.paidOn) : null;

  const handleSave = async () => {
    if (!shown || !draft) return;
    if (draft.amount <= 0) {
      Alert.alert("Missing Details", "Please enter the amount.");
      return;
    }
    if (!hasChanges(changes)) {
      onClose();
      return;
    }

    setSaving(true);
    const saved = await onSave(shown, changes);
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <Sheet
      visible={!!payment}
      onClose={onClose}
      title="Edit payment"
      footer={
        <Button
          title="Save changes"
          loadingTitle="Saving"
          loading={saving}
          disabled={!hasChanges(changes)}
          onPress={handleSave}
        />
      }
    >
      {draft && (
        <>
          <Text style={styles.subject}>{piano.title}</Text>

          <AmountInput
            value={draft.amount}
            onChangeValue={(amount) => change({ amount })}
            label="Amount"
            width={180}
          />

          <Group inSheet style={styles.group}>
            <FormRow
              label="Paid on"
              value={dayLabel(draft.paidOn)}
              onPress={() => setChoosingDay(true)}
              chevron={false}
            />
            <FormRow
              label="Paid by"
              placeholder="Name"
              input={{
                value: draft.name,
                onChangeText: (name) => change({ name }),
                returnKeyType: "next",
                autoCapitalize: "words",
                autoCorrect: false,
              }}
            />
            <FormRow
              label="Note"
              placeholder="Cash, UPI, cheque no."
              input={{
                value: draft.note,
                onChangeText: (value) => change({ note: value }),
                returnKeyType: "done",
                autoCapitalize: "sentences",
              }}
            />
          </Group>

          {!!note && <Text style={styles.moves}>{note}</Text>}
          <View style={styles.bottom} />

          <DatePickerSheet
            visible={choosingDay}
            title="Paid on"
            value={draft.paidOn}
            maximumDate={new Date()}
            onSelect={(paidOn) => change({ paidOn })}
            onClose={() => setChoosingDay(false)}
          />
        </>
      )}
    </Sheet>
  );
};

const useStyles = makeStyles((colors) => ({
  subject: { ...type.secondary, textAlign: "center", color: colors.ink2 },
  group: { marginTop: 24 },
  moves: { ...type.caption, marginTop: 12, textAlign: "center", color: colors.ink2 },
  bottom: { height: 8 },
}));

export default EditPaymentSheet;
