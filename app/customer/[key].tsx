import { router, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
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
import RefreshBand, {
  HIDDEN_REFRESH_INDICATOR,
} from "@/components/RefreshBand";
import { Icon, Spinner, StateView } from "@/components/ui";
import { fonts, spacing, type } from "@/constants/theme";
import useCurrentDay from "@/lib/useCurrentDay";
import useOwnerPayments from "@/lib/useOwnerPayments";
import useOwnerRentalHistory from "@/lib/useOwnerRentalHistory";
import { RootState } from "@/redux/store";
import { callNumber, messageOnWhatsApp } from "@/utils/contact";
import {
  buildCustomers,
  CustomerPiano,
  customerKey,
  paymentsOfCustomer,
  paymentsText,
  rangeText,
} from "@/utils/customers";
import { parseStoredDate } from "@/utils/dates";
import { formatRupees } from "@/utils/money";
import { statusLine } from "@/utils/pianoDetail";
import { makeStyles, useColors } from "@/lib/ThemeContext";

const BUTTON = 44;

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/customers");
};

/** "5 Aug 2026", from the day a payment was paid. */
const dayText = (paidOn: string) => {
  const date = parseStoredDate(paidOn);
  return date ? format(date, "d MMM yyyy") : "";
};

const SectionTitle = ({ children }: { children: string }) => {
  const styles = useStyles();
  return (
    <Text style={styles.sectionTitle} accessibilityRole="header">
      {children}
    </Text>
  );
};

/** One piano a customer paid for or has: its name, what they paid for it, and a way to open it. */
const PianoRow = ({
  entry,
  onOpen,
}: {
  entry: CustomerPiano;
  onOpen: (id: string) => void;
}) => {
  const colors = useColors();
  const styles = useStyles();
  const detail = entry.renting
    ? entry.paymentsCount > 0
      ? `Renting now · ${paymentsText(entry.paymentsCount)}`
      : "Renting now · no payments yet"
    : paymentsText(entry.paymentsCount);
  const total = formatRupees(entry.total);

  return (
    <Pressable
      onPress={() => onOpen(entry.pianoId)}
      accessibilityRole="button"
      accessibilityLabel={`${entry.title}, ${detail}, ${total}`}
      accessibilityHint="Opens this piano"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowTexts}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {entry.title}
        </Text>
        <Text
          style={[styles.rowDetail, entry.renting && styles.renting]}
          numberOfLines={1}
        >
          {detail}
        </Text>
      </View>
      <Text style={styles.rowAmount}>{total}</Text>
      <Icon
        name="chevronRight"
        size={18}
        color={colors.chevron}
        strokeWidth={2}
      />
    </Pressable>
  );
};

/**
 * One customer's page, opened from the Customers list or from a piano's
 * Previous renters: the pianos they have now (with their number to call or
 * message), what they have paid in all, the pianos they paid rent for, and each
 * payment, newest first.
 */
