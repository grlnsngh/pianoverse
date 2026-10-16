import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { format, startOfMonth, startOfToday } from "date-fns";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import AvailabilityRow from "@/components/AvailabilityRow";
import RefreshBand, { HIDDEN_REFRESH_INDICATOR } from "@/components/RefreshBand";
import { Button, Icon, Segmented, Spinner, StateView } from "@/components/ui";
import { fonts, maxScale, radii, spacing, type } from "@/constants/theme";
import useCurrentDay from "@/lib/useCurrentDay";
import useOwnerRentalHistory from "@/lib/useOwnerRentalHistory";
import { usePianoData } from "@/lib/PianoDataContext";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import { RootState } from "@/redux/store";
import {
  AVAILABILITY_FILTERS,
  availabilityOn,
  backSoon,
  BACK_SOON_DAYS,
  dayText,
  endDaysInMonth,
  type AvailabilityEntry,
  type AvailabilityFilter,
} from "@/utils/availability";

type Tab = "day" | "soon";

const TABS = [
  { value: "day", label: "On a day" },
  { value: "soon", label: "Back soon" },
] as const;

/** How many pianos a list shows before "Show N more". */
const LIST_SHOWN = 5;

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/home");
};

/**
 * Which pianos are free (Availability board, opened from the calendar button on
 * the Pianos tab). **On a day**: a month calendar with an orange dot on the days
 * a rental ends; the chosen day lists the pianos that are free and the ones that
 * are out and until when, for all pianos or one category. **Back soon**: rentals
 * that ended and haven't come back, and rentals ending in the next 30 days.
 * It is worked out from the rental on each piano and the rentals that were
 * kept; the app has no bookings, so a piano promised for later but not saved as
 * a rental shows as free.
 */
