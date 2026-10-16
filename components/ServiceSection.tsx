import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { toneColor } from "@/components/DetailParts";
import ServiceEntryRow from "@/components/ServiceEntryRow";
import useServiceSheets from "@/components/useServiceSheets";
import { Button, Icon, Spinner } from "@/components/ui";
import { fonts, radii, spacing, type } from "@/constants/theme";
import useLetterhead from "@/lib/useLetterhead";
import { PianoItem } from "@/redux/pianos/types";
import { sendMessage } from "@/utils/contact";
import { formatRupees } from "@/utils/money";
import { canRemind } from "@/utils/reminders";
import {
  intervalLabel,
  serviceDetail,
  serviceHeadline,
  serviceMessage,
  serviceSummary,
} from "@/utils/serviceLog";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import useTextScale from "@/lib/useTextScale";
import { SectionTitle } from "./DetailParts";

/** The latest services on the piano's page; the rest are on its full list. */
export const SERVICES_SHOWN = 3;

/**
 * A piano's Service section (ServiceDetail and ServiceEmpty boards): when its
 * next tuning is due, Log service, Message the renter when a rented piano is
 * due, the latest three services, Show all, and the piano's tuning interval.
 */
const ServiceSection = ({ piano }: { piano: PianoItem }) => {
  const colors = useColors();
  const styles = useStyles();
  const { large } = useTextScale();
  const { details } = useLetterhead();
  const { log, entries, state, months, startLogging, hold, edit, confirmDelete, chooseIntervalOpen, sheets } =
    useServiceSheets(piano);
  const summary = serviceSummary(entries);
  const renter = piano.rental_customer_name?.trim() || "";
  const messageable = !!state && state.tone !== "ok" && canRemind(piano);

  const message = () => {
    if (!state) return;
    sendMessage(
      piano.rental_customer_mobile?.trim() || null,
      serviceMessage(piano, state.next, details.business),
      `${piano.title} tuning`
    );
  };

  return (
    <View>
      <View style={styles.header}>
        <SectionTitle>Service</SectionTitle>
        {summary.count > 0 && (
          <Text style={styles.count}>
            {[String(summary.count), summary.spent > 0 ? formatRupees(summary.spent) : ""].filter(Boolean).join(" · ")}
          </Text>
        )}
      </View>

      {log.status === "loading" && entries.length === 0 && (
        <View style={styles.centered}>
          <Spinner size={24} accessibilityLabel="Loading service" />
        </View>
      )}

      {log.status === "error" && (
        <View style={styles.centered}>
          <Text style={styles.quiet}>Couldn’t load the service log</Text>
          <Button title="Retry" variant="text" size="compact" onPress={log.reload} />
        </View>
      )}

      {log.status === "ready" && entries.length === 0 && (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="tuningFork" size={24} color={colors.ink} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>No service logged yet</Text>
          <Text style={styles.emptyText}>
            {months === 0
              ? "Log a tuning, repair, cleaning or move to keep its history."
              : `Log the last tuning, even an old one, and the next one is worked out: ${intervalLabel(months).toLowerCase()}.`}
          </Text>
          <LogButton onPress={startLogging} style={styles.emptyButton} />
        </View>
      )}

      {entries.length > 0 && (
        <>
          {state && (
            <View style={styles.status} accessible accessibilityLabel={`${serviceHeadline(state)}. ${serviceDetail(state)}`}>
              <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: toneColor(state.tone === "ok" ? "normal" : state.tone, colors) }]} />
                <Text style={[styles.headline, { color: toneColor(state.tone === "ok" ? "ink" : state.tone, colors) }]}>
                  {serviceHeadline(state)}
                </Text>
              </View>
              <Text style={styles.detail}>{serviceDetail(state)}</Text>
            </View>
          )}

          {/* Side by side, each half the width; with a big Font size one above the other, so neither label is cut */}
          <View style={[styles.buttons, large && styles.buttonsStacked]}>
            <LogButton onPress={startLogging} style={large ? undefined : styles.flex} />
            {messageable && (
              <Pressable
                onPress={message}
                accessibilityRole="button"
                accessibilityLabel={`Message ${renter || "the renter"} about the tuning`}
                style={({ pressed }) => [styles.outline, !large && styles.flex, pressed && styles.outlinePressed]}
              >
                <Icon name="message" size={18} color={colors.ink} strokeWidth={1.8} />
                <Text style={styles.outlineLabel} numberOfLines={large ? 2 : 1}>
                  {`Message ${renter.split(/\s+/)[0] || "renter"}`}
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.list}>
            {entries.slice(0, SERVICES_SHOWN).map((entry) => (
              <ServiceEntryRow key={entry.$id} entry={entry} onHold={hold} onEdit={edit} onDelete={confirmDelete} />
            ))}
          </View>
          {entries.length > SERVICES_SHOWN && (
            <Button
              title={`Show all ${entries.length} services`}
              variant="outline"
              size="compact"
              onPress={() => router.push(`/service/${piano.$id}`)}
              style={styles.showAll}
            />
          )}
          <Text style={styles.hint}>Press and hold a service to edit or delete it.</Text>
        </>
      )}

      <Pressable
        onPress={chooseIntervalOpen}
        accessibilityRole="button"
        accessibilityLabel={`Tuning interval, ${intervalLabel(months)}`}
        style={({ pressed }) => [styles.interval, pressed && styles.intervalPressed]}
      >
        <Text style={styles.intervalLabel}>Tuning interval</Text>
        <View style={styles.intervalValue}>
          <Text style={styles.intervalText}>{intervalLabel(months)}</Text>
          <Icon name="chevronRight" size={18} color={colors.chevron} strokeWidth={2} />
        </View>
      </Pressable>

      {sheets}
    </View>
  );
};

