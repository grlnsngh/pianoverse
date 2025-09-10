import { icons, images } from "@/constants";
import {
  CATEGORY_COLORS,
  PRIMARY_COLOR,
  SECONDARY_COLOR,
} from "@/constants/colors";
import { deletePianoEntry } from "@/lib/appwrite";
import { getCategoryLabel } from "@/utils/ObjectManipulation";
import {
  differenceInDays,
  differenceInMonths,
  differenceInWeeks,
  differenceInYears,
  format,
} from "date-fns";
import { Image } from "expo-image";
import { router, usePathname } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { IconButton, Menu, PaperProvider, Surface } from "react-native-paper";
import RNAAnimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { PianoItem } from "@/redux/pianos/types";
import { PIANO_CATEGORY } from "../constants/Piano";

interface ListItemProps {
  item: PianoItem & { empty?: boolean };
  index?: number;
  visibleMenuId: string | null;
  openMenu: (id: string) => void;
  closeMenu: () => void;
  onDelete?: () => void;
}

const calculateRemainingPeriod = (end: Date | null | undefined) => {
  if (!end) return { days: 0, weeks: 0, months: 0, years: 0 };
  const endDate = new Date(end);
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const days = differenceInDays(endDate, currentDate);
  const weeks = differenceInWeeks(endDate, currentDate);
  const months = differenceInMonths(endDate, currentDate);
  const years = differenceInYears(endDate, currentDate);

  return { days, weeks, months, years };
};

