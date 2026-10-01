import { router } from "expo-router";
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
import CustomerRow from "@/components/CustomerRow";
import RefreshBand, {
  HIDDEN_REFRESH_INDICATOR,
} from "@/components/RefreshBand";
import { Icon, Spinner, StateView } from "@/components/ui";
import { spacing, type } from "@/constants/theme";
import useCurrentDay from "@/lib/useCurrentDay";
import useOwnerPayments from "@/lib/useOwnerPayments";
import useOwnerRentalHistory from "@/lib/useOwnerRentalHistory";
import { RootState } from "@/redux/store";
import { buildCustomers } from "@/utils/customers";
import { makeStyles, useColors } from "@/lib/ThemeContext";

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/profile");
};

/**
 * The Customers screen, opened from Account: everyone who has rented a piano,
 * the ones who have one now first and then the rest by when they last paid.
 * It is worked out from the names saved with the rent payments and the
 * customers on the pianos rented out now, so a customer appears once a payment
 * is recorded for them or a piano is rented to them.
 */
const Customers = () => {
  const colors = useColors();
  const styles = useStyles();
  const pianos = useSelector((state: RootState) => state.pianos.items);
  const { loaded, failed, payments, reload } = useOwnerPayments(null);
  const history = useOwnerRentalHistory();
  const reloadHistory = history.reload;
  // A new day can change who still has a piano
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
      await Promise.all([reload(), reloadHistory()]);
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, [reload, reloadHistory]);

  const openCustomer = useCallback(
    (key: string) => router.push(`/customer/${encodeURIComponent(key)}`),
    []
  );

  const { customers, unnamed } = buildCustomers(
    payments,
    pianos,
    history.entries
  );

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
          Customers
        </Text>

        {!loaded && (
          <View style={styles.centered}>
            <Spinner size={32} accessibilityLabel="Loading customers" />
          </View>
        )}

        {loaded && failed && (
          <StateView
            icon="alert"
            title="Couldn’t load customers"
            message="Check your connection and try again."
            actionLabel="Try again"
            actionVariant="secondary"
            onAction={reload}
          />
        )}

        {loaded && !failed && customers.length === 0 && (
          <Text style={styles.quiet}>
            No customers yet. They show up here once you record a rent payment
            or rent a piano to someone.
          </Text>
        )}

        {loaded && !failed && customers.length > 0 && (
          <>
            <Text style={styles.count}>
              {customers.length === 1
                ? "1 customer"
                : `${customers.length} customers`}
            </Text>
            <View style={styles.list}>
              {customers.map((customer) => (
                <CustomerRow
                  key={customer.key}
                  customer={customer}
                  onOpen={openCustomer}
                />
              ))}
            </View>
            {unnamed > 0 && (
              <Text style={styles.note}>
                {unnamed === 1
                  ? "1 payment was recorded before names were saved, so it isn’t listed under anyone."
                  : `${unnamed} payments were recorded before names were saved, so they aren’t listed under anyone.`}
              </Text>
            )}
          </>
        )}
      </ScrollView>
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
  count: {
    ...type.secondary,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.screen,
    color: colors.ink2,
  },
  list: {
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  note: {
    ...type.caption,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.screen,
    color: colors.ink2,
  },
}));

export default Customers;
