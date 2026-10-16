import { format } from "date-fns";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { InfoRows, SectionTitle } from "@/components/DetailParts";
import { Button, Icon, Spinner } from "@/components/ui";
import { fonts, radii, spacing, type } from "@/constants/theme";
import useTextScale from "@/lib/useTextScale";
import type { DetailRow } from "@/utils/pianoDetail";
import { formatRupees } from "@/utils/money";
import type { PianoMoney } from "@/utils/pianoMoney";
import { makeStyles, useColors } from "@/lib/ThemeContext";

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The rows under the three numbers: what came in, what it cost, and the difference. */
export const moneyRows = (money: PianoMoney, sold: boolean): DetailRow[] => {
  const rows: DetailRow[] = [];
  if (money.rentCount > 0) {
    rows.push({ label: `Rent received · ${count(money.rentCount, "payment", "payments")}`, value: formatRupees(money.rent) });
  }
  if (money.sale > 0) rows.push({ label: "Sold for", value: formatRupees(money.sale) });
  if (money.bought !== null) rows.push({ label: "Bought for", value: `−${formatRupees(money.bought)}` });
  if (money.serviceCount > 0) {
    rows.push({ label: `Service · ${count(money.serviceCount, "entry", "entries")}`, value: `−${formatRupees(money.service)}` });
  }
  if (money.profit !== null) {
    const loss = money.profit < 0;
    rows.push({
      label: `${loss ? "Loss" : "Profit"}${sold ? "" : " so far"}`,
      value: formatRupees(Math.abs(money.profit)),
      strong: true,
    });
  }
  return rows;
};

export type PianoMoneySectionProps = {
  money: PianoMoney | null;
  status: "loading" | "ready" | "error";
  sold: boolean;
  onRetry: () => void;
  /** Opens the piano's Edit screen, where Bought for is */
  onAddPrice: () => void;
};

/**
 * A piano's Money section (PianoMoney and MoneyNoPrice boards): what it
 * earned (its rent, and its sale once sold), what it cost (what it was bought
 * for and its services) and the profit, with the working underneath. Until
 * Bought for is filled in there is no profit, and the section asks for it.
 */
const PianoMoneySection = ({ money, status, sold, onRetry, onAddPrice }: PianoMoneySectionProps) => {
  const colors = useColors();
  const styles = useStyles();
  const { large } = useTextScale();
  const loss = !!money && money.profit !== null && money.profit < 0;

  const stat = (label: string, value: string, tone?: "profit" | "loss") => (
    <View
      key={label}
      style={[styles.stat, large && styles.statStacked]}
      accessible
      accessibilityLabel={`${label}, ${value}`}
    >
      <Text style={[styles.statValue, tone && styles.statStrong, tone === "loss" && styles.loss]}>{value}</Text>
      <Text style={[styles.statLabel, tone === "profit" && styles.statLabelProfit, tone === "loss" && styles.loss]}>
        {label}
      </Text>
    </View>
  );

  return (
    <View>
      <View style={styles.header}>
        <SectionTitle>Money</SectionTitle>
        {money?.since && <Text style={styles.since}>{`Since ${format(money.since, "d MMM yyyy")}`}</Text>}
      </View>

      {status === "loading" && (
        <View style={styles.centered}>
          <Spinner size={24} accessibilityLabel="Loading money" />
        </View>
      )}

      {status === "error" && (
        <View style={styles.centered}>
          <Text style={styles.quiet}>Couldn’t load this piano’s money</Text>
          <Button title="Retry" variant="text" size="compact" onPress={onRetry} />
        </View>
      )}

      {status === "ready" && money && (
        <>
          <View style={[styles.stats, large && styles.statsStacked]}>
            {stat("Earned", formatRupees(money.earned))}
            {stat("Costs", formatRupees(money.costs))}
            {money.profit !== null &&
              stat(loss ? "Loss" : "Profit", formatRupees(Math.abs(money.profit)), loss ? "loss" : "profit")}
          </View>

          {moneyRows(money, sold).length > 0 && <InfoRows rows={moneyRows(money, sold)} />}

          {money.profit !== null ? (
            <Text style={styles.note}>
              What it brought in (rent, and its sale once sold) minus what you paid for it and its service. Business
              expenses aren’t split between pianos.
            </Text>
          ) : (
            <View style={styles.ask}>
              <Icon name="alert" size={20} color={colors.ink} strokeWidth={1.8} />
              <View style={styles.askTexts}>
                <Text style={styles.askTitle}>Add what you paid for it to see its profit</Text>
                <Text style={styles.askText}>Only for this piano. Leave it empty if you don’t know.</Text>
                <Pressable
                  onPress={onAddPrice}
                  accessibilityRole="button"
                  accessibilityLabel="Add Bought for"
                  style={({ pressed }) => [styles.askButton, pressed && styles.askButtonPressed]}
                >
                  <Text style={styles.askButtonLabel}>Add Bought for</Text>
                </Pressable>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    columnGap: spacing.md,
  },
  since: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.ink2 },
  centered: { alignItems: "center", paddingVertical: spacing.lg, gap: spacing.sm },
  quiet: { ...type.bodyMedium, color: colors.ink2 },
  stats: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radii.card,
    backgroundColor: colors.grouped,
  },
  // With a big Font size three columns would cut the amounts: one line each, the amount at the right
  statsStacked: { flexDirection: "column", gap: spacing.sm },
  stat: { flex: 1, minWidth: 0 },
  statStacked: { flex: 0, flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", columnGap: spacing.md },
  statValue: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, color: colors.ink, fontVariant: ["tabular-nums"] },
  statStrong: { fontFamily: fonts.bold },
  statLabel: { ...type.caption, color: colors.ink2 },
  statLabelProfit: { fontFamily: fonts.semibold, color: colors.brandText },
  loss: { color: colors.late },
  note: { ...type.caption, marginTop: spacing.sm, fontFamily: fonts.regular, color: colors.ink2 },
  ask: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: 16,
    borderRadius: radii.card,
    backgroundColor: colors.grouped,
  },
  askTexts: { flex: 1, minWidth: 0 },
  askTitle: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink },
  askText: { ...type.caption, marginTop: 2, fontFamily: fonts.regular, color: colors.ink2 },
  askButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: "center",
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  askButtonPressed: { backgroundColor: colors.fill },
  askButtonLabel: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink },
}));

export default PianoMoneySection;
