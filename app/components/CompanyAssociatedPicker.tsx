import React from "react";
import { Text } from "react-native";
import { SegmentedButtons } from "react-native-paper";
import { COMPANY_ASSOCIATED } from "../constants/Piano";
import { SECONDARY_COLOR } from "@/constants/colors";
import { createButtonConfig } from "@/utils/ObjectManipulation";

interface CompanyAssociatedPickerProps {
  form: any;
  setForm: (form: any) => void;
}

const CompanyAssociatedPicker: React.FC<CompanyAssociatedPickerProps> = ({
  form,
  setForm,
}) => {
  return (
    <>
      <Text className="text-base text-gray-100 font-pmedium mb-2 mt-7">
        Company Associated
      </Text>

      <SegmentedButtons
        value={form.companyAssociated}
        onValueChange={(e) => setForm({ ...form, companyAssociated: e })}
        buttons={[
          createButtonConfig(
            form,
            COMPANY_ASSOCIATED.SHAMSHERSONS,
            COMPANY_ASSOCIATED.SHAMSHERSONS
          ),
          createButtonConfig(
            form,
            COMPANY_ASSOCIATED.GDSINGH,
            COMPANY_ASSOCIATED.GDSINGH
          ),
        ]}
      />
    </>
  );
};

export default CompanyAssociatedPicker;
