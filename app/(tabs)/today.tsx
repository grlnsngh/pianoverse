import { router } from "expo-router";
import { format } from "date-fns";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import AttentionRow from "@/components/AttentionRow";
import IncomeCard from "@/components/IncomeCard";
import PaymentRow from "@/components/PaymentRow";
import RefreshBand, { HIDDEN_REFRESH_INDICATOR } from "@/components/RefreshBand";
import RentDueRow from "@/components/RentDueRow";
import ShelfCard from "@/components/ShelfCard";
import TodaySkeleton from "@/components/TodaySkeleton";
import { AddButton, useSkeletonDelay } from "@/components/ui";
import { colors, fonts, spacing, type } from "@/constants/theme";
import { usePianoData } from "@/lib/PianoDataContext";
import useCurrentDay from "@/lib/useCurrentDay";
import useIncome from "@/lib/useIncome";
import useTodayPayments from "@/lib/useTodayPayments";
import { setActiveTab } from "@/redux/navigation/actions";
import { setPianoFilters } from "@/redux/pianos/actions";
import { RootState } from "@/redux/store";
import { categoryFilterOf, clearFilters } from "@/utils/filters";
import { sendMessage } from "@/utils/contact";
import { incomeByMonth, TODAY_MONTHS } from "@/utils/income";
import { formatRupees } from "@/utils/money";
import { buildReminderMessage } from "@/utils/reminders";
import { type RentDueEntry, rentDueEntries, rentDueMonths } from "@/utils/rentDue";
import {
  needsAttention,
  receivedInMonth,
  recentPayments,
  rentedOut,
  stockCounts,
} from "@/utils/today";

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The Today tab: what needs the owner. The money received this month, how many
 * pianos are in stock, on rent and sold, the rentals that have ended or end
 * within a week, the rentals that owe rent, the rentals out now, and the latest
 * payments. The pianos come from redux, where the Pianos tab loads them; the
 * payments load here.
 */
