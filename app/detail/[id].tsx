import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSelector } from "react-redux";
import { router, useLocalSearchParams } from "expo-router";
import DetailSkeleton from "@/components/DetailSkeleton";
import {
  ActionRow,
  Divider,
  InfoRows,
  SectionTitle,
  toneColor,
} from "@/components/DetailParts";
import EditPaymentSheet from "@/components/EditPaymentSheet";
import ExtendRentalSheet from "@/components/ExtendRentalSheet";
import MarkAsSoldSheet from "@/components/MarkAsSoldSheet";
import PastRentersSection from "@/components/PastRentersSection";
import PaymentsSection from "@/components/PaymentsSection";
import PhotoHero from "@/components/PhotoHero";
import PianoActionsSheet from "@/components/PianoActionsSheet";
import RecordPaymentSheet from "@/components/RecordPaymentSheet";
import RentalSection from "@/components/RentalSection";
import StickyActionBar from "@/components/StickyActionBar";
import { Button, ScreenEntrance, useSkeletonDelay } from "@/components/ui";
import { colors, fonts, type } from "@/constants/theme";
import { PIANO_CATEGORY } from "@/constants/Piano";
import type { RentPayment } from "@/lib/appwrite";
import { usePianoData } from "@/lib/PianoDataContext";
import useDeletePiano from "@/lib/useDeletePiano";
import useOwnerRentalHistory from "@/lib/useOwnerRentalHistory";
import useRentPayments from "@/lib/useRentPayments";
import useUpdatePiano from "@/lib/useUpdatePiano";
import { PianoItem } from "@/redux/pianos/types";
import { RootState } from "@/redux/store";
import { sendMessage } from "@/utils/contact";
import { pastRentals } from "@/utils/customers";
import { formatRupees } from "@/utils/money";
import { getPianoPhotos } from "@/utils/photos";
import { isSold } from "@/utils/pianoStatus";
import {
  aboutSection,
  ACTION_LABELS,
  ActionKey,
  barInfo,
  formatDay,
  listActions,
  menuActions,
  metaLine,
  primaryAction,
  rentalPeriod,
  rentalRows,
  saleRows,
  statusLine,
  titlePrice,
} from "@/utils/pianoDetail";
import { showDialog } from "@/utils/dialog";
import {
  buildReceiptMessage,
  buildReminderMessage,
  needsReminder,
  receiptNumber,
} from "@/utils/reminders";
import { rentBalance } from "@/utils/rentDue";
import { buildShareMessage } from "@/utils/share";

// The ⋯ sheet takes 240 ms to leave; what it chose runs after that, so the
// sheet or dialog it opens isn't started under a sheet that is still going
const MENU_CLOSE_MS = 300;

const goBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/home");
};

/**
 * A piano's page (Detail boards): its photos across the top, then the title
 * with the category, make, company and status, the sections that fit its state
 * (a rental's customer, period and payments, a sale, or its details), the
 * actions as a list, and one main action in the bar at the bottom.
 */
