import { images } from "@/constants";
import { SECONDARY_COLOR } from "@/constants/colors";
import { useGlobalContext } from "@/context/GlobalProvider";
import { getUserPianoEntries } from "@/lib/appwrite";
import useAppwrite from "@/lib/useAppwrite";
import {
  setFilteredPianoListItems,
  setPianoListItems,
} from "@/redux/pianos/actions";
import { PianoItem } from "@/redux/pianos/types";
import { differenceInDays } from "date-fns";
import { SORT_BY_OPTIONS } from "../constants/Piano";
import { RootState } from "@/redux/store";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import CardItem from "../components/CardItem";
import EmptyState from "../components/EmptyState";
import FilterButton from "../components/FilterButton";
import GridItem from "../components/GridItem";
import ListItem from "../components/ListItem";
import SearchInput from "../components/SearchInput";
import { scheduleAllRentalNotifications } from "../services/notifications";
import NotificationTest from "../components/NotificationTest";

const Home = () => {
  const dispatch = useDispatch();

  const { user } = useGlobalContext();
  const fetchFunction = useCallback(
    () => getUserPianoEntries(user.accountId),
    [user.accountId]
  );
  const { data: items, refetch } = useAppwrite(fetchFunction);

  const [pianoItems, setPianoItems] = useState<PianoItem[]>(items);
  const filteredPianoReduxItems: PianoItem[] = useSelector(
    (state: RootState) => state.pianos.filteredItems
  );
  const layoutView = useSelector(
    (state: RootState) => state.pianos.filters.layoutStatus
  );
  const filters = useSelector((state: RootState) => state.pianos.filters);

  const [refreshing, setRefreshing] = useState(false);
  const [lastNotificationSchedule, setLastNotificationSchedule] =
    useState<string>("");
  const [showNotificationTest, setShowNotificationTest] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Refetch data when screen comes into focus (e.g., after publishing)
  useFocusEffect(
    React.useCallback(() => {
      refetch();
      // Note: Notification scheduling is handled in the main useEffect below
      // to prevent duplicate scheduling and infinite console logs
    }, [])
  );

  const [visibleMenuId, setVisibleMenuId] = useState<string | null>(null);

  const openMenu = (menuId: string) => setVisibleMenuId(menuId);
  const closeMenu = () => setVisibleMenuId(null);
  const filter: string = useSelector(
    (state: RootState) => state.pianos.filters.category
  );

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

    dispatch(setFilteredPianoListItems(filteredItems));
  }, [items, filters, dispatch]);

  useEffect(() => {
    setPianoItems(filteredPianoReduxItems);
  }, [filter, filteredPianoReduxItems]);

  useEffect(() => {
    if (filters.category || filters.isActiveRentals || filters.isSold) {
      applyFilters();
    }
  }, [filters, items]);

  //set items in redux store on successful fetch API call
  useEffect(() => {
    if (items && items.length > 0) {
      //this will set the items in redux store - original items
      dispatch(setPianoListItems(items));

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

      // Apply filters if any are set
      if (filters.category || filters.isActiveRentals || filters.isSold) {
        applyFilters();
      } else {
        //this will be used to show items according to filter on home screen
        dispatch(setFilteredPianoListItems(items));
      }
    }
  }, [items, lastNotificationSchedule]);

  const renderItem = useCallback(
    ({ item, index }: { item: PianoItem; index: number }) => {
      if (layoutView.card === "checked") {
        return (
          <CardItem
            item={item}
            index={index}
            visibleMenuId={visibleMenuId}
            openMenu={openMenu}
            closeMenu={closeMenu}
            onDelete={() => refetch()}
          />
        );
      } else if (layoutView.list === "checked") {
        return (
          <ListItem
            item={item}
            index={index}
            visibleMenuId={visibleMenuId}
            openMenu={openMenu}
            closeMenu={closeMenu}
            onDelete={() => refetch()}
          />
        );
      } else {
        return null; // Render nothing if no view is checked
      }
    },
    [layoutView, visibleMenuId, openMenu, closeMenu, refetch]
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
          <View className="mt-1.5">
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
            {pianoItems.length === 0
              ? "No Pianos"
              : `${pianoItems.length} ${
                  pianoItems.length === 1 ? "Piano" : "Pianos"
                }`}
          </Text>
        </View>
      </View>

      {layoutView.grid === "checked" ? (
        <GridItem
          item={pianoItems}
          visibleMenuId={visibleMenuId}
          openMenu={openMenu}
          closeMenu={closeMenu}
          onDelete={() => refetch()}
        />
      ) : (
        <FlatList
          data={pianoItems}
          keyExtractor={(item) => item.$id}
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
