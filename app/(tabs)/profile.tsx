import { icons, images } from "@/constants";
import { useGlobalContext } from "@/context/GlobalProvider";
import { signOut } from "@/lib/appwrite";
import { RootState } from "@/redux/store";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";
import { Card } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import InfoBox from "../components/InfoBox";
import CustomButton from "../components/CustomButton";
import { PIANO_CATEGORY } from "../constants/Piano";
import { CATEGORY_COLORS } from "../../constants/colors";

const Profile = () => {
  const { user, setUser, setIsLogged } = useGlobalContext();
  const [modalVisible, setModalVisible] = useState(false);
  const items = useSelector((state: RootState) => state.pianos.items);

  const filterItemsByCategory = (category: string) => {
    return items.filter((item) => item.category === category).length;
  };

  // Calculate additional stats
  const calculateTotalValue = () => {
    return items.reduce((total, item) => {
      const price = item.event_purchase_price || item.on_sale_price || 0;
      return total + price;
    }, 0);
  };

  const calculateActiveRentals = () => {
    return items.filter((item) => 
      item.category === PIANO_CATEGORY.RENTABLE && 
      item.rental_period_end && 
      new Date(item.rental_period_end) > new Date()
    ).length;
  };

  const calculateRecentAdditions = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return items.filter((item) => 
      new Date(item.$createdAt) > thirtyDaysAgo
    ).length;
  };

  const calculateSoldThisMonth = () => {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    return items.filter((item) => 
      item.sold_date && new Date(item.sold_date) >= thisMonth
    ).length;
  };

  const rentableCount = filterItemsByCategory(PIANO_CATEGORY.RENTABLE);
  const eventsCount = filterItemsByCategory(PIANO_CATEGORY.EVENTS);
  const onSaleCount = filterItemsByCategory(PIANO_CATEGORY.ON_SALE);
  const warehouseCount = filterItemsByCategory(PIANO_CATEGORY.WAREHOUSE);

  const totalValue = calculateTotalValue();
  const activeRentals = calculateActiveRentals();
  const recentAdditions = calculateRecentAdditions();
  const soldThisMonth = calculateSoldThisMonth();

  const handleConfirmLogout = async () => {
    setModalVisible(false);
    await signOut();
    setUser(null);
    setIsLogged(false);
    router.replace("/sign-in");
  };

  const handleCancelLogout = () => {
    setModalVisible(false);
  };

  const showLogoutModal = () => {
    setModalVisible(true);
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center px-4 py-4">
          <Text className="text-white text-2xl font-pbold">Profile</Text>
          <TouchableOpacity
            onPress={showLogoutModal}
            className="bg-red-500 flex-row items-center px-4 py-2 rounded-xl shadow-lg"
            activeOpacity={0.8}
          >
            <Image
              source={icons.logout}
              resizeMode="contain"
              className="w-5 h-5 mr-2"
              tintColor="#ffffff"
            />
            <Text className="text-white font-psemibold text-sm">Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* User Info Section */}
        <View className="w-full flex justify-center items-center mt-6 mb-8 px-4">
          <View className="w-24 h-24 border-4 border-secondary rounded-full flex justify-center items-center mb-4">
            <Image
              source={{ uri: user?.avatar }}
              className="w-[90%] h-[90%] rounded-full"
              resizeMode="cover"
            />
          </View>

          <InfoBox
            title={user?.username || "User"}
            containerStyles="mt-2"
            titleStyles="text-xl font-pbold"
            subtitle={user?.email}
          />
        </View>

        {/* Stats Section */}
        <View className="px-4 mb-4">
          <Text className="text-white text-base font-psemibold mb-3">Your Stats</Text>

          {/* Main Stats Grid */}
          <View className="flex-row flex-wrap mb-3">
            {/* Total Pianos */}
            <View className="w-1/2 p-1">
              <View className="bg-primary-400 rounded-lg p-3 items-center shadow-md">
                <View className="bg-secondary rounded-full p-1.5 mb-1.5">
                  <Image
                    source={icons.card}
                    className="w-4 h-4"
                    tintColor="#161622"
                  />
                </View>
                <Text className="text-white text-center text-lg font-pbold">{items?.length || 0}</Text>
                <Text className="text-gray-100 text-center font-pregular text-xs">Total Pianos</Text>
              </View>
            </View>

            {/* Total Value */}
            <View className="w-1/2 p-1">
              <View className="bg-primary-400 rounded-lg p-3 items-center shadow-md">
                <View className="bg-green-500 rounded-full p-1.5 mb-1.5">
                  <Image
                    source={icons.upload}
                    className="w-4 h-4"
                    tintColor="#ffffff"
                  />
                </View>
                <Text className="text-white text-center text-base font-pbold">
                  ${totalValue.toLocaleString()}
                </Text>
                <Text className="text-gray-100 text-center font-pregular text-xs">Total Value</Text>
              </View>
            </View>

            {/* Active Rentals */}
            <View className="w-1/2 p-1">
              <View className="bg-primary-400 rounded-lg p-3 items-center shadow-md">
                <View className="bg-blue-500 rounded-full p-1.5 mb-1.5">
                  <Image
                    source={icons.eye}
                    className="w-4 h-4"
                    tintColor="#ffffff"
                  />
                </View>
                <Text className="text-white text-center text-lg font-pbold">{activeRentals}</Text>
                <Text className="text-gray-100 text-center font-pregular text-xs">Active Rentals</Text>
              </View>
            </View>

            {/* Recent Additions */}
            <View className="w-1/2 p-1">
              <View className="bg-primary-400 rounded-lg p-3 items-center shadow-md">
                <View className="bg-purple-500 rounded-full p-1.5 mb-1.5">
                  <Image
                    source={icons.plus}
                    className="w-4 h-4"
                    tintColor="#ffffff"
                  />
                </View>
                <Text className="text-white text-center text-lg font-pbold">{recentAdditions}</Text>
                <Text className="text-gray-100 text-center font-pregular text-xs">Added This Month</Text>
              </View>
            </View>
          </View>

          {/* Additional Stats Row */}
          <View className="bg-primary-400 rounded-lg p-3 mb-3">
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-white text-sm font-psemibold mb-0.5">This Month</Text>
                <Text className="text-gray-100 font-pregular text-xs">Sales & Activity</Text>
              </View>
              <View className="items-end">
                <Text className="text-secondary text-base font-pbold">{soldThisMonth}</Text>
                <Text className="text-gray-100 font-pregular text-xs">Pianos Sold</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Category Cards */}
        <View className="px-4 mb-6">
          <Text className="text-white text-lg font-psemibold mb-4">Piano Categories</Text>
          <View className="flex-row flex-wrap">
            <View className="w-1/2 p-2">
              <Card
                className="p-4 rounded-xl"
                elevation={5}
                style={{
                  backgroundColor: CATEGORY_COLORS.RENTABLE,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.8,
                  shadowRadius: 2,
                }}
              >
                <View className="flex-row items-center">
                  <Image
                    source={images.category_rentable}
                    className="w-12 h-12 rounded-lg mr-3"
                    resizeMode="cover"
                  />
                  <View>
                    <Text className="text-primary text-2xl font-pbold">{rentableCount}</Text>
                    <Text className="text-primary font-pregular">Rentable</Text>
                  </View>
                </View>
              </Card>
            </View>

            <View className="w-1/2 p-2">
              <Card
                className="p-4 rounded-xl"
                elevation={5}
                style={{
                  backgroundColor: CATEGORY_COLORS.EVENTS,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.8,
                  shadowRadius: 2,
                }}
              >
                <View className="flex-row items-center">
                  <Image
                    source={images.category_event}
                    className="w-12 h-12 rounded-lg mr-3"
                    resizeMode="cover"
                  />
                  <View>
                    <Text className="text-primary text-2xl font-pbold">{eventsCount}</Text>
                    <Text className="text-primary font-pregular">Events</Text>
                  </View>
                </View>
              </Card>
            </View>

            <View className="w-1/2 p-2">
              <Card
                className="p-4 rounded-xl"
                elevation={5}
                style={{
                  backgroundColor: CATEGORY_COLORS.ON_SALE,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.8,
                  shadowRadius: 2,
                }}
              >
                <View className="flex-row items-center">
                  <Image
                    source={images.category_sale}
                    className="w-12 h-12 rounded-lg mr-3"
                    resizeMode="cover"
                  />
                  <View>
                    <Text className="text-primary text-2xl font-pbold">{onSaleCount}</Text>
                    <Text className="text-primary font-pregular">On Sale</Text>
                  </View>
                </View>
              </Card>
            </View>

            <View className="w-1/2 p-2">
              <Card
                className="p-4 rounded-xl"
                elevation={5}
                style={{
                  backgroundColor: CATEGORY_COLORS.WAREHOUSE,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.8,
                  shadowRadius: 2,
                }}
              >
                <View className="flex-row items-center">
                  <Image
                    source={images.category_warehouse}
                    className="w-12 h-12 rounded-lg mr-3"
                    resizeMode="cover"
                  />
                  <View>
                    <Text className="text-primary text-2xl font-pbold">{warehouseCount}</Text>
                    <Text className="text-primary font-pregular">Warehouse</Text>
                  </View>
                </View>
              </Card>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Logout Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white rounded-2xl p-6 mx-4 w-full max-w-sm shadow-2xl">
            <View className="items-center mb-4">
              <View className="bg-red-100 p-3 rounded-full mb-3">
                <Image
                  source={icons.logout}
                  resizeMode="contain"
                  className="w-8 h-8"
                  tintColor="#ef4444"
                />
              </View>
              <Text className="text-xl font-pbold text-center mb-2 text-primary">
                Sign Out
              </Text>
              <Text className="text-base font-pregular text-center text-gray-600">
                Are you sure you want to sign out of your account?
              </Text>
            </View>
            <View className="flex-row justify-between mt-6">
              <TouchableOpacity
                onPress={handleCancelLogout}
                className="bg-gray-100 rounded-xl py-3 px-6 flex-1 mr-2 border border-gray-200"
                activeOpacity={0.7}
              >
                <Text className="text-gray-700 font-psemibold text-center">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmLogout}
                className="bg-red-500 rounded-xl py-3 px-6 flex-1 ml-2 shadow-lg"
                activeOpacity={0.8}
              >
                <Text className="text-white font-psemibold text-center">Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Profile;
