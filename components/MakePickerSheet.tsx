import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Icon, Sheet } from "@/components/ui";
import { fonts, radii, spacing } from "@/constants/theme";
import { makeStyles, useColors } from "@/lib/ThemeContext";

const ROW = 52;
const HEADER = 32;

type MakeSection = { letter: string; makes: string[] };

/** The makes that match what was typed, A to Z, grouped by their first letter. */
export const makeSections = (
  makes: readonly string[],
  query: string
): MakeSection[] => {
  const wanted = query.trim().toLowerCase();
  const sections: MakeSection[] = [];
  [...makes]
    .filter((make) => !wanted || make.toLowerCase().includes(wanted))
    .sort((a, b) => a.localeCompare(b))
    .forEach((make) => {
      const letter = make.charAt(0).toUpperCase();
      const last = sections[sections.length - 1];
      if (last && last.letter === letter) last.makes.push(make);
      else sections.push({ letter, makes: [make] });
    });
  return sections;
};

/** How far down the list a letter's heading is: the headings and rows above it. */
export const headingOffset = (sections: readonly MakeSection[], index: number) =>
  sections
    .slice(0, index)
    .reduce((total, section) => total + HEADER + section.makes.length * ROW, 0);

type MakePickerSheetProps = {
  visible: boolean;
  /** The makes to choose from */
  makes: readonly string[];
  /** The make chosen now, or "" */
  value: string;
  /** Called with the chosen make. The screen closes the sheet. */
  onSelect: (make: string) => void;
  onClose: () => void;
};

/**
 * The list of makes in a tall white sheet (MakePicker board): a search field,
 * the makes A to Z under letter headings, the chosen one bold with a check,
 * and a strip of letters at the right edge that jumps to a heading.
 */
const MakePickerSheet = ({
  visible,
  makes,
  value,
  onSelect,
  onClose,
}: MakePickerSheetProps) => {
  const colors = useColors();
  const styles = useStyles();
  const [query, setQuery] = useState("");
  const list = useRef<ScrollView>(null);
  const sections = useMemo(() => makeSections(makes, query), [makes, query]);

  // Start from the whole list each time it opens
  useEffect(() => {
    if (visible) setQuery("");
  }, [visible]);

  // Headings and rows have fixed heights, so where a heading is is known
  const jumpTo = (index: number) =>
    list.current?.scrollTo({ y: headingOffset(sections, index), animated: false });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Make"
      tone="white"
      tall
      testID="make-picker"
    >
      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <Icon name="search" size={18} color={colors.ink2} strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search makes"
            placeholderTextColor={colors.ink3}
            accessibilityLabel="Search makes"
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor={colors.ink}
            underlineColorAndroid="transparent"
            style={styles.searchInput}
          />
        </View>
      </View>

      <View style={styles.listArea}>
        <ScrollView
          ref={list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {sections.map((section) => (
            <View key={section.letter}>
              <View style={styles.heading}>
                <Text style={styles.headingText} accessibilityRole="header">
                  {section.letter}
                </Text>
              </View>
              {section.makes.map((make) => {
                const selected = make === value;
                return (
                  <Pressable
                    key={make}
                    onPress={() => onSelect(make)}
                    accessibilityRole="button"
                    accessibilityLabel={make}
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  >
                    <Text
                      style={[
                        styles.make,
                        { fontFamily: selected ? fonts.bold : fonts.medium },
                      ]}
                    >
                      {make}
                    </Text>
                    {selected && (
                      <Icon name="check" size={22} color={colors.ink} strokeWidth={2.6} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}

          {sections.length === 0 && (
            <Text style={styles.empty}>No make matches “{query.trim()}”.</Text>
          )}
        </ScrollView>

        {sections.length > 1 && (
          <View
            style={styles.index}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {sections.map((section, index) => (
              <Pressable
                key={section.letter}
                onPress={() => jumpTo(index)}
                hitSlop={{ left: 8, right: 4 }}
                testID={`make-index-${section.letter}`}
              >
                <Text style={styles.indexLetter}>{section.letter}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Sheet>
  );
};

const useStyles = makeStyles((colors) => ({
  searchWrap: { paddingHorizontal: spacing.screen, paddingBottom: spacing.sm },
  search: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.input,
    backgroundColor: colors.fill,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    padding: 0,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.ink,
  },
  listArea: { flex: 1 },
  listContent: { paddingBottom: spacing.xxl },
  heading: {
    height: HEADER,
    justifyContent: "center",
    paddingHorizontal: spacing.screen,
    backgroundColor: colors.grouped,
  },
  headingText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink2 },
  row: {
    height: ROW,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: spacing.screen,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  pressed: { backgroundColor: colors.grouped },
  make: { fontSize: 16, color: colors.ink },
  empty: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.screen,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink2,
    textAlign: "center",
  },
  index: {
    position: "absolute",
    right: 4,
    top: 8,
    alignItems: "center",
    gap: 3,
  },
  indexLetter: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 13,
    color: colors.ink2,
  },
}));

export default MakePickerSheet;
