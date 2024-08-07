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

const Home = () => {
  const { user } = useGlobalContext();
  const { data: items, refetch } = useAppwrite(() =>
    getUserPianoEntries(user.accountId)
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

  return (
    <SafeAreaView className="bg-primary h-full">
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
        ListHeaderComponent={() => (
          <View className="flex my-6 px-4 space-y-6">
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
                  tintColor="#FFA001"
                />
              </View>
            </View>
            <SearchInput />

            {/* <View className="w-full flex-1 pt-5 pb-8">
              <Text className="text-lg font-pregular text-gray-100 mb-3">
                Latest Videos
              </Text>

              <Trending
                posts={posts ? [{ id: 1 }, { id: 2 }, { id: 3 }] : []}
              />
            </View> */}
          </View>
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
