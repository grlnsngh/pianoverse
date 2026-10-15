import { addMonths, format, isToday } from "date-fns";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Button, DatePickerSheet, FormRow, Group, Icon, Sheet } from "@/components/ui";
import { useAmountText } from "@/components/ui/AmountInput";
import { COLUMN_LIMITS } from "@/constants/columnLimits";
import { fonts, spacing, type } from "@/constants/theme";
import type { ServiceEntryChanges } from "@/lib/appwrite";
import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate } from "@/utils/dates";
import {
  intervalLabel,
  intervalOf,
  SERVICE_KINDS,
  type ServiceEntry,
  type ServiceKind,
} from "@/utils/serviceLog";
import { makeStyles, useColors } from "@/lib/ThemeContext";

export interface ServiceDraft {
  kind: ServiceKind;
  servicedOn: Date;
  cost: number;
  note: string;
}

const draftOf = (entry: ServiceEntry | null): ServiceDraft => ({
  kind: (SERVICE_KINDS.find((option) => option.kind === entry?.kind)?.kind ?? "tuning") as ServiceKind,
  servicedOn: (entry && parseStoredDate(entry.serviced_on)) || new Date(),
  cost: entry?.cost ?? 0,
  note: entry?.note ?? "",
});

/** Only what differs from the entry, as Appwrite takes it. */
export const serviceChanges = (entry: ServiceEntry, draft: ServiceDraft): ServiceEntryChanges => {
  const before = draftOf(entry);
  const changes: ServiceEntryChanges = {};
  if (draft.kind !== before.kind) changes.kind = draft.kind;
  if (format(draft.servicedOn, "yyyy-MM-dd") !== format(before.servicedOn, "yyyy-MM-dd")) changes.servicedOn = draft.servicedOn;
  if (draft.cost !== before.cost) changes.cost = draft.cost || null;
  if (draft.note.trim() !== before.note.trim()) changes.note = draft.note;
  return changes;
};

/** "Today, 29 Sep 2026", or "21 Sep 2026" for another day. */
const dayLabel = (date: Date) => `${isToday(date) ? "Today, " : ""}${format(date, "d MMM yyyy")}`;

export interface LogServiceSheetProps {
  piano: PianoItem;
  visible: boolean;
  /** The entry being changed; none to log a new one */
  entry?: ServiceEntry | null;
  onClose: () => void;
  /** Resolves to whether it was saved; the sheet stays open when it wasn't */
  onSave: (draft: ServiceDraft) => Promise<boolean>;
  /** Opens the piano's tuning interval (the "Change" under a tuning) */
  onChangeInterval?: () => void;
}

/**
 * Logs a service, or changes one (LogService board): the kind, the day it
 * was done, an optional cost and a note. For a tuning it says when the next
 * one will be, from the piano's interval.
 */
const LogServiceSheet = ({ piano, visible, entry = null, onClose, onSave, onChangeInterval }: LogServiceSheetProps) => {
  const colors = useColors();
  const styles = useStyles();
  const [draft, setDraft] = useState<ServiceDraft>(draftOf(entry));
  const [saving, setSaving] = useState(false);
  const [choosingDay, setChoosingDay] = useState(false);
  const cost = useAmountText(draft.cost, (value) => change({ cost: value }));

  // Start afresh each time it opens
  useEffect(() => {
    if (!visible) return;
    setDraft(draftOf(entry));
    setChoosingDay(false);
  }, [visible, entry]);

  const change = (fields: Partial<ServiceDraft>) => setDraft((current) => ({ ...current, ...fields }));

  const months = intervalOf(piano);
  const editing = !!entry;
  const unchanged = entry ? Object.keys(serviceChanges(entry, draft)).length === 0 : false;

  const save = async () => {
    if (unchanged) {
      onClose();
      return;
    }
    setSaving(true);
    const saved = await onSave(draft);
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? "Edit service" : "Log service"}
      leftLabel="Cancel"
      onLeftPress={onClose}
      footer={
        <Button
          title={editing ? "Save changes" : "Save service"}
          loadingTitle="Saving"
          loading={saving}
          disabled={unchanged}
          onPress={save}
        />
      }
    >
      <Text style={styles.subject}>
        {[piano.title, piano.rental_customer_name?.trim()].filter(Boolean).join(" · ")}
      </Text>

      <View style={styles.kinds} accessibilityRole="radiogroup" accessibilityLabel="Kind of service">
        {SERVICE_KINDS.map((option) => {
          const chosen = draft.kind === option.kind;
          return (
            <Pressable
              key={option.kind}
              onPress={() => change({ kind: option.kind })}
              accessibilityRole="radio"
              accessibilityState={{ checked: chosen }}
              accessibilityLabel={option.label}
              style={[styles.kind, chosen && styles.kindOn]}
            >
              <Icon name={option.icon} size={18} color={chosen ? colors.onInk : colors.ink} strokeWidth={1.8} />
              <Text style={[styles.kindLabel, chosen && styles.kindLabelOn]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Group inSheet style={styles.group}>
        <FormRow label="Done on" value={dayLabel(draft.servicedOn)} onPress={() => setChoosingDay(true)} chevron={false} />
        <FormRow
          label="Cost"
          prefix="₹"
          placeholder="Optional"
          input={{
            value: cost.text,
            onChangeText: cost.onChangeText,
            keyboardType: "decimal-pad",
            returnKeyType: "next",
          }}
        />
        <FormRow
          label="Note"
          placeholder="What was done"
          input={{
            value: draft.note,
            onChangeText: (note) => change({ note }),
            returnKeyType: "done",
            autoCapitalize: "sentences",
            maxLength: COLUMN_LIMITS.service_log.note,
          }}
        />
      </Group>

      {draft.kind === "tuning" && (
        <View style={styles.next}>
          <Icon name="calendar" size={20} color={colors.ink} strokeWidth={1.8} />
          <View style={styles.nextTexts}>
            <Text style={styles.nextTitle}>
              {months === 0 ? "No tuning reminders for this piano" : `Next tuning: ${format(addMonths(draft.servicedOn, months), "d MMM yyyy")}`}
            </Text>
            <Text style={styles.nextSub}>
              {months === 0 ? "Its interval is set to no reminders. " : `This piano is tuned ${intervalLabel(months).toLowerCase()}. `}
              {!!onChangeInterval && (
                <Text style={styles.link} onPress={onChangeInterval} accessibilityRole="link">
                  Change
                </Text>
              )}
            </Text>
          </View>
        </View>
      )}
      <View style={styles.bottom} />

      <DatePickerSheet
        visible={choosingDay}
        title="Done on"
        value={draft.servicedOn}
        maximumDate={new Date()}
        onSelect={(servicedOn) => change({ servicedOn })}
        onClose={() => setChoosingDay(false)}
      />
    </Sheet>
  );
};

const useStyles = makeStyles((colors) => ({
  subject: { ...type.secondary, textAlign: "center", color: colors.ink2 },
  kinds: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: 18 },
  kind: {
    minHeight: 44,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    backgroundColor: colors.surface,
  },
  kindOn: { borderColor: colors.ink, backgroundColor: colors.ink },
  kindLabel: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink },
  kindLabelOn: { color: colors.onInk },
  group: { marginTop: 20 },
  next: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: spacing.lg,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  nextTexts: { flex: 1, minWidth: 0 },
  nextTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink },
  nextSub: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  link: { fontFamily: fonts.semibold, color: colors.brandText },
  bottom: { height: 8 },
}));

export default LogServiceSheet;
