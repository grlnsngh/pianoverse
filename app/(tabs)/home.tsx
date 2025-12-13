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
} from "@/redux/pianos/actions";
import { PianoItem } from "@/redux/pianos/types";
import { differenceInDays } from "date-fns";
import { SORT_BY_OPTIONS } from "../constants/Piano";
import { RootState } from "@/redux/store";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  FlatList,
  RefreshControl,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
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
import { exportPianosToCSV } from "@/utils/csvExport";
import icons from "@/constants/icons";

const Home = () => {
  const dispatch = useDispatch();

  const { user } = useGlobalContext();
  const fetchFunction = useCallback(() => {
    if (!user || !user.accountId) {
      return Promise.resolve([]);
    }
    return getUserPianoEntries(user.accountId);
  }, [user]);
  const { data: items, refetch } = useAppwrite(fetchFunction);

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
  const [lastNotificationSchedule, setLastNotificationSchedule] =
    useState<string>("");
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

  const handleToggleItemSelection = (itemId: string) => {
    dispatch(toggleItemSelection(itemId) as any);
  };

  const handleEnterBulkSelection = (itemId: string) => {
    // Enter bulk selection mode and select the long-pressed item
    if (!isBulkSelectionMode) {
      dispatch(setBulkSelectionMode(true) as any);
    }
    if (!selectedItems.includes(itemId)) {
      dispatch(toggleItemSelection(itemId) as any);
    }
  };

  const handleExportCSV = async () => {
    await exportPianosToCSV(filteredPianoReduxItems);
  };

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
    console.log("🔍 Applying filters:", filters);
    let filteredItems: PianoItem[] = items.slice();
    console.log("📊 Original items count:", filteredItems.length);

    // Apply sorting first
    if (filters.sortBy) {
      const sortItems = (
        items: PianoItem[],
        compareFn: (a: PianoItem, b: PianoItem) => number
      ) => {
        return items.sort(compareFn);
      };

      switch (filters.sortBy) {
        case SORT_BY_OPTIONS.TITLE_ASC:
          filteredItems = smartSortTitles(filteredItems, true);
          console.log("🔤 Sorted by title A-Z (smart sorting)");
          console.log(
            "📝 First few titles:",
            filteredItems.slice(0, 5).map((item) => item.title)
          );
          break;
        case SORT_BY_OPTIONS.TITLE_DES:
          filteredItems = smartSortTitles(filteredItems, false);
          console.log("🔤 Sorted by title Z-A (smart sorting)");
          console.log(
            "📝 First few titles:",
            filteredItems.slice(0, 5).map((item) => item.title)
          );
          break;
        case SORT_BY_OPTIONS.LATEST_ADDED:
          filteredItems = sortItems(
            filteredItems,
            (a, b) =>
              new Date(b.$createdAt).getTime() -
              new Date(a.$createdAt).getTime()
          );
          console.log("🕒 Sorted by latest added");
          break;
        case SORT_BY_OPTIONS.PURCHASE_DATE:
          filteredItems = sortItems(filteredItems, (a, b) => {
            const dateA = a.date_of_purchase
              ? new Date(a.date_of_purchase).getTime()
              : new Date(0).getTime();
            const dateB = b.date_of_purchase
              ? new Date(b.date_of_purchase).getTime()
              : new Date(0).getTime();
            return dateB - dateA;
          });
          console.log("💰 Sorted by purchase date");
          break;
        case SORT_BY_OPTIONS.DUE_DATE:
          // Filter to only rentable items with rental_period_end, then sort by due date
          const rentableItemsWithDueDate = filteredItems.filter(
            (item) => item.category === "rentable" && item.rental_period_end
          );

          if (rentableItemsWithDueDate.length > 0) {
            const sortedRentableItems = sortItems(
              rentableItemsWithDueDate,
              (a, b) => {
                const dateA = a.rental_period_end
                  ? new Date(a.rental_period_end).getTime()
                  : 0;
                const dateB = b.rental_period_end
                  ? new Date(b.rental_period_end).getTime()
                  : 0;
                return dateA - dateB; // Sort by earliest due date first
              }
            );

            // Replace the filtered items with sorted rentable items
            filteredItems = sortedRentableItems;
            console.log("📅 Sorted by due date (earliest first)");
          } else {
            // If no rentable items with due dates, keep original items
            filteredItems = filteredItems.filter(
              (item) => item.category === "rentable"
            );
            console.log("📅 No rentable items with due dates found");
          }
          break;
        default:
          console.log("⚠️ Unknown sort option:", filters.sortBy);
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
      console.log(
        "🏷️ Filtered by category:",
        filters.category,
        "- Results:",
        filteredItems.length
      );
    }

    // Apply active rentals filter
    if (filters.isActiveRentals) {
      const isRentalPeriodActive = (
        end: Date | string | null | undefined
      ): boolean => {
        if (!end) return false;
        const endDate = new Date(end);
        const currentDate = new Date();

        // Check if the date is valid
        if (isNaN(endDate.getTime())) return false;

        // Set current date to start of day for accurate comparison
        currentDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        const days = Math.ceil(
          (endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return days >= 0; // Include today as active
      };

      filteredItems = filteredItems.filter(
        (item) =>
          item.category === "rentable" &&
          isRentalPeriodActive(item.rental_period_end)
      );
      console.log(
        "🏠 Filtered by active rentals - Results:",
        filteredItems.length
      );
    }

    console.log("✅ Final filtered results:", filteredItems.length);
    dispatch(setFilteredPianoListItems(filteredItems) as any);
  }, [items, filters, dispatch]);

  // Combined effect to handle both data loading and filtering
  // This prevents duplicate filtering when both items and filters change
  useEffect(() => {
    if (items && items.length > 0) {
      // Set items in redux store - original items
      dispatch(setPianoListItems(items) as any);

      // Schedule notifications for rental due dates
      // Only schedule if we haven't scheduled for this data recently
      const currentTime = Date.now();
      const timeSinceLastSchedule =
        currentTime - (parseInt(lastNotificationSchedule) || 0);

      // Only schedule if it's been more than 30 seconds since last schedule
      // This prevents excessive scheduling while still allowing updates
      if (timeSinceLastSchedule > 30000) {
        console.log(`Scheduling notifications for ${items.length} items`);
        scheduleAllRentalNotifications(items);
        setLastNotificationSchedule(currentTime.toString());
      } else {
        console.log("Skipping notification scheduling (recently scheduled)");
      }

      // Apply filters if any are set - only do this once when data is loaded
      if (
        filters.category ||
        filters.isActiveRentals ||
        filters.isSold ||
        filters.sortBy
      ) {
        applyFilters();
      } else {
        // No filters set, show all items
        dispatch(setFilteredPianoListItems(items) as any);
      }
    }
  }, [items, lastNotificationSchedule]); // Removed filters from dependencies to prevent duplicate calls

  // Separate effect for filter changes only (when items are already loaded)
  useEffect(() => {
    // Only run filtering if we have items and this is a filter change (not initial data load)
    if (
      items &&
      items.length > 0 &&
      (filters.category ||
        filters.isActiveRentals ||
        filters.isSold ||
        filters.sortBy)
    ) {
      applyFilters();
    } else if (items && items.length > 0) {
      // No filters set, show all items
      dispatch(setFilteredPianoListItems(items) as any);
    }
  }, [filters]); // Only depend on filters, not items

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
  const openMenu = (menuId: string) => setVisibleMenuId(menuId);
  const closeMenu = () => setVisibleMenuId(null);
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

      if (layoutView.card === "checked") {
        return (
          <CardItem
            item={item as PianoItem}
            index={index}
            visibleMenuId={visibleMenuId}
            openMenu={openMenu}
            closeMenu={closeMenu}
            onDelete={() => refetch()}
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
            visibleMenuId={visibleMenuId}
            openMenu={openMenu}
            closeMenu={closeMenu}
            onDelete={() => refetch()}
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
            visibleMenuId={visibleMenuId}
            openMenu={openMenu}
            closeMenu={closeMenu}
            onDelete={() => refetch()}
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
      refetch,
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
          <View className="w-14 h-15 flex items-center justify-center">
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

        {/* Export CSV Button */}
        {filteredPianoReduxItems.length > 0 && (
          <View className="mb-3">
            <TouchableOpacity
              onPress={handleExportCSV}
              className="bg-secondary/20 rounded-xl py-3 px-4 flex-row items-center justify-center space-x-2 border border-secondary/40"
              activeOpacity={0.7}
            >
              <Image
                source={icons.upload}
                className="w-5 h-5"
                tintColor="#FFA001"
              />
              <Text className="text-secondary font-psemibold text-base">
                Export to CSV
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
          ListEmptyComponent={() => (
            <EmptyState
              title="No Pianos Found"
              subtitle="No Pianos created yet"
            />
          )}
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
          ListEmptyComponent={() => (
            <EmptyState
              title="No Pianos Found"
              subtitle="No Pianos created yet"
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

export default Home;
