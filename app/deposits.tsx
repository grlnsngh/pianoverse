import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import DepositRow from "@/components/DepositRow";
import RefreshBand, { HIDDEN_REFRESH_INDICATOR } from "@/components/RefreshBand";
import { Icon, Spinner, StateView } from "@/components/ui";
import { amountTextProps, fonts, maxScale, spacing, type } from "@/constants/theme";
import { usePianoData } from "@/lib/PianoDataContext";
import useCurrentDay from "@/lib/useCurrentDay";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import { RootState } from "@/redux/store";
import { depositsHeld } from "@/utils/deposits";
import { formatRupees } from "@/utils/money";

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/income");
};

/**
 * Every deposit held for a rental that is on a piano now (DepList board),
 * opened from the Income screen: what they come to, and each with who it is
 * held for and since when, the one held longest first. A deposit is refundable,
 * so it is never part of the income or the profit. A deposit leaves this list
 * when its rental ends; tapping one opens the piano.
 */
const DepositsScreen = () => {
  const colors = useColors();
  const styles = useStyles();
  const pianos = useSelector((state: RootState) => state.pianos.items);
  const { status, refresher } = usePianoData();
  // Works the day out again when the app comes back on a later one
  useCurrentDay();
  const held = depositsHeld(pianos);

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
      await refresher.current?.();
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, [refresher]);
  const openPiano = useCallback((id: string) => router.push(`/detail/${id}`), []);

  const loading = status === "loading" && pianos.length === 0;
  const failed = status === "failed" && pianos.length === 0;

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
          Deposits held
        </Text>

        {loading && (
          <View style={styles.centered}>
            <Spinner size={32} accessibilityLabel="Loading deposits" />
          </View>
        )}

        {failed && (
          <StateView
            icon="alert"
            title="Couldn’t load your pianos"
            message="Check your connection and try again."
            actionLabel="Try again"
            actionVariant="secondary"
            onAction={onRefresh}
          />
        )}

        {!loading && !failed && held.entries.length === 0 && (
          <Text style={styles.quiet}>
            No deposits are held. A deposit you note on a rental shows here until the rental ends. It is refundable, so it
            is never counted as income.
          </Text>
        )}

        {held.entries.length > 0 && (
          <>
            <Text style={styles.total} {...amountTextProps}>
              {formatRupees(held.total)}
            </Text>
            <Text style={styles.sub}>Refundable. Not part of your income or profit.</Text>

            <View style={styles.list}>
              {held.entries.map((entry) => (
                <DepositRow key={entry.piano.$id} held={entry} onOpen={openPiano} />
              ))}
            </View>

            <Text style={styles.hint}>A deposit leaves this list when its rental ends. Tap one to open the piano.</Text>
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
  title: { ...type.largeTitle, paddingHorizontal: spacing.screen, marginTop: spacing.xs, color: colors.ink },
  centered: { alignItems: "center", paddingTop: spacing.xxxl },
  quiet: { ...type.secondary, paddingHorizontal: spacing.screen, marginTop: spacing.lg, color: colors.ink2 },
  total: {
    fontFamily: fonts.bold,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.72,
    paddingHorizontal: spacing.screen,
    marginTop: spacing.md,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  sub: { ...type.secondary, paddingHorizontal: spacing.screen, color: colors.ink2 },
  list: { marginTop: spacing.xl },
  hint: {
    ...type.caption,
    fontFamily: fonts.regular,
    paddingHorizontal: spacing.screen,
    marginTop: spacing.md,
    color: colors.ink2,
  },
}));

export default DepositsScreen;
