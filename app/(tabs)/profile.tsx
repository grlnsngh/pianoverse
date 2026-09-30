import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import ReminderPreview, { SAMPLE_REMINDER } from "@/components/ReminderPreview";
import SignOutSheet from "@/components/SignOutSheet";
import { Group, Icon, Spinner } from "@/components/ui";
import type { IconName } from "@/components/ui";
import { colors, fonts, radii, spacing, type } from "@/constants/theme";
import { useGlobalContext } from "@/context/GlobalProvider";
import { signOut } from "@/lib/appwrite";
import { clearPianoCache } from "@/lib/pianoCache";
import useSavedAt from "@/lib/useSavedAt";
import { setActiveTab } from "@/redux/navigation/actions";
import { resetPianoState } from "@/redux/pianos/actions";
import { RootState } from "@/redux/store";
import { scheduleAllRentalNotifications } from "@/services/notifications";
import { formatLastUpdated, initialOf, memberSince } from "@/utils/account";
import { exportPianosToCSV } from "@/utils/csvExport";
import { stockCounts } from "@/utils/today";

const CountCell = ({
  value,
  label,
  last,
}: {
  value: number;
  label: string;
  last?: boolean;
}) => (
  <View
    accessible
    accessibilityLabel={`${label}, ${value}`}
    style={[styles.count, !last && styles.countDivider]}
  >
    <Text style={styles.countValue}>{value}</Text>
    <Text style={styles.countLabel}>{label}</Text>
  </View>
);

