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
import { RootState } from "@/redux/store";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import CardItem from "../components/CardItem";
import EmptyState from "../components/EmptyState";
import FilterButton from "../components/FilterButton";
import GridItem from "../components/GridItem";
import ListItem from "../components/ListItem";
import SearchInput from "../components/SearchInput";

const Home = () => {
  const dispatch = useDispatch();

  const { user } = useGlobalContext();
  const { data: items, refetch } = useAppwrite(() =>
    getUserPianoEntries(user.accountId)
  );

  const [pianoItems, setPianoItems] = useState(items);
  const filteredPianoReduxItems: PianoItem[] = useSelector(
    (state: RootState) => state.pianos.filteredItems
  );
  const layoutView = useSelector(
    (state: RootState) => state.pianos.filters.layoutStatus
  );

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const [visibleMenuId, setVisibleMenuId] = useState<string | null>(null);

  const openMenu = (menuId: string) => setVisibleMenuId(menuId);
  const closeMenu = () => setVisibleMenuId(null);
  const filter: string = useSelector(
    (state: RootState) => state.pianos.filters.category
  );

  useEffect(() => {
    setPianoItems(filteredPianoReduxItems);
  }, [filter, filteredPianoReduxItems]);

  //set items in redux store on successful fetch API call
  useEffect(() => {
    if (items.length > 0) {
      //this will set the items in redux store - original items
      dispatch(setPianoListItems(items));

      //this will be used to show items according to filter on home screen
      dispatch(setFilteredPianoListItems(items));
    }
  }, [items]);

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
          <View className="w-14">
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
        />
      ) : (
        <FlatList
          data={pianoItems}
          keyExtractor={(item) => item.$id}
          renderItem={({ item }) => {
            if (layoutView.card === "checked") {
              return (
                <CardItem
                  item={item}
                  visibleMenuId={visibleMenuId}
                  openMenu={openMenu}
                  closeMenu={closeMenu}
                />
              );
            } else if (layoutView.list === "checked") {
              return (
                <ListItem
                  item={item}
                  visibleMenuId={visibleMenuId}
                  openMenu={openMenu}
                  closeMenu={closeMenu}
                />
              );
            } else {
              return null; // Render nothing if no view is checked
            }
          }}
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
