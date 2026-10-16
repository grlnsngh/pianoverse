import React from "react";
import { View } from "react-native";
import PianoBasicsFields from "@/components/PianoBasicsFields";
import PianoCategoryFields from "@/components/PianoCategoryFields";
import { spacing } from "@/constants/theme";
import { PianoFormState } from "@/utils/pianoForm";

interface PianoFormFieldsProps {
  form: PianoFormState;
  onChange: (changes: Partial<PianoFormState>) => void;
  // The photo field, which differs between creating and editing
  photo: React.ReactNode;
  /** The piano being edited holds a deposit */
  holdsDeposit?: boolean;
}

/**
 * Every field of a piano on one screen, for the Edit screen: the basics, then
 * how the piano is used with its details. The Add flow shows the same two
 * parts one step at a time.
 */
const PianoFormFields: React.FC<PianoFormFieldsProps> = ({
  form,
  onChange,
  photo,
  holdsDeposit,
}) => (
  <>
    <PianoBasicsFields form={form} onChange={onChange} photo={photo} />
    <View style={{ marginTop: spacing.xxl }}>
      <PianoCategoryFields form={form} onChange={onChange} holdsDeposit={holdsDeposit} />
    </View>
  </>
);

export default PianoFormFields;