const DetailScreen = () => {
  const { id } = useLocalSearchParams();
  const pianosList = useSelector((state: RootState) => state.pianos.items);
  const { status: pianoLoad } = usePianoData();
  const [isDeleted, setIsDeleted] = useState(false);
  const [showSoldSheet, setShowSoldSheet] = useState(false);
  const [showExtendSheet, setShowExtendSheet] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  // The recorded payment being changed, while its sheet shows
  const [editingPayment, setEditingPayment] = useState<RentPayment | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const confirmDelete = useDeletePiano();
  const updatePiano = useUpdatePiano();

  const piano: PianoItem | undefined = pianosList.find(
    (item) => item.$id === id,
  );
  const rentable = piano?.category === PIANO_CATEGORY.RENTABLE;
  const rentalHistory = useOwnerRentalHistory(rentable);
  const rentPayments = useRentPayments(
    typeof id === "string" ? id : "",
    rentable,
  );

  // The pianos are still on their way (a link opened before the list loaded)
  const waiting = !piano && !isDeleted && pianoLoad === "loading";
  const showSkeleton = useSkeletonDelay(waiting);

  const menuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (menuTimer.current) clearTimeout(menuTimer.current);
    },
    [],
  );

  const handleDelete = useCallback(() => {
    if (!piano) return;
    confirmDelete(piano, () => {
      setIsDeleted(true);
      goBack();
    });
  }, [piano, confirmDelete]);

  const handleUndoSale = useCallback(() => {
    if (!piano) return;
    showDialog({
      title: "Undo this sale?",
      message: `${piano.title} goes back into stock and its sale details are removed.`,
      actions: [
        {
          label: "Undo sale",
          tone: "destructive",
          onPress: () =>
            updatePiano(
              piano,
              {
                sold_date: null,
                sold_price: null,
                sold_to_name: null,
                sold_to_address: null,
              },
              `${piano.title} is back in stock`,
              { retry: true },
            ),
        },
        { label: "Cancel", onPress: () => {} },
      ],
    });
  }, [piano, updatePiano]);

  const handleShare = useCallback(async () => {
    if (!piano) return;
    try {
      await Share.share({
        title: piano.title,
        message: buildShareMessage(piano),
      });
    } catch (error) {
      Alert.alert(
        "Couldn't Share",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }, [piano]);

  // What the renter owes, once this piano's payments are here (without them it would look like everything is owed)
  const balance = useMemo(
    () =>
      piano && rentPayments.status === "ready"
        ? rentBalance(piano, rentPayments.payments)
        : null,
    [piano, rentPayments.status, rentPayments.payments],
  );

  // A reminder about the rental, typed into the renter's WhatsApp chat ready to send
  const remindCustomer = useCallback(() => {
    if (!piano) return;
    sendMessage(
      piano.rental_customer_mobile?.trim() || null,
      buildReminderMessage(piano, undefined, balance),
      `${piano.title} rental`,
    );
  }, [piano, balance]);

  // A payment's receipt: to the renter who paid it, or the share sheet
  const sendReceipt = useCallback(
    (payment: RentPayment) => {
      if (!piano) return;
      sendMessage(
        receiptNumber(payment, piano),
        buildReceiptMessage(payment, piano),
        "Payment receipt",
      );
    },
    [piano],
  );

  const confirmRemovePayment = useCallback(
    (payment: RentPayment) => {
      const whose = payment.customer_name?.trim()
        ? `${payment.customer_name.trim()}’s rental`
        : "this rental";
      showDialog({
        title: "Delete this payment?",
        message: `${formatRupees(payment.amount)} paid on ${
          formatDay(payment.paid_on) ?? ""
        } will be removed from ${whose}.`,
        actions: [
          {
            label: "Delete",
            tone: "destructive",
            onPress: () => rentPayments.remove(payment),
          },
          { label: "Cancel", onPress: () => {} },
        ],
      });
    },
    [rentPayments],
  );

  const openCustomer = useCallback(
    (key: string) => router.push(`/customer/${encodeURIComponent(key)}`),
    [],
  );

  const run = (action: ActionKey) => {
    switch (action) {
      case "recordPayment":
        return setShowPaymentSheet(true);
      case "remind":
        return remindCustomer();
      case "extend":
        return setShowExtendSheet(true);
      case "edit":
        return router.push(`/edit/${id}`);
      case "markSold":
        return setShowSoldSheet(true);
      case "undoSale":
        return handleUndoSale();
      case "delete":
        return handleDelete();
    }
  };

  const chooseFromMenu = (action: ActionKey) => {
    setShowMenu(false);
    menuTimer.current = setTimeout(() => run(action), MENU_CLOSE_MS);
  };

  // Stay blank while navigating away after a delete, instead of "Piano not found"
  if (isDeleted) {
    return <View style={styles.page} />;
  }

  if (!piano) {
    if (waiting) {
      return showSkeleton ? (
        <DetailSkeleton onBack={goBack} />
      ) : (
        <View style={styles.page} />
      );
    }
    return (
      <View style={[styles.page, styles.missing]}>
        <Text style={styles.missingTitle}>Piano not found</Text>
        <Button title="Go back" onPress={goBack} style={styles.missingButton} />
      </View>
    );
  }

  const sold = isSold(piano);
  const status = statusLine(piano);
  const price = titlePrice(piano);
  const about = aboutSection(piano);
  const period = rentalPeriod(piano);
  const showRental =
    rentable &&
    !sold &&
    !!(
      piano.rental_customer_name?.trim() ||
      piano.rental_customer_mobile?.trim() ||
      period.start ||
      period.end ||
      rentalRows(piano).length > 0
    );
  const sale = saleRows(piano);
  const primary = primaryAction(piano);
  const previous =
    rentable && rentPayments.status === "ready"
      ? pastRentals(rentPayments.payments, rentalHistory.entries, piano)
      : [];

  return (
    <View style={styles.page}>
      {/* The page fades in and grows a little; its bar rises after it */}
      <ScreenEntrance mode="grow" style={styles.grow}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <PhotoHero
            pianoId={piano.$id}
            photos={getPianoPhotos(piano)}
            sold={sold}
            onBack={goBack}
            onShare={sold ? undefined : handleShare}
            onMore={() => setShowMenu(true)}
          />

          <View style={styles.sheet}>
            <Text style={styles.title} accessibilityRole="header">
              {piano.title || "Untitled Piano"}
            </Text>
            <Text style={styles.meta}>{metaLine(piano)}</Text>

            {status && (
              <View style={styles.status}>
                {status.dot && (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: toneColor(status.tone) },
                    ]}
                  />
                )}
                <Text
                  style={[styles.statusText, { color: toneColor(status.tone) }]}
                >
                  {status.text}
                </Text>
              </View>
            )}
            {!!price && <Text style={styles.price}>{price}</Text>}

            {showRental && (
              <>
                <Divider />
                <RentalSection
                  piano={piano}
                  balance={balance}
                  onRemind={
                    needsReminder(piano, undefined, balance)
                      ? remindCustomer
                      : undefined
                  }
                />
              </>
            )}

            {sold && sale.length > 0 && (
              <>
                <Divider />
                <SectionTitle>Sale</SectionTitle>
                <InfoRows rows={sale} />
              </>
            )}

            {rentable && (
              <>
                <Divider />
                <PaymentsSection
                  payments={rentPayments.payments}
                  status={rentPayments.status}
                  onRetry={rentPayments.reload}
                  onDelete={confirmRemovePayment}
                  onEdit={setEditingPayment}
                  onReceipt={sendReceipt}
                />
              </>
            )}

            {previous.length > 0 && (
              <>
                <Divider />
                <PastRentersSection rentals={previous} onOpen={openCustomer} />
              </>
            )}

            {(about.rows.length > 0 || !!about.note) && (
              <>
                <Divider />
                <SectionTitle>{about.title}</SectionTitle>
                {about.rows.length > 0 && <InfoRows rows={about.rows} />}
                {!!about.note && <Text style={styles.note}>{about.note}</Text>}
              </>
            )}

            <Divider flush />
            {listActions(piano).map((action) => (
              <ActionRow
                key={action}
                action={action}
                onPress={() => run(action)}
              />
            ))}
          </View>
        </ScrollView>
      </ScreenEntrance>

      <ScreenEntrance mode="rise">
        <StickyActionBar
          info={barInfo(piano)}
          label={ACTION_LABELS[primary]}
          variant={primary === "undoSale" ? "secondary" : "primary"}
          onPress={() => run(primary)}
        />
      </ScreenEntrance>

      <PianoActionsSheet
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        actions={menuActions(piano)}
        onSelect={chooseFromMenu}
      />
      <MarkAsSoldSheet
        piano={piano}
        visible={showSoldSheet}
        onClose={() => setShowSoldSheet(false)}
      />
      <ExtendRentalSheet
        piano={piano}
        visible={showExtendSheet}
        onClose={() => setShowExtendSheet(false)}
      />
      {rentable && (
        <EditPaymentSheet
          payment={editingPayment}
          piano={piano}
          onClose={() => setEditingPayment(null)}
          onSave={rentPayments.update}
        />
      )}
      {rentable && (
        <RecordPaymentSheet
          piano={piano}
          visible={showPaymentSheet}
          onClose={() => setShowPaymentSheet(false)}
          onSave={(payment) =>
            rentPayments.add(payment, { onReceipt: sendReceipt })
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  grow: { flex: 1 },
  scroll: { paddingBottom: 24 },
  // Rises over the bottom of the photo, with rounded top corners
  sheet: {
    marginTop: -24,
    paddingTop: 24,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.white,
  },
  title: { ...type.pianoTitle, color: colors.ink },
  meta: { ...type.secondary, marginTop: 2, color: colors.ink2 },
  status: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  price: {
    ...type.largeTitle,
    marginTop: 14,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
  note: { ...type.body, marginTop: 12, color: colors.ink },
  missing: { alignItems: "center", justifyContent: "center" },
  missingTitle: { ...type.rowTitle, fontSize: 18, color: colors.ink },
  missingButton: { marginTop: 16, width: 128 },
});

export default DetailScreen;
