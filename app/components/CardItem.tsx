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
} from "date-fns";
import { Image } from "expo-image";
import { router, usePathname } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { IconButton, Menu, PaperProvider, Surface } from "react-native-paper";
import { PianoItem } from "@/redux/pianos/types";
import { PIANO_CATEGORY } from "../constants/Piano";

interface CardItemProps {
  item: PianoItem & { empty?: boolean };
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

const CardItem: React.FC<CardItemProps> = ({
  item,
  visibleMenuId,
  openMenu,
  closeMenu,
  onDelete,
}) => {
  const {
    title = "",
    image_url = "",
    users,
    company_associated = "",
    category = "",
    rental_period_end,
  } = item;
  const { avatar = "" } = users || {};
  const pathname = usePathname();
  const [isBookmarked, setIsBookmarked] = useState(false);

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
    return "Expired";
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

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    ToastAndroid.show(
      isBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
      ToastAndroid.SHORT
    );
  };

  const getCategoryGradient = (category: string) => {
    switch (category) {
      case PIANO_CATEGORY.RENTABLE:
        return ["#efeaab", "#d4c96a"];
      case PIANO_CATEGORY.EVENTS:
        return ["#abd8ef", "#7bb8d8"];
      case PIANO_CATEGORY.ON_SALE:
        return ["#eebec0", "#d89fa1"];
      case PIANO_CATEGORY.WAREHOUSE:
        return ["#c0eebe", "#9bd49a"];
      default:
        return [SECONDARY_COLOR, "#e68a00"];
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

  return (
    <PaperProvider>
      <View className="flex-col items-center px-4 mb-6">
        <Surface
          style={styles.cardContainer}
          elevation={4}
          className="bg-primary-200 rounded-2xl overflow-hidden w-full shadow-lg"
        >
          {/* Header with avatar, title, and actions */}
          <View className="flex-row items-center p-4 pb-3">
            <View className="relative">
              <View className="w-12 h-12 rounded-xl overflow-hidden bg-primary-300 border-2 border-primary-400">
                <Image
                  source={
                    category === PIANO_CATEGORY.RENTABLE
                      ? images.category_rentable
                      : category === PIANO_CATEGORY.EVENTS
                      ? images.category_event
                      : category === PIANO_CATEGORY.ON_SALE
                      ? images.category_sale
                      : category === PIANO_CATEGORY.WAREHOUSE
                      ? images.category_warehouse
                      : { uri: avatar }
                  }
                  className="w-full h-full"
                  resizeMode="cover"
                  placeholder={images.empty}
                  placeholderContentFit="cover"
                />
              </View>
              {/* Category Badge */}
              <View
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full items-center justify-center border border-white"
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
                  className="w-2.5 h-2.5"
                  tintColor={PRIMARY_COLOR}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View className="flex-1 ml-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text
                    className="text-white font-psemibold text-base mb-1"
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  {company_associated && (
                    <Text
                      className="text-xs text-gray-100 font-pregular"
                      numberOfLines={1}
                    >
                      {company_associated}
                    </Text>
                  )}
                </View>

                {/* Action Buttons */}
                <View className="flex-row items-center space-x-2">
                  {/* Bookmark Button */}
                  <TouchableOpacity
                    onPress={handleBookmark}
                    className="w-8 h-8 rounded-full bg-primary-300 items-center justify-center"
                    activeOpacity={0.7}
                  >
                    <Image
                      source={icons.bookmark}
                      className="w-4 h-4"
                      tintColor={isBookmarked ? SECONDARY_COLOR : "#CDCDE0"}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>

                  {/* Menu Button */}
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
              </View>
            </View>
          </View>

          {/* Main Image with Overlay */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleOnClickItem}
            className="relative"
          >
            <View className="w-full h-48 bg-primary-300 rounded-b-2xl overflow-hidden">
              <Image
                source={{ uri: image_url }}
                className="w-full h-full"
                resizeMode="cover"
                placeholder={images.empty}
                placeholderContentFit="cover"
              />

              {/* Gradient Overlay */}
              <View className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

              {/* Status Badge */}
              {getStatusText() && (
                <View className="absolute top-3 left-3">
                  <View
                    className="flex-row items-center bg-black/70 rounded-full px-3 py-1"
                  >
                    <View
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: getStatusColor() }}
                    />
                    <Text className="text-white text-xs font-pmedium">
                      {getStatusText()}
                    </Text>
                  </View>
                </View>
              )}

              {/* Category Label */}
              <View className="absolute bottom-3 left-3">
                <View
                  className="px-3 py-1 rounded-full"
                  style={{
                    backgroundColor:
                      category === PIANO_CATEGORY.RENTABLE
                        ? `${CATEGORY_COLORS.RENTABLE}90`
                        : category === PIANO_CATEGORY.EVENTS
                        ? `${CATEGORY_COLORS.EVENTS}90`
                        : category === PIANO_CATEGORY.ON_SALE
                        ? `${CATEGORY_COLORS.ON_SALE}90`
                        : category === PIANO_CATEGORY.WAREHOUSE
                        ? `${CATEGORY_COLORS.WAREHOUSE}90`
                        : `${SECONDARY_COLOR}90`,
                  }}
                >
                  <Text className="text-white text-xs font-psemibold">
                    {getCategoryLabel(category)}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Surface>
      </View>
    </PaperProvider>
  );
};

export default CardItem;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  cardContainer: {
    borderRadius: 20,
    marginHorizontal: 0,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
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
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItemIcon: {
    paddingEnd: 10,
    margin: 0,
  },
  itemInvisible: {
    backgroundColor: "transparent",
  },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
});