const Today = () => {
  const dispatch = useDispatch();
  const pianos = useSelector((state: RootState) => state.pianos.items);
  const filters = useSelector((state: RootState) => state.pianos.filters);
  const { status: pianoStatus, refresher } = usePianoData();
  const { loaded, failed, payments, reload } = useTodayPayments();
  // The income chart's months, or further back when a rental out began before
  // them: the rent that is due needs every payment since its start
  const income = useIncome(Math.max(TODAY_MONTHS, rentDueMonths(pianos)));
  const reloadIncome = income.reload;
  // Re-renders on a new day, even if the app stayed open, so what follows
  // (which reads today's date) is worked out again
  useCurrentDay();

  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );

  // First load: the pianos aren't here yet (no saved copy on this phone) or the
  // payments haven't arrived. Later reloads keep showing what is there.
  const ready = loaded && !(pianoStatus === "loading" && pianos.length === 0);
  const [seenReady, setSeenReady] = useState(false);
  useEffect(() => {
    if (ready) setSeenReady(true);
  }, [ready]);
  const loadingFirstTime = !ready && !seenReady;
  const showSkeleton = useSkeletonDelay(loadingFirstTime);

  const attention = needsAttention(pianos);
  const shelf = rentedOut(pianos);
  const counts = stockCounts(pianos);
  const received = receivedInMonth(payments);
  const recent = recentPayments(payments, pianos);

  const months = incomeByMonth(income.payments, pianos, TODAY_MONTHS);
  // Not worked out until the payments are here: with none, every rental would owe
  const owing =
    income.loaded && !income.failed ? rentDueEntries(pianos, income.payments) : [];

  const openAdd = useCallback(() => router.push("/create"), []);
  const openIncome = useCallback(() => router.push("/income"), []);
  const openPiano = useCallback((id: string) => router.push(`/detail/${id}`), []);
  // A reminder that says how much is due, typed into the renter's WhatsApp chat
  const remind = useCallback((entry: RentDueEntry) => {
    sendMessage(
      entry.piano.rental_customer_mobile?.trim() || null,
      buildReminderMessage(entry.piano, undefined, entry.balance),
      `${entry.piano.title} rental`
    );
  }, []);

  // The Pianos tab, showing the rentals that are out (what the shelf holds)
  const seeAll = useCallback(() => {
    dispatch(
      setPianoFilters({
        ...clearFilters(filters),
        category: categoryFilterOf("rentable"),
        isActiveRentals: true,
      }) as any
    );
    dispatch(setActiveTab("pianos") as any);
  }, [dispatch, filters]);

  // Pulling down loads the pianos (through the Pianos tab) and the payments again
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refresher.current?.(), reload(), reloadIncome()]);
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, [refresher, reload, reloadIncome]);

  if (loadingFirstTime) {
    return (
      <SafeAreaView edges={["top"]} style={styles.page}>
        {showSkeleton ? (
          <TodaySkeleton onAdd={openAdd} />
        ) : (
          // The first 200 ms: nothing to flash, just the + that is always there
          <View style={[styles.header, styles.headerAddOnly]}>
            <AddButton onPress={openAdd} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  const now = new Date();
  const soldTotal = formatRupees(counts.soldThisMonth.total);

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          // The phone does the pulling; the band below draws the spinner
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            {...HIDDEN_REFRESH_INDICATOR}
          />
        }
      >
        <RefreshBand refreshing={refreshing} />
        <View style={styles.header}>
          <View>
            <Text style={styles.date}>{format(now, "EEEE, d MMMM")}</Text>
            <Text style={styles.title}>Today</Text>
          </View>
          <AddButton onPress={openAdd} />
        </View>

        <View style={styles.income}>
          <Text style={styles.incomeLabel}>{`Received in ${format(now, "MMMM")}`}</Text>
          <Text style={styles.amount} accessibilityLabel={failed ? "Not loaded" : undefined}>
            {failed ? "—" : formatRupees(received.total)}
          </Text>
          <Text style={styles.incomeNote}>
            {failed
              ? "Couldn’t load payments. Pull down to try again."
              : received.count > 0
                ? `${count(received.count, "payment", "payments")} so far`
                : "No payments yet"}
          </Text>
        </View>

        <View style={styles.counts}>
          <View style={styles.countCell} accessible accessibilityLabel={`In stock, ${counts.inStock}`}>
            <Text style={styles.countValue}>{counts.inStock}</Text>
            <Text style={styles.countLabel}>In stock</Text>
          </View>
          <View style={styles.countCell} accessible accessibilityLabel={`On rent, ${counts.onRent}`}>
            <Text style={styles.countValue}>{counts.onRent}</Text>
            <Text style={styles.countLabel}>On rent</Text>
          </View>
          <View
            style={[styles.countCell, styles.wideCell]}
            accessible
            accessibilityLabel={`Sold this month, ${soldTotal}`}
          >
            <Text style={styles.countValue} numberOfLines={1}>
              {soldTotal}
            </Text>
            <Text style={styles.countLabel}>Sold this month</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Needs attention
          </Text>
          {attention.length > 0 && <Text style={styles.sectionCount}>{attention.length}</Text>}
        </View>
        {attention.length > 0 ? (
          attention.map((entry) => (
            <AttentionRow key={entry.piano.$id} entry={entry} onOpen={openPiano} />
          ))
        ) : (
          <Text style={styles.quiet}>
            {pianos.length === 0
              ? "No pianos yet. Add one with the + button."
              : "Nothing needs your attention."}
          </Text>
        )}

        {owing.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Rent due
              </Text>
              <Text style={styles.sectionCount}>{owing.length}</Text>
            </View>
            {owing.map((entry) => (
              <RentDueRow
                key={entry.piano.$id}
                entry={entry}
                today={now}
                onOpen={openPiano}
                onRemind={remind}
              />
            ))}
          </>
        )}

        {shelf.length > 0 && (
          <>
            <View style={[styles.sectionHeader, styles.shelfHeader]}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Rented out
              </Text>
              <Pressable
                onPress={seeAll}
                accessibilityRole="button"
                accessibilityLabel="See all rented out pianos"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 0 }}
              >
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.shelf}
            >
              {shelf.map((entry) => (
                <ShelfCard key={entry.piano.$id} entry={entry} onOpen={openPiano} />
              ))}
            </ScrollView>
          </>
        )}

        {recent.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Recent payments
              </Text>
            </View>
            {recent.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} />
            ))}
          </>
        )}

        <IncomeCard
          months={months}
          loaded={income.loaded}
          failed={income.failed}
          onSeeAll={openIncome}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  content: { paddingBottom: spacing.xxl },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.screen,
  },
  headerAddOnly: { justifyContent: "flex-end" },
  date: { ...type.secondary, fontFamily: type.bodyMedium.fontFamily, color: colors.ink2 },
  title: { ...type.largeTitle, color: colors.ink },
  income: { paddingTop: 28, paddingHorizontal: spacing.screen },
  incomeLabel: { ...type.secondary, fontFamily: fonts.medium, color: colors.ink2 },
  amount: { ...type.amount, marginTop: 2, color: colors.ink },
  incomeNote: { ...type.secondary, color: colors.ink2 },
  counts: {
    flexDirection: "row",
    marginTop: spacing.xl,
    marginHorizontal: spacing.screen,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  countCell: { flex: 1 },
  wideCell: { flex: 1.3 },
  countValue: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  countLabel: { ...type.caption, color: colors.ink2 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.screen,
  },
  shelfHeader: { paddingBottom: spacing.md },
  sectionTitle: { ...type.section, color: colors.ink },
  sectionCount: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink2 },
  seeAll: { fontFamily: fonts.semibold, fontSize: 14, color: colors.brandText },
  quiet: {
    ...type.secondary,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.screen,
    color: colors.ink2,
  },
  shelf: { gap: spacing.md, paddingHorizontal: spacing.screen },
});

export default Today;
