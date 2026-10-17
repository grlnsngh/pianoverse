import React, { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { format, isToday } from "date-fns";
import { useDispatch } from "react-redux";
import { AmountInput, Button, DatePickerSheet, FormRow, Group, Sheet } from "@/components/ui";
import { COLUMN_LIMITS } from "@/constants/columnLimits";
import { fonts, maxScale, radii, type } from "@/constants/theme";
import { deleteRentalHistoryEntry } from "@/lib/appwrite";
import saveOldRental from "@/lib/saveOldRental";
import useUpdatePiano from "@/lib/useUpdatePiano";
import { paymentsChanged } from "@/redux/payments/actions";
import { PianoItem } from "@/redux/pianos/types";
import { toStoredDate } from "@/utils/dates";
import { depositAmount, heldDeposit } from "@/utils/deposits";
import { formatRupees } from "@/utils/money";
import { rentalSoldWithDeposit } from "@/utils/rentalHistory";
import { restoredDeposit } from "@/utils/returnPiano";
import { profitIfSold, type PianoMoney } from "@/utils/pianoMoney";
import { makeStyles } from "@/lib/ThemeContext";

interface MarkAsSoldSheetProps {
  piano: PianoItem;
  /** The piano's money, for the profit the sale would make; none while it loads */
  money?: PianoMoney | null;
  visible: boolean;
  onClose: () => void;
}

/** "Today, 29 Sep 2026", or "21 Sep 2026" for another day. */
const dayLabel = (date: Date) =>
  `${isToday(date) ? "Today, " : ""}${format(date, "d MMM yyyy")}`;

/**
 * Records that a piano was sold (MarkSold and MarkSoldProfit boards): the
 * price big and centred, suggesting the asking price of a piano on sale, then
 * the day, the buyer and an optional address, what the piano will have made
 * as the price is typed, and one orange button.
 */
const MarkAsSoldSheet: React.FC<MarkAsSoldSheetProps> = ({
  piano,
  money = null,
  visible,
  onClose,
}) => {
  const styles = useStyles();
  const dispatch = useDispatch();
  const updatePiano = useUpdatePiano();
  const [buyerName, setBuyerName] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [price, setPrice] = useState(0);
  const [saleDate, setSaleDate] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [choosingDay, setChoosingDay] = useState(false);

  // Start afresh each time, suggesting the asking price of a piano on sale
  useEffect(() => {
    if (!visible) return;
    setBuyerName("");
    setBuyerAddress("");
    setPrice(piano.on_sale_price ?? 0);
    setSaleDate(new Date());
    setChoosingDay(false);
  }, [visible]);

  // What is held for the rental that is on the piano, when it is sold with it still there
  const holding = heldDeposit(piano) ? depositAmount(piano) : 0;

  const handleSave = async () => {
    if (!buyerName.trim()) {
      Alert.alert("Missing Details", "Please enter the buyer's name.");
      return;
    }
    if (price <= 0) {
      Alert.alert("Missing Details", "Please enter the sale price.");
      return;
    }

    setSaving(true);
    // A deposit still held for the rental is kept in its history, not settled, and comes off the piano
    const entry = holding > 0 ? rentalSoldWithDeposit(piano, saleDate) : null;
    let keptId: string | null = null;
    const saved = await updatePiano(
      piano,
      {
        sold_to_name: buyerName.trim(),
        sold_to_address: buyerAddress.trim() || null,
        sold_price: price,
        sold_date: toStoredDate(saleDate),
        ...(entry ? { rental_deposit: null, deposit_received_on: null } : {}),
      },
      `Marked ${piano.title} as sold`,
      {
        undo: {
          fields: {
            sold_date: null,
            sold_price: null,
            sold_to_name: null,
            sold_to_address: null,
            ...(entry ? restoredDeposit(piano) : {}),
          },
          message: `${piano.title} is back in stock`,
        },
        onUndo: async () => {
          if (!keptId) return;
          await deleteRentalHistoryEntry(keptId).catch((error) =>
            console.warn("Could not take back the kept rental:", error)
          );
          keptId = null;
          dispatch(paymentsChanged() as any);
        },
      }
    );
    if (saved && entry) {
      await saveOldRental(entry, (kept) => {
        keptId = kept.$id;
        // The screens that show history load it again
        dispatch(paymentsChanged() as any);
      });
    }
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Mark as sold"
      footer={
        <Button title="Confirm sale" loadingTitle="Saving" loading={saving} onPress={handleSave} />
      }
    >
      <Text style={styles.subject}>{`Sale price for ${piano.title}`}</Text>

      <AmountInput value={price} onChangeValue={setPrice} label="Sale price" width={210} />

      <Group inSheet style={styles.group}>
        <FormRow
          label="Sold on"
          value={dayLabel(saleDate)}
          onPress={() => setChoosingDay(true)}
          chevron={false}
        />
        <FormRow
          label="Buyer"
          placeholder="Who bought it?"
          input={{
            value: buyerName,
            onChangeText: setBuyerName,
            autoCapitalize: "words",
            maxLength: COLUMN_LIMITS.pianos.sold_to_name,
            returnKeyType: "next",
          }}
        />
        <FormRow
          label="Address"
          placeholder="Optional"
          input={{
            value: buyerAddress,
            onChangeText: setBuyerAddress,
            autoCapitalize: "sentences",
            maxLength: COLUMN_LIMITS.pianos.sold_to_address,
            returnKeyType: "done",
          }}
        />
      </Group>

      {money && <SaleProfit money={money} price={price} />}

      {holding > 0 && (
        <Text style={styles.note}>
          {`The ${formatRupees(holding)} deposit is kept in ${
            piano.rental_customer_name?.trim() ? `${piano.rental_customer_name.trim()}’s` : "the"
          } rental history as not settled. Settle it there with Edit rental.`}
        </Text>
      )}
      <Text style={styles.note}>
        The piano leaves your stock and is marked Sold. You can undo this later from its page.
      </Text>
      <View style={styles.bottom} />

      <DatePickerSheet
        visible={choosingDay}
        title="Sold on"
        value={saleDate}
        maximumDate={new Date()}
        onSelect={setSaleDate}
        onClose={() => setChoosingDay(false)}
      />
    </Sheet>
  );
};

/** What the piano will have made once sold for `price`: the sale and its rent, less what it was bought for and its service. */
const SaleProfit = ({ money, price }: { money: PianoMoney; price: number }) => {
  const styles = useStyles();
  const profit = profitIfSold(money, price);
  if (profit === null) {
    return (
      <Text style={styles.profitAsk}>
        Add what you paid for it (Bought for, on its Edit page) to see the profit on this piano.
      </Text>
    );
  }
  const loss = profit < 0;
  const lines = [
    { label: "Sale", value: formatRupees(Math.max(0, price)) },
    ...(money.rent > 0 ? [{ label: "Rent received", value: formatRupees(money.rent) }] : []),
    { label: "Bought for", value: `−${formatRupees(money.bought ?? 0)}` },
    ...(money.service > 0 ? [{ label: "Service", value: `−${formatRupees(money.service)}` }] : []),
  ];
  return (
    <View
      style={styles.profit}
      accessible
      accessibilityLabel={`${loss ? "Loss" : "Profit"} on this piano, ${formatRupees(Math.abs(profit))}. ${lines
        .map((line) => `${line.label} ${line.value}`)
        .join(", ")}`}
    >
      <Text style={styles.profitLabel}>{loss ? "Loss on this piano" : "Profit on this piano"}</Text>
      <Text style={[styles.profitAmount, loss && styles.profitLoss]} maxFontSizeMultiplier={maxScale.title}>
        {formatRupees(Math.abs(profit))}
      </Text>
      <View style={styles.profitLines}>
        {lines.map((line) => (
          <View key={line.label} style={styles.profitLine}>
            <Text style={styles.profitText}>{line.label}</Text>
            <Text style={[styles.profitText, styles.profitValue]}>{line.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  subject: { ...type.secondary, textAlign: "center", color: colors.ink2 },
  group: { marginTop: 20 },
  profit: { marginTop: 12, padding: 16, borderRadius: radii.card, backgroundColor: colors.surface },
  profitLabel: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.ink2 },
  profitAmount: { ...type.pianoTitle, marginTop: 2, color: colors.ink, fontVariant: ["tabular-nums"] },
  profitLoss: { color: colors.late },
  profitLines: { marginTop: 8, gap: 2 },
  // The amount stays at the right; with a big Font size a long label wraps under it
  profitLine: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", columnGap: 12 },
  profitText: { ...type.secondary, color: colors.inkBody },
  profitValue: { fontVariant: ["tabular-nums"] },
  profitAsk: { ...type.caption, marginTop: 12, marginHorizontal: 16, fontFamily: fonts.regular, color: colors.ink2 },
  note: { ...type.caption, marginTop: 12, marginHorizontal: 16, fontFamily: type.secondary.fontFamily, color: colors.ink2 },
  bottom: { height: 8 },
}));

export default MarkAsSoldSheet;
