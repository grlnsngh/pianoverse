import useUpdatePiano from "@/lib/useUpdatePiano";
import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate, toStoredDate } from "@/utils/dates";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addDays, addMonths, format } from "date-fns";
import React, { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import BottomSheet from "./BottomSheet";

interface ExtendRentalSheetProps {
  piano: PianoItem;
  visible: boolean;
  onClose: () => void;
}

const EXTENSIONS = [1, 3, 6];

const formatDay = (date: Date) => format(date, "EEE, d MMM yyyy");

/**
 * Moves a rental's end date on by one, three or six months (counted from the
 * current end date, so an overdue period is covered) or to a chosen date.
 * Each choice saves straight away.
 */
const ExtendRentalSheet: React.FC<ExtendRentalSheetProps> = ({
  piano,
  visible,
  onClose,
}) => {
  const updatePiano = useUpdatePiano();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentEnd = parseStoredDate(piano.rental_period_end) ?? new Date();

  const extendTo = async (newEnd: Date) => {
    setSaving(true);
    const saved = await updatePiano(
      piano,
      { rental_period_end: toStoredDate(newEnd) },
      `Rental extended to ${format(newEnd, "d MMM yyyy")}`
    );
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <BottomSheet visible={visible} title="Extend Rental" onClose={onClose}>
      <Text className="text-gray-100 font-pregular mt-2 mb-4">
        Currently ends {formatDay(currentEnd)}
      </Text>

      {EXTENSIONS.map((months) => {
        const newEnd = addMonths(currentEnd, months);
        const label = `${months} month${months === 1 ? "" : "s"}`;
        return (
          <TouchableOpacity
            key={months}
            onPress={() => extendTo(newEnd)}
            disabled={saving}
            className="flex-row items-center justify-between bg-black-100 rounded-xl px-4 py-4 mb-3 border border-black-200"
            accessibilityLabel={`Extend by ${label}`}
          >
            <Text className="text-white font-psemibold text-base">
              + {label}
            </Text>
            <Text className="text-gray-100 font-pregular text-sm">
              until {formatDay(newEnd)}
            </Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        disabled={saving}
        className="bg-black-100 rounded-xl px-4 py-4 border border-black-200"
      >
        <Text className="text-secondary font-psemibold text-base">
          Choose a date…
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={addDays(currentEnd, 1)}
          mode="date"
          display="default"
          minimumDate={addDays(currentEnd, 1)}
          onChange={(event: any, date?: Date) => {
            setShowDatePicker(false);
            if (event?.type !== "dismissed" && date) extendTo(date);
          }}
        />
      )}

      {saving && (
        <View className="mt-4 items-center">
          <ActivityIndicator color="#FF9C01" />
        </View>
      )}
    </BottomSheet>
  );
};

export default ExtendRentalSheet;
