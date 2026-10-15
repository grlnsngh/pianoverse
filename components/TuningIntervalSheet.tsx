import { format } from "date-fns";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Sheet } from "@/components/ui";
import { fonts, radii, spacing, type } from "@/constants/theme";
import { PianoItem } from "@/redux/pianos/types";
import { intervalOf, TUNING_INTERVAL_OPTIONS, type TuningInterval } from "@/utils/serviceLog";
import { makeStyles } from "@/lib/ThemeContext";

export interface TuningIntervalSheetProps {
  piano: PianoItem;
  visible: boolean;
  /** The next tuning with the interval as it is, if one is logged */
  next: Date | null;
  onClose: () => void;
  /** Saves a new interval for this piano */
  onSelect: (months: TuningInterval) => void;
}

/**
 * How often one piano is tuned (TuningInterval board): every 3, 6 or 12
 * months, or no reminders. Choosing one saves it; the next tuning is the last
 * one plus this interval.
 */
const TuningIntervalSheet = ({ piano, visible, next, onClose, onSelect }: TuningIntervalSheetProps) => {
  const styles = useStyles();
  const current = intervalOf(piano);
  return (
    <Sheet visible={visible} onClose={onClose} title="Tuning interval" testID="tuning-interval-sheet">
      <Text style={styles.subject}>How often {piano.title} is tuned</Text>
      <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel="Tuning interval">
        {TUNING_INTERVAL_OPTIONS.map((option, index) => {
          const chosen = option.months === current;
          return (
            <Pressable
              key={option.months}
              onPress={() => onSelect(option.months)}
              accessibilityRole="radio"
              accessibilityState={{ checked: chosen }}
              accessibilityLabel={`${option.label}. ${option.sub}`}
              style={({ pressed }) => [styles.row, index > 0 && styles.divided, pressed && styles.pressed]}
            >
              <View style={[styles.radio, chosen && styles.radioOn]}>{chosen && <View style={styles.dot} />}</View>
              <View style={styles.texts}>
                <Text style={styles.label}>{option.label}</Text>
                <Text style={styles.sub}>{option.sub}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.note}>
        {next && current !== 0
          ? `The next tuning is the last one plus this interval: ${format(next, "d MMM yyyy")}. `
          : "The next tuning is the last one plus this interval. "}
        Repairs, cleaning and moving don’t change it. New pianos start at every 6 months.
      </Text>
      <View style={styles.bottom} />
    </Sheet>
  );
};

const useStyles = makeStyles((colors) => ({
  subject: { ...type.secondary, textAlign: "center", color: colors.ink2 },
  list: { marginTop: 18, borderRadius: radii.card, backgroundColor: colors.surface, overflow: "hidden" },
  row: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 10, paddingHorizontal: 16 },
  divided: { borderTopWidth: 1, borderTopColor: colors.hairline },
  pressed: { backgroundColor: colors.fillPressed },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.chevron,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: colors.ink, backgroundColor: colors.ink },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.onInk },
  texts: { flex: 1, minWidth: 0 },
  label: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  note: { ...type.secondary, marginTop: spacing.lg, paddingHorizontal: 4, color: colors.inkBody },
  bottom: { height: 8 },
}));

export default TuningIntervalSheet;
