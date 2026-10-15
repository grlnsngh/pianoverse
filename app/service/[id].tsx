import { format } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import BackBar from "@/components/BackBar";
import ServiceEntryRow from "@/components/ServiceEntryRow";
import useServiceSheets from "@/components/useServiceSheets";
import { Button, StateView } from "@/components/ui";
import { fonts, maxScale, spacing, type } from "@/constants/theme";
import type { PianoItem } from "@/redux/pianos/types";
import type { RootState } from "@/redux/store";
import { formatRupees } from "@/utils/money";
import { byYear, intervalLabel, serviceSummary } from "@/utils/serviceLog";
import { makeStyles, useColors } from "@/lib/ThemeContext";

/** One piano's whole log, by year (ServiceHistory board). */
const ServiceList = ({ piano }: { piano: PianoItem }) => {
  const colors = useColors();
  const styles = useStyles();
  const { entries, state, months, startLogging, hold, edit, confirmDelete, sheets } = useServiceSheets(piano);
  const summary = serviceSummary(entries);
  const nextTone = !state ? colors.ink2 : state.tone === "late" ? colors.late : state.tone === "soon" ? colors.brandText : colors.ink2;

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text
          style={styles.title}
          accessibilityRole="header"
          maxFontSizeMultiplier={maxScale.title}
        >
          Service
        </Text>
        <Text style={styles.sub}>
          {piano.title} · {months === 0 ? "no tuning reminders" : `tuned ${intervalLabel(months).toLowerCase()}`}
        </Text>

        <View style={styles.stats}>
          <View style={styles.stat} accessible accessibilityLabel={`${summary.count} services`}>
            <Text style={styles.statValue}>{summary.count}</Text>
            <Text style={styles.statLabel}>Services</Text>
          </View>
          <View style={styles.stat} accessible accessibilityLabel={`${formatRupees(summary.spent)} spent`}>
            <Text style={styles.statValue}>{formatRupees(summary.spent)}</Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
          <View
            style={[styles.stat, styles.wide]}
            accessible
            accessibilityLabel={state ? `Next tuning ${format(state.next, "d MMMM yyyy")}` : "No next tuning"}
          >
            <Text style={styles.statValue}>{state ? format(state.next, "d MMM") : "—"}</Text>
            <Text style={[styles.statLabel, { color: nextTone }]}>Next tuning</Text>
          </View>
        </View>

        {entries.length === 0 && <Text style={styles.quiet}>No service logged yet.</Text>}

        {byYear(entries).map((group) => (
          <View key={group.year}>
            <Text style={styles.year} accessibilityRole="header">
              {group.year}
            </Text>
            {group.entries.map((entry) => (
              <ServiceEntryRow
                key={entry.$id}
                entry={entry}
                withYear={false}
                onHold={hold}
                onEdit={edit}
                onDelete={confirmDelete}
              />
            ))}
          </View>
        ))}

        {entries.length > 0 && <Text style={styles.hint}>Press and hold a service to edit or delete it.</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Log service" onPress={startLogging} />
      </View>

      {sheets}
    </>
  );
};

/**
 * A piano's tuning and service log in full, opened from Show all on its page.
 */
const ServiceScreen = () => {
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const piano = useSelector((state: RootState) => state.pianos.items.find((item) => item.$id === id));
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.page}>
      <BackBar title={piano?.title ?? "Service"} fallback={piano ? `/detail/${piano.$id}` : "/home"} />
      {piano ? (
        <ServiceList piano={piano} />
      ) : (
        <StateView
          icon="document"
          title="This piano isn’t here"
          message="It may have been deleted."
          actionLabel="See all pianos"
          actionVariant="secondary"
          onAction={() => router.replace("/home")}
        />
      )}
    </SafeAreaView>
  );
};

const useStyles = makeStyles((colors) => ({
  page: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl },
  title: { ...type.pianoTitle, marginTop: 4, color: colors.ink },
  sub: { ...type.secondary, marginTop: 2, color: colors.ink2 },
  stats: {
    flexDirection: "row",
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  stat: { flex: 1 },
  wide: { flex: 1.2 },
  statValue: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, color: colors.ink, fontVariant: ["tabular-nums"] },
  statLabel: { ...type.caption, color: colors.ink2 },
  quiet: { ...type.secondary, marginTop: spacing.xl, color: colors.ink2 },
  year: {
    marginTop: 28,
    marginBottom: 6,
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.5,
    color: colors.ink2,
  },
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

export default ServiceScreen;
