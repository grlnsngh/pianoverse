import { images } from "@/constants";
import { SECONDARY_COLOR } from "@/constants/colors";
import { useGlobalContext } from "@/context/GlobalProvider";
import { getUserPianoEntries } from "@/lib/appwrite";
import useAppwrite from "@/lib/useAppwrite";
import {
  setFilteredPianoListItems,
  setPianoListItems,
  setBulkSelectionMode,
  toggleItemSelection,
  selectAllItems,
  clearSelectedItems,
  setPianoFilters,
} from "@/redux/pianos/actions";
import { setActiveTab } from "@/redux/navigation/actions";
import { PianoItem } from "@/redux/pianos/types";
import { isRentalActive, parseStoredDate } from "@/utils/dates";
import { clearFilters } from "@/utils/filters";
import { SORT_BY_OPTIONS } from "../constants/Piano";
import { RootState } from "@/redux/store";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  BackHandler,
  FlatList,
  RefreshControl,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import CardItem from "../components/CardItem";
import EmptyState from "../components/EmptyState";
import FilterButton from "../components/FilterButton";
import ListItem from "../components/ListItem";
import SearchInput from "../components/SearchInput";
import BulkOperationsBar from "../components/BulkOperationsBar";
import { scheduleAllRentalNotifications } from "../services/notifications";
import NotificationTest from "../components/NotificationTest";
import { usePathname } from "expo-router";
import { router } from "expo-router";

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
  const layoutView = useSelector(
    (state: RootState) => state.pianos.filters.layoutStatus
  );
  const filters = useSelector((state: RootState) => state.pianos.filters);

  const [refreshing, setRefreshing] = useState(false);
  const [showNotificationTest, setShowNotificationTest] = useState(false);
  const [layoutKey, setLayoutKey] = useState<string>("card");
  const [layoutCounter, setLayoutCounter] = useState<number>(0);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Refetch data when screen comes into focus (e.g., after publishing)
  // Removed automatic refetch to prevent duplicate fetches when navigating from profile
  // useFocusEffect(
  //   React.useCallback(() => {
  //     refetch();
  //     // Note: Notification scheduling is handled in the main useEffect below
  //     // to prevent duplicate scheduling and infinite console logs
  //   }, [])
  // );

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

  const handleItemDeleted = useCallback(() => {
    refetch();
  }, [refetch]);

  // Say whether the filters hid everything or there's nothing yet, and offer
  // the way out
  const hasPianos = pianoReduxItems.length > 0;
  const renderEmptyState = useCallback(
    () =>
      hasPianos ? (
        <EmptyState
          title="No pianos match your filters"
          subtitle="Try another category, or clear the filters to see every piano."
          action={{
            title: "Clear Filters",
            onPress: () =>
              dispatch(setPianoFilters(clearFilters(filters)) as any),
          }}
        />
      ) : (
        <EmptyState
          title="No Pianos Yet"
          subtitle="Pianos you add will show up here."
          action={{
            title: "Add a Piano",
            onPress: () => dispatch(setActiveTab("create") as any),
          }}
        />
      ),
    [hasPianos, filters, dispatch]
  );

  const formatData = useCallback((data: PianoItem[], numColumns: number) => {
    const newData = [...data];
    const numberOfFullRows = Math.floor(newData.length / numColumns);
    let numberOfElementsLastRow =
      newData.length - numberOfFullRows * numColumns;
    while (
      numberOfElementsLastRow !== numColumns &&
      numberOfElementsLastRow !== 0
    ) {
      newData.push({
        $id: `blank-${numberOfElementsLastRow}`,
        title: `blank-${numberOfElementsLastRow}`,
        empty: true,
      } as PianoItem & { empty?: boolean });
      numberOfElementsLastRow++;
    }
    return newData;
  }, []);

  const displayData = useMemo(() => {
    if (layoutView.grid === "checked") {
      return formatData(filteredPianoReduxItems, 2);
    }
    return filteredPianoReduxItems;
  }, [layoutView.grid, filteredPianoReduxItems, formatData]);

  const applyFilters = useCallback(() => {
    let filteredItems: PianoItem[] = pianoReduxItems.slice();

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

    dispatch(setFilteredPianoListItems(filteredItems) as any);
  }, [pianoReduxItems, filters, dispatch]);

  // Store the fetched items in redux once loading has finished. An empty
  // result is stored too, so deleting the last piano clears the list.
  useEffect(() => {
    // After a failed load (e.g. offline) keep what we have, including the
    // reminders, rather than treating it as an empty list
    if (isLoading || loadError || !user) return;
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

  // Update layout key when layout changes
  useEffect(() => {
    const newKey =
      layoutView.grid === "checked"
        ? "grid"
        : layoutView.list === "checked"
        ? "list"
        : "card";
    setLayoutKey(newKey);
    setLayoutCounter((prev) => prev + 1);
  }, [layoutView]);

  const [visibleMenuId, setVisibleMenuId] = useState<string | null>(null);
  const openMenu = useCallback(
    (menuId: string) => setVisibleMenuId(menuId),
    []
  );
  const closeMenu = useCallback(() => setVisibleMenuId(null), []);
  const pathname = usePathname();

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

  const testSorting = useCallback(() => {
    // Simple test data for demonstration
    const testTitles = ["10", "6", "ABC", "2nd Piano", "Apple Piano"];

    console.log("🧪 Current Test Data:", testTitles);

    console.log("\n🔤 Testing A-Z sorting (localeCompare):");
    const sortedAZ = [...testTitles].sort((a, b) => a.localeCompare(b));
    console.log("A-Z result:", sortedAZ);

    console.log("\n🔤 Testing Z-A sorting (localeCompare):");
    const sortedZA = [...testTitles].sort((a, b) => b.localeCompare(a));
    console.log("Z-A result:", sortedZA);

    // Test numeric sorting
    console.log("\n🔢 Testing Numeric-Aware A-Z sorting:");
    const sortedNumericAZ = [...testTitles].sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);

      // If both start with numbers, sort numerically
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }

      // If one starts with number and other doesn't, numbers first
      if (!isNaN(numA) && isNaN(numB)) return -1;
      if (isNaN(numA) && !isNaN(numB)) return 1;

      // Both are text, use localeCompare
      return a.localeCompare(b);
    });
    console.log("Numeric-aware A-Z result:", sortedNumericAZ);

    console.log("\n🎯 Testing IMPROVED Smart A-Z sorting:");
    const sortedSmartAZ = [...testTitles].sort((a, b) => {
      // Extract leading numbers
      const numMatchA = a.match(/^(\d+)/);
      const numMatchB = b.match(/^(\d+)/);

      const numA = numMatchA ? parseFloat(numMatchA[1]) : null;
      const numB = numMatchB ? parseFloat(numMatchB[1]) : null;

      // If both have leading numbers, sort numerically
      if (numA !== null && numB !== null) {
        const numCompare = numA - numB;
        if (numCompare !== 0) return numCompare;

        // If numbers are equal, compare the rest of the string
        const restA = a.replace(/^(\d+)/, "");
        const restB = b.replace(/^(\d+)/, "");
        return restA.localeCompare(restB);
      }

      // If only one has leading number, numbers come first
      if (numA !== null && numB === null) return -1;
      if (numA === null && numB !== null) return 1;

      // Both are text, use localeCompare
      return a.localeCompare(b);
    });
    console.log("Smart A-Z result:", sortedSmartAZ);
  }, []);

  const renderItem = useCallback(
    ({
      item,
      index,
    }: {
      item: PianoItem | (PianoItem & { empty?: boolean });
      index: number;
    }) => {
      if ((item as any).empty) {
        return <View style={{ flex: 1, margin: 4 }} />;
      }

      // Only the row whose menu is open sees a change when a menu opens
      const rowMenuId =
        visibleMenuId === (item as PianoItem).$id ? visibleMenuId : null;

      if (layoutView.card === "checked") {
        return (
          <CardItem
            item={item as PianoItem}
            index={index}
            visibleMenuId={rowMenuId}
            openMenu={openMenu}
            closeMenu={closeMenu}
            onDelete={handleItemDeleted}
            isBulkSelectionMode={isBulkSelectionMode}
            isSelected={selectedItems.includes((item as PianoItem).$id)}
            onToggleSelection={handleToggleItemSelection}
            onEnterBulkSelection={handleEnterBulkSelection}
            isGridView={false}
          />
        );
      } else if (layoutView.list === "checked") {
        return (
          <ListItem
            item={item as PianoItem}
            index={index}
            visibleMenuId={rowMenuId}
            openMenu={openMenu}
            closeMenu={closeMenu}
            onDelete={handleItemDeleted}
            isBulkSelectionMode={isBulkSelectionMode}
            isSelected={selectedItems.includes((item as PianoItem).$id)}
            onToggleSelection={handleToggleItemSelection}
            onEnterBulkSelection={handleEnterBulkSelection}
          />
        );
      } else if (layoutView.grid === "checked") {
        return (
          <CardItem
            item={item as PianoItem}
            index={index}
            visibleMenuId={rowMenuId}
            openMenu={openMenu}
            closeMenu={closeMenu}
            onDelete={handleItemDeleted}
            isBulkSelectionMode={isBulkSelectionMode}
            isSelected={selectedItems.includes((item as PianoItem).$id)}
            onToggleSelection={handleToggleItemSelection}
            onEnterBulkSelection={handleEnterBulkSelection}
            isGridView={true}
          />
        );
      } else {
        return null;
      }
    },
    [
      layoutView,
      visibleMenuId,
      openMenu,
      closeMenu,
      handleItemDeleted,
      isBulkSelectionMode,
      selectedItems,
      handleToggleItemSelection,
      handleEnterBulkSelection,
    ]
  );

  return (
    <SafeAreaView className="bg-primary h-full">
      <View className="flex mt-6 px-4">
        <View className="flex justify-between items-start flex-row mb-6">
          <View>
            <Text className="font-pmedium text-sm text-gray-100">
              Welcome Back
            </Text>
            <Text className="text-2xl font-psemibold text-white">
              {user?.username}
            </Text>
          </View>
          <View className="flex-row items-center mt-1.5">
            <Image
              source={images.piano}
              className="w-10 h-10"
              resizeMode="contain"
              tintColor={SECONDARY_COLOR}
            />
          </View>
        </View>

        <View className="flex flex-row w-full gap-1">
          <View className="flex-1">
            <SearchInput />
          </View>
          <View className="w-14 flex items-center justify-center">
            <FilterButton />
          </View>
        </View>

        <View className="flex flex-row justify-end mr-1 my-3">
          <Text className="font-pmedium text-sm text-gray-100">
            {filteredPianoReduxItems.length === 0
              ? "No Pianos"
              : `${filteredPianoReduxItems.length} ${
                  filteredPianoReduxItems.length === 1 ? "Piano" : "Pianos"
                }`}
          </Text>
        </View>
      </View>

      {/* Bulk Operations Bar */}
      <BulkOperationsBar onRefresh={onRefresh} />

      {layoutView.grid === "checked" ? (
        <FlatList
          key={`grid-${layoutKey}`}
          data={displayData}
          keyExtractor={(item) => item.$id || item.title}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 12 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 20, paddingTop: 8 }}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          renderItem={renderItem}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <FlatList
          key={`list-${layoutKey}`}
          data={filteredPianoReduxItems}
          keyExtractor={(item) => item.$id}
          numColumns={1}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          renderItem={renderItem}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

export default Home;
