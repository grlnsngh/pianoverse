import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { View } from "react-native";
import FormField from "./FormField";

interface DateFieldProps {
  title: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

/** A form field showing a date that opens the date picker when tapped. */
const DateField: React.FC<DateFieldProps> = ({
  title,
  value,
  onChange,
  minimumDate,
  maximumDate,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View>
      <FormField
        title={title}
        value={value.toDateString()}
        handleChangeText={() => {}}
        onFocus={() => setShowPicker(true)}
      />
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
