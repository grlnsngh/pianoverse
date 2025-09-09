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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import CustomButton from "../components/CustomButton";
import { PIANO_CATEGORY, DEFAULT_FILTERS } from "../constants/Piano";
import { CATEGORY_COLORS } from "../../constants/colors";

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

  // Category card pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Individual stat card animations
  const statCardAnim1 = useRef(new Animated.Value(0)).current;
  const statCardAnim2 = useRef(new Animated.Value(0)).current;
  const statCardAnim3 = useRef(new Animated.Value(0)).current;
  const statCardAnim4 = useRef(new Animated.Value(0)).current;

  // Loading animation
  const loadingAnim = useRef(new Animated.Value(0)).current;
  const [isLoading, setIsLoading] = useState(true);

  // Simulate data loading (replace with actual data fetching)
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        // Simulate API call or data processing
        await new Promise(resolve => setTimeout(resolve, 800));

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
          Animated.stagger(200, [
            Animated.timing(statCardAnim1, {
              toValue: 1,
              duration: 600,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(statCardAnim2, {
              toValue: 1,
              duration: 600,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(statCardAnim3, {
              toValue: 1,
              duration: 600,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(statCardAnim4, {
              toValue: 1,
              duration: 600,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]).start();

        return () => loadingAnimation.stop();
      } catch (error) {
        console.error('Error loading profile data:', error);
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, []);

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
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
        Animated.stagger(200, [
          Animated.timing(statCardAnim1, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(statCardAnim2, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(statCardAnim3, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(statCardAnim4, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
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

  const navigateToHomeWithFilter = (category: string) => {
    const filters: FiltersType = {
      ...DEFAULT_FILTERS,
      category: category,
    };
    dispatch(setPianoFilters(filters));
    router.push('/home');
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
            <Text className="text-white font-psemibold text-sm">Sign Out</Text>
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
                      Member for {calculateMembershipDuration(user.$createdAt)}
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

        {/* Stats Section */}
        <Animated.View
          className="px-4 mb-4"
          style={{
            opacity: statsFadeAnim,
            transform: [{
              translateY: statsFadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            }],
          }}
        >
          <Text className="text-white text-base font-psemibold mb-3">
            Your Stats
          </Text>

          {items.length === 0 ? (
            /* Empty State for No Pianos */
            <View className="bg-primary-400 rounded-xl p-6 items-center">
              <View className="bg-secondary bg-opacity-20 rounded-full p-4 mb-4">
                <Image
                  source={icons.card}
                  className="w-12 h-12"
                  tintColor="#FF9C01"
                />
              </View>
              <Text className="text-white text-lg font-psemibold mb-2">
                No Pianos Yet
              </Text>
              <Text className="text-gray-100 text-center text-sm font-pregular mb-4">
                Start building your piano collection by adding your first
                instrument
              </Text>
              <TouchableOpacity
                onPress={() => {
                  animateButtonPress();
                  // Navigate to create screen
                  router.push("/create");
                }}
                className="bg-secondary rounded-xl px-6 py-3 flex-row items-center"
                activeOpacity={0.8}
              >
                <Image
                  source={icons.plus}
                  className="w-5 h-5 mr-2"
                  tintColor="#161622"
                />
                <Text className="text-primary font-psemibold">
                  Add First Piano
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Main Stats Grid */}
              <View className="flex-row flex-wrap mb-3">
                {/* Total Pianos */}
                <View className="w-1/2 p-1">
                  <Animated.View
                    className="bg-primary-400 rounded-lg p-3 items-center shadow-md"
                    style={{
                      opacity: statCardAnim1,
                      transform: [
                        {
                          translateY: statCardAnim1.interpolate({
                            inputRange: [0, 1],
                            outputRange: [30, 0],
                          }),
                        },
                        {
                          scale: statCardAnim1.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        },
                      ],
                    }}
                  >
                    <View className="bg-secondary rounded-full p-1.5 mb-1.5">
                      <Image
                        source={icons.card}
                        className="w-4 h-4"
                        tintColor="#161622"
                      />
                    </View>
                    <Text className="text-white text-center text-lg font-pbold">
                      {items?.length || 0}
                    </Text>
                    <Text className="text-gray-100 text-center font-pregular text-xs">
                      Total Pianos
                    </Text>
                  </Animated.View>
                </View>

                {/* Total Value */}
                <View className="w-1/2 p-1">
                  <Animated.View
                    className="bg-primary-400 rounded-lg p-3 items-center shadow-md"
                    style={{
                      opacity: statCardAnim2,
                      transform: [
                        {
                          translateY: statCardAnim2.interpolate({
                            inputRange: [0, 1],
                            outputRange: [30, 0],
                          }),
                        },
                        {
                          scale: statCardAnim2.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        },
                      ],
                    }}
                  >
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
                    <Text className="text-gray-100 text-center font-pregular text-xs">
                      Total Value
                    </Text>
                  </Animated.View>
                </View>

                {/* Active Rentals */}
                <View className="w-1/2 p-1">
                  <Animated.View
                    className="bg-primary-400 rounded-lg p-3 items-center shadow-md"
                    style={{
                      opacity: statCardAnim3,
                      transform: [
                        {
                          translateY: statCardAnim3.interpolate({
                            inputRange: [0, 1],
                            outputRange: [30, 0],
                          }),
                        },
                        {
                          scale: statCardAnim3.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        },
                      ],
                    }}
                  >
                    <View className="bg-blue-500 rounded-full p-1.5 mb-1.5">
                      <Image
                        source={icons.eye}
                        className="w-4 h-4"
                        tintColor="#ffffff"
                      />
                    </View>
                    <Text className="text-white text-center text-lg font-pbold">
                      {activeRentals}
                    </Text>
                    <Text className="text-gray-100 text-center font-pregular text-xs">
                      Active Rentals
                    </Text>
                  </Animated.View>
                </View>

                {/* Recent Additions */}
                <View className="w-1/2 p-1">
                  <Animated.View
                    className="bg-primary-400 rounded-lg p-3 items-center shadow-md"
                    style={{
                      opacity: statCardAnim4,
                      transform: [
                        {
                          translateY: statCardAnim4.interpolate({
                            inputRange: [0, 1],
                            outputRange: [30, 0],
                          }),
                        },
                        {
                          scale: statCardAnim4.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        },
                      ],
                    }}
                  >
                    <View className="bg-purple-500 rounded-full p-1.5 mb-1.5">
                      <Image
                        source={icons.plus}
                        className="w-4 h-4"
                        tintColor="#ffffff"
                      />
                    </View>
                    <Text className="text-white text-center text-lg font-pbold">
                      {recentAdditions}
                    </Text>
                    <Text className="text-gray-100 text-center font-pregular text-xs">
                      Added This Month
                    </Text>
                  </Animated.View>
                </View>
              </View>

              {/* Additional Stats Row */}
              {soldThisMonth === 0 ? (
                <View className="bg-primary-400 rounded-lg p-4 mb-3">
                  <View className="flex-row items-center">
                    <View className="bg-gray-500 rounded-full p-2 mr-3">
                      <Image
                        source={icons.trash}
                        className="w-5 h-5"
                        tintColor="#ffffff"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white text-sm font-psemibold mb-1">
                        No Sales This Month
                      </Text>
                      <Text className="text-gray-100 font-pregular text-xs">
                        Your sales activity will appear here once you start
                        selling pianos
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="bg-primary-400 rounded-lg p-3 mb-3">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                      <Text className="text-white text-sm font-psemibold mb-0.5">
                        This Month
                      </Text>
                      <Text className="text-gray-100 font-pregular text-xs">
                        Sales & Activity
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-secondary text-base font-pbold">
                        {soldThisMonth}
                      </Text>
                      <Text className="text-gray-100 font-pregular text-xs">
                        Pianos Sold
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}
        </Animated.View>

        {/* Category Cards */}
        <Animated.View
          className="px-4 mb-6"
          style={{
            opacity: categoryFadeAnim,
            transform: [{
              translateY: categoryFadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            }],
          }}
        >
          <Text className="text-white text-base font-psemibold mb-3">
            Piano Categories
          </Text>

          {items.length === 0 ? (
            /* Empty State for No Categories */
            <View className="bg-primary-400 rounded-xl p-6 items-center">
              <View className="bg-secondary bg-opacity-20 rounded-full p-4 mb-4">
                <Image
                  source={icons.grid}
                  className="w-12 h-12"
                  tintColor="#FF9C01"
                />
              </View>
              <Text className="text-white text-lg font-psemibold mb-2">
                No Categories Yet
              </Text>
              <Text className="text-gray-100 text-center text-sm font-pregular mb-4">
                Add your first piano to see category breakdowns and track your
                inventory
              </Text>
              <TouchableOpacity
                className="bg-secondary rounded-xl px-6 py-3 flex-row items-center"
                activeOpacity={0.8}
              >
                <Image
                  source={icons.plus}
                  className="w-5 h-5 mr-2"
                  tintColor="#161622"
                />
                <Text className="text-primary font-psemibold">Add Piano</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Compact Horizontal Layout */}
              <View className="flex-row justify-between">
                {/* Rentable */}
                <Animated.View
                  style={{
                    flex: 1,
                    marginHorizontal: 4,
                    transform: [{ scale: pulseAnim }],
                  }}
                >
                  <TouchableOpacity
                    className="flex-1"
                    activeOpacity={0.8}
                    onPress={() => {
                      animateButtonPress();
                      navigateToHomeWithFilter(PIANO_CATEGORY.RENTABLE);
                    }}
                  >
                  <View
                    className="rounded-xl p-3 items-center shadow-lg h-32"
                    style={{
                      backgroundColor: CATEGORY_COLORS.RENTABLE,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                    }}
                  >
                    <View className="bg-white bg-opacity-20 rounded-full p-2 mb-2">
                      <Image
                        source={images.category_rentable}
                        className="w-6 h-6 rounded-md"
                        resizeMode="cover"
                      />
                    </View>
                    <Text className="text-primary text-lg font-pbold mb-0.5">
                      {rentableCount}
                    </Text>
                    <Text className="text-primary font-psemibold text-xs opacity-80">
                      Rentable
                    </Text>
                    {/* Progress bar */}
                    <View className="w-full bg-white bg-opacity-20 rounded-full h-1 mt-2">
                      <View
                        className="bg-primary rounded-full h-1"
                        style={{
                          width:
                            items.length > 0
                              ? `${(rentableCount / items.length) * 100}%`
                              : "0%",
                        }}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
                </Animated.View>

                {/* Events */}
                <TouchableOpacity 
                  className="flex-1 mx-1" 
                  activeOpacity={0.8}
                  onPress={() => {
                    animateButtonPress();
                    navigateToHomeWithFilter(PIANO_CATEGORY.EVENTS);
                  }}
                >
                  <Animated.View
                    className="rounded-xl p-3 items-center shadow-lg h-32"
                    style={[
                      {
                        backgroundColor: CATEGORY_COLORS.EVENTS,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                      },
                      {
                        transform: [{ scale: pulseAnim }],
                      },
                    ]}
                  >
                    <View className="bg-white bg-opacity-20 rounded-full p-2 mb-2">
                      <Image
                        source={images.category_event}
                        className="w-6 h-6 rounded-md"
                        resizeMode="cover"
                      />
                    </View>
                    <Text className="text-primary text-lg font-pbold mb-0.5">
                      {eventsCount}
                    </Text>
                    <Text className="text-primary font-psemibold text-xs opacity-80">
                      Events
                    </Text>
                    <View className="w-full bg-white bg-opacity-20 rounded-full h-1 mt-2">
                      <View
                        className="bg-primary rounded-full h-1"
                        style={{
                          width:
                            items.length > 0
                              ? `${(eventsCount / items.length) * 100}%`
                              : "0%",
                        }}
                      />
                    </View>
                  </Animated.View>
                </TouchableOpacity>

                {/* On Sale */}
                <TouchableOpacity 
                  className="flex-1 mx-1" 
                  activeOpacity={0.8}
                  onPress={() => {
                    animateButtonPress();
                    navigateToHomeWithFilter(PIANO_CATEGORY.ON_SALE);
                  }}
                >
                  <Animated.View
                    className="rounded-xl p-3 items-center shadow-lg h-32"
                    style={[
                      {
                        backgroundColor: CATEGORY_COLORS.ON_SALE,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                      },
                      {
                        transform: [{ scale: pulseAnim }],
                      },
                    ]}
                  >
                    <View className="bg-white bg-opacity-20 rounded-full p-2 mb-2">
                      <Image
                        source={images.category_sale}
                        className="w-6 h-6 rounded-md"
                        resizeMode="cover"
                      />
                    </View>
                    <Text className="text-primary text-lg font-pbold mb-0.5">
                      {onSaleCount}
                    </Text>
                    <Text className="text-primary font-psemibold text-xs opacity-80">
                      On Sale
                    </Text>
                    <View className="w-full bg-white bg-opacity-20 rounded-full h-1 mt-2">
                      <View
                        className="bg-primary rounded-full h-1"
                        style={{
                          width:
                            items.length > 0
                              ? `${(onSaleCount / items.length) * 100}%`
                              : "0%",
                        }}
                      />
                    </View>
                  </Animated.View>
                </TouchableOpacity>

                {/* Warehouse */}
                <TouchableOpacity 
                  className="flex-1 mx-1" 
                  activeOpacity={0.8}
                  onPress={() => {
                    animateButtonPress();
                    navigateToHomeWithFilter(PIANO_CATEGORY.WAREHOUSE);
                  }}
                >
                  <Animated.View
                    className="rounded-xl p-3 items-center shadow-lg h-32"
                    style={[
                      {
                        backgroundColor: CATEGORY_COLORS.WAREHOUSE,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                      },
                      {
                        transform: [{ scale: pulseAnim }],
                      },
                    ]}
                  >
                    <View className="bg-white bg-opacity-20 rounded-full p-2 mb-2">
                      <Image
                        source={images.category_warehouse}
                        className="w-6 h-6 rounded-md"
                        resizeMode="cover"
                      />
                    </View>
                    <Text className="text-primary text-lg font-pbold mb-0.5">
                      {warehouseCount}
                    </Text>
                    <Text className="text-primary font-psemibold text-xs opacity-80 text-center leading-tight">
                      Storage
                    </Text>
                    <View className="w-full bg-white bg-opacity-20 rounded-full h-1 mt-2">
                      <View
                        className="bg-primary rounded-full h-1"
                        style={{
                          width:
                            items.length > 0
                              ? `${(warehouseCount / items.length) * 100}%`
                              : "0%",
                        }}
                      />
                    </View>
                  </Animated.View>
                </TouchableOpacity>
              </View>

              {/* Category Summary */}
              <View className="mt-4 bg-primary-400 rounded-lg p-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-white text-sm font-psemibold">
                    Category Distribution
                  </Text>
                  <View className="flex-row items-center">
                    <Text className="text-gray-100 text-xs mr-2">
                      Total: {items.length}
                    </Text>
                    <View className="w-2 h-2 bg-secondary rounded-full"></View>
                  </View>
                </View>
              </View>
            </>
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
                <Text className="text-gray-700 font-psemibold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmLogout}
                className="bg-red-500 rounded-xl py-3 px-6 flex-1 ml-2 shadow-lg"
                activeOpacity={0.8}
              >
                <Text className="text-white font-psemibold text-center">
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Profile;
