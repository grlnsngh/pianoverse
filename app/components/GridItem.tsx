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
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { IconButton, Menu, PaperProvider, Surface } from "react-native-paper";
import { PianoItem } from "@/redux/pianos/types";
import { PIANO_CATEGORY } from "../constants/Piano";

interface GridItemProps {
  item: (PianoItem & { empty?: boolean })[];
  visibleMenuId: string | null;
  openMenu: (id: string) => void;
  closeMenu: () => void;
  onDelete?: () => void;
}
const { width } = Dimensions.get("window");
const numColumns = 2;
const itemWidth = (width - 48) / numColumns; // Account for padding and gaps

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

const GridItem: React.FC<GridItemProps> = ({
  item,
  visibleMenuId,
  openMenu,
  closeMenu,
  onDelete,
}) => {
  const pathname = usePathname();
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(
    new Set()
  );

  const handleOnClickItem = (item: PianoItem & { empty?: boolean }) => {
    if (pathname.startsWith("/detail")) router.setParams({ id: item.$id });
    else router.push(`/detail/${item.$id}`);
  };

  const handleOnClickEditMenu = (item: PianoItem & { empty?: boolean }) => {
    if (pathname.startsWith("/edit")) router.setParams({ id: item.$id });
    else router.push(`/edit/${item.$id}`);
    closeMenu();
  };

  const handleOnClickDeleteMenu = async (
    item: PianoItem & { empty?: boolean }
  ) => {
    const title = item.title;
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

  const handleBookmark = (itemId: string) => {
    setBookmarkedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
        ToastAndroid.show("Removed from bookmarks", ToastAndroid.SHORT);
      } else {
        newSet.add(itemId);
        ToastAndroid.show("Added to bookmarks", ToastAndroid.SHORT);
      }
      return newSet;
    });
  };

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

  const getStatusColor = (remaining: any) => {
    if (!remaining || remaining.days === 0) return SECONDARY_COLOR;
    if (remaining.days > 0) {
      return remaining.days <= 7 ? "#ef4444" : "#10b981";
    }
    return "#6b7280";
  };

  const getStatusText = (remaining: any) => {
    if (!remaining || remaining.days === 0) return null;
    if (remaining.days > 0) {
      if (remaining.days <= 7) return `${remaining.days}d left`;
      if (remaining.weeks > 0) return `${remaining.weeks}w left`;
      if (remaining.months > 0) return `${remaining.months}mo left`;
      return "Active";
    }
    return "Expired";
  };

  const renderItem = ({ item }: { item: PianoItem & { empty?: boolean } }) => {
    if (item.empty) {
      return <View style={[styles.item, styles.itemInvisible]} />;
    }

    const remaining = calculateRemainingPeriod(item.rental_period_end);
    const isBookmarked = bookmarkedItems.has(item.$id);

    return (
      <PaperProvider>
        <View style={styles.gridItemContainer}>
          <Surface
            style={styles.item}
            elevation={4}
            className="bg-primary-200 rounded-2xl overflow-hidden"
          >
            {/* Image Section with Overlay */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => handleOnClickItem(item)}
              style={styles.imageContainer}
            >
              <Image
                source={{ uri: item.image_url }}
                style={styles.image}
                resizeMode="cover"
                placeholder={images.empty}
                placeholderContentFit="cover"
              />

              {/* Gradient Overlay */}
              <View style={styles.imageOverlay} />

              {/* Top Action Buttons */}
              <View style={styles.topActions}>
                {/* Bookmark Button */}
                <TouchableOpacity
                  onPress={() => handleBookmark(item.$id)}
                  style={styles.actionButton}
                  activeOpacity={0.7}
                >
                  <Image
                    source={icons.bookmark}
                    style={[
                      styles.actionIcon,
                      { tintColor: isBookmarked ? SECONDARY_COLOR : "#CDCDE0" },
                    ]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                {/* Menu Button */}
                <View style={styles.menuContainer}>
                  <Menu
                    style={styles.menu}
                    visible={visibleMenuId === item.$id}
                    onDismiss={closeMenu}
                    anchor={
                      <TouchableOpacity
                        onPress={() => openMenu(item.$id)}
                        style={styles.actionButton}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={icons.menu}
                          style={[styles.actionIcon, { tintColor: "#CDCDE0" }]}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    }
                  >
                    <Menu.Item
                      onPress={() => handleOnClickEditMenu(item)}
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
                      onPress={() => handleOnClickDeleteMenu(item)}
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

              {/* Status Badge */}
              {getStatusText(remaining) && (
                <View style={styles.statusBadge}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(remaining) },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {getStatusText(remaining)}
                  </Text>
                </View>
              )}

              {/* Category Badge */}
              <View style={styles.categoryBadge}>
                <View
                  style={[
                    styles.categoryIconContainer,
                    {
                      backgroundColor:
                        item.category === PIANO_CATEGORY.RENTABLE
                          ? CATEGORY_COLORS.RENTABLE
                          : item.category === PIANO_CATEGORY.EVENTS
                          ? CATEGORY_COLORS.EVENTS
                          : item.category === PIANO_CATEGORY.ON_SALE
                          ? CATEGORY_COLORS.ON_SALE
                          : item.category === PIANO_CATEGORY.WAREHOUSE
                          ? CATEGORY_COLORS.WAREHOUSE
                          : SECONDARY_COLOR,
                    },
                  ]}
                >
                  <Image
                    source={getCategoryIcon(item.category)}
                    style={styles.categoryIcon}
                    tintColor={PRIMARY_COLOR}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </TouchableOpacity>

            {/* Content Section */}
            <View style={styles.contentContainer}>
              <Text
                className="text-white font-psemibold text-sm mb-1"
                numberOfLines={2}
                style={styles.titleText}
              >
                {item.title}
              </Text>

              <Text
                className="text-xs text-gray-100 font-pregular mb-1"
                numberOfLines={1}
                style={styles.categoryText}
              >
                {getCategoryLabel(item.category)}
              </Text>

              {item.company_associated && (
                <Text
                  className="text-xs text-gray-100 font-pregular"
                  numberOfLines={1}
                  style={styles.companyText}
                >
                  {item.company_associated}
                </Text>
              )}
            </View>
          </Surface>
        </View>
      </PaperProvider>
    );
  };

  const formatData = (
    data: (PianoItem & { empty?: boolean })[],
    numColumns: number
  ) => {
    const numberOfFullRows = Math.floor(data.length / numColumns);
    let numberOfElementsLastRow = data.length - numberOfFullRows * numColumns;
    while (
      numberOfElementsLastRow !== numColumns &&
      numberOfElementsLastRow !== 0
    ) {
      data.push({
        title: `blank-${numberOfElementsLastRow}`,
        empty: true,
      } as PianoItem & { empty?: boolean });
      numberOfElementsLastRow++;
    }
    return data;
  };

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <FlatList
        data={formatData(item, numColumns)}
        numColumns={2}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: 12 }}
        contentContainerStyle={{ gap: 10, paddingBottom: 10 }}
        renderItem={renderItem}
        keyExtractor={(item) => item.$id}
      />
    </View>
  );
};

export default GridItem;

const styles = StyleSheet.create({
  gridItemContainer: {
    flex: 1,
    padding: 8,
  },
  item: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  imageContainer: {
    width: "100%",
    height: itemWidth * 0.75,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  topActions: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionIcon: {
    width: 16,
    height: 16,
  },
  menuContainer: {
    position: "relative",
  },
  menu: {
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
  statusBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
  categoryBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
  },
  categoryIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  categoryIcon: {
    width: 14,
    height: 14,
  },
  contentContainer: {
    padding: 12,
    backgroundColor: "#1E1E2D",
  },
  titleText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  categoryText: {
    color: "#CDCDE0",
    fontSize: 12,
    marginBottom: 2,
  },
  companyText: {
    color: "#8B8B99",
    fontSize: 11,
  },
  itemInvisible: {
    backgroundColor: "transparent",
  },
});
