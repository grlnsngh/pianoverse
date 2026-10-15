import React from "react";
import { Pressable, Text, View } from "react-native";
import { Icon } from "@/components/ui";
import { fonts, radii } from "@/constants/theme";
import { formatRupees } from "@/utils/money";
import { entryDay, kindOf, type ServiceEntry } from "@/utils/serviceLog";
import { makeStyles, useColors } from "@/lib/ThemeContext";

export type ServiceEntryRowProps = {
  entry: ServiceEntry;
  /** "4 Apr 2026", or "4 Apr" under its year's heading */
  withYear?: boolean;
  /** Press and hold: the entry's choices (edit or delete) */
  onHold: (entry: ServiceEntry) => void;
  onEdit: (entry: ServiceEntry) => void;
  onDelete: (entry: ServiceEntry) => void;
};

/**
 * One service in a piano's log (ServiceDetail and ServiceHistory boards): the
 * kind's icon, the kind, the day and the note, and the cost. Pressing and
 * holding it offers to edit or delete it; a screen reader has both as actions.
 */
const ServiceEntryRow = ({ entry, withYear = true, onHold, onEdit, onDelete }: ServiceEntryRowProps) => {
  const colors = useColors();
  const styles = useStyles();
  const kind = kindOf(entry.kind);
  const day = entryDay(entry, withYear);
  const note = entry.note?.trim();
  const cost = entry.cost && entry.cost > 0 ? formatRupees(entry.cost) : "";
  return (
    <Pressable
      onLongPress={() => onHold(entry)}
      accessibilityRole="button"
      accessibilityLabel={[kind.label, entryDay(entry), note, cost].filter(Boolean).join(", ")}
      accessibilityHint="Press and hold to edit or delete it"
      accessibilityActions={[
        { name: "edit", label: "Edit service" },
        { name: "delete", label: "Delete service" },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "edit") onEdit(entry);
        if (event.nativeEvent.actionName === "delete") onDelete(entry);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Icon name={kind.icon} size={20} color={colors.ink} strokeWidth={1.8} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.kind}>{kind.label}</Text>
        <Text style={styles.line} numberOfLines={1}>
          {[day, note].filter(Boolean).join(" · ")}
        </Text>
      </View>
      {!!cost && <Text style={styles.cost}>{cost}</Text>}
    </Pressable>
  );
};

const useStyles = makeStyles((colors) => ({
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  pressed: { backgroundColor: colors.grouped },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.input,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.fill,
  },
  texts: { flex: 1, minWidth: 0 },
  kind: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink },
  line: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  cost: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
}));

export default React.memo(ServiceEntryRow);
