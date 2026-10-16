import React from "react";
import { FormRow, useAmountText } from "@/components/ui";

type PriceRowProps = {
  label: string;
  value: number;
  onChangeValue: (value: number) => void;
  /** Overrides the group's label column, for a long label */
  labelWidth?: number;
  /** What the empty field shows; "0" unless said */
  placeholder?: string;
};

/**
 * A row of a form panel for an amount in rupees: a grey ₹ and the digits in
 * semibold, grouped the Indian way as they are typed.
 */
const PriceRow = ({ label, value, onChangeValue, labelWidth, placeholder = "0" }: PriceRowProps) => {
  const { text, onChangeText } = useAmountText(value, onChangeValue);

  return (
    <FormRow
      label={label}
      prefix="₹"
      placeholder={placeholder}
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