/** The dark Log service button (an ink fill, so it doesn't compete with the orange bar below). */
export const LogButton = ({ onPress, style }: { onPress: () => void; style?: object }) => {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Log service"
      style={({ pressed }) => [styles.log, style, pressed && styles.logPressed]}
    >
      <Icon name="plus" size={18} color={colors.onInk} strokeWidth={2.2} />
      <Text style={styles.logLabel}>Log service</Text>
    </Pressable>
  );
};

const useStyles = makeStyles((colors) => ({
  header: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  count: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink2, fontVariant: ["tabular-nums"] },
  centered: { alignItems: "center", paddingVertical: spacing.lg, gap: spacing.sm },
  quiet: { ...type.bodyMedium, color: colors.ink2 },
  status: { marginTop: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: radii.card, backgroundColor: colors.grouped },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  headline: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  detail: { ...type.secondary, marginTop: 2, paddingLeft: 16, color: colors.inkBody },
  buttons: { flexDirection: "row", gap: 10, marginTop: 12 },
  buttonsStacked: { flexDirection: "column" },
  flex: { flex: 1 },
  log: {
    minHeight: 48,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radii.input,
    backgroundColor: colors.ink,
  },
  logPressed: { opacity: 0.85 },
  logLabel: { flexShrink: 1, textAlign: "center", fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.onInk },
  outline: {
    minHeight: 48,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  outlinePressed: { backgroundColor: colors.grouped },
  outlineLabel: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink, flexShrink: 1 },
  list: { marginTop: spacing.lg },
  showAll: { marginTop: spacing.sm },
  hint: { ...type.caption, marginTop: spacing.md, fontFamily: fonts.regular, color: colors.ink2 },
  empty: {
    marginTop: spacing.lg,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: radii.card,
    backgroundColor: colors.grouped,
    alignItems: "center",
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  emptyTitle: { marginTop: 12, fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.ink },
  emptyText: { ...type.secondary, marginTop: 4, textAlign: "center", color: colors.inkBody },
  emptyButton: { alignSelf: "stretch", marginTop: spacing.lg },
  interval: {
    minHeight: 56,
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.hairline,
  },
  intervalPressed: { backgroundColor: colors.grouped },
  intervalLabel: { ...type.body, color: colors.ink2 },
  intervalValue: { flexDirection: "row", alignItems: "center", gap: 6 },
  intervalText: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.ink },
}));

export default ServiceSection;
