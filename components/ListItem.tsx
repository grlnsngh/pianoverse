import { icons, images } from "@/constants";
import { PRIMARY_COLOR, SECONDARY_COLOR } from "@/constants/colors";
import useDeletePiano from "@/lib/useDeletePiano";
import { getPianoRentalState, getStatusLabel } from "@/utils/pianoStatus";
import { getEntranceDelay } from "@/utils/animation";
import { getRemainingPeriod } from "@/utils/dates";
import {
  getCategoryColor,
  getCategoryIcon,
  getRentalStatusColor,
  getRentalStatusText,
} from "@/utils/rentalStatus";
import { Image } from "expo-image";
import { router, usePathname } from "expo-router";
import React, { useEffect, useRef, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { IconButton, Menu, Surface } from "react-native-paper";
import RNAAnimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { PianoItem } from "@/redux/pianos/types";

interface ListItemProps {
  item: PianoItem & { empty?: boolean };
  index?: number;
  visibleMenuId: string | null;
  openMenu: (id: string) => void;
  closeMenu: () => void;
  onDelete?: () => void;
  isBulkSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  onEnterBulkSelection?: (id: string) => void;
}


const ListItem: React.FC<ListItemProps> = React.memo(
  ({
    item,
    index = 0,
    visibleMenuId,
    openMenu,
    closeMenu,
    onDelete,
    isBulkSelectionMode = false,
    isSelected = false,
    onToggleSelection,
    onEnterBulkSelection,
  }) => {
    const {
      title = "",
      image_url = "",
      company_associated = "",
      category = "",
      rental_period_end,
      sold_date,
    } = item;
    const pathname = usePathname();
    const confirmDelete = useDeletePiano();

    // React Native Animated values for card expansion
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const elevationAnim = useRef(new Animated.Value(2)).current;

    // Reanimated values for fade-in
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    // Trigger animation on mount
    useEffect(() => {
      const delay = getEntranceDelay(index);
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
    const handlePressIn = useCallback(() => {
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
    }, [scaleAnim, elevationAnim]);

    const handlePressOut = useCallback(() => {
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
    }, [scaleAnim, elevationAnim]);

    const remaining = useMemo(
      () => getRemainingPeriod(rental_period_end),
      [rental_period_end]
    );

    // Only for a piano rented out now, not one sold or no longer a rental
    const rentalState = useMemo(
      () => getPianoRentalState({ category, rental_period_end, sold_date }),
      [category, rental_period_end, sold_date]
    );

    const statusText = getRentalStatusText(rentalState, remaining);
    const statusColor = getRentalStatusColor(rentalState, remaining);

    const handleOnClickItem = useCallback(() => {
      if (pathname.startsWith("/detail")) router.setParams({ id: item.$id });
      else router.push(`/detail/${item.$id}`);
    }, [pathname, item.$id]);

    const handleOnClickEditMenu = useCallback(() => {
      if (pathname.startsWith("/edit")) router.setParams({ id: item.$id });
      else router.push(`/edit/${item.$id}`);
      closeMenu();
    }, [pathname, item.$id, closeMenu]);

    const handleOnClickDeleteMenu = useCallback(() => {
      closeMenu();
      confirmDelete(item, onDelete);
    }, [item, onDelete, closeMenu, confirmDelete]);

    if (item.empty) {
      return <View style={styles.itemInvisible} />;
    }

    return (
      <RNAAnimated.View style={[animatedStyle, { marginBottom: 12 }]}>
        <View className="px-4">
          <Surface
            style={[styles.cardContainer, { elevation: elevationAnim }]}
            className="bg-primary-200 rounded-2xl overflow-hidden"
          >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={
                  isBulkSelectionMode
                    ? () => onToggleSelection?.(item.$id)
                    : handleOnClickItem
                }
                onLongPress={
                  !isBulkSelectionMode
                    ? () => onEnterBulkSelection?.(item.$id)
                    : undefined
                }
                onPressIn={isBulkSelectionMode ? undefined : handlePressIn}
                onPressOut={isBulkSelectionMode ? undefined : handlePressOut}
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
                      backgroundColor: getCategoryColor(category),
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
                        backgroundColor: `${getCategoryColor(category)}20`,
                        color: getCategoryColor(category),
                      }}
                    >
                      {getStatusLabel(item)}
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
                  {statusText && (
                    <View className="flex-row items-center">
                      <View
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: statusColor }}
                      />
                      <Text
                        className="text-xs font-pmedium"
                        style={{ color: statusColor }}
                      >
                        {statusText}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Menu Button */}
                <View className="justify-center flex-row items-center">
                  {/* Selection Checkbox (only in bulk mode) */}
                  {isBulkSelectionMode && (
                    <TouchableOpacity
                      onPress={() => onToggleSelection?.(item.$id)}
                      className="w-8 h-8 rounded-full bg-primary-300 items-center justify-center mr-2"
                      activeOpacity={0.7}
                    >
                      <View
                        className={`w-5 h-5 rounded border-2 items-center justify-center ${
                          isSelected
                            ? "bg-secondary border-secondary"
                            : "border-gray-400"
                        }`}
                      >
                        {isSelected && (
                          <Image
                            source={icons.close}
                            className="w-3 h-3"
                            tintColor="#161622"
                            resizeMode="contain"
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Menu Button (only when not in bulk mode) */}
                  {!isBulkSelectionMode && (
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
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          </Surface>
        </View>
      </RNAAnimated.View>
    );
  }
);
ListItem.displayName = "ListItem";

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
