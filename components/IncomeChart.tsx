import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { format } from "date-fns";
import { colors, fonts, radii } from "@/constants/theme";
import { barHeight, chartSummary, MonthIncome } from "@/utils/income";

export type IncomeChartProps = {
  /** Oldest first, ending with this month */
  months: MonthIncome[];
  /** The tallest bar's height in px */
  height?: number;
  /** One letter for each month (J F M …) instead of three, for a chart with many months */
  narrow?: boolean;
  testID?: string;
};

const BAR_WIDTH = 28;

/**
 * The rent received each month as ink bars, the tallest filling the height,
 * with an orange dot over a month a piano was sold in. This month's name is
 * bold. The bars are only a picture, so a screen reader gets the amounts as
 * one sentence instead.
 */
const IncomeChart = ({
  months,
  height = 96,
  narrow = false,
  testID,
}: IncomeChartProps) => {
  // Bars are the rent, which comes every month. A piano sale is far bigger and would flatten them, so a sale is a dot.
  const max = Math.max(0, ...months.map((entry) => entry.rent));

  return (
    <View accessible accessibilityLabel={chartSummary(months)} testID={testID}>
      <View
        style={styles.chart}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {months.map((entry, index) => {
          const current = index === months.length - 1;
          const rent = barHeight(entry.rent, max, height);
          return (
            <View key={entry.month.getTime()} style={styles.column}>
              <View style={[styles.well, { height }]}>
                {entry.salesCount > 0 && <View style={styles.sold} />}
                {rent > 0 ? (
                  <View style={[styles.rent, { height: rent }]} />
                ) : (
                  <View style={styles.empty} />
                )}
              </View>
              <Text
                style={[styles.label, current && styles.currentLabel]}
                numberOfLines={1}
              >
                {format(entry.month, narrow ? "MMMMM" : "MMM")}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  column: { flex: 1, alignItems: "center" },
  // Bars grow up from the bottom of this; a sale dot sits just over the bar
  well: { width: BAR_WIDTH, justifyContent: "flex-end", alignItems: "stretch" },
  rent: {
    backgroundColor: colors.ink,
    borderRadius: radii.input / 3,
  },
  sold: {
    alignSelf: "center",
    width: 8,
    height: 8,
    marginBottom: 4,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
  empty: { height: 2, backgroundColor: colors.hairline },
  label: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.ink2,
  },
  currentLabel: { fontFamily: fonts.bold, color: colors.ink },
});

export default IncomeChart;
