import React from "react";
import { FormRow, useAmountText } from "@/components/ui";

type PriceRowProps = {
  label: string;
  value: number;
  onChangeValue: (value: number) => void;
  /** Overrides the group's label column, for a long label */
  labelWidth?: number;
};

/**
 * A row of a form panel for an amount in rupees: a grey ₹ and the digits in
 * semibold, grouped the Indian way as they are typed.
 */
const PriceRow = ({ label, value, onChangeValue, labelWidth }: PriceRowProps) => {
  const { text, onChangeText } = useAmountText(value, onChangeValue);

  return (
    <FormRow
      label={label}
      prefix="₹"
      placeholder="0"
      labelWidth={labelWidth}
      input={{
        value: text,
        onChangeText,
        keyboardType: "decimal-pad",
        strong: true,
      }}
    />
  );
};

export default PriceRow;
