import React, { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import DateRow from "@/components/DateRow";
import PriceRow from "@/components/PriceRow";
import { Button, DatePickerSheet, FormRow, Group, Sheet } from "@/components/ui";
import { COLUMN_LIMITS } from "@/constants/columnLimits";
import { formatRupees } from "@/utils/money";
import { type } from "@/constants/theme";
import type { RentalHistoryChanges, RentalHistoryEntry } from "@/lib/appwrite";
import { changesOf, draftOf, draftProblem, hasChanges, type RentalDraft } from "@/utils/rentalHistoryEdit";
import { makeStyles } from "@/lib/ThemeContext";

export type EditRentalSheetProps = {
  /** The kept rental being changed. The sheet shows while there is one. */
  entry: RentalHistoryEntry | null;
  /** The piano it was on, under the title */
  subject: string;
  onClose: () => void;
  /** Resolves to whether the change was saved; the sheet stays open when it wasn't */
  onSave: (entry: RentalHistoryEntry, changes: RentalHistoryChanges) => Promise<boolean>;
};

/** A date a kept rental may not have: "Not set" until one is chosen (nothing takes a date off). */
const OptionalDateRow = ({
  label,
  value,
  minimumDate,
  onChange,
}: {
  label: string;
  value: Date | null;
  minimumDate?: Date;
  onChange: (date: Date) => void;
}) => {
  const [open, setOpen] = useState(false);
  if (value) return <DateRow label={label} value={value} onChange={onChange} minimumDate={minimumDate} />;
  return (
    <>
      <FormRow label={label} value="Not set" onPress={() => setOpen(true)} />
      <DatePickerSheet
        visible={open}
        title={label}
        value={minimumDate ?? new Date()}
        minimumDate={minimumDate}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

/** "1250000" as "12,50,000": the digits typed so far grouped the Indian way, keeping any decimal part. */
const grouped = (raw: string) => {
  const [whole, decimals] = raw.split(".");
  const digits = whole ? Number(whole).toLocaleString("en-IN") : "";
  return decimals === undefined ? digits : `${digits || "0"}.${decimals}`;
};

/**
 * What was refunded of a deposit: empty is "not settled" and 0 is "none was
 * given back", which a plain amount field can't tell apart.
 */
const RefundedRow = ({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) => {
  const [raw, setRaw] = useState(value === null ? "" : String(value));
  // Follow changes made outside the field, such as the deposit being cleared
  useEffect(() => {
    const typed = raw === "" ? null : parseFloat(raw) || 0;
    if (typed !== value) setRaw(value === null ? "" : String(value));
  }, [value, raw]);
  return (
    <FormRow
      label="Refunded"
      prefix="₹"
      placeholder="Not settled"
      input={{
        value: grouped(raw),
        onChangeText: (input) => {
          const cleaned = input.replace(/[,\s]/g, "");
          if (!/^\d*\.?\d{0,2}$/.test(cleaned)) return;
          setRaw(cleaned);
          onChange(cleaned === "" ? null : parseFloat(cleaned) || 0);
        },
        keyboardType: "decimal-pad",
        strong: true,
      }}
    />
  );
};

/**
 * Fixes a kept rental (EditRental board): who rented it, their number and
 * address, the dates, the rent and its deposit (what was held, and what was
 * refunded: saying so settles a deposit that wasn't). Save changes is greyed out until something
 * differs, and only what differs is saved. The day it was kept and why are not
 * changed.
 */
const EditRentalSheet = ({ entry, subject, onClose, onSave }: EditRentalSheetProps) => {
  const styles = useStyles();
  // What was being changed stays while the sheet leaves
  const [shown, setShown] = useState<RentalHistoryEntry | null>(null);
  const [draft, setDraft] = useState<RentalDraft | null>(null);
  const [saving, setSaving] = useState(false);

  // Start from the rental each time one is opened
  useEffect(() => {
    if (!entry) return;
    setShown(entry);
    setDraft(draftOf(entry));
  }, [entry]);

  const change = (fields: Partial<RentalDraft>) =>
    setDraft((current) => (current ? { ...current, ...fields } : current));

  const changes = shown && draft ? changesOf(shown, draft) : {};

  const handleSave = async () => {
    if (!shown || !draft) return;
    const problem = draftProblem(draft);
    if (problem) {
      Alert.alert("Check the rental details", problem);
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
      visible={!!entry}
      onClose={onClose}
      title="Edit rental"
      leftLabel="Cancel"
      onLeftPress={onClose}
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
          <Text style={styles.subject}>{subject}</Text>

          <Group inSheet style={styles.group}>
            <FormRow
              label="Customer"
              placeholder="Name"
              input={{
                value: draft.name,
                onChangeText: (name) => change({ name }),
                returnKeyType: "next",
                autoCapitalize: "words",
                autoCorrect: false,
                maxLength: COLUMN_LIMITS.rental_history.customer_name,
              }}
            />
            <FormRow
              label="Mobile"
              placeholder="Optional"
              input={{
                value: draft.mobile,
                onChangeText: (mobile) => change({ mobile }),
                keyboardType: "phone-pad",
                returnKeyType: "next",
                maxLength: COLUMN_LIMITS.rental_history.customer_mobile,
              }}
            />
            <FormRow
              label="Address"
              placeholder="Optional"
              input={{
                value: draft.address,
                onChangeText: (address) => change({ address }),
                returnKeyType: "next",
                autoCapitalize: "words",
                maxLength: COLUMN_LIMITS.rental_history.customer_address,
              }}
            />
            <OptionalDateRow label="Starts" value={draft.start} onChange={(start) => change({ start })} />
            <OptionalDateRow
              label="Ends"
              value={draft.end}
              minimumDate={draft.start ?? undefined}
              onChange={(end) => change({ end })}
            />
            <PriceRow
              label="Rent"
              placeholder="Optional"
              value={draft.price}
              onChangeValue={(price) => change({ price })}
            />
          </Group>

          <Text style={styles.groupTitle} accessibilityRole="header">
            Deposit
          </Text>
          <Group inSheet>
            <PriceRow
              label="Deposit"
              placeholder="None"
              value={draft.deposit}
              onChangeValue={(deposit) => change(deposit > 0 ? { deposit } : { deposit: 0, refunded: null })}
            />
            {draft.deposit > 0 && (
              <RefundedRow key={shown?.$id} value={draft.refunded} onChange={(refunded) => change({ refunded })} />
            )}
            {draft.deposit > 0 && draft.refunded !== null && (
              <FormRow label="Kept" value={formatRupees(Math.max(0, Math.round((draft.deposit - draft.refunded) * 100) / 100))} />
            )}
          </Group>
          <Text style={styles.note}>
            Kept is the deposit less what you refunded. Saying what was refunded settles the deposit.
          </Text>

          <Text style={styles.note}>
            What a customer paid is matched to a rental by their name and these dates, so changing them can move
            payments to or from it.
          </Text>
          <View style={styles.bottom} />
        </>
      )}
    </Sheet>
  );
};

const useStyles = makeStyles((colors) => ({
  subject: { ...type.secondary, textAlign: "center", color: colors.ink2 },
  group: { marginTop: 20 },
  groupTitle: { ...type.status, marginTop: 16, marginLeft: 16, marginBottom: 8, color: colors.ink2 },
  note: { ...type.caption, marginTop: 12, marginHorizontal: 16, fontFamily: type.secondary.fontFamily, color: colors.ink2 },
  bottom: { height: 8 },
}));

export default EditRentalSheet;
