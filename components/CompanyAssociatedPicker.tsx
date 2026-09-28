import { SECONDARY_COLOR } from "@/constants/colors";
import React from "react";
import { Text } from "react-native";
import { SegmentedButtons } from "react-native-paper";
import { COMPANY_ASSOCIATED } from "@/constants/Piano";

interface CompanyAssociatedPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const COMPANIES = [
  { value: COMPANY_ASSOCIATED.SHAMSHERSONS, label: "SS" },
  { value: COMPANY_ASSOCIATED.KIRPALSONS, label: "KS" },
  { value: COMPANY_ASSOCIATED.RS_MUSIC_CENTER, label: "RS" },
  { value: COMPANY_ASSOCIATED.THE_PIANO_SERVICES, label: "TPS" },
];

const CompanyAssociatedPicker: React.FC<CompanyAssociatedPickerProps> = ({
  value,
  onChange,
}) => (
  <>
    <Text className="text-base text-gray-100 font-pmedium mb-2 mt-7">
      Company Associated
    </Text>

    <SegmentedButtons
      value={value}
      onValueChange={onChange}
      buttons={COMPANIES.map((company) => {
        const isSelected = value === company.value;
        return {
          ...company,
          labelStyle: isSelected ? {} : { color: "white" },
          style: isSelected ? { backgroundColor: SECONDARY_COLOR } : {},
        };
      })}
    />
  </>
);

export default CompanyAssociatedPicker;
