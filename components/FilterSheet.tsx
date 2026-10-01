import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Button, Group, Icon, PickerSheet, Sheet, Switch } from "@/components/ui";
import type { PickerOption } from "@/components/ui";
import { SORT_BY_OPTIONS } from "@/constants/Piano";
import { fonts, spacing } from "@/constants/theme";
import { setPianoFilters } from "@/redux/pianos/actions";
import { FiltersType } from "@/redux/pianos/types";
import { RootState } from "@/redux/store";
import { applyPianoFilters } from "@/utils/filterPianos";
import { clearFilters, sortLabelOf } from "@/utils/filters";
import { makeStyles, useColors } from "@/lib/ThemeContext";

const SORT_OPTIONS: readonly PickerOption<string>[] = Object.values(
  SORT_BY_OPTIONS
).map((sortBy) => ({ value: sortBy, label: sortLabelOf(sortBy) }));

export type FilterSheetProps = {
  visible: boolean;
  onClose: () => void;
};

type SwitchRowProps = {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

const SwitchRow = ({ title, subtitle, value, onValueChange }: SwitchRowProps) => {
  const styles = useStyles();
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchTexts}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={title} />
    </View>
  );
};

/**
 * The choices that narrow the Pianos list beyond the category tabs: how to
 * sort it, and which rentals or sold pianos to show. Choices are kept apart
 * until "Show N pianos" applies them, and the button says how many that would
 * show. Closing the sheet drops them.
 */
const FilterSheet = ({ visible, onClose }: FilterSheetProps) => {
  const colors = useColors();
  const styles = useStyles();
  const dispatch = useDispatch();
  const filters = useSelector((state: RootState) => state.pianos.filters);
  const pianos = useSelector((state: RootState) => state.pianos.items);
  const [draft, setDraft] = useState<FiltersType>(filters);
  const [choosingSort, setChoosingSort] = useState(false);

  // Start from the filters in use each time it opens, and follow them if they
  // change while it is open
  useEffect(() => {
    if (visible) {
      setDraft(filters);
      setChoosingSort(false);
    }
  }, [visible, filters]);

  const count = useMemo(
    () => applyPianoFilters(pianos, draft).length,
    [pianos, draft]
  );

  const apply = () => {
    dispatch(setPianoFilters(draft) as any);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Filters"
      leftLabel="Reset"
      onLeftPress={() => setDraft((current) => clearFilters(current))}
      footer={
        <Button
          title={`Show ${count} ${count === 1 ? "piano" : "pianos"}`}
          onPress={apply}
        />
      }
    >
      <View style={styles.content}>
        <Group>
          <Pressable
            onPress={() => setChoosingSort(true)}
            accessibilityRole="button"
            accessibilityLabel={`Sort by, ${sortLabelOf(draft.sortBy)}`}
            style={({ pressed }) => [
              styles.sortRow,
              pressed && { backgroundColor: colors.grouped },
            ]}
          >
            <Text style={styles.rowTitle}>Sort by</Text>
            <View style={styles.sortValue}>
              <Text style={styles.sortText}>{sortLabelOf(draft.sortBy)}</Text>
              <Icon
                name="chevronRight"
                size={18}
                color={colors.chevron}
                strokeWidth={2}
              />
            </View>
          </Pressable>
        </Group>

        <Group title="Show" style={styles.show}>
          <SwitchRow
            title="Active rentals"
            subtitle="Rentals that have not ended"
            value={draft.isActiveRentals}
            onValueChange={(isActiveRentals) =>
              setDraft((current) => ({
                ...current,
                // Only rentals can be active
                category: isActiveRentals ? "Rentable" : current.category,
                isActiveRentals,
                // A rental can't be both active and overdue
                isOverdue: false,
              }))
            }
          />
          <SwitchRow
            title="Overdue only"
            subtitle="Ended and not renewed"
            value={draft.isOverdue}
            onValueChange={(isOverdue) =>
              setDraft((current) => ({
                ...current,
                isOverdue,
                isActiveRentals: false,
              }))
            }
          />
          {/* Sold pianos are hidden from the list unless this is on, and then
              only they are shown */}
          <SwitchRow
            title="Sold pianos"
            subtitle="Show only pianos that were sold"
            value={draft.isSold}
            onValueChange={(isSold) =>
              setDraft((current) => ({ ...current, isSold }))
            }
          />
        </Group>
      </View>

      <PickerSheet
        visible={choosingSort}
        title="Sort by"
        options={SORT_OPTIONS}
        value={draft.sortBy}
        onSelect={(sortBy) => {
          setDraft((current) => ({
            ...current,
            sortBy,
            // Due date only shows rentals, so the category follows
            category:
              sortBy === SORT_BY_OPTIONS.DUE_DATE ? "Rentable" : current.category,
          }));
          setChoosingSort(false);
        }}
        onClose={() => setChoosingSort(false)}
      />
    </Sheet>
  );
};

const useStyles = makeStyles((colors) => ({
  content: { paddingTop: spacing.sm },
  show: { marginTop: 24 },
  sortRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  sortValue: { flexDirection: "row", alignItems: "center", gap: 4 },
  sortText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink2,
  },
  switchRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  switchTexts: { flex: 1 },
  rowTitle: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
  rowSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink2,
  },
}));

export default FilterSheet;
