import React, { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useSelector } from "react-redux";
import PianoCard from "@/components/PianoCard";
import PianoRow from "@/components/PianoRow";
import { SearchField, StateView } from "@/components/ui";
import { fonts, spacing } from "@/constants/theme";
import { PianoItem } from "@/redux/pianos/types";
import { RootState } from "@/redux/store";
import { padToFullRows } from "@/utils/grid";
import { layoutOf } from "@/utils/filters";
import { searchPianoItems } from "@/utils/ObjectManipulation";
import { makeStyles } from "@/lib/ThemeContext";

// What the search really looks at (see searchPianoItems)
const HINT =
  "Searches title and make, a rental’s customer name or mobile number, and an event’s model or B-number.";

const countText = (count: number, typed: boolean) =>
  typed
    ? `${count} ${count === 1 ? "result" : "results"}`
    : `${count} ${count === 1 ? "piano" : "pianos"}`;

/**
 * Search: a field you type in, and the pianos that match under it, as you type.
 * It opens with the keyboard up and every piano listed, in the same grid or
 * list as the Pianos tab. The letters that matched are bold.
 */
const Search = () => {
  const styles = useStyles();
  const { query } = useLocalSearchParams();
  const initialText = (Array.isArray(query) ? query[0] : query) ?? "";
  const [text, setText] = useState(initialText);
  const inputRef = useRef<TextInput>(null);

  const pianos = useSelector((state: RootState) => state.pianos.items);
  const filters = useSelector((state: RootState) => state.pianos.filters);
  const isGrid = layoutOf(filters) === "grid";

  const term = text.trim();
  const results = useMemo(() => searchPianoItems(pianos, text), [pianos, text]);
  const data = useMemo(
    () => (isGrid ? padToFullRows(results, 2) : results),
    [isGrid, results]
  );

  const cancel = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/home");
  }, []);
  const clear = useCallback(() => {
    setText("");
    inputRef.current?.focus();
  }, []);
  const openPiano = useCallback((id: string) => router.push(`/detail/${id}`), []);

  const renderItem = useCallback(
    ({ item }: { item: PianoItem | (PianoItem & { empty?: boolean }) }) => {
      // A blank cell that keeps the last card of the grid from stretching
      if ((item as { empty?: boolean }).empty) return <View style={styles.blankCell} />;
      const piano = item as PianoItem;
      return isGrid ? (
        <PianoCard item={piano} onOpen={openPiano} highlight={term} />
      ) : (
        <PianoRow item={piano} onOpen={openPiano} highlight={term} />
      );
    },
    [isGrid, openPiano, term, styles.blankCell]
  );

  const renderEmpty = () =>
    pianos.length === 0 ? (
      <StateView
        icon="tabPianos"
        title="No pianos yet"
        message="Pianos you add will show up here."
      />
    ) : (
      <StateView
        icon="searchOff"
        title={`No pianos match “${term}”`}
        message="Check the spelling, or try a make or a customer’s name."
        actionLabel="Clear search"
        actionVariant="secondary"
        onAction={clear}
      />
    );

  const header =
    results.length > 0 ? (
      <Text style={styles.count} accessibilityLiveRegion="polite">
        {countText(results.length, term !== "")}
      </Text>
    ) : null;
  const footer =
    results.length > 0 ? <Text style={styles.hint}>{HINT}</Text> : null;

  const shared = {
    data,
    keyExtractor: (item: PianoItem) => item.$id || item.title,
    renderItem,
    ListHeaderComponent: header,
    ListFooterComponent: footer,
    ListEmptyComponent: renderEmpty,
    keyboardShouldPersistTaps: "handled" as const,
    keyboardDismissMode: "on-drag" as const,
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <View style={styles.searchRow}>
        <SearchField
          ref={inputRef}
          style={styles.field}
          value={text}
          onChangeText={setText}
          onClear={clear}
          // Straight to typing, unless the search came with words already in it
          autoFocus={initialText === ""}
        />
        <Pressable
          onPress={cancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          style={styles.cancel}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      {isGrid ? (
        <FlatList
          key="grid"
          {...shared}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
        />
      ) : (
        <FlatList
          key="list"
          {...shared}
          numColumns={1}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const useStyles = makeStyles((colors) => ({
  page: { flex: 1, backgroundColor: colors.page },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: spacing.md,
    paddingLeft: spacing.screen,
    paddingRight: spacing.sm,
  },
  field: { flex: 1, minWidth: 0 },
  cancel: {
    height: spacing.minTarget,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  cancelText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  count: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.screen,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink2,
  },
  hint: {
    paddingTop: 24,
    paddingHorizontal: spacing.screen,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink2,
  },
  gridRow: { gap: 12, paddingHorizontal: spacing.screen },
  gridContent: { rowGap: 20, paddingBottom: 32, flexGrow: 1 },
  listContent: { paddingBottom: 32, flexGrow: 1 },
  blankCell: { flex: 1 },
}));

export default Search;
