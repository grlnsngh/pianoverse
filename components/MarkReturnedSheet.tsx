import React, { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { format, isToday, startOfToday } from "date-fns";
import PriceRow from "@/components/PriceRow";
import { Button, DatePickerSheet, FormRow, Group, Sheet, Switch } from "@/components/ui";
import { fonts, type } from "@/constants/theme";
import useReturnPiano from "@/lib/useReturnPiano";
import useTextScale from "@/lib/useTextScale";
import { PianoItem } from "@/redux/pianos/types";
import { parseStoredDate } from "@/utils/dates";
import { depositAmount, heldDeposit, settleDeposit } from "@/utils/deposits";
import { formatRupees } from "@/utils/money";
import type { RentBalance } from "@/utils/rentDue";
import { makeStyles } from "@/lib/ThemeContext";

interface MarkReturnedSheetProps {
  piano: PianoItem;
  visible: boolean;
  onClose: () => void;
  /** What the renter still owes, when it is known, so the person is told before it stops showing */
  owing?: RentBalance | null;
}

/** "Today, 29 Sep 2026", or "21 Sep 2026" for another day. */
const dayLabel = (date: Date) =>
  `${isToday(date) ? "Today, " : ""}${format(date, "d MMM yyyy")}`;

/**
 * Marks a rented piano as returned: the day it came back (today unless the
 * person says otherwise, never in the future or before the rental started), and
 * one button. The rental is kept in the piano's history and the piano goes back
 * into stock. If the renter still owes rent, the sheet says so, since that no
 * longer shows in Rent due once the piano is returned.
 *
 * When a deposit is held, the sheet settles it by the owner's own clause (DepReturn
 * board): the deposit, what is kept for unpaid rent (on, by default, when rent is
 * owed; it is also recorded as a rent payment from the deposit), the damage
 * charges typed in, and the refund that is left, which can be changed when
 * something else was agreed.
 */
const MarkReturnedSheet: React.FC<MarkReturnedSheetProps> = ({
  piano,
  visible,
  onClose,
  owing = null,
}) => {
  const styles = useStyles();
  const { large } = useTextScale();
  const returnPiano = useReturnPiano();
  const [returnedOn, setReturnedOn] = useState(startOfToday());
  const [choosingDay, setChoosingDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keepRent, setKeepRent] = useState(true);
  const [damage, setDamage] = useState(0);
  // A refund the person typed; null while it follows the sums
  const [refundTyped, setRefundTyped] = useState<number | null>(null);

  // Start afresh each time: it came back today, the rent owed is kept, nothing is damaged
  useEffect(() => {
    if (!visible) return;
    setReturnedOn(startOfToday());
    setChoosingDay(false);
    setKeepRent(true);
    setDamage(0);
    setRefundTyped(null);
  }, [visible]);

  const customer = piano.rental_customer_name?.trim() || "";
  const start = parseStoredDate(piano.rental_period_start);
  // A rental can't come back before it started (one that starts later can be taken back today)
  const earliest = start && start <= startOfToday() ? start : undefined;
  const owes = owing && owing.due > 0 ? owing : null;

  const held = heldDeposit(piano) ? depositAmount(piano) : 0;
  const settlement = useMemo(
    () =>
      held > 0
        ? settleDeposit({ held, rentOwed: owes?.due ?? 0, keepRent, damage, refund: refundTyped })
        : null,
    [held, owes?.due, keepRent, damage, refundTyped]
  );
  // What would be kept out of the deposit for the rent, as the sums stand
  const rentKept = owes && settlement ? Math.min(owes.due, held) : 0;

  const handleSave = async () => {
    setSaving(true);
    const saved = await returnPiano(piano, returnedOn, settlement);
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Mark as returned"
      footer={
        <Button
          title="Mark as returned"
          loadingTitle="Saving"
          loading={saving}
          onPress={handleSave}
        />
      }
    >
      <Text style={styles.subject}>{[customer, piano.title].filter(Boolean).join(" · ")}</Text>

      <Group inSheet style={styles.group}>
        <FormRow
          label="Returned on"
          value={dayLabel(returnedOn)}
          onPress={() => setChoosingDay(true)}
          chevron={false}
        />
      </Group>

      {settlement && (
        <>
          <Text style={styles.groupTitle} accessibilityRole="header">
            Deposit
          </Text>
          <Group inSheet>
            <FormRow label="Held" value={formatRupees(held)} />
            {owes && (
              <View style={[styles.keep, large && styles.keepStacked]}>
                <View style={styles.keepText}>
                  <Text style={styles.keepLabel}>Keep for unpaid rent</Text>
                  <Text style={styles.keepHint}>{`${customer || "The renter"} owes ${formatRupees(owes.due)} of rent`}</Text>
                </View>
                <View style={styles.keepRight}>
                  <Text style={styles.keepAmount}>{formatRupees(rentKept)}</Text>
                  <Switch
                    value={keepRent}
                    onValueChange={(value) => {
                      setKeepRent(value);
                      setRefundTyped(null);
                    }}
                    accessibilityLabel="Keep for unpaid rent"
                  />
                </View>
              </View>
            )}
            <PriceRow
              label="Damage charges"
              placeholder="Optional"
              value={damage}
              onChangeValue={(value) => {
                setDamage(value);
                setRefundTyped(null);
              }}
            />
            <PriceRow label="Refund" value={settlement.refund} onChangeValue={setRefundTyped} />
          </Group>
          <Text style={styles.note}>
            The refund is what you hand back: the deposit less what you keep. Change it if you agreed something else.
          </Text>
          {settlement.forRent > 0 && (
            <Text style={styles.note}>
              {`The ${formatRupees(settlement.forRent)} kept for rent is recorded as a rent payment from the deposit.`}
            </Text>
          )}
          {settlement.forDamage > 0 && (
            <Text style={styles.note}>
              {`The ${formatRupees(settlement.forDamage)} kept for damage is saved with the rental. It isn’t counted as income.`}
            </Text>
          )}
        </>
      )}

      <Text style={styles.note}>
        The rental is saved in the piano’s history, and the piano goes back into stock.
      </Text>
      {owes && !settlement && (
        <Text style={[styles.note, styles.owes]}>
          {`${customer || "The renter"} still owes ${formatRupees(owes.due)} of rent. Once the piano is returned it no longer shows in Rent due.`}
        </Text>
      )}
      {owes && settlement && !keepRent && (
        <Text style={[styles.note, styles.owes]}>
          {`${customer || "The renter"} still owes ${formatRupees(owes.due)} of rent. Once the piano is returned it no longer shows in Rent due.`}
        </Text>
      )}
      <View style={styles.bottom} />

      <DatePickerSheet
        visible={choosingDay}
        title="Returned on"
        value={returnedOn}
        minimumDate={earliest}
        maximumDate={new Date()}
        onSelect={setReturnedOn}
        onClose={() => setChoosingDay(false)}
      />
    </Sheet>
  );
};

const useStyles = makeStyles((colors) => ({
  subject: { ...type.secondary, textAlign: "center", color: colors.ink2 },
  group: { marginTop: 20 },
  groupTitle: { ...type.status, marginTop: 16, marginLeft: 16, marginBottom: 8, color: colors.ink2 },
  keep: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  // A big Font size puts the amount and the switch under the words
  keepStacked: { flexDirection: "column", alignItems: "flex-start" },
  keepText: { flexShrink: 1, minWidth: 0 },
  keepLabel: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.ink2 },
  keepHint: { ...type.caption, fontFamily: fonts.regular, color: colors.ink2 },
  keepRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  keepAmount: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.ink, fontVariant: ["tabular-nums"] },
  note: {
    ...type.caption,
    marginTop: 12,
    marginHorizontal: 16,
    fontFamily: type.secondary.fontFamily,
    color: colors.ink2,
  },
  owes: { color: colors.late },
  bottom: { height: 8 },
}));

export default MarkReturnedSheet;
