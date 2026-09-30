import { useGlobalContext } from "@/context/GlobalProvider";
import { getUserPianoEntries } from "@/lib/appwrite";
import useAppwrite from "@/lib/useAppwrite";
import { loadPianosFromCache, savePianosToCache } from "@/lib/pianoCache";
import { format } from "date-fns";
import {
  setFilteredPianoListItems,
  setPianoListItems,
  setBulkSelectionMode,
  toggleItemSelection,
  clearSelectedItems,
  setPianoFilters,
} from "@/redux/pianos/actions";
import {
  AddButton,
  Banner,
  Icon,
  IconTabs,
  SearchPill,
  StateView,
  useSkeletonDelay,
} from "@/components/ui";
import type { IconTabItem } from "@/components/ui";
import { colors, fonts, radii, spacing } from "@/constants/theme";
import { PianoItem } from "@/redux/pianos/types";
import { isRentalActive, parseStoredDate } from "@/utils/dates";
import {
  CategoryTab,
  categoryFilterOf,
  categoryTabOf,
  clearFilters,
  countActiveFilters,
  layoutOf,
  sortLabelOf,
  withLayout,
} from "@/utils/filters";
import { padToFullRows } from "@/utils/grid";
import { isOverdue, isSold } from "@/utils/pianoStatus";
import { SORT_BY_OPTIONS } from "@/constants/Piano";
import { RootState } from "@/redux/store";
import { Href, router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import {
  BackHandler,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector, useStore } from "react-redux";
import FilterButton, { FilterButtonHandle } from "@/components/FilterButton";
import PianoCard from "@/components/PianoCard";
import PianoRow from "@/components/PianoRow";
import PianosSkeleton from "@/components/PianosSkeleton";
import BulkOperationsBar from "@/components/BulkOperationsBar";
import { scheduleAllRentalNotifications } from "@/services/notifications";

const CATEGORY_TABS: readonly IconTabItem<CategoryTab>[] = [
  { key: "all", label: "All", icon: "categoryAll" },
  { key: "rentable", label: "Rentable", icon: "categoryRentable" },
  { key: "events", label: "Events", icon: "categoryEvents" },
  { key: "on_sale", label: "On sale", icon: "categoryOnSale" },
  { key: "warehouse", label: "Warehouse", icon: "categoryWarehouse" },
];

// Any id will do: it only picks the colours of the drawing (walnut, as on the board)
const EMPTY_LIST_ART_ID = "piano-1";

/** "28 Sep, 6:40 pm" */
const formatSavedAt = (savedAt: string) =>
  format(new Date(savedAt), "d MMM, h:mm a").replace(/AM|PM/, (m) =>
    m.toLowerCase()
  );

// Sorts by a key worked out once per piano, instead of parsing dates again
// on every comparison
const sortByKey = (
  items: PianoItem[],
  getKey: (item: PianoItem) => number,
  order: "asc" | "desc"
) => {
  const keys = new Map(items.map((item) => [item, getKey(item)]));
  const direction = order === "asc" ? 1 : -1;
  return [...items].sort((a, b) => direction * (keys.get(a)! - keys.get(b)!));
};

const Home = () => {
  const dispatch = useDispatch();
  const store = useStore<RootState>();

  const { user } = useGlobalContext();
  const fetchFunction = useCallback(() => {
    if (!user || !user.accountId) {
      return Promise.resolve([]);
    }
    return getUserPianoEntries(user.accountId);
  }, [user]);
  const {
    data: items,
    isLoading,
    error: loadError,
    refetch,
  } = useAppwrite(fetchFunction);

  const pianoReduxItems: PianoItem[] = useSelector(
    (state: RootState) => state.pianos.items
  );
  const filteredPianoReduxItems: PianoItem[] = useSelector(
    (state: RootState) => state.pianos.filteredItems
  );
  const { selectedItems, isBulkSelectionMode } = useSelector(
    (state: RootState) => state.pianos
  );
  const filters = useSelector((state: RootState) => state.pianos.filters);

  const [refreshing, setRefreshing] = useState(false);
  // When the list on this device was last saved (shown while offline)
  const [savedAt, setSavedAt] = useState<string | null>(null);
  // Once the pianos have loaded from the server, the saved copy follows them
  const hasLoadedRef = useRef(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Android's back button leaves selection mode before it leaves the app
  useEffect(() => {
    if (!isBulkSelectionMode) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        dispatch(clearSelectedItems() as any);
        dispatch(setBulkSelectionMode(false) as any);
        return true;
      }
    );
    return () => subscription.remove();
  }, [isBulkSelectionMode, dispatch]);

  // The row callbacks below keep their identity across renders, so memoized
  // rows only re-render when their own props change
  const handleToggleItemSelection = useCallback(
    (itemId: string) => {
      dispatch(toggleItemSelection(itemId) as any);
    },
    [dispatch]
  );

  const handleEnterBulkSelection = useCallback(
    (itemId: string) => {
      // Read the latest selection at press time rather than from this render
      const { isBulkSelectionMode, selectedItems } = store.getState().pianos;
      // Enter bulk selection mode and select the long-pressed item
      if (!isBulkSelectionMode) {
        dispatch(setBulkSelectionMode(true) as any);
      }
      if (!selectedItems.includes(itemId)) {
        dispatch(toggleItemSelection(itemId) as any);
      }
    },
    [dispatch, store]
  );

  const overdueCount = useMemo(
    () => pianoReduxItems.filter(isOverdue).length,
    [pianoReduxItems]
  );
  const showOverdue = useCallback(
    () =>
      dispatch(
        setPianoFilters({ ...clearFilters(filters), isOverdue: true }) as any
      ),
    [filters, dispatch]
  );

  const hasPianos = pianoReduxItems.length > 0;
  const layout = layoutOf(filters);
  const isGrid = layout === "grid";
  const activeTab = categoryTabOf(filters);
  const activeFilterCount = countActiveFilters(filters);
  // Sorting by due date only shows rentals, so no other category can be chosen
  const dueDateSort = filters.sortBy === SORT_BY_OPTIONS.DUE_DATE;
  const tabs = useMemo(
    () =>
      CATEGORY_TABS.map((tab) => ({
        ...tab,
        disabled: dueDateSort && tab.key !== "rentable",
      })),
    [dueDateSort]
  );

  const filterPanel = useRef<FilterButtonHandle>(null);
  const openFilters = useCallback(() => filterPanel.current?.open(), []);
  const selectCategory = useCallback(
    (tab: CategoryTab) =>
      dispatch(
        setPianoFilters({ ...filters, category: categoryFilterOf(tab) }) as any
      ),
    [filters, dispatch]
  );
  const toggleLayout = useCallback(
    () =>
      dispatch(
        setPianoFilters(withLayout(filters, isGrid ? "list" : "grid")) as any
      ),
    [filters, isGrid, dispatch]
  );
  const openAdd = useCallback(() => router.push("/create"), []);
  // (The typed routes are generated when the dev server starts, so a new
  // route such as /search isn't known to them until then)
  const openSearch = useCallback(() => router.push("/search" as Href), []);
  const openPiano = useCallback(
    (id: string) => router.push(`/detail/${id}`),
    []
  );

  // The very first load, with no saved copy on this device to show yet. The
  // skeleton only appears after 200 ms, so a quick load never flashes it.
  const loadingFirstTime = !hasPianos && isLoading;
  const showSkeleton = useSkeletonDelay(loadingFirstTime);

  // Say why the list is empty (offline, none yet, filtered out or all sold)
  // and offer the way out
  const renderEmptyState = useCallback(() => {
    if (!hasPianos && loadError) {
      return (
        <StateView
          icon="wifiOff"
          title="Couldn’t load your pianos"
          message="Check your connection and try again."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      );
    }
    if (!hasPianos) {
      return (
        <StateView
          art={EMPTY_LIST_ART_ID}
          title="No pianos yet"
          message="Add your first piano to start tracking rentals, payments and sales."
          actionLabel="Add your first piano"
          onAction={openAdd}
        />
      );
    }
    if (countActiveFilters(filters) > 0) {
      return (
        <StateView
          icon="searchOff"
          title="No pianos match your filters"
          message="Try another category, or clear the filters to see every piano."
          actionLabel="Clear filters"
          actionVariant="secondary"
          onAction={() =>
            dispatch(setPianoFilters(clearFilters(filters)) as any)
          }
        />
      );
    }
    return (
      <StateView
        icon="tabPianos"
        title="No pianos in stock"
        message="Every piano has been sold. Turn on Sold pianos in the filters to see them."
        actionLabel="Add a piano"
        onAction={openAdd}
      />
    );
  }, [hasPianos, loadError, refetch, filters, dispatch, openAdd]);

  const displayData = useMemo(() => {
    if (isGrid) {
      return padToFullRows(filteredPianoReduxItems, 2);
    }
    return filteredPianoReduxItems;
  }, [isGrid, filteredPianoReduxItems]);

  const applyFilters = useCallback(() => {
    // Sold pianos are no longer stock, so they only show with the Sold filter
    let filteredItems: PianoItem[] = pianoReduxItems.filter(
      (item) => isSold(item) === filters.isSold
    );

    // Apply sorting first
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case SORT_BY_OPTIONS.TITLE_ASC:
          filteredItems = smartSortTitles(filteredItems, true);
          break;
        case SORT_BY_OPTIONS.TITLE_DES:
          filteredItems = smartSortTitles(filteredItems, false);
          break;
        case SORT_BY_OPTIONS.LATEST_ADDED:
          filteredItems = sortByKey(
            filteredItems,
            (item) => new Date(item.$createdAt).getTime(),
            "desc"
          );
          break;
        case SORT_BY_OPTIONS.PURCHASE_DATE:
          filteredItems = sortByKey(
            filteredItems,
            (item) => parseStoredDate(item.date_of_purchase)?.getTime() ?? 0,
            "desc"
          );
          break;
        case SORT_BY_OPTIONS.DUE_DATE:
          // Filter to only rentable items with rental_period_end, then sort by due date
          const rentableItemsWithDueDate = filteredItems.filter(
            (item) => item.category === "rentable" && item.rental_period_end
          );

          if (rentableItemsWithDueDate.length > 0) {
            // Replace the filtered items with sorted rentable items,
            // earliest due date first
            filteredItems = sortByKey(
              rentableItemsWithDueDate,
              (item) => parseStoredDate(item.rental_period_end)?.getTime() ?? 0,
              "asc"
            );
          } else {
            // If no rentable items with due dates, keep original items
            filteredItems = filteredItems.filter(
              (item) => item.category === "rentable"
            );
          }
          break;
        default:
          console.warn("Unknown sort option:", filters.sortBy);
          break;
      }
    }

    // Apply category filter
    if (filters.category) {
      const formattedFilter = filters.category
        .replace(/\s+/g, "_")
        .toLowerCase();

      filteredItems = filteredItems.filter(
        (item) => item.category.toLowerCase() === formattedFilter
      );
    }

    // Apply active rentals filter
    if (filters.isActiveRentals) {
      filteredItems = filteredItems.filter(
        (item) =>
          item.category === "rentable" &&
          isRentalActive(item.rental_period_end)
      );
    }

    // Rentals that have ended but haven't been extended or returned
    if (filters.isOverdue) {
      filteredItems = filteredItems.filter(isOverdue);
    }

    dispatch(setFilteredPianoListItems(filteredItems) as any);
  }, [pianoReduxItems, filters, dispatch]);

  // Store the fetched items in redux once loading has finished. An empty
  // result is stored too, so deleting the last piano clears the list.
  // Show the pianos saved on this device straight away, until the server
  // answers (or for good, when offline)
  useEffect(() => {
    if (!user?.accountId) return;
    let cancelled = false;
    loadPianosFromCache(user.accountId).then((cached) => {
      if (cancelled || !cached) return;
      setSavedAt(cached.savedAt);
      if (!hasLoadedRef.current) {
        dispatch(setPianoListItems(cached.pianos) as any);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.accountId]);

  // Keep the saved copy up to date, including changes made in the app
  useEffect(() => {
    if (!hasLoadedRef.current || !user?.accountId) return;
    savePianosToCache(user.accountId, pianoReduxItems).then((cached) => {
      if (cached) setSavedAt(cached.savedAt);
    });
  }, [pianoReduxItems, user?.accountId]);

  useEffect(() => {
    // After a failed load (e.g. offline) keep what we have, including the
    // reminders, rather than treating it as an empty list
    if (isLoading || loadError || !user) return;
    hasLoadedRef.current = true;
    dispatch(setPianoListItems(items) as any);

    // Keep rental reminders in line with the loaded pianos. This also removes
    // reminders for pianos that were deleted or are no longer rented.
    scheduleAllRentalNotifications(items);
  }, [items, isLoading, loadError, user]);

  // Re-apply sorting and filters whenever the stored items or the filters
  // change (including pianos deleted from other screens)
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Improved sorting function that handles numbers more intuitively
  const smartSortTitles = useCallback(
    (items: PianoItem[], ascending: boolean = true): PianoItem[] => {
      return [...items].sort((a, b) => {
        const titleA = a.title || "";
        const titleB = b.title || "";

        // Extract leading numbers
        const numMatchA = titleA.match(/^(\d+)/);
        const numMatchB = titleB.match(/^(\d+)/);

        const numA = numMatchA ? parseFloat(numMatchA[1]) : null;
        const numB = numMatchB ? parseFloat(numMatchB[1]) : null;

        // If both have leading numbers, sort numerically
        if (numA !== null && numB !== null) {
          const numCompare = numA - numB;
          if (numCompare !== 0) return ascending ? numCompare : -numCompare;

          // If numbers are equal, compare the rest of the string
          const restA = titleA.replace(/^(\d+)/, "");
          const restB = titleB.replace(/^(\d+)/, "");
          return ascending
            ? restA.localeCompare(restB)
            : restB.localeCompare(restA);
        }

        // If only one has leading number, numbers come first
        if (numA !== null && numB === null) return ascending ? -1 : 1;
        if (numA === null && numB !== null) return ascending ? 1 : -1;

        // Both are text, use localeCompare
        return ascending
          ? titleA.localeCompare(titleB)
          : titleB.localeCompare(titleA);
      });
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: PianoItem | (PianoItem & { empty?: boolean }) }) => {
      // A blank cell that keeps the last card of the grid from stretching
      if ((item as any).empty) return <View style={styles.blankCell} />;

      const piano = item as PianoItem;
      const shared = {
        item: piano,
        selecting: isBulkSelectionMode,
        selected: selectedItems.includes(piano.$id),
        onOpen: openPiano,
        onToggle: handleToggleItemSelection,
        onSelectStart: handleEnterBulkSelection,
      };
      // The callbacks keep their identity across renders, so a memoized card
      // only re-renders when its own props change
      return isGrid ? <PianoCard {...shared} /> : <PianoRow {...shared} />;
    },
    [
      isGrid,
      isBulkSelectionMode,
      selectedItems,
      openPiano,
      handleToggleItemSelection,
      handleEnterBulkSelection,
    ]
  );

  const count = filteredPianoReduxItems.length;
  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.page}>
      <View style={styles.searchRow}>
        <SearchPill
          style={styles.pill}
          onPress={openSearch}
          // Nothing to filter until there are pianos (or they are on their way)
          onFilterPress={hasPianos || loadingFirstTime ? openFilters : undefined}
          filterCount={activeFilterCount}
        />
        <AddButton onPress={openAdd} />
      </View>

      {(hasPianos || loadingFirstTime) && (
        <IconTabs
          style={styles.tabs}
          tabs={tabs}
          active={activeTab}
          onSelect={selectCategory}
          accessibilityLabel="Category"
        />
      )}

      {/* Offline: say the list may be out of date */}
      {!!loadError && hasPianos && (
        <Banner
          variant="offline"
          lead="Offline."
          message={
            savedAt
              ? `Showing pianos saved on ${formatSavedAt(savedAt)}.`
              : "Showing the last loaded pianos."
          }
          style={styles.offline}
        />
      )}

      {/* Rentals that should have come back by now */}
      {overdueCount > 0 && !filters.isOverdue && (
        <Pressable
          onPress={showOverdue}
          accessibilityRole="button"
          style={styles.overdue}
        >
          <Icon name="alert" size={18} color={colors.late} strokeWidth={2} />
          <Text style={styles.overdueText}>
            {overdueCount} {overdueCount === 1 ? "rental is" : "rentals are"}{" "}
            overdue
          </Text>
          <Text style={styles.overdueAction}>View</Text>
        </Pressable>
      )}

      {hasPianos && (
        <View style={styles.countRow}>
          <Text style={styles.count}>
            {count === 0
              ? "No pianos"
              : `${count} ${count === 1 ? "piano" : "pianos"}`}
          </Text>
          <View style={styles.countActions}>
            <Pressable
              onPress={openFilters}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${sortLabelOf(filters.sortBy)}`}
              style={styles.sort}
            >
              <Text style={styles.sortText}>{sortLabelOf(filters.sortBy)}</Text>
              <Icon
                name="chevronDown"
                size={14}
                color={colors.ink}
                strokeWidth={2.4}
              />
            </Pressable>
            <Pressable
              onPress={toggleLayout}
              accessibilityRole="button"
              accessibilityLabel={isGrid ? "Show as list" : "Show as grid"}
              style={styles.layoutToggle}
            >
              <Icon
                name={isGrid ? "list" : "categoryAll"}
                size={22}
                color={colors.ink}
                strokeWidth={1.9}
              />
            </Pressable>
          </View>
        </View>
      )}

      {/* Bulk Operations Bar */}
      <BulkOperationsBar onRefresh={onRefresh} />

      {loadingFirstTime ? (
        showSkeleton ? (
          <PianosSkeleton layout={layout} />
        ) : null
      ) : isGrid ? (
        <FlatList
          key="grid"
          data={displayData}
          keyExtractor={(item) => item.$id || item.title}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          renderItem={renderItem}
          ListEmptyComponent={renderEmptyState}
          refreshControl={refreshControl}
        />
      ) : (
        <FlatList
          key="list"
          data={filteredPianoReduxItems}
          keyExtractor={(item) => item.$id}
          numColumns={1}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          renderItem={renderItem}
          ListEmptyComponent={renderEmptyState}
          refreshControl={refreshControl}
        />
      )}

      {/* The panel behind the filter button and the sort link */}
      <FilterButton ref={filterPanel} trigger={false} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.screen,
  },
  pill: { flex: 1, minWidth: 0 },
  tabs: { marginTop: spacing.sm },
  // Full width, as on the PianosOffline board
  offline: {
    borderRadius: 0,
    paddingHorizontal: spacing.screen,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  overdue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: spacing.sm,
    marginHorizontal: spacing.screen,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.input,
    backgroundColor: colors.lateTint,
  },
  overdueText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.lateTintText,
  },
  overdueAction: {
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.lateTintText,
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: spacing.screen,
    paddingRight: spacing.sm,
  },
  count: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink2,
  },
  countActions: { flexDirection: "row", alignItems: "center" },
  sort: {
    height: spacing.minTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  sortText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
  },
  layoutToggle: {
    width: spacing.minTarget,
    height: spacing.minTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  gridRow: { gap: 12, paddingHorizontal: spacing.screen },
  gridContent: { rowGap: 20, paddingTop: 4, paddingBottom: 24, flexGrow: 1 },
  listContent: { paddingBottom: 24, flexGrow: 1 },
  blankCell: { flex: 1 },
});

export default Home;
