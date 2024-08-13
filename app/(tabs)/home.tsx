import {
  View,
  Text,
  FlatList,
  Image,
  RefreshControl,
  Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "@/constants";
import { getUserPianoEntries } from "@/lib/appwrite";

import { useGlobalContext } from "@/context/GlobalProvider";
import useAppwrite from "@/lib/useAppwrite";
import CardItem from "../components/CardItem";
import SearchInput from "../components/SearchInput";
import EmptyState from "../components/EmptyState";
import { useDispatch, useSelector } from "react-redux";
import { setPianoListItems } from "@/redux/pianos/actions";
import { SECONDARY_COLOR } from "@/constants/colors";
import FilterButton from "../components/FilterButton";
import { RootState } from "@/redux/store";
import { PianoItem } from "@/redux/pianos/types";
import GridItem from "../components/GridItem";
import ListItem from "../components/ListItem";

const Home = () => {
  const { user } = useGlobalContext();
  const { data: items, refetch } = useAppwrite(() =>
    getUserPianoEntries(user.accountId)
  );
  const pianoReduxItems: PianoItem[] = useSelector(
    (state: RootState) => state.pianos.items
  );
  const layoutView = useSelector(
    (state: RootState) => state.pianos.filters.layoutStatus
  );

  const [pianoItems, setPianoItems] = useState(items);

  const dispatch = useDispatch();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const [visibleMenuId, setVisibleMenuId] = useState<string | null>(null);

  const openMenu = (menuId: string) => setVisibleMenuId(menuId);
  const closeMenu = () => setVisibleMenuId(null);

  useEffect(() => {
    if (items.length > 0) {
      dispatch(setPianoListItems(items));
    }
  }, [items]);

  useEffect(() => {
    setPianoItems(pianoReduxItems);
  }, [pianoReduxItems]);

  return (
    <SafeAreaView className="bg-primary h-full">
      <View className="flex my-6 px-4 space-y-6">
        <View className="flex justify-between items-start flex-row">
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
