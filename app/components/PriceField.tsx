import React, { useEffect, useState } from "react";
import FormField from "./FormField";

interface PriceFieldProps {
  title: string;
  value: number;
  onChangeValue: (value: number) => void;
}

const toText = (value: number) => (value ? String(value) : "");

/**
 * A number input that keeps what the user is typing (an empty field, "12.")
 * while reporting the parsed number to the form.
 */
const PriceField: React.FC<PriceFieldProps> = ({
  title,
  value,
  onChangeValue,
}) => {
  const [text, setText] = useState(toText(value));

  // Follow changes made outside the field, e.g. the form being reset
  useEffect(() => {
    if ((parseFloat(text) || 0) !== value) setText(toText(value));
  }, [value]);

  const handleChangeText = (input: string) => {
    const normalized = input.replace(",", ".");
    if (!/^\d*\.?\d*$/.test(normalized)) return;
    setText(normalized);
    onChangeValue(parseFloat(normalized) || 0);
  };

  return (
    <FormField
      title={title}
      value={text}
      placeholder="0"
      handleChangeText={handleChangeText}
      keyboardType="decimal-pad"
    />
  );
};

export default PriceField;
