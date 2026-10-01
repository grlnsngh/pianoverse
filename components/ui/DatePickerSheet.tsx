import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { fonts, spacing } from "@/constants/theme";
import Button from "./Button";
import Icon from "./Icon";
import Sheet from "./Sheet";
import { makeStyles, useColors } from "@/lib/ThemeContext";

const DAY = 44;
const ROW = 46;
// The week starts on Monday, as on the DatePicker board
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type DatePickerSheetProps = {
  visible: boolean;
  /** Names what is being picked: "Paid on", "Sold on", "Purchased" */
  title: string;
  /** The day shown as chosen, and the month shown first, each time it opens */
  value: Date;
  /** Days before this can't be chosen */
  minimumDate?: Date;
  /** Days after this can't be chosen */
  maximumDate?: Date;
  /** Done: the chosen day */
  onSelect: (date: Date) => void;
  /** Cancel, the dim or the back button: nothing changes */
  onClose: () => void;
};

/**
 * A month calendar in a white sheet (DatePicker board): the month's name with
 * Previous and Next, the days of the week, and the days as 44 px circles. The
 * chosen day is solid ink, today has an orange ring, and days that can't be
 * chosen are grey. Nothing changes until Done.
 */
const DatePickerSheet = ({
  visible,
  title,
  value,
  minimumDate,
  maximumDate,
  onSelect,
  onClose,
}: DatePickerSheetProps) => {
  const colors = useColors();
  const styles = useStyles();
  const [picked, setPicked] = useState(startOfDay(value));
  const [month, setMonth] = useState(startOfMonth(value));

  // Start from the current value each time it opens
  useEffect(() => {
    if (!visible) return;
    setPicked(startOfDay(value));
    setMonth(startOfMonth(value));
  }, [visible, value]);

  const today = startOfDay(new Date());
  const min = minimumDate ? startOfDay(minimumDate) : null;
  const max = maximumDate ? startOfDay(maximumDate) : null;
  const canChoose = (day: Date) => !(min && isBefore(day, min)) && !(max && isAfter(day, max));

  const canGoBack = !min || !isBefore(addDays(month, -1), min);
  const canGoForward = !max || !isAfter(addDays(endOfMonth(month), 1), max);

  // Blank cells before the 1st (Monday first), then the days, then blanks to end the last row
  const leading = (getDay(month) + 6) % 7;
  const daysInMonth = endOfMonth(month).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(month, i)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      tone="white"
      footer={
        <Button
          title="Done"
          onPress={() => {
            onSelect(picked);
            onClose();
          }}
        />
      }
    >
      <View>
        <View style={styles.monthRow}>
          <Text style={styles.month} accessibilityRole="header">
            {format(month, "MMMM yyyy")}
          </Text>
          <View style={styles.nav}>
            <Pressable
              onPress={() => setMonth(addMonths(month, -1))}
              disabled={!canGoBack}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              style={[styles.navButton, !canGoBack && styles.dim]}
            >
              <Icon name="chevronLeft" size={22} color={colors.ink} strokeWidth={2.2} />
            </Pressable>
            <Pressable
              onPress={() => setMonth(addMonths(month, 1))}
              disabled={!canGoForward}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              style={[styles.navButton, !canGoForward && styles.dim]}
            >
              <Icon name="chevronRight" size={22} color={colors.ink} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        <View style={styles.week}>
          {WEEKDAYS.map((name) => (
            <View key={name} style={styles.weekCell}>
              <Text style={styles.weekday}>{name}</Text>
            </View>
          ))}
        </View>

        {rows.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((day, c) => {
              if (!day) return <View key={c} style={styles.cell} />;
              const selected = isSameDay(day, picked);
              const isToday = isSameDay(day, today);
              const allowed = canChoose(day);
              return (
                <View key={c} style={styles.cell}>
                  <Pressable
                    onPress={() => setPicked(day)}
                    disabled={!allowed}
                    accessibilityRole="button"
                    accessibilityLabel={format(day, "EEEE d MMMM yyyy")}
                    accessibilityState={{ selected, disabled: !allowed }}
                    style={[
                      styles.day,
                      selected && styles.selected,
                      !selected && isToday && styles.today,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        selected && styles.selectedText,
                        !selected && isToday && styles.todayText,
                        !allowed && styles.disabledText,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </Sheet>
  );
};

const useStyles = makeStyles((colors) => ({
  monthRow: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  month: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.18,
    color: colors.ink,
  },
  nav: { flexDirection: "row" },
  navButton: { width: DAY, height: DAY, alignItems: "center", justifyContent: "center" },
  dim: { opacity: 0.3 },
  week: { flexDirection: "row", marginTop: spacing.xs },
  weekCell: { flex: 1, height: 32, alignItems: "center", justifyContent: "center" },
  weekday: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink2 },
  row: { flexDirection: "row", marginTop: spacing.xs },
  cell: { flex: 1, height: ROW, alignItems: "center", justifyContent: "center" },
  day: {
    width: DAY,
    height: DAY,
    borderRadius: DAY / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  selected: { backgroundColor: colors.ink },
  today: { borderWidth: 2, borderColor: colors.brand },
  dayText: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  selectedText: { fontFamily: fonts.bold, color: colors.onInk },
  todayText: { fontFamily: fonts.bold },
  disabledText: { color: colors.disabledText },
}));

export default DatePickerSheet;
