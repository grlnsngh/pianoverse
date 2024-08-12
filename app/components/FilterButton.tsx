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
import { Chip, Button, Divider } from "react-native-paper";
import { PRIMARY_COLOR } from "@/constants/colors";

const FilterButton = () => {
  const [modalVisible, setModalVisible] = useState(false);

  const toggleModal = () => {
    setModalVisible(!modalVisible);
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
        onRequestClose={toggleModal}
      >
        <TouchableWithoutFeedback onPress={toggleModal}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
              <View>
                <View style={styles.modalContent}>
                  <Text style={styles.title}>Filters</Text>
                  <Divider />
                  <Text style={styles.option} className="mt-5">
                    Sort By
                  </Text>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                    className="mt-2"
                  >
                    <Chip
                      mode="outlined"
                      onPress={() => console.log("Pressed Purchase Date")}
                    >
                      Purchase Date
                    </Chip>
                    <Chip
                      mode="outlined"
                      onPress={() => console.log("Pressed Make")}
                    >
                      Make
                    </Chip>
                    <Chip
                      mode="outlined"
                      onPress={() => console.log("Pressed Title")}
                    >
                      Title
                    </Chip>
                  </View>

                  <Divider className="mt-5" />

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
