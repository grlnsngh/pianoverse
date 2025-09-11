import { icons } from "@/constants";
import {
  PRIMARY_COLOR,
  SECONDARY_COLOR,
  CATEGORY_COLORS,
} from "@/constants/colors";
import { setPianoFilters } from "@/redux/pianos/actions";
import { FiltersType } from "@/redux/pianos/types";
import { RootState } from "@/redux/store";
import { Image } from "expo-image";
import React, { useState, useEffect } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { Divider, Switch } from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";
import { DEFAULT_FILTERS, SORT_BY_OPTIONS } from "../constants/Piano";

const FilterButton = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const slideAnim = useState(new Animated.Value(0))[0];
  const backdropOpacity = useState(new Animated.Value(0))[0];

  const { height: screenHeight } = Dimensions.get("window");

  const sortByOptions = [
    {
      label: SORT_BY_OPTIONS.LATEST_ADDED,
      value: SORT_BY_OPTIONS.LATEST_ADDED,
    },
    {
      label: SORT_BY_OPTIONS.DUE_DATE,
      value: SORT_BY_OPTIONS.DUE_DATE,
    },
    {
      label: SORT_BY_OPTIONS.PURCHASE_DATE,
      value: SORT_BY_OPTIONS.PURCHASE_DATE,
    },
    { label: SORT_BY_OPTIONS.TITLE_ASC, value: SORT_BY_OPTIONS.TITLE_ASC },
    { label: SORT_BY_OPTIONS.TITLE_DES, value: SORT_BY_OPTIONS.TITLE_DES },
  ];

  const [filterForm, setFilterForm] = useState<FiltersType>(DEFAULT_FILTERS);

  const toggleModal = () => {
    if (modalVisible) {
      // Close animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setModalVisible(false));
    } else {
      setModalVisible(true);
      // Open animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const filterState = useSelector((state: RootState) => state.pianos.filters);

  // Sync filterForm with filterState when filterState changes
  useEffect(() => {
    setFilterForm(filterState);
  }, [filterState]);

  const toggleAndResetModal = () => {
    setFilterForm(filterState);
    toggleModal();
  };

  // Pan responder for drag-to-close functionality
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 0) {
        // Only allow downward drag
        const newY = Math.max(0, gestureState.dy / screenHeight);
        slideAnim.setValue(1 - newY * 0.5);
        backdropOpacity.setValue(1 - newY);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dy > 100 || gestureState.vy > 0.5) {
        // Close if dragged down enough or with enough velocity
        toggleModal();
      } else {
        // Snap back to open position
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.spring(backdropOpacity, {
            toValue: 1,
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
  });

  const dispatch = useDispatch();

  const onShowResults = () => {
    dispatch(setPianoFilters(filterForm) as any);
    toggleModal();
  };

  const handleCategoryPress = (label: string) => {
    // Prevent changing category if DUE_DATE sorting is selected
    if (
      filterForm.sortBy === SORT_BY_OPTIONS.DUE_DATE &&
      label !== "Rentable"
    ) {
      return; // Don't allow changing category when DUE_DATE is selected
    }

    const formattedLabel = label.replace(/\s+/g, "_").toLowerCase();
    const isCurrentlySelected =
      filterForm.category === label ||
      filterForm.category === formattedLabel ||
      (filterForm.category &&
        filterForm.category.replace(/\s+/g, "_").toLowerCase() ===
          formattedLabel);

    const newCategory = isCurrentlySelected ? "" : label;
    setFilterForm({ ...filterForm, category: newCategory });
  };

  const renderChip = (label: string) => {
    const formattedLabel = label.replace(/\s+/g, "_").toLowerCase();
    const isSelected =
      filterForm.category === label ||
      filterForm.category === formattedLabel ||
      (filterForm.category &&
        filterForm.category.replace(/\s+/g, "_").toLowerCase() ===
          formattedLabel) ||
      (filterForm.sortBy === SORT_BY_OPTIONS.DUE_DATE && label === "Rentable");

    const getCategoryColor = (label: string) => {
      switch (label) {
        case "Rentable":
          return CATEGORY_COLORS.RENTABLE;
        case "Events":
          return CATEGORY_COLORS.EVENTS;
        case "On Sale":
          return CATEGORY_COLORS.ON_SALE;
        case "Warehouse":
          return CATEGORY_COLORS.WAREHOUSE;
        default:
          return PRIMARY_COLOR;
      }
    };

    return (
      <TouchableOpacity
        onPress={() => handleCategoryPress(label)}
        disabled={
          (filterForm.isActiveRentals && label !== "Rentable") ||
          (filterForm.sortBy === SORT_BY_OPTIONS.DUE_DATE &&
            label !== "Rentable")
        }
        className={`px-3 py-1 rounded-full border ${
          isSelected
            ? "bg-secondary border-secondary"
            : "bg-primary-200 border-primary-300"
        }`}
        style={{
          opacity:
            (filterForm.isActiveRentals && label !== "Rentable") ||
            (filterForm.sortBy === SORT_BY_OPTIONS.DUE_DATE &&
              label !== "Rentable")
              ? 0.5
              : 1,
        }}
      >
        <Text
          className={`text-xs font-pmedium ${
            isSelected ? "text-primary" : "text-white"
          }`}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const onLayoutButtonPress = (layout: string) => {
    setFilterForm((prevForm) => ({
      ...prevForm,
      layoutStatus: {
        grid: layout === "grid" ? "checked" : "unchecked",
        list: layout === "list" ? "checked" : "unchecked",
        card: layout === "card" ? "checked" : "unchecked",
      },
    }));
  };

  return (
    <View className="flex items-center justify-center">
      <TouchableOpacity
        onPress={toggleModal}
        className="w-10 h-10 bg-primary-200 rounded-full flex items-center justify-center border border-secondary"
        activeOpacity={0.7}
      >
        <Image
          style={{ tintColor: SECONDARY_COLOR }}
          source={icons.filter}
          className="w-5 h-5"
          resizeMode="contain"
        />
      </TouchableOpacity>

      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={toggleAndResetModal}
      >
        <Animated.View
          style={[styles.modalContainer, { opacity: backdropOpacity }]}
        >
          <TouchableWithoutFeedback onPress={toggleAndResetModal}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [screenHeight, 0],
                    }),
                  },
                ],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text style={styles.title}>Filters</Text>
              <TouchableOpacity onPress={toggleAndResetModal}>
                <Image
                  source={icons.close}
                  className="w-4 h-4"
                  resizeMode="contain"
                  style={{ tintColor: "white" }}
                />
              </TouchableOpacity>
            </View>
            <Divider style={{ backgroundColor: PRIMARY_COLOR }} />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              className="mt-3"
            >
              <Text style={styles.option}>Layout</Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <TouchableOpacity
                  onPress={() => onLayoutButtonPress("card")}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    filterForm.layoutStatus.card === "checked"
                      ? "bg-secondary"
                      : "bg-primary-200"
                  }`}
                >
                  <Image
                    source={icons.card}
                    className="w-4 h-4"
                    resizeMode="contain"
                    style={{
                      tintColor:
                        filterForm.layoutStatus.card === "checked"
                          ? PRIMARY_COLOR
                          : SECONDARY_COLOR,
                    }}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onLayoutButtonPress("list")}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    filterForm.layoutStatus.list === "checked"
                      ? "bg-secondary"
                      : "bg-primary-200"
                  }`}
                >
                  <Image
                    source={icons.list}
                    className="w-4 h-4"
                    resizeMode="contain"
                    style={{
                      tintColor:
                        filterForm.layoutStatus.list === "checked"
                          ? PRIMARY_COLOR
                          : SECONDARY_COLOR,
                    }}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onLayoutButtonPress("grid")}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    filterForm.layoutStatus.grid === "checked"
                      ? "bg-secondary"
                      : "bg-primary-200"
                  }`}
                >
                  <Image
                    source={icons.grid}
                    className="w-4 h-4"
                    resizeMode="contain"
                    style={{
                      tintColor:
                        filterForm.layoutStatus.grid === "checked"
                          ? PRIMARY_COLOR
                          : SECONDARY_COLOR,
                    }}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <Divider
              style={{ backgroundColor: PRIMARY_COLOR, marginTop: 12 }}
            />

            <View className="mt-3">
              <Text style={styles.option}>Sort By</Text>

              <View
                style={{
                  marginTop: 8,
                  borderWidth: 1,
                  borderColor: isFocused ? SECONDARY_COLOR : PRIMARY_COLOR,
                  borderRadius: 12,
                }}
                className="w-full h-12 px-3 rounded-xl flex flex-row items-center bg-primary-100"
              >
                <Dropdown
                  data={sortByOptions}
                  labelField="label"
                  valueField="value"
                  placeholder="Select item"
                  value={filterForm.sortBy}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onChange={(item) => {
                    let newCategory = filterForm.category;

                    // If DUE_DATE is selected, automatically filter to rentable items
                    if (item.value === SORT_BY_OPTIONS.DUE_DATE) {
                      newCategory = "Rentable";
                    }

                    setFilterForm({
                      ...filterForm,
                      sortBy: item.value,
                      category: newCategory,
                    });
                    setIsFocused(false);
                  }}
                  style={{
                    height: 40,
                    width: "100%",
                  }}
                  containerStyle={{
                    width: "90%",
                    borderRadius: 12,
                    left: 12,
                  }}
                  placeholderStyle={{ color: "gray" }}
                  selectedTextStyle={{ color: "white" }}
                />
              </View>
            </View>

            <Divider
              style={{ backgroundColor: PRIMARY_COLOR, marginTop: 12 }}
            />

            <Text style={styles.option} className="mt-3">
              Category
            </Text>
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
              className="mt-2"
            >
              {renderChip("Rentable")}
              {renderChip("Events")}
              {renderChip("On Sale")}
              {renderChip("Warehouse")}
            </View>

            <Divider
              style={{ backgroundColor: PRIMARY_COLOR, marginTop: 12 }}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              className="mt-3"
            >
              <Text style={styles.option}>Active Rentals</Text>
              <Switch
                value={filterForm.isActiveRentals}
                onValueChange={() => {
                  const newCategory =
                    filterForm.category === "Rentable" ? "" : "Rentable";

                  setFilterForm({
                    ...filterForm,
                    category: newCategory,
                    isActiveRentals: !filterForm.isActiveRentals,
                  });
                }}
                trackColor={{ false: PRIMARY_COLOR, true: SECONDARY_COLOR }}
                thumbColor={
                  filterForm.isActiveRentals ? PRIMARY_COLOR : "white"
                }
              />
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              className="mt-3"
            >
              <Text style={styles.option}>Sold</Text>
              <Switch
                value={filterForm.isSold}
                onValueChange={() =>
                  setFilterForm({
                    ...filterForm,
                    isSold: !filterForm.isSold,
                  })
                }
                trackColor={{ false: PRIMARY_COLOR, true: SECONDARY_COLOR }}
                thumbColor={filterForm.isSold ? PRIMARY_COLOR : "white"}
              />
            </View>

            <View className="mt-4 flex items-center justify-center">
              <TouchableOpacity
                onPress={onShowResults}
                className="bg-secondary rounded-xl w-3/4 h-10 flex items-center justify-center"
                activeOpacity={0.7}
              >
                <Text className="text-primary font-psemibold text-base">
                  Show Results
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: PRIMARY_COLOR,
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  option: {
    fontSize: 14,
    marginBottom: 4,
    color: "white",
    fontFamily: "Poppins-Medium",
  },
  button: {
    padding: 10,
    backgroundColor: "#ddd",
    borderRadius: 10,
  },
});

export default FilterButton;
