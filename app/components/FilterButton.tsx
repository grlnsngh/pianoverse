import { icons } from "@/constants";
import { PRIMARY_COLOR, SECONDARY_COLOR } from "@/constants/colors";
import { setPianoFilters, setPianoListItems } from "@/redux/pianos/actions";
import { FiltersType, PianoItem } from "@/redux/pianos/types";
import { RootState } from "@/redux/store";
import React, { useState } from "react";
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import {
  Button,
  Chip,
  Divider,
  Switch,
  ToggleButton,
} from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";
import { DEFAULT_FILTERS, SORT_BY_OPTIONS } from "../constants/Piano";

const FilterButton = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const sortByOptions = [
    {
      label: SORT_BY_OPTIONS.LATEST_ADDED,
      value: SORT_BY_OPTIONS.LATEST_ADDED,
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
    setModalVisible(!modalVisible);
  };

  const filterState = useSelector((state: RootState) => state.pianos.filters);
  const pianoItems = useSelector((state: RootState) => state.pianos.items);

  const toggleAndResetModal = () => {
    setFilterForm(filterState);
    toggleModal();
  };

  const dispatch = useDispatch();

  const onShowResults = () => {
    dispatch(setPianoFilters(filterForm));
    let filteredItems: PianoItem[] = pianoItems.slice();

    const sortItems = (
      items: PianoItem[],
      compareFn: (a: PianoItem, b: PianoItem) => number
    ) => {
      return items.sort(compareFn);
    };

    switch (filterForm.sortBy) {
      case SORT_BY_OPTIONS.TITLE_ASC:
        filteredItems = sortItems(filteredItems, (a, b) =>
          a.title.localeCompare(b.title)
        );
        break;
      case SORT_BY_OPTIONS.TITLE_DES:
        filteredItems = sortItems(filteredItems, (a, b) =>
          b.title.localeCompare(a.title)
        );
        break;
      case SORT_BY_OPTIONS.LATEST_ADDED:
        filteredItems = sortItems(
          filteredItems,
          (a, b) =>
            new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
        );
        break;
      case SORT_BY_OPTIONS.PURCHASE_DATE:
        filteredItems = sortItems(filteredItems, (a, b) => {
          const dateA = a.date_of_purchase
            ? new Date(a.date_of_purchase).getTime()
            : new Date(0).getTime();
          const dateB = b.date_of_purchase
            ? new Date(b.date_of_purchase).getTime()
            : new Date(0).getTime();
          return dateB - dateA;
        });
        break;
      default:
        break;
    }

    dispatch(setPianoListItems(filteredItems));
    toggleModal();
  };

  const handleCategoryPress = (label: string) => {
    const newCategory = filterForm.category === label ? "" : label;
    setFilterForm({ ...filterForm, category: newCategory });
  };

  const renderChip = (label: string) => (
    <Chip
      mode="outlined"
      onPress={() => handleCategoryPress(label)}
      selected={filterForm.category === label}
      // selectedColor={filterForm.category === label ? "white" : PRIMARY_COLOR}
      // style={{
      //   backgroundColor:
      //     filterForm.category === label ? SECONDARY_COLOR : "white",
      // }}
      // showSelectedCheck={false}
    >
      {label}
    </Chip>
  );

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
    <View style={{ flex: 1 }}>
      <View
        style={{ height: 60, width: 60 }}
        className="flex flex-row items-center space-x-4 
        px-4 bg-black-100 rounded-2xl
        border-2 border-black-200 focus:border-secondary
        justify-center"
      >
        <TouchableOpacity onPress={toggleModal}>
          <Image
            style={{ tintColor: "white" }}
            source={icons.filter}
            className="w-6 h-6"
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={toggleAndResetModal}
      >
        <TouchableWithoutFeedback onPress={toggleAndResetModal}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
              <View>
                <View style={styles.modalContent}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <Text style={styles.title}>Filters</Text>
                    <TouchableOpacity onPress={toggleAndResetModal}>
                      <Image
                        source={icons.close}
                        className="w-3 h-3"
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  </View>
                  <Divider />

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                    className="mt-2"
                  >
                    <Text style={styles.option}>Layout</Text>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <ToggleButton
                        icon={icons.card}
                        value="card"
                        status={filterForm.layoutStatus.card}
                        onPress={() => onLayoutButtonPress("card")}
                        iconColor={PRIMARY_COLOR}
                      />
                      <ToggleButton
                        icon={icons.list}
                        value="list"
                        status={filterForm.layoutStatus.list}
                        onPress={() => onLayoutButtonPress("list")}
                        iconColor={PRIMARY_COLOR}
                      />
                      <ToggleButton
                        icon={icons.grid}
                        value="grid"
                        status={filterForm.layoutStatus.grid}
                        onPress={() => onLayoutButtonPress("grid")}
                        iconColor={PRIMARY_COLOR}
                      />
                    </View>
                  </View>

                  <Divider className="mt-2" />

                  <View>
                    <Text style={styles.option} className="mt-5">
                      Sort By
                    </Text>

                    <View
                      style={{
                        marginTop: 12,
                        borderWidth: 1,
                        borderColor: isFocused ? SECONDARY_COLOR : "#ccc",
                      }}
                      className="w-full h-16 px-4 rounded-2xl flex flex-row items-center"
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
                          setFilterForm({ ...filterForm, sortBy: item.value });
                          setIsFocused(false);
                        }}
                        style={{
                          height: 60,
                          width: "100%",
                        }}
                        containerStyle={{
                          width: "90%",
                          borderRadius: 16,
                          left: 21,
                        }}
                      />
                    </View>
                  </View>

                  <Divider className="mt-5" />

                  <Text style={styles.option} className="mt-5">
                    Category Selection
                  </Text>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                    className="mt-3"
                  >
                    {renderChip("Rentable")}
                    {renderChip("Events")}
                    {renderChip("On Sale")}
                    {renderChip("Warehouse")}
                  </View>

                  <Divider className="mt-5" />

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                    className="mt-2"
                  >
                    <Text style={styles.option}>Active rentals</Text>
                    <Switch
                      value={filterForm.isActiveRentals}
                      onValueChange={() =>
                        setFilterForm({
                          ...filterForm,
                          isActiveRentals: !filterForm.isActiveRentals,
                        })
                      }
                    />
                  </View>

                  <Divider className="mt-1" />

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                    className="mt-2"
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
                    />
                  </View>

                  <View className="mt-3 flex items-center justify-center">
                    <Button
                      mode="contained"
                      onPress={onShowResults}
                      buttonColor="green"
                      style={{ width: "70%", height: 40 }}
                    >
                      Show results
                    </Button>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
    backgroundColor: "white",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  option: {
    fontSize: 16,
    marginBottom: 5,
  },
  button: {
    padding: 10,
    backgroundColor: "#ddd",
    borderRadius: 10,
  },
});

export default FilterButton;