const AvailabilityScreen = () => {
  const colors = useColors();
  const styles = useStyles();
  const pianos = useSelector((state: RootState) => state.pianos.items);
  const { status, refresher } = usePianoData();
  const history = useOwnerRentalHistory();
  // Works the day out again when the app comes back on a later day
  const currentDay = useCurrentDay();

  const [tab, setTab] = useState<Tab>("day");
  const [day, setDay] = useState(startOfToday);
  const [month, setMonth] = useState(() => startOfMonth(startOfToday()));
  const [filter, setFilter] = useState<AvailabilityFilter>("rentable");
  const [expanded, setExpanded] = useState({ free: false, out: false });
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
      await Promise.all([history.reload(), refresher.current?.()]);
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, [history, refresher]);

  const openPiano = useCallback((id: string) => router.push(`/detail/${id}`), []);
  const chooseDay = useCallback((next: Date) => {
    setDay(next);
    setExpanded({ free: false, out: false });
  }, []);
  const chooseFilter = useCallback((next: AvailabilityFilter) => {
    setFilter(next);
    setExpanded({ free: false, out: false });
  }, []);

  const available = useMemo(
    () => availabilityOn(pianos, history.entries, day, filter),
    // The day changes when the app is opened on a later one
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pianos, history.entries, day, filter, currentDay]
  );
  const endDays = useMemo(
    () => endDaysInMonth(pianos, history.entries, month, filter),
    [pianos, history.entries, month, filter]
  );
  const soon = useMemo(
    () => backSoon(pianos),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pianos, currentDay]
  );

  const noPianos = pianos.length === 0;
  const loading = (status === "loading" && noPianos) || !history.loaded;
  const failed = status === "failed" && noPianos;
  const filterLabel = AVAILABILITY_FILTERS.find((option) => option.key === filter)!.label;

  const thisYear = new Date().getFullYear();
  const dayTitle = format(day, day.getFullYear() === thisYear ? "EEEE d MMMM" : "EEEE d MMMM yyyy");
  const { free, out, firstBack } = available;
  const none = free.length + out.length === 0;

  const rows = (list: AvailabilityEntry[], all: boolean) =>
    (all ? list : list.slice(0, LIST_SHOWN)).map((entry) => (
      <AvailabilityRow key={entry.piano.$id} piano={entry.piano} sub={entry.sub} line={entry.line} onOpen={openPiano} />
    ));
  const more = (list: AvailabilityEntry[], key: "free" | "out") =>
    !expanded[key] && list.length > LIST_SHOWN ? (
      <Button
        title={`Show ${list.length - LIST_SHOWN} more`}
        variant="outline"
        size="compact"
        onPress={() => setExpanded((current) => ({ ...current, [key]: true }))}
        style={styles.more}
      />
    ) : null;

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
          Availability
        </Text>

        {loading && (
          <View style={styles.centered}>
            <Spinner size={32} accessibilityLabel="Loading availability" />
          </View>
        )}

        {!loading && failed && (
          <StateView
            icon="alert"
            title="Couldn’t load your pianos"
            message="Check your connection and try again."
            actionLabel="Try again"
            actionVariant="secondary"
            onAction={onRefresh}
          />
        )}

        {!loading && !failed && noPianos && (
          <StateView
            icon="tabPianos"
            title="No pianos yet"
            message="Add a piano to see when it is free."
            actionLabel="Add a piano"
            actionVariant="secondary"
            onAction={() => router.push("/create")}
          />
        )}

        {!loading && !failed && !noPianos && (
          <>
            <Segmented
              options={TABS}
              value={tab}
              onChange={setTab}
              accessibilityLabel="Availability view"
              style={styles.tabs}
            />

            {tab === "day" ? (
              <>
                <AvailabilityCalendar
                  month={month}
                  selected={day}
                  endDays={endDays}
                  onSelect={chooseDay}
                  onMonthChange={setMonth}
                />

                <View style={styles.body}>
                  <Text style={styles.dayTitle} accessibilityRole="header" maxFontSizeMultiplier={maxScale.section}>
                    {dayTitle}
                  </Text>
                  <Text style={styles.counts}>
                    {free.length} free · {out.length} out
                  </Text>

                  <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Kind of piano">
                    {AVAILABILITY_FILTERS.map((option) => {
                      const chosen = option.key === filter;
                      return (
                        <Pressable
                          key={option.key}
                          onPress={() => chooseFilter(option.key)}
                          accessibilityRole="radio"
                          accessibilityLabel={option.label}
                          accessibilityState={{ checked: chosen }}
                          style={[styles.chip, chosen && styles.chipOn]}
                        >
                          <Text style={[styles.chipLabel, chosen && styles.chipLabelOn]}>{option.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {none && (
                  <Text style={[styles.quiet, styles.body]}>
                    {filter === "all" ? "No pianos to hire out." : `No ${filterLabel.toLowerCase()} pianos.`}
                  </Text>
                )}

                {!none && free.length === 0 && (
                  <View style={styles.nothing}>
                    <View style={styles.nothingIcon}>
                      <Icon name="calendar" size={24} color={colors.ink} strokeWidth={1.8} />
                    </View>
                    <Text style={styles.nothingTitle}>Nothing free on {format(day, "d MMMM")}</Text>
                    <Text style={styles.nothingText}>
                      {filter === "rentable" ? "Every rentable piano is out." : "Every piano here is out."}
                      {firstBack?.freeFrom
                        ? ` The first one to come back is ${firstBack.piano.title}, free from ${dayText(firstBack.freeFrom, day)}.`
                        : ""}
                    </Text>
                    <Button
                      title="See what is back soon"
                      variant="outline"
                      size="compact"
                      onPress={() => setTab("soon")}
                      style={styles.nothingButton}
                    />
                  </View>
                )}

                {free.length > 0 && (
                  <View style={styles.list}>
                    <Text style={styles.groupLabel} accessibilityRole="header">
                      Free · {free.length}
                    </Text>
                    {rows(free, expanded.free)}
                    {more(free, "free")}
                  </View>
                )}

                {out.length > 0 && (
                  <View style={styles.list}>
                    <Text style={styles.groupLabel} accessibilityRole="header">
                      Out · {out.length}
                    </Text>
                    {rows(out, expanded.out)}
                    {more(out, "out")}
                  </View>
                )}

                <Text style={[styles.hint, styles.body]}>
                  From the rentals saved on each piano and in its history. A piano promised for later but not saved as a
                  rental shows as free.
                </Text>
              </>
            ) : (
              <>
                {soon.notBack.length === 0 && soon.ending.length === 0 && (
                  <Text style={[styles.quiet, styles.body]}>
                    Nothing is waiting to come back, and no rental ends in the next {BACK_SOON_DAYS} days.
                  </Text>
                )}

                {soon.notBack.length > 0 && (
                  <View style={styles.list}>
                    <Text style={styles.groupLabel} accessibilityRole="header">
                      Ended, not back · {soon.notBack.length}
                    </Text>
                    {soon.notBack.map((entry) => (
                      <AvailabilityRow
                        key={entry.piano.$id}
                        piano={entry.piano}
                        sub={entry.sub}
                        line={entry.line}
                        onOpen={openPiano}
                      />
                    ))}
                  </View>
                )}

                {soon.ending.length > 0 && (
                  <View style={styles.list}>
                    <Text style={styles.groupLabel} accessibilityRole="header">
                      Ending in the next {BACK_SOON_DAYS} days · {soon.ending.length}
                    </Text>
                    {soon.ending.map((entry) => (
                      <AvailabilityRow
                        key={entry.piano.$id}
                        piano={entry.piano}
                        sub={entry.sub}
                        line={entry.line}
                        onOpen={openPiano}
                      />
                    ))}
                  </View>
                )}

                <Text style={[styles.hint, styles.body]}>
                  A rental with no end date isn’t listed. Tap a piano to extend it or mark it as returned.
                </Text>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const useStyles = makeStyles((colors) => ({
  page: { flex: 1, backgroundColor: colors.surface },
  bar: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { paddingBottom: spacing.xxxl },
  title: { ...type.largeTitle, marginTop: spacing.xs, paddingHorizontal: spacing.screen, color: colors.ink },
  centered: { alignItems: "center", paddingTop: spacing.xxxl },
  tabs: { marginHorizontal: spacing.screen, marginTop: spacing.lg },
  body: { paddingHorizontal: spacing.screen },
  dayTitle: { ...type.section, marginTop: spacing.xxl, color: colors.ink },
  counts: { ...type.secondary, marginTop: 2, color: colors.ink2, fontVariant: ["tabular-nums"] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: 14 },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.ink, backgroundColor: colors.ink },
  chipLabel: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink },
  chipLabelOn: { color: colors.onInk },
  quiet: { ...type.secondary, marginTop: spacing.lg, color: colors.ink2 },
  nothing: {
    marginHorizontal: spacing.screen,
    marginTop: spacing.xl,
    padding: spacing.xl,
    alignItems: "center",
    borderRadius: radii.card,
    backgroundColor: colors.grouped,
  },
  nothingIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  nothingTitle: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, marginTop: spacing.md, textAlign: "center", color: colors.ink },
  nothingText: { ...type.secondary, marginTop: spacing.xs, textAlign: "center", color: colors.ink2 },
  nothingButton: { marginTop: spacing.lg, alignSelf: "stretch" },
  list: { marginTop: spacing.xxl },
  groupLabel: {
    paddingHorizontal: spacing.screen,
    marginBottom: 6,
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.ink2,
  },
  more: { marginTop: spacing.sm, marginHorizontal: spacing.screen, alignSelf: "stretch" },
  hint: { ...type.caption, marginTop: spacing.lg, fontFamily: fonts.regular, color: colors.ink2 },
}));

export default AvailabilityScreen;
