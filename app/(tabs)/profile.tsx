import Constants from "expo-constants";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as Updates from "expo-updates";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import ExportPaymentsSheet from "@/components/ExportPaymentsSheet";
import ReminderPreview, { SAMPLE_REMINDER } from "@/components/ReminderPreview";
import SignOutSheet from "@/components/SignOutSheet";
import { Group, Icon, Segmented, Spinner, Switch } from "@/components/ui";
import type { IconName } from "@/components/ui";
import { fonts, radii, spacing, type } from "@/constants/theme";
import { useGlobalContext } from "@/context/GlobalProvider";
import { useAppLock } from "@/lib/AppLockContext";
import { signOut } from "@/lib/appwrite";
import { exportCustomers, exportPayments } from "@/lib/exportData";
import { clearPianoCache } from "@/lib/pianoCache";
import useSavedAt from "@/lib/useSavedAt";
import { setActiveTab } from "@/redux/navigation/actions";
import { resetPianoState } from "@/redux/pianos/actions";
import { RootState } from "@/redux/store";
import { scheduleAllRentalNotifications } from "@/services/notifications";
import { formatLastUpdated, initialOf, memberSince, profilePhoto } from "@/utils/account";
import { versionLabel } from "@/utils/appVersion";
import { exportPianosToCSV } from "@/utils/csvExport";
import { ExportPeriod, exportPeriods } from "@/utils/exportPeriods";
import { showDialog } from "@/utils/dialog";
import { showToast } from "@/utils/toast";
import { stockCounts } from "@/utils/today";
import { makeStyles, useColors, useTheme } from "@/lib/ThemeContext";
import { APPEARANCE_LABELS, APPEARANCE_SETTINGS } from "@/utils/appearance";

const THEME_OPTIONS = APPEARANCE_SETTINGS.map((value) => ({
  value,
  label: APPEARANCE_LABELS[value],
}));

