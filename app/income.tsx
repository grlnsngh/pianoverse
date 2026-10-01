import { router } from "expo-router";
import { format } from "date-fns";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
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
import { Icon, Spinner, StateView } from "@/components/ui";
import { colors, fonts, spacing, type } from "@/constants/theme";
import useCurrentDay from "@/lib/useCurrentDay";
import useIncome from "@/lib/useIncome";
import { RootState } from "@/redux/store";
import { formatRupees } from "@/utils/money";
import {
  INCOME_MONTHS,
  incomeByMonth,
  MonthIncome,
  monthDetail,
  noIncome,
  totalsOf,
} from "@/utils/income";

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/today");
};

const MonthRow = ({ entry }: { entry: MonthIncome }) => {
  const name = format(entry.month, "MMMM yyyy");
  const detail = monthDetail(entry);
  const amount = formatRupees(entry.total);

  return (
    <View
      accessible
      accessibilityLabel={`${name}, ${amount}, ${detail}`}
      style={styles.row}
    >
      <View style={styles.rowTexts}>
        <Text style={styles.rowTitle}>{name}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <Text
        style={[styles.rowAmount, entry.total === 0 && styles.rowAmountNone]}
      >
        {amount}
      </Text>
    </View>
  );
};

/**
 * The Income screen, opened from Today: what came in over the last twelve
 * months, as a chart and then month by month, newest first. Income is the rent
 * that was received (the payments recorded) and what pianos sold for.
 */
const Income = () => {
  const pianos = useSelector((state: RootState) => state.pianos.items);
  const { loaded, failed, payments, reload } = useIncome(INCOME_MONTHS);
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
      await reload();
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, [reload]);

  const months = incomeByMonth(payments, pianos, INCOME_MONTHS);
  const totals = totalsOf(months);
  const empty = noIncome(months);

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
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
        <Text style={styles.title} accessibilityRole="header">
          Income
        </Text>

        {!loaded && (
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

        {loaded && !failed && empty && (
          <Text style={styles.quiet}>
            No income recorded yet. Rent you record and pianos you mark as sold
            show up here.
          </Text>
        )}

        {loaded && !failed && !empty && (
          <>
            <Text style={styles.label}>Last {INCOME_MONTHS} months</Text>
            <Text style={styles.amount}>{formatRupees(totals.total)}</Text>
            <Text style={styles.split}>
              {`Rent ${formatRupees(totals.rent)} · Sales ${formatRupees(totals.sales)}`}
            </Text>

            <View style={styles.chart}>
              <IncomeChart months={months} height={120} narrow />
              <IncomeLegend />
            </View>

            <View style={styles.list}>
              {[...months].reverse().map((entry) => (
                <MonthRow key={entry.month.getTime()} entry={entry} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
  split: {
    ...type.secondary,
    paddingHorizontal: spacing.screen,
    color: colors.ink2,
    fontVariant: ["tabular-nums"],
  },
  chart: { marginTop: spacing.xxl, paddingHorizontal: spacing.screen },
  list: { marginTop: spacing.xxl, paddingLeft: spacing.screen },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 64,
    paddingRight: spacing.screen,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  rowTexts: { flex: 1, minWidth: 0 },
  rowTitle: { ...type.rowTitle, color: colors.ink },
  rowDetail: { ...type.secondary, color: colors.ink2 },
  rowAmount: {
    ...type.rowTitle,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  rowAmountNone: { color: colors.ink2, fontFamily: fonts.regular },
});

export default Income;
