import React from "react";
import { Text, View } from "react-native";
import { format } from "date-fns";
import { fonts, radii } from "@/constants/theme";
import { barHeight, chartSummary, MonthIncome, MonthProfit, profitChartSummary } from "@/utils/income";
import { makeStyles } from "@/lib/ThemeContext";

export type IncomeChartProps = {
  /** Oldest first, ending with this month */
  months: MonthIncome[] | MonthProfit[];
  /** The tallest bar's height in px */
  height?: number;
  /** One letter for each month (J F M …) instead of three, for a chart with many months */
  narrow?: boolean;
  /** Each month's costs as a grey bar hanging below the line (the Income screen); the months must have them */
  costs?: boolean;
  testID?: string;
};

/** The widest a bar is; in a narrow column (many months, a large Screen zoom) it is as wide as the column */
const BAR_WIDTH = 28;

const hasCosts = (months: MonthIncome[] | MonthProfit[]): months is MonthProfit[] =>
  months.every((entry) => "costs" in entry);

/**
 * The rent received each month as ink bars, the tallest filling the height,
 * with an orange dot over a month a piano was sold in. With `costs`, each
 * month's costs hang below a line on the same scale, so a month that cost more
 * than its rent shows it. This month's name is bold. The bars are only a
 * picture, so a screen reader gets the amounts as one sentence instead.
 */
const IncomeChart = ({
  months,
  height = 96,
  narrow = false,
  costs = false,
  testID,
}: IncomeChartProps) => {
  const styles = useStyles();
  const withCosts = costs && hasCosts(months);
  // Bars are the rent, which comes every month. A piano sale is far bigger and would flatten them, so a sale is a dot.
  const max = Math.max(
    0,
    ...months.map((entry) => entry.rent),
    ...(withCosts ? months.map((entry) => entry.costs) : [])
  );
  const label = (entry: MonthIncome, index: number) => (
    <Text
      style={[styles.label, index === months.length - 1 && styles.currentLabel]}
      numberOfLines={1}
    >
      {format(entry.month, narrow ? "MMMMM" : "MMM")}
    </Text>
  );
  const rentWell = (entry: MonthIncome) => {
    const rent = barHeight(entry.rent, max, height);
    return (
      <View style={[styles.well, { height }]}>
        {entry.salesCount > 0 && <View style={styles.sold} />}
        {rent > 0 ? (
          <View style={[styles.rent, { height: rent }]} />
        ) : (
          <View style={styles.empty} />
        )}
      </View>
    );
  };

  return (
    <View
      accessible
      accessibilityLabel={withCosts ? profitChartSummary(months) : chartSummary(months)}
      testID={testID}
    >
      {withCosts ? (
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <View style={styles.chart}>
            {months.map((entry) => (
              <View key={entry.month.getTime()} style={styles.column}>
                {rentWell(entry)}
              </View>
            ))}
          </View>
          <View style={styles.baseline} />
          <View style={[styles.chart, styles.below]}>
            {months.map((entry) => {
              const cost = barHeight(entry.costs, max, height);
              return (
                <View key={entry.month.getTime()} style={styles.column}>
                  <View style={[styles.costWell, { height }]}>
                    {cost > 0 && <View testID="cost-bar" style={[styles.cost, { height: cost }]} />}
                  </View>
                </View>
              );
            })}
          </View>
          <View style={styles.chart}>
            {months.map((entry, index) => (
              <View key={entry.month.getTime()} style={styles.column}>
                {label(entry, index)}
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View
          style={styles.chart}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {months.map((entry, index) => (
            <View key={entry.month.getTime()} style={styles.column}>
              {rentWell(entry)}
              {label(entry, index)}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  below: { alignItems: "flex-start" },
  column: { flex: 1, minWidth: 0, alignItems: "center" },
  // Bars grow up from the bottom of this; a sale dot sits just over the bar
  well: { width: "100%", maxWidth: BAR_WIDTH, justifyContent: "flex-end", alignItems: "stretch" },
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
  // The line the rent stands on and the costs hang from
  baseline: { height: 1, backgroundColor: colors.inputBorder },
  // Costs hang down from the top of this
  costWell: { width: "100%", maxWidth: BAR_WIDTH, justifyContent: "flex-start", alignItems: "stretch" },
  cost: {
    backgroundColor: colors.chevron,
    borderRadius: radii.input / 3,
  },
  label: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.ink2,
  },
  currentLabel: { fontFamily: fonts.bold, color: colors.ink },
}));

export default IncomeChart;
