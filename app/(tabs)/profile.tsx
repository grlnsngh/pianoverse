import { icons, images } from "@/constants";
import { useGlobalContext } from "@/context/GlobalProvider";
import { signOut } from "@/lib/appwrite";
import { clearPianoCache } from "@/lib/pianoCache";
import useRentReceived from "@/lib/useRentReceived";
import { setActiveTab } from "@/redux/navigation/actions";
import { resetPianoState, setPianoFilters } from "@/redux/pianos/actions";
import { scheduleAllRentalNotifications } from "@/services/notifications";
import { FiltersType } from "@/redux/pianos/types";
import { RootState } from "@/redux/store";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState, useRef, useEffect } from "react";
import {
  Alert,
  Modal,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { PIANO_CATEGORY } from "@/constants/Piano";
import { CATEGORY_COLORS } from "@/constants/colors";
import { exportPianosToCSV } from "@/utils/csvExport";
import { formatRupees } from "@/utils/money";
import { isCurrentlyRented, isOverdue, isSold } from "@/utils/pianoStatus";
import { rentFromActiveRentals, salesInMonth } from "@/utils/stats";
import { clearFilters } from "@/utils/filters";

const Profile = () => {
  const dispatch = useDispatch();
  const { user, setUser, setIsLogged } = useGlobalContext();
  const [modalVisible, setModalVisible] = useState(false);
  const items = useSelector((state: RootState) => state.pianos.items);
  const filters = useSelector((state: RootState) => state.pianos.filters);
  const received = useRentReceived();

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const statsFadeAnim = useRef(new Animated.Value(0)).current;
  const categoryFadeAnim = useRef(new Animated.Value(0)).current;

  // Fade the sections in once. The data is already in the store, so there's
  // nothing to wait for first.
  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(statsFadeAnim, {
        toValue: 1,
        duration: 1000,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(categoryFadeAnim, {
        toValue: 1,
        duration: 1000,
        delay: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    entrance.start();
    return () => entrance.stop();
  }, []);

  // Button press animation
  const animateButtonPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Sold pianos are no longer part of the stock
  const stock = items.filter((item) => !isSold(item));

  const filterItemsByCategory = (category: string) => {
    return stock.filter((item) => item.category === category).length;
  };

  // Calculate additional stats
  const calculateActiveRentals = () => {
    return items.filter(isCurrentlyRented).length;
  };

  const calculateRecentAdditions = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return items.filter((item) => new Date(item.$createdAt) > thirtyDaysAgo)
      .length;
  };

  const rentableCount = filterItemsByCategory(PIANO_CATEGORY.RENTABLE);
  const eventsCount = filterItemsByCategory(PIANO_CATEGORY.EVENTS);
  const onSaleCount = filterItemsByCategory(PIANO_CATEGORY.ON_SALE);
  const warehouseCount = filterItemsByCategory(PIANO_CATEGORY.WAREHOUSE);

  // Prepare pie chart data with percentages. `filter` is the category Home
  // shows when a row is tapped.
  const totalItems = rentableCount + eventsCount + onSaleCount + warehouseCount;
  const pieChartData = [
    {
      name: "Rentable",
      filter: "Rentable",
      count: rentableCount,
      percentage:
        totalItems > 0 ? Math.round((rentableCount / totalItems) * 100) : 0,
      color: CATEGORY_COLORS.RENTABLE,
      legendFontColor: "#FFF",
      legendFontSize: 12,
      icon: images.category_rentable,
    },
    {
      name: "Events",
      filter: "Events",
      count: eventsCount,
      percentage:
        totalItems > 0 ? Math.round((eventsCount / totalItems) * 100) : 0,
      color: CATEGORY_COLORS.EVENTS,
      legendFontColor: "#FFF",
      legendFontSize: 12,
      icon: images.category_event,
    },
    {
      name: "On Sale",
      filter: "On Sale",
      count: onSaleCount,
      percentage:
        totalItems > 0 ? Math.round((onSaleCount / totalItems) * 100) : 0,
      color: CATEGORY_COLORS.ON_SALE,
      legendFontColor: "#FFF",
      legendFontSize: 12,
      icon: images.category_sale,
    },
    {
      name: "Storage",
      filter: "Warehouse",
      count: warehouseCount,
      percentage:
        totalItems > 0 ? Math.round((warehouseCount / totalItems) * 100) : 0,
      color: CATEGORY_COLORS.WAREHOUSE,
      legendFontColor: "#FFF",
      legendFontSize: 12,
      icon: images.category_warehouse,
    },
  ].filter((item) => item.count > 0); // Only show categories with items

  const activeRentals = calculateActiveRentals();
  const activeRent = rentFromActiveRentals(items);
  const salesThisMonth = salesInMonth(items);
  const overdueCount = items.filter(isOverdue).length;

  const showOverdueRentals = () => showOnHome({ isOverdue: true });
  const recentAdditions = calculateRecentAdditions();

  const handleConfirmLogout = async () => {
    setModalVisible(false);
    try {
      await signOut();
    } catch (error) {
      Alert.alert(
        "Sign Out Failed",
        error instanceof Error ? error.message : "Please try again."
      );
      return;
    }
    // Don't leave this account's pianos or reminders behind for the next user
    await scheduleAllRentalNotifications([]);
    await clearPianoCache();
    dispatch(resetPianoState() as any);
    dispatch(setActiveTab("home") as any);
    setUser(null);
    setIsLogged(false);
    router.replace("/");
  };

  const handleCancelLogout = () => {
    setModalVisible(false);
  };

  const showLogoutModal = () => {
    setModalVisible(true);
  };

  const handleExportCSV = async () => {
    await exportPianosToCSV(items);
  };

  // Shortcuts to Home start from the default filters but keep the chosen
  // layout (card, list or grid)
  const showOnHome = (shortcutFilters: Partial<FiltersType>) => {
    dispatch(
      setPianoFilters({ ...clearFilters(filters), ...shortcutFilters }) as any
    );
    dispatch(setActiveTab("home") as any);
  };

  const navigateToHomeWithFilter = (category: string) =>
    showOnHome({ category });

  const formatMemberSince = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateMembershipDuration = (dateString: string) => {
    const joinDate = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - joinDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""}`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months !== 1 ? "s" : ""}`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years !== 1 ? "s" : ""}`;
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <ScrollView className="flex-1">
          {/* Header */}
          <View className="flex-row justify-between items-center px-4 py-4">
            <Text className="text-white text-2xl font-pbold">Profile</Text>
            <TouchableOpacity
              onPress={() => {
                animateButtonPress();
                showLogoutModal();
              }}
              className="bg-red-500 flex-row items-center px-4 py-2 rounded-xl shadow-lg"
              activeOpacity={0.8}
            >
              <Image
                source={icons.logout}
                resizeMode="contain"
                className="w-5 h-5 mr-2"
                tintColor="#ffffff"
              />
              <Text className="text-white font-psemibold text-sm">
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>

          {/* User Info Section */}
          <View className="w-full px-4 mt-6 mb-8">
            <View className="bg-primary-400 rounded-2xl p-6 shadow-lg">
              <View className="flex-row items-center">
                {/* Profile Picture */}
                <View className="w-20 h-20 border-2 border-secondary rounded-full flex justify-center items-center mr-4">
                  <Image
                    source={{ uri: user?.avatar }}
                    className="w-[90%] h-[90%] rounded-full"
                    resizeMode="cover"
                  />
                </View>

                {/* User Details */}
                <View className="flex-1">
                  <Text className="text-white text-xl font-pbold mb-1">
                    {user?.username || "User"}
                  </Text>
                  <Text className="text-gray-100 text-sm font-pregular mb-2">
                    {user?.email}
                  </Text>

                  {/* Member Since Info */}
                  {user?.$createdAt && (
                    <View className="flex-row items-center">
                      <View className="bg-secondary rounded-full p-1 mr-2">
                        <Image
                          source={icons.profile}
                          className="w-3 h-3"
                          tintColor="#161622"
                        />
                      </View>
                      <Text className="text-secondary text-xs font-pmedium">
                        Member for{" "}
                        {calculateMembershipDuration(user.$createdAt)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Join Date */}
              {user?.$createdAt && (
                <View className="mt-4 pt-4 border-t border-gray-600">
                  <Text className="text-gray-100 text-xs font-pregular">
                    Joined {formatMemberSince(user.$createdAt)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Export CSV Button */}
          {items.length > 0 && (
            <View className="px-4 mb-4">
              <TouchableOpacity
                onPress={handleExportCSV}
                className="bg-secondary/20 rounded-xl py-4 px-4 flex-row items-center justify-center space-x-2 border border-secondary/40"
                activeOpacity={0.7}
              >
                <Image
                  source={icons.upload}
                  className="w-5 h-5"
                  tintColor="#FFA001"
                />
                <Text className="text-secondary font-psemibold text-base ml-2">
                  Download Piano List
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Stats Section */}
          <Animated.View
            className="px-4 mb-6"
            style={{
              opacity: statsFadeAnim,
              transform: [
                {
                  translateY: statsFadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            }}
          >
            <Text className="text-white text-xl font-pbold mb-4">Overview</Text>

            {items.length === 0 ? (
              /* Empty State for No Pianos */
              <View className="bg-black-100/50 rounded-2xl p-8 items-center">
                <View className="bg-secondary/20 rounded-full p-6 mb-4">
                  <Image
                    source={icons.card}
                    className="w-16 h-16"
                    tintColor="#FFA001"
                  />
                </View>
                <Text className="text-white text-xl font-pbold mb-2">
                  No Pianos Yet
                </Text>
                <Text className="text-gray-400 text-center text-base font-pregular mb-6 px-4">
                  Start managing your piano inventory by adding your first
                  instrument
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    animateButtonPress();
                    dispatch(setActiveTab("create") as any);
                  }}
                  className="bg-secondary rounded-xl px-8 py-4 flex-row items-center shadow-lg"
                  activeOpacity={0.8}
                >
                  <Image
                    source={icons.plus}
                    className="w-6 h-6 mr-2"
                    tintColor="#161622"
                  />
                  <Text className="text-primary font-pbold text-base">
                    Add Your First Piano
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Quick Stats - Simplified */}
                <View className="bg-black-100/50 rounded-2xl p-5 mb-4">
                  <View className="flex-row items-center justify-between mb-6">
                    <View className="flex-1 items-center">
                      <Text className="text-4xl font-pbold text-secondary mb-1">
                        {stock.length}
                      </Text>
                      <Text className="text-gray-400 text-sm font-pmedium">
                        In Stock
                      </Text>
                    </View>

                    <View className="w-px h-16 bg-gray-700 mx-4" />

                    <View className="flex-1 items-center">
                      <Text className="text-4xl font-pbold text-green-400 mb-1">
                        {activeRentals}
                      </Text>
                      <Text className="text-gray-400 text-sm font-pmedium">
                        Currently Rented
                      </Text>
                    </View>
                  </View>

                  {/* Recent Activity */}
                  {recentAdditions > 0 && (
                    <View className="pt-4 border-t border-gray-700">
                      <Text className="text-gray-400 text-xs font-pmedium mb-2">
                        LAST 30 DAYS
                      </Text>
                      <Text className="text-white text-base font-psemibold">
                        {recentAdditions} piano
                        {recentAdditions !== 1 ? "s" : ""} added recently
                      </Text>
                    </View>
                  )}
                </View>

                {/* Income */}
                <View className="bg-black-100/50 rounded-2xl p-5 mb-4">
                  <Text className="text-gray-400 text-xs font-pmedium mb-3">
                    INCOME
                  </Text>
                  <View className="flex-row">
                    <View className="flex-1">
                      <Text className="text-2xl font-pbold text-secondary">
                        {received.loaded ? formatRupees(received.total) : "—"}
                      </Text>
                      <Text className="text-gray-400 text-sm font-pmedium">
                        Received this month
                      </Text>
                      {received.failed && (
                        <Text className="text-gray-500 text-xs font-pregular">
                          Couldn't load payments
                        </Text>
                      )}
                      {received.loaded && (
                        <Text className="text-gray-500 text-xs font-pregular">
                          {received.count} payment
                          {received.count === 1 ? "" : "s"}
                        </Text>
                      )}
                    </View>
                    <View className="w-px bg-gray-700 mx-4" />
                    <View className="flex-1">
                      <Text className="text-2xl font-pbold text-green-400">
                        {formatRupees(salesThisMonth.total)}
                      </Text>
                      <Text className="text-gray-400 text-sm font-pmedium">
                        {salesThisMonth.count} sold this month
                      </Text>
                    </View>
                  </View>

                  <View className="mt-4 pt-4 border-t border-gray-700 flex-row items-center justify-between">
                    <Text className="text-gray-400 text-sm font-pmedium">
                      Rent from {activeRentals} active rental
                      {activeRentals === 1 ? "" : "s"}
                    </Text>
                    <Text className="text-white font-psemibold">
                      {formatRupees(activeRent)}
                    </Text>
                  </View>

                  {overdueCount > 0 && (
                    <TouchableOpacity
                      onPress={showOverdueRentals}
                      className="mt-4 pt-4 border-t border-gray-700 flex-row items-center justify-between"
                      activeOpacity={0.7}
                    >
                      <Text className="text-red-300 font-pmedium">
                        {overdueCount}{" "}
                        {overdueCount === 1 ? "rental is" : "rentals are"}{" "}
                        overdue
                      </Text>
                      <Text className="text-red-300 font-psemibold">View</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Category Breakdown - Simplified */}
                <View className="space-y-3">
                  <Text className="text-white text-lg font-pbold mb-1">
                    By Category
                  </Text>

                  {pieChartData.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => navigateToHomeWithFilter(item.filter)}
                      className="bg-black-100/50 rounded-xl p-4 flex-row items-center justify-between"
                      activeOpacity={0.7}
                    >
                      <View className="flex-row items-center flex-1">
                        <View
                          className="w-12 h-12 rounded-full items-center justify-center mr-4"
                          style={{ backgroundColor: `${item.color}20` }}
                        >
                          <Image
                            source={item.icon}
                            className="w-6 h-6"
                            tintColor={item.color}
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white text-base font-psemibold mb-1">
                            {item.name}
                          </Text>
                          <View className="flex-row items-center">
                            <View className="bg-gray-700 rounded-full h-2 flex-1 mr-3">
                              <View
                                className="h-2 rounded-full"
                                style={{
                                  width: `${item.percentage}%`,
                                  backgroundColor: item.color,
                                }}
                              />
                            </View>
                            <Text className="text-gray-400 text-sm font-pmedium w-12">
                              {item.percentage}%
                            </Text>
                          </View>
                        </View>
                        <View className="items-end ml-2">
                          <Text className="text-2xl font-pbold text-white">
                            {item.count}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View
            className="px-4 mb-6"
            style={{
              opacity: categoryFadeAnim,
              transform: [
                {
                  translateY: categoryFadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            }}
          >
            <Text className="text-white text-lg font-pbold mb-4">
              Quick Actions
            </Text>

            {items.length === 0 ? (
              <View className="bg-black-100/50 rounded-xl p-6 items-center">
                <Text className="text-gray-400 text-center text-sm font-pregular">
                  Actions will appear here once you add pianos
                </Text>
              </View>
            ) : (
              <View className="space-y-3">
                <TouchableOpacity
                  // Every piano, not whatever Home was last filtered to
                  onPress={() => showOnHome({})}
                  className="bg-secondary/20 border border-secondary/40 rounded-xl p-4 flex-row items-center justify-between"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-secondary/20 rounded-full items-center justify-center mr-3">
                      <Image
                        source={icons.eye}
                        className="w-5 h-5"
                        tintColor="#FFA001"
                      />
                    </View>
                    <Text className="text-white text-base font-psemibold">
                      View All Pianos
                    </Text>
                  </View>
                  <Image
                    source={icons.rightArrow}
                    className="w-5 h-5"
                    tintColor="#FFA001"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => dispatch(setActiveTab("create") as any)}
                  className="bg-secondary/20 border border-secondary/40 rounded-xl p-4 flex-row items-center justify-between"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-secondary/20 rounded-full items-center justify-center mr-3">
                      <Image
                        source={icons.plus}
                        className="w-5 h-5"
                        tintColor="#FFA001"
                      />
                    </View>
                    <Text className="text-white text-base font-psemibold">
                      Add New Piano
                    </Text>
                  </View>
                  <Image
                    source={icons.rightArrow}
                    className="w-5 h-5"
                    tintColor="#FFA001"
                  />
                </TouchableOpacity>

                {activeRentals > 0 && (
                  <TouchableOpacity
                    onPress={() =>
                      showOnHome({
                        category: "Rentable",
                        isActiveRentals: true,
                      })
                    }
                    className="bg-green-500/20 border border-green-500/40 rounded-xl p-4 flex-row items-center justify-between"
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center">
                      <View className="w-10 h-10 bg-green-500/20 rounded-full items-center justify-center mr-3">
                        <Image
                          source={icons.bookmark}
                          className="w-5 h-5"
                          tintColor="#22C55E"
                        />
                      </View>
                      <Text className="text-white text-base font-psemibold">
                        Active Rentals
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <View className="bg-green-500 rounded-full px-3 py-1 mr-2">
                        <Text className="text-white text-sm font-pbold">
                          {activeRentals}
                        </Text>
                      </View>
                      <Image
                        source={icons.rightArrow}
                        className="w-5 h-5"
                        tintColor="#22C55E"
                      />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </Animated.View>

      {/* Logout Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-6">
          <Animated.View className="bg-primary-100 rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-primary-200">
            <View className="items-center mb-6">
              <View className="bg-secondary-100/20 p-4 rounded-full mb-4 border border-secondary-100/30">
                <Image
                  source={icons.logout}
                  resizeMode="contain"
                  className="w-10 h-10"
                  tintColor="#FF9C01"
                />
              </View>
              <Text className="text-2xl font-pbold text-center mb-3 text-white">
                Sign Out
              </Text>
              <Text className="text-base font-pregular text-center text-gray-100 leading-6">
                Are you sure you want to sign out of your account? You'll need
                to sign in again to access your pianos.
              </Text>
            </View>
            <View className="flex-row justify-between mt-8 space-x-3">
              <TouchableOpacity
                onPress={handleCancelLogout}
                className="bg-primary-200/50 rounded-2xl py-4 px-6 flex-1 border border-primary-300/30"
                activeOpacity={0.7}
              >
                <Text className="text-gray-100 font-psemibold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmLogout}
                className="bg-secondary-100 rounded-2xl py-4 px-6 flex-1 shadow-lg border border-secondary-200/50"
                activeOpacity={0.8}
              >
                <Text className="text-primary-100 font-psemibold text-center">
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Profile;
