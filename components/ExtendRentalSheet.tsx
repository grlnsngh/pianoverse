import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { addDays, addMonths, format, startOfToday } from "date-fns";
import { Button, DatePickerSheet, Group, Icon, Sheet } from "@/components/ui";
import { colors, fonts, type } from "@/constants/theme";
import useUpdatePiano from "@/lib/useUpdatePiano";
import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate, toStoredDate } from "@/utils/dates";
import { getPianoRentalState } from "@/utils/pianoStatus";

interface ExtendRentalSheetProps {
  piano: PianoItem;
  visible: boolean;
  onClose: () => void;
}

/** The lengths on offer, in months, as on the ExtendRental board. */
const MONTHS = [1, 3, 6, 12] as const;
type Choice = (typeof MONTHS)[number] | "date";
/** The board opens with 3 months chosen. */
const DEFAULT_CHOICE: Choice = 3;

const day = (date: Date) => format(date, "d MMM yyyy");

/**
 * Moves a rental's end date on (ExtendRental board): 1, 3, 6 or 12 months, or a
 * date the person picks. The months are counted from today when the rental has
 * already ended, and from its end date while it is still running. The orange
 * button says the new end date and does it.
 */
const ExtendRentalSheet: React.FC<ExtendRentalSheetProps> = ({
  piano,
  visible,
  onClose,
}) => {
  const updatePiano = useUpdatePiano();
  const [choice, setChoice] = useState<Choice>(DEFAULT_CHOICE);
  const [choosingDate, setChoosingDate] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setChoice(DEFAULT_CHOICE);
    setChoosingDate(false);
  }, [visible]);

  const today = startOfToday();
  const currentEnd = parseStoredDate(piano.rental_period_end) ?? today;
  const ended = getPianoRentalState(piano) === "ended";
  // What the new period is counted from
  const base = ended ? today : currentEnd;

  const extendTo = async (newEnd: Date) => {
    setSaving(true);
    const saved = await updatePiano(
      piano,
      { rental_period_end: toStoredDate(newEnd) },
      `Rental extended to ${day(newEnd)}`,
      {
        undo: {
          fields: { rental_period_end: toStoredDate(currentEnd) },
          message: `Rental back to ${day(currentEnd)}`,
        },
      }
    );
    setSaving(false);
    if (saved) onClose();
  };

  const newEndFor = (months: number) => addMonths(base, months);
  const chosenEnd = choice === "date" ? null : newEndFor(choice);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Extend rental"
      footer={
        <Button
          title={chosenEnd ? `Extend to ${day(chosenEnd)}` : "Choose a date"}
          loadingTitle="Extending"
          loading={saving}
          onPress={() => (chosenEnd ? extendTo(chosenEnd) : setChoosingDate(true))}
        />
      }
    >
      <Text style={styles.explain}>
        {ended
          ? `This rental ended on ${day(currentEnd)}, so the new period is counted from today.`
          : `This rental ends on ${day(currentEnd)}. The new period is counted from that day.`}
      </Text>

      <Group inSheet style={styles.group}>
        {[...MONTHS, "date" as const].map((option) => {
          const selected = choice === option;
          const label = option === "date" ? "Choose a date" : `${option} month${option === 1 ? "" : "s"}`;
          const until = option === "date" ? "Pick the new end date" : `Until ${day(newEndFor(option))}`;
          return (
            <Pressable
              key={option}
              onPress={() => setChoice(option)}
              disabled={saving}
              accessibilityRole="radio"
              accessibilityLabel={`${label}, ${until}`}
              accessibilityState={{ selected }}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            >
              <View>
                <Text style={styles.optionLabel}>{label}</Text>
                <Text style={styles.optionUntil}>{until}</Text>
              </View>
              {selected && <Icon name="check" size={22} color={colors.ink} strokeWidth={2.6} />}
            </Pressable>
          );
        })}
      </Group>
      <View style={styles.bottom} />

      <DatePickerSheet
        visible={choosingDate}
        title="New end date"
        value={addDays(base, 1)}
        minimumDate={addDays(base, 1)}
        onSelect={(date) => extendTo(date)}
        onClose={() => setChoosingDate(false)}
      />
    </Sheet>
  );
};

const styles = StyleSheet.create({
  explain: { ...type.secondary, textAlign: "center", color: colors.ink2 },
  group: { marginTop: 20 },
  option: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
  },
  pressed: { backgroundColor: colors.grouped },
  optionLabel: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink },
  optionUntil: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  bottom: { height: 8 },
});

export default ExtendRentalSheet;
