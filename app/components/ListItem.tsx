import { icons } from "@/constants";
import { CATEGORY_COLORS } from "@/constants/colors";
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
import React from "react";
import {
  Alert,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { IconButton, Menu, PaperProvider } from "react-native-paper";
import { PIANO_CATEGORY } from "../constants/Piano";

interface ListItemProps {
  item: {
    $id: string;
    title?: string;
    image_url?: string;
    users?: {
      avatar?: string;
    };
    company_associated?: string;
    rental_period_end?: string;
    category: string;
  };
  visibleMenuId: string | null;
  openMenu: (id: string) => void;
  closeMenu: () => void;
}

const calculateRemainingPeriod = (end: string) => {
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
  visibleMenuId,
  openMenu,
  closeMenu,
}) => {
  const {
    title = "",
    image_url = "",
    users = {},
    company_associated = "",
    category = "",
    rental_period_end = "",
  } = item;
  const pathname = usePathname();

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

  return (
    <PaperProvider>
      <View className="flex-col items-center px-4 mb-4">
        <View className="flex-row gap-3 items-start">
          <View className="justify-center items-center flex-row flex-1">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOnClickItem}
              className="w-[90px] h-[90px] rounded-lg 
           justify-center items-center p-0.5"
            >
              <Image
                source={{ uri: image_url }}
                className="w-full h-full rounded-xl mt-3"
                resizeMode="cover"
              />
            </TouchableOpacity>

            <View className="justify-center flex-1 ml-3 gap-y-1">
              <Text
                className="text-white font-psemibold text-sm"
                numberOfLines={1}
              >
                {title}
              </Text>
              <Text
                className="text-xs text-gray-100 font-pregular"
                numberOfLines={1}
                style={{
                  color:
                    category === PIANO_CATEGORY.RENTABLE
                      ? CATEGORY_COLORS.RENTABLE
                      : category === PIANO_CATEGORY.EVENTS
                      ? CATEGORY_COLORS.EVENTS
                      : category === PIANO_CATEGORY.ON_SALE
                      ? CATEGORY_COLORS.ON_SALE
                      : category === PIANO_CATEGORY.WAREHOUSE
                      ? CATEGORY_COLORS.WAREHOUSE
                      : "",
                }}
              >
                {getCategoryLabel(category)}
              </Text>
              {company_associated && (
                <Text
                  className="text-xs text-gray-100 font-pregular"
                  numberOfLines={1}
                >
                  {company_associated}
                </Text>
              )}

              {rental_period_end && isRemainingPositive && (
                <Text className="text-xs text-gray-100 font-pregular">
                  <Text
                    className={`text-white font-psemibold ${
                      isLessThanOrEqualTo7Days(remaining) ? "text-red-500" : ""
                    }`}
                  >
                    {displayRemainingTime(remaining)}
                  </Text>
                  {` remaining`}
                </Text>
              )}

              {rental_period_end && !isRemainingPositive && (
                <Text className="text-xs text-gray-100 font-pregular">
                  {`Expired `}

                  <Text className="text-white font-psemibold">
                    {displayElapsedTime({
                      years: Math.abs(remaining.years),
                      months: Math.abs(remaining.months),
                      weeks: Math.abs(remaining.weeks),
                      days: Math.abs(remaining.days),
                    })}
                  </Text>
                  {` ago`}
                </Text>
              )}
            </View>
          </View>
          <View className="pt-4">
            <View style={styles.container}>
              <Menu
                style={styles.menu}
                visible={visibleMenuId === item.$id}
                onDismiss={closeMenu}
                anchor={
                  <TouchableOpacity onPress={() => openMenu(item.$id)}>
                    <Image
                      source={icons.menu}
                      style={styles.menuIcon}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                }
              >
                <Menu.Item
                  onPress={handleOnClickEditMenu}
                  title="Edit"
                  leadingIcon={() => {
                    return (
                      <IconButton
                        icon={icons.pencil}
                        size={15}
                        style={styles.menuItemIcon}
                      />
                    );
                  }}
                />
                <Menu.Item
                  onPress={handleOnClickDeleteMenu}
                  title="Delete"
                  leadingIcon={() => {
                    return (
                      <IconButton
                        icon={icons.trash}
                        size={15}
                        style={styles.menuItemIcon}
                      />
                    );
                  }}
                />
              </Menu>
            </View>
          </View>
        </View>
      </View>
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
  menuIcon: {
    width: 20,
    height: 20,
  },
  menu: { top: 0, right: 20, width: 120 },
  menuItemIcon: { paddingEnd: 10 },
  itemInvisible: {
    backgroundColor: "transparent",
  },
});
