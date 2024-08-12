import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  PanResponder,
} from "react-native";
import React, { useState } from "react";
import { icons } from "@/constants";
import { Chip, Button, Divider, Switch } from "react-native-paper";
import { PRIMARY_COLOR, SECONDARY_COLOR } from "@/constants/colors";
import { Picker } from "@react-native-picker/picker";
import { Dropdown } from "react-native-element-dropdown";

const FilterButton = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [isRentalSwitchOn, setIsRentalSwitchOn] = React.useState(false);
  const [isSoldSwitchOn, setIsSoldSwitchOn] = React.useState(false);
  const [selectedValue, setSelectedValue] = useState("Latest Added");
  const [isFocused, setIsFocused] = useState(false);

  const onToggleRentalSwitch = () => setIsRentalSwitchOn(!isRentalSwitchOn);
  const onToggleSoldSwitch = () => setIsSoldSwitchOn(!isSoldSwitchOn);
  const toggleModal = () => {
    setModalVisible(!modalVisible);
  };

  const data = [
    { label: "Latest Added", value: "Latest Added" },
    { label: "Title", value: "Title" },
    { label: "Purchase Date", value: "Purchase Date" },
  ];

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
        onRequestClose={toggleModal}
      >
        <TouchableWithoutFeedback onPress={toggleModal}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
              <View>
                <View style={styles.modalContent}>
                  <Text style={styles.title}>Filters</Text>
                  <Divider />
                  <View>
                    <Text style={styles.option} className="mt-5">
                      Sort By
                    </Text>

                    <View
                      style={{
                        marginTop: 8,
                        borderWidth: 1,
                        borderColor: isFocused ? SECONDARY_COLOR : "#ccc",
                      }}
                      className="w-full h-16 px-4 rounded-2xl flex flex-row items-center"
                    >
                      <Dropdown
                        data={data}
                        labelField="label"
                        valueField="value"
                        placeholder="Select item"
                        value={selectedValue}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onChange={(item) => {
                          setSelectedValue(item.value);
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
                    className="mt-2"
                  >
                    <Chip
                      mode="outlined"
                      onPress={() => console.log("Pressed Rentable")}
                    >
                      Rentable
                    </Chip>
                    <Chip
                      mode="outlined"
                      onPress={() => console.log("Pressed Events")}
                    >
                      Events
                    </Chip>
                    <Chip
                      mode="outlined"
                      onPress={() => console.log("Pressed On Sale")}
                    >
                      On Sale
                    </Chip>
                    <Chip
                      mode="outlined"
                      onPress={() => console.log("Pressed Warehouse")}
                    >
                      Warehouse
                    </Chip>
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
                      value={isRentalSwitchOn}
                      onValueChange={onToggleRentalSwitch}
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
                      value={isSoldSwitchOn}
                      onValueChange={onToggleSoldSwitch}
                    />
                  </View>

                  <Divider className="mt-1" />

                  <View style={styles.buttonContainer}>
                    <Button
                      icon="close"
                      mode="contained"
                      onPress={toggleModal}
                      buttonColor={PRIMARY_COLOR}
                    >
                      Cancel
                    </Button>

                    <Button
                      icon="check"
                      mode="contained"
                      onPress={toggleModal}
                      buttonColor="green"
                    >
                      OK
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
    marginBottom: 10,
  },
  option: {
    fontSize: 16,
    marginBottom: 5,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  button: {
    padding: 10,
    backgroundColor: "#ddd",
    borderRadius: 10,
  },
});

export default FilterButton;