const ListItem: React.FC<ListItemProps> = ({
  item,
  index = 0,
  visibleMenuId,
  openMenu,
  closeMenu,
  onDelete,
}) => {
  const {
    title = "",
    image_url = "",
    users = {},
    company_associated = "",
    category = "",
    rental_period_end,
  } = item;
  const pathname = usePathname();

  // React Native Animated values for card expansion
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const elevationAnim = useRef(new Animated.Value(2)).current;

  // Reanimated values for fade-in
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  // Trigger animation on mount
  useEffect(() => {
    const delay = index * 100; // Stagger by 100ms per item
    opacity.value = withDelay(
      delay,
      withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      })
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [index]);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  // Handle card press animations
  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }),
      Animated.timing(elevationAnim, {
        toValue: 6,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }),
      Animated.timing(elevationAnim, {
        toValue: 2,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const remaining = calculateRemainingPeriod(rental_period_end);

  const isRemainingPositive =
    remaining.days > 0 ||
    remaining.weeks > 0 ||
    remaining.months > 0 ||
    remaining.years > 0;

  const pluralize = (value: number, unit: string) =>
    `${value} ${unit}${value > 1 ? "s" : ""}`;

  const displayRemainingTime = (remaining: {
    years: number;
    months: number;
    weeks: number;
    days: number;
  }) => {
    if (remaining.years > 0) return pluralize(remaining.years, "year");
    if (remaining.months > 0) return pluralize(remaining.months, "month");
    if (remaining.weeks > 0) return pluralize(remaining.weeks, "week");
    return pluralize(remaining.days, "day");
  };

  const isLessThanOrEqualTo7Days = (remaining: {
    years: number;
    months: number;
    weeks: number;
    days: number;
  }) => {
    return (
      remaining.years === 0 &&
      remaining.months === 0 &&
      remaining.weeks === 0 &&
      remaining.days <= 7
    );
  };

  const displayElapsedTime = (elapsed: {
    years: number;
    months: number;
    weeks: number;
    days: number;
  }) => {
    if (elapsed.years > 0) return pluralize(elapsed.years, "year");
    if (elapsed.months > 0) return pluralize(elapsed.months, "month");
    if (elapsed.weeks > 0) return pluralize(elapsed.weeks, "week");
    return pluralize(elapsed.days, "day");
  };

  const handleOnClickItem = () => {
    if (pathname.startsWith("/detail")) router.setParams({ id: item.$id });
    else router.push(`/detail/${item.$id}`);
  };

  const handleOnClickEditMenu = () => {
    if (pathname.startsWith("/edit")) router.setParams({ id: item.$id });
    else router.push(`/edit/${item.$id}`);
    closeMenu();
  };

  const handleOnClickDeleteMenu = async () => {
    try {
      await deletePianoEntry(item);
      ToastAndroid.show(`Deleted ${title} successfully`, ToastAndroid.SHORT);
      onDelete?.();
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(
          "Error",
          `Error deleting piano entry: ${title} - ${error.message}`
        );
      } else {
        Alert.alert("Error", "An unknown error occurred");
      }
    } finally {
      closeMenu();
    }
  };

  if (item.empty) {
    return <View style={styles.itemInvisible} />;
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case PIANO_CATEGORY.RENTABLE:
        return icons.card;
      case PIANO_CATEGORY.EVENTS:
        return icons.play;
      case PIANO_CATEGORY.ON_SALE:
        return icons.bookmark;
      case PIANO_CATEGORY.WAREHOUSE:
        return icons.home;
      default:
        return icons.card;
    }
  };

  const getStatusColor = () => {
    if (!rental_period_end) return SECONDARY_COLOR;
    if (isRemainingPositive) {
      return isLessThanOrEqualTo7Days(remaining) ? "#ef4444" : "#10b981";
    }
    return "#6b7280";
  };

  const getStatusText = () => {
    if (!rental_period_end) return null;
    if (isRemainingPositive) {
      return `${displayRemainingTime(remaining)} remaining`;
    }
    return `Expired ${displayElapsedTime({
      years: Math.abs(remaining.years),
      months: Math.abs(remaining.months),
      weeks: Math.abs(remaining.weeks),
      days: Math.abs(remaining.days),
    })} ago`;
  };

  return (
    <PaperProvider>
      <RNAAnimated.View style={[animatedStyle, { marginBottom: 12 }]}>
        <View className="px-4">
          <Surface
            style={[styles.cardContainer, { elevation: elevationAnim }]}
            className="bg-primary-200 rounded-2xl overflow-hidden"
          >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleOnClickItem}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                className="flex-row p-4"
              >
              {/* Image Section */}
              <View className="relative">
                <View className="w-20 h-20 rounded-xl overflow-hidden bg-primary-300">
                  <Image
                    source={{ uri: image_url }}
                    className="w-full h-full"
                    resizeMode="cover"
                    placeholder={images.empty}
                    placeholderContentFit="cover"
                  />
                </View>
                {/* Category Badge */}
                <View
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full items-center justify-center"
                  style={{
                    backgroundColor:
                      category === PIANO_CATEGORY.RENTABLE
                        ? CATEGORY_COLORS.RENTABLE
                        : category === PIANO_CATEGORY.EVENTS
                        ? CATEGORY_COLORS.EVENTS
                        : category === PIANO_CATEGORY.ON_SALE
                        ? CATEGORY_COLORS.ON_SALE
                        : category === PIANO_CATEGORY.WAREHOUSE
                        ? CATEGORY_COLORS.WAREHOUSE
                        : SECONDARY_COLOR,
                  }}
                >
                  <Image
                    source={getCategoryIcon(category)}
                    className="w-3 h-3"
                    tintColor={PRIMARY_COLOR}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Content Section */}
              <View className="flex-1 ml-4 justify-center">
                {/* Title */}
                <Text
                  className="text-white font-psemibold text-base mb-1"
                  numberOfLines={1}
                >
                  {title}
                </Text>

                {/* Category and Company */}
                <View className="flex-row items-center mb-2">
                  <Text
                    className="text-xs font-pmedium px-2 py-1 rounded-full mr-2"
                    style={{
                      backgroundColor:
                        category === PIANO_CATEGORY.RENTABLE
                          ? `${CATEGORY_COLORS.RENTABLE}20`
                          : category === PIANO_CATEGORY.EVENTS
                          ? `${CATEGORY_COLORS.EVENTS}20`
                          : category === PIANO_CATEGORY.ON_SALE
                          ? `${CATEGORY_COLORS.ON_SALE}20`
                          : category === PIANO_CATEGORY.WAREHOUSE
                          ? `${CATEGORY_COLORS.WAREHOUSE}20`
                          : `${SECONDARY_COLOR}20`,
                      color:
                        category === PIANO_CATEGORY.RENTABLE
                          ? CATEGORY_COLORS.RENTABLE
                          : category === PIANO_CATEGORY.EVENTS
                          ? CATEGORY_COLORS.EVENTS
                          : category === PIANO_CATEGORY.ON_SALE
                          ? CATEGORY_COLORS.ON_SALE
                          : category === PIANO_CATEGORY.WAREHOUSE
                          ? CATEGORY_COLORS.WAREHOUSE
                          : SECONDARY_COLOR,
                    }}
                  >
                    {getCategoryLabel(category)}
                  </Text>
                  {company_associated && (
                    <Text
                      className="text-xs text-gray-100 font-pregular flex-1"
                      numberOfLines={1}
                    >
                      {company_associated}
                    </Text>
                  )}
                </View>

                {/* Status Indicator */}
                {getStatusText() && (
                  <View className="flex-row items-center">
                    <View
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: getStatusColor() }}
                    />
                    <Text
                      className="text-xs font-pmedium"
                      style={{ color: getStatusColor() }}
                    >
                      {getStatusText()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Menu Button */}
              <View className="justify-center">
                <View style={styles.container}>
                  <Menu
                    style={styles.menu}
                    visible={visibleMenuId === item.$id}
                    onDismiss={closeMenu}
                    anchor={
                      <TouchableOpacity
                        onPress={() => openMenu(item.$id)}
                        className="w-8 h-8 rounded-full bg-primary-300 items-center justify-center"
                        activeOpacity={0.7}
                      >
                        <Image
                          source={icons.menu}
                          className="w-4 h-4"
                          tintColor="#CDCDE0"
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    }
                  >
                    <Menu.Item
                      onPress={handleOnClickEditMenu}
                      title="Edit"
                      leadingIcon={() => (
                        <IconButton
                          icon={icons.pencil}
                          size={16}
                          iconColor={SECONDARY_COLOR}
                          style={styles.menuItemIcon}
                        />
                      )}
                      titleStyle={{ color: "#CDCDE0" }}
                    />
                    <Menu.Item
                      onPress={handleOnClickDeleteMenu}
                      title="Delete"
                      leadingIcon={() => (
                        <IconButton
                          icon={icons.trash}
                          size={16}
                          iconColor="#ef4444"
                          style={styles.menuItemIcon}
                        />
                      )}
                      titleStyle={{ color: "#CDCDE0" }}
                    />
                  </Menu>
                </View>
              </View>
            </TouchableOpacity>
            </Animated.View>
          </Surface>
        </View>
      </RNAAnimated.View>
    </PaperProvider>
  );
};

export default ListItem;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  cardContainer: {
    borderRadius: 16,
    marginHorizontal: 0,
  },
  menuIcon: {
    width: 20,
    height: 20,
  },
  menu: {
    top: 0,
    right: 20,
    width: 140,
    backgroundColor: "#1E1E2D",
    borderRadius: 12,
  },
  menuItemIcon: {
    paddingEnd: 10,
    margin: 0,
  },
  itemInvisible: {
    backgroundColor: "transparent",
  },
});
