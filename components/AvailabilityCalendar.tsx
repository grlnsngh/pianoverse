import React from "react";
import { Pressable, Text, View } from "react-native";
import { addMonths, format, isSameDay, startOfDay } from "date-fns";
import { Icon } from "@/components/ui";
import { fonts, maxScale, radii, spacing } from "@/constants/theme";
import { makeStyles, useColors } from "@/lib/ThemeContext";
import { monthRows } from "@/utils/monthGrid";

const NAV = 44;
const DAY = 40;
const ROW = 44;
// The week starts on Monday, as in the date picker
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export type AvailabilityCalendarProps = {
  /** Any day in the month shown */
  month: Date;
  /** The day whose pianos are listed under the calendar */
  selected: Date;
  /** The day numbers of `month` on which a rental ends: each has an orange dot */
  endDays: ReadonlySet<number>;
  onSelect: (day: Date) => void;
  onMonthChange: (month: Date) => void;
};

/**
 * The month on the Availability screen (AvailDay board): the month's name with
 * Previous and Next, the weekdays, and the days as circles in a grey card. The
 * chosen day is solid ink, today has an orange ring, and a day on which a rental
 * ends has an orange dot under it. A line under the month says what the dot is.
 * The days share the width, so on a narrow screen or at a big Font size they
 * only get a little smaller; each cell is at least 44 high.
 */
const AvailabilityCalendar = ({ month, selected, endDays, onSelect, onMonthChange }: AvailabilityCalendarProps) => {
  const colors = useColors();
  const styles = useStyles();
  const today = startOfDay(new Date());
  const rows = monthRows(month);

  return (
    <View style={styles.card}>
      <View style={styles.monthRow}>
        <Text style={styles.month} accessibilityRole="header">
          {format(month, "MMMM yyyy")}
        </Text>
        <View style={styles.nav}>
          <Pressable
            onPress={() => onMonthChange(addMonths(month, -1))}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            style={styles.navButton}
          >
            <Icon name="chevronLeft" size={20} color={colors.ink} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            onPress={() => onMonthChange(addMonths(month, 1))}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            style={styles.navButton}
          >
            <Icon name="chevronRight" size={20} color={colors.ink} strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      <View style={styles.week} accessible={false} importantForAccessibility="no-hide-descendants">
        {WEEKDAYS.map((letter, i) => (
          <View key={WEEKDAY_NAMES[i]} style={styles.weekCell}>
            <Text style={styles.weekday} maxFontSizeMultiplier={maxScale.count}>
              {letter}
            </Text>
          </View>
        ))}
      </View>

      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((day, c) => {
            if (!day) return <View key={c} style={styles.cell} />;
            const chosen = isSameDay(day, selected);
            const isToday = isSameDay(day, today);
            const ends = endDays.has(day.getDate());
            return (
              <Pressable
                key={c}
                onPress={() => onSelect(day)}
                accessibilityRole="button"
                accessibilityLabel={`${format(day, "EEEE d MMMM")}${ends ? ", a rental ends" : ""}`}
                accessibilityState={{ selected: chosen }}
                style={styles.cell}
              >
                <View style={[styles.day, chosen && styles.chosen, !chosen && isToday && styles.today]}>
                  {/* The day sits in a circle of its own size, so a big Font size may only grow it a little (like the weekdays) */}
                  <Text
                    style={[styles.dayText, chosen && styles.chosenText, !chosen && isToday && styles.todayText]}
                    maxFontSizeMultiplier={maxScale.count}
                  >
                    {day.getDate()}
                  </Text>
                </View>
                {ends && !chosen && <View testID="ends-dot" style={styles.dot} />}
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={styles.legend}>
        <View style={styles.legendDot} />
        <Text style={styles.legendText}>A rental ends that day</Text>
      </View>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  card: {
    marginHorizontal: spacing.screen,
    marginTop: spacing.lg,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.grouped,
  },
  monthRow: {
    minHeight: NAV,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingLeft: spacing.md,
  },
  month: {
    // Wraps rather than push the arrows off the card
    flexShrink: 1,
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.ink,
  },
  nav: { flexDirection: "row" },
  navButton: { width: NAV, height: NAV, alignItems: "center", justifyContent: "center" },
  week: { flexDirection: "row", marginTop: spacing.xs },
  weekCell: { flex: 1, minHeight: 20, alignItems: "center", justifyContent: "center" },
  weekday: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.ink2 },
  row: { flexDirection: "row", marginTop: 2 },
  cell: { flex: 1, minHeight: ROW, alignItems: "center", justifyContent: "center" },
  day: {
    width: DAY,
    height: DAY,
    borderRadius: DAY / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  chosen: { backgroundColor: colors.ink },
  today: { borderWidth: 2, borderColor: colors.brand },
  dayText: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink, fontVariant: ["tabular-nums"] },
  chosenText: { fontFamily: fonts.bold, color: colors.onInk },
  todayText: { fontFamily: fonts.bold },
  dot: {
    position: "absolute",
    bottom: 1,
    alignSelf: "center",
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.brand,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  legendDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.brand },
  legendText: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink2 },
}));

export default React.memo(AvailabilityCalendar);
