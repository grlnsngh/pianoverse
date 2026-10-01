import React from "react";
import { Pressable, Text } from "react-native";
import { Sheet } from "@/components/ui";
import { fonts } from "@/constants/theme";
import type { ExportPeriod } from "@/utils/exportPeriods";
import { makeStyles } from "@/lib/ThemeContext";

export type ExportPaymentsSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** The stretches to choose from, in the order they are shown */
  periods: ExportPeriod[];
  onChoose: (period: ExportPeriod) => void;
};

/**
 * Asks which payments to download: this month, last month, this financial
 * year, last financial year, or all of them. Each row says what it covers, so
 * "this financial year" is never a guess.
 */
const ExportPaymentsSheet = ({ visible, onClose, periods, onChoose }: ExportPaymentsSheetProps) => {
  const styles = useStyles();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      tone="white"
      title="Download payments"
      testID="export-payments-sheet"
    >
      {periods.map((period) => (
        <Pressable
          key={period.key}
          onPress={() => onChoose(period)}
          accessibilityRole="button"
          accessibilityLabel={`${period.label}, ${period.detail}`}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Text style={styles.label}>{period.label}</Text>
          <Text style={styles.detail}>{period.detail}</Text>
        </Pressable>
      ))}
    </Sheet>
  );
};

const useStyles = makeStyles((colors) => ({
  row: {
    minHeight: 60,
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  pressed: { backgroundColor: colors.grouped },
  label: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.ink },
  detail: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.ink2 },
}));

export default ExportPaymentsSheet;
