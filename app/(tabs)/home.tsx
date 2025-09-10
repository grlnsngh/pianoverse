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

const Home = () => {
  const dispatch = useDispatch();

  const { user } = useGlobalContext();
  const fetchFunction = useCallback(
    () => getUserPianoEntries(user.accountId),
    [user.accountId]
  );
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

  const handleToggleBulkSelection = () => {
    dispatch(setBulkSelectionMode(!isBulkSelectionMode) as any);
  };

  const handleToggleItemSelection = (itemId: string) => {
    dispatch(toggleItemSelection(itemId) as any);
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredPianoReduxItems.length) {
      dispatch(clearSelectedItems() as any);
    } else {
      const allIds = filteredPianoReduxItems.map((item) => item.$id);
      dispatch(selectAllItems(allIds) as any);
    }
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
    let filteredItems: PianoItem[] = items.slice();

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
          filteredItems = sortItems(filteredItems, (a, b) =>
            a.title.localeCompare(b.title)
          );
          break;
        case SORT_BY_OPTIONS.TITLE_DES:
          filteredItems = sortItems(filteredItems, (a, b) =>
            b.title.localeCompare(a.title)
          );
          break;
        case SORT_BY_OPTIONS.LATEST_ADDED:
          filteredItems = sortItems(
            filteredItems,
            (a, b) =>
              new Date(b.$createdAt).getTime() -
              new Date(a.$createdAt).getTime()
          );
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
          break;
        case SORT_BY_OPTIONS.DUE_DATE:
          // Only apply DUE_DATE sorting if category is rentable or no category selected
          if (
            !filters.category ||
            filters.category === "rentable" ||
            filters.category === "Rentable"
          ) {
            filteredItems = sortItems(
              filteredItems.filter(
                (item) => item.category === "rentable" && item.rental_period_end
              ),
              (a, b) => {
                const dateA = a.rental_period_end
                  ? new Date(a.rental_period_end).getTime()
                  : 0;
                const dateB = b.rental_period_end
                  ? new Date(b.rental_period_end).getTime()
                  : 0;
                return dateB - dateA;
              }
            );
          }
          break;
        default:
          break;
      }
    }

    // Apply category filter
    if (filters.category) {
      const formattedFilter = filters.category
        .replace(/\s+/g, "_")
        .toLowerCase();

      filteredItems = filteredItems.filter(
        (item) => item.category === formattedFilter
      );
    }

    // Apply active rentals filter
    if (filters.isActiveRentals) {
      const isRentalPeriodActive = (end: Date | null | undefined): boolean => {
        if (!end) return false;
        const endDate = new Date(end);
        const currentDate = new Date();
        const days = differenceInDays(endDate, currentDate);
        return days > -1;
      };

      filteredItems = filteredItems.filter((item) =>
        isRentalPeriodActive(item.rental_period_end)
      );
    }

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
      if (filters.category || filters.isActiveRentals || filters.isSold) {
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
      (filters.category || filters.isActiveRentals || filters.isSold)
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
            <TouchableOpacity
              onPress={handleToggleBulkSelection}
              className="mr-3 px-3 py-2 rounded-lg bg-secondary"
              activeOpacity={0.8}
            >
              <Text className="text-primary font-psemibold text-sm">
                {isBulkSelectionMode ? "Cancel" : "Select"}
              </Text>
            </TouchableOpacity>
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
