import { icons, images } from "@/constants";
import { useGlobalContext } from "@/context/GlobalProvider";
import { signOut } from "@/lib/appwrite";
import { setPianoFilters } from "@/redux/pianos/actions";
import { FiltersType } from "@/redux/pianos/types";
import { RootState } from "@/redux/store";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState, useRef, useEffect } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { PieChart } from "react-native-chart-kit";
import CustomButton from "../components/CustomButton";
import { PIANO_CATEGORY, DEFAULT_FILTERS } from "../constants/Piano";
import { CATEGORY_COLORS } from "../../constants/colors";
import { exportPianosToCSV } from "@/utils/csvExport";

const Profile = () => {
  const dispatch = useDispatch();
  const { user, setUser, setIsLogged } = useGlobalContext();
  const [modalVisible, setModalVisible] = useState(false);
  const items = useSelector((state: RootState) => state.pianos.items);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const statsFadeAnim = useRef(new Animated.Value(0)).current;
  const categoryFadeAnim = useRef(new Animated.Value(0)).current;

  // Loading animation
  const loadingAnim = useRef(new Animated.Value(0)).current;
  const [isLoading, setIsLoading] = useState(true);

  // Simulate data loading (replace with actual data fetching)
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        // Simulate API call or data processing
        await new Promise((resolve) => setTimeout(resolve, 800));

        setIsLoading(false);

        // Start animations after data is loaded
        const loadingAnimation = Animated.loop(
          Animated.timing(loadingAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          })
        );
        loadingAnimation.start();

        // Start main animations
        Animated.parallel([
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
        ]).start();

        return () => loadingAnimation.stop();
      } catch (error) {
        console.error("Error loading profile data:", error);
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, []);

  // Loading animation
  useEffect(() => {
    const loadingAnimation = Animated.loop(
      Animated.timing(loadingAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      })
    );
    loadingAnimation.start();

    // Simulate loading time and then show content
    const timer = setTimeout(() => {
      setIsLoading(false);
      loadingAnimation.stop();

      // Start main animations after loading
      Animated.parallel([
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
      ]).start();
    }, 500); // Reduced from 2000ms to 500ms

    return () => {
      clearTimeout(timer);
      loadingAnimation.stop();
    };
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
    return items.filter(
      (item) =>
        item.category === PIANO_CATEGORY.RENTABLE &&
        item.rental_period_end &&
        new Date(item.rental_period_end) > new Date()
    ).length;
  };

  const calculateRecentAdditions = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return items.filter((item) => new Date(item.$createdAt) > thirtyDaysAgo)
      .length;
  };

  const calculateSoldThisMonth = () => {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    return items.filter(
      (item) => item.sold_date && new Date(item.sold_date) >= thisMonth
    ).length;
  };

  const rentableCount = filterItemsByCategory(PIANO_CATEGORY.RENTABLE);
  const eventsCount = filterItemsByCategory(PIANO_CATEGORY.EVENTS);
  const onSaleCount = filterItemsByCategory(PIANO_CATEGORY.ON_SALE);
  const warehouseCount = filterItemsByCategory(PIANO_CATEGORY.WAREHOUSE);

  // Prepare pie chart data with percentages
  const totalItems = rentableCount + eventsCount + onSaleCount + warehouseCount;
  const pieChartData = [
    {
      name: "Rentable",
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
      count: warehouseCount,
      percentage:
        totalItems > 0 ? Math.round((warehouseCount / totalItems) * 100) : 0,
      color: CATEGORY_COLORS.WAREHOUSE,
      legendFontColor: "#FFF",
      legendFontSize: 12,
      icon: images.category_warehouse,
    },
  ].filter((item) => item.count > 0); // Only show categories with items

  const totalValue = calculateTotalValue();
  const activeRentals = calculateActiveRentals();
  const recentAdditions = calculateRecentAdditions();
  const soldThisMonth = calculateSoldThisMonth();

  const handleConfirmLogout = async () => {
    setModalVisible(false);
    await signOut();
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

  const navigateToHomeWithFilter = (category: string) => {
    const filters: FiltersType = {
      ...DEFAULT_FILTERS,
      category: category,
    };
    dispatch(setPianoFilters(filters) as any);
    router.push("/home");
  };

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
      {isLoading ? (
        /* Loading Screen */
        <View className="flex-1 justify-center items-center">
          <Animated.View
            style={{
              transform: [
                {
                  rotate: loadingAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
            }}
          >
            <View className="bg-secondary rounded-full p-4">
              <Image
                source={icons.profile}
                className="w-12 h-12"
                tintColor="#161622"
              />
            </View>
          </Animated.View>
          <Text className="text-white text-lg font-psemibold mt-4">
            Loading Profile...
          </Text>
          <Text className="text-gray-100 text-sm font-pregular mt-2">
            Preparing your piano collection
          </Text>
        </View>
      ) : (
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
                  <View className="w-20 h-20 border-3 border-secondary rounded-full flex justify-center items-center mr-4">
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
              <Text className="text-white text-xl font-pbold mb-4">
                Overview
              </Text>

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
                      router.push("/create");
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
                          {items?.length || 0}
                        </Text>
                        <Text className="text-gray-400 text-sm font-pmedium">
                          Total Pianos
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
                          THIS MONTH
                        </Text>
                        <Text className="text-white text-base font-psemibold">
                          {recentAdditions} piano
                          {recentAdditions !== 1 ? "s" : ""} added recently
                        </Text>
                      </View>
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
                        onPress={() =>
                          navigateToHomeWithFilter(
                            item.name === "Rented Out"
                              ? "Rentable"
                              : item.name === "Storage"
                              ? "Warehouse"
                              : item.name === "Events"
                              ? "Events"
                              : "On Sale"
                          )
                        }
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
                    onPress={() => router.push("/home")}
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
                    onPress={() => router.push("/create")}
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
                      onPress={() => {
                        const filters: FiltersType = {
                          ...DEFAULT_FILTERS,
                          category: "Rentable",
                          isActiveRentals: true,
                        };
                        dispatch(setPianoFilters(filters) as any);
                        router.push("/home");
                      }}
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
      )}

      {/* Logout Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60">
          <Animated.View className="bg-primary-100 rounded-3xl p-8 mx-6 w-full max-w-sm shadow-2xl border border-primary-200">
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