const CountCell = ({
  value,
  label,
  last,
}: {
  value: number;
  label: string;
  last?: boolean;
}) => {
  const styles = useStyles();
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${value}`}
      style={[styles.count, !last && styles.countDivider]}
    >
      <Text style={styles.countValue}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
};

/** A row of "Your data": an icon, what it is, and a hint, then a chevron or a value. */
const DataRow = ({
  icon,
  title,
  hint,
  value,
  onPress,
  busy,
  locked,
}: {
  icon: IconName;
  title: string;
  hint: string;
  value?: string;
  onPress?: () => void;
  /** Working on this row: it shows a spinner and can't be pressed */
  busy?: boolean;
  /** Something else is working: it can't be pressed, with nothing to show for it */
  locked?: boolean;
}) => {
  const colors = useColors();
  const styles = useStyles();
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
      disabled={busy || locked}
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
  const colors = useColors();
  const styles = useStyles();
  const dispatch = useDispatch();
  const { user, setUser, setIsLogged } = useGlobalContext();
  const items = useSelector((state: RootState) => state.pianos.items);
  const activeTab = useSelector((state: RootState) => state.navigation.activeTab);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const version = versionLabel(
    Constants.expoConfig?.version,
    Updates.updateId,
    Updates.isEmbeddedLaunch
  );
  // Which download is going on, if one is: they take a moment (the data is asked for first)
  const [exporting, setExporting] = useState<"pianos" | "payments" | "customers" | null>(null);
  const [choosingPeriod, setChoosingPeriod] = useState(false);
  const exportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (exportTimer.current) clearTimeout(exportTimer.current);
    },
    []
  );
  // The photo that couldn't be loaded, so the initial shows instead of an empty circle
  const [brokenPhoto, setBrokenPhoto] = useState<string | null>(null);
  const appLock = useAppLock();
  const theme = useTheme();

  const counts = stockCounts(items);
  const since = memberSince(user?.$createdAt);
  const avatarPhoto = profilePhoto(user?.avatar);
  const photo = avatarPhoto && avatarPhoto !== brokenPhoto ? avatarPhoto : null;
  // Read again each time the tab is shown, since the Pianos tab saves a copy after every load
  const savedAt = useSavedAt(user?.accountId, activeTab);

  const runExport = async (kind: "pianos" | "payments" | "customers", task: () => Promise<void>) => {
    setExporting(kind);
    try {
      await task();
    } catch (error) {
      // The downloads tell the person themselves; this only keeps one that didn't from being lost
      console.warn("A download failed:", error);
    } finally {
      setExporting(null);
    }
  };

  const handleExport = () => runExport("pianos", () => exportPianosToCSV(items));

  const handleExportCustomers = () =>
    user ? runExport("customers", () => exportCustomers(user.accountId, items)) : undefined;

  // The sheet takes 240 ms to leave; the download starts after that, so what it shows
  // (a message, the share sheet) isn't started under a sheet that is still going
  const handleChoosePeriod = (period: ExportPeriod) => {
    setChoosingPeriod(false);
    if (!user) return;
    exportTimer.current = setTimeout(
      () => runExport("payments", () => exportPayments(user.accountId, items, period)),
      300
    );
  };

  // Turning it on first asks the phone to check the person, so it can never be turned on and not work
  const handleAppLock = async (turnOn: boolean) => {
    if (!turnOn) {
      await appLock.disable();
      showToast("App lock is off");
      return;
    }
    const result = await appLock.enable();
    if (result.ok) {
      showToast("App lock is on", { variant: "success" });
    } else if (result.reason === "unavailable") {
      showDialog({
        title: "Set up a screen lock first",
        message:
          "App lock uses your fingerprint, face or screen lock. Set one up in your phone's settings, then try again.",
        actions: [{ label: "OK", onPress: () => {} }],
      });
    } else if (result.reason === "lockout") {
      showToast("Too many tries. Wait a moment and try again.", { variant: "error" });
    } else if (result.reason === "failed") {
      showToast("Couldn't turn on app lock. Try again.", { variant: "error" });
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
          <Pressable
            onPress={() => router.push("/edit-profile")}
            accessibilityRole="button"
            accessibilityLabel={`Edit profile, ${user?.username || "User"}`}
            accessibilityHint="Change your photo or name"
            style={({ pressed }) => [styles.who, pressed && styles.whoPressed]}
          >
            <View style={styles.avatar}>
              {photo ? (
                <Image
                  source={{ uri: photo }}
                  style={styles.photo}
                  contentFit="cover"
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  onError={() => setBrokenPhoto(photo)}
                />
              ) : (
                <Text style={styles.initial}>{initialOf(user?.username, user?.email)}</Text>
              )}
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
            <Icon name="chevronRight" size={18} color={colors.chevron} strokeWidth={2} />
          </Pressable>
          <View style={styles.counts}>
            <CountCell value={counts.inStock} label="In stock" />
            <CountCell value={counts.onRent} label="On rent" />
            <CountCell value={counts.soldThisMonth.count} label="Sold this month" last />
          </View>
        </View>

        <Group title="Reports" radius="panel" style={styles.section}>
          <DataRow
            icon="chart"
            title="Income"
            hint="Rent and sales, month by month"
            onPress={() => router.push("/income")}
          />
          <DataRow
            icon="tabAccount"
            title="Customers"
            hint="Who has rented your pianos, and what they paid"
            onPress={() => router.push("/customers")}
          />
        </Group>

        <Group title="Your data" radius="panel" style={styles.section}>
          <DataRow
            icon="download"
            title="Download piano list"
            hint="CSV file. Sold pianos are marked Sold."
            onPress={handleExport}
            busy={exporting === "pianos"}
            locked={exporting !== null}
          />
          <DataRow
            icon="download"
            title="Download payments"
            hint="CSV file for your accountant. You choose the period."
            onPress={() => setChoosingPeriod(true)}
            busy={exporting === "payments"}
            locked={exporting !== null}
          />
          <DataRow
            icon="download"
            title="Download customers"
            hint="CSV file: who has rented, and what they paid."
            onPress={handleExportCustomers}
            busy={exporting === "customers"}
            locked={exporting !== null}
          />
          <DataRow
            icon="refresh"
            title="Last updated"
            hint="Saved on this device for offline use"
            value={savedAt ? formatLastUpdated(savedAt) : "Not yet"}
          />
        </Group>

        <Group title="Appearance" radius="panel" style={styles.section}>
          <View style={styles.themeRow}>
            <View style={styles.themeHead}>
              <Icon name="moon" size={24} color={colors.ink} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Theme</Text>
                <Text style={styles.rowHint}>Light, dark, or the same as your phone</Text>
              </View>
            </View>
            <Segmented
              options={THEME_OPTIONS}
              value={theme.setting}
              onChange={theme.setSetting}
              accessibilityLabel="Theme"
            />
          </View>
        </Group>

        <Group title="Security" radius="panel" style={styles.section}>
          <View style={styles.dataRow}>
            <Icon name="lock" size={24} color={colors.ink} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>App lock</Text>
              <Text style={styles.rowHint}>
                Ask for your fingerprint or screen lock when you open Pianoverse
              </Text>
            </View>
            <Switch
              value={appLock.enabled}
              onValueChange={handleAppLock}
              accessibilityLabel="App lock"
            />
          </View>
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

        {!!version && <Text style={styles.version}>{version}</Text>}
      </ScrollView>

      <ExportPaymentsSheet
        visible={choosingPeriod}
        onClose={() => setChoosingPeriod(false)}
        periods={exportPeriods()}
        onChoose={handleChoosePeriod}
      />
      <SignOutSheet
        visible={signOutOpen}
        signingOut={signingOut}
        onConfirm={handleConfirmSignOut}
        onClose={() => setSignOutOpen(false)}
      />
    </SafeAreaView>
  );
};

const useStyles = makeStyles((colors) => ({
  page: { flex: 1, backgroundColor: colors.grouped },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxl },
  title: { ...type.largeTitle, paddingTop: spacing.xl, color: colors.ink },
  card: {
    marginTop: spacing.xl,
    borderRadius: radii.panel,
    backgroundColor: colors.surface,
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
  whoPressed: { backgroundColor: colors.grouped },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: colors.brand,
  },
  photo: { width: 64, height: 64 },
  initial: { fontFamily: fonts.bold, fontSize: 28, color: colors.onBrand },
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
  themeRow: { gap: spacing.md, padding: spacing.lg },
  themeHead: { flexDirection: "row", alignItems: "center", gap: 14 },
  rowText: { flex: 1 },
  rowTitle: { ...type.rowTitle, color: colors.ink },
  rowHint: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
  rowValue: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink2 },
  reminders: {
    padding: spacing.lg,
    borderRadius: radii.panel,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
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
  version: {
    marginTop: spacing.xl,
    ...type.caption,
    fontFamily: fonts.regular,
    textAlign: "center",
    color: colors.ink2,
  },
}));

export default Profile;
