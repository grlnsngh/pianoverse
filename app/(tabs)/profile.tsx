import { icons, images } from "@/constants";
import { useGlobalContext } from "@/context/GlobalProvider";
import { signOut } from "@/lib/appwrite";
import { RootState } from "@/redux/store";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import InfoBox from "../components/InfoBox";
import { PIANO_CATEGORY } from "../constants/Piano";
import { Card } from "react-native-paper";

const Profile = () => {
  const { user, setUser, setIsLogged } = useGlobalContext();
  const [modalVisible, setModalVisible] = useState(false);
  const items = useSelector((state: RootState) => state.pianos.items);

  const filterItemsByCategory = (category: string) => {
    return items.filter((item) => item.category === category).length;
  };

  const rentableCount = filterItemsByCategory(PIANO_CATEGORY.RENTABLE);
  const eventsCount = filterItemsByCategory(PIANO_CATEGORY.EVENTS);
  const onSaleCount = filterItemsByCategory(PIANO_CATEGORY.ON_SALE);
  const warehouseCount = filterItemsByCategory(PIANO_CATEGORY.WAREHOUSE);

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

  return (
    <SafeAreaView className="bg-primary h-full">
      <View className="w-full flex justify-center items-center mt-6 mb-12 px-4">
        <TouchableOpacity
          onPress={showLogoutModal}
          className="flex w-full items-end mb-10"
        >
          <Image
            source={icons.logout}
            resizeMode="contain"
            className="w-6 h-6"
          />
        </TouchableOpacity>

        <View
          style={{ width: 100, height: 100 }}
          className="w-16 h-16  rounded-lg flex justify-center items-center"
        >
          <Image
            source={{ uri: user?.avatar }}
            style={{ borderRadius: 1000 }}
            className="w-[90%] h-[90%]"
            resizeMode="cover"
          />
        </View>

        <InfoBox
          title={user?.username}
          containerStyles="mt-5"
          titleStyles="text-lg"
          subtitle={user?.email}
        />

        {/* <View className="mt-5 flex flex-row">
          <InfoBox
            title={items?.length}
            subtitle="Total pianos"
            titleStyles="text-xl"
            // containerStyles="mr-10"
          />
          <InfoBox title={0} subtitle="Bookmarked" titleStyles="text-xl" />
        </View> */}
      </View>

      <Text className="ml-4 mt-10 text-left text-white text-lg font-plight">
        Pianos count: {items?.length}
      </Text>

      <View className="flex flex-wrap flex-row">
        <View className="w-1/2 p-2">
          <Card
            className="bg-primary-400 p-2"
            elevation={5}
            style={{
              margin: 5,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.8,
              shadowRadius: 2,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1, marginStart: 4 }}>
                <Image
                  source={images.category_rentable}
                  className="w-10 h-10 rounded-lg"
                  resizeMode="cover"
                />
              </View>
              <View style={{ width: 100 }}>
                <InfoBox
                  title={rentableCount}
                  subtitle="Rentable"
                  titleStyles="text-xl"
                />
              </View>
            </View>
          </Card>
        </View>
        <View className="w-1/2 p-2">
          <Card
            className="bg-primary-400 p-2"
            elevation={5}
            style={{
              margin: 5,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.8,
              shadowRadius: 2,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1, marginStart: 4 }}>
                <Image
                  source={images.category_event}
                  className="w-10 h-10 rounded-lg"
                  resizeMode="cover"
                />
              </View>
              <View style={{ width: 100 }}>
                <InfoBox
                  title={eventsCount}
                  subtitle="Events"
                  titleStyles="text-xl"
                />
              </View>
            </View>
          </Card>
        </View>
        <View className="w-1/2 p-2">
          <Card
            className="bg-primary-400 p-2"
            elevation={5}
            style={{
              margin: 5,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.8,
              shadowRadius: 2,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1, marginStart: 4 }}>
                <Image
                  source={images.category_sale}
                  className="w-10 h-10 rounded-lg"
                  resizeMode="cover"
                />
              </View>
              <View style={{ width: 100 }}>
                <InfoBox
                  title={onSaleCount}
                  subtitle="On Sale"
                  titleStyles="text-xl"
                />
              </View>
            </View>
          </Card>
        </View>
        <View className="w-1/2 p-2">
          <Card
            className="bg-primary-400 p-2"
            elevation={5}
            style={{
              margin: 5,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.8,
              shadowRadius: 2,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1, marginStart: 4 }}>
                <Image
                  source={images.category_warehouse}
                  className="w-10 h-10 rounded-lg"
                  resizeMode="cover"
                />
              </View>
              <View style={{ width: 100 }}>
                <InfoBox
                  title={warehouseCount}
                  subtitle="Warehouse"
                  titleStyles="text-xl"
                />
              </View>
            </View>
          </Card>
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.buttonClose]}
                onPress={handleCancelLogout}
              >
                <Text style={styles.textStyle}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonLogout]}
                onPress={handleConfirmLogout}
              >
                <Text style={styles.textStyle}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginHorizontal: 10,
  },
  buttonClose: {
    backgroundColor: "#2196F3",
  },
  buttonLogout: {
    backgroundColor: "#FF0000",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
  },
});