const Customer = () => {
  const colors = useColors();
  const styles = useStyles();
  const { key: param } = useLocalSearchParams<{ key: string }>();
  const key = customerKey(decodeURIComponent(String(param ?? "")));
  const pianos = useSelector((state: RootState) => state.pianos.items);
  const { loaded, failed, payments, reload } = useOwnerPayments(null);
  const history = useOwnerRentalHistory();
  const reloadHistory = history.reload;
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
  const openPiano = useCallback(
    (id: string) => router.push(`/detail/${id}`),
    []
  );

  const customer = buildCustomers(
    payments,
    pianos,
    history.entries
  ).customers.find((candidate) => candidate.key === key);
  const theirs = customer ? paymentsOfCustomer(payments, key) : [];
  const titles = new Map(
    pianos.map((piano) => [piano.$id, piano.title || "Untitled piano"])
  );
  const renting = customer
    ? customer.pianos.filter((entry) => entry.renting)
    : [];
  const before = customer
    ? customer.pianos.filter((entry) => !entry.renting)
    : [];

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

        {!loaded && (
          <View style={styles.centered}>
            <Spinner size={32} accessibilityLabel="Loading customer" />
          </View>
        )}

        {loaded && failed && (
          <StateView
            icon="alert"
            title="Couldn’t load this customer"
            message="Check your connection and try again."
            actionLabel="Try again"
            actionVariant="secondary"
            onAction={reload}
          />
        )}

        {loaded && !failed && !customer && (
          <StateView
            icon="alert"
            title="Customer not found"
            message="They may have no payments and no piano any more."
            actionLabel="Go back"
            actionVariant="secondary"
            onAction={goBack}
          />
        )}

        {loaded && !failed && customer && (
          <>
            <Text
              style={styles.title}
              accessibilityRole="header"
              numberOfLines={2}
            >
              {customer.name}
            </Text>

            {customer.mobile && (
              <View style={styles.contact}>
                <Text style={styles.mobile}>{customer.mobile}</Text>
                <View style={styles.buttons}>
                  <Pressable
                    onPress={() => callNumber(customer.mobile as string)}
                    accessibilityRole="button"
                    accessibilityLabel={`Call ${customer.name}`}
                    style={({ pressed }) => [
                      styles.contactButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Icon
                      name="phone"
                      size={20}
                      color={colors.ink}
                      strokeWidth={1.8}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => messageOnWhatsApp(customer.mobile as string)}
                    accessibilityRole="button"
                    accessibilityLabel="Message on WhatsApp"
                    style={({ pressed }) => [
                      styles.contactButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Icon
                      name="message"
                      size={20}
                      color={colors.ink}
                      strokeWidth={1.8}
                    />
                  </Pressable>
                </View>
              </View>
            )}

            <Text style={styles.label}>Paid in all</Text>
            <Text style={styles.amount}>{formatRupees(customer.total)}</Text>
            <Text style={styles.summary}>
              {customer.paymentsCount > 0
                ? `${paymentsText(customer.paymentsCount)}${
                    customer.lastPaidOn
                      ? ` · last paid ${format(customer.lastPaidOn, "d MMM yyyy")}`
                      : ""
                  }`
                : "No payments yet"}
            </Text>

            {renting.length > 0 && (
              <>
                <SectionTitle>Renting now</SectionTitle>
                {renting.map((entry) => {
                  const piano = pianos.find(
                    (candidate) => candidate.$id === entry.pianoId
                  );
                  const status = piano ? statusLine(piano) : null;
                  return (
                    <View key={entry.pianoId}>
                      <PianoRow entry={entry} onOpen={openPiano} />
                      {!!status && (
                        <Text style={styles.status}>{status.text}</Text>
                      )}
                    </View>
                  );
                })}
              </>
            )}

            {before.length > 0 && (
              <>
                <SectionTitle>Rented before</SectionTitle>
                {before.map((entry) => (
                  <PianoRow
                    key={entry.pianoId}
                    entry={entry}
                    onOpen={openPiano}
                  />
                ))}
              </>
            )}

            {customer.rentals.length > 0 && (
              <>
                <SectionTitle>Rental history</SectionTitle>
                {customer.rentals.map((rental) => {
                  const title =
                    titles.get(rental.piano_id) ??
                    (rental.piano_title?.trim() || "A piano");
                  const range = rangeText(
                    rental.period_start
                      ? parseStoredDate(rental.period_start)
                      : null,
                    rental.period_end
                      ? parseStoredDate(rental.period_end)
                      : parseStoredDate(rental.closed_on)
                  );
                  const price =
                    typeof rental.price === "number"
                      ? `${formatRupees(rental.price)} rent`
                      : "";
                  const detail = [range, price].filter(Boolean).join(" · ");
                  return (
                    <View
                      key={rental.$id}
                      accessible
                      accessibilityLabel={[title, detail]
                        .filter(Boolean)
                        .join(", ")}
                      style={styles.paymentRow}
                    >
                      <View style={styles.rowTexts}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {title}
                        </Text>
                        {!!detail && (
                          <Text style={styles.rowDetail} numberOfLines={2}>
                            {detail}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {theirs.length > 0 && (
              <>
                <SectionTitle>Payments</SectionTitle>
                {theirs.map((payment) => {
                  const day = dayText(payment.paid_on);
                  const title = titles.get(payment.piano_id) ?? "A piano";
                  const amount = formatRupees(payment.amount);
                  return (
                    <View
                      key={payment.$id}
                      accessible
                      accessibilityLabel={`${day}, ${title}, ${amount}`}
                      style={styles.paymentRow}
                    >
                      <View style={styles.rowTexts}>
                        <Text style={styles.rowTitle}>{day}</Text>
                        <Text style={styles.rowDetail} numberOfLines={1}>
                          {payment.note ? `${title} · ${payment.note}` : title}
                        </Text>
                      </View>
                      <Text style={styles.rowAmount}>{amount}</Text>
                    </View>
                  );
                })}
              </>
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
  centered: { alignItems: "center", paddingTop: spacing.xxxl },
  title: {
    ...type.largeTitle,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    color: colors.ink,
  },
  contact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screen,
    marginTop: spacing.sm,
  },
  mobile: { ...type.body, color: colors.ink2, fontVariant: ["tabular-nums"] },
  buttons: { flexDirection: "row", gap: spacing.sm },
  contactButton: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.grouped },
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
  summary: {
    ...type.secondary,
    paddingHorizontal: spacing.screen,
    color: colors.ink2,
  },
  sectionTitle: {
    ...type.section,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.screen,
    color: colors.ink,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 64,
    paddingLeft: spacing.screen,
    paddingRight: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 60,
    paddingHorizontal: spacing.screen,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  rowTexts: { flex: 1, minWidth: 0 },
  rowTitle: { ...type.rowTitle, color: colors.ink },
  rowDetail: { ...type.secondary, color: colors.ink2 },
  renting: { fontFamily: fonts.semibold, color: colors.brandText },
  rowAmount: {
    ...type.rowTitle,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  status: {
    ...type.secondary,
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm,
    color: colors.ink2,
  },
}));

export default Customer;
