import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface DateFieldProps {
  title: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  otherStyles?: string;
}

/**
 * A field showing a date that opens the date picker when tapped. It looks
 * like the text fields but is a button, so it never brings up the keyboard
 * and opens the picker on every tap (a text field only did so when it wasn't
 * already focused).
 */
const DateField: React.FC<DateFieldProps> = ({
  title,
  value,
  onChange,
  minimumDate,
  maximumDate,
  otherStyles = "mt-7",
}) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View className={`space-y-2 ${otherStyles}`}>
      <Text className="text-base text-gray-100 font-pmedium">{title}</Text>
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityValue={{ text: value.toDateString() }}
        style={{ height: 60 }}
        className={`w-full px-4 bg-black-100 rounded-2xl border-2 flex-row items-center ${
          showPicker ? "border-secondary" : "border-black-200"
        }`}
      >
        <Text className="flex-1 text-white font-psemibold text-base">
          {value.toDateString()}
        </Text>
        <Ionicons name="calendar-outline" size={20} color="#CDCDE0" />
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(_event: unknown, date?: Date) => {
            setShowPicker(false);
            if (date) onChange(date);
          }}
        />
      )}
    </View>
  );
};

export default DateField;
