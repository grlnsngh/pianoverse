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
import ListCard from "../components/ListCard";
import SearchInput from "../components/SearchInput";
import EmptyState from "../components/EmptyState";
import { useDispatch } from "react-redux";
import { setPianoListItems } from "@/redux/pianos/actions";
import { SECONDARY_COLOR } from "@/constants/colors";
import FilterButton from "../components/FilterButton";

const Home = () => {
  const { user } = useGlobalContext();
  const { data: items, refetch } = useAppwrite(() =>
    getUserPianoEntries(user.accountId)
  );

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
      <FlatList
        data={items}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => (
          <ListCard
            item={item}
            visibleMenuId={visibleMenuId}
            openMenu={openMenu}
            closeMenu={closeMenu}
          />
        )}
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
    </SafeAreaView>
  );
};

export default Home;
