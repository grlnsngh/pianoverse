import { router } from "expo-router";
import { format } from "date-fns";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { IncomeLegend } from "@/components/IncomeCard";
import IncomeChart from "@/components/IncomeChart";
import RefreshBand, {
  HIDDEN_REFRESH_INDICATOR,
} from "@/components/RefreshBand";
import useExpenseSheets from "@/components/useExpenseSheets";
import { Button, Icon, Spinner, StateView } from "@/components/ui";
import { amountTextProps, fonts, maxScale, spacing, type } from "@/constants/theme";
import useCurrentDay from "@/lib/useCurrentDay";
import useIncome from "@/lib/useIncome";
import useServiceLog from "@/lib/useServiceLog";
import useTextScale from "@/lib/useTextScale";
import { RootState } from "@/redux/store";
import { allCosts } from "@/utils/expenses";
import { formatRupees } from "@/utils/money";
import {
  formatSigned,
  INCOME_MONTHS,
  incomeByMonth,
  MonthProfit,
  nothingRecorded,
  profitDetail,
  profitTotals,
  withCosts,
} from "@/utils/income";
import { makeStyles, useColors } from "@/lib/ThemeContext";

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/today");
};

const MonthRow = ({ entry }: { entry: MonthProfit }) => {
  const styles = useStyles();
  const { large } = useTextScale();
  const name = format(entry.month, "MMMM yyyy");
  const detail = profitDetail(entry);
  const amount = formatSigned(entry.profit);
  const loss = entry.profit < 0;
  const quiet = entry.total === 0 && entry.costs === 0;

  return (
    <View
      accessible
      accessibilityLabel={`${name}, ${loss ? "loss" : "profit"} ${formatRupees(Math.abs(entry.profit))}, ${detail}`}
      style={[styles.row, large && styles.rowStacked]}
    >
      <View style={[styles.rowTexts, large && styles.rowTextsStacked]}>
        <Text style={styles.rowTitle}>{name}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <Text style={[styles.rowAmount, loss && styles.rowAmountLoss, quiet && styles.rowAmountNone]}>
        {amount}
      </Text>
    </View>
  );
};

/**
 * The Income screen, opened from Today and Account (Income board on the canvas
 * page "Expenses and profit"): the profit of the last twelve months, what came
 * in (rent received and pianos sold) against the costs (business expenses and
 * services that cost something), a chart with the costs below the line, the
 * Expenses screen, and month by month, newest first. Record expense is at the
 * bottom. What a piano was bought for is not a cost of any month.
 */
