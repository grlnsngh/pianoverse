import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import CostRow from "@/components/CostRow";
import RefreshBand, { HIDDEN_REFRESH_INDICATOR } from "@/components/RefreshBand";
import useExpenseSheets from "@/components/useExpenseSheets";
import { Button, Icon, Spinner, StateView } from "@/components/ui";
import { amountTextProps, fonts, maxScale, spacing, type } from "@/constants/theme";
import useCurrentDay from "@/lib/useCurrentDay";
import useServiceLog from "@/lib/useServiceLog";
import { RootState } from "@/redux/store";
import {
  allCosts,
  costsBetween,
  costsByKind,
  costsByMonth,
  costTotal,
  PIANO_SERVICE,
} from "@/utils/expenses";
import { INCOME_MONTHS, incomeRange } from "@/utils/income";
import { formatRupees } from "@/utils/money";
import { makeStyles, useColors } from "@/lib/ThemeContext";

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/income");
};

/**
 * Everything that cost money (Expenses board), opened from the Income screen:
 * what the last twelve months cost, by kind (piano service, from the pianos'
 * service logs, and the five kinds of business expense), then every cost
 * month by month, newest first. A service opens its piano; a business expense
 * is pressed and held to edit or delete it. Record expense is at the bottom.
 */
const ExpensesScreen = () => {
  const colors = useColors();
  const styles = useStyles();
  const pianos = useSelector((state: RootState) => state.pianos.items);
  const log = useServiceLog();
  const { store, startRecording, hold, edit, confirmDelete, sheets } = useExpenseSheets();
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
      await Promise.all([log.reload(), store.reload()]);
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, [log, store]);

  const loading = log.status === "loading" || store.status === "loading";
  const failed = log.status === "error" && store.status === "error";
  const costs = allCosts(store.expenses, log.entries, pianos);
  const { from, to } = incomeRange(INCOME_MONTHS);
  const recent = costsBetween(costs, from, to);
  const kinds = costsByKind(recent);
  const biggest = Math.max(0, ...kinds.map((kind) => kind.amount));
  const openPiano = useCallback((pianoId: string) => router.push(`/detail/${pianoId}`), []);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.page}>
      <View style={styles.bar}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Icon name="chevronLeft" size={24} color={colors.ink} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...HIDDEN_REFRESH_INDICATOR} />}
      >
        <RefreshBand refreshing={refreshing} />
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={maxScale.title}>
          Expenses
        </Text>

        {loading && costs.length === 0 && (
          <View style={styles.centered}>
            <Spinner size={32} accessibilityLabel="Loading expenses" />
          </View>
        )}

        {!loading && failed && (
          <StateView
            icon="alert"
            title="Couldn’t load the expenses"
            message="Check your connection and try again."
            actionLabel="Try again"
            actionVariant="secondary"
            onAction={onRefresh}
          />
        )}

        {!loading && !failed && costs.length === 0 && (
          <Text style={styles.quiet}>
            Nothing spent yet. Record what the business spends, like the shop’s rent or staff, here. A piano’s repairs,
            tunings and moves are logged on its page, with their cost, and show up here too.
          </Text>
        )}

        {costs.length > 0 && (
          <>
            <Text style={styles.sub}>Last {INCOME_MONTHS} months</Text>
            <Text style={styles.total} {...amountTextProps}>
              {formatRupees(costTotal(recent))}
            </Text>

            <View style={styles.kinds}>
              {kinds.map((kind) => (
                <View
                  key={kind.key}
                  style={styles.kind}
                  accessible
                  accessibilityLabel={`${kind.label}, ${formatRupees(kind.amount)}`}
                >
                  <View style={styles.kindRow}>
                    <Icon name={kind.icon} size={20} color={colors.ink} strokeWidth={1.8} />
                    <Text style={styles.kindLabel}>{kind.label}</Text>
                    <Text style={styles.kindAmount}>{formatRupees(kind.amount)}</Text>
                  </View>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        kind.key === PIANO_SERVICE.key && styles.fillService,
                        { width: `${biggest > 0 ? Math.round((kind.amount / biggest) * 100) : 0}%` },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>

            {costsByMonth(costs).map((month) => (
              <View key={month.month.getTime()}>
                <View style={styles.monthHeader} accessible accessibilityRole="header" accessibilityLabel={`${month.label}, ${formatRupees(month.total)}`}>
                  <Text style={styles.monthName}>{month.label}</Text>
                  <Text style={styles.monthTotal}>{formatRupees(month.total)}</Text>
                </View>
                {month.costs.map((cost) => (
                  <CostRow
                    key={`${cost.type}-${cost.id}`}
                    cost={cost}
                    onOpenPiano={openPiano}
                    onHold={hold}
                    onEdit={edit}
                    onDelete={confirmDelete}
                  />
                ))}
              </View>
            ))}

            <Text style={styles.hint}>
              Piano service comes from each piano’s service log: tap one to open the piano. Press and hold a business
              expense to edit or delete it.
            </Text>
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
  page: { flex: 1, backgroundColor: colors.surface },
  bar: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl },
  title: { ...type.pianoTitle, marginTop: spacing.xs, color: colors.ink },
  centered: { alignItems: "center", paddingTop: spacing.xxxl },
  quiet: { ...type.secondary, marginTop: spacing.lg, color: colors.ink2 },
  sub: { ...type.secondary, marginTop: 2, color: colors.ink2 },
  total: {
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.64,
    marginTop: spacing.sm,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  kinds: { marginTop: spacing.lg },
  kind: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  kindRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  kindLabel: { flex: 1, minWidth: 0, fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.ink },
  kindAmount: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink, fontVariant: ["tabular-nums"] },
  track: { height: 6, marginTop: spacing.sm, marginLeft: 32, borderRadius: 3, backgroundColor: colors.fill, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.ink },
  fillService: { backgroundColor: colors.brand },
  monthHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    columnGap: spacing.md,
    marginTop: 28,
    marginBottom: 6,
  },
  monthName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.ink2,
  },
  monthTotal: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.ink2, fontVariant: ["tabular-nums"] },
  hint: { ...type.caption, marginTop: spacing.lg, fontFamily: fonts.regular, color: colors.ink2 },
  footer: {
    paddingHorizontal: spacing.screen,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    backgroundColor: colors.surface,
  },
}));

export default ExpensesScreen;
