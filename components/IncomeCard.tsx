import React from "react";
import { Pressable, Text, View } from "react-native";
import IncomeChart from "@/components/IncomeChart";
import { fonts, spacing, type } from "@/constants/theme";
import { MonthIncome, noIncome, sofarLine } from "@/utils/income";
import { makeStyles, useColors } from "@/lib/ThemeContext";

export type IncomeCardProps = {
  months: MonthIncome[];
  /** Whether the payments have been loaded yet */
  loaded: boolean;
  /** They couldn't be, and there is nothing from before to show */
  failed: boolean;
  onSeeAll: () => void;
};

/** The two colours of the bars, named under the chart. */
export const IncomeLegend = () => {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View
      style={styles.legend}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.key}>
        <View style={[styles.swatch, { backgroundColor: colors.ink }]} />
        <Text style={styles.keyText}>Rent received</Text>
      </View>
      <View style={styles.key}>
        <View
          style={[styles.swatch, styles.dot, { backgroundColor: colors.brand }]}
        />
        <Text style={styles.keyText}>Piano sold</Text>
      </View>
    </View>
  );
};

/**
 * Today's Income section: the last six months as bars, what this month has
 * brought so far next to the whole of last month, and a link to every month.
 * Nothing shows until the payments have loaded, and when they can't be loaded
 * it says so in a line (pulling Today down tries again).
 */
const IncomeCard = ({ months, loaded, failed, onSeeAll }: IncomeCardProps) => {
  const styles = useStyles();
  if (!loaded) return null;
  const empty = noIncome(months);
  const line = sofarLine(months);

  return (
    <View testID="income-card">
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Income
        </Text>
        {!failed && !empty && (
          <Pressable
            onPress={onSeeAll}
            accessibilityRole="button"
            accessibilityLabel="See income for every month"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 0 }}
          >
            <Text style={styles.seeAll}>See all months</Text>
          </Pressable>
        )}
      </View>

      {failed ? (
        <Text style={styles.quiet}>
          Couldn’t load income. Pull down to try again.
        </Text>
      ) : empty ? (
        <Text style={styles.quiet}>
          No income recorded yet. Rent you record and pianos you mark as sold
          show up here.
        </Text>
      ) : (
        <View style={styles.body}>
          <IncomeChart months={months} />
          <IncomeLegend />
          {!!line && <Text style={styles.line}>{line}</Text>}
        </View>
      )}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.screen,
  },
  title: { ...type.section, color: colors.ink },
  seeAll: { fontFamily: fonts.semibold, fontSize: 14, color: colors.brandText },
  body: { paddingHorizontal: spacing.screen },
  quiet: {
    ...type.secondary,
    paddingHorizontal: spacing.screen,
    color: colors.ink2,
  },
  legend: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.md },
  key: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  dot: { borderRadius: 5 },
  keyText: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
  line: {
    ...type.secondary,
    marginTop: spacing.sm,
    color: colors.ink2,
    fontVariant: ["tabular-nums"],
  },
}));

export default IncomeCard;