const Income = () => {
  const colors = useColors();
  const styles = useStyles();
  const { large } = useTextScale();
  const pianos = useSelector((state: RootState) => state.pianos.items);
  const { loaded, failed, payments, reload } = useIncome(INCOME_MONTHS);
  const log = useServiceLog();
  const { store, startRecording, sheets } = useExpenseSheets();
  // A new day can start a new month while the screen is open
  useCurrentDay();

  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([reload(), log.reload(), store.reload()]);
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, [reload, log, store]);

  const costsLoading = log.status === "loading" || store.status === "loading";
  const costsFailed = log.status === "error" || store.status === "error";
  const ready = loaded && !costsLoading;
  const months = withCosts(
    incomeByMonth(payments, pianos, INCOME_MONTHS),
    allCosts(store.expenses, log.entries, pianos)
  );
  const totals = profitTotals(months);
  const empty = nothingRecorded(months);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.page}>
      <View style={styles.bar}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.back}
        >
          <Icon
            name="chevronLeft"
            size={24}
            color={colors.ink}
            strokeWidth={2.2}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            {...HIDDEN_REFRESH_INDICATOR}
          />
        }
      >
        <RefreshBand refreshing={refreshing} />
        <Text
          style={styles.title}
          accessibilityRole="header"
          maxFontSizeMultiplier={maxScale.title}
        >
          Income
        </Text>

        {!ready && !failed && (
          <View style={styles.centered}>
            <Spinner size={32} accessibilityLabel="Loading income" />
          </View>
        )}

        {loaded && failed && (
          <StateView
            icon="alert"
            title="Couldn’t load income"
            message="Check your connection and try again."
            actionLabel="Try again"
            actionVariant="secondary"
            onAction={reload}
          />
        )}

        {ready && !failed && costsFailed && (
          <Text style={styles.warning}>
            Couldn’t load all the expenses, so the costs may be short. Pull down to try again.
          </Text>
        )}

        {ready && !failed && empty && (
          <Text style={styles.quiet}>
            Nothing recorded yet. Rent you record, pianos you mark as sold and expenses show up here.
          </Text>
        )}

        {ready && !failed && !empty && (
          <>
            <Text style={styles.label}>Profit, last {INCOME_MONTHS} months</Text>
            <Text style={[styles.amount, totals.profit < 0 && styles.amountLoss]} {...amountTextProps}>
              {formatSigned(totals.profit)}
            </Text>
            <Text style={styles.split}>
              {`Income ${formatRupees(totals.income)} · Costs ${formatRupees(totals.costs)}`}
            </Text>

            <View style={styles.chart}>
              <IncomeChart months={months} height={80} narrow costs />
              <IncomeLegend costs />
            </View>

            <Pressable
              onPress={() => router.push("/expenses")}
              accessibilityRole="button"
              accessibilityLabel={`Expenses, ${formatRupees(totals.costs)} in ${INCOME_MONTHS} months`}
              style={({ pressed }) => [styles.expenses, pressed && styles.expensesPressed]}
            >
              <View style={styles.expensesIcon}>
                <Icon name="receipt" size={20} color={colors.ink} strokeWidth={1.8} />
              </View>
              <View style={styles.rowTexts}>
                <Text style={styles.rowTitle}>Expenses</Text>
                <Text style={styles.rowDetail}>
                  {large
                    ? `${formatRupees(totals.costs)} · piano service and business costs`
                    : "Piano service and business costs"}
                </Text>
              </View>
              {!large && <Text style={styles.rowAmount}>{formatRupees(totals.costs)}</Text>}
              <Icon name="chevronRight" size={18} color={colors.chevron} strokeWidth={2} />
            </Pressable>

            <Text style={styles.section} accessibilityRole="header" maxFontSizeMultiplier={maxScale.section}>
              By month
            </Text>
            <View style={styles.list}>
              {[...months].reverse().map((entry) => (
                <MonthRow key={entry.month.getTime()} entry={entry} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Record expense" onPress={startRecording} />
      </View>

      {sheets}
    </SafeAreaView>
  );
};

const useStyles = makeStyles((colors) => ({
  page: { flex: 1, backgroundColor: colors.page },
  bar: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  back: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingBottom: spacing.xxxl },
  title: {
    ...type.largeTitle,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    color: colors.ink,
  },
  centered: { alignItems: "center", paddingTop: spacing.xxxl },
  quiet: {
    ...type.secondary,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.screen,
    color: colors.ink2,
  },
  warning: {
    ...type.secondary,
    marginTop: spacing.lg,
    marginHorizontal: spacing.screen,
    color: colors.late,
  },
  label: {
    ...type.secondary,
    fontFamily: fonts.medium,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.screen,
    color: colors.ink2,
  },
  amount: {
    ...type.amount,
    marginTop: 2,
    paddingHorizontal: spacing.screen,
    color: colors.ink,
  },
  amountLoss: { color: colors.late },
  split: {
    ...type.secondary,
    paddingHorizontal: spacing.screen,
    color: colors.ink2,
    fontVariant: ["tabular-nums"],
  },
  chart: { marginTop: spacing.xxl, paddingHorizontal: spacing.screen },
  expenses: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 64,
    marginTop: spacing.xxl,
    marginHorizontal: spacing.screen,
    // With bigger text the row grows, and keeps this room above and below its words
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.hairline,
  },
  expensesPressed: { backgroundColor: colors.grouped },
  expensesIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.fill,
  },
  section: {
    ...type.section,
    marginTop: 28,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.screen,
    color: colors.ink,
  },
  list: { paddingLeft: spacing.screen },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 64,
    paddingVertical: spacing.sm,
    paddingRight: spacing.screen,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  // With a big Font size the profit goes under the month, so neither is squeezed
  rowStacked: { flexDirection: "column", alignItems: "flex-start", gap: 2 },
  rowTexts: { flex: 1, minWidth: 0 },
  rowTextsStacked: { flex: 0, alignSelf: "stretch" },
  rowTitle: { ...type.rowTitle, color: colors.ink },
  rowDetail: { ...type.secondary, color: colors.ink2, fontVariant: ["tabular-nums"] },
  rowAmount: {
    ...type.rowTitle,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  rowAmountLoss: { color: colors.late },
  rowAmountNone: { color: colors.ink2, fontFamily: fonts.regular },
  footer: {
    paddingHorizontal: spacing.screen,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    backgroundColor: colors.page,
  },
}));

export default Income;
