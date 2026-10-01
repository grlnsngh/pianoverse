import { format } from "date-fns";
import React, { useState } from "react";
import { DatePickerSheet, FormRow } from "@/components/ui";

type DateRowProps = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  /** Days before this can't be chosen */
  minimumDate?: Date;
  /** Days after this can't be chosen */
  maximumDate?: Date;
  /** Overrides the group's label column, for a long label */
  labelWidth?: number;
  /** What the calendar sheet is called. The label by default. */
  sheetTitle?: string;
};

/**
 * A row of a form panel showing a date, like "3 Sep 2026", that opens the
 * calendar sheet when pressed. The date only changes when Done is pressed.
 */
const DateRow = ({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  labelWidth,
  sheetTitle,
}: DateRowProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <FormRow
        label={label}
        value={format(value, "d MMM yyyy")}
        labelWidth={labelWidth}
        onPress={() => setOpen(true)}
      />
      <DatePickerSheet
        visible={open}
        title={sheetTitle ?? label}
        value={value}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

export default DateRow;
