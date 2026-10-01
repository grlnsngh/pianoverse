import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Icon } from "@/components/ui";
import { colors, fonts, spacing } from "@/constants/theme";
import { PianoItem } from "@/redux/pianos/types";
import { callNumber, messageOnWhatsApp } from "@/utils/contact";
import { initialsOf, rentalPeriod, rentalRows } from "@/utils/pianoDetail";
import { balanceLine, type RentBalance } from "@/utils/rentDue";
import { InfoRows, SectionTitle, toneColor } from "./DetailParts";

const AVATAR = 48;
const BUTTON = 44;
const BAR = 8;
// The two dates never squeeze narrower than this, whatever share of the bar they sit under
const MIN_DATE_WIDTH = 110;

/**
 * A rented piano's Rental section: who has it (with buttons to call or message
 * them, and one to remind them when the rental is ending), a bar showing how much of the rental has passed, the start and end
 * dates, and the rent and address.
 */
const RentalSection = ({
  piano,
  balance,
  onRemind,
}: {
  piano: PianoItem;
  /** What the renter owes, when it can be worked out: shows "₹8,000 due · 2 months, since 1 Aug" or "Rent is paid up" */
  balance?: RentBalance | null;
  /** Given when the rental has ended or is about to, or rent is due: shows the Send reminder button */
  onRemind?: () => void;
}) => {
  const name = piano.rental_customer_name?.trim() || "";
  const mobile = piano.rental_customer_mobile?.trim() || "";
  const period = rentalPeriod(piano);
  const rows = rentalRows(piano);
  const initials = initialsOf(name);
  const bar = period.bar;

  return (
    <View>
      <SectionTitle>Rental</SectionTitle>

      {(name || mobile) && (
        <View style={styles.customer}>
          <View style={styles.who}>
            <View style={styles.avatar}>
              {initials ? (
                <Text style={styles.initials}>{initials}</Text>
              ) : (
                <Icon name="tabAccount" size={22} color={colors.ink} strokeWidth={1.75} />
              )}
            </View>
            <View style={styles.names}>
              {!!name && (
                <Text style={styles.name} numberOfLines={1}>
                  {name}
                </Text>
              )}
              {!!mobile && <Text style={styles.mobile}>{mobile}</Text>}
            </View>
          </View>

          {!!mobile && (
            <View style={styles.buttons}>
              <Pressable
                onPress={() => callNumber(mobile)}
                accessibilityRole="button"
                accessibilityLabel={`Call ${name || mobile}`}
                style={({ pressed }) => [styles.contact, pressed && styles.pressed]}
              >
                <Icon name="phone" size={20} color={colors.ink} strokeWidth={1.8} />
              </Pressable>
              <Pressable
                onPress={() => messageOnWhatsApp(mobile)}
                accessibilityRole="button"
                accessibilityLabel="Message on WhatsApp"
                style={({ pressed }) => [styles.contact, pressed && styles.pressed]}
              >
                <Icon name="message" size={20} color={colors.ink} strokeWidth={1.8} />
              </Pressable>
            </View>
          )}
        </View>
      )}

      {balance && (
        <Text style={[styles.balance, balance.due > 0 && styles.balanceDue]}>
          {balanceLine(balance)}
        </Text>
      )}

      {onRemind && (
        <Button
          title="Send reminder"
          variant="outline"
          size="compact"
          onPress={onRemind}
          style={styles.remind}
        />
      )}

      {bar && (
        <View style={styles.bar} accessible accessibilityLabel={period.endCaption?.text}>
          {bar.done > 0 && (
            <View
              testID="rental-bar-done"
              style={[
                styles.segment,
                { flex: bar.done, backgroundColor: colors.ink },
                styles.leftEnd,
                bar.rest === 0 && styles.rightEnd,
              ]}
            />
          )}
          {bar.rest > 0 && (
            <View
              testID="rental-bar-rest"
              style={[
                styles.segment,
                { flex: bar.rest, backgroundColor: bar.overdue ? colors.late : colors.hairline },
                styles.rightEnd,
                bar.done === 0 && styles.leftEnd,
              ]}
            />
          )}
        </View>
      )}

      {(period.start || period.end) && (
        <View style={styles.dates}>
          {!!period.start && (
            <View style={[styles.date, bar ? { flexGrow: Math.max(bar.done, 1) } : styles.evenDate]}>
              <Text style={styles.dateText}>{period.start}</Text>
              <Text style={styles.caption}>Started</Text>
            </View>
          )}
          {!!period.end && (
            <View style={[styles.date, bar ? { flexGrow: Math.max(bar.rest, 1) } : styles.evenDate]}>
              <Text style={styles.dateText}>{period.end}</Text>
              {period.endCaption && (
                <Text style={[styles.caption, { color: toneColor(period.endCaption.tone) }]}>
                  {period.endCaption.text}
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      {rows.length > 0 && (
        <View style={styles.rows}>
          <InfoRows rows={rows} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  customer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  who: { flexDirection: "row", alignItems: "center", gap: 14, flexShrink: 1, minWidth: 0 },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.fill,
  },
  initials: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  names: { flexShrink: 1, minWidth: 0 },
  name: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink },
  mobile: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink2,
    fontVariant: ["tabular-nums"],
  },
  buttons: { flexDirection: "row", gap: spacing.sm },
  contact: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  pressed: { backgroundColor: colors.grouped },
  balance: {
    marginTop: spacing.lg,
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.ink2,
    fontVariant: ["tabular-nums"],
  },
  balanceDue: { color: colors.late },
  remind: { marginTop: spacing.lg },
  bar: { flexDirection: "row", gap: 3, height: BAR, marginTop: spacing.xxl },
  segment: { height: BAR },
  leftEnd: { borderTopLeftRadius: BAR / 2, borderBottomLeftRadius: BAR / 2 },
  rightEnd: { borderTopRightRadius: BAR / 2, borderBottomRightRadius: BAR / 2 },
  dates: { flexDirection: "row", marginTop: 10 },
  date: { flexBasis: 0, minWidth: MIN_DATE_WIDTH },
  evenDate: { flexGrow: 1 },
  dateText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.ink },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  rows: { marginTop: spacing.md - spacing.sm },
});

export default RentalSection;