/** A row of "Your data": an icon, what it is, and a hint, then a chevron or a value. */
const DataRow = ({
  icon,
  title,
  hint,
  value,
  onPress,
  busy,
}: {
  icon: IconName;
  title: string;
  hint: string;
  value?: string;
  onPress?: () => void;
  busy?: boolean;
}) => {
  const body = (
    <>
      <Icon name={icon} size={24} color={colors.ink} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      {busy ? (
        <Spinner size={20} accessibilityLabel={`${title}, working`} />
      ) : onPress ? (
        <Icon name="chevronRight" size={18} color={colors.chevron} strokeWidth={2} />
      ) : (
        <Text style={styles.rowValue}>{value}</Text>
      )}
    </>
  );

  if (!onPress) return <View style={styles.dataRow}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${hint}`}
      style={({ pressed }) => [styles.dataRow, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
};

/**
 * The Account tab (Account and SignOutConfirm boards): who is signed in and
 * how many pianos they have, their data (the piano list as a CSV file, and
 * when this phone's copy was last updated), what the reminders are, and Sign out.
 */
const Profile = () => {
  const dispatch = useDispatch();
  const { user, setUser, setIsLogged } = useGlobalContext();
  const items = useSelector((state: RootState) => state.pianos.items);
  const activeTab = useSelector((state: RootState) => state.navigation.activeTab);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [exporting, setExporting] = useState(false);

  const counts = stockCounts(items);
  const since = memberSince(user?.$createdAt);
  // Read again each time the tab is shown, since the Pianos tab saves a copy after every load
  const savedAt = useSavedAt(user?.accountId, activeTab);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportPianosToCSV(items);
    } finally {
      setExporting(false);
    }
  };

  const handleConfirmSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      setSigningOut(false);
      setSignOutOpen(false);
      Alert.alert(
        "Sign Out Failed",
        error instanceof Error ? error.message : "Please try again."
      );
      return;
    }
    // Don't leave this account's pianos or reminders behind for the next user
    await scheduleAllRentalNotifications([]);
    await clearPianoCache();
    dispatch(resetPianoState() as any);
    dispatch(setActiveTab("pianos") as any);
    setUser(null);
    setIsLogged(false);
    setSigningOut(false);
    setSignOutOpen(false);
    router.replace("/");
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title} accessibilityRole="header">
          Account
        </Text>

        <View style={styles.card}>
          <View style={styles.who}>
            <View style={styles.avatar}>
              <Text style={styles.initial}>{initialOf(user?.username, user?.email)}</Text>
            </View>
            <View style={styles.whoText}>
              <Text style={styles.name} numberOfLines={1}>
                {user?.username || "User"}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {user?.email}
              </Text>
              {since && <Text style={styles.since}>{since}</Text>}
            </View>
          </View>
          <View style={styles.counts}>
            <CountCell value={counts.inStock} label="In stock" />
            <CountCell value={counts.onRent} label="On rent" />
            <CountCell value={counts.soldThisMonth.count} label="Sold this month" last />
          </View>
        </View>

        <Group title="Your data" radius="panel" style={styles.section}>
          <DataRow
            icon="download"
            title="Download piano list"
            hint="CSV file. Sold pianos are marked Sold."
            onPress={handleExport}
            busy={exporting}
          />
          <DataRow
            icon="refresh"
            title="Last updated"
            hint="Saved on this device for offline use"
            value={savedAt ? formatLastUpdated(savedAt) : "Not yet"}
          />
        </Group>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Rental reminders
          </Text>
          <View style={styles.reminders}>
            <View style={styles.reminderHead}>
              <Icon name="bell" size={24} color={colors.ink} />
              <Text style={styles.reminderTitle}>Know before a rental ends</Text>
            </View>
            <Text style={styles.reminderText}>
              You get a notification at 9:00 AM when a rental is about to end. Tap it to open that
              piano.
            </Text>
            <View style={styles.preview}>
              <ReminderPreview {...SAMPLE_REMINDER} />
            </View>
            <Text style={styles.reminderNote}>
              Sent 7 days before, 1 day before and on the day it ends. If the rental isn’t
              extended, again 1 day and 7 days after.
            </Text>
          </View>
        </View>

        <View style={[styles.signOutCard, styles.section]}>
          <Pressable
            onPress={() => setSignOutOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
          >
            <Icon name="logout" size={24} color={colors.late} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>

      <SignOutSheet
        visible={signOutOpen}
        signingOut={signingOut}
        onConfirm={handleConfirmSignOut}
        onClose={() => setSignOutOpen(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.grouped },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl },
  title: { ...type.largeTitle, paddingTop: spacing.xl, color: colors.ink },
  card: {
    marginTop: spacing.xl,
    borderRadius: radii.panel,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  who: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
  },
  initial: { fontFamily: fonts.bold, fontSize: 28, color: colors.ink },
  whoText: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.33,
    color: colors.ink,
  },
  email: { ...type.secondary, color: colors.ink2 },
  since: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
  counts: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  count: { flex: 1, paddingVertical: 14, alignItems: "center" },
  countDivider: { borderRightWidth: 1, borderRightColor: colors.hairline },
  countValue: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  countLabel: { ...type.caption, color: colors.ink2 },
  section: { marginTop: spacing.xxl },
  sectionTitle: {
    ...type.status,
    marginLeft: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.ink2,
  },
  dataRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: spacing.lg,
  },
  pressed: { backgroundColor: colors.grouped },
  rowText: { flex: 1 },
  rowTitle: { ...type.rowTitle, color: colors.ink },
  rowHint: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
  rowValue: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink2 },
  reminders: {
    padding: spacing.lg,
    borderRadius: radii.panel,
    backgroundColor: colors.white,
  },
  reminderHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  reminderTitle: { ...type.rowTitle, color: colors.ink },
  reminderText: { marginTop: spacing.sm, ...type.secondary, color: colors.ink2 },
  preview: { marginTop: 14 },
  reminderNote: {
    marginTop: spacing.md,
    ...type.caption,
    fontFamily: fonts.regular,
    color: colors.ink2,
  },
  signOutCard: {
    borderRadius: radii.panel,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  signOut: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: spacing.lg,
  },
  signOutText: { ...type.rowTitle, color: colors.late },
});

export default Profile;
